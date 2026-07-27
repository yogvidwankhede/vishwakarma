# Before and after

Each pair changes the copy only. The lesson is in the delta.

## Buttons and actions

| Before | After | Why |
| --- | --- | --- |
| `Submit` | `Create account` | Names the outcome the user wants, not the transport verb. |
| `OK` | `Delete file` | "OK" acknowledges the dialog; the label should commit to the act. |
| `Yes` / `No` | `Discard` / `Keep editing` | Yes/No requires re-reading the question to decode. |
| `Cancel` (on "Cancel subscription?") | `Keep subscription` | "Cancel" is ambiguous when cancelling is the action. |
| `Save` (on a settings page with no unsaved state) | `Save changes` | Distinguishes the act from the state. |
| `Learn more` | `See pricing details` | Link text must be meaningful out of context. |
| `Continue` | `Continue to payment` | Says where the step leads, reducing abandonment. |
| `Upload` | `Choose a file` then `Upload 3 files` | Label reflects the actual current operation and its count. |

## Errors

**Bad:** `Error: Something went wrong. Please try again.`
**Good:** `We couldn't load your projects — the request timed out. Refresh to try again.`
Names the failing operation and the cause, and gives a concrete recovery.

**Bad:** `Invalid password.`
**Good:** `Passwords need at least 12 characters. Yours has 8.`
States the rule and the gap, rather than a verdict.

**Bad:** `You entered an invalid date.`
**Good:** `Choose a date on or after today.`
Removes the accusation and states the constraint as a positive instruction.

**Bad:** `Oops! 500 Internal Server Error`
**Good:** `Something failed on our side while saving. Your work is still here — try again, or copy your text somewhere safe if it keeps failing.`
Removes the mock-cheer and the status code, reassures about data, offers a fallback.

**Bad:** `Sync conflict: local revision 42 diverges from remote revision 47.`
**Good:** `This page changed on another device. Keep your version, or load the newer one?`
Translates implementation vocabulary into the user's model.

**Bad:** `Field required`
**Good:** `Enter a billing email so we can send receipts.`
Says which field, and why it is being asked for.

**Bad:** `Upload failed.`
**Good:** `report.pdf is 24 MB. The limit is 10 MB.`
Names the object, the measured value, and the threshold.

## Empty states

**Bad:** `No data`
**Good:**
Heading: `No saved views yet`
Body: `Saved views keep a filter and sort order so you can return to them in one click.`
Action: `Create saved view`

**Bad (after filtering):** `No results found. Create your first item.`
**Good:** `No tasks match "overdue" in this project.` with `Clear filters`.
The filtered empty and the never-had-data empty need different actions.

**Bad (load failure shown as empty):** `No messages`
**Good:** `We couldn't load your messages.` with `Retry`.
Presenting a failure as an empty state teaches users the product loses their data.

## Confirmations

**Bad:** `Are you sure?` / `Yes` / `No`
**Good:** Heading `Delete Acme Redesign?` Body `This removes the project and its 40 tasks for everyone. It can't be undone.` Buttons `Delete project` / `Keep project`.

**Bad:** `Are you sure you want to leave? Changes you made may not be saved.`
**Good:** `You have 3 unsaved changes. Save them before leaving?` with `Save and leave` / `Discard and leave` / `Stay`.

**Reversible action:** remove the dialog entirely. Archive the item and show
`Archived "Q3 planning". Undo` for a few seconds. Undo beats confirmation because it costs
nothing in the common case.

## Notifications and status

| Before | After |
| --- | --- |
| `Success!` | `Invite sent to dana@example.com` |
| `Saved!` | `Saved` (no exclamation; the toast already signals the event) |
| `Processing...` | `Converting 3 of 12 files` |
| `Loading` | `Loading your invoices` |
| `An update is available!` | `Version 4.2 is ready. Restart to install.` |

## Form hints and labels

**Bad:** placeholder-only `Email` in the field, no label.
**Good:** visible label `Work email`, placeholder `name@company.com`, hint below:
`We'll only use this for account notices.`

**Bad:** `Name*` with `* required` at the bottom.
**Good:** mark the *optional* fields — `Company (optional)` — when most are required. The
asterisk convention needs a legend and reads poorly aloud.

## Register mismatches

**Bad, in billing settings:** `Ready to supercharge your workflow? 🚀`
**Good:** `Your plan renews on 12 August 2026.`

**Bad, in a destructive dialog:** `Yikes! This is a big one.`
**Good:** `This deletes 1,204 records across 3 workspaces.`

**Bad, in a marketing hero:** `Data management platform.`
**Good:** the marketing surface is where enthusiasm belongs — it is the only place register
may expand.

## Numbers, units, and time

| Before | After |
| --- | --- |
| `three items selected` | `3 items selected` |
| `1 items` / `0 items` | `1 item` / `No items` |
| `item(s)` | resolve with plural rules at render time |
| `24MB` | `24 MB` with a non-breaking space |
| `Last updated 2024-03-04T09:12:33Z` | `Updated 3 minutes ago`, with the full timestamp on hover |
| `Updated 2 years ago` (audit log) | `Updated 4 March 2024` |
| `$1234.5` | `$1,234.50` via `Intl.NumberFormat` |
