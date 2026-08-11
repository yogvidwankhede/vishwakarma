# Information Architecture

Findability is not a search problem. It is a structure problem that search papers over. When a
user cannot find something they know exists, the usual cause is that the product is organised
around a model they do not hold.

---

## 1. The data model is not the task model

Every organisation has an internal model: the database schema, the team boundaries, the
billing entities. Every user has a different one, built from the job they came to do. These
diverge predictably, and the interface must follow the second.

A payments product stores `merchants`, `accounts`, `payment_intents` and `disputes` in
separate tables owned by separate teams, so the nav becomes Merchants / Accounts / Payments /
Disputes. The user's task is "find out why this customer's charge failed", which spans all
four. The right structure is customer-centred, with the charge, its intent and its dispute in
one place — even though nothing in the schema says so.

The diagnostic question is not "what objects do we have?" but **"what sentence would the user
say out loud about what they are trying to do?"** Nouns in that sentence are candidate
sections. Nouns that appear only in your ERD are not.

---

## 2. Breadth beats depth, and the research is unambiguous

The 7±2 rule is misapplied here: it concerns items held in working memory, not items visible
on screen, and a menu is read rather than remembered. Larson and Czerwinski tested three
hierarchies over 512 documents: 8×8×8 (three levels), 16×32 and 32×16 (two levels). The 8-wide
three-level structure was *slowest* and left users most disoriented; the 16-wide two-level
structure was fastest. Depth costs more than breadth because each level is another prediction
about what lies beneath a label, and a wrong prediction costs a full backtrack.

So flatten. Two or three levels for almost everything; a fourth only where the domain is
genuinely hierarchical and the user already knows that hierarchy. Fifteen visible options beat
five hiding three each — provided the labels are good, which is the real constraint.

---

## 3. Labels come from the user's vocabulary, and you can find it

A label's job is to let a user predict what is behind it — *information scent*. Scent fails
silently: users pick a plausible-looking wrong branch and blame themselves.

Four cheap sources of real vocabulary, in order of value:

**Internal search logs.** Every query is a user telling you the word they expected. A
high-volume query for a thing that has a nav entry means the nav entry is misnamed.
**Support tickets**, for the same reason. **Tree testing** — give the naked hierarchy, no
visual design, and ask people to find things; success rate and first-click accuracy isolate
structure from styling. **Card sorting** to generate groups — but treat it as input, not
verdict: participants sort by surface similarity and agree only at the extremes.

Reject invented category words. "Solutions", "Resources", "Workspace" and "Hub" carry no scent
because they mean whatever the writer wanted. If a label needs a tooltip, it is not a label.

---

## 4. Grouping is perceptual before it is logical

A correct taxonomy rendered without perceptual cues does not read as a taxonomy. Three
mechanisms do the work, in order of strength:

**Proximity** — items closer together are perceived as one group. This is the strongest and
cheapest cue. A nav where between-group spacing is 24px and within-group spacing is 8px is
grouped; at 12px and 8px it is not.

**Common region** — a shared background or border binds items even against proximity. Use it
when proximity is unavailable, not in addition to it.

**Similarity** — shared colour, weight or icon treatment implies shared kind, which is why
mixing icon-bearing and icon-less items in one list implies two kinds.

Group headers earn their vertical space only above about five items.

---

## 5. Progressive disclosure, and the line it must not cross

Hiding **complexity** is good: advanced options, rarely-changed defaults, secondary metadata.
Hiding **function** is not. The test is whether a user who does not already know the feature
exists could discover it. An "Advanced" panel of timeouts and retries hides complexity. A
hamburger on a 1440px desktop holding the only path to billing hides function — as does
icon-only navigation, because an icon is a mnemonic for something already learned, not a name.

Disclosure should be **progressive commitment** in onboarding: ask for the minimum needed for
the next step, deliver value, then ask again. A signup form demanding company size and job
title before the user has seen anything is asking for commitment ahead of evidence.

---

## 6. Page structure is machine-readable IA

