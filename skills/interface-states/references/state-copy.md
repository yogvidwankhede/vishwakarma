# Before and after: empty and error copy

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
**Retry** · Reference `req_8f3a21`
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
`err_44c1`." — **Try again**
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
