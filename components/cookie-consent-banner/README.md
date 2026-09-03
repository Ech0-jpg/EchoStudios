# Cookie Consent Banner

Reusable, brand-agnostic cookie consent component for client sites (the
"Privacy Policy Setup" add-on). Not used on EchoStudios' own site — Vercel
Web Analytics is cookieless, so it isn't needed there.

## Drop-in usage

Copy `cookie-consent-banner.css` and `cookie-consent-banner.js` into the
client project, then:

```html
<link rel="stylesheet" href="cookie-consent-banner.css">
<script src="cookie-consent-banner.js"></script>
<script>
  EchoCookieConsent.init({
    variant: 'bar',            // 'bar' (full-width) or 'card' (bottom-corner)
    message: 'We use cookies to understand how visitors use this site.',
    learnMoreHref: '/privacy',
    onAccept: function () {
      // Only place non-essential script loading here — e.g.:
      // var s = document.createElement('script');
      // s.src = 'https://www.googletagmanager.com/gtag/js?id=XXXXXXX';
      // document.head.appendChild(s);
    },
    onDecline: function () {
      // optional
    }
  });
</script>
```

Open `demo.html` in a browser to preview both variants side by side.

## Behavior

- Shows on first visit, hidden on return visits once a choice is stored
  (`localStorage`, key configurable via `storageKey`).
- `onAccept` / `onDecline` fire once per session-defining choice — including
  on repeat visits, so gated scripts still load without re-showing the
  banner. Never place a non-essential `<script>` tag directly in the page;
  only load it from inside `onAccept` (or after checking
  `EchoCookieConsent.getConsent() === 'accepted'`), so declining actually
  leaves it unloaded.
- `EchoCookieConsent.getConsent()` returns `'accepted'`, `'declined'`, or
  `null`.
- `EchoCookieConsent.reset()` clears the stored choice (useful for testing).

## Theming

Brand-agnostic by default — override these custom properties on `:root` (or
any ancestor) to match the host site instead of EchoStudios' palette:

| Property        | Default (EchoStudios example) |
|------------------|-------------------------------|
| `--ccb-accent`   | `#B0332B`                     |
| `--ccb-radius`   | `16px`                        |
| `--ccb-font`     | `Inter, system-ui, sans-serif`|
| `--ccb-bg`       | `#FFFDFA`                     |
| `--ccb-text`     | `#2E2A26`                     |
| `--ccb-border`   | `rgba(46,42,38,.14)`          |