The outline you designed must exist in markup, not just in typography.

Give every page exactly one `<h1>` naming *that page*, then descend without skipping levels.
Heading level is a structural claim, not a size control — style with a class. Screen reader
users navigate by heading, and a jump from `<h2>` to `<h4>` reads as a missing section.
The HTML outline algorithm was removed from the spec in 2022, and browsers are unshipping the
UA styles that shrank nested `<h1>`s, so an `<h1>` inside `<section>` implies nothing:
levels are explicit or they do not exist.

Wrap regions in landmarks — `<header>`, `<nav>`, `<main>` (exactly one), `<aside>`,
`<footer>` — and give multiple `<nav>`s distinct accessible names via `aria-label`, or
a landmark list reads "navigation, navigation, navigation".

Scannability follows from the same outline. Front-load headings: readers fixate the first two
words, so "Refund policy: annual plans" beats "What you need to know about refunds". Chunk
prose under headings rather than running it long, and mark the *current* nav item with
`aria-current="page"`, not colour alone.

---

## 7. Search, filters, facets, URLs

Search is navigation for people who already know the name: a complement to structure, never a
repair for it, since a user who cannot guess your labels cannot guess your keywords. Above
~30 destinations add a command palette; it collapses depth to one keystroke for the
experienced without flattening anything for the novice.

**Filters narrow a known set; facets describe it.** A facet shows its result count and derives
from the data, so a facet with zero matches is disabled or absent — never a dead option. A
zero-result state must always offer a route out: which term failed, what to relax, and the
nearest non-empty query.

**URLs are IA made durable.** Every distinct view needs its own address, hierarchical and
readable — `/projects/atlas/settings/members`, not `/app#tab=3`. A view you cannot link
to cannot be bookmarked, shared, or reported in a bug. When a label changes, redirect the old
path permanently: restructuring without redirects destroys the navigation knowledge held
outside your product.

---

## The failure modes

- **Navigation mirroring the org chart.** Users do not know your teams; a section per
  department guarantees every cross-team task crosses navigation.
- **"Miscellaneous" or "Other".** A category defined by what it is not has no scent, and it
  grows monotonically because everything ambiguous lands there.
- **Hamburger menus on desktop.** Hiding all navigation behind one control on a viewport with
  room to show it trades discoverability for tidiness.
- **Breadcrumbs that duplicate the nav.** Breadcrumbs state *position* on deep pages; on a
  two-level site they add a row and no information. They are not history.
- **Tabs for non-peers.** Tabs claim their contents are alternatives at the same level. Using
  them for sequential steps hides progress and breaks the back button.
- **Headings chosen by size.** An `<h4>` picked because it looked right destroys the outline
  for everyone navigating by structure.

## Rules

### MUST NOT — Do not create a "Miscellaneous", "Other", or "More" category to hold items that did not fit elsewhere.

*Why:* A category defined by exclusion has no predictable membership, so it offers no scent and cannot be reasoned about. It also grows monotonically, because every subsequently ambiguous item lands there, which means the categories that do work steadily lose coverage.

*Exceptions:*
- A visible overflow control on a genuinely space-constrained bar, where the hidden items are the least-used and are also reachable elsewhere.

### MUST NOT — Do not choose a heading level for its default font size; set the level from the outline and the size from a class.

*Why:* Heading level is a structural assertion consumed by screen readers, in-page tables of contents, and machine parsers, none of which see the rendered size. Selecting h4 because it looked right silently corrupts the outline for every user who navigates by structure rather than by eye.

Incorrect:

```html
<h2>Billing</h2>
<h4>Payment method</h4>
```

Correct:

```html
<h2>Billing</h2>
<h3 class="text-sm font-medium">Payment method</h3>
```

### MUST NOT — Do not place a primary task, a required action, or the only route to a feature behind progressive disclosure, an icon without a label, or an unlabelled overflow control.

*Why:* Progressive disclosure works because the user knows the hidden material exists and chooses not to look at it. A feature whose existence is itself hidden cannot be chosen against, so hiding it removes discovery rather than reducing noise. Icons are mnemonics for already-learned functions, not names for unknown ones.

