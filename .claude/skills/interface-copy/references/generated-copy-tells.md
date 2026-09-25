# Generated-copy tells

A catalogue of word-level constructions that make a page read as machine-written, with the
mechanism behind each one, a worked rewrite, and a signal you can count.

None of these constructions is broken in itself. Each is a default that a writer reaches for
when a decision has not been made, so what the reader detects is the missing decision rather
than the punctuation or the layout. Diagnose the mechanism before deleting anything: if the
mechanism does not apply, the construction is fine and the rule should be overridden.

---

## 1. The category inversion

Shapes: `It's not a note-taking app, it's a second brain.` / `It's not just X, it's Y.` /
`Project management, reimagined.` / `Figma, but for audio.` / `Stop managing tasks. Start
shipping work.` / `The last invoicing tool you'll ever need.`

### Mechanism

Three separate failures arrive in one sentence.

1. **It asserts a category change and supplies no evidence.** "Second brain" is a claim about
   what the software is, and the sentence contains nothing a reader could check. The reader is
   asked to accept a reclassification on rhythm.
2. **It spends the most valuable line in the product on a negation.** The first line gets more
   reads than anything else on the page, and half of this one describes a category the product
   is not in. A reader who leaves after one line leaves knowing only what they were not buying.
3. **It is the single most recognisable shape in generated marketing copy.** Frequency alone
   makes it a signature: a reader who has seen it forty times this year reads the forty-first
   as output, whatever it says. The construction now transfers authorship rather than meaning.

The relatives share the mechanism. "X, reimagined" claims a rebuild and names no change.
"X, but for Y" borrows a category instead of stating one, which works only when the reader
already knows X well and the analogy holds on the axis that matters. "Stop doing X. Start
doing Y." adds an instruction to abandon a habit the reader was not asked about.

### Rewrite

| Before | After |
| --- | --- |
| It's not a note-taking app, it's a second brain. | Every note is linked to the meeting, person, and project it came from. |
| Customer support, reimagined. | One inbox for email, chat, and phone, with the full history on every ticket. |
| It's like Figma, but for audio. | Two people can edit the same mix at the same time and hear each other's changes. |
| Stop wrestling with spreadsheets. Start making decisions. | Import a spreadsheet and get a live dashboard in about two minutes. |
| The last project tool you'll ever need. | Replaces a tracker, a wiki, and a time log with one schema. |

Each rewrite drops the category claim and names the capability that would have justified it.
The claim becomes falsifiable, which is what makes it persuasive.

### Signal

Read the first 100 words of the page and count matches for these strings: "it's not", "not
just", ", reimagined", ", but for", "Stop <verb>", "Meet <product>", "the last X you'll ever
need", "X on steroids". One occurrence above the fold is worth rewriting. Then ask the harder
question: delete the sentence and see whether the page lost any information.

### When the mechanism lapses

- The audience has demonstrably misclassified the product and the wrong category is the news:
  `This is a compiler, not a linter — it rejects programs a linter would only warn about.`
- X is a named competitor or a previous version and the difference is stated in measurable
  terms rather than implied.

---

## 2. Em dash rate

The em dash is correct punctuation and belongs in good prose. The tell is the rate.

### Mechanism

The em dash accepts any relation between two clauses. Apposition, consequence, contrast,
interruption, afterthought and full sentence break all fit inside it, which is exactly why it
gets reached for: it lets the writer connect two thoughts without deciding how they are
related. A page with a dash in every paragraph is therefore evidence that the decisions were
skipped, and it has a second cost. Punctuation is what varies the rhythm of prose. When one
mark carries every join, every sentence has the same shape, and the flatness reads as
machine-generated even when each individual sentence is fine.

### What each mark actually does

| Mark | Relation it encodes | Example |
| --- | --- | --- |
| Comma | Non-essential addition; the sentence survives its removal. | Deploys run on every push, usually in under a minute. |
| Colon | What follows explains, itemises, or delivers what precedes it. | One requirement: a Dockerfile. |
| Semicolon | Two independent statements the reader should hold together. | The build is deterministic; the cache is not. |
| Full stop | Two separate claims. Usually the right answer. | Setup takes one command. Nothing else is required. |
| Parentheses | An aside the reader may skip entirely. | Deploys run on every push (including forks). |
| Em dash | A genuine break in voice, or an interruption you want the reader to feel. | We shipped it in March — then the API changed. |

