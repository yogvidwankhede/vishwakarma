# Constructing a compound component

A compound component is a small family of components that share private state through
context. The parent is the state owner and renders no structure of its own beyond a
provider; the children read what they need and render themselves.

## The skeleton

```tsx
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
    throw new Error(`<${component}> must be rendered inside <Disclosure>.`)
  }
  return ctx
}
```

Two details in that hook matter more than they look. The default value is `null` rather
than a plausible-looking object, because a fabricated default turns "used outside its
parent" into a component that renders but never responds — the hardest class of bug to
locate. And the error names the offending component, so the message identifies the fix
without a stack trace.

## Ids and ARIA

The parent mints ids with `useId` and distributes them. This is the main reason the
context exists at all: `aria-controls` on the trigger and `id` on the panel must agree,
and only a common ancestor can guarantee that. Hand-authored ids collide the moment two
instances render on one page.

```tsx
export function Disclosure({ children, defaultOpen = false, open, onOpenChange }: Props) {
  const [isOpen, setOpen] = useControllableState({
    value: open, defaultValue: defaultOpen, onChange: onOpenChange,
  })
  const id = useId()
  const value = useMemo(
    () => ({ open: isOpen, setOpen, triggerId: `${id}-trigger`, panelId: `${id}-panel` }),
    [isOpen, setOpen, id],
  )
  return <DisclosureContext.Provider value={value}>{children}</DisclosureContext.Provider>
}
```

The `useMemo` is not an optimisation here, it is correctness-adjacent: without it every
consumer re-renders on every parent render, which is precisely the cost people blame
context for.

## Attaching the parts

```tsx
Disclosure.Trigger = DisclosureTrigger
Disclosure.Panel = DisclosurePanel
```

Dot notation reads well and documents the relationship at the call site. It has one real
cost: some bundlers cannot tree-shake unused properties off a namespace object, so a
consumer importing `Disclosure` may carry `Panel` even if they never render it. For a
library where every part is nearly always used together this is irrelevant. For a large
family with rarely-used parts, export the parts as named exports instead
(`DisclosureTrigger`) and let each be dropped independently.

Do not attempt to enforce structure by inspecting `children` with `Children.map` and
checking element types. It breaks the moment a consumer wraps a part in their own component,
maps over a list, or renders one conditionally — all legitimate — and it is the reason many
"strict" compound APIs are quietly unusable.

## Where compound is wrong

Compound components pay for their flexibility with an unenforced contract. Prefer a
different shape when:

**The consumer needs the state, not the structure.** A render prop or a hook returning
`{ isOpen, getTriggerProps, getPanelProps }` gives full control over markup. This is the
headless form, and it composes better than compound when the caller's markup is genuinely
unusual.

**There is exactly one sensible arrangement.** A `Checkbox` with a label has one layout.
Splitting it into `Checkbox.Box` and `Checkbox.Label` buys nothing and costs every
caller four lines.

**The parts are never used apart and the parent must measure them.** Tabs that need to
animate an indicator across triggers must know trigger positions; a registration effect in
each child works, but a data-driven API (`items={[…]}`) is simpler and should not be
dismissed for looking less elegant.

## Slot props as the middle ground

Where a compound part is nearly always the same, accept an optional element prop *and*
children: `<Field label="Email">` for the common case, `<Field><Field.Label>…` when the
label needs a tooltip. Both forms map to the same internal structure. The rule is that the
convenient form must be expressible in the general form, not a parallel implementation —
otherwise the two drift and the component has two behaviours.
