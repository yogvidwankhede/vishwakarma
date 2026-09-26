# Design Judgment

Generated interfaces fail in a consistent, recognisable way. They are not ugly — ugly
would be interesting. They are *undifferentiated*: every element carries the same visual
weight, every gap is the same size, every corner has the same radius, and the eye has
nowhere to go. The result reads as competent and forgettable, which in a product context
is worse than reading as wrong, because nobody can tell you why they don't trust it.

Almost all of this traces to one root cause. **Design is the deliberate creation of
difference.** Hierarchy is difference in weight. Rhythm is difference in spacing. Emphasis
is difference in colour. A model generating UI defaults to uniformity because uniformity
is the safest local choice at every individual decision — and the sum of a thousand safe
local choices is a page with no structure at all.

So the governing question for every element is not "does this look good" but **"what is
this element's rank, and does its treatment match its rank?"**

---

## 1. Hierarchy before decoration

Before styling anything, rank the content. Every screen has exactly one thing that matters
most, a small number of things that matter next, and a long tail of things that matter
little. Write that ranking down, then make the visual treatment express it.

The tools for expressing rank, in descending order of power:

**Space** is the strongest and the most underused. A heading with 48px above it and 12px
below it is bound to the paragraph beneath — the eye groups them without being told. Equal
space above and below leaves the heading floating between two blocks, belonging to
neither. Proximity communicates relationship more forcefully than any border or background
ever will, and it costs nothing.

**Size** is the most obvious, and therefore the one people overuse. Two type sizes with a
real gap between them beat five sizes with small gaps, every time. If your h2 is 1.5rem and
your h3 is 1.375rem, you do not have two levels — you have one level and a rendering bug.

**Weight** does more than size at small scales. Going from 400 to 600 at the same size
creates clear emphasis without disturbing the layout, which is why it is the right tool
inside dense UI where size changes would break the grid.

**Colour** is the weakest and the most abused. Making something a different colour to make
it important works only if almost nothing else is coloured. On a page where six things are
blue, blue means nothing.

The corollary: **if everything on the page is emphasised, nothing is.** When you catch
yourself adding emphasis to an element, check what you can de-emphasise instead. Lowering
the contrast of the surrounding text is usually a better move than raising the contrast of
the target, because it preserves the overall calm of the page.

---

## 2. Vary density deliberately

A generated page usually has one padding value applied everywhere. Real interfaces breathe
unevenly: a hero has enormous room, a data table is tight, a settings form sits between the
two. Density is information — a dense region says "this is for working in", a sparse region
says "this is for reading".

Sections that mark a change of subject need noticeably more separation than elements within
a section. If the gap between two cards is 24px, the gap between two sections should be
96px or more, not 32px. Weak section separation is the single most common cause of a page
that "feels flat" — the reader cannot tell where one idea ends.

Padding inside a container should relate to the container's size. A 320px card with 32px
padding is generous; a 1200px section with 32px padding is cramped. Scale the inner space
with the outer size, roughly but visibly.

Vertical rhythm beats horizontal symmetry. It is fine — often better — for the space above
an element to differ from the space below it. Symmetric padding on a section that follows a
hero pushes the section title too far from its own content.

---

## 3. What judgment asks of each craft domain

Six sibling skills own the values. This skill owns the judgment about them, and it is the
same judgment every time: **is there enough difference, and is each difference doing a job?**
Below, the one question to ask and the tell that answers it when the answer is no.
`craft-values.md` has the specific numbers and names the owner for each.

**Type — has it been *typeset*, or only sized?** Zero letter-spacing at every size is the
most reliable single tell of an untypeset page: display type needs it negative and its
leading tight, caption type needs the opposite of both. Owner: `typographic-systems`.

**Colour — does the accent have exactly one job?** The moment it also appears in an
illustration, a badge and a chart, it has stopped directing attention. And never gradient
text on a headline: it is the clearest single marker of a generated marketing page, it fails
contrast somewhere along its run, and it breaks selection highlighting. Owner:
`colour-systems`.

**Depth — is there one light source?** A page where every element carries the same shadow
has no light source and reads as stickers on paper. Border or shadow, never both on one
element; they describe contradictory physical situations. Glass needs something worth seeing
through. Owner: `surface-and-depth`.

**Layout — does anything break the grid?** The default output is a centred column of
full-width sections, each holding a heading, a subheading and a row of three equal cards.
It is not wrong; it is what everyone produces, and it signals that no decisions were made.
One asymmetric span, or one element crossing its container, is enough to reverse that read.
Owner: `layout-composition`.