Choosing between these is the work the dash was standing in for. Substituting a comma
everywhere is not the fix; the fix is that each join now names its own relation.

### Rewrite

Before, four dashes in three sentences:

```text
Deploy in seconds — no config, no YAML — and scale automatically — from one user to a million.
Our platform handles the infrastructure — so you can focus on your product.
```

After:

```text
Deploy in seconds. No config files, no YAML. Traffic scales from one user to a million
without a change on your side, because we run the infrastructure.
```

The second version is shorter, states who does what, and has three distinct sentence shapes.

### Signal

Count em dashes (and their common substitutes, ` - ` and ` -- `) per unit of text:

- More than one in a short paragraph: re-punctuate.
- More than two or three on a page of marketing copy: re-punctuate all of them, then put
  back the one that carries a real break in voice.
- Two dashes in one sentence that are not a matched pair bracketing a parenthetical: almost
  always one join too many.

### When the mechanism lapses

- Quoted speech, transcripts, interviews and fiction, where the dash reproduces how someone
  talks.
- A matched pair bracketing a true parenthetical, which is one construction rather than two
  connectors.
- Reference prose that is deliberately dense and where the dash is doing a job a comma cannot,
  because commas are already carrying a list inside the clause.

---

## 3. Checkmark feature lists

A green tick before every item on a feature list.

### Mechanism

1. **The tick is a verification glyph.** Everywhere else in an interface it reports that
   something was checked and passed: a test, a step, a payment. On a feature list nothing
   performed a check, so the glyph asserts a confirmation that does not exist. The reader
   registers a claim of proof and finds none behind it.
2. **It flattens the list.** Every item gets the same mark, so SSO, dark mode and unlimited
   seats all arrive at equal weight. The reader came to the list to find out what matters and
   the list refuses to say.
3. **It reads as a comparison table with the competitor column deleted.** The tick column is
   the left half of a feature matrix. A reader who has seen a matrix supplies the missing
   column mentally and then notices that no competitor was named, which reads as an unmade
   comparison rather than a feature list.

### Rewrite

Before:

```text
✓ Fast
✓ Secure
✓ Scalable
✓ Easy to use
✓ 24/7 support
```

After:

```text
Cold starts under 50 ms, measured at the edge in 18 regions.
SOC 2 Type II, with per-tenant encryption keys you can rotate yourself.
Tested to 40,000 requests per second on the default plan.
Support answers in under 4 hours, including weekends.
```

The tick is gone, the ordering now carries the ranking, and each line is checkable. Where a
tick genuinely belongs, it reports state: `✓ Domain verified`, `✓ 3 of 4 checks passed`.

### Signal

- Any tick, check emoji, or check icon in a list that is not a checklist, a progress list, or
  a column in a two-sided comparison table.
- A list where the ticks outnumber the sentences.

### The related tell: bullets of identical length

A list where every item is three words and the same part of speech was cut to fit a template,
not to fit the facts. Length and position are ranking signals the reader uses before reading
any of the words, so a perfectly even list actively states that nothing in it matters more
than anything else. The repair is not to pad the short ones. It is to put the most
consequential item first, let it be as long as it needs to be, and cut items that only exist
to reach a round number.

Parallel construction stays correct for specification lists, parameter tables, and any set
where the reader is comparing values in the same dimension.

---

## 4. Three tiers, and what their names have to do

Three pricing tiers is often the right count. The tells are in the words.

### Mechanism

A tier name is the reader's fastest route to "which one is me", and it is read before any
bullet list. `Starter / Pro / Enterprise` names positions on an internal ladder instead of
naming buyers, so it answers that question for nobody and forces all three lists to be read.
Three further symptoms usually travel with it:

- **A "Most popular" badge on the middle tier.** This substitutes a social cue for the fact
  the reader was looking for. It is also the tier the pricing page wanted to sell, which the
  reader can tell, so the badge costs trust and supplies no information.
- **Differences that are unstated or unmeasurable.** "Everything in Starter, plus more",
  "advanced features", "priority support". A boundary the copy cannot state in a number is
  usually a boundary that was never decided.
- **"Contact us" in the price slot.** Legitimate for negotiated contracts. Illegitimate as a
  stand-in for a price nobody set, and either way it is useless without the threshold at
  which a reader should make contact.

