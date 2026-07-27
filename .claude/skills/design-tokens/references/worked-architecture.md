# A complete worked token architecture

This is a whole set for a typical product application: enough to build with, small enough to
hold in your head. Values are illustrative; the *structure* is the point.

## Tier 1 — primitives

Primitives are a raw material library. They carry no opinion about usage, so they are named
after what they are. They are the only tier where a value-derived name is correct.

    color.brand.50 … .950     eleven OKLCh steps, one hue family
    color.neutral.50 … .950   same ladder, chroma 0.005–0.02 at the brand hue
    color.red / .amber / .green / .blue   semantic hue families, same ladder

    space.0  0        space.4  16px      space.10  40px
    space.1  4px      space.5  20px      space.12  48px
    space.2  8px      space.6  24px      space.16  64px
    space.3  12px     space.8  32px      space.24  96px

    size.font.100  12px      size.font.500  20px
    size.font.200  14px      size.font.600  24px
    size.font.300  16px      size.font.700  30px
    size.font.400  18px      size.font.800  36px

    radius.0 0 / .1 2px / .2 4px / .3 6px / .4 8px / .5 12px / .6 16px / .full 9999px
    border.0 0 / .1 1px / .2 2px / .3 4px
    duration.0 0ms / .1 80ms / .2 120ms / .3 160ms / .4 200ms / .5 280ms / .6 400ms
    ease.standard cubic-bezier(0.2, 0, 0, 1)
    ease.decelerate cubic-bezier(0, 0, 0, 1)
    ease.accelerate cubic-bezier(0.3, 0, 1, 1)
    weight.400 / .500 / .600 / .700

The spacing ladder is base-4 and deliberately non-linear at the top: the gaps between 4 and
24 are 4px because small adjustments must be available, and the gaps above 32 grow because
nobody can perceive the difference between 64 and 68. A purely geometric ladder (4, 8, 16, 32,
64) is too coarse in the middle; a purely linear one produces forty values nobody uses.

## Tier 2 — semantic

This tier is the vocabulary. Everything a component touches lives here, and every entry is
named for what it is *for*.

    color.bg.canvas          neutral.50      page
    color.bg.surface         white           cards, panels
    color.bg.surface.raised  white + shadow  popovers
    color.bg.subtle          neutral.100     zebra rows, wells
    color.bg.hover           neutral.100
    color.bg.action          brand.600
    color.bg.action.hover    brand.700
    color.bg.danger          red.600

    color.fg.default         neutral.900
    color.fg.muted           neutral.600     4.5:1 against bg.canvas — checked
    color.fg.subtle          neutral.500     non-essential text only
    color.fg.on-action       white
    color.fg.link            brand.700

    color.border.default     neutral.200     decorative separators
    color.border.strong      neutral.300     input outlines — 3:1, checked
    color.border.focus       brand.600

    space.inset.sm/md/lg     space.2 / .4 / .6      padding inside containers
    space.stack.sm/md/lg     space.2 / .4 / .8      vertical gaps between siblings
    space.section            space.24               between top-level sections

    font.body.size / .height / .weight        size.font.300 / 1.55 / weight.400
    font.heading.size / .height / .tracking   size.font.700 / 1.1 / -0.02em
    font.caption.size / .height / .tracking   size.font.200 / 1.4 / 0.01em

    radius.control           radius.2        buttons, inputs
    radius.surface           radius.4        cards
    radius.overlay           radius.5        modals, sheets

    elevation.raised / .floating / .overlay
    duration.enter / .exit / .emphasis        duration.4 / .2 / .5
    z.base 0 / z.dropdown 100 / z.sticky 200 / z.overlay 300 / z.toast 400

Four things about this tier are worth stating explicitly.

**Spacing splits by axis of use, not by size alone.** `space.inset.md` and
`space.stack.md` may resolve to the same primitive today, but they are different decisions
and will diverge the first time a density mode arrives. Naming them apart now costs nothing.

**Radius scales with element size.** A shared `radius.md` applied to a 32px button and a
600px modal is the uniform-radius failure with a token name on it.

**Exit duration is shorter than enter duration** and that asymmetry is encoded in the tier,
not left to each component. The user has already decided when something exits; making them
watch the departure is making them wait.

**Every contrast contract is stated against a semantic pair.** "`color.fg.muted` clears
4.5:1 against `color.bg.canvas` and `color.bg.surface` in every theme" is auditable.
The equivalent claim about `neutral.600` is meaningless, because `neutral.600` has no
background.

## Tier 3 — component

Keep this tier close to empty. A component token is justified when a component needs a value
the semantic tier should not be forced to carry:

    button.height.sm/md/lg          32px / 40px / 48px
    input.height                    40px
    sidebar.width                   280px
    sidebar.width.collapsed         64px

These are legitimate: they are structural dimensions specific to one component that no other
component should inherit, and they are the ones a consumer genuinely might want to override.
`--card-header-padding-top` is not legitimate — it is `space.inset.md` with a longer name.

## Theme sets

Each theme replaces tier 2 and nothing else. The key list is identical; only the right-hand
side moves.

    light:  bg.canvas neutral.50   fg.default neutral.900  bg.action brand.600
    dark:   bg.canvas neutral.900  fg.default neutral.100  bg.action brand.500

Note that the dark theme points `bg.action` at a *lighter* primitive, and that its accent
primitive carries less chroma. Both are re-derivations, not inversions, and both are invisible
to every component.

## What a component may reference

Semantic tokens, and its own component tokens. Nothing else. If a component needs a value
that exists nowhere in tier 2, the correct move is to add a semantic token and justify it in
review — not to reach past the tier into `neutral.400`.