**States — does the empty state earn its screen?** It is the first thing every new user
sees and the state most often skipped; "No items" wastes it. Then stress the layout with the
longest plausible string rather than "John Smith", because most layout bugs that reach
production are content-length bugs invisible against placeholder text. Owner:
`interface-states`.

**Motion — how often will the user see this?** Something seen a hundred times a day should
not be animated at all. Forty elements sharing one fade-up announces a template faster than
anything else on this list. Owner: `motion-design`.

---

## What "premium" actually is

It is not gradients, glass, or glow. Interfaces read as expensive when they demonstrate
that decisions were made: consistent spacing from a real scale, restrained colour,
typography that has been fitted rather than defaulted, motion that is short and purposeful,
and one or two moments of deliberate asymmetry that prove a human was paying attention.

Every one of those is checkable. None of them require taste to verify — only to originate.

The checking itself is not in this body. The verification section below is the short form,
run on every screen; `critique-protocol.md` is the seven-pass long form for a finished
interface; `anti-patterns.md` is the catalogue of tells with a replacement for each.

## Rules

### MUST NOT — Do not apply multi-hue gradients to heading text as a decorative effect.

*Why:* Gradient headline text is the strongest single visual marker of generated marketing pages, and it additionally fails contrast auditing at some point along its run because the ratio varies with position.

*Exceptions:*
- The brand’s own identity system specifies it and supplies the tested colour stops.

Incorrect:

```tsx
<h1 className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">Ship faster</h1>
```

Correct:

```tsx
<h1 className="text-5xl font-semibold tracking-[-0.022em] text-fg">Ship faster</h1>
```

### MUST NOT — Do not apply backdrop blur over a flat background.

*Why:* A backdrop filter samples and blurs what is behind the element. Over a flat fill there is nothing to sample, so the effect produces only a slight tint while still forcing the compositor to allocate and blur a backdrop texture every frame.

### MUST NOT — Do not use emoji as interface icons.

*Why:* Emoji glyphs are supplied by the operating system, so they differ across platforms, cannot be recoloured to match the interface, do not align to the text baseline consistently, and are announced by screen readers with names that rarely match their intended meaning.

*Exceptions:*
- User-authored content, where emoji are the user’s own words.

### MUST NOT — Do not apply hover transitions — lift, scale, glow, colour shift — to elements that do not respond to a click or a key press.

*Why:* A hover response is an affordance claim: the element is reporting that it can be operated. Firing it on static cards and stat tiles trains the user that motion under the cursor means nothing, after which the hover states that do mark real targets stop being read, and pointer users lose their only pre-click cue for what is clickable.

*Exceptions:*
- A card that is itself one link or button, where the whole surface is the target.
- Hover that reveals genuinely deferred content, such as a tooltip or a row action.

### MUST — Name the audience, the product job, and one thing the product is deliberately not, before choosing a visual direction — and state them as assumptions if nobody has supplied them.

*Why:* A visual direction is only correct relative to a product. With no stated product, the generative default is the most common pattern in training data — the centred hero, the three feature cards, the gradient CTA — which is the specific failure this skill exists to prevent. Stating what the product is not is what breaks that pull, because the pull is toward a template rather than away from a requirement, and a negative constraint is the only kind that blocks it. Assumptions stated in the report cost one correcting sentence; assumptions left implicit are discovered after the interface is built.

*Exceptions:*
- A critique of an existing interface inherits the product context from the artefact under review, and inventing a different one rewrites the brief instead of reviewing the work.

### MUST — Rank the content of a screen by importance before applying any styling, and make each element’s visual weight match its rank.

*Why:* Visual hierarchy is the mechanism by which a viewer decides where to look. Without an explicit ranking, every styling decision is made locally, and locally safe choices sum to uniformity, which presents the viewer with no entry point.

### MUST — Constrain any container holding prose to a maximum measure of about 75 characters.

*Why:* Beyond roughly 75 characters per line, the return sweep to the start of the next line becomes unreliable and readers lose their place, which measurably reduces reading speed and comprehension.

### MUST — Never convey state or meaning through colour alone; always pair it with text, an icon, or a shape.

*Why:* Around 8% of men and 0.5% of women have a colour vision deficiency, most commonly affecting red-green discrimination — exactly the pairing used for error and success states.

*Source:* [WCAG 2.2 Success Criterion 1.4.1 (Use of Color)](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)

### MUST — Design the empty, loading, error, and overflow states for every screen that displays fetched or variable-length content.

