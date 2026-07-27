# Asking about a UI brief without stalling

Most UI briefs are underspecified, and that is normal — the user is describing a
destination, not a route. The skill is telling apart the gaps that must be closed before
building from the gaps that are cheaper to close after.

## The test: does the answer change the structure?

Ask only when the answer changes something expensive to reverse. Structure is expensive.
Styling is not.

**Worth asking**

- "Is this for one-off visitors or for people who use it every day?" Frequency determines
  density, shortcuts, and how much explanation the screen carries. Getting it wrong means
  rebuilding the layout, not restyling it.
- "Does the data come from an API you already have, or should I mock it?" Determines
  loading and error architecture, and whether pagination is real.
- "Is there an existing design system or component library I should build inside?" Building
  outside one and discovering it later means discarding the work.
- "Roughly how many items will this list hold — ten, a thousand, a million?" Ten is a list,
  a thousand needs search and pagination, a million needs virtualisation and server-side
  filtering. These are three different screens.
- "Must this work offline, or on a slow connection?" Changes the data strategy.

**Not worth asking**

- Colour, font, radius, shadow, spacing preferences. All revisable in one edit.
- "Should I add dark mode?" Build tokens so that it is possible, mention it in the report.
- "What should the button say?" Write your best guess and flag the copy as provisional.
- "Where should this go in the navigation?" Propose a location and say so.
- Anything you can infer from the repository. Read the code first; asking about facts that
  are in the codebase reads as not having looked.

## The one-question rule

Ask **at most one question per turn**, and lead with it rather than burying it under a
preamble. A list of six questions returns the work to the user, who asked precisely because
they did not want to specify six things. If two questions both pass the structure test,
ask the one whose wrong answer is more expensive and assume the other.

The question should be answerable in a few words and should offer the two or three real
options rather than being open-ended. "Staff tool or public page?" gets an answer.
"What are your requirements?" gets a sigh.

## Assumption discipline

When you do not ask, do not silently decide. Write the assumption where the user will see
it, in the form: **assumption, consequence, cost to change.**

> Assumed this is an internal tool for daily use, so the table is dense and keyboard-first
> rather than spacious and marketing-styled. If it is public-facing, the change is layout
> density and copy tone — roughly a rebuild of the table, not of the page.

That paragraph does three things a question cannot: it delivers working output immediately,
it makes the decision visible, and it prices the correction so the user can judge whether
to bother. An assumption is only a failure when it is invisible.

## Reading the brief you were given

Short briefs carry more information than they appear to. Mine them before assuming.

- **The nouns** name the content model. "A dashboard for tracking invoice status" gives you
  the entity, the primary attribute, and the fact that status is the thing to rank first.
- **The verb** names the primary action. "Let people book a room" is a booking flow;
  "let people browse rooms" is a catalogue. They share nouns and share almost nothing else.
- **The audience word** sets density and tone. "Admin", "customer", "team", "public" each
  imply a different default.
- **The absence of a word** is information too. If the user did not mention search, ask
  yourself whether the item count makes search mandatory; if it does, build it and say so.

## Handling contradictory or impossible briefs

If two requirements genuinely conflict — "put everything above the fold" and "show all
forty fields" — do not average them into something that satisfies neither. Build the
version you think is right, name the conflict explicitly, and describe what the other
version would look like. Naming a conflict is more useful than resolving it badly, and
far more useful than asking the user to resolve it without having seen either option.

## When to break the one-question rule

Ask more than once when the request touches something you cannot safely guess: destructive
operations, payments, regulated or legal copy, authentication and permission boundaries,
or anything where the wrong guess produces a plausible-looking screen that is actually
wrong. A confidently rendered incorrect permissions matrix is worse than an unanswered
question, because it looks finished.
