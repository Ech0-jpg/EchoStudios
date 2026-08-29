(function () {
  'use strict';

  var ACCENT = '#B0332B';
  var GRAIN_OPACITY = 0.42;
  var REVEAL_DISTANCE = 1;

  var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(hover: none)').matches;
  var mobile = window.innerWidth < 720;
  var scale = rm ? 0 : REVEAL_DISTANCE * (mobile ? 0.5 : 1);
  var narrow = false;
  var io = null;
  var heroEl = document.querySelector('[data-parallax]');
  var scrollRaf = 0;

  // ---------- scroll reveal ----------
  function showEl(n) {
    n.dataset.shown = '1';
    var delay = (mobile || rm) ? Math.min(160, Number(n.dataset.delay || 0) * 0.5) : Number(n.dataset.delay || 0);
    setTimeout(function () {
      n.style.opacity = '1';
      n.style.transform = 'none';
      n.querySelectorAll('[data-count]').forEach(countUp);
    }, delay);
  }

  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var target = Number(el.dataset.count || 0);
    var prefix = el.dataset.prefix || '';
    if (rm) { el.textContent = prefix + target; return; }
    var dur = 900, t0 = performance.now();
    function tick(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * e);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function wireReveal() {
    document.querySelectorAll('[data-reveal]').forEach(function (n) {
      if (n.dataset.wired) return;
      n.dataset.wired = '1';
      if (scale === 0) {
        n.style.transform = 'none';
      } else {
        var rise = Number(n.dataset.rise || 0);
        if (rise) n.style.transform = 'translateY(' + (rise * scale).toFixed(1) + 'px)';
      }
      var r = n.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > 0) { showEl(n); return; }
      if (io) io.observe(n); else showEl(n);
    });
  }

  // ---------- 3D tilt ----------
  function wireTilt() {
    if (rm || coarse) return;
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      if (el.dataset.tiltWired) return;
      el.dataset.tiltWired = '1';
      var max = Number(el.dataset.tiltMax || 8);
      var lift = Number(el.dataset.lift || 6);
      var raf = 0, tx = 0, ty = 0;
      function apply() {
        raf = 0;
        el.style.transform = 'perspective(900px) rotateX(' + ty.toFixed(2) + 'deg) rotateY(' + tx.toFixed(2) + 'deg) translateY(' + (-lift) + 'px) scale(1.014)';
      }
      el.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = el.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2 * max;
        ty = -((e.clientY - r.top) / r.height - 0.5) * 2 * max;
        el.style.transition = 'transform .18s linear, box-shadow .5s ease, border-color .45s ease, background .45s ease';
        if (!raf) raf = requestAnimationFrame(apply);
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .95s cubic-bezier(.18,1.5,.36,1), box-shadow .5s ease, border-color .45s ease, background .45s ease';
        el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)';
      });
    });
  }

  // ---------- magnetic buttons ----------
  function wireMagnet() {
    if (rm || coarse) return;
    document.querySelectorAll('[data-magnet]').forEach(function (el) {
      if (el.dataset.magWired) return;
      el.dataset.magWired = '1';
      var pull = 7;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        var near = Math.max(r.width, 120);
        el.style.transition = 'transform .14s linear,border-radius .4s cubic-bezier(.22,1.4,.36,1),box-shadow .4s ease,gap .35s ease,background .4s ease,border-color .35s ease';
        el.style.transform = 'translate(' + (dx / near * pull).toFixed(1) + 'px,' + (dy / near * pull - 2).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .8s cubic-bezier(.18,1.6,.36,1),border-radius .4s ease,box-shadow .4s ease,gap .35s ease,background .4s ease,border-color .35s ease';
        el.style.transform = 'translate(0,0)';
      });
    });
  }

  // ---------- process progress bar ----------
  function processUpdate() {
    var track = document.querySelector('[data-proc]');
    if (!track) return;
    var fill = track.querySelector('[data-proc-fill]');
    var dots = track.querySelectorAll('[data-proc-dot]');
    var steps = document.querySelectorAll('[data-step]');
    if (!steps.length) return;
    var first = steps[0].getBoundingClientRect();
    var last = steps[steps.length - 1].getBoundingClientRect();
    var stacked = last.top - first.top > 40;
    track.style.display = 'block';
    var line = window.innerHeight * 0.72;
    var p;
    if (stacked) {
      var span = (last.bottom - first.top) || 1;
      p = (line - first.top) / span;
    } else {
      var sec = document.getElementById('process').getBoundingClientRect();
      p = (line - (sec.top + sec.height * 0.35)) / (sec.height * 0.5);
    }
    p = Math.max(0, Math.min(1, p));
    var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent') || ACCENT;
    if (fill) fill.style.width = (12.5 + p * 75).toFixed(1) + '%';
    dots.forEach(function (d, i) {
      var on = p >= i / (dots.length - 1) * 0.98;
      d.style.background = on ? accent.trim() : '#FAF6F0';
      d.style.borderColor = on ? accent.trim() : 'rgba(46,42,38,.22)';
      d.style.transform = on ? 'scale(1.25)' : 'scale(1)';
    });
    steps.forEach(function (s, i) {
      var on = p >= i / (steps.length - 1) * 0.98;
      s.style.borderTopColor = on ? accent.trim() : 'rgba(46,42,38,.16)';
      var num = s.querySelector('p');
      if (num) num.style.opacity = on ? '1' : '.35';
    });
  }

  // ---------- scroll handling: reveal catch-up, floating dock, hero parallax ----------
  function onScroll() {
    document.querySelectorAll('[data-reveal]:not([data-shown])').forEach(function (n) {
      var r = n.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > 0) showEl(n);
    });
    var dock = narrow ? null : document.querySelector('[data-dock]');
    if (dock) {
      var c = window.scrollY > 150;
      dock.style.right = c ? '50%' : '28px';
      dock.style.left = 'auto';
      dock.style.transform = c ? 'translateX(50%)' : 'translateX(0)';
      dock.style.background = c ? 'rgba(250,246,240,.68)' : 'rgba(250,246,240,.5)';
    }
    var mark = document.querySelector('[data-mark]');
    if (mark) {
      var on = window.scrollY > 150;
      mark.style.opacity = on ? '1' : '0';
      mark.style.width = on ? '30px' : '0px';
      mark.style.marginRight = on ? '9px' : '0px';
      mark.style.marginLeft = on ? '6px' : '0px';
      mark.style.transform = on ? 'scale(1)' : 'scale(.6)';
      mark.style.pointerEvents = on ? 'auto' : 'none';
    }
    if (heroEl && !rm) {
      var y = Math.max(-40, Math.min(40, window.scrollY * -0.06));
      heroEl.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    }
    processUpdate();
  }

  function onScrollThrottled() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(function () { scrollRaf = 0; onScroll(); });
  }

  // ---------- responsive nav dock layout ----------
  function layout() {
    var w = window.innerWidth;
    var dock = document.querySelector('[data-dock]');
    if (!dock) return;
    narrow = w < 900;
    var tight = w < 560;
    dock.style.maxWidth = 'calc(100vw - 20px)';
    dock.style.flexWrap = 'nowrap';
    dock.style.padding = tight ? '5px' : '7px';
    dock.querySelectorAll('a').forEach(function (a) {
      if (a.hasAttribute('data-mark')) return;
      a.style.padding = tight ? '11px 11px' : (w < 760 ? '12px 13px' : '14px 17px');
      a.style.fontSize = tight ? '9.5px' : (w < 760 ? '10.5px' : '11px');
      a.style.letterSpacing = tight ? '.06em' : '.11em';
      a.style.whiteSpace = 'nowrap';
    });
    var quote = dock.querySelector('[data-magnet]');
    if (quote) quote.style.display = w < 430 ? 'none' : '';
    if (narrow) {
      dock.style.top = 'auto';
      dock.style.bottom = '14px';
      dock.style.right = '50%';
      dock.style.left = 'auto';
      dock.style.transform = 'translateX(50%)';
      dock.style.background = 'rgba(250,246,240,.86)';
      document.body.style.paddingBottom = '78px';
    } else {
      dock.style.top = '22px';
      dock.style.bottom = 'auto';
      document.body.style.paddingBottom = '';
      onScrollThrottled();
    }
    var ba = document.querySelector('[data-ba]');
    if (ba) ba.style.minHeight = tight ? '210px' : '';
  }

  // ---------- interaction handlers (bound via data-on-*) ----------
  function pressDown(e) {
    var el = e.currentTarget;
    el.style.transitionProperty = 'scale,transform,border-radius,box-shadow,gap,background,border-color';
    el.style.transitionDuration = '.12s';
    el.style.scale = '.955';
  }
  function pressUp(e) {
    var el = e.currentTarget;
    el.style.transitionDuration = '.7s';
    el.style.transitionTimingFunction = 'cubic-bezier(.18,1.7,.36,1)';
    el.style.scale = '1';
  }

  function glowSet(e, on) {
    var g = e.currentTarget.firstElementChild;
    if (g) {
      g.style.opacity = on ? '1' : '0';
      g.style.transform = on ? 'translate(-50%,-50%) scale(1)' : 'translate(-50%,-50%) scale(.8)';
    }
  }
  function glowOn(e) { glowSet(e, true); }
  function glowOff(e) { glowSet(e, false); }

  function openFaq(q) {
    var wrap = q.closest('[data-faq]');
    var open = q.getAttribute('aria-expanded') === 'true';
    wrap.querySelectorAll('[data-q]').forEach(function (o) {
      var a = o.querySelector('[data-a]'), s = o.querySelector('[data-sign]');
      var on = o === q && !open;
      o.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (a) { a.style.maxHeight = on ? (a.scrollHeight + 40) + 'px' : '0px'; a.style.opacity = on ? '1' : '0'; }
      if (s) { s.style.transform = on ? 'rotate(135deg)' : 'rotate(0deg)'; s.style.opacity = on ? '1' : '.8'; }
    });
  }
  function toggleFaq(e) { openFaq(e.currentTarget); }
  function keyFaq(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFaq(e.currentTarget); } }

  function toggleWork(e) {
    var card = e.currentTarget;
    var p = card.querySelector('[data-panel]');
    var chev = card.querySelector('[data-chev]');
    var open = card.dataset.open === '1';
    card.dataset.open = open ? '0' : '1';
    p.style.maxHeight = open ? '0px' : (p.scrollHeight + 40) + 'px';
    p.style.opacity = open ? '0' : '1';
    if (chev) chev.style.transform = open ? '' : 'rotate(180deg)';
  }
  function keyWork(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleWork(e); } }

  function baSet(el, pct) {
    var p = Math.max(0, Math.min(100, pct));
    el.querySelector('[data-ba-before]').style.clipPath = 'inset(0 ' + (100 - p) + '% 0 0)';
    el.querySelector('[data-ba-handle]').style.left = p + '%';
    el.setAttribute('aria-valuenow', String(Math.round(p)));
    var l = el.querySelector('[data-ba-label-l]');
    if (l) l.style.opacity = p < 24 ? '0' : '1';
  }
  function baFrom(el, clientX) {
    var r = el.getBoundingClientRect();
    baSet(el, (clientX - r.left) / r.width * 100);
  }
  function baDown(e) {
    var el = e.currentTarget;
    el.dataset.drag = '1';
    el.querySelector('[data-ba-before]').style.transition = 'none';
    el.querySelector('[data-ba-handle]').style.transition = 'none';
    if (el.setPointerCapture && e.pointerId != null) { try { el.setPointerCapture(e.pointerId); } catch (err) {} }
    baFrom(el, e.clientX);
  }
  function baMove(e) { var el = e.currentTarget; if (el.dataset.drag === '1') baFrom(el, e.clientX); }
  function baUp(e) { e.currentTarget.dataset.drag = '0'; }
  function baKey(e) {
    var el = e.currentTarget;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    el.querySelector('[data-ba-before]').style.transition = 'clip-path .5s cubic-bezier(.22,1.32,.36,1)';
    el.querySelector('[data-ba-handle]').style.transition = 'left .5s cubic-bezier(.22,1.32,.36,1)';
    baSet(el, Number(el.getAttribute('aria-valuenow') || 50) + (e.key === 'ArrowLeft' ? -6 : 6));
  }

  // Stamp when the form became available, used server-side as a time-trap:
  // real people take at least a couple seconds to fill a form, bots don't.
  var contactForm = document.querySelector('form[data-on-submit="submitForm"]');
  if (contactForm && contactForm.elements.form_loaded_at) {
    contactForm.elements.form_loaded_at.value = String(Date.now());
  }

  // Submits to the /api/contact serverless function (Supabase + Resend).
  function submitForm(e) {
    e.preventDefault();
    var form = e.currentTarget;
    var btn = form.querySelector('[data-send]');
    var icon = btn.querySelector('[data-send-icon]');
    var errorEl = form.querySelector('[data-send-error]');

    if (btn.dataset.sent === '1' || btn.dataset.sending === '1') return;

    if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }

    var turnstileInput = form.querySelector('[name="cf-turnstile-response"]');
    var turnstileToken = turnstileInput ? turnstileInput.value : '';
    if (!turnstileToken) {
      if (errorEl) {
        errorEl.textContent = 'Please wait a moment for the security check to finish, then press Send again.';
        errorEl.hidden = false;
      }
      return;
    }

    btn.dataset.sending = '1';
    btn.style.scale = '.94';

    var payload = {
      name: form.name.value,
      email: form.email.value,
      message: form.message.value,
      company_hp: form.company_hp.value,
      form_loaded_at: form.form_loaded_at.value,
      turnstile_token: turnstileToken
    };

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) { return { status: res.status, data: data }; });
      })
      .then(function (result) {
        btn.dataset.sending = '0';
        if (result.data && result.data.ok) {
          btn.dataset.sent = '1';
          btn.style.transitionTimingFunction = 'cubic-bezier(.18,1.7,.36,1)';
          btn.style.scale = '1';
          btn.style.background = '#2E2A26';
          btn.style.borderRadius = '999px';
          btn.firstChild.textContent = 'Sent — thank you';
          if (icon) icon.textContent = '✓';
          setTimeout(function () {
            form.querySelectorAll('input,textarea').forEach(function (i) { i.value = ''; });
          }, 420);
        } else {
          btn.style.scale = '1';
          if (window.turnstile) window.turnstile.reset();
          if (errorEl) {
            errorEl.textContent = (result.data && result.data.error) || 'Something went wrong. Please try again.';
            errorEl.hidden = false;
          }
        }
      })
      .catch(function () {
        btn.dataset.sending = '0';
        btn.style.scale = '1';
        if (window.turnstile) window.turnstile.reset();
        if (errorEl) {
          errorEl.textContent = 'Could not reach the server. Check your connection and try again.';
          errorEl.hidden = false;
        }
      });
  }

  var handlers = {
    pressDown: pressDown, pressUp: pressUp, glowOn: glowOn, glowOff: glowOff,
    toggleFaq: toggleFaq, keyFaq: keyFaq, toggleWork: toggleWork, keyWork: keyWork,
    submitForm: submitForm, baDown: baDown, baMove: baMove, baUp: baUp, baKey: baKey
  };

  var EVENT_ATTRS = ['click', 'keydown', 'mousedown', 'mouseup', 'mouseleave', 'mouseenter', 'submit', 'pointerdown', 'pointermove', 'pointerup', 'pointerleave'];

  function wireActions() {
    EVENT_ATTRS.forEach(function (evt) {
      var attr = 'data-on-' + evt;
      document.querySelectorAll('[' + attr + ']').forEach(function (el) {
        var wiredKey = 'wired' + evt;
        if (el.dataset[wiredKey]) return;
        el.dataset[wiredKey] = '1';
        var fn = handlers[el.getAttribute(attr)];
        if (fn) el.addEventListener(evt, fn);
      });
    });
  }

  // ---------- init ----------
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { showEl(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  }

  document.documentElement.style.setProperty('--accent', ACCENT);
  var grain = document.querySelector('[data-grain]');
  if (grain) grain.style.opacity = String(GRAIN_OPACITY);

  wireReveal();
  wireTilt();
  wireMagnet();
  wireActions();

  window.addEventListener('scroll', onScrollThrottled, { passive: true });
  window.addEventListener('resize', function () { onScrollThrottled(); layout(); }, { passive: true });

  layout();
  processUpdate();

  setTimeout(function () {
    document.querySelectorAll('[data-reveal]').forEach(function (n) {
      if (getComputedStyle(n).opacity === '0') { n.style.opacity = '1'; n.style.transform = 'none'; }
    });
  }, 4000);
})();
