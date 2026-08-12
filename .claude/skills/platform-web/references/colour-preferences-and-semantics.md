# OKLCh colour and theming, preference queries, semantic HTML, and progressive enhancement

## 1. Colour and theming

Define colour in **OKLCh**, a perceptually uniform space where `L` is perceived lightness, `C`
is chroma and `H` is hue angle. Uniformity is the point: in `hsl()`, holding lightness constant
and rotating hue produces wildly different perceived brightness — yellow at `hsl(60 100% 50%)` is
far lighter than blue at `hsl(240 100% 50%)` — so an HSL palette cannot hold contrast constant
across hues. In OKLCh, constant `L` means constant perceived lightness, which is what makes a
systematic ramp possible and contrast predictable before you measure it. OKLCh also reaches colours
outside sRGB on wide-gamut displays, so give an sRGB fallback first and upgrade inside a feature
query:

```css
:root { --accent: #3b5bdb; }
@supports (color: oklch(0.5 0.1 250)) {
  :root { --accent: oklch(0.55 0.17 262); }
}
```

Declare `color-scheme: light dark` on `:root` so the browser themes form controls, scrollbars,
spell-check underlines and the default canvas — without it, a dark page keeps light scrollbars and
white-backed selects. Read the preference with `prefers-color-scheme` and hold resolved values in
CSS custom properties, so a theme is a change of variable values on one element rather than a
parallel set of component rules.

Theme flash has exactly one cause: the first paint used a theme that was later corrected. Any
resolution that happens in a framework effect, after hydration, or in a deferred script is by
definition after first paint, so the user sees white then dark. The fix is to set the theme class
or `data-theme` attribute **before** the browser paints, with a small synchronous inline script
in `<head>`, which runs before body content is parsed so no incorrect frame is ever composited:

```html
<script>
  try {
    const t = localStorage.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = t;
    document.documentElement.style.colorScheme = t;
  } catch {}
</script>
```

This is the one place where a render-blocking script is correct; keep it under about 1KB, wrap it
in `try/catch` because `localStorage` throws in some privacy modes, and set `color-scheme` in
the same script so native controls match from the first frame too.

## 2. User preference queries

Each of these reports a setting the user has already made at the operating system level, so an
unhandled branch is not a missing feature — it is an ignored instruction.

`prefers-reduced-motion: reduce` is set by people for whom vestibular motion causes nausea or
migraine. The correct response is not to remove all animation, which destroys the continuity cues
that make an interface legible, but to remove **large-area movement, parallax and scaling** while
keeping opacity and colour transitions under about 150ms. Write the reduced branch as an explicit
rule rather than a global `animation: none !important`, which breaks components relying on an
`animationend` event to clean up.

`prefers-reduced-transparency: reduce` asks for opaque surfaces; replace
`backdrop-filter: blur()` panels with a solid background, which also removes their real rendering
cost. `prefers-contrast: more` asks for stronger separation: raise text contrast toward 7:1 and
make borders explicit rather than implied by a subtle shadow. `forced-colors: active` means the
operating system has substituted its own palette — your colours are overridden and background
images on interactive elements are dropped — so use `forced-color-adjust` sparingly and express
boundaries with real `border` declarations, since a shadow-only separator vanishes entirely.

## 3. Semantic HTML as the accessibility substrate

A native `<button>` arrives with four behaviours implemented: it is in the tab order without
`tabindex`, it activates on both Enter and Space, it exposes the `button` role to assistive
technology, and it reports disabled and pressed state through the accessibility tree. A
`<div role="button">` has one of those — the role — and you must rebuild the other three. In
practice teams add `tabindex="0"` and a click handler, ship it, then discover months later that
Space scrolls the page instead of activating the control. Custom elements are not forbidden; the
point is that every native behaviour you discard is a defect you have not found yet.

The same logic covers the rest of the substrate. Landmarks — `<header>`, `<nav>`, `<main>`,
`<aside>`, `<footer>` — give screen reader users a jump menu that no visual layout provides;
exactly one `<main>` per page. Headings must descend without skipping levels, because heading
navigation is how non-visual users scan, and a jump from `<h2>` to `<h4>` reads as a missing
section. Every form control needs a programmatic label — `<label for>` pointing at the control's
`id`, or a wrapping `<label>`. Placeholder text is not one: it vanishes on focus, usually fails
contrast, and is not reliably announced.

`<dialog>` with `showModal()` gives focus trapping, inert background content, Escape-to-close
and the `::backdrop` pseudo-element with no JavaScript. The Popover API (`popover` plus
`popovertarget`) gives light-dismiss, top-layer stacking and focus management for non-modal
surfaces such as menus and tooltips. Both promote the element to the **top layer**, which is why
they escape the `overflow: hidden` and `z-index` stacking contexts that trap a hand-rolled
dropdown inside a scrolling panel.

## 4. Progressive enhancement of modern CSS

`@supports` tests a declaration's parseability, not its correctness, so it is reliable for
property/value support and useless for judging whether a feature is well implemented. Test the
risky declaration itself, never a proxy for it.

| Feature | Fallback needed? | Degradation without it |
|---|---|---|
| `:has()` | No | Selector does not match; base styles apply, layout stays valid |
| `@container` | Yes, for load-bearing layout | All container rules ignored; component renders at its base layout |
| `@starting-style`, View Transitions | No | Element appears or navigation happens without the transition |
| Scroll-driven animations (`animation-timeline`) | Yes, if state depends on it | Animation runs on the document timeline and plays once immediately |
| Anchor positioning (`anchor-name`, `position-anchor`) | Yes | Positioned element falls back to its containing block, often the wrong place |
| `subgrid` | Yes, for alignment-critical grids | Nested grid gets its own tracks; columns stop lining up |

The dividing line is decorative versus structural: a missing view transition costs an animation, a
missing container query costs a layout. Write the base layer complete and usable on its own, then
add the enhancement — the reverse order produces a base layer that was never tested and appears
only on the browsers you did not check. Scroll-driven animations deserve particular care because
the failure is not "nothing happens": an unhonoured `animation-timeline: view()` falls back to
the document timeline and plays at once on load, so an element meant to fade in on scroll is
already faded in.

## Pass conditions

### Colour, theming and preferences

- Are colours defined in OKLCh with an sRGB fallback ahead of an `@supports` upgrade?
- Does the theme resolve in a synchronous inline `<head>` script before first paint, wrapped in `try/catch`, and does it set `color-scheme` alongside the theme attribute?
- Does each of `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`, `prefers-color-scheme` and `forced-colors` have a handled branch?

### Markup and enhancement

- Are all interactive controls native elements, or do custom controls implement focusability, keyboard activation, role and state?
- Is there exactly one `<main>`, a labelled `<nav>` per navigation region, a heading order with no skipped levels, and a real `<label>` on every form control?
- Are modal and overlay surfaces built on `<dialog>` with `showModal()` or the Popover API rather than hand-rolled overlays?
- Is every structural modern-CSS feature — container queries, scroll-driven animations, anchor positioning, subgrid — behind `@supports` with a usable base layer?
