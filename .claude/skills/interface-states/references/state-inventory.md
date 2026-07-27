# State inventory checklists by screen type

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
- [ ] Loading — refresh: rows retained, `aria-busy`, restrained progress cue.
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
- [ ] Aggregate of one, and of zero — no divide-by-zero rendering as `NaN`.

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
