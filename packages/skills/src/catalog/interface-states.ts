import type { SkillManifest } from '../manifest.js'

/**
 * The screens nobody designs.
 *
 * A screen that fetches data is not one screen. It is a family of roughly eighteen, and
 * design work almost always covers exactly one of them — the ideal state, populated with
 * three tidy rows of sample data. The other seventeen get written by whichever engineer
 * hit them first, under time pressure, with no copy review. That is why so much software
 * greets a new user with "No items" and answers a failed request with "Something went
 * wrong".
 *
 * This skill enumerates the family, explains what each member is *for*, and gives the
 * thresholds and mechanisms that decide between them. The recurring theme is honesty:
 * almost every state bug is the interface claiming to know something it does not, or
 * refusing to say something it does.
 */
export const interfaceStates: SkillManifest = {
  vsm: '1.0',
  id: 'interface-states',
  name: 'Interface States',
  description:
    'Use when building or reviewing any screen that fetches or lists data, to design its empty, loading, error, offline, stale, and overflow states.',
  version: '1.0.0',
  license: 'MIT',
  category: 'ux',
  tags: ['states', 'empty-state', 'loading', 'skeleton', 'error-handling', 'offline', 'resilience'],

  activation: {
    intents: [
      'building a screen, list, table, or dashboard that loads data from an API',
      'adding loading indicators, skeletons, spinners, or progress bars',
      'writing or reviewing an empty state, error message, or offline banner',
      'handling failed requests, retries, or optimistic updates',
      'the user reports flashing loaders, layout shift while loading, or unhelpful errors',
      'reviewing a feature before shipping to check the non-happy paths',
    ],
    globs: [
      '**/*.tsx',
      '**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      '**/*Empty*.{ts,tsx,jsx}',
      '**/*Skeleton*.{ts,tsx,jsx}',
      '**/*Error*.{ts,tsx,jsx}',
      '**/loading.{ts,tsx,jsx}',
      '**/error.{ts,tsx,jsx}',
    ],
    keywords: [
      'empty state',
      'loading',
      'skeleton',
      'spinner',
      'error state',
      'offline',
      'stale',
      'retry',
      'optimistic',
      'placeholder',
    ],
  },

  content: {
    summary:
      'Enumerate and design every state a data-driven screen can occupy — three empties, three loadings, four error classes, offline, stale, and overflow — with duration thresholds that decide between spinner, skeleton, progress, and nothing.',

    body: `# Interface States

A screen that loads data is not one screen. It is a family of roughly eighteen, of which
design normally covers one: the ideal state, populated with three tidy rows. The rest get
written by whoever reached them first, in a hurry. That is why so much software greets its
newest user with "No items" and answers a failed request with "Something went wrong". Every
failure below is a species of dishonesty — the interface claiming to know something it does
not, or declining to say something it does.

---

## 1. The inventory

Every data-driven screen owes: **ideal**; **empty** in three variants; **loading** in three
variants; **partial**, where some regions resolved and others did not; **error** in four
classes; **offline**; **stale**; **overflow**; and where relevant **permission** and
**paywall**. Expanding those variants is the work: each needs different copy and usually a
different primary action.

---

## 2. Empty is three screens

Zero rows arises three ways; conflating them produces copy that is wrong in two cases out
of three.

**First use.** The user has never had data. This is the only screen guaranteed to be seen
by every user of the product, and the most frequently skipped. It must say what will appear
here, why that is worth having, and offer the one action that creates the first item.
"No projects" spends it on nothing; "Projects group your deployments and their history —
create one to get started", with a **New project** button, spends it on onboarding.

**Cleared.** The user had items and deleted or archived them all. Onboarding copy here is
patronising; they know what a project is. Offer undo, or a route to the archive.

**Filtered to nothing.** The data exists; the query excludes it. The primary action is
*clear the filter*, never *create an item* — offering **New project** to someone filtering
by "archived" answers a question nobody asked. Prove the data is there: "No projects match
'auth' in Archived. Clearing filters shows 24." That count is the load-bearing detail.

---

## 3. Loading is three screens

**Initial** has no content to protect, so a skeleton owns the layout.

**Refresh** has content, so never remove it. Keep the rows, set \`aria-busy="true"\`, add a
restrained cue — a slim top progress bar or a small opacity drop. Blanking a screen someone
is reading trades information they had for information they did not need.

**Pagination** puts the indicator at the insertion point, sized like one row. The list
above it did not become unknown.

TanStack Query encodes the split: \`isPending\` means no data yet, \`isFetching\` means a
request is in flight regardless. Key skeletons to \`isPending\`; keying them to
\`isFetching\` flashes the whole page on every background refetch.

---

## 4. Spinner, skeleton, progress, or nothing

Choose against the *p75* duration, not the best case. Under **100ms**: nothing — the
response lands inside perceptual instantaneity, so a loader that appears and vanishes reads
as a rendering bug. **100ms–1s**: nothing, or the pressed control held disabled with its
label unchanged; the user is still inside one flow of thought. **1s–5s**: a skeleton on
initial load, an in-region spinner otherwise. **5s–10s**: determinate progress if you can
compute it, else a spinner with a step label — "Indexing 1,200 files" holds attention where
a bare spinner does not. Beyond **10s** attention is gone: real progress, a cancel
affordance, and a way to leave and be notified.

Delay any loader by about **300ms** so fast responses never flash, and once shown hold it
**500ms** so it never vanishes within a frame or two — one delayed keyframe starting at
\`opacity: 0\` does both.

---

## 5. A skeleton is a promise about geometry

If the grey blocks are 16px tall and the rows are 22px, or the skeleton shows three cards
and twelve arrive, the skeleton *causes* the shift it was introduced to prevent — and
charges a layout-shift penalty an honest spinner would not have. Build it from the real
component behind a \`loading\` prop so the two cannot drift. Where the geometry is genuinely
unknowable — arbitrary counts, variable-length content — a spinner is the truthful choice.
Skeleton for known shape; spinner for unknown.

Mark skeleton nodes \`aria-hidden\` and announce once through \`role="status"\`. Forty
announced grey rectangles is worse than silence.

---

## 6. What an error must contain

Three things, in order: **what happened**, in the user's vocabulary; **why**, if you know;
and **what to do next**, as something clickable. "Something went wrong" supplies none of
them. It does not name the operation, does not distinguish a two-second blip from a
permanent misconfiguration, and leaves no move. It is not an error message; it is an
apology for not having written one.

Four classes behave differently. **Transport** failures — timeouts, rejected fetches — are
nobody's fault and probably temporary: render inline, keep the user's input, offer retry,
never use a modal. **Permission** splits at the status code: 401 means re-authenticate, so
route to sign-in and return them here; 403 means the account lacks access, so name the
permission and who grants it. **Validation** belongs at the offending field, preserves every
typed value, and states the accepted format rather than merely reporting rejection.
**Server** faults need an apology, a retry, and a request id — the difference between a
diagnosable support ticket and a hopeless one.

---

## 7. Retry, honestly

Exponential backoff with full jitter — attempt *n* waits a random interval in
\`[0, base × 2ⁿ]\`, capped — is right for idempotent reads. Make it visible: "Reconnecting,
next attempt in 4s", with a **Retry now** button. A silent retry loop is indistinguishable
from a hung interface, so the user reloads and cancels the work you were about to finish.
Honour \`Retry-After\`; guessing shorter is how a 429 becomes an outage. Never auto-retry a
write without an idempotency key.

---

## 8. Stale, offline, optimistic

Stale-while-revalidate means render what you have, refetch behind it, swap. Signal
staleness in proportion to consequence: a relative timestamp ("updated 4 min ago") where
data ages gracefully, a standing banner only where acting on stale values is dangerous —
balances, seat availability, live prices. Alarming banners on data nobody will act on train
users to ignore banners.

\`navigator.onLine\` proves only that a network interface exists, so treat it as a hint and
confirm with a real request. Announce offline once, globally; queue writes, mark them
pending, replay on \`online\`.

Optimistic updates are honest when failure is near-impossible, the action reversible, and
rollback visible — starring, renaming, reordering. They are dishonest when the server may
legitimately refuse: payments, bookings against limited inventory, claiming a username.
Showing success and revoking it 800ms later is worse than a 300ms spinner: the user has
already moved on and must now reconstruct what changed.

---

## 9. Zero, one, many, lots

Test every collection at four cardinalities: **zero** (all three empties), **one**
(pluralisation, and a grid whose single item stretches absurdly wide), **many** (the
designed case), **lots** (500 — virtualisation, and a count rendered "999+"). Then the
longest plausible string in each slot, handled by \`overflow-wrap: anywhere\` or truncation,
and every image absent with the box held open by \`aspect-ratio\`.

---

## 10. Reaching states without a backend

Make each state addressable — a story, a URL parameter, a prop — so it opens in one action.
Intercept at the network layer rather than mocking your fetch client, so real parsing and
error branches execute. Script the scenarios: 5s delay, 500, 403, empty array, 500-item
array, a request that never resolves. A state that takes three steps to reach is one nobody
looks at, and it rots.`,

    references: [
      {
        id: 'state-inventory',
        title: 'State inventory checklists by screen type',
        answers:
          'Which specific states does this particular kind of screen — list, detail, form, dashboard, search, feed, wizard, upload — actually need?',
        content: `# State inventory checklists by screen type

Work down the checklist for the screen type you are building. Tick each line by naming the
component that renders it, not by asserting that it "would fall through to something".

## Collection: list, table, or grid

- [ ] Ideal, at the designed row count.
- [ ] Empty — first use: explains the collection, one primary action to create item one.
- [ ] Empty — cleared: acknowledges the user emptied it; offers undo or the archive.
- [ ] Empty — filtered: names the active filters, shows the unfiltered count, primary
      action clears filters.
- [ ] Empty — search: distinguishes "no results for X" from "no data at all"; suggests
      spelling correction or a broader query.
- [ ] Loading — initial: skeleton with the real row height and a plausible row count.
- [ ] Loading — refresh: rows retained, \`aria-busy\`, restrained progress cue.
- [ ] Loading — page append: single-row indicator at the bottom.
- [ ] Loading — sort or filter change: rows dimmed in place, never blanked.
- [ ] Partial: rows rendered, an aggregate or secondary column still resolving.
- [ ] Error — whole collection failed: inline panel with retry.
- [ ] Error — one row failed to update: error confined to that row.
- [ ] Overflow: one item, 500 items, longest string per column, missing thumbnails.
- [ ] Selection states: nothing selected, one selected, all selected, all-across-pages.

## Detail or record view

- [ ] Loading: skeleton shaped to the header, then the body.
- [ ] Not found (404): distinct from error — say the record does not exist or was deleted,
      and link back to the collection.
- [ ] No permission (403): name the permission and who grants it.
- [ ] Deleted while viewing: banner stating the record was removed; disable mutations.
- [ ] Stale: last-updated timestamp; conflict warning if a save would overwrite.
- [ ] Optional fields absent: no empty labelled rows, no "undefined", no bare dash where a
      sentence is expected.
- [ ] Long values: unbroken URLs, 200-character titles, 40 tags.

## Form

- [ ] Pristine, dirty, submitting, succeeded, failed.
- [ ] Field-level validation errors, each adjacent to its field, input preserved.
- [ ] Form-level error for cross-field or server rejection.
- [ ] Conflict (409): another user changed the record; offer to review the difference.
- [ ] Rate limited (429): show the wait, disable submit until it elapses.
- [ ] Session expired mid-form: re-authenticate without losing entered values.
- [ ] Offline: queue or block, and say which.
- [ ] Slow submit: button disabled with unchanged label, plus a progress cue after 1s.

## Dashboard or multi-widget screen

- [ ] Per-widget loading — the page must not wait for its slowest query.
- [ ] Per-widget error — one failed metric must not blank the dashboard.
- [ ] Per-widget empty — "no data in this range" differs from "not configured".
- [ ] Mixed freshness: widgets from different fetch times need individual timestamps.
- [ ] Zero range: a date filter that excludes all data.
- [ ] Aggregate of one, and of zero — no divide-by-zero rendering as \`NaN\`.

## Search

- [ ] Idle, before any query: show recent or suggested searches, not an empty void.
- [ ] Typing, below the minimum query length.
- [ ] Debounced in-flight, with previous results retained.
- [ ] Zero results, with the query echoed back verbatim.
- [ ] Too many results, with a count and a refinement path.
- [ ] Query too short, malformed, or containing only stop words.

## Feed or infinite scroll

- [ ] Initial skeleton, append indicator, end-of-feed marker.
- [ ] New-items-available affordance rather than a jarring auto-prepend.
- [ ] Append failure: retry at the boundary without losing loaded items.
- [ ] Scroll position restored on back-navigation.

## Wizard or multi-step flow

- [ ] Per-step loading and validation.
- [ ] Resume from an abandoned session.
- [ ] Backward navigation preserving forward-step data.
- [ ] Terminal failure after an irreversible step — say precisely what completed.

## Upload or long job

- [ ] Idle, drag-over, invalid file type, file too large.
- [ ] Determinate progress per file plus an aggregate.
- [ ] Cancel mid-upload, and partial-batch failure.
- [ ] Post-upload processing, which is a second and usually longer wait.
- [ ] Completion with warnings, not only success or failure.

## Auth and entitlement

- [ ] Signed out where content is public but personalised.
- [ ] Signed in, entitlement absent — paywall stating what unlocks and the price.
- [ ] Trial expired, distinct from never-subscribed.
- [ ] Seat limit reached: the action is blocked by the account owner's plan, not by them.
- [ ] Quota exhausted, with the reset time.
`,
      },
      {
        id: 'state-copy',
        title: 'Before and after: empty and error copy',
        answers:
          'What exactly should each empty state and each error message say, and why is the common wording failing?',
        content: `# Before and after: empty and error copy

Each entry gives the usual wording, the replacement, and the mechanism that makes the
replacement better. Rewrite to the pattern, not to the literal strings.

## Empty states

**First use, collection**
Before: "No projects."
After: "Projects group your deployments and their history. Create one to see builds, logs,
and rollbacks in a single place." — **New project**
Why: this screen is seen by 100% of new users and is their first explanation of the object
model. A noun with a count of zero explains nothing and offers no move.

**Cleared by the user**
Before: "No projects."
After: "You've archived everything. Nothing to see for now." — **View archive** ·
**Undo archive**
Why: the user knows what a project is; repeating onboarding implies the product was not
paying attention. Recent destructive actions deserve a visible reversal.

**Filtered to nothing**
Before: "No results." — **New project**
After: "No projects match 'auth' with status Archived. Clearing filters shows 24." —
**Clear filters**
Why: offering creation implies the data does not exist, which is false and frightening.
The unfiltered count proves the data is intact and makes the recovery obvious.

**Search, no results**
Before: "No results found."
After: "Nothing matches 'invoicce'. Try 'invoice', or search all workspaces." —
**Search all workspaces**
Why: echoing the query lets the user spot their own typo instantly, which is the most
common cause and the cheapest fix.

**Date-range empty on a chart**
Before: "No data."
After: "No events between 1-7 July. This workspace's first event was 12 July." —
**Show all time**
Why: "no data" is ambiguous between "not instrumented", "nothing happened", and "wrong
range". Naming the earliest datum resolves all three.

**Not yet configured**
Before: "No data."
After: "Connect a repository to see build history here." — **Connect repository**
Why: an unconfigured integration is a setup task, not an absence of activity, and needs a
setup action rather than a refresh.

## Error states

**Generic catch-all**
Before: "Something went wrong. Please try again."
After: "Couldn't load your deployments — the server didn't respond in 10 seconds." —
**Retry** · Reference \`req_8f3a21\`
Why: naming the operation tells the user what they lost; naming the failure mode tells them
whether waiting helps; the reference id makes support tractable.

**Network offline**
Before: "Network error."
After: "You're offline. Your changes are saved on this device and will sync when you
reconnect."
Why: the user's mental model is "did I lose my work". Answer that first; the transport
detail is secondary.

**Timeout under load**
Before: "Request failed."
After: "This is taking longer than usual. Still trying — next attempt in 8s." —
**Retry now** · **Cancel**
Why: a visible schedule distinguishes a working system from a hung one, which is what stops
the user reloading the page mid-recovery.

**401, session expired**
Before: "Unauthorized."
After: "Your session expired. Sign in again and we'll bring you straight back here." —
**Sign in**
Why: "Unauthorized" reads as an accusation of wrongdoing. The user did nothing; a clock
did. Promising return preserves their place.

**403, genuinely no access**
Before: "Access denied." — **Retry**
After: "You don't have Deploy access to *checkout-api*. Ask an owner — Priya Raman or
Tom Vitali — to grant it." — **Request access**
Why: authorization is deterministic, so a retry button is a lie: pressing it a hundred
times changes nothing. The recovery path is social, so name the humans.

**Validation, format**
Before: "Invalid input."
After: "Enter a date as DD/MM/YYYY — for example 04/03/2026."
Why: rejection without the accepted grammar forces guessing. An example is understood
faster than a rule.

**Validation, uniqueness**
Before: "Name taken."
After: "'checkout' is already used in this workspace. Try 'checkout-v2' or
'checkout-staging'." — **Use 'checkout-v2'**
Why: the constraint scope matters — the user needs to know it is per-workspace, not global
— and generated alternatives remove the work entirely.

**409, concurrent edit**
Before: "Conflict."
After: "Priya edited this 2 minutes ago. Review the differences before saving." —
**Compare** · **Overwrite**
Why: silently overwriting destroys a colleague's work; silently discarding destroys the
user's. Only a comparison lets the person with context decide.

**429, rate limited**
Before: "Too many requests."
After: "You've hit the API limit for this hour. It resets at 14:30." — **View usage**
Why: the sole question is when it clears. An absolute time answers it without arithmetic.

**5xx, server fault**
Before: "Internal server error."
After: "Something failed on our side while saving. Your draft is safe. We've logged it as
\`err_44c1\`." — **Try again**
Why: it names the responsible party, reassures about data, and hands over the identifier a
support engineer will ask for anyway.

**Partial failure in a batch**
Before: "Import failed."
After: "Imported 118 of 120 rows. Rows 14 and 87 have invalid email addresses." —
**Download failed rows**
Why: an all-or-nothing message discards the true outcome and implies redoing work already
completed successfully.

## Wording rules that generalise

Say what the *system* could not do, never what the *user* failed to do. Prefer the concrete
noun ("your deployments") to the abstract ("data", "content", "resource"). Give one primary
recovery action and at most one secondary. Never show a retry for a deterministic failure.
Include an identifier whenever a human might have to escalate. And never use a modal for a
recoverable transport error — modals imply that the user must decide something, and here
there is nothing to decide.
`,
      },
    ],
  },

  rules: [
    {
      id: 'interface-states/three-empty-states',
      strength: 'must',
      statement:
        'Distinguish first-use, user-cleared, and filtered-to-nothing empty states with different copy and different primary actions.',
      evidence: {
        rationale:
          'The three arise from opposite causes — data has never existed, data was deliberately removed, or data exists but is excluded by a query — so a single message is necessarily wrong about the cause in two of the three cases and points at the wrong recovery.',
        confidence: 'strong',
      },
      verifiedBy: 'empty-state-variants',
    },
    {
      id: 'interface-states/first-use-teaches',
      strength: 'must',
      statement:
        'The first-use empty state must name what will appear in the collection and offer a single action that creates the first item.',
      evidence: {
        rationale:
          'It is the only screen in the product guaranteed to be seen by every new user, and it arrives before they have a mental model of the object. A bare count of zero spends that guaranteed impression on no information at all.',
        confidence: 'strong',
      },
      examples: {
        language: 'tsx',
        bad: '<EmptyState title="No projects" />',
        good: '<EmptyState title="No projects yet" body="Projects group your deployments and their history." action={<Button>New project</Button>} />',
      },
    },
    {
      id: 'interface-states/filtered-empty-clears-filter',
      strength: 'must',
      statement:
        'When a collection is empty because of an active filter or query, echo the query, state the unfiltered count, and make clearing the filter the primary action.',
      evidence: {
        rationale:
          'Offering a create action implies the data does not exist, which is false and reads as data loss. The unfiltered count is direct evidence that the records are intact and identifies the filter as the cause.',
        confidence: 'strong',
      },
    },
    {
      id: 'interface-states/preserve-content-on-refresh',
      strength: 'must-not',
      statement:
        'Do not replace already-rendered content with a skeleton or spinner when refetching data the user is already viewing.',
      evidence: {
        rationale:
          'The rendered rows are still the best information available; removing them exchanges real content for a placeholder and destroys reading position and scroll context to communicate something a subtle busy cue conveys without cost.',
        confidence: 'strong',
      },
      examples: {
        language: 'tsx',
        bad: 'if (isFetching) return <ListSkeleton />',
        good: 'if (isPending) return <ListSkeleton />\nreturn <List rows={data} aria-busy={isFetching} />',
      },
      verifiedBy: 'loading-honesty',
    },
    {
      id: 'interface-states/skeleton-matches-layout',
      strength: 'must',
      statement:
        'A skeleton must reproduce the final content’s row height, count, and spacing; where the geometry is not knowable in advance, use a spinner instead.',
      evidence: {
        rationale:
          'A skeleton is a claim about the geometry of the content that will replace it. When the claim is wrong the swap moves the layout, so the skeleton produces exactly the shift it was added to prevent, and incurs a cumulative-layout-shift penalty an honest spinner would not.',
        confidence: 'established',
      },
      verifiedBy: 'loading-honesty',
    },
    {
      id: 'interface-states/loader-thresholds',
      strength: 'should',
      statement:
        'Show no loading indicator for operations expected to finish under 100ms, a skeleton or spinner between 1s and 5s, and determinate progress with a cancel affordance beyond 10s.',
      evidence: {
        rationale:
          'Responses under about 100ms are perceived as instantaneous, so an indicator only adds a flash; up to about a second the user stays within one flow of thought; beyond about ten seconds attention detaches from the task and only concrete progress will hold it.',
        source: 'Classic human–computer interaction response-time limits (Miller 1968; Card, Robertson and Mackinlay 1991)',
        confidence: 'established',
      },
    },
    {
      id: 'interface-states/loader-delay-and-hold',
      strength: 'should',
      statement:
        'Delay showing a loading indicator by roughly 300ms and, once shown, keep it visible for at least roughly 500ms.',
      evidence: {
        rationale:
          'Without a delay, fast responses render a loader for one or two frames, which is perceived as a flicker or rendering fault rather than as feedback; without a minimum hold, a loader that appears just before resolution produces the same flicker at the other end.',
        confidence: 'strong',
      },
      exceptions: ['Actions where the control itself already shows a pressed or disabled state.'],
    },
    {
      id: 'interface-states/errors-state-next-step',
      strength: 'must',
      statement:
        'Every error state must name the operation that failed and offer a concrete next step; add a request or error identifier whenever support escalation is plausible.',
      evidence: {
        rationale:
          'A user facing a failure needs to know what they lost, whether waiting will help, and what to do — none of which is derivable from an apology. The identifier is what makes the failure findable in logs, without which a support conversation cannot begin.',
        confidence: 'strong',
      },
      examples: {
        language: 'tsx',
        bad: '<Alert>Something went wrong. Please try again.</Alert>',
        good: '<Alert title="Couldn’t load your deployments" body="The server didn’t respond within 10 seconds." action={<Button onClick={retry}>Retry</Button>} meta="req_8f3a21" />',
      },
      verifiedBy: 'error-content',
    },
    {
      id: 'interface-states/no-retry-on-deterministic-failure',
      strength: 'must-not',
      statement:
        'Do not offer a retry affordance for deterministic failures such as 403 Forbidden, 404 Not Found, or validation rejection.',
      evidence: {
        rationale:
          'Authorization and validation outcomes are functions of unchanged inputs, so repeating the request cannot produce a different result. A control that provably does nothing teaches the user that the interface’s affordances are unreliable.',
        source: 'RFC 9110 §15.5.4 (403 Forbidden)',
        url: 'https://www.rfc-editor.org/rfc/rfc9110.html',
        confidence: 'established',
      },
      exceptions: [
        '401 Unauthorized, where re-authentication genuinely changes the input — but the action should be "Sign in", not "Retry".',
      ],
    },
    {
      id: 'interface-states/validation-preserves-input',
      strength: 'must',
      statement:
        'A failed submission must retain every value the user entered and place each message beside the field it concerns.',
      evidence: {
        rationale:
          'Re-entry cost is borne entirely by the user and grows with form length, and a message at the top of a long form leaves them hunting for which field it refers to — the two together are the dominant cause of form abandonment after an error.',
        confidence: 'established',
      },
    },
    {
      id: 'interface-states/visible-backoff',
      strength: 'should',
      statement:
        'Surface automatic retries to the user with the attempt schedule and a manual retry control, rather than retrying silently.',
      evidence: {
        rationale:
          'A silent retry loop is visually identical to a hung interface, so the rational response is to reload the page — which aborts the in-flight recovery and restarts the backoff from zero.',
        confidence: 'strong',
      },
    },
    {
      id: 'interface-states/honour-retry-after',
      strength: 'must',
      statement:
        'Honour a server-sent Retry-After header, and use exponential backoff with full jitter for automatic retries of idempotent requests.',
      evidence: {
        rationale:
          'Retry-After carries the server’s own estimate of when capacity returns; retrying sooner adds load to an already-degraded service. Without jitter, clients that failed together retry together, reproducing the synchronised burst that caused the failure.',
        source: 'RFC 9110 §10.2.3 (Retry-After)',
        url: 'https://www.rfc-editor.org/rfc/rfc9110.html',
        confidence: 'established',
      },
    },
    {
      id: 'interface-states/no-optimistic-when-refusable',
      strength: 'must-not',
      statement:
        'Do not apply optimistic updates to operations the server may legitimately refuse, such as payments, inventory-limited bookings, or uniqueness claims.',
      evidence: {
        rationale:
          'An optimistic update asserts an outcome the client cannot know. Where refusal is a normal outcome rather than an exception, the interface will regularly show success and then revoke it after the user has moved on, forcing them to reconstruct what changed.',
        confidence: 'strong',
      },
      exceptions: [
        'Reversible, near-certain, single-field mutations such as toggling a favourite or renaming, where rollback is immediately visible in place.',
      ],
    },
    {
      id: 'interface-states/stale-signal-proportional',
      strength: 'should',
      statement:
        'Signal staleness in proportion to its consequence: a relative timestamp for data that ages gracefully, a persistent banner only where acting on stale values causes harm.',
      evidence: {
        rationale:
          'Warnings are a finite resource. A banner on data nobody will act upon trains users to dismiss banners without reading, which removes the signal precisely where it would have mattered.',
        confidence: 'strong',
      },
    },
    {
      id: 'interface-states/online-is-a-hint',
      strength: 'should-not',
      statement:
        'Do not treat navigator.onLine as proof of connectivity; confirm with an actual request before declaring the user online.',
      evidence: {
        rationale:
          'The property reports only whether the device has an active network interface. A machine attached to a captive portal, a VPN with no route, or a LAN with a dead uplink reports true while every request fails.',
        source: 'MDN: Navigator.onLine',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine',
        confidence: 'established',
      },
    },
    {
      id: 'interface-states/zero-one-many-lots',
      strength: 'must',
      statement:
        'Verify every collection UI at zero, one, many, and several hundred items before considering it complete.',
      evidence: {
        rationale:
          'Each cardinality breaks something different: zero exposes missing empty states, one exposes pluralisation and stretched grid cells, and large counts expose absent virtualisation and unbounded count labels. Sample data of three or four items exercises none of them.',
        confidence: 'established',
      },
      verifiedBy: 'collection-stress',
    },
    {
      id: 'interface-states/reserve-media-space',
      strength: 'should',
      statement:
        'Reserve space for images and media with an explicit aspect-ratio or dimensions, and render a deterministic fallback when loading fails.',
      evidence: {
        rationale:
          'An image without reserved dimensions contributes zero height until it decodes, then pushes everything below it down. The fallback must be deterministic so a broken image does not change layout relative to a working one.',
        confidence: 'established',
      },
    },
    {
      id: 'interface-states/announce-status-changes',
      strength: 'must',
      statement:
        'Announce loading, success, and error transitions to assistive technology through role="status" or role="alert" without moving focus.',
      evidence: {
        rationale:
          'A visually-conveyed status change produces no output for a screen reader user, who is left with an unchanged perception of the interface; moving focus instead would interrupt whatever they were reading and lose their position.',
        source: 'WCAG 2.2 Success Criterion 4.1.3 (Status Messages)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html',
        confidence: 'established',
      },
    },
    {
      id: 'interface-states/states-reachable-in-one-action',
      strength: 'should',
      statement:
        'Make every non-ideal state reachable in a single action — a story, a URL parameter, or a mocked network scenario — without touching a real backend.',
      evidence: {
        rationale:
          'A state that requires provisioning data or breaking a server to observe will not be reviewed, and unreviewed states drift out of sync with the component they belong to until they crash on first contact with production.',
        confidence: 'strong',
      },
      verifiedBy: 'state-reachability',
    },
  ],

  verification: [
    {
      id: 'state-inventory-complete',
      kind: 'self-review',
      description: 'Confirm every state this screen can occupy has a designed rendering.',
      blocking: true,
      questions: [
        'List every state this screen can occupy: ideal, each empty variant, each loading variant, partial, each error class, offline, stale, and overflow. Which of them renders something you deliberately wrote?',
        'For each state you did not write, what does the screen actually show today — and is that acceptable, or merely unnoticed?',
        'Does any state fall through to a blank region, an uncaught exception, or a raw status code?',
      ],
    },
    {
      id: 'empty-state-variants',
      kind: 'self-review',
      description: 'Confirm the three empty states are distinguished.',
      blocking: true,
      questions: [
        'Does this screen render different copy for a first-time user, a user who cleared the collection, and a filter that matched nothing?',
        'Does the first-use state explain what the collection contains and offer exactly one creation action?',
        'Does the filtered-empty state offer clearing the filter rather than creating an item, and does it show the unfiltered count?',
      ],
    },
    {
      id: 'loading-honesty',
      kind: 'self-review',
      description: 'Confirm loading indicators match duration and geometry.',
      blocking: true,
      questions: [
        'Is the skeleton branch keyed to "no data yet" rather than "a request is in flight"? Does a background refetch blank the screen?',
        'Do the skeleton’s row height, row count, and spacing match the loaded content, and does the swap shift anything?',
        'For an operation that resolves in 80ms, does any indicator appear at all? For one that takes 20 seconds, is there real progress and a way to cancel?',
      ],
    },
    {
      id: 'error-content',
      kind: 'self-review',
      description: 'Confirm each error says what happened and what to do.',
      blocking: true,
      questions: [
        'Does every error message name the operation that failed, rather than referring to "data" or "something"?',
        'Does each one offer a next step, and is that step actually capable of changing the outcome — no retry on a 403 or a validation failure?',
        'Are transport, permission, validation, and server faults distinguished, and does a failed form retain everything the user typed?',
        'Is there an identifier a user could quote to support for the failures that would need escalating?',
      ],
    },
    {
      id: 'collection-stress',
      kind: 'self-review',
      description: 'Confirm the collection survives every cardinality and content shape.',
      questions: [
        'Does the layout hold at zero, one, twelve, and five hundred items?',
        'Is pluralisation correct at one, and does a single item in a grid stretch to an absurd width?',
        'What renders for the longest plausible string in each text slot, and for an unbroken 300-character URL?',
        'What renders when every image is missing, and does the row height change?',
      ],
    },
    {
      id: 'state-reachability',
      kind: 'self-review',
      description: 'Confirm each state can be opened and reviewed without a backend.',
      questions: [
        'Can you open each empty, loading, and error state in one action, without seeding a database or disabling a server?',
        'Are the mocks intercepting at the network layer, so real parsing and error-handling code runs?',
        'Is there a scenario for a request that never resolves, and does the interface remain usable under it?',
      ],
    },
    {
      id: 'offline-and-staleness',
      kind: 'self-review',
      description: 'Confirm connectivity and freshness are communicated honestly.',
      questions: [
        'With the network disabled mid-session, does the interface say what happened to unsaved work?',
        'Is offline detection confirmed by a real request rather than trusting navigator.onLine alone?',
        'Where cached data is displayed, can the user tell how old it is, and is the prominence of that signal proportional to the harm of acting on it?',
      ],
    },
  ],

  relatedSkills: ['design-judgment', 'interface-copy', 'interaction-design', 'accessible-components', 'micro-interactions'],
}
