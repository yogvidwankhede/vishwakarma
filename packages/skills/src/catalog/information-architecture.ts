import type { SkillManifest } from '../manifest.js'

/**
 * The structural layer nobody budgets for.
 *
 * Information architecture is invisible when it works and unfixable when it does not, because
 * by the time a product has a navigation problem it also has URLs, bookmarks, muscle memory,
 * support documentation and an analytics history built on the wrong structure.
 *
 * The recurring root cause is a category error: teams organise the interface around the shape
 * of their data or their org chart, both of which are real and neither of which the user can
 * see. This skill is about the substitution — modelling the user's task instead — and the
 * mechanics that follow from it: how wide to make a hierarchy, where each navigation pattern
 * stops scaling, how headings and landmarks encode structure for machines as well as eyes, and
 * why the URL is the most durable artefact any of this produces.
 */
export const informationArchitecture: SkillManifest = {
  vsm: '1.0',
  id: 'information-architecture',
  name: 'Information Architecture',
  description:
    'Use when structuring navigation, grouping content, naming sections, designing a dashboard, or when users cannot find things they know exist.',
  version: '1.0.0',
  license: 'MIT',
  category: 'ux',
  tags: ['information-architecture', 'navigation', 'findability', 'hierarchy', 'taxonomy', 'dashboards', 'search'],

  activation: {
    intents: [
      'designing or restructuring navigation, menus, sidebars, or tabs',
      'deciding how to group, categorise, or name sections of a product',
      'building a dashboard, overview page, or reporting screen',
      'the user says people cannot find a feature, or that the app feels cluttered or confusing',
      'planning URL structure, routes, or a settings hierarchy',
      'adding search, filters, or facets to a collection of items',
      'writing page structure — headings, landmarks, or document outline',
    ],
    globs: [
      '**/routes/**',
      '**/router*.{ts,tsx,js,jsx}',
      '**/app/**/layout.{tsx,jsx}',
      '**/*nav*.{tsx,jsx,vue,svelte}',
      '**/*sidebar*.{tsx,jsx,vue,svelte}',
      '**/*menu*.{tsx,jsx,vue,svelte}',
      '**/*dashboard*.{tsx,jsx,vue,svelte}',
    ],
    keywords: [
      'navigation',
      'menu',
      'sidebar',
      'information architecture',
      'sitemap',
      'taxonomy',
      'breadcrumbs',
      'dashboard',
      'findability',
    ],
  },

  content: {
    summary:
      'Structure a product around the user’s task model rather than the data model or the org chart: shallow labelled hierarchies, navigation patterns chosen for their scaling limit, headings and landmarks that encode the outline, and URLs that survive it.',

    body: `# Information Architecture

Findability is not a search problem. It is a structure problem that search papers over. When a
user cannot find something they know exists, the usual cause is that the product is organised
around a model they do not hold.

---

## 1. The data model is not the task model

Every organisation has an internal model: the database schema, the team boundaries, the
billing entities. Every user has a different one, built from the job they came to do. These
diverge predictably, and the interface must follow the second.

A payments product stores \`merchants\`, \`accounts\`, \`payment_intents\` and \`disputes\` in
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

Give every page exactly one \`<h1>\` naming *that page*, then descend without skipping levels.
Heading level is a structural claim, not a size control — style with a class. Screen reader
users navigate by heading, and a jump from \`<h2>\` to \`<h4>\` reads as a missing section.
The HTML outline algorithm was removed from the spec in 2022, and browsers are unshipping the
UA styles that shrank nested \`<h1>\`s, so an \`<h1>\` inside \`<section>\` implies nothing:
levels are explicit or they do not exist.

Wrap regions in landmarks — \`<header>\`, \`<nav>\`, \`<main>\` (exactly one), \`<aside>\`,
\`<footer>\` — and give multiple \`<nav>\`s distinct accessible names via \`aria-label\`, or
a landmark list reads "navigation, navigation, navigation".

Scannability follows from the same outline. Front-load headings: readers fixate the first two
words, so "Refund policy: annual plans" beats "What you need to know about refunds". Chunk
prose under headings rather than running it long, and mark the *current* nav item with
\`aria-current="page"\`, not colour alone.

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
readable — \`/projects/atlas/settings/members\`, not \`/app#tab=3\`. A view you cannot link
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
- **Headings chosen by size.** An \`<h4>\` picked because it looked right destroys the outline
  for everyone navigating by structure.`,

    references: [
      {
        id: 'navigation-patterns',
        title: 'Choosing a navigation pattern and knowing where it breaks',
        answers:
          'Which navigation pattern should I use for this product, how many items does each one hold before it degrades, and how do I combine them?',
        content: `# Choosing a navigation pattern and knowing where it breaks

Every navigation pattern is a trade between how much it shows and how much room it costs.
Choosing well means knowing each one's ceiling before you hit it, because the symptom of an
exceeded ceiling is not an error — it is users quietly failing to find things.

## Top navigation bar

**Holds:** 4-7 items comfortably, 8 at a stretch.
**Costs:** one horizontal band, always visible.
**Best for:** marketing sites, products with few genuinely top-level areas, and anything where
the content area needs full width.

The ceiling is typographic, not cognitive: item labels are words of varying length, and past
seven the bar either wraps, shrinks below comfortable tap targets, or forces one-word labels
that lose scent. The common repair — a mega-menu — changes the pattern rather than extending
it, and should be a deliberate choice.

**Fails when** a section needs children. A hover-triggered dropdown is unreachable on touch
without a tap-to-open compromise, and hover menus that close on a diagonal mouse path are a
recurring, entirely avoidable frustration. If more than one or two top items need children,
you want a sidebar.

## Sidebar navigation

**Holds:** 15-30 items across 2-4 labelled groups; more with a scroll and collapsible sections.
**Costs:** 200-280px of horizontal room permanently.
**Best for:** applications — anything where the user stays for a working session and returns to
the same few destinations repeatedly.

A sidebar is the only common pattern that shows breadth and depth simultaneously, which is why
it suits the shallow-wide hierarchies the research favours. Group headings within it are what
make 25 items legible; without them, 25 links is a wall.

**Fails when** the item count exceeds roughly 30, at which point the list scrolls independently
of the page and the user loses the overview that justified the sidebar's cost. It also fails on
narrow viewports, where it must become a drawer — acceptable on mobile, where there is no room
to do otherwise, and a mistake on desktop, where there is.

## Tabs

**Holds:** 2-6.
**Costs:** one band inside the content region.
**Best for:** alternative views of *one* object — a project's Overview, Activity, Settings.

Tabs assert that their contents are peers and mutually exclusive. Two conditions must hold: the
user should not need two tabs at once (if they do, use columns), and the tabs must not be
sequential (if they are, use a stepper — a wizard rendered as tabs hides progress, permits
out-of-order entry into a flow that assumes order, and breaks the back button).

Tab state belongs in the URL. A tab that is not addressable cannot be linked in a support reply.

**Fails when** labels wrap or the row scrolls horizontally. A scrolling tab row hides its own
options, which is the opposite of what tabs are for.

## Breadcrumbs

**Holds:** 3-5 levels.
**Costs:** one line above the page title.
**Best for:** hierarchies at least three levels deep, especially where users arrive from search
or a deep link and have no context.

Breadcrumbs answer "where am I in the structure", not "how did I get here". Rendering navigation
history is a distinct pattern with a distinct failure mode: it changes between visits, so it
cannot be learned.

**Fails when** the hierarchy is two levels deep — the trail then restates the nav — or when the
structure is a graph rather than a tree, so an item has several legitimate parents. In that case
pick a canonical path and use it consistently, because an inconsistent breadcrumb is worse than
none.

## Command palette

**Holds:** unbounded.
**Costs:** nothing visually; a discoverability problem instead.
**Best for:** products with more than about 30 destinations and returning users.

A palette collapses arbitrary depth to a keystroke and is the correct answer to "power users
need faster access" — a far better one than adding another nav tier. It must be additive: an
interface reachable *only* by palette is undiscoverable, and the entry point needs a visible
affordance alongside the shortcut.

## Search

**Holds:** unbounded.
**Costs:** an index, a ranking problem, and an empty state.
**Best for:** large content collections where users know what they want by name.

The trap is treating search as an IA substitute. Users search with the vocabulary they already
have; if your labels do not match it, neither will your index unless you invest in synonyms.
Search also cannot answer "what is available here", which is the question a novice actually has.

## Combining them

The reliable combination for an application is a sidebar for top-level areas, tabs for views of
the current object, breadcrumbs only where depth exceeds two, and a command palette above 30
destinations. The reliable combination for a content site is a top bar, an in-page table of
contents, and search.

Two rules govern the combination. Every destination must be reachable from at least two routes —
browse and search, or nav and cross-link — because a single route is a single point of failure.
And every screen must answer three questions without interaction: where am I, what else is here,
and how do I get back.`,
      },
      {
        id: 'dashboard-hierarchy',
        title: 'Dashboard information hierarchy',
        answers:
          'How do I structure a dashboard so it answers a question instead of displaying every metric at equal weight?',
        content: `# Dashboard information hierarchy

Most dashboards fail the same way: every metric is rendered in an identically sized card, so
the screen carries no ranking, and the user must perform the prioritisation the dashboard was
supposed to do for them. The result is a page that is looked at, admired, and never used to
decide anything.

## Start with the decision, not the data

A dashboard exists to answer a question that leads to an action. Write the question down before
choosing a chart.

- "Is anything wrong right now?" — an operational dashboard. Optimise for anomaly detection:
  current state, thresholds, and deviation from normal.
- "Are we on track this quarter?" — an analytical dashboard. Optimise for trend and comparison
  against target.
- "What happened and why?" — an exploratory tool, not a dashboard. It needs filters, drill-down
  and raw access, and forcing it into a fixed grid of tiles serves nobody.

Mixing these on one screen is the second most common failure. A page that must simultaneously
alert and explain does neither well.

## The inverted pyramid

Structure the page as a news article: the conclusion first, then the supporting evidence, then
the detail.

**Tier 1 — one number.** There is always a single metric that best answers the question. Give
it the top-left position (in left-to-right locales, where the reading path begins) and make it
visually dominant — two to three times the type size of anything else. If you cannot choose,
the dashboard has no purpose yet, and the choosing is the design work. A dashboard with six
equal hero numbers has zero.

**Tier 2 — three to five supporting metrics.** These explain or qualify Tier 1. They are
smaller, arranged in one row or a compact grid, and each carries the context that makes it
interpretable: a comparison, a trend, or a target.

**Tier 3 — breakdowns.** Charts and tables that decompose Tier 2 by dimension. Below the fold
is acceptable here; these are for the user who has already been alerted by Tier 1.

**Tier 4 — raw detail and export.** Reachable, not displayed.

## A number alone is not information

\`1,284\` is unusable. Every metric needs at least one of three kinds of context, and preferably
two:

**Comparison** — against the previous period, the same period last year, or a peer segment.
State the basis explicitly: "vs. previous 30 days", not a bare arrow.
**Target** — the value that constitutes success, ideally rendered as a reference line rather
than a separate figure.
**Trend** — direction and shape over time. A sparkline costs one line of height and converts a
snapshot into a story.

The sign convention must be semantic, not arithmetic. Churn rising is bad and refunds falling
is good; colouring every increase green is a defect that produces confident wrong readings.

## Sizing, ordering, and the grid

Tile size should encode importance, and a uniform grid therefore encodes that nothing is more
important than anything else. Break it: let the primary metric span two columns, and let a
critical trend chart span the full width.

Order by decision relevance, not by data availability or by which team owns the metric. The
most common ordering defect is that tiles appear in the order the queries were written.

Density should rise as you descend the page. The top is sparse and legible from across a room;
the bottom can be a dense table, because by then the user is leaning in.

## Alerting

If a metric can be *wrong* rather than merely low, it needs a threshold and a state — not a
number the user must evaluate against remembered norms. Reserve saturated colour for these
states exclusively. A dashboard where every tile is coloured has no alerting channel left,
which is why heavily-branded dashboards often cannot signal an emergency.

Pair every alert state with an icon or label. Red and green are the pairing most affected by
colour vision deficiency, and a status dashboard read incorrectly is worse than no dashboard.

## States and time

Design the empty state — a new account has no data, and "0" across every tile looks like an
outage. Say what will appear here and when.

Show the data's freshness and range near the top, not in a footer. "Last updated 4 minutes ago"
and "Last 30 days" are load-bearing: without them, every number is unfalsifiable. If a tile has
a different range from its neighbours, label it on the tile, because users assume a shared
range and will not check.

Reserve tile space during loading so numbers do not shift into place; a dashboard that reflows
as each query resolves makes the user re-find the metric they were already reading.

## What to remove

Cut any metric that no one can act on. Cut any chart whose only function is to look
sophisticated — the pie chart with eleven slices, the dual-axis line chart whose correlation is
an artefact of axis scaling, the 3-D bar chart. And cut any metric that always looks the same:
a number that has not changed materially in a year is documentation, not a dashboard tile.`,
      },
    ],
  },

  rules: [
    {
      id: 'information-architecture/task-model-over-data-model',
      strength: 'must',
      statement:
        'Derive top-level navigation from the tasks users perform, not from the database schema, the internal object model, or the organisational chart.',
      evidence: {
        rationale:
          'Users navigate by predicting which label contains their goal, and that prediction is made from their own mental model of the task. An internal model is invisible to them, so structures derived from it force every cross-entity task — which is most tasks — to cross navigation boundaries the user has no reason to expect.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Nav: Merchants | Accounts | Payment Intents | Disputes   (one section per service team)',
        good: 'Nav: Customers | Payments | Reports | Settings   (a customer page shows their charges and disputes together)',
      },
      verifiedBy: 'task-model-review',
    },
    {
      id: 'information-architecture/breadth-over-depth',
      strength: 'should',
      statement:
        'Prefer wider, shallower hierarchies: keep primary structure to two or three levels rather than narrowing each level to fit a memory limit.',
      evidence: {
        rationale:
          'Larson and Czerwinski compared 8×8×8, 16×32 and 32×16 hierarchies over 512 documents and found the eight-wide three-level structure reliably slowest and most disorienting. Each extra level is another prediction the user must make from a label, and a wrong prediction costs a full backtrack, whereas extra items on one screen are merely read.',
        source: 'Larson & Czerwinski, "Web page design: implications of memory, structure and scent for information retrieval", CHI 1998',
        confidence: 'strong',
      },
      exceptions: [
        'Domains with a hierarchy the user already holds, such as a file tree or a chart of accounts, where depth mirrors an external structure they can predict.',
      ],
      verifiedBy: 'structure-audit',
    },
    {
      id: 'information-architecture/user-vocabulary-labels',
      strength: 'must',
      statement:
        'Name sections with words drawn from users — search logs, support tickets, or tree testing — rather than internal project names or invented category words.',
      evidence: {
        rationale:
          'A label works by carrying information scent: enough signal for the user to predict what lies behind it. Internal or invented terms carry no scent because the user has no prior association with them, and the failure is silent — users choose a plausible wrong branch and conclude the feature does not exist.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'Solutions | Resources | Workspace | Insights',
        good: 'Pricing | Documentation | Your projects | Usage',
      },
      verifiedBy: 'label-audit',
    },
    {
      id: 'information-architecture/no-catch-all-category',
      strength: 'must-not',
      statement:
        'Do not create a "Miscellaneous", "Other", or "More" category to hold items that did not fit elsewhere.',
      evidence: {
        rationale:
          'A category defined by exclusion has no predictable membership, so it offers no scent and cannot be reasoned about. It also grows monotonically, because every subsequently ambiguous item lands there, which means the categories that do work steadily lose coverage.',
        confidence: 'strong',
      },
      exceptions: [
        'A visible overflow control on a genuinely space-constrained bar, where the hidden items are the least-used and are also reachable elsewhere.',
      ],
    },
    {
      id: 'information-architecture/single-h1',
      strength: 'must',
      statement:
        'Give every page exactly one h1 that names the page, and descend through heading levels without skipping.',
      evidence: {
        rationale:
          'Assistive technology exposes headings as the document outline and offers level-by-level navigation over it. A skipped level reads as a missing section, and multiple h1 elements leave no unambiguous page title. Since the HTML outline algorithm was removed from the specification in 2022, levels are only what the markup states — nesting inside sectioning elements confers nothing.',
        source: 'WCAG 2.2 Success Criterion 1.3.1 (Info and Relationships)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
        confidence: 'established',
      },
      verifiedBy: 'document-outline',
    },
    {
      id: 'information-architecture/heading-level-is-structure',
      strength: 'must-not',
      statement: 'Do not choose a heading level for its default font size; set the level from the outline and the size from a class.',
      evidence: {
        rationale:
          'Heading level is a structural assertion consumed by screen readers, in-page tables of contents, and machine parsers, none of which see the rendered size. Selecting h4 because it looked right silently corrupts the outline for every user who navigates by structure rather than by eye.',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<h2>Billing</h2>\n<h4>Payment method</h4>',
        good: '<h2>Billing</h2>\n<h3 class="text-sm font-medium">Payment method</h3>',
      },
      verifiedBy: 'document-outline',
    },
    {
      id: 'information-architecture/landmark-regions',
      strength: 'must',
      statement:
        'Wrap page regions in landmark elements — one main, plus header, nav, aside and footer as applicable — and give each nav a distinct accessible name when more than one exists.',
      evidence: {
        rationale:
          'Landmarks are the mechanism by which a screen reader user skips directly to content instead of traversing the navigation on every page. Unnamed duplicates collapse into an unusable list of identical entries, which removes the benefit entirely.',
        source: 'WCAG 2.2 Success Criterion 2.4.1 (Bypass Blocks)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<div class="sidebar">…</div>\n<div class="content">…</div>',
        good: '<nav aria-label="Sections">…</nav>\n<main>…</main>',
      },
      verifiedBy: 'document-outline',
    },
    {
      id: 'information-architecture/proximity-before-borders',
      strength: 'should',
      statement:
        'Express grouping in navigation and forms through spacing first, falling back to a shared background or border only where spacing is unavailable.',
      evidence: {
        rationale:
          'Proximity is the dominant grouping cue in visual perception and requires no ink, so it groups without adding visual weight. Between-group spacing must clearly exceed within-group spacing — roughly three times — or the perceptual signal is absent regardless of how correct the underlying taxonomy is.',
        confidence: 'established',
      },
    },
    {
      id: 'information-architecture/disclose-complexity-not-function',
      strength: 'must-not',
      statement:
        'Do not place a primary task, a required action, or the only route to a feature behind progressive disclosure, an icon without a label, or an unlabelled overflow control.',
      evidence: {
        rationale:
          'Progressive disclosure works because the user knows the hidden material exists and chooses not to look at it. A feature whose existence is itself hidden cannot be chosen against, so hiding it removes discovery rather than reducing noise. Icons are mnemonics for already-learned functions, not names for unknown ones.',
        confidence: 'strong',
      },
      exceptions: [
        'Destructive actions deliberately made harder to reach, where the cost of accidental invocation exceeds the cost of the extra step.',
      ],
    },
    {
      id: 'information-architecture/no-desktop-hamburger',
      strength: 'should-not',
      statement:
        'Do not hide primary navigation behind a menu toggle on viewports wide enough to display it.',
      evidence: {
        rationale:
          'Navigation communicates the shape of the product as well as providing routes; hiding it removes the ambient answer to "what else is here" that every visible nav supplies for free. On a narrow viewport that cost is unavoidable, which is the entire justification for the pattern — on a wide one it is a choice to trade discoverability for tidiness.',
        confidence: 'strong',
      },
      exceptions: [
        'Immersive tools such as canvases, editors and media players where the content genuinely requires the full viewport.',
      ],
    },
    {
      id: 'information-architecture/breadcrumbs-show-position',
      strength: 'should',
      statement:
        'Use breadcrumbs to express position within the hierarchy on pages three or more levels deep, not to replay navigation history or to restate a two-level nav.',
      evidence: {
        rationale:
          'A breadcrumb is learnable only if it is stable: the same page must always show the same trail, so it can be read as a location. A history-based trail differs between visits and therefore teaches nothing, and on a shallow site the trail duplicates information the navigation already displays.',
        confidence: 'strong',
      },
    },
    {
      id: 'information-architecture/tabs-are-peers',
      strength: 'should-not',
      statement:
        'Do not use tabs for sequential steps, or for content the user needs to compare side by side.',
      evidence: {
        rationale:
          'A tab set asserts that its panels are mutually exclusive alternatives at the same level. Sequential content violates that assertion: it hides progress, permits entry mid-flow into a state that assumes earlier steps, and gives the back button no meaningful target. Comparison violates it because the user must hold one panel in memory while reading another.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'Tabs: Account details → Payment → Confirm',
        good: 'Stepper: Account details → Payment → Confirm; Tabs: Overview | Activity | Settings',
      },
    },
    {
      id: 'information-architecture/addressable-views',
      strength: 'must',
      statement:
        'Give every distinct view its own readable, hierarchical URL, including tab, filter, and pagination state.',
      evidence: {
        rationale:
          'The URL is the only part of an information architecture that persists outside the application, in bookmarks, shared links, support replies and bug reports. State held only in memory cannot be linked or restored, and it silently breaks the back button because there is no history entry to return to.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: '/app#section=3&view=2',
        good: '/projects/atlas/settings/members?role=admin&page=2',
      },
      verifiedBy: 'findability-fallback',
    },
    {
      id: 'information-architecture/redirect-on-restructure',
      strength: 'must',
      statement:
        'Issue permanent redirects from old paths whenever a section is renamed, moved, or merged.',
      evidence: {
        rationale:
          'Navigation knowledge accumulates outside the product — in bookmarks, documentation, chat history and search indexes — and none of it can be updated when you restructure. Without redirects, every one of those references becomes a 404 that the user reads as the feature having been removed.',
        confidence: 'established',
      },
    },
    {
      id: 'information-architecture/multiple-routes',
      strength: 'should',
      statement:
        'Provide at least two ways to reach any significant destination, such as browsing plus search, or navigation plus a contextual cross-link.',
      evidence: {
        rationale:
          'Users differ in whether they recall a name or recognise a category, and a single route serves only one of those strategies. WCAG 2.2 makes this a Level AA requirement for sets of pages precisely because a single path is a single point of failure for anyone whose model of the structure differs from the author’s.',
        source: 'WCAG 2.2 Success Criterion 2.4.5 (Multiple Ways)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/multiple-ways.html',
        confidence: 'established',
      },
      exceptions: ['Steps within a linear process, where the process is the only legitimate route.'],
    },
    {
      id: 'information-architecture/zero-results-recovery',
      strength: 'must',
      statement:
        'Every empty search or filter result must state which constraint eliminated the results and offer a specific way to relax it.',
      evidence: {
        rationale:
          'A bare "No results" leaves the user unable to distinguish an absent item from a mis-typed query or an over-narrow filter, so the rational response is to abandon the task. Naming the failing constraint converts a dead end into a next action.',
        confidence: 'strong',
      },
      verifiedBy: 'findability-fallback',
    },
    {
      id: 'information-architecture/facets-carry-counts',
      strength: 'should',
      statement:
        'Derive facet values from the current result set, show a count against each, and disable or omit values that would yield zero results.',
      evidence: {
        rationale:
          'A facet describes the shape of the data as well as filtering it, so the count is the information. A facet value that leads to an empty set is a promise the interface cannot keep, and every such selection costs the user a full round trip to learn nothing.',
        confidence: 'strong',
      },
      exceptions: [
        'Very large or streaming result sets where computing exact counts is prohibitive; approximate counts are preferable to none.',
      ],
    },
    {
      id: 'information-architecture/front-loaded-headings',
      strength: 'should',
      statement:
        'Place the distinguishing words at the start of every heading, link, and nav label rather than after a shared preamble.',
      evidence: {
        rationale:
          'Scanning readers fixate the opening words of each line and skip the remainder, and screen reader users listing links or headings hear them out of context. A set of items sharing their first three words is undifferentiated under both access patterns.',
        source: 'WCAG 2.2 Success Criterion 2.4.6 (Headings and Labels)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'What you need to know about refund policies for annual plans',
        good: 'Refund policy: annual plans',
      },
    },
    {
      id: 'information-architecture/dashboard-single-focus',
      strength: 'should',
      statement:
        'Give a dashboard one dominant metric that answers its governing question, and rank every other tile visibly below it.',
      evidence: {
        rationale:
          'A uniform grid of equally sized tiles asserts that all metrics matter equally, which transfers the prioritisation work back to the user on every visit. Ranking is the value a dashboard adds over a table; without it the screen is a report that happens to have rounded corners.',
        confidence: 'strong',
      },
      exceptions: [
        'Monitoring walls whose explicit purpose is parallel surveillance of independent systems, where ranking would be false.',
      ],
      verifiedBy: 'dashboard-hierarchy-check',
    },
    {
      id: 'information-architecture/metrics-carry-context',
      strength: 'should',
      statement:
        'Accompany every displayed metric with a comparison, a target, or a trend, and state the basis of the comparison explicitly.',
      evidence: {
        rationale:
          'A bare number cannot be evaluated: the reader has no way to tell whether it is good, and supplies a remembered baseline that is usually wrong. An unlabelled delta is worse, because it looks like context while leaving the period ambiguous.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'Active users  1,284  ▲ 12%',
        good: 'Active users  1,284  ▲ 12% vs. previous 30 days  · target 1,500',
      },
      verifiedBy: 'dashboard-hierarchy-check',
    },
    {
      id: 'information-architecture/current-location-marked',
      strength: 'must',
      statement:
        'Mark the current navigation item with aria-current and a non-colour visual difference such as weight or an indicator bar.',
      evidence: {
        rationale:
          '"Where am I" is the first question every navigation must answer, and a colour-only marker fails for readers with a colour vision deficiency and conveys nothing to assistive technology. aria-current exposes the state programmatically while the weight or indicator carries it visually.',
        source: 'WCAG 2.2 Success Criterion 1.4.1 (Use of Color)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<a href="/billing" class="text-blue-600">Billing</a>',
        good: '<a href="/billing" aria-current="page" class="font-semibold border-l-2 border-accent">Billing</a>',
      },
    },
  ],

  verification: [
    {
      id: 'task-model-review',
      kind: 'self-review',
      description: 'Confirm the structure follows the user’s task model rather than an internal one.',
      blocking: true,
      questions: [
        'Write the sentence a user would say about what they came to do. Which nouns in it appear as navigation items?',
        'Does any top-level section correspond to a team, a service, or a database table rather than to something the user recognises?',
        'Name the most common cross-entity task. How many top-level sections does it require the user to visit?',
      ],
    },
    {
      id: 'structure-audit',
      kind: 'self-review',
      description: 'Confirm the hierarchy is shallow, evenly balanced, and free of catch-all buckets.',
      questions: [
        'How many levels deep is the deepest routinely-used destination? Is anything beyond three levels?',
        'How many items sit at each level? Is any branch more than about four times the size of its siblings?',
        'Is there a category whose definition is "everything else"?',
        'Could an item plausibly belong to two categories? Which one did you choose, and is that choice applied consistently?',
      ],
    },
    {
      id: 'label-audit',
      kind: 'self-review',
      description: 'Confirm labels carry information scent.',
      blocking: true,
      questions: [
        'For each label, what would a first-time user predict they would find behind it? Is that prediction correct?',
        'Does any label require a tooltip, a subtitle, or an explanation to be understood?',
        'Which labels are internal project names, invented category words, or abstractions such as Solutions, Resources, or Hub?',
        'Do any two labels share their first two words?',
      ],
    },
    {
      id: 'document-outline',
      kind: 'self-review',
      description: 'Confirm the page structure is encoded in markup, not only in styling.',
      blocking: true,
      questions: [
        'Does the page have exactly one h1, and does it name this page rather than the product?',
        'Read the headings alone in order. Do they form a sensible outline, and is any level skipped?',
        'Was any heading level chosen for its size rather than its position in the outline?',
        'Is there exactly one main landmark, and does every nav landmark have a distinct accessible name?',
      ],
    },
    {
      id: 'navigation-scaling',
      kind: 'self-review',
      description: 'Confirm each navigation pattern is within its scaling limit.',
      questions: [
        'How many items are in each navigation region, and what happens at twice that count?',
        'Is any primary navigation hidden behind a toggle on a viewport with room to show it?',
        'Are tabs being used for sequential steps or for content the user must compare?',
        'Do breadcrumbs express position in the hierarchy, and does the site have enough depth to need them?',
      ],
    },
    {
      id: 'findability-fallback',
      kind: 'self-review',
      description: 'Confirm the routes that work when browsing fails.',
      questions: [
        'Does every distinct view — including tab, filter, and page state — have its own URL?',
        'If a section were renamed today, would the old path redirect?',
        'What does the zero-result state say, and does it identify which constraint eliminated the results?',
        'Can every significant destination be reached by at least two routes?',
      ],
    },
    {
      id: 'dashboard-hierarchy-check',
      kind: 'self-review',
      description: 'Confirm a dashboard ranks its content and contextualises its numbers.',
      questions: [
        'What single question does this dashboard answer, and which one metric answers it?',
        'Is that metric visually dominant, or is every tile the same size?',
        'Does every number carry a comparison, a target, or a trend, with the basis stated?',
        'Are the data range and the freshness visible near the top of the page?',
        'What does this screen look like for an account with no data yet?',
      ],
    },
    {
      id: 'contract-audit',
      kind: 'contract',
      description: 'Evaluate the structure against the project Design Contract navigation section.',
      contractSection: 'navigation',
    },
  ],

  relatedSkills: ['design-judgment', 'interface-copy', 'accessible-components', 'layout-composition', 'interaction-design'],
}