The test is self-selection: a reader should be able to pick a tier, and know they picked
right, without talking to anyone.

### Rewrite

Before:

```text
Starter — Free — Get started
Pro — $29/mo — MOST POPULAR — Everything in Starter, plus advanced features
Enterprise — Contact us — Custom solutions for your business
```

After:

```text
Solo. $0. One editor, 3 projects, 7-day history.
Team. $29 per editor per month. Unlimited projects, 1-year history, SSO, audit log.
  For 2 to 50 editors.
Company. From $18,000 per year. Everything in Team, plus SAML, data residency, and a
  99.9% uptime agreement. Contact us above 50 editors or if you need a signed DPA.
```

Each name says who it is for, each boundary is a number, and the last tier states the
threshold that makes contact worthwhile instead of hiding a price behind a form.

### Signal

Read each tier name and bullet list in isolation and ask: can a reader say which tier they
are, and what they would have to become to move up? Then check for the four specific strings:
a "Most popular" badge, `Everything in X, plus`, `advanced`, `Contact us` with no stated
threshold.

### When the mechanism lapses

- Enterprise contracts genuinely priced per negotiation. Keep "Contact us" and add the
  trigger condition.
- A product with one usage-based rate, where there are no tiers to select between.
- Names that are already the buyer's own vocabulary, which sometimes really is Free, Team,
  and Enterprise; the test is whether a reader self-selects, not which words were used.

---

## 5. Cadence tells

These are smaller, and they are what remains when the four above are fixed.

### The triad

`Faster, simpler, smarter.` `Build, ship, scale.` `Secure, reliable, and effortless.`

**Mechanism.** Three is the shortest list that sounds complete, so it gets filled to length.
None of the three comparatives names a baseline, which makes all three unfalsifiable, and the
third member is usually chosen for stress rather than for meaning. The rhythm supplies the
sense of a claim having been made.

**Rewrite.** `Faster, simpler, smarter.` becomes `Builds finish in 40 seconds instead of six
minutes.` One claim, one number, checkable. A triad whose three members are each measured is
not this tell.

**Signal.** Any run of three adjectives or three bare verbs separated by commas, especially
ending in "and". Count them per page; more than one is a cadence habit rather than a coincidence.

### The restating subtitle

```text
Heading:  Ship faster with automated deploys
Subtitle: Deploy automatically and ship your product faster
```

**Mechanism.** The subtitle slot exists in the layout before anyone has decided what to put
in it, so it gets filled by paraphrase. It is the second most-read line on the page, and a
reader who finds no new information there learns that the page repeats itself and stops
reading closely. Everything after it is now skimmed.

**Rewrite.** Give the subtitle the next fact, not the same fact: `Push to main. The build
runs, tests pass, and the new version is live in about 90 seconds.` If no next fact exists,
delete the subtitle and let the heading be one line longer.

**Signal.** Strike every word in the subtitle that also appears in the heading. If what
remains is not a new claim, the subtitle is decoration.

### Fragment emphasis as rhythm

`Built for teams. No setup. Just results.`

**Mechanism.** A full stop after a fragment borrows the weight of a sentence for a phrase that
makes no claim. Used once, it lands. Used three times in a row it becomes the page's only
rhythm, and rhythm repeated without variation is the most reliable surface signature of
generated prose.

**Rewrite.** Keep at most one fragment per section and make the rest say who does what:
`Two people can edit the same file at once. There is no setup step and no config file.`

**Signal.** Count consecutive sentences without a finite verb. Two in a row is a choice;
three is a tic.

---

## Audit pass

Run in this order, because fixing an earlier item often deletes a later one.

1. Delete every category inversion. Replace each with the capability that would have made the
   claim true.
2. Count em dashes. Above one per paragraph, re-punctuate each according to the relation it
   carries, then restore at most one.
3. Remove ticks from any list that is not a checklist or a two-sided comparison. Reorder the
   list so the first item is the one that matters most.
4. Read each tier name alone and ask whether a reader can self-select. Replace vague
   boundaries with numbers, and either price the top tier or state the contact threshold.
5. Count triads, fragments, and words shared between each heading and its subtitle.
6. Read the page aloud. Uniform sentence length is the tell that survives every fix above,
   and it is audible before it is visible.
