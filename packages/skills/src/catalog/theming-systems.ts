import type { SkillManifest } from '../manifest.js'

/**
 * Theming is where a design system stops being a picture and becomes a program.
 *
 * Most theming failures are not aesthetic. They are mechanical: a derived token resolved
 * one level too high in the tree so it cannot be overridden; a preference read after
 * hydration so every dark-mode user sees a white flash; a boolean "isDark" that has thrown
 * away the difference between "the user chose light" and "the user has not chosen"; a
 * carefully tuned palette that evaporates entirely the moment Windows high contrast turns
 * on, because everything it expressed was expressed in background colour.
 *
 * So this skill is mostly about mechanism — how custom properties actually resolve, what
 * `color-scheme` actually controls, what forced-colors mode actually does to your CSS —
 * because every one of those failures is the consequence of a mechanism the author did not
 * know about, not of a preference the author got wrong.
 */
export const themingSystems: SkillManifest = {
  vsm: '1.0',
  id: 'theming-systems',
  name: 'Theming Systems',
  description:
    'Use when building design tokens, adding dark mode or multi-brand theming, wiring a theme switcher, or supporting forced-colors, density, or RTL.',
  version: '1.0.0',
  license: 'MIT',
  category: 'foundation',
  tags: [
    'theming',
    'design-tokens',
    'dark-mode',
    'custom-properties',
    'forced-colors',
    'multi-brand',
    'rtl',
  ],

  activation: {
    intents: [
      'setting up or restructuring design tokens for an application',
      'adding dark mode, a theme switcher, or a light/dark/system preference control',
      'supporting more than one brand or tenant from one codebase',
      'the user reports a flash of the wrong theme on page load',
      'supporting Windows high contrast, forced colours, or increased contrast preferences',
      'adding a compact or comfortable density mode, or right-to-left support',
      'auditing whether components can actually be re-themed without editing them',
    ],
    globs: [
      '**/tokens/**',
      '**/theme/**',
      '**/themes/**',
      '**/*.css',
      '**/*.scss',
      '**/tailwind.config.*',
      '**/*theme*.{ts,tsx,js,jsx,json}',
      '**/layout.{tsx,jsx}',
      '**/_document.{tsx,jsx}',
      '**/index.html',
    ],
    keywords: [
      'theme',
      'theming',
      'dark mode',
      'design tokens',
      'css variables',
      'custom properties',
      'color-scheme',
      'forced-colors',
      'high contrast',
      'multi-brand',
      'white label',
      'rtl',
      'density',
    ],
  },

  content: {
    summary:
      'Build themes as layered tokens resolved through CSS custom properties, switch them before first paint, and treat dark, forced-colors, density and RTL as separate design problems rather than as inversions of the default.',

    body: `# Theming Systems

A theme is not a palette. It is a **mapping from role to value**, plus the machinery that
swaps one mapping for another without the user seeing the seam. Get the mapping wrong and
adding a theme means editing components. Get the machinery wrong and every cold load shows
the wrong theme for 200ms.

## 1. Three layers

\`\`\`css
--grey-50: oklch(0.97 0.004 260);   /* primitive: what it is. Theme-invariant. */
--brand-600: oklch(0.58 0.16 255);
--surface: var(--grey-50);          /* semantic:  what it means. One set per theme. */
--accent: var(--brand-600);
--btn-primary-bg: var(--accent);    /* component: where it is used. The override seam. */
\`\`\`

Primitives are a vocabulary and never appear in a component. The semantic layer *is* the
theme — the only layer a theme file rewrites, and the only level at which a contract like
"\`--fg\` clears 4.5:1 on \`--surface\` in every theme" is statable.

The component layer earns its keep for one reason: **it is the only place a one-off can live
without a hardcoded value or a polluted global vocabulary.** When the pricing page's primary
button must use the success hue, without it you either hardcode \`#1f8a4c\` or add
\`--accent-alt\` globally — a global name for a local problem.
Create component tokens when a second consumer or an override appears, not before, and alias
semantic tokens from them, never primitives. A flat set of renamed hex values is the
primitive layer with the other two missing, and will not survive dark mode.

## 2. How custom properties resolve, and the trap

Custom properties are inherited and substituted at computed-value time, so a \`var()\` resolves
against the element that *declares* it, not the one that *uses* it:

\`\`\`css
:root { --accent: var(--brand-600); --btn-bg: var(--accent); }
[data-brand="acme"] { --accent: var(--acme-600); }   /* button does not change */
\`\`\`

\`--btn-bg\` computed on \`:root\`, where \`--accent\` was still the default, and the subtree
inherits that already-substituted value. **A token that must vary per subtree has to be
referenced below the override point, not resolved above it** — declare component tokens on
the component's own selector, \`.btn { background: var(--btn-bg, var(--accent)) }\`, or
redeclare every derived token in the block that overrides its input.

Two further mechanics. A \`var()\` with no value invalidates the *whole declaration* at
computed-value time, so the property resolves to \`unset\` — for \`color\`, inherited rather than
ignored, which can hand an element a foreground identical to its background. And an
\`@property\` registration with \`inherits: false\` can never be a theme token.

## 3. Switching without a flash

Resolution order is fixed: **explicit stored choice, then system preference, then product
default.** Anything else means a user who chose light gets dark at sunset.

It must run in a **parser-blocking inline \`<script>\` in \`<head>\`, above the stylesheets.**
Not \`defer\`, not \`type="module"\`, not external, not a framework effect — those all execute
after first paint, so the correction is a repaint of a page the user has already seen. Inline
specifically, because an external synchronous script blocks the parser for a network round
trip, trading the flash for a blank screen. Under a strict CSP give it a nonce or hash rather
than moving it. Exact script in the flash-free reference.

## 4. \`color-scheme\` is not optional

\`\`\`css
:root { color-scheme: light dark; }
[data-theme="dark"] { color-scheme: dark; }
\`\`\`

It controls what CSS cannot reach: the canvas background before your stylesheet arrives,
scrollbars, the default rendering of \`<select>\`, date and colour pickers, checkboxes,
spellcheck underlines, and the used values of the system colour keywords. Without it a dark
page gets light scrollbars and a blinding native date picker, and \`light-dark()\` does not
resolve. Update it when the user overrides the system, and add
\`<meta name="color-scheme" content="light dark">\` so the canvas is right before CSS arrives.

## 5. Three states, never a boolean

A boolean \`isDark\` collapses "the user chose light" and "the user has not chosen" into one
bit, so the first touch of a toggle opts that user out of their system preference
permanently. Store \`'light' | 'dark' | null\`, null meaning follow the system, and expose a
three-option control: System, Light, Dark. In system mode, re-resolve on \`change\` from
\`matchMedia('(prefers-color-scheme: dark)')\`, gating on the mode inside the listener so it
never has to be re-subscribed.

## 6. Multi-brand and runtime injection

Brand and theme are orthogonal: a brand swaps the **primitive** layer, a theme swaps the
**semantic** layer. Compose them as independent root attributes,
\`[data-brand="acme"][data-theme="dark"]\`, not one file per combination — that set grows as
brands times themes and diverges wherever nobody looks.

For runtime tenant themes, write primitives into a **single stylesheet** — one \`<style>\`, or
a \`CSSStyleSheet\` in \`adoptedStyleSheets\` — not inline custom properties across many nodes,
which sit atop the cascade and destroy the override seam. Validate every injected value: it
lands in a declaration context, so an unvalidated one is a stylesheet injection.

## 7. Dark is a design, not a transform

Elevation reverses — higher surfaces become *lighter*, because a shadow has nothing left to
darken into. Accent chroma drops 25-40% as lightness rises, because saturated colour on
near-black glows. Both extremes are wrong: L 0.18 darkest surface, L 0.94 brightest
foreground. And foreground-on-accent often flips white to dark once the accent lightens —
the missed check.

## 8. Forced colours is a different problem

\`@media (forced-colors: active)\` means the user agent has replaced your colours with a small
user-chosen palette: author backgrounds are overridden, \`box-shadow\` is dropped, background
images may be removed. **Everything expressed only through background colour or elevation
disappears** — selected rows, active tabs, status chips, card boundaries, shadow-based focus
rings. The interface does not get more contrast; it gets more ambiguous.

Re-express state in what survives — borders, outlines, underlines — and use the system
keywords \`Canvas\`, \`CanvasText\`, \`ButtonFace\`, \`ButtonText\`, \`ButtonBorder\`, \`Field\`,
\`Highlight\`, \`HighlightText\`, \`LinkText\`, \`GrayText\` and \`AccentColor\`, which resolve to the
user's own palette. Reserve \`forced-color-adjust: none\` for elements whose colour *is* the
content — swatches, chart series, brand marks — and own their contrast yourself.
\`prefers-contrast: more\` is a separate signal asking you to raise your own contrast; it does
not imply forced colours.

## 9. Density and direction are theme axes too

Density is a scale factor over spacing and size tokens, not a second component library:
\`--density: 1 | 0.85 | 1.15\`, with \`--control-h: calc(2.5rem * var(--density))\`. It works
only if nothing hardcodes padding or height, and compact must not push targets below 24 by 24
CSS pixels (WCAG 2.2 SC 2.5.8) or type below 12px.

Direction is the same shape. Use logical properties throughout — \`margin-inline-start\`,
\`padding-block\`, \`inset-inline-end\`, \`border-start-start-radius\`, \`text-align: start\` — so
\`dir="rtl"\` on the root is the whole change. Directional icons (back, next) mirror;
representational ones (a clock, a check, a logo) do not.

## The failures, named

- **Theme flash.** Preference read in an effect or async store. Fatal on every cold load.
- **Hardcoded colours.** One \`#fff\` defeats the whole system, silently.
- **\`filter: invert(1)\` dark mode.** Rotates every hue 180 degrees; wrecks photos and logos.
- **Ignoring forced colours.** A careful palette becomes an unreadable flat grid.
- **Transitioning the switch.** Hundreds of concurrent colour transitions read as a wash.
- **Assuming symmetry.** Contrast passing in light rarely passes in dark unchecked.`,

    references: [
      {
        id: 'flash-free-theme-switching',
        title: 'Flash-free theme switching, end to end',
        answers:
          'What is the exact inline script, storage schema, and switcher wiring that resolves a theme before first paint, and why does each part have to be that way?',
        content: `# Flash-free theme switching, end to end

The flash of wrong theme has one cause: the browser painted before the application knew which
theme to use. Every fix is a variation on "know earlier".

## The resolution order

1. An explicit stored choice, if one exists and is valid.
2. \`prefers-color-scheme\`, if no explicit choice exists.
3. The product default, if that media query is unsupported.

Store the *mode*, not the resolved theme: \`"light"\`, \`"dark"\`, or absent meaning "follow
the system". A stored boolean cannot keep following the OS, and any stale or unrecognised
value must fall through to system rather than be forced to light.

## The script

Place this first inside \`<head>\`, above every stylesheet link.

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

**\`document.documentElement\`** is used because \`document.body\` does not exist yet — the
script runs during head parsing — and because the theme attribute must be an ancestor of
everything.

**The \`try/catch\` around \`localStorage\`** is not padding. Access *throws*, rather than
returning null, in some private-browsing configurations and in any third-party iframe where
storage access is blocked. An uncaught throw aborts the script and leaves the attribute
unset, producing the exact flash you are preventing, on the browsers least likely to be in
your test matrix.

**Validating \`stored\`** makes a value from an older release, or from a user editing
storage, fall through to system, which is always safe.

**Both attributes are written.** \`data-theme\` is what CSS selects on; \`data-theme-mode\`
is what the switcher reads to show System, Light, or Dark as selected. The mode is not
recoverable from the resolved theme.

**\`root.style.colorScheme\`** is set inline at the same moment, so native widgets and the
canvas match before the stylesheet parses — the one case where an inline style is correct.

## Why inline, and why blocking

\`defer\` and \`type="module"\` run after document parsing; \`async\` runs whenever it
arrives; a framework effect runs after hydration. All are after first paint, so all produce a
visible repaint. An *external* synchronous script does block the parser, but adds a network
round trip before anything renders — a blank screen instead of a flash, and a request on the
critical path for roughly 400 bytes of logic.

Under CSP, do not relax the policy for this: emit a per-request nonce
(\`<script nonce="{value}">\`) or add the script's SHA-256 hash to \`script-src\`.

## Server rendering

The server cannot know the system preference: \`prefers-color-scheme\` is a client
capability and \`Sec-CH-Prefers-Color-Scheme\` is absent on the first request. Render
theme-neutral markup and let the inline script decide. Do not read the theme during render to
choose markup — components must be identical across themes and differ only in resolved token
values, or hydration mismatches. Where one must branch on theme in JavaScript, initialise
from \`document.documentElement.dataset.theme\` in a layout effect.

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

Do not put \`transition: background-color 300ms\` on \`*\`. Hundreds of simultaneous
transitions composite unevenly, the page melts rather than switches, and anything mounting
mid-transition arrives part-way through its fade. For a smooth switch use a view transition,
which snapshots and cross-fades once:

    if (document.startViewTransition) {
      document.startViewTransition(() => setMode(next))
    } else {
      setMode(next)
    }

Gate it behind \`prefers-reduced-motion\`, and keep the direct call as the fallback path.

## Things that still flash

- **Iframes.** A frame does not inherit the parent's attribute. Pass the theme in the URL or
  via \`postMessage\`, and set \`color-scheme\` inside the frame document.
- **The canvas before CSS.** Add \`<meta name="color-scheme" content="light dark">\`.
- **\`<canvas>\` and generated SVG.** These read tokens at draw time and must be redrawn on
  theme change, not restyled.
- **Bfcache restores.** A page restored from the back/forward cache does not re-run the
  script. Re-resolve on \`pageshow\` when \`event.persisted\` is true.`,
      },
      {
        id: 'dark-token-set',
        title: 'Constructing the dark half of a token set',
        answers:
          'What values do I actually assign to each semantic token in a dark theme, and how do shadows, borders, images, and state colours change?',
        content: `# Constructing the dark half of a token set

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

Note that \`--fg-muted\` sits proportionally *closer* to \`--fg\` than its light-theme
counterpart sits to the light \`--fg\`. Perceived contrast compresses toward the dark end, so
a muted foreground that is comfortable at the light theme's proportion reads as barely legible
when mirrored. Mirroring the numbers is the specific mistake.

## Accents: two channels move, in opposite directions

Raise L by 0.10-0.14, because the accent must now separate from a dark surface. Reduce C by
25-40%, because chromatic aberration in the eye spreads the edge of a saturated colour and a
pupil dilated in a dark room worsens the scatter, so an unmodified accent appears to glow.

    light:  --accent: oklch(0.58 0.16 255);  --on-accent: white;
    dark:   --accent: oklch(0.70 0.11 255);  --on-accent: oklch(0.20 0.02 255);

**Re-check \`--on-accent\` after the lightness change.** A lighter accent frequently needs
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
through \`<picture>\` with a \`media="(prefers-color-scheme: dark)"\` source — not a CSS
filter, which will also invert any photographic content and any brand colour inside the mark.
Note that this media query follows the *system*, so when the app allows an explicit override,
select the source from the app's own theme state instead.

**Screenshots** are the wrong theme in one mode by definition. Ship both, or frame them on a
neutral surface so the mismatch reads as intentional.

**Charts** need re-derived palettes. Categorical series tuned for a white background lose
separation on a dark one, worst in the yellow-to-green region where the light ramp end
approaches the background. Grid lines and axis labels usually need to move further from the
foreground colour than a direct token swap gives.

**Anything drawn to \`<canvas>\` or generated as inline SVG from JavaScript** reads token
values at draw time and must be redrawn on theme change, not merely restyled.

## What to re-audit

Assume nothing transfers. Re-run the full contrast audit against the dark values: body and
muted text on every surface, foreground on accent and on accent-hover, control borders at 3:1,
and the focus indicator at 3:1 against both the component and the surface behind it. Check
disabled states specifically — a disabled control derived by lowering opacity usually drops
below the 3:1 non-text floor against a dark surface and vanishes entirely, which is a
different and worse failure than looking dim.`,
      },
    ],
  },

  rules: [
    {
      id: 'theming-systems/semantic-layer-required',
      strength: 'must',
      statement:
        'Define a semantic token layer named by role, distinct from the primitive palette, and redefine only that layer per theme.',
      evidence: {
        rationale:
          'A theme is a remapping from meaning to value, so it needs a layer that holds meaning. A flat set of renamed hex values has no such layer, which means a second theme can only be produced by editing every consumer. Role names also stay true across themes, while appearance-derived names become false the moment a dark theme exists.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: ':root {\n  --color-light-grey: #f4f4f5;\n  --color-primary-blue: #3b6fd4;\n}',
        good: ':root {\n  --grey-100: #f4f4f5;\n  --brand-600: #3b6fd4;\n  --surface: var(--grey-100);\n  --accent: var(--brand-600);\n}',
      },
      verifiedBy: 'token-layer-audit',
    },
    {
      id: 'theming-systems/components-use-semantic-tokens',
      strength: 'must-not',
      statement:
        'Do not reference palette primitives or literal colour values from component styles; reference semantic or component tokens only.',
      evidence: {
        rationale:
          'A component bound to a primitive has no meaning layer left to remap, so every theme, rebrand or contrast fix becomes a component edit. A single literal value also fails silently: it looks correct in the theme it was authored against and is only discovered when someone reports an unreadable element in the other theme.',
        confidence: 'strong',
      },
      verifiedBy: 'token-layer-audit',
    },
    {
      id: 'theming-systems/derived-tokens-below-override',
      strength: 'must',
      statement:
        'Declare derived tokens at or below the level where their inputs may be overridden, never resolving them once on :root when a subtree must vary.',
      evidence: {
        rationale:
          'Custom properties are substituted at computed-value time, so a var() reference resolves against the element that declares it. A token computed on :root inherits its already-substituted value into every subtree, and overriding its input further down changes nothing.',
        source: 'CSS Custom Properties for Cascading Variables Module Level 1',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: ':root { --accent: var(--brand-600); --btn-bg: var(--accent); }\n[data-brand="acme"] { --accent: var(--acme-600); } /* button unchanged */',
        good: ':root { --accent: var(--brand-600); }\n[data-brand="acme"] { --accent: var(--acme-600); }\n.btn-primary { background: var(--btn-bg, var(--accent)); }',
      },
      verifiedBy: 'token-layer-audit',
    },
    {
      id: 'theming-systems/token-always-defined',
      strength: 'must',
      statement:
        'Give every token a value on the root, or supply a fallback at every var() reference.',
      evidence: {
        rationale:
          'A var() whose custom property has no value makes the entire declaration invalid at computed-value time, so the property resolves to unset rather than being skipped. For an inherited property such as color that means the element silently takes its parent value, which can produce foreground and background that are the same colour.',
        confidence: 'established',
      },
    },
    {
      id: 'theming-systems/theme-parity',
      strength: 'must',
      statement:
        'Define the same set of semantic token names in every theme, with no token present in one theme and absent in another.',
      evidence: {
        rationale:
          'A token missing from one theme does not fall back to a sensible default; it falls back to whatever the root declared, which is the other theme value, producing an element that is correct in one theme and inverted in the other. Missing tokens are invisible until the specific component is rendered in the specific theme.',
        confidence: 'strong',
      },
      verifiedBy: 'theme-parity-audit',
    },
    {
      id: 'theming-systems/blocking-inline-resolution',
      strength: 'must',
      statement:
        'Resolve the active theme in a parser-blocking inline script placed in <head> above the stylesheets, not in a deferred, external, or framework-lifecycle script.',
      evidence: {
        rationale:
          'Deferred, module, async and effect-based code all execute after first paint, so the browser has already painted the default theme and the correction is a visible repaint. An external synchronous script blocks the parser for a network round trip, trading the flash for a blank screen and adding a request to the critical path.',
        confidence: 'established',
      },
      exceptions: [
        'Authenticated pages where the mode is stored in a cookie and rendered server-side — but the inline script is still required to resolve the system-preference branch.',
      ],
      verifiedBy: 'flash-audit',
    },
    {
      id: 'theming-systems/resolution-order',
      strength: 'must',
      statement:
        'Resolve the theme as explicit stored choice first, system preference second, product default last.',
      evidence: {
        rationale:
          'An explicit choice is the only signal that expresses intent about this product specifically. Consulting the system first overrides a deliberate decision whenever the OS switches, which for a schedule-based system theme means the app silently changes twice a day against the user’s wishes.',
        confidence: 'established',
      },
    },
    {
      id: 'theming-systems/three-state-preference',
      strength: 'must',
      statement:
        'Store the theme preference as light, dark, or absent-meaning-system, and expose a three-option control rather than a boolean toggle.',
      evidence: {
        rationale:
          'A boolean cannot distinguish "the user chose light" from "the user has not chosen", so the first interaction with a toggle permanently opts the user out of their operating system preference with no way back. The three-state form keeps "follow the system" reachable and makes the current state legible.',
        confidence: 'strong',
      },
      examples: {
        language: 'ts',
        bad: "type ThemePref = boolean // isDark\nlocalStorage.setItem('dark', String(isDark))",
        good: "type ThemeMode = 'light' | 'dark' | 'system'\nmode === 'system'\n  ? localStorage.removeItem('theme-mode')\n  : localStorage.setItem('theme-mode', mode)",
      },
      verifiedBy: 'flash-audit',
    },
    {
      id: 'theming-systems/declare-color-scheme',
      strength: 'must',
      statement:
        'Declare color-scheme on the root for every theme, and update it when the user overrides the system preference.',
      evidence: {
        rationale:
          'color-scheme is the only mechanism that reaches user-agent rendering: the canvas background, scrollbars, native form controls, date and colour pickers, spellcheck underlines, and the used values of system colour keywords. Without it a dark page renders light scrollbars and light native widgets, and light-dark() does not resolve at all.',
        source: 'CSS Color Adjustment Module Level 1, color-scheme',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '[data-theme="dark"] { --surface: #16181d; --fg: #e8e8ea; }',
        good: ':root { color-scheme: light dark; }\n[data-theme="dark"] { color-scheme: dark; --surface: #16181d; --fg: #e8e8ea; }',
      },
      verifiedBy: 'flash-audit',
    },
    {
      id: 'theming-systems/no-filter-invert',
      strength: 'must-not',
      statement:
        'Do not implement a dark theme with filter: invert(), hue-rotate(), or any global pixel transform.',
      evidence: {
        rationale:
          'Inversion operates on rendered values rather than on roles, so it rotates every hue by 180 degrees — the brand colour becomes its complement and error red becomes cyan — inverts photographs and logos, double-inverts any descendant that compensates, and cannot express the elevation reversal a dark theme requires.',
        confidence: 'established',
      },
    },
    {
      id: 'theming-systems/dark-elevation-by-lightness',
      strength: 'should',
      statement:
        'In dark themes express elevation through increasing surface lightness in steps of roughly 0.035 L, and demote shadows to contact cues.',
      evidence: {
        rationale:
          'A shadow works by darkening the surface beneath an element. Against an already-dark surface there is little range left to darken into, so the cue is invisible and the theme loses its entire depth vocabulary at once. A lighter nearer surface is both visible and physically consistent.',
        confidence: 'strong',
      },
      verifiedBy: 'dark-theme-review',
    },
    {
      id: 'theming-systems/recheck-on-accent',
      strength: 'must',
      statement:
        'Re-check the foreground colour placed on an accent after adjusting that accent for a dark theme.',
      evidence: {
        rationale:
          'A dark-theme accent is lighter than its light-theme counterpart, which often inverts the correct text polarity on top of it. Carrying white text across unchanged produces a primary button around 2:1, and because the button still looks confident nobody reports it until an audit.',
        confidence: 'strong',
      },
      verifiedBy: 'dark-theme-review',
    },
    {
      id: 'theming-systems/forced-colors-structural',
      strength: 'must',
      statement:
        'Ensure every state and boundary conveyed by background colour or shadow is also conveyed by a border, outline, or text change under forced-colors: active.',
      evidence: {
        rationale:
          'In forced colours mode the user agent replaces author background colours with a small user-chosen palette and drops box-shadow entirely, so selection, active tabs, status chips, card edges and shadow-based focus rings all collapse into an undifferentiated surface. The interface does not become high-contrast; it becomes ambiguous.',
        source: 'CSS Color Adjustment Module Level 1, forced colors mode',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors',
        confidence: 'established',
      },
      verifiedBy: 'forced-colors-review',
    },
    {
      id: 'theming-systems/system-colour-keywords',
      strength: 'should',
      statement:
        'Inside a forced-colors block, express colours with system keywords such as Canvas, CanvasText, ButtonBorder, Highlight, and GrayText rather than with theme tokens.',
      evidence: {
        rationale:
          'System colour keywords resolve to the user’s own chosen forced palette, so they remain internally consistent and meet that user’s contrast needs by construction. Theme tokens in the same position are either overridden anyway or, where they survive, produce pairs whose contrast is unknown because the surrounding colours are no longer yours.',
        confidence: 'established',
      },
    },
    {
      id: 'theming-systems/forced-color-adjust-narrow',
      strength: 'should-not',
      statement:
        'Do not apply forced-color-adjust: none broadly to preserve a design; restrict it to elements whose colour is itself the content.',
      evidence: {
        rationale:
          'Opting out of forced colours discards the guarantee the user asked for and hands responsibility for their contrast back to a palette they have already rejected as unusable. It is legitimate only where colour carries information that cannot be re-encoded — colour swatches, chart series, brand marks — and then the element’s own contrast must be supplied.',
        source: 'CSS Color Adjustment Module Level 1, forced-color-adjust',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/forced-color-adjust',
        confidence: 'established',
      },
      verifiedBy: 'forced-colors-review',
    },
    {
      id: 'theming-systems/no-global-theme-transition',
      strength: 'should-not',
      statement:
        'Do not add colour transitions to a universal selector for the theme switch; switch instantly or use a single view transition.',
      evidence: {
        rationale:
          'Hundreds of independent colour transitions starting at once composite unevenly, so the page appears to melt rather than switch, and any element that mounts during the transition arrives part-way through its own fade. A view transition cross-fades one snapshot instead, which is a single coherent animation.',
        confidence: 'strong',
      },
      exceptions: ['A scoped transition on a small number of large surfaces, gated behind prefers-reduced-motion.'],
    },
    {
      id: 'theming-systems/orthogonal-brand-axis',
      strength: 'should',
      statement:
        'Express brand and theme as independent root attributes that compose, rather than as one theme file per brand-and-theme combination.',
      evidence: {
        rationale:
          'A brand swaps the primitive layer and a theme swaps the semantic layer, so they are independent. Materialising the product of the two axes means every semantic change must be replicated across brands times themes files, and the copies diverge in exactly the combinations nobody renders during review.',
        confidence: 'strong',
      },
    },
    {
      id: 'theming-systems/runtime-injection-single-sheet',
      strength: 'should',
      statement:
        'Inject runtime themes as a single stylesheet or adopted CSSStyleSheet, validating each value, rather than setting inline custom properties across many elements.',
      evidence: {
        rationale:
          'Inline styles sit at the top of the cascade and cannot be overridden by a more specific rule, which removes the override seam the token layers exist to provide. An injected token value is also substituted into a declaration context, so an unvalidated tenant-supplied string is a stylesheet injection.',
        confidence: 'strong',
      },
    },
    {
      id: 'theming-systems/logical-properties',
      strength: 'should',
      statement:
        'Use logical properties and values for spacing, borders, radii, and alignment so that direction is a root attribute rather than a stylesheet fork.',
      evidence: {
        rationale:
          'Physical properties encode a writing direction into every rule, so right-to-left support becomes a parallel stylesheet that must be maintained in step with the original. Logical properties resolve against the element’s writing mode, which makes dir="rtl" on the root the complete change.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.card { padding-left: 16px; margin-right: 8px; text-align: left; }',
        good: '.card { padding-inline-start: 16px; margin-inline-end: 8px; text-align: start; }',
      },
      verifiedBy: 'density-direction-review',
    },
    {
      id: 'theming-systems/density-as-token-scale',
      strength: 'should',
      statement:
        'Implement density as a scale factor applied to spacing and control-size tokens, not as alternative component variants, and keep targets at or above 24 by 24 CSS pixels.',
      evidence: {
        rationale:
          'Density variants defined per component multiply the surface area of every future change and drift apart. A single scale factor keeps them consistent by construction, but only if no component hardcodes padding or height, and the target-size floor must be enforced independently because the factor will otherwise shrink hit areas below usable size.',
        source: 'WCAG 2.2 Success Criterion 2.5.8 (Target Size (Minimum))',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html',
        confidence: 'strong',
      },
      verifiedBy: 'density-direction-review',
    },
    {
      id: 'theming-systems/dark-asset-variants',
      strength: 'should',
      statement:
        'Supply dark-theme variants of logos, illustrations, and diagrams as separate assets selected by source or state, rather than filtering the light asset.',
      evidence: {
        rationale:
          'A filter applies to every pixel, so it also inverts photographic content inside a mark and rotates the brand hue to its complement. Selecting a separate source keeps both versions under the designer’s control and lets the choice follow the application’s theme state rather than only the system preference.',
        confidence: 'strong',
      },
    },
    {
      id: 'theming-systems/audit-each-theme',
      strength: 'must',
      statement:
        'Run the contrast audit independently against every theme rather than inferring one theme’s compliance from another’s.',
      evidence: {
        rationale:
          'The WCAG 2 contrast formula is not symmetric under lightness reversal: its fixed 0.05 flare term inflates ratios among dark pairs, so a pair that passes marginally in a light theme usually fails its dark counterpart. Disabled states derived by opacity are worst affected and often drop below the 3:1 non-text floor.',
        confidence: 'established',
      },
      verifiedBy: 'theme-parity-audit',
    },
  ],

  verification: [
    {
      id: 'token-layer-audit',
      kind: 'self-review',
      description: 'Confirm the token layers exist and are intact.',
      blocking: true,
      questions: [
        'Does any component style, utility class, or inline style reference a palette primitive or a literal colour value?',
        'Is there a semantic layer named by role, or are the tokens primitives with semantic-sounding names?',
        'Is any derived token declared on :root whose input is overridden further down the tree? If so, that override currently does nothing.',
        'Does every token referenced anywhere have a value on the root, or a fallback at the reference?',
      ],
    },
    {
      id: 'flash-audit',
      kind: 'self-review',
      description: 'Confirm the theme resolves before first paint.',
      blocking: true,
      questions: [
        'Is the theme resolution an inline script in <head> above the stylesheets, with no defer, async, or type="module"?',
        'Is the localStorage read wrapped so a throw cannot abort the script?',
        'Does the resolution order put an explicit stored choice ahead of prefers-color-scheme?',
        'Is color-scheme set on the root for the resolved theme, including when the user has overridden the system?',
        'Does the stored preference distinguish "chose light" from "has not chosen", and does the control offer three options?',
        'Load the page with a cold cache, throttled, with the system in dark and no stored preference: is any light frame painted?',
      ],
    },
    {
      id: 'theme-parity-audit',
      kind: 'self-review',
      description: 'Confirm every theme is complete and independently audited.',
      blocking: true,
      questions: [
        'Do all themes define exactly the same set of semantic token names?',
        'Was contrast measured against each theme separately rather than assumed from the default theme?',
        'Do foreground-on-accent, hover, and selected states clear 4.5:1 in every theme?',
        'Do control borders, switch tracks, and focus indicators clear 3:1 in every theme?',
        'Do disabled controls remain perceivable in the darkest theme, or were they derived by lowering opacity?',
      ],
    },
    {
      id: 'forced-colors-review',
      kind: 'self-review',
      description: 'Confirm the interface survives forced colours.',
      blocking: true,
      questions: [
        'With forced colours active, is every selected, active, checked, or highlighted state still distinguishable?',
        'Do card, panel, and input boundaries still exist once background colours and box-shadow are removed?',
        'Is the focus indicator drawn as an outline or border rather than a box-shadow?',
        'Is forced-color-adjust: none used anywhere other than on elements whose colour is itself the content?',
        'Does the design respond to prefers-contrast: more, and is that handled separately from forced colours?',
      ],
    },
    {
      id: 'dark-theme-review',
      kind: 'self-review',
      description: 'Confirm the dark theme was constructed rather than transformed.',
      questions: [
        'Do surfaces get lighter with elevation, in steps of at least 0.03 in lightness?',
        'Is the darkest surface above L 0.15 and the brightest foreground below L 0.97?',
        'Was accent chroma reduced and lightness raised, and was the foreground on the accent re-checked afterwards?',
        'Do logos, illustrations, screenshots, and charts have real dark variants rather than filters?',
        'Is anything drawn to canvas or generated as SVG in JavaScript redrawn on theme change, not just restyled?',
      ],
    },
    {
      id: 'density-direction-review',
      kind: 'self-review',
      description: 'Confirm density and direction are theme axes, not forks.',
      questions: [
        'Is density a scale factor over spacing and size tokens, or a set of per-component variants?',
        'At the most compact density, is every interactive target still at least 24 by 24 CSS pixels?',
        'Does any rule use a physical property — left, right, margin-left, padding-right, text-align: left — where a logical one exists?',
        'Under dir="rtl", do directional icons mirror while representational ones do not?',
      ],
    },
    {
      id: 'contract-audit',
      kind: 'contract',
      description: 'Evaluate the token set and theme machinery against the project Design Contract.',
      contractSection: 'theming',
    },
  ],

  relatedSkills: [
    'colour-systems',
    'design-tokens',
    'accessible-components',
    'surface-and-depth',
    'component-architecture',
  ],
}
