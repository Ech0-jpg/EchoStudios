// Cookie Consent Banner — reusable, brand-agnostic component.
//
// Usage:
//   <link rel="stylesheet" href="cookie-consent-banner.css">
//   <script src="cookie-consent-banner.js"></script>
//   <script>
//     EchoCookieConsent.init({
//       variant: 'bar',                 // 'bar' | 'card'
//       message: 'We use cookies to understand how visitors use this site.',
//       learnMoreHref: '/privacy',
//       onAccept: function () {
//         // load non-essential / analytics scripts here, e.g.:
//         // var s = document.createElement('script');
//         // s.src = 'https://www.googletagmanager.com/gtag/js?id=XXXX';
//         // document.head.appendChild(s);
//       },
//       onDecline: function () {
//         // optional — runs when the visitor declines
//       }
//     });
//   </script>
//
// Non-essential scripts must only ever be loaded from inside onAccept (or
// after checking EchoCookieConsent.getConsent() === 'accepted') — never
// placed directly in the page markup — so a decline actually leaves them
// unloaded, not just visually hidden.
(function (window, document) {
  'use strict';

  var DEFAULTS = {
    variant: 'bar',
    message: 'We use cookies to understand how visitors use this site.',
    acceptLabel: 'Accept',
    declineLabel: 'Decline',
    learnMoreLabel: 'Learn more',
    learnMoreHref: '/privacy',
    storageKey: 'echo-cookie-consent',
    onAccept: null,
    onDecline: null
  };

  var banner = null;

  function getConsent(storageKey) {
    try {
      return window.localStorage.getItem(storageKey || DEFAULTS.storageKey);
    } catch (e) {
      return null;
    }
  }

  function setConsent(storageKey, value) {
    try {
      window.localStorage.setItem(storageKey || DEFAULTS.storageKey, value);
    } catch (e) {
      // localStorage unavailable (private mode, disabled storage, etc.) —
      // the banner will simply re-show next visit, which is an acceptable
      // fallback rather than throwing.
    }
  }

  function remove() {
    if (!banner) return;
    var el = banner;
    banner = null;
    el.classList.add('ccb-is-hiding');
    var done = function () { if (el.parentNode) el.parentNode.removeChild(el); };
    var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (rm) { done(); return; }
    setTimeout(done, 550);
  }

  function build(opts) {
    var variant = opts.variant === 'card' ? 'card' : 'bar';
    var el = document.createElement('div');
    el.className = 'ccb-banner ccb-banner--' + variant;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Cookie consent');

    var copy = document.createElement('div');
    copy.className = 'ccb-copy';

    var message = document.createElement('p');
    message.className = 'ccb-message';
    message.textContent = opts.message;
    copy.appendChild(message);

    if (opts.learnMoreHref) {
      var learn = document.createElement('a');
      learn.className = 'ccb-learn';
      learn.href = opts.learnMoreHref;
      learn.textContent = opts.learnMoreLabel;
      copy.appendChild(learn);
    }

    var actions = document.createElement('div');
    actions.className = 'ccb-actions';

    var declineBtn = document.createElement('button');
    declineBtn.type = 'button';
    declineBtn.className = 'ccb-btn ccb-btn--decline';
    declineBtn.textContent = opts.declineLabel;
    declineBtn.addEventListener('click', function () {
      setConsent(opts.storageKey, 'declined');
      remove();
      if (typeof opts.onDecline === 'function') opts.onDecline();
    });

    var acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.className = 'ccb-btn ccb-btn--accept';
    acceptBtn.textContent = opts.acceptLabel;
    acceptBtn.addEventListener('click', function () {
      setConsent(opts.storageKey, 'accepted');
      remove();
      if (typeof opts.onAccept === 'function') opts.onAccept();
    });

    actions.appendChild(declineBtn);
    actions.appendChild(acceptBtn);

    el.appendChild(copy);
    el.appendChild(actions);
    return el;
  }

  function init(userOpts) {
    var opts = {};
    for (var k in DEFAULTS) opts[k] = DEFAULTS[k];
    if (userOpts) for (var k2 in userOpts) opts[k2] = userOpts[k2];

    var existing = getConsent(opts.storageKey);
    if (existing === 'accepted') {
      if (typeof opts.onAccept === 'function') opts.onAccept();
      return;
    }
    if (existing === 'declined') {
      if (typeof opts.onDecline === 'function') opts.onDecline();
      return;
    }

    if (banner) return; // already showing
    banner = build(opts);
    document.body.appendChild(banner);
  }

  function reset(storageKey) {
    try { window.localStorage.removeItem(storageKey || DEFAULTS.storageKey); } catch (e) {}
  }

  window.EchoCookieConsent = {
    init: init,
    getConsent: getConsent,
    reset: reset
  };
})(window, document);