*Why:* The empty state is the first thing every new user sees, and variable-length content is the most common source of layout defects that reach production. Both are invisible when developing against fixed sample data.

### MUST — Verify every layout against the longest realistic string, an empty collection, and a large collection before considering it complete.

*Why:* Layouts are authored against convenient sample data whose length happens to fit. The overwhelming majority of layout defects found in production are content-length defects that were structurally invisible during development.

### MUST — Build the palette with at least one value below 30% lightness, one above 95%, and most surfaces below half the available chroma, so emphasis has somewhere left to go.

*Why:* Emphasis is contrast, and contrast is spent out of a fixed range. An all-pastel palette has no value dark enough to make the primary action primary once body text has taken its 4.5:1; a palette pinned at the chroma ceiling has nothing that can be more vivid than its neighbours, because saturation is judged relatively. Both are legible and flat, which is the failure users describe as looking fine but nothing standing out.

*Exceptions:*
- A single decorative region such as a hero wash or an illustration may sit inside a narrow band, provided the interface elements over it draw from the full range.
- Categorical data visualisation, where several series need maximum separation in hue and chroma simultaneously.

### SHOULD NOT — Do not use more than six distinct font sizes in a single view.

*Why:* Hierarchy is expressed through perceptible differences between levels. Beyond roughly six levels the differences become too small to perceive, so additional sizes add visual noise without adding structure.

*Exceptions:*
- Dense data applications where a documented scale intentionally covers more levels.

### SHOULD NOT — Do not combine a visible border and a drop shadow on the same element.

*Why:* A border states that an element is flush with the surface and delineated by a line; a shadow states that it is raised above the surface. Applying both describes two contradictory physical situations, which reads as indecision.

*Exceptions:*
- A very low-contrast border used purely to hold an edge against a same-tone background, where the shadow alone would disappear.

### SHOULD NOT — Do not add a visual element that carries no information — background dot grids, radial glow orbs, sparkle icons, multi-colour accent stripes, or decorative window chrome.

*Why:* Every mark on a screen is read as a signal before it is read as decoration, and each of these marks is borrowed from a component where it did carry one: a status stripe, a progress bar, an application chrome, a generative-feature affordance. Used decoratively it spends attention on a claim the page cannot honour, and it devalues the same mark everywhere it is load-bearing. The cost is not the pixels, it is that the vocabulary stops being trustworthy.

*Exceptions:*
- A mark specified by a documented identity system, where it reads as the brand rather than as a borrowed interface signal.
- Illustration and editorial art, which the viewer parses as an image rather than as interface.

### SHOULD NOT — Do not use pure white or pure black for surfaces, text, or borders, and keep at least three tint steps between the page and the topmost layer.

*Why:* Pure white and pure black are the two values a palette contains when nobody defined one, which is precisely why they read as unfinished. With the page already at the end of the lightness range, no step remains above it, so cards, inputs, and popovers must be separated by borders instead of by surface — which is where the flat, outlined look comes from. A neutral ramp carrying a chroma of roughly 0.005 to 0.01 also binds the greys to the accent hue, and that is perceived as coherence rather than as colour.

*Exceptions:*
- Print and e-ink output, where the substrate itself is the white point.
- OLED interfaces where true black is chosen for power or contrast, provided the surface step above it still exists.

### SHOULD NOT — Do not give different hues to items that differ only in position, and keep a single view to at most three hue families.

*Why:* A hue change is read as a category change, because hue is the strongest categorical cue the medium has. Mapping hues across a set of siblings — six feature icons, eight tags, a nav — therefore asserts a taxonomy the content does not have, and once six hues are in play there is no hue left that can mark the one item which actually is different.

*Exceptions:*
- Data encodings with a legend, where the hue is the data.
- Colour used as a user-assigned label, as in calendars and project tags.

### SHOULD NOT — Do not run a looping animation — a bouncing arrow, a pulsing ring, a shimmering border — outside an indeterminate-progress context.

*Why:* Peripheral motion is processed pre-attentively, so a loop re-captures attention on every cycle whether or not it has anything new to report. In a progress context the repetition is the message; everywhere else it charges the user indefinitely to restate something the layout already states, and large-area looping motion is a documented trigger for vestibular symptoms.

*Exceptions:*
- Indeterminate loading, streaming, and live-connection indicators.
- Ambient motion in an explicitly decorative surface, gated behind prefers-reduced-motion.

### SHOULD — Separate top-level sections by at least three times the gap used between elements inside a section.

