# Building a typed variant system

The goal is that `<Button variant="danger" size="lg" />` is checked by the compiler,
resolves to a deterministic class string, and can still be overridden by a caller's
`className` without a specificity fight.

## Why conditional strings fail

```tsx
className={\`btn ${size === 'lg' ? 'px-6 py-3' : 'px-3 py-1.5'} ${className}\`}
```

Three failures. The legal combinations are invisible to the compiler, so `size="large"`
typechecks if `size` is `string`. Adding a third axis multiplies the ternaries rather
than adding to them. And the trailing `className` does not reliably win: when two utility
classes set the same property, the winner is decided by their order in the generated
stylesheet, not by their order in the attribute. A caller passing `px-2` against a built-in
`px-6` gets whichever the framework emitted last, which is stable in a way that looks like
a rule and is not.

## The shape

Define the variant map as data, derive the prop type from it:

```ts
const button = {
  base: 'inline-flex items-center justify-center rounded-md font-medium ' +
        'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ' +
        'disabled:pointer-events-none disabled:opacity-50',
  variants: {
    tone: {
      primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
      subtle: 'bg-surface-raised text-fg hover:bg-surface-hover',
      danger: 'bg-danger text-danger-fg hover:bg-danger-hover',
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-9 px-4 text-sm',
      lg: 'h-11 px-6 text-base',
    },
  },
  defaults: { tone: 'primary', size: 'md' },
} as const

type Variants = {
  [K in keyof typeof button.variants]?: keyof (typeof button.variants)[K]
}
```

`as const` is what makes this work: without it the object's values widen to `string` and
the derived type becomes useless. `Variants` is now
`{ tone?: 'primary' | 'subtle' | 'danger'; size?: 'sm' | 'md' | 'lg' }`, and it updates
automatically when a variant is added. Nobody maintains a parallel union by hand.

## Compound variants

Some combinations need a class that neither axis owns alone — a danger button at small size
may need a heavier border to stay legible. Model these as an explicit list of predicates
rather than by injecting conditionals into the map:

```ts
const compound = [
  { when: { tone: 'danger', size: 'sm' }, class: 'border border-danger-strong' },
] as const
```

Applied after the base variants, in declaration order. Keeping them in a separate list means
the primary map stays readable and the exceptions stay countable — if that list grows past
about five entries, the axes are wrong and should be refactored, usually because two
supposedly independent axes are actually one.

## Resolution order and merging

Resolve in exactly this order, and document it:

1. `base`
2. each variant's selected value, in the map's key order
3. matching compound variants, in declaration order
4. the caller's `className`

Then pass the result through a conflict-aware merge that removes earlier classes targeting
the same CSS property, so step 4 genuinely wins. Without that merge, step 4 is advisory.

Cascade layers are the more durable version of the same idea:
`@layer base, components, utilities;` gives a caller's utility a structural guarantee of
winning over the component's own rules regardless of specificity or source order. Where the
styling system supports layers, use them and treat the merge utility as belt-and-braces.

## Keeping variants honest

**Variants are semantic, not visual.** `tone="danger"` survives a rebrand;
`tone="red"` becomes a lie the first time destructive actions turn orange.

**Do not add a variant for a single call site.** One-offs belong in `className` at that
call site. A variant is a commitment to support the combination everywhere, forever, in
every theme.

**Cap the axes.** Three axes of three values is 27 combinations to reason about, and a
fourth axis makes it 81. Beyond three, ask whether one axis is really two components.

**Expose the resolver.** Export the function that turns variants into a class string so
consumers can style a native element or a third-party component consistently without
rendering yours. This is what stops a design system being routed around.

## Testing

Snapshot the resolved class string for every legal combination — the test is fast, it is
generated from the variant map itself, and it turns "we accidentally deleted the focus ring
from the subtle variant" into a diff instead of a bug report.
