# A complete worked type scale for product UI

A concrete scale for an application interface: base 16px, ratio 1.2 (minor third) rounded
to whole pixels, one sans family with weights 400/500/600/700. Every value below is
derived, not chosen ad hoc — leading and tracking follow from size, and the roles map onto
real components.

## The tokens

| Token | Size | Weight | line-height | Tracking | Where it is used |
| --- | --- | --- | --- | --- | --- |
| `display` | 40px | 700 | 44px (1.10) | -0.02em | Marketing hero, empty-state headline |
| `title-1` | 32px | 600 | 38px (1.19) | -0.015em | Page title |
| `title-2` | 24px | 600 | 31px (1.29) | -0.01em | Section heading, modal title |
| `title-3` | 20px | 600 | 28px (1.40) | -0.005em | Card title, panel heading |
| `body-lg` | 18px | 400 | 28px (1.56) | 0 | Lead paragraph, dialog body |
| `body` | 16px | 400 | 24px (1.50) | 0 | Default prose and form values |
| `body-sm` | 14px | 400 | 20px (1.43) | +0.005em | Table cells, dense lists, help text |
| `label` | 14px | 500 | 20px (1.43) | +0.005em | Form labels, buttons, tabs |
| `caption` | 12px | 400 | 16px (1.33) | +0.01em | Timestamps, metadata, footnotes |
| `overline` | 12px | 600 | 16px (1.33) | +0.08em, uppercase | One eyebrow label per screen, at most |
| `code` | 14px | 400 | 20px (1.43) | 0 | Inline code, identifiers, logs |

Eleven tokens, but only seven distinct sizes — `label` differs from `body-sm` by weight
alone, and `overline` from `caption` by weight and casing. That is the point: below 20px,
weight separates roles more cleanly than size does.

Every line-height is a whole number of pixels and a multiple of 4, so text blocks stack on
the same spacing grid as everything else without a baseline grid.

## As CSS

```css
:root {
  --font-sans: 'Brand', 'Brand Fallback', system-ui, sans-serif;
  --font-mono: 'Brand Mono', ui-monospace, monospace;

  --text-display: 700 2.5rem/2.75rem var(--font-sans);
  --text-title-1: 600 2rem/2.375rem var(--font-sans);
  --text-title-2: 600 1.5rem/1.9375rem var(--font-sans);
  --text-title-3: 600 1.25rem/1.75rem var(--font-sans);
  --text-body-lg: 400 1.125rem/1.75rem var(--font-sans);
  --text-body: 400 1rem/1.5rem var(--font-sans);
  --text-body-sm: 400 0.875rem/1.25rem var(--font-sans);
  --text-caption: 400 0.75rem/1rem var(--font-sans);

  --tracking-display: -0.02em;
  --tracking-title-1: -0.015em;
  --tracking-title-2: -0.01em;
  --tracking-title-3: -0.005em;
  --tracking-body: 0;
  --tracking-small: 0.005em;
  --tracking-caption: 0.01em;
  --tracking-caps: 0.08em;
}

h1 {
  font: var(--text-title-1);
  letter-spacing: var(--tracking-title-1);
  text-wrap: balance;
}

p {
  font: var(--text-body);
  max-inline-size: 65ch;
  text-wrap: pretty;
}

td, .tabular {
  font: var(--text-body-sm);
  font-variant-numeric: tabular-nums;
}
```

Sizes are expressed in `rem` so that a user's browser font-size setting scales the whole
interface; pixel values in the table are what those `rem` values render to at the 16px
default. Tracking stays in `em` so it scales with the type rather than with the root.

## Responsive behaviour

Do not scale the whole system. Only the top two or three steps need to shrink on small
screens, because `body` at 16px is already correct everywhere and shrinking it hurts.

```css
@media (max-width: 640px) {
  :root {
    --text-display: 700 2rem/2.25rem var(--font-sans);
    --text-title-1: 600 1.75rem/2.125rem var(--font-sans);
  }
}
```

If you prefer fluid type, clamp only the display steps and always give `clamp()` a `rem`
based middle term — `clamp(2rem, 1.5rem + 2.5vw, 2.5rem)` — so that a viewport-only middle
term does not defeat browser zoom.

## Editorial variant

For an article layout, keep the same structure and change two inputs: base 18px and ratio
1.333. That yields 18 / 24 / 32 / 42 / 56 / 75, with body leading raised to 1.6 because the
measure is longer, and measure held to 68ch. The token names and the leading/tracking
relationships do not change — only the base and the ratio do, which is the whole argument
for deriving a scale instead of listing one.

## Applying it

- Give every component a token name, never a raw size. A component that needs a size not
  in the table is a signal that either the component is wrong or the table is missing a
  step; resolve it in the table, once.
- Keep the number of tokens visible on any one screen to about six.
- When a designer asks for "slightly bigger", check whether they mean heavier. They
  usually do.