*Why:* Proximity is the dominant grouping cue in visual perception. When between-group spacing does not clearly exceed within-group spacing, the viewer cannot parse where one idea ends and the next begins, and the page reads as a single undifferentiated block.

### SHOULD — Apply negative letter-spacing to display sizes and slightly positive letter-spacing to small text, rather than leaving tracking at zero everywhere.

*Why:* Typefaces are spaced by their designer for text sizes. That spacing appears loose when scaled up and tight when scaled down, so uniform zero tracking produces visibly mis-set type at both extremes.

### SHOULD — Assign the accent colour exactly one semantic job, and do not use it for decoration.

*Why:* An accent directs attention by being rare. Each additional use dilutes it, and past a handful of uses it conveys no information at all while still consuming visual energy.

### SHOULD — Use a small elevation system with a consistent light source, and combine a tight contact shadow with a wider ambient shadow at each level.

*Why:* Real objects cast two distinguishable shadows: a sharp one where they meet the surface and a diffuse one from ambient light. A single-shadow approximation lacks the contact cue, so elements read as pasted onto the page rather than raised above it.

### SHOULD — Include at least one deliberate asymmetry or grid break per page, such as an unequal card span or an element that overflows its container.

*Why:* Perfect regularity is the signature of a template. A single controlled deviation demonstrates that the layout was composed rather than filled, and it gives the eye a place to rest that is not the centre.

### SHOULD — Present exactly one filled primary button per view.

*Why:* A primary button communicates the expected next action. Two equally weighted primaries force the user to make a decision the interface should have made for them, which measurably slows task completion.

*Exceptions:*
- Genuinely symmetric binary choices, such as accept and decline in a consent dialog.

### SHOULD — State the typeface choice against one rejected alternative and one reason, rather than inheriting whichever face the framework or template already configured.

*Why:* A default is not a decision, and the absence shows up downstream: a face nobody chose is used at every size without the optical corrections a chosen face gets, because whoever did not pick it also did not read its metrics. Requiring the comparison is what makes the choice checkable. Landing on Inter is legitimate; landing on it without knowing what it beat is the tell.

*Exceptions:*
- A project whose design system specifies the face, where the choice was made upstream and reopening it is the error.

### SHOULD — In a mixed-size tile layout such as a bento grid, no two cells may differ in area unless the content in them differs in importance.

*Why:* Unequal cells are themselves a hierarchy claim, since area is read as importance before any content is read. When the sizes were chosen to tile the rectangle neatly, the claim is false and the viewer spends attention on the largest tile because the layout instructed them to. An equal grid asserts nothing, which is weaker but not wrong.

*Exceptions:*
- Media galleries where cell size follows the intrinsic aspect ratio of the image.
- Dashboards where a cell is sized by the smallest area its chart stays legible in, making the sizing functional rather than expressive.

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm the interface has a perceptible hierarchy. (blocking)

- If you blurred this screen, which single element would still stand out?
- Is that element actually the most important thing on the screen?
- Name the second and third most prominent elements. Do they match ranks two and three of the content?

### Confirm spacing communicates grouping. (blocking)

- List every distinct spacing value used. Are any two values close but unequal?
- What is the ratio between section separation and within-section element separation? Is it at least 3:1?
- Does any heading have equal space above and below it? If so, it is not visually bound to its content.

### Confirm line lengths are readable.

- Does every prose container have a max-width?
- At the widest supported viewport, does any paragraph exceed roughly 75 characters per line?

### Confirm no meaning depends on colour alone. (blocking)

- List every place where colour signals state. Does each also carry an icon, label, or shape?
- Rendered in greyscale, would every state still be distinguishable?

### Confirm non-happy-path states exist. (blocking)

- What does this screen show when the data set is empty?
- What does it show while loading, and does that placeholder reserve the same space as the loaded content?
- What does it show when the request fails, and does that message say what to do next?

### Confirm the layout survives real content.

- Does the layout hold with every string tripled in length?
- Does it hold with fifty items instead of three?
- Does it hold with every optional image missing?

### Evaluate the output against the project Design Contract. (blocking)

Evaluate the output against the project Design Contract.

Run `vishwakarma audit` if the project has the CLI available.

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/craft-values.md` — What are the concrete numbers behind "is it typeset", "is there one light source", "does it survive real content" — and which skill owns each of them?
- `references/anti-patterns.md` — What are the specific visual signatures that make an interface look AI-generated, and what replaces each one?
- `references/critique-protocol.md` — How do I systematically review an interface I just built and produce specific, prioritised fixes?
