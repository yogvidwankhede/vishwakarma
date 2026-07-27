# Complete elevation and surface token set

A working set for both themes. Values are starting points calibrated for a neutral-cool
palette; retune the shadow hue to your brand and keep the ratios.

## Shadow colour

Define the shadow as a hue plus channels, not as a finished colour, so both themes can
share the geometry and differ only in strength.

```css
:root {
  --shadow-rgb: 16 18 32;      /* dark tint of the brand hue, never 0 0 0 */
  --shadow-contact: 0.10;
  --shadow-ambient: 0.08;
}
```

## Light theme

Elevation is carried by shadow. Surfaces stay near-white and barely differ.

```css
:root {
  --surface-0: oklch(0.99 0.003 250);   /* page */
  --surface-1: oklch(1 0 0);            /* card */
  --surface-2: oklch(1 0 0);            /* popover */
  --surface-3: oklch(1 0 0);            /* modal */
  --border-subtle: oklch(0.92 0.006 250);
  --border-strong: oklch(0.84 0.010 250);

  --elevation-0: none;
  --elevation-1:
    0 1px 2px -1px rgb(var(--shadow-rgb) / 0.10),
    0 2px 6px -2px rgb(var(--shadow-rgb) / 0.08);
  --elevation-2:
    0 2px 4px -2px rgb(var(--shadow-rgb) / 0.10),
    0 8px 16px -4px rgb(var(--shadow-rgb) / 0.10);
  --elevation-3:
    0 4px 8px -4px rgb(var(--shadow-rgb) / 0.12),
    0 24px 48px -12px rgb(var(--shadow-rgb) / 0.16);
}
```

Level 0 uses `--border-subtle` and no shadow. Levels 1 to 3 use the shadow and no border.

## Dark theme

Elevation is carried by surface lightness. Shadows remain only as reinforcement at the top
two levels, and every raised surface gains a top inset highlight.

```css
[data-theme='dark'] {
  --surface-0: oklch(0.17 0.012 250);
  --surface-1: oklch(0.21 0.012 250);
  --surface-2: oklch(0.25 0.013 250);
  --surface-3: oklch(0.29 0.014 250);
  --border-subtle: oklch(0.30 0.014 250);
  --border-strong: oklch(0.40 0.016 250);

  --highlight-top: inset 0 1px 0 rgb(255 255 255 / 0.06);

  --elevation-0: none;
  --elevation-1: var(--highlight-top);
  --elevation-2:
    var(--highlight-top),
    0 8px 16px -4px rgb(0 0 0 / 0.40);
  --elevation-3:
    var(--highlight-top),
    0 24px 48px -12px rgb(0 0 0 / 0.55);
}
```

Two constraints on the dark ramp. The step between adjacent surfaces must stay in the 3 to 4
point range of L: below 2 points the levels are indistinguishable, above 5 the top surfaces
turn grey and the theme stops reading as dark. And chroma must stay low and roughly constant
— lightening a dark surface by adding chroma tints it visibly rather than raising it.

## Elevation semantics

| Level | Surface | Used for | Depth cue |
|---|---|---|---|
| 0 | `--surface-0` | page background, inline panels, table rows | border only |
| 1 | `--surface-1` | cards, resting buttons, list items | contact + ambient shadow (light) / lightness (dark) |
| 2 | `--surface-2` | dropdowns, popovers, tooltips, select menus | as above, doubled offsets |
| 3 | `--surface-3` | modals, drawers, command palettes | as above, plus a scrim behind |

Anything that seems to need a fifth level is a state. Hover raises an element by one level;
pressed drops it below its resting level; disabled removes the shadow entirely, because a
disabled control is not liftable.

## Interaction states

```css
.button {
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.12), var(--elevation-1);
  transition: box-shadow 120ms ease, transform 120ms ease;
}
.button:hover  { box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.12), var(--elevation-2); }
.button:active {
  box-shadow: inset 0 2px 4px rgb(0 0 0 / 0.16);
  transform: translateY(1px);
}
.input {
  box-shadow: inset 0 2px 4px -2px rgb(var(--shadow-rgb) / 0.12);
  border: 1px solid var(--border-strong);
}
```

The input keeps both a border and an inset shadow, which is not a contradiction: the border
delineates a flush edge and the inset says the well is recessed. The prohibition is on
combining a border with an *outer* shadow.

## Glass

```css
.glass {
  background: rgb(255 255 255 / 0.92);   /* opaque fallback, ships first */
  border-bottom: 1px solid var(--border-subtle);
}
@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px))) {
  .glass {
    background: rgb(255 255 255 / 0.68);
    -webkit-backdrop-filter: blur(12px) saturate(1.4);
    backdrop-filter: blur(12px) saturate(1.4);
  }
}
```

The `saturate` companion matters: blurring alone averages the backdrop toward grey, and a
saturation boost of 1.3 to 1.8 restores the colour the blur removed. That is the difference
between glass and frosted plastic.

## Radius scale

```css
:root {
  --radius-xs: 4px;    /* badges, chips, checkboxes */
  --radius-sm: 6px;    /* inputs, small buttons */
  --radius-md: 10px;   /* buttons, list items */
  --radius-lg: 16px;   /* cards, panels */
  --radius-xl: 24px;   /* modals, sheets, hero surfaces */
  --radius-full: 9999px;
}
```

Nesting is arithmetic: subtract the padding. A `--radius-lg` card with 8px of padding takes
`--radius-md` minus 2 on its children, which in practice means reaching for the token one
step down and checking it against `outer − padding`. Where padding exceeds the outer
radius, the inner element may be square; the outer curve no longer influences it.

## Migration check

Before shipping, grep the codebase for literal `box-shadow:` declarations that are not
`var(--elevation-*)`. Every hit is either a missing token or a component that invented its
own light source.
