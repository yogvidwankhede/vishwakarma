# Interface States

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

**Refresh** has content, so never remove it. Keep the rows, set `aria-busy="true"`, add a
restrained cue — a slim top progress bar or a small opacity drop. Blanking a screen someone
is reading trades information they had for information they did not need.

**Pagination** puts the indicator at the insertion point, sized like one row. The list
above it did not become unknown.

TanStack Query encodes the split: `isPending` means no data yet, `isFetching` means a
request is in flight regardless. Key skeletons to `isPending`; keying them to
`isFetching` flashes the whole page on every background refetch.

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
`opacity: 0` does both.

---

## 5. A skeleton is a promise about geometry

If the grey blocks are 16px tall and the rows are 22px, or the skeleton shows three cards
and twelve arrive, the skeleton *causes* the shift it was introduced to prevent — and
charges a layout-shift penalty an honest spinner would not have. Build it from the real
component behind a `loading` prop so the two cannot drift. Where the geometry is genuinely
unknowable — arbitrary counts, variable-length content — a spinner is the truthful choice.
Skeleton for known shape; spinner for unknown.

Mark skeleton nodes `aria-hidden` and announce once through `role="status"`. Forty
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
`[0, base × 2ⁿ]`, capped — is right for idempotent reads. Make it visible: "Reconnecting,
next attempt in 4s", with a **Retry now** button. A silent retry loop is indistinguishable
from a hung interface, so the user reloads and cancels the work you were about to finish.
Honour `Retry-After`; guessing shorter is how a 429 becomes an outage. Never auto-retry a
write without an idempotency key.

---

## 8. Stale, offline, optimistic

Stale-while-revalidate means render what you have, refetch behind it, swap. Signal
staleness in proportion to consequence: a relative timestamp ("updated 4 min ago") where
data ages gracefully, a standing banner only where acting on stale values is dangerous —
balances, seat availability, live prices. Alarming banners on data nobody will act on train
users to ignore banners.

`navigator.onLine` proves only that a network interface exists, so treat it as a hint and
confirm with a real request. Announce offline once, globally; queue writes, mark them
pending, replay on `online`.

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
longest plausible string in each slot, handled by `overflow-wrap: anywhere` or truncation,
and every image absent with the box held open by `aspect-ratio`.

---

## 10. Reaching states without a backend

Make each state addressable — a story, a URL parameter, a prop — so it opens in one action.
Intercept at the network layer rather than mocking your fetch client, so real parsing and
error branches execute. Script the scenarios: 5s delay, 500, 403, empty array, 500-item
array, a request that never resolves. A state that takes three steps to reach is one nobody
looks at, and it rots.

## Rules

### MUST NOT — Do not replace already-rendered content with a skeleton or spinner when refetching data the user is already viewing.

*Why:* The rendered rows are still the best information available; removing them exchanges real content for a placeholder and destroys reading position and scroll context to communicate something a subtle busy cue conveys without cost.

Incorrect:

```tsx
if (isFetching) return <ListSkeleton />
```

Correct:

```tsx
if (isPending) return <ListSkeleton />
return <List rows={data} aria-busy={isFetching} />
```

### MUST NOT — Do not offer a retry affordance for deterministic failures such as 403 Forbidden, 404 Not Found, or validation rejection.

*Why:* Authorization and validation outcomes are functions of unchanged inputs, so repeating the request cannot produce a different result. A control that provably does nothing teaches the user that the interface’s affordances are unreliable.

