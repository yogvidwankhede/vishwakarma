# Colour schemes

A scheme constrains how many hue families exist. That constraint is what makes a palette read
as a system rather than a collection, and the cost of each scheme is paid in a different
currency.

## Monochromatic: one hue, two axes

The classical description is pigment: a **tint** is the colour plus white, a **shade** is the
colour plus black, a **tone** is the colour plus grey. Those three are usually taught as
points on one scale, which is where monochrome systems go wrong, because in a perceptual space
they are movements along **two independent axes**.

| Pigment term | OKLCh movement | What it is for |
|---|---|---|
| **Tint** | L up, C down along the envelope | Surfaces, hovers, subtle borders |
| **Shade** | L down, C down along the envelope | Text, emphasis, depth |
| **Tone** | C down at roughly constant L | A sibling that must not compete |

Two consequences follow, and both are the difference between a considered monochrome and a
muddy one.

**A tint is not the same chroma at a higher lightness.** The gamut pinches to a point at white,
so the envelope in section 3 — 0.15x peak chroma at L 0.97 — is not a stylistic choice. Hold
chroma constant while raising L and the browser clips, which collapses adjacent steps into one
rendered colour and produces a ramp with fewer usable values than it appears to have.

**Tone is the axis nobody uses deliberately, and it is the one that buys restraint.** A tone is
a desaturated sibling at the *same* lightness: it can sit beside a saturated element of equal
weight without competing for rank, because it differs in purity rather than in prominence. That
is exactly what a large surface next to a small saturated control needs, and reaching for a
tint instead — which also changes L — moves the surface in the hierarchy, which was not the
intention.

The failure to name: treating "lighter, greyer, darker" as one slider couples L and C, so the
mid-range of the palette is simultaneously lighter *and* flatter. Nothing in it can be both
light and vivid, and the accent has nowhere to go.

### Building one

1. Pick the hue. Place the base colour on the L ladder from section 3.
2. Build the **tint and shade ramp** — the eleven steps, with the chroma envelope and the hue
   drift applied exactly as for any ramp. This is the spine.
3. Build a **tone track**: for each step that carries a surface, a sibling at the same L with
   chroma scaled to roughly 0.15 to 0.3 of the ramp value. In a monochrome system these replace
   the neutral family rather than sitting beside it — the same hue at low purity, which is why
   they never look accidental the way `oklch(L 0 0)` does. This deliberately sits above the
   0.005–0.02 ceiling the tinted-neutral rule sets: that ceiling keeps a neutral below
   nameability *next to other hues*, and a single-hue scheme has none to be confused with.
   Recognisably brand-hued surfaces are the licence monochrome buys, and the one thing a
   multi-hue system cannot borrow from it.
4. **Widen the semantic gaps.** With hue unavailable, two ranks separated only by L need at
   least 0.15 between them. That eliminates roughly half the eleven steps as rank carriers;
   they remain useful as surfaces and borders, not as levels.
5. Verify the contract. A monochrome palette fails contrast in a characteristic way: mid-ramp
   text on a mid-ramp surface, where both sides came from the same visually pleasing region.

### The semantic problem

A single-hue scheme has no red for error and no green for success. Three honest resolutions:

- **Declare a named exception.** The scheme is monochrome plus exactly one semantic family,
  written down as part of the system. This is what most real products do, and writing it down
  is what stops the exception multiplying.
- **Move state off colour entirely.** Icon, label, weight, border style. Section 6 requires a
  non-colour cue anyway, so monochrome only removes a crutch that should not have been
  load-bearing.
- **Use chroma as the state channel.** Error is the highest-chroma, lowest-L member. This works
  for two states and breaks at four, because chroma has less usable range than hue.

The dishonest resolution is introducing red and green anyway while still calling the scheme
monochromatic. The palette then has three hue families and no stated rule about them, which is
strictly worse than having chosen a three-hue scheme deliberately.

### What monochrome buys

Every pair in the palette is harmonious by construction, so the page cannot look like a
collection of unrelated decisions. And because there is no hue variety to hide behind, the one
deliberate departure — a single warm tone in an otherwise cool system — becomes unmissable.
That is the argument for the scheme: it makes emphasis cheap by making everything else quiet.

## Analogous: hues within 30 to 60 degrees

Harmonious for the same reason monochrome is, with slightly more variety. The trap is the
opposite of what people expect: adjacent hues at similar lightness are **harder** to tell apart
than distant ones, so an analogous scheme still needs L separation to carry rank. Choosing
analogous hues and then giving them equal lightness produces a palette that is pleasant and
completely flat.

## Complementary: roughly 180 degrees apart

Maximum hue contrast, and the one scheme with a failure mode caused by *area* rather than
value. Two opposed hues at equal area vibrate, because neither can win and the eye keeps
re-deciding. The fix is not adjusting the colours; it is a dominant-to-subordinate area ratio
of roughly 80:20, which turns the second hue into an accent — and an accent with one job is
what section 1 wanted anyway.

## Split-complementary

The complement replaced by its two neighbours, 150 and 210 degrees from the base. It keeps most
of the contrast and removes the vibration, because no two hues are exactly opposed. It is the
safer complementary, and it costs one more hue family against the limit of three.

## Triadic: three hues 120 degrees apart

Three equally strong families, which is exactly the budget — and it spends all of it on colour
before any semantic hue exists. A triadic palette that also needs success, warning and error is
already at six families. Reaching for triadic is usually a sign that colour is being asked to
carry hierarchy that space, size and weight should carry instead.
