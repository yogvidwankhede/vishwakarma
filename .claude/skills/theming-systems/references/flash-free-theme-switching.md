# Flash-free theme switching, end to end

The flash of wrong theme has one cause: the browser painted before the application knew which
theme to use. Every fix is a variation on "know earlier".

## The resolution order

1. An explicit stored choice, if one exists and is valid.
2. `prefers-color-scheme`, if no explicit choice exists.
3. The product default, if that media query is unsupported.

Store the *mode*, not the resolved theme: `"light"`, `"dark"`, or absent meaning "follow
the system". A stored boolean cannot keep following the OS, and any stale or unrecognised
value must fall through to system rather than be forced to light.

## The script

Place this first inside `<head>`, above every stylesheet link.

    <script>
      (function () {
        var root = document.documentElement
        var stored = null
        try { stored = localStorage.getItem('theme-mode') } catch (e) {}
        var mode = stored === 'light' || stored === 'dark' ? stored : 'system'
        var dark = mode === 'dark' || (
          mode === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
        )
        root.dataset.theme = dark ? 'dark' : 'light'
        root.dataset.themeMode = mode
        root.style.colorScheme = dark ? 'dark' : 'light'
      })()
    </script>

Line by line, because every line is load-bearing.

**`document.documentElement`** is used because `document.body` does not exist yet — the
script runs during head parsing — and because the theme attribute must be an ancestor of
everything.

**The `try/catch` around `localStorage`** is not padding. Access *throws*, rather than
returning null, in some private-browsing configurations and in any third-party iframe where
storage access is blocked. An uncaught throw aborts the script and leaves the attribute
unset, producing the exact flash you are preventing, on the browsers least likely to be in
your test matrix.

**Validating `stored`** makes a value from an older release, or from a user editing
storage, fall through to system, which is always safe.

**Both attributes are written.** `data-theme` is what CSS selects on; `data-theme-mode`
is what the switcher reads to show System, Light, or Dark as selected. The mode is not
recoverable from the resolved theme.

**`root.style.colorScheme`** is set inline at the same moment, so native widgets and the
canvas match before the stylesheet parses — the one case where an inline style is correct.

## Why inline, and why blocking

`defer` and `type="module"` run after document parsing; `async` runs whenever it
arrives; a framework effect runs after hydration. All are after first paint, so all produce a
visible repaint. An *external* synchronous script does block the parser, but adds a network
round trip before anything renders — a blank screen instead of a flash, and a request on the
critical path for roughly 400 bytes of logic.

Under CSP, do not relax the policy for this: emit a per-request nonce
(`<script nonce="{value}">`) or add the script's SHA-256 hash to `script-src`.

## Server rendering

The server cannot know the system preference: `prefers-color-scheme` is a client
capability and `Sec-CH-Prefers-Color-Scheme` is absent on the first request. Render
theme-neutral markup and let the inline script decide. Do not read the theme during render to
choose markup — components must be identical across themes and differ only in resolved token
values, or hydration mismatches. Where one must branch on theme in JavaScript, initialise
from `document.documentElement.dataset.theme` in a layout effect.

Authenticated products may also persist the mode in a cookie, which *is* available on the
first request. Keep the inline script anyway: a cookie cannot answer the system branch.

## The switcher

    function setMode(mode) {
      const root = document.documentElement
      const dark = mode === 'dark' || (
        mode === 'system' &&
        matchMedia('(prefers-color-scheme: dark)').matches
      )
      root.dataset.theme = dark ? 'dark' : 'light'
      root.dataset.themeMode = mode
      root.style.colorScheme = dark ? 'dark' : 'light'
      if (mode === 'system') localStorage.removeItem('theme-mode')
      else localStorage.setItem('theme-mode', mode)
    }

Expose it as a radio group or segmented control of three labelled options, grouped for
assistive technology. An icon button cycling three states gives no indication of what the
next press does.

## Following the system live

    const query = matchMedia('(prefers-color-scheme: dark)')
    query.addEventListener('change', (event) => {
      if (document.documentElement.dataset.themeMode !== 'system') return
      document.documentElement.dataset.theme = event.matches ? 'dark' : 'light'
      document.documentElement.style.colorScheme = event.matches ? 'dark' : 'light'
    })

Gate on the mode inside the listener rather than subscribing and unsubscribing.

## The switch itself

Do not put `transition: background-color 300ms` on `*`. Hundreds of simultaneous
transitions composite unevenly, the page melts rather than switches, and anything mounting
mid-transition arrives part-way through its fade. For a smooth switch use a view transition,
which snapshots and cross-fades once:

    if (document.startViewTransition) {
      document.startViewTransition(() => setMode(next))
    } else {
      setMode(next)
    }

Gate it behind `prefers-reduced-motion`, and keep the direct call as the fallback path.

## Things that still flash

- **Iframes.** A frame does not inherit the parent's attribute. Pass the theme in the URL or
  via `postMessage`, and set `color-scheme` inside the frame document.
- **The canvas before CSS.** Add `<meta name="color-scheme" content="light dark">`.
- **`<canvas>` and generated SVG.** These read tokens at draw time and must be redrawn on
  theme change, not restyled.
- **Bfcache restores.** A page restored from the back/forward cache does not re-run the
  script. Re-resolve on `pageshow` when `event.persisted` is true.