*Exceptions:*
- Destructive actions deliberately made harder to reach, where the cost of accidental invocation exceeds the cost of the extra step.

### MUST — Derive top-level navigation from the tasks users perform, not from the database schema, the internal object model, or the organisational chart.

*Why:* Users navigate by predicting which label contains their goal, and that prediction is made from their own mental model of the task. An internal model is invisible to them, so structures derived from it force every cross-entity task — which is most tasks — to cross navigation boundaries the user has no reason to expect.

Incorrect:

```text
Nav: Merchants | Accounts | Payment Intents | Disputes   (one section per service team)
```

Correct:

```text
Nav: Customers | Payments | Reports | Settings   (a customer page shows their charges and disputes together)
```

### MUST — Name sections with words drawn from users — search logs, support tickets, or tree testing — rather than internal project names or invented category words.

*Why:* A label works by carrying information scent: enough signal for the user to predict what lies behind it. Internal or invented terms carry no scent because the user has no prior association with them, and the failure is silent — users choose a plausible wrong branch and conclude the feature does not exist.

Incorrect:

```text
Solutions | Resources | Workspace | Insights
```

Correct:

```text
Pricing | Documentation | Your projects | Usage
```

### MUST — Give every page exactly one h1 that names the page, and descend through heading levels without skipping.

*Why:* Assistive technology exposes headings as the document outline and offers level-by-level navigation over it. A skipped level reads as a missing section, and multiple h1 elements leave no unambiguous page title. Since the HTML outline algorithm was removed from the specification in 2022, levels are only what the markup states — nesting inside sectioning elements confers nothing.

*Source:* [WCAG 2.2 Success Criterion 1.3.1 (Info and Relationships)](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)

### MUST — Wrap page regions in landmark elements — one main, plus header, nav, aside and footer as applicable — and give each nav a distinct accessible name when more than one exists.

*Why:* Landmarks are the mechanism by which a screen reader user skips directly to content instead of traversing the navigation on every page. Unnamed duplicates collapse into an unusable list of identical entries, which removes the benefit entirely.

*Source:* [WCAG 2.2 Success Criterion 2.4.1 (Bypass Blocks)](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html)

Incorrect:

```html
<div class="sidebar">…</div>
<div class="content">…</div>
```

Correct:

```html
<nav aria-label="Sections">…</nav>
<main>…</main>
```

### MUST — Give every distinct view its own readable, hierarchical URL, including tab, filter, and pagination state.

*Why:* The URL is the only part of an information architecture that persists outside the application, in bookmarks, shared links, support replies and bug reports. State held only in memory cannot be linked or restored, and it silently breaks the back button because there is no history entry to return to.

Incorrect:

```text
/app#section=3&view=2
```

Correct:

```text
/projects/atlas/settings/members?role=admin&page=2
```

### MUST — Issue permanent redirects from old paths whenever a section is renamed, moved, or merged.

*Why:* Navigation knowledge accumulates outside the product — in bookmarks, documentation, chat history and search indexes — and none of it can be updated when you restructure. Without redirects, every one of those references becomes a 404 that the user reads as the feature having been removed.

### MUST — Every empty search or filter result must state which constraint eliminated the results and offer a specific way to relax it.

*Why:* A bare "No results" leaves the user unable to distinguish an absent item from a mis-typed query or an over-narrow filter, so the rational response is to abandon the task. Naming the failing constraint converts a dead end into a next action.

### MUST — Mark the current navigation item with aria-current and a non-colour visual difference such as weight or an indicator bar.

*Why:* "Where am I" is the first question every navigation must answer, and a colour-only marker fails for readers with a colour vision deficiency and conveys nothing to assistive technology. aria-current exposes the state programmatically while the weight or indicator carries it visually.

*Source:* [WCAG 2.2 Success Criterion 1.4.1 (Use of Color)](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)

Incorrect:

