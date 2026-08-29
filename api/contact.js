// POST /api/contact
// Body: { name, email, message, company_hp, form_loaded_at, turnstile_token }
// Success -> 200 { ok: true }
// Validation / verification failure -> 400 { ok: false, error }
// Rate limited -> 429 { ok: false, error }
// Anything else going wrong -> 500 { ok: false, error } (generic message only,
// real details go to the server logs, never to the browser)

const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Minimum time (ms) a human plausibly takes to fill the form. Bots that
// fill + submit programmatically almost always land under this.
const MIN_FILL_TIME_MS = 3000;

// How many submissions the same IP may make before we start pushing back.
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || '';
}

async function verifyTurnstile(token, ip) {
  if (!token) return false;
  try {
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip
      })
    });
    const data = await verifyRes.json();
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verify error:', err);
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const body = req.body || {};
  const { name, email, message, company_hp, form_loaded_at, turnstile_token } = body;
  const clientIp = getClientIp(req);

  // Layer 1 -- honeypot. Real users never fill this hidden field. If it's
  // filled, pretend everything worked so the bot doesn't learn it was
  // caught, but skip every downstream check entirely.
  if (company_hp) {
    return res.status(200).json({ ok: true });
  }

  // Layer 2 -- time-trap. If the submission arrives suspiciously fast after
  // the form loaded, silently pretend success rather than tipping off a bot.
  const loadedAt = Number(form_loaded_at);
  if (!loadedAt || Date.now() - loadedAt < MIN_FILL_TIME_MS) {
    return res.status(200).json({ ok: true });
  }

  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim() : '';
  const cleanMessage = typeof message === 'string' ? message.trim() : '';

  if (!cleanName) {
    return res.status(400).json({ ok: false, error: 'Name is required.' });
  }
  if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ ok: false, error: 'A valid email is required.' });
  }
  if (!cleanMessage) {
    return res.status(400).json({ ok: false, error: 'Message is required.' });
  }
  if (cleanName.length > 200 || cleanEmail.length > 200 || cleanMessage.length > 5000) {
    return res.status(400).json({ ok: false, error: 'One of the fields is too long.' });
  }

  // Layer 3 -- Turnstile. Real, visible failure: a legitimate visitor could
  // hit this on a network hiccup or expired token, so give an honest error.
  const humanVerified = await verifyTurnstile(turnstile_token, clientIp);
  if (!humanVerified) {
    return res.status(400).json({ ok: false, error: 'Verification failed. Please try again.' });
  }

  try {
    // Layer 4 -- IP rate limit. Also a real, visible failure -- a genuine
    // person could trigger this by retrying too many times.
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: recentCount, error: countError } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('ip', clientIp)
      .gte('created_at', windowStart);

    if (countError) {
      console.error('Rate limit check error:', countError);
    } else if ((recentCount || 0) >= RATE_LIMIT_MAX) {
      return res.status(429).json({
        ok: false,
        error: "You've sent a few messages recently. Please wait a bit before trying again."
      });
    }

    const { error: dbError } = await supabase
      .from('inquiries')
      .insert({ name: cleanName, email: cleanEmail, message: cleanMessage, ip: clientIp });

    if (dbError) {
      console.error('Supabase insert error:', dbError);
      return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
    }

    await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL,
      to: process.env.CONTACT_TO_EMAIL,
      reply_to: cleanEmail,
      subject: 'New inquiry from ' + cleanName,
      html:
        '<p><strong>Name:</strong> ' + escapeHtml(cleanName) + '</p>' +
        '<p><strong>Email:</strong> ' + escapeHtml(cleanEmail) + '</p>' +
        '<p><strong>Message:</strong></p>' +
        '<p>' + escapeHtml(cleanMessage).replace(/\n/g, '<br>') + '</p>'
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
};