*Source:* [RFC 9110 §15.5.4 (403 Forbidden)](https://www.rfc-editor.org/rfc/rfc9110.html)

*Exceptions:*
- 401 Unauthorized, where re-authentication genuinely changes the input — but the action should be "Sign in", not "Retry".

### MUST NOT — Do not apply optimistic updates to operations the server may legitimately refuse, such as payments, inventory-limited bookings, or uniqueness claims.

*Why:* An optimistic update asserts an outcome the client cannot know. Where refusal is a normal outcome rather than an exception, the interface will regularly show success and then revoke it after the user has moved on, forcing them to reconstruct what changed.

*Exceptions:*
- Reversible, near-certain, single-field mutations such as toggling a favourite or renaming, where rollback is immediately visible in place.

### MUST — Distinguish first-use, user-cleared, and filtered-to-nothing empty states with different copy and different primary actions.

*Why:* The three arise from opposite causes — data has never existed, data was deliberately removed, or data exists but is excluded by a query — so a single message is necessarily wrong about the cause in two of the three cases and points at the wrong recovery.

### MUST — The first-use empty state must name what will appear in the collection and offer a single action that creates the first item.

*Why:* It is the only screen in the product guaranteed to be seen by every new user, and it arrives before they have a mental model of the object. A bare count of zero spends that guaranteed impression on no information at all.

Incorrect:

```tsx
<EmptyState title="No projects" />
```

Correct:

```tsx
<EmptyState title="No projects yet" body="Projects group your deployments and their history." action={<Button>New project</Button>} />
```

### MUST — When a collection is empty because of an active filter or query, echo the query, state the unfiltered count, and make clearing the filter the primary action.

*Why:* Offering a create action implies the data does not exist, which is false and reads as data loss. The unfiltered count is direct evidence that the records are intact and identifies the filter as the cause.

### MUST — A skeleton must reproduce the final content’s row height, count, and spacing; where the geometry is not knowable in advance, use a spinner instead.

*Why:* A skeleton is a claim about the geometry of the content that will replace it. When the claim is wrong the swap moves the layout, so the skeleton produces exactly the shift it was added to prevent, and incurs a cumulative-layout-shift penalty an honest spinner would not.

### MUST — Every error state must name the operation that failed and offer a concrete next step; add a request or error identifier whenever support escalation is plausible.

*Why:* A user facing a failure needs to know what they lost, whether waiting will help, and what to do — none of which is derivable from an apology. The identifier is what makes the failure findable in logs, without which a support conversation cannot begin.

Incorrect:

```tsx
<Alert>Something went wrong. Please try again.</Alert>
```

Correct:

```tsx
<Alert title="Couldn’t load your deployments" body="The server didn’t respond within 10 seconds." action={<Button onClick={retry}>Retry</Button>} meta="req_8f3a21" />
```

### MUST — A failed submission must retain every value the user entered and place each message beside the field it concerns.

*Why:* Re-entry cost is borne entirely by the user and grows with form length, and a message at the top of a long form leaves them hunting for which field it refers to — the two together are the dominant cause of form abandonment after an error.

### MUST — Honour a server-sent Retry-After header, and use exponential backoff with full jitter for automatic retries of idempotent requests.

*Why:* Retry-After carries the server’s own estimate of when capacity returns; retrying sooner adds load to an already-degraded service. Without jitter, clients that failed together retry together, reproducing the synchronised burst that caused the failure.

*Source:* [RFC 9110 §10.2.3 (Retry-After)](https://www.rfc-editor.org/rfc/rfc9110.html)

### MUST — Verify every collection UI at zero, one, many, and several hundred items before considering it complete.

*Why:* Each cardinality breaks something different: zero exposes missing empty states, one exposes pluralisation and stretched grid cells, and large counts expose absent virtualisation and unbounded count labels. Sample data of three or four items exercises none of them.

### MUST — Announce loading, success, and error transitions to assistive technology through role="status" or role="alert" without moving focus.

*Why:* A visually-conveyed status change produces no output for a screen reader user, who is left with an unchanged perception of the interface; moving focus instead would interrupt whatever they were reading and lose their position.

*Source:* [WCAG 2.2 Success Criterion 4.1.3 (Status Messages)](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

### SHOULD NOT — Do not treat navigator.onLine as proof of connectivity; confirm with an actual request before declaring the user online.

*Why:* The property reports only whether the device has an active network interface. A machine attached to a captive portal, a VPN with no route, or a LAN with a dead uplink reports true while every request fails.

*Source:* [MDN: Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)

### SHOULD — Show no loading indicator for operations expected to finish under 100ms, a skeleton or spinner between 1s and 5s, and determinate progress with a cancel affordance beyond 10s.

*Why:* Responses under about 100ms are perceived as instantaneous, so an indicator only adds a flash; up to about a second the user stays within one flow of thought; beyond about ten seconds attention detaches from the task and only concrete progress will hold it.

*Source:* Classic human–computer interaction response-time limits (Miller 1968; Card, Robertson and Mackinlay 1991)

### SHOULD — Delay showing a loading indicator by roughly 300ms and, once shown, keep it visible for at least roughly 500ms.

*Why:* Without a delay, fast responses render a loader for one or two frames, which is perceived as a flicker or rendering fault rather than as feedback; without a minimum hold, a loader that appears just before resolution produces the same flicker at the other end.

*Exceptions:*
- Actions where the control itself already shows a pressed or disabled state.

### SHOULD — Surface automatic retries to the user with the attempt schedule and a manual retry control, rather than retrying silently.

*Why:* A silent retry loop is visually identical to a hung interface, so the rational response is to reload the page — which aborts the in-flight recovery and restarts the backoff from zero.

### SHOULD — Signal staleness in proportion to its consequence: a relative timestamp for data that ages gracefully, a persistent banner only where acting on stale values causes harm.

*Why:* Warnings are a finite resource. A banner on data nobody will act upon trains users to dismiss banners without reading, which removes the signal precisely where it would have mattered.

### SHOULD — Reserve space for images and media with an explicit aspect-ratio or dimensions, and render a deterministic fallback when loading fails.

*Why:* An image without reserved dimensions contributes zero height until it decodes, then pushes everything below it down. The fallback must be deterministic so a broken image does not change layout relative to a working one.

### SHOULD — Make every non-ideal state reachable in a single action — a story, a URL parameter, or a mocked network scenario — without touching a real backend.

*Why:* A state that requires provisioning data or breaking a server to observe will not be reviewed, and unreviewed states drift out of sync with the component they belong to until they crash on first contact with production.

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm every state this screen can occupy has a designed rendering. (blocking)

- List every state this screen can occupy: ideal, each empty variant, each loading variant, partial, each error class, offline, stale, and overflow. Which of them renders something you deliberately wrote?
- For each state you did not write, what does the screen actually show today — and is that acceptable, or merely unnoticed?
- Does any state fall through to a blank region, an uncaught exception, or a raw status code?

### Confirm the three empty states are distinguished. (blocking)

- Does this screen render different copy for a first-time user, a user who cleared the collection, and a filter that matched nothing?
- Does the first-use state explain what the collection contains and offer exactly one creation action?
- Does the filtered-empty state offer clearing the filter rather than creating an item, and does it show the unfiltered count?

### Confirm loading indicators match duration and geometry. (blocking)

- Is the skeleton branch keyed to "no data yet" rather than "a request is in flight"? Does a background refetch blank the screen?
- Do the skeleton’s row height, row count, and spacing match the loaded content, and does the swap shift anything?
- For an operation that resolves in 80ms, does any indicator appear at all? For one that takes 20 seconds, is there real progress and a way to cancel?

### Confirm each error says what happened and what to do. (blocking)

- Does every error message name the operation that failed, rather than referring to "data" or "something"?
- Does each one offer a next step, and is that step actually capable of changing the outcome — no retry on a 403 or a validation failure?
- Are transport, permission, validation, and server faults distinguished, and does a failed form retain everything the user typed?
- Is there an identifier a user could quote to support for the failures that would need escalating?

### Confirm the collection survives every cardinality and content shape.

- Does the layout hold at zero, one, twelve, and five hundred items?
- Is pluralisation correct at one, and does a single item in a grid stretch to an absurd width?
- What renders for the longest plausible string in each text slot, and for an unbroken 300-character URL?
- What renders when every image is missing, and does the row height change?

### Confirm each state can be opened and reviewed without a backend.

- Can you open each empty, loading, and error state in one action, without seeding a database or disabling a server?
- Are the mocks intercepting at the network layer, so real parsing and error-handling code runs?
- Is there a scenario for a request that never resolves, and does the interface remain usable under it?

### Confirm connectivity and freshness are communicated honestly.

- With the network disabled mid-session, does the interface say what happened to unsaved work?
- Is offline detection confirmed by a real request rather than trusting navigator.onLine alone?
- Where cached data is displayed, can the user tell how old it is, and is the prominence of that signal proportional to the harm of acting on it?

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/state-inventory.md` — Which specific states does this particular kind of screen — list, detail, form, dashboard, search, feed, wizard, upload — actually need?
- `references/state-copy.md` — What exactly should each empty state and each error message say, and why is the common wording failing?
