# Constructing the dark half of a token set

A dark theme is a second mapping from semantic role to value. It shares primitives and
components with the light theme. **If adding dark mode requires editing a component, the
layering is wrong and that is the bug to fix first** — no amount of value tuning will
compensate.

## Surfaces: elevation runs the other way

In a light theme a raised surface is separated from its background by a shadow. On a dark
background there is almost no range left to darken into, so the shadow does nothing. Depth
has to be carried by lightness instead, and it points the other way: nearer means lighter.

    --surface           oklch(0.18 0.008 260)   page
    --surface-raised    oklch(0.21 0.010 260)   cards, panels
    --surface-floating  oklch(0.25 0.012 260)   menus, popovers
    --surface-overlay   oklch(0.29 0.014 260)   modals, sheets

Three properties of this scale matter. The steps are about **0.035 in L**, just above the
threshold at which a large flat area reads as a separate plane; smaller steps look like
banding artefacts, larger ones make a modal look like a different application. Chroma is
**non-zero and rises with lightness**, carrying 0.008-0.015 of the brand hue; a dark theme
built on chroma-zero greys looks like a terminal rather than like the light theme's sibling.
And the floor is **L 0.18, not 0** — OLED pixels have their longest transition time coming
out of full-off, which smears during scroll, and a 21:1 pair against white text causes
halation that readers with astigmatism perceive as blurred glyphs.

Shadows keep a smaller role: near-opaque black at low blur and near-zero spread, expressing
*contact* rather than height. Height is the surface value's job now.

## Foreground: contrast compresses at the dark end

    --fg          oklch(0.94 0.005 260)
    --fg-muted    oklch(0.72 0.010 260)
    --fg-subtle   oklch(0.58 0.012 260)

Note that `--fg-muted` sits proportionally *closer* to `--fg` than its light-theme
counterpart sits to the light `--fg`. Perceived contrast compresses toward the dark end, so
a muted foreground that is comfortable at the light theme's proportion reads as barely legible
when mirrored. Mirroring the numbers is the specific mistake.

## Accents: two channels move, in opposite directions

Raise L by 0.10-0.14, because the accent must now separate from a dark surface. Reduce C by
25-40%, because chromatic aberration in the eye spreads the edge of a saturated colour and a
pupil dilated in a dark room worsens the scatter, so an unmodified accent appears to glow.

    light:  --accent: oklch(0.58 0.16 255);  --on-accent: white;
    dark:   --accent: oklch(0.70 0.11 255);  --on-accent: oklch(0.20 0.02 255);

**Re-check `--on-accent` after the lightness change.** A lighter accent frequently needs
dark text on it. Keeping white produces the 2.1:1 primary button that ships more often than
any other dark-theme defect.

## Borders and separators

A border in a dark theme is lighter than its surface, and it needs a larger raw lightness
delta than the light theme's equivalent because of the same dark-end compression. A border at
L 0.30 against a surface at L 0.18 is roughly the perceptual equivalent of a light-theme
border at L 0.90 against white.

Where a border is the only thing defining an interactive control — text inputs, unchecked
checkboxes, switch tracks, segmented control dividers — it must clear 3:1 against the adjacent
surface (WCAG 2.2 SC 1.4.11). This is harder to hit in dark themes. Verify it explicitly;
never infer it from the light theme passing.

## State colours

Success, warning, error and info all need the same treatment as the accent: lighter, less
chromatic. Two extra constraints appear in dark themes. Tinted state *backgrounds* (the pale
red behind an error banner) cannot simply be darkened — a 10%-opacity red over a dark surface
is nearly invisible, so use an explicit dark token around L 0.26 at the state's hue rather
than an alpha overlay. And keep at least 0.15 of L separation between error and success so
they remain distinguishable under deuteranopia.

## Images, media and canvases

Photographs generally need nothing. Four things do.

**Logos and illustrations with baked-in light backgrounds** need a real dark variant, supplied
through `<picture>` with a `media="(prefers-color-scheme: dark)"` source — not a CSS
filter, which will also invert any photographic content and any brand colour inside the mark.
Note that this media query follows the *system*, so when the app allows an explicit override,
select the source from the app's own theme state instead.

**Screenshots** are the wrong theme in one mode by definition. Ship both, or frame them on a
neutral surface so the mismatch reads as intentional.

**Charts** need re-derived palettes. Categorical series tuned for a white background lose
separation on a dark one, worst in the yellow-to-green region where the light ramp end
approaches the background. Grid lines and axis labels usually need to move further from the
foreground colour than a direct token swap gives.

**Anything drawn to `<canvas>` or generated as inline SVG from JavaScript** reads token
values at draw time and must be redrawn on theme change, not merely restyled.

## What to re-audit

Assume nothing transfers. Re-run the full contrast audit against the dark values: body and
muted text on every surface, foreground on accent and on accent-hover, control borders at 3:1,
and the focus indicator at 3:1 against both the component and the surface behind it. Check
disabled states specifically — a disabled control derived by lowering opacity usually drops
below the 3:1 non-text floor against a dark surface and vanishes entirely, which is a
different and worse failure than looking dim.