```html
<a href="/billing" class="text-blue-600">Billing</a>
```

Correct:

```html
<a href="/billing" aria-current="page" class="font-semibold border-l-2 border-accent">Billing</a>
```

### SHOULD NOT — Do not hide primary navigation behind a menu toggle on viewports wide enough to display it.

*Why:* Navigation communicates the shape of the product as well as providing routes; hiding it removes the ambient answer to "what else is here" that every visible nav supplies for free. On a narrow viewport that cost is unavoidable, which is the entire justification for the pattern — on a wide one it is a choice to trade discoverability for tidiness.

*Exceptions:*
- Immersive tools such as canvases, editors and media players where the content genuinely requires the full viewport.

### SHOULD NOT — Do not use tabs for sequential steps, or for content the user needs to compare side by side.

*Why:* A tab set asserts that its panels are mutually exclusive alternatives at the same level. Sequential content violates that assertion: it hides progress, permits entry mid-flow into a state that assumes earlier steps, and gives the back button no meaningful target. Comparison violates it because the user must hold one panel in memory while reading another.

Incorrect:

```text
Tabs: Account details → Payment → Confirm
```

Correct:

```text
Stepper: Account details → Payment → Confirm; Tabs: Overview | Activity | Settings
```

### SHOULD — Prefer wider, shallower hierarchies: keep primary structure to two or three levels rather than narrowing each level to fit a memory limit.

*Why:* Larson and Czerwinski compared 8×8×8, 16×32 and 32×16 hierarchies over 512 documents and found the eight-wide three-level structure reliably slowest and most disorienting. Each extra level is another prediction the user must make from a label, and a wrong prediction costs a full backtrack, whereas extra items on one screen are merely read.

*Source:* Larson & Czerwinski, "Web page design: implications of memory, structure and scent for information retrieval", CHI 1998

*Exceptions:*
- Domains with a hierarchy the user already holds, such as a file tree or a chart of accounts, where depth mirrors an external structure they can predict.

### SHOULD — Express grouping in navigation and forms through spacing first, falling back to a shared background or border only where spacing is unavailable.

*Why:* Proximity is the dominant grouping cue in visual perception and requires no ink, so it groups without adding visual weight. Between-group spacing must clearly exceed within-group spacing — roughly three times — or the perceptual signal is absent regardless of how correct the underlying taxonomy is.

### SHOULD — Use breadcrumbs to express position within the hierarchy on pages three or more levels deep, not to replay navigation history or to restate a two-level nav.

*Why:* A breadcrumb is learnable only if it is stable: the same page must always show the same trail, so it can be read as a location. A history-based trail differs between visits and therefore teaches nothing, and on a shallow site the trail duplicates information the navigation already displays.

### SHOULD — Provide at least two ways to reach any significant destination, such as browsing plus search, or navigation plus a contextual cross-link.

*Why:* Users differ in whether they recall a name or recognise a category, and a single route serves only one of those strategies. WCAG 2.2 makes this a Level AA requirement for sets of pages precisely because a single path is a single point of failure for anyone whose model of the structure differs from the author’s.

