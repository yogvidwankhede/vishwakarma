import type { SkillManifest } from '../manifest.js'

/**
 * Component libraries fail as APIs long before they fail as pixels.
 *
 * The recurring shape is always the same: a component starts with three props, absorbs one
 * reasonable request at a time, and arrives eighteen months later with forty props, a
 * conditional tree nobody can read, and a next request that has no answer. Nothing went
 * wrong at any individual step — the ownership boundary was drawn in the wrong place at
 * step one, and every subsequent step was locally correct.
 *
 * This skill is about where those boundaries go: between configuration and composition,
 * between behaviour and appearance, between the component's state and the consumer's,
 * between the server and the client, and between one published version and the next.
 */
export const componentArchitecture: SkillManifest = {
  vsm: '1.0',
  id: 'component-architecture',
  name: 'Component Architecture',
  description:
    'Use when designing a component API, building a shared component library, or refactoring a component that has accumulated too many props.',
  version: '1.0.0',
  license: 'MIT',
  category: 'architecture',
  tags: ['components', 'api-design', 'composition', 'react', 'library', 'variants', 'rsc'],

  activation: {
    intents: [
      'designing the props or public API of a reusable component',
      'building or extending a shared component library or design system package',
      'a component has accumulated too many props and needs restructuring',
      'deciding between controlled and uncontrolled state for a component',
      'splitting behaviour from styling, or adopting a headless primitive',
      'deciding which components can be server components and where the client boundary goes',
      'the library bundle is larger than expected, or tree-shaking is not working',
    ],
    globs: [
      '**/components/**/*.{tsx,jsx,ts}',
      '**/ui/**/*.{tsx,jsx}',
      '**/packages/*/src/**/*.tsx',
      '**/*.stories.{tsx,ts}',
      '**/package.json',
    ],
    keywords: [
      'component api',
      'props',
      'compound component',
      'headless',
      'controlled',
      'variants',
      'asChild',
      'tree shaking',
      'design system',
    ],
  },

  content: {
    summary:
      'Design component APIs by ownership: composition where variation is open, configuration where it is closed, behaviour split from appearance, state colocated, and boundaries — client, context, and bundle — drawn deliberately.',

    body: `# Component Architecture

A component is an API with a rendering side effect. Almost every library failure is an API
failure: a prop that should have been a child, state that should have belonged to the
caller, a barrel file that pulled 400kB into a page using one button.

---

## 1. Prop explosion, and the composition that fixes it

A \`Card\` acquires \`title\`, then \`titleIcon\`, then \`titleIconPosition\`, then
\`headerAction\`, then \`hideHeaderBorder\`. Each addition is one line and locally reasonable. The count is not the problem — the *shape* is. Every slot
must be reachable through one flat namespace, so the surface grows with the product of the
variations rather than their sum, and the internal conditional tree with it. Then comes the
request with no answer: "the header needs two actions, and the second is a menu."

Compound components invert ownership. The parent owns state and behaviour; the caller owns
structure.

\`\`\`tsx
<Card>
  <Card.Header>
    <Card.Title>Billing</Card.Title>
    <Menu>…</Menu>
  </Card.Header>
  <Card.Body>…</Card.Body>
</Card>
\`\`\`

The header accepts anything now, because it accepts children: prop count stops tracking
layout and starts tracking behaviour. The cost is real — structure is no longer type-enforced
and a caller can nest wrongly — and it is the right trade, since enforcing structure through
props is what produced the explosion.

The discriminator: **configure closed variation, compose open variation.** \`size\` has
three values and always will — a prop. What goes in a header is unbounded — a slot.

---

## 2. Behaviour and appearance have different lifecycles

Focus management, roving tabindex, typeahead, collision-aware positioning and ARIA wiring
change when specs and browsers do — every few years. Appearance changes with the brand, and
separately per consumer. Fused, every restyle risks regressing keyboard behaviour and every
consumer wanting a different look reimplements the accessibility work, badly.

Split them. A headless layer exports state and prop getters and renders nothing opinionated;
a styled layer consumes it and owns only classes and markup. A rebrand replaces the thin
half.

---

## 3. Ship controlled *and* uncontrolled

Uncontrolled is what most callers want (\`defaultValue\`, no wiring); controlled is what hard
cases require — validation, cross-field dependency, undo. Shipping one guarantees a fork. One
hook does both:

\`\`\`ts
function useControllableState<T>(p: {
  value?: T; defaultValue: T; onChange?: (next: T) => void
}) {
  const [internal, setInternal] = useState(p.defaultValue)
  const isControlled = p.value !== undefined
  const value = isControlled ? (p.value as T) : internal
  const setValue = useCallback((next: T) => {
    if (!isControlled) setInternal(next)
    p.onChange?.(next)
  }, [isControlled, p.onChange])
  return [value, setValue] as const
}
\`\`\`

Two traps. \`onChange\` must fire in **both** modes, or analytics and persistence silently
stop working for uncontrolled callers. And since mode is recomputed from
\`value !== undefined\` every render, a \`value\` that becomes \`undefined\` — an optional prop
dropped, state initialised before data arrives — flips the component to uncontrolled mid-life
and it snaps back to stale internal state. Use \`null\` for "no selection", reserve
\`undefined\` for "not controlled", and warn when the mode changes.

---

## 4. Polymorphism: prefer \`asChild\` to \`as\`

An \`as\` prop needs a generic component whose props union is discriminated by the element
type. It typechecks in isolation, loses inference as soon as it is wrapped or memoised, emits
unreadable errors, and cannot merge — the caller cannot also attach their own \`onClick\`.

\`asChild\` renders no element of its own: it merges its props, handlers and ref into its
single child element. The whole type is \`asChild?: boolean\` plus
\`children: React.ReactElement\`. No generics, no inference cliff, and behaviours compose
(\`<Tooltip asChild><Link/></Tooltip>\`). Merge in a defined order: caller handlers run first
and may \`preventDefault\`, \`className\` concatenates, and refs compose rather than replace.

---

## 5. Refs are ordinary props now

From React 19, function components receive \`ref\` as a normal prop; \`forwardRef\` is
deprecated and a codemod removes it. Declare \`ref?: React.Ref<HTMLButtonElement>\` in the
props interface and stop wrapping. Every component rendering a DOM element must forward a ref
to it — without one nobody can anchor a popover, restore focus after a validation error, or
measure it.

---

## 6. Names are API

Pick one verb per concept and never vary it: \`onChange\` (not \`onValueChanged\` here and
\`onUpdate\` there), \`open\`/\`defaultOpen\`/\`onOpenChange\`, \`disabled\` not
\`isDisabled\`, and booleans phrased positively — \`disableFoo\` forces double negatives at
every call site. Consistency is what lets a user guess the next component's API, which is the
only scaling property an API has.

---

## 7. Variants beat conditional class strings

\`className={\\\`btn \${big ? 'p-4' : ''} \${danger ? 'bg-red-500' : ''}\\\`}\` is unreadable
and unsound: two utilities setting the same property resolve by **stylesheet order**, not
string order, so a caller passing \`p-2\` cannot reliably override a built-in \`p-4\`. Merge
with a conflict-aware utility that drops losing classes, and express variation as a typed
variant map so the compiler enumerates the legal combinations and class strings live in one
place.

---

## 8. Colocate state; keep contexts small

State lives in the lowest component that needs it and moves up only when a second consumer
appears; lifting early re-renders parents for changes they never read.

Context is not free: every consumer re-renders when the provider value's identity changes,
whichever field it reads. One \`AppContext\` holding user, theme and a search query re-renders
every consumer on every keystroke. Split by change frequency — rarely-changing config,
frequently-changing state — and memoise each value.

---

## 9. The client boundary

Primitives with no state and no handlers can be server components: layout, typography,
badges, cards. State, effects, refs, browser APIs or event handlers force a client component.

The expensive mistake is placing \`'use client'\` too high. The directive marks a boundary and
everything *imported* below it joins the client bundle. Pass server-rendered content *through*
a client wrapper as \`children\` instead: the client component controls when the subtree
renders without importing it, so the subtree stays on the server.

\`\`\`tsx
<ClientAccordion>       {/* client: state, animation */}
  <ServerReport />      {/* stays server-rendered */}
</ClientAccordion>
\`\`\`

---

## 10. Tree-shaking is a build contract

Set \`"sideEffects": false\` in \`package.json\` (or list the CSS files that genuinely have
them). Without it a bundler must assume importing any module matters, and keeps everything.
Ship ESM with per-component entry points via the \`exports\` map.

A root barrel re-exporting everything defeats this whenever *anything* in the graph is
side-effectful, and always costs compile and cold-start time. Keep it for ergonomics; make
deep imports possible and use them internally.

---

## 11. Testing follows the layers

Test the headless hook's state machine directly. Test styled components on rendered semantics
— roles, names, keyboard operation — never on class names, which are implementation; visual
regression covers appearance. Add one test per component asserting the ref reaches a DOM node
and unknown props pass through, since both break silently.

---

## 12. Changing a public API

Removing or renaming a prop is a major version. Until then accept the old prop, warn once in
development naming the replacement, and map it internally. Ship a codemod for anything
mechanical. A deprecation naming no replacement and no removal version is not a deprecation;
it is a complaint.`,

    references: [
      {
        id: 'compound-components',
        title: 'Constructing a compound component',
        answers:
          'How do I actually build a compound component — context, sub-component attachment, ids and ARIA wiring, error handling for misuse, and the trade-offs against a render-prop or slot-props API?',
        content: `# Constructing a compound component

A compound component is a small family of components that share private state through
context. The parent is the state owner and renders no structure of its own beyond a
provider; the children read what they need and render themselves.

## The skeleton

\`\`\`tsx
interface DisclosureContextValue {
  open: boolean
  setOpen: (next: boolean) => void
  triggerId: string
  panelId: string
}

const DisclosureContext = createContext<DisclosureContextValue | null>(null)

function useDisclosureContext(component: string) {
  const ctx = useContext(DisclosureContext)
  if (ctx === null) {
    throw new Error(\`<\${component}> must be rendered inside <Disclosure>.\`)
  }
  return ctx
}
\`\`\`

Two details in that hook matter more than they look. The default value is \`null\` rather
than a plausible-looking object, because a fabricated default turns "used outside its
parent" into a component that renders but never responds — the hardest class of bug to
locate. And the error names the offending component, so the message identifies the fix
without a stack trace.

## Ids and ARIA

The parent mints ids with \`useId\` and distributes them. This is the main reason the
context exists at all: \`aria-controls\` on the trigger and \`id\` on the panel must agree,
and only a common ancestor can guarantee that. Hand-authored ids collide the moment two
instances render on one page.

\`\`\`tsx
export function Disclosure({ children, defaultOpen = false, open, onOpenChange }: Props) {
  const [isOpen, setOpen] = useControllableState({
    value: open, defaultValue: defaultOpen, onChange: onOpenChange,
  })
  const id = useId()
  const value = useMemo(
    () => ({ open: isOpen, setOpen, triggerId: \`\${id}-trigger\`, panelId: \`\${id}-panel\` }),
    [isOpen, setOpen, id],
  )
  return <DisclosureContext.Provider value={value}>{children}</DisclosureContext.Provider>
}
\`\`\`

The \`useMemo\` is not an optimisation here, it is correctness-adjacent: without it every
consumer re-renders on every parent render, which is precisely the cost people blame
context for.

## Attaching the parts

\`\`\`tsx
Disclosure.Trigger = DisclosureTrigger
Disclosure.Panel = DisclosurePanel
\`\`\`

Dot notation reads well and documents the relationship at the call site. It has one real
cost: some bundlers cannot tree-shake unused properties off a namespace object, so a
consumer importing \`Disclosure\` may carry \`Panel\` even if they never render it. For a
library where every part is nearly always used together this is irrelevant. For a large
family with rarely-used parts, export the parts as named exports instead
(\`DisclosureTrigger\`) and let each be dropped independently.

Do not attempt to enforce structure by inspecting \`children\` with \`Children.map\` and
checking element types. It breaks the moment a consumer wraps a part in their own component,
maps over a list, or renders one conditionally — all legitimate — and it is the reason many
"strict" compound APIs are quietly unusable.

## Where compound is wrong

Compound components pay for their flexibility with an unenforced contract. Prefer a
different shape when:

**The consumer needs the state, not the structure.** A render prop or a hook returning
\`{ isOpen, getTriggerProps, getPanelProps }\` gives full control over markup. This is the
headless form, and it composes better than compound when the caller's markup is genuinely
unusual.

**There is exactly one sensible arrangement.** A \`Checkbox\` with a label has one layout.
Splitting it into \`Checkbox.Box\` and \`Checkbox.Label\` buys nothing and costs every
caller four lines.

**The parts are never used apart and the parent must measure them.** Tabs that need to
animate an indicator across triggers must know trigger positions; a registration effect in
each child works, but a data-driven API (\`items={[…]}\`) is simpler and should not be
dismissed for looking less elegant.

## Slot props as the middle ground

Where a compound part is nearly always the same, accept an optional element prop *and*
children: \`<Field label="Email">\` for the common case, \`<Field><Field.Label>…\` when the
label needs a tooltip. Both forms map to the same internal structure. The rule is that the
convenient form must be expressible in the general form, not a parallel implementation —
otherwise the two drift and the component has two behaviours.`,
      },
      {
        id: 'typed-variants',
        title: 'Building a typed variant system',
        answers:
          'How do I define component variants so that TypeScript enumerates the legal combinations, class conflicts resolve predictably, and consumers can still override styles?',
        content: `# Building a typed variant system

The goal is that \`<Button variant="danger" size="lg" />\` is checked by the compiler,
resolves to a deterministic class string, and can still be overridden by a caller's
\`className\` without a specificity fight.

## Why conditional strings fail

\`\`\`tsx
className={\\\`btn \${size === 'lg' ? 'px-6 py-3' : 'px-3 py-1.5'} \${className}\\\`}
\`\`\`

Three failures. The legal combinations are invisible to the compiler, so \`size="large"\`
typechecks if \`size\` is \`string\`. Adding a third axis multiplies the ternaries rather
than adding to them. And the trailing \`className\` does not reliably win: when two utility
classes set the same property, the winner is decided by their order in the generated
stylesheet, not by their order in the attribute. A caller passing \`px-2\` against a built-in
\`px-6\` gets whichever the framework emitted last, which is stable in a way that looks like
a rule and is not.

## The shape

Define the variant map as data, derive the prop type from it:

\`\`\`ts
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
\`\`\`

\`as const\` is what makes this work: without it the object's values widen to \`string\` and
the derived type becomes useless. \`Variants\` is now
\`{ tone?: 'primary' | 'subtle' | 'danger'; size?: 'sm' | 'md' | 'lg' }\`, and it updates
automatically when a variant is added. Nobody maintains a parallel union by hand.

## Compound variants

Some combinations need a class that neither axis owns alone — a danger button at small size
may need a heavier border to stay legible. Model these as an explicit list of predicates
rather than by injecting conditionals into the map:

\`\`\`ts
const compound = [
  { when: { tone: 'danger', size: 'sm' }, class: 'border border-danger-strong' },
] as const
\`\`\`

Applied after the base variants, in declaration order. Keeping them in a separate list means
the primary map stays readable and the exceptions stay countable — if that list grows past
about five entries, the axes are wrong and should be refactored, usually because two
supposedly independent axes are actually one.

## Resolution order and merging

Resolve in exactly this order, and document it:

1. \`base\`
2. each variant's selected value, in the map's key order
3. matching compound variants, in declaration order
4. the caller's \`className\`

Then pass the result through a conflict-aware merge that removes earlier classes targeting
the same CSS property, so step 4 genuinely wins. Without that merge, step 4 is advisory.

Cascade layers are the more durable version of the same idea:
\`@layer base, components, utilities;\` gives a caller's utility a structural guarantee of
winning over the component's own rules regardless of specificity or source order. Where the
styling system supports layers, use them and treat the merge utility as belt-and-braces.

## Keeping variants honest

**Variants are semantic, not visual.** \`tone="danger"\` survives a rebrand;
\`tone="red"\` becomes a lie the first time destructive actions turn orange.

**Do not add a variant for a single call site.** One-offs belong in \`className\` at that
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
from the subtle variant" into a diff instead of a bug report.`,
      },
    ],
  },

  rules: [
    {
      id: 'component-architecture/compose-open-variation',
      strength: 'should',
      statement:
        'Expose open-ended variation as children or slots and reserve props for variation whose set of values is closed and enumerable.',
      evidence: {
        rationale:
          'A flat prop namespace must name every reachable position, so the surface grows with the product of the variations rather than their sum, and the internal conditional tree grows with it. Children accept an unbounded set of structures without adding any API surface at all.',
        confidence: 'strong',
      },
      examples: {
        language: 'tsx',
        bad: '<Card title="Billing" titleIcon={<Lock/>} headerAction={<Menu/>} headerActionVariant="ghost" />',
        good: '<Card>\n  <Card.Header>\n    <Card.Title><Lock/> Billing</Card.Title>\n    <Menu variant="ghost" />\n  </Card.Header>\n</Card>',
      },
      verifiedBy: 'api-surface-review',
    },
    {
      id: 'component-architecture/separate-behaviour-from-appearance',
      strength: 'should',
      statement:
        'Keep interaction behaviour and ARIA wiring in a headless layer that renders no styling decisions, and consume it from a separate styled layer.',
      evidence: {
        rationale:
          'Behaviour changes on the timescale of specification and browser changes; appearance changes on the timescale of brands and per-consumer. Fusing two things with different change rates means every change to the fast one risks regressing the slow one, and every consumer who needs different styling reimplements the accessibility work.',
        confidence: 'strong',
      },
    },
    {
      id: 'component-architecture/support-both-state-modes',
      strength: 'should',
      statement:
        'Support both controlled and uncontrolled use for any stateful component, via a single hook that selects mode from whether the value prop is defined.',
      evidence: {
        rationale:
          'Uncontrolled covers the majority of call sites with no wiring, while validation, cross-field dependency and undo are only expressible when the consumer owns the state. Shipping one mode forces the other set of consumers to fork the component.',
        confidence: 'strong',
      },
    },
    {
      id: 'component-architecture/onchange-fires-in-both-modes',
      strength: 'must',
      statement:
        'Fire the change callback in uncontrolled mode as well as controlled mode, and never gate it behind the controlled branch.',
      evidence: {
        rationale:
          'Consumers attach analytics, validation and persistence to the callback without taking ownership of the value. If the callback only fires when a value prop is present, those side effects disappear silently for every uncontrolled caller, with no error and no visible symptom in the component itself.',
        confidence: 'established',
      },
      examples: {
        language: 'ts',
        bad: 'if (isControlled) { onChange?.(next) } else { setInternal(next) }',
        good: 'if (!isControlled) setInternal(next)\nonChange?.(next)',
      },
    },
    {
      id: 'component-architecture/no-mode-switching',
      strength: 'must-not',
      statement:
        'Do not let a component switch between controlled and uncontrolled during its lifetime; use null for "no value" and reserve undefined for "not controlled".',
      evidence: {
        rationale:
          'Mode is recomputed from `value !== undefined` on every render, so a value that becomes undefined — an optional prop dropped, or state initialised before data arrives — flips the component to uncontrolled and it reverts to whatever stale value its internal state still holds. The user sees an unexplained reset and nothing throws.',
        confidence: 'established',
      },
      verifiedBy: 'state-mode-review',
    },
    {
      id: 'component-architecture/prefer-aschild',
      strength: 'should',
      statement:
        'Implement polymorphism with an asChild boolean that merges props into a single child element, rather than with a generic `as` prop.',
      evidence: {
        rationale:
          'A correctly typed `as` prop requires a generic component whose props union is discriminated by the element type; inference collapses as soon as it is wrapped or memoised, and it cannot merge caller handlers with the component’s own. asChild types as a boolean plus a ReactElement child, so there is no generic to lose and behaviours nest.',
        confidence: 'strong',
      },
      exceptions: [
        'A purely presentational element wrapper with no handlers or refs of its own, where `as` costs nothing.',
      ],
    },
    {
      id: 'component-architecture/merge-not-overwrite',
      strength: 'must',
      statement:
        'When merging props into a slotted child, call the caller’s handler before your own, concatenate className, and compose refs rather than replacing them.',
      evidence: {
        rationale:
          'Spreading props onto a child overwrites same-named keys, so the last writer silently deletes the other’s behaviour: the child loses its own click handler, its own classes, or the ref its parent uses to measure it. Ordering caller handlers first also lets them cancel with preventDefault, which is the only way a consumer can veto built-in behaviour.',
        confidence: 'established',
      },
    },
    {
      id: 'component-architecture/ref-as-prop',
      strength: 'should',
      statement:
        'On React 19 and later, declare ref as an ordinary prop on function components instead of wrapping them in forwardRef.',
      evidence: {
        rationale:
          'React 19 passes ref through as a normal prop for function components and deprecates forwardRef, with a codemod for the migration. The wrapper adds an extra component layer, obscures the displayed component name in devtools, and complicates generic component types for no remaining benefit.',
        source: 'React documentation, forwardRef deprecation note',
        url: 'https://react.dev/reference/react/forwardRef',
        confidence: 'established',
      },
    },
    {
      id: 'component-architecture/forward-ref-to-dom',
      strength: 'must',
      statement:
        'Every component that renders a DOM element must forward a ref to that element and spread unrecognised props onto it.',
      evidence: {
        rationale:
          'Positioning a popover, focusing a field after a validation error, measuring for animation, and attaching third-party behaviour all require a DOM handle and arbitrary attributes. A component that swallows both cannot be integrated at all, and the consumer’s only remedy is to wrap it in a div, which breaks layout.',
        confidence: 'established',
      },
      verifiedBy: 'integration-contract',
    },
    {
      id: 'component-architecture/consistent-prop-names',
      strength: 'should',
      statement:
        'Use one vocabulary for the same concept across the whole library — open/defaultOpen/onOpenChange, disabled, onChange — and phrase boolean props positively.',
      evidence: {
        rationale:
          'The only property that lets an API scale is guessability: a consumer who has learned one component should predict the next. Synonyms defeat that, and negated booleans force double negatives such as disableAutoFocus={false} at every call site, which readers misparse.',
        confidence: 'strong',
      },
    },
    {
      id: 'component-architecture/typed-variants',
      strength: 'should',
      statement:
        'Express visual variation as a typed variant map with derived prop types, not as conditional class-string concatenation.',
      evidence: {
        rationale:
          'A ternary chain hides the legal combinations from the compiler, multiplies rather than adds when a third axis appears, and scatters class strings through JSX. A map declared `as const` yields the union of legal values automatically, so adding a variant cannot desynchronise the type from the implementation.',
        confidence: 'strong',
      },
    },
    {
      id: 'component-architecture/conflict-aware-merge',
      strength: 'must',
      statement:
        'Merge a caller-supplied className with a conflict-aware utility or cascade layers, never by string concatenation alone.',
      evidence: {
        rationale:
          'Two utility classes setting the same property are resolved by their order in the generated stylesheet, not by their order in the class attribute, so an appended override wins or loses arbitrarily depending on emission order. A conflict-aware merge removes the losing class, and cascade layers give the same guarantee structurally.',
        confidence: 'established',
      },
    },
    {
      id: 'component-architecture/colocate-state',
      strength: 'should',
      statement:
        'Keep state in the lowest component that uses it and lift it only when a second component genuinely needs to read or write it.',
      evidence: {
        rationale:
          'State held above its consumers re-renders every intervening subtree on each update, including siblings that never read the value. Lifting pre-emptively also converts a private implementation detail into a prop, which makes it part of the contract and hard to remove later.',
        confidence: 'strong',
      },
    },
    {
      id: 'component-architecture/split-contexts',
      strength: 'should',
      statement:
        'Split context by change frequency rather than by domain, and memoise each provider value.',
      evidence: {
        rationale:
          'Every consumer of a context re-renders when the provider value’s identity changes, regardless of which field it reads. A single context holding both rarely-changing configuration and frequently-changing interaction state therefore re-renders the entire consumer set on every keystroke, and an unmemoised object literal changes identity on every parent render.',
        confidence: 'established',
      },
      examples: {
        language: 'tsx',
        bad: '<AppContext.Provider value={{ user, theme, query, setQuery }}>',
        good: '<ConfigContext.Provider value={config}>\n  <SearchContext.Provider value={search}>',
      },
    },
    {
      id: 'component-architecture/pass-server-children-through',
      strength: 'should',
      statement:
        'Pass server-rendered content through a client component as children rather than importing it below the client boundary.',
      evidence: {
        rationale:
          'The client directive marks a boundary and everything imported beneath it is compiled into the client bundle. Content received as children is rendered by the server and passed in as an already-evaluated element, so the client component can control when it appears without the subtree or its dependencies ever being sent to the browser.',
        confidence: 'established',
      },
      verifiedBy: 'boundary-review',
    },
    {
      id: 'component-architecture/side-effects-false',
      strength: 'must',
      statement:
        'Declare "sideEffects": false in a component package’s package.json, or list exactly the files that do have side effects.',
      evidence: {
        rationale:
          'Without the flag a bundler must assume that evaluating any module in the package could have observable effects, so it cannot drop unused modules even when nothing imports their bindings. The result is that a consumer importing one button ships the entire library.',
        source: 'webpack tree shaking guide',
        url: 'https://webpack.js.org/guides/tree-shaking/',
        confidence: 'established',
      },
      exceptions: [
        'Packages whose CSS or polyfill imports genuinely must run on evaluation, which should be enumerated in the array form.',
      ],
      verifiedBy: 'bundle-review',
    },
    {
      id: 'component-architecture/per-component-entry-points',
      strength: 'should',
      statement:
        'Publish per-component entry points through the exports map and do not rely on a single root barrel as the only import path.',
      evidence: {
        rationale:
          'A root barrel makes the whole library one module graph, so any side-effectful module anywhere in it defeats elimination for everything. Deep entry points also cut cold-start and type-check time, because the toolchain resolves one component instead of the entire catalogue.',
        confidence: 'strong',
      },
    },
    {
      id: 'component-architecture/test-semantics-not-classes',
      strength: 'should-not',
      statement:
        'Do not assert on class names or DOM structure in component tests; assert on accessible roles, names, states, and keyboard behaviour.',
      evidence: {
        rationale:
          'Class names and element nesting are implementation, so tests bound to them fail on every refactor while passing through real regressions such as a lost focus ring or a broken arrow-key sequence. Role and name assertions fail exactly when the user-visible contract breaks.',
        confidence: 'strong',
      },
    },
    {
      id: 'component-architecture/deprecate-before-removing',
      strength: 'must',
      statement:
        'Remove or rename a public prop only in a major version, after at least one release that accepts the old name, warns once in development, and names the replacement.',
      evidence: {
        rationale:
          'Consumers upgrade on their own schedule and cannot act on a break they discover at runtime in production. A release that accepts both names lets the upgrade and the migration happen separately, and naming the replacement in the warning is what makes the migration mechanical rather than investigative.',
        confidence: 'strong',
      },
      examples: {
        language: 'ts',
        bad: '// v2.1: `variant` renamed to `tone`; old prop removed',
        good: 'if (variant !== undefined && process.env.NODE_ENV !== "production") {\n  warnOnce("Button: `variant` is deprecated, use `tone`. It is removed in v3.")\n}\nconst resolvedTone = tone ?? variant',
      },
    },
  ],

  verification: [
    {
      id: 'api-surface-review',
      kind: 'self-review',
      description: 'Confirm the prop surface reflects behaviour rather than layout.',
      blocking: true,
      questions: [
        'How many props does the component accept, and how many of them exist only to place or style something the caller could have supplied as children?',
        'Is there any prop whose value set is open-ended, such as content, an element, or a label for an arbitrary slot?',
        'Do any two props only make sense together, or does any prop only apply when another has a particular value? If so, those are one composed part, not two props.',
        'What is the next reasonable request from a consumer, and does the current API have an answer that is not another prop?',
      ],
    },
    {
      id: 'state-mode-review',
      kind: 'self-review',
      description: 'Confirm controlled and uncontrolled behaviour are both correct.',
      blocking: true,
      questions: [
        'Does the change callback fire when the component is used without a value prop?',
        'Can the value prop ever become undefined after being defined — from an optional prop, a conditional, or state that starts empty?',
        'Is null used for "no selection" so that undefined means only "not controlled"?',
        'In controlled mode, does the component render the prop value even when the consumer ignores the callback, rather than optimistically updating?',
      ],
    },
    {
      id: 'integration-contract',
      kind: 'self-review',
      description: 'Confirm the component can be integrated by an unanticipated consumer.',
      questions: [
        'Does a ref passed by the consumer reach a real DOM node?',
        'Are unrecognised props, including data-* and aria-* attributes, spread onto that node?',
        'Can a consumer override any built-in class through className, and does the override actually win?',
        'If the component wraps a child via a slot, do the child’s own handlers still run, and do they run first?',
      ],
    },
    {
      id: 'boundary-review',
      kind: 'self-review',
      description: 'Confirm the client boundary is drawn as low as possible.',
      questions: [
        'Which component in this tree is the highest one carrying the client directive, and what specifically forces it — state, an effect, a ref, or an event handler?',
        'Does anything below that boundary get imported rather than passed as children, and could it be passed as children instead?',
        'Does any client component import a heavy data or formatting dependency that could stay on the server?',
      ],
    },
    {
      id: 'bundle-review',
      kind: 'self-review',
      description: 'Confirm the package can actually be tree-shaken.',
      questions: [
        'Does package.json declare sideEffects, and is the declaration accurate for CSS and polyfill imports?',
        'Does the exports map offer a path to each component individually, and does the build emit ESM?',
        'If a consumer imports one component from the root barrel, what else ends up in their bundle?',
        'Are sub-components attached as properties of a namespace object, and if so are all of them normally used together?',
      ],
    },
    {
      id: 'api-change-review',
      kind: 'self-review',
      description: 'Confirm a public API change is safe to release.',
      questions: [
        'Does this change remove, rename, or narrow the type of any exported prop, export, or CSS custom property?',
        'If so, is the release a major version, and does the previous minor accept the old form with a development warning naming the replacement?',
        'Does the warning state the version in which the old form is removed?',
        'Is the change mechanical enough to ship a codemod for, and has one been written?',
      ],
    },
  ],

  relatedSkills: [
    'design-judgment',
    'accessible-components',
    'colour-systems',
    'interaction-design',
    'responsive-architecture',
  ],
}