*Source:* [WCAG 2.2 Success Criterion 2.4.5 (Multiple Ways)](https://www.w3.org/WAI/WCAG22/Understanding/multiple-ways.html)

*Exceptions:*
- Steps within a linear process, where the process is the only legitimate route.

### SHOULD — Derive facet values from the current result set, show a count against each, and disable or omit values that would yield zero results.

*Why:* A facet describes the shape of the data as well as filtering it, so the count is the information. A facet value that leads to an empty set is a promise the interface cannot keep, and every such selection costs the user a full round trip to learn nothing.

*Exceptions:*
- Very large or streaming result sets where computing exact counts is prohibitive; approximate counts are preferable to none.

### SHOULD — Place the distinguishing words at the start of every heading, link, and nav label rather than after a shared preamble.

*Why:* Scanning readers fixate the opening words of each line and skip the remainder, and screen reader users listing links or headings hear them out of context. A set of items sharing their first three words is undifferentiated under both access patterns.

*Source:* [WCAG 2.2 Success Criterion 2.4.6 (Headings and Labels)](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html)

Incorrect:

```text
What you need to know about refund policies for annual plans
```

Correct:

```text
Refund policy: annual plans
```

### SHOULD — Give a dashboard one dominant metric that answers its governing question, and rank every other tile visibly below it.

*Why:* A uniform grid of equally sized tiles asserts that all metrics matter equally, which transfers the prioritisation work back to the user on every visit. Ranking is the value a dashboard adds over a table; without it the screen is a report that happens to have rounded corners.

*Exceptions:*
- Monitoring walls whose explicit purpose is parallel surveillance of independent systems, where ranking would be false.

### SHOULD — Accompany every displayed metric with a comparison, a target, or a trend, and state the basis of the comparison explicitly.

*Why:* A bare number cannot be evaluated: the reader has no way to tell whether it is good, and supplies a remembered baseline that is usually wrong. An unlabelled delta is worse, because it looks like context while leaving the period ambiguous.

Incorrect:

```text
Active users  1,284  ▲ 12%
```

Correct:

```text
Active users  1,284  ▲ 12% vs. previous 30 days  · target 1,500
```

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm the structure follows the user’s task model rather than an internal one. (blocking)

- Write the sentence a user would say about what they came to do. Which nouns in it appear as navigation items?
- Does any top-level section correspond to a team, a service, or a database table rather than to something the user recognises?
- Name the most common cross-entity task. How many top-level sections does it require the user to visit?

### Confirm the hierarchy is shallow, evenly balanced, and free of catch-all buckets.

- How many levels deep is the deepest routinely-used destination? Is anything beyond three levels?
- How many items sit at each level? Is any branch more than about four times the size of its siblings?
- Is there a category whose definition is "everything else"?
- Could an item plausibly belong to two categories? Which one did you choose, and is that choice applied consistently?

### Confirm labels carry information scent. (blocking)

- For each label, what would a first-time user predict they would find behind it? Is that prediction correct?
- Does any label require a tooltip, a subtitle, or an explanation to be understood?
- Which labels are internal project names, invented category words, or abstractions such as Solutions, Resources, or Hub?
- Do any two labels share their first two words?

### Confirm the page structure is encoded in markup, not only in styling. (blocking)

- Does the page have exactly one h1, and does it name this page rather than the product?
- Read the headings alone in order. Do they form a sensible outline, and is any level skipped?
- Was any heading level chosen for its size rather than its position in the outline?
- Is there exactly one main landmark, and does every nav landmark have a distinct accessible name?

### Confirm each navigation pattern is within its scaling limit.

- How many items are in each navigation region, and what happens at twice that count?
- Is any primary navigation hidden behind a toggle on a viewport with room to show it?
- Are tabs being used for sequential steps or for content the user must compare?
- Do breadcrumbs express position in the hierarchy, and does the site have enough depth to need them?

### Confirm the routes that work when browsing fails.

- Does every distinct view — including tab, filter, and page state — have its own URL?
- If a section were renamed today, would the old path redirect?
- What does the zero-result state say, and does it identify which constraint eliminated the results?
- Can every significant destination be reached by at least two routes?

### Confirm a dashboard ranks its content and contextualises its numbers.

- What single question does this dashboard answer, and which one metric answers it?
- Is that metric visually dominant, or is every tile the same size?
- Does every number carry a comparison, a target, or a trend, with the basis stated?
- Are the data range and the freshness visible near the top of the page?
- What does this screen look like for an account with no data yet?

### Evaluate the structure against the project Design Contract navigation section.

Evaluate the output against the project Design Contract (navigation section).

Run `vishwakarma audit` if the project has the CLI available.

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/navigation-patterns.md` — Which navigation pattern should I use for this product, how many items does each one hold before it degrades, and how do I combine them?
- `references/dashboard-hierarchy.md` — How do I structure a dashboard so it answers a question instead of displaying every metric at equal weight?
