# Context cost audit

Every installed skill is a standing charge against the context window. The charge is
predictable, small per skill, and catastrophic in aggregate, which is why it is almost
never noticed until sessions start truncating. Load this when deciding whether a skill is
worth its cost, or when an existing install set has become expensive.

---

## 1. The three tiers, and who pays them

A well-formed skill discloses progressively, and each tier has a different payer.

| Tier | Loaded | Typical size | Paid |
| --- | --- | --- | --- |
| Trigger line | Always | 30-60 tokens | Every turn, per installed skill |
| Body + rules | On activation | 1,500-4,000 tokens | Every turn the skill is active |
| References | On explicit request | 2,000-6,000 tokens each | Only when the agent asks |

The failure mode is a skill that collapses these tiers — one long document with no
reference split, activated by a broad trigger. It behaves like an always-on skill without
declaring itself one.

## 2. The arithmetic

Three numbers decide an adoption.

**Catalogue tax.** `n_skills x trigger_tokens`, per turn, unconditionally. Thirty skills
at 45 tokens is 1,350 tokens gone before the first instruction. This is the cost people
forget, because no individual skill looks responsible for it.

**Activation cost.** `body + rules`, per active turn. A body written to a 2,200-token
budget with twelve rules averaging 150 tokens of statement-plus-rationale is about 4,000
tokens. Two such skills active together is 8,000 — a meaningful fraction of the working
context on a long task, before any file has been read.

**Session cost.** `activation_cost x turns_active`. This is the number that matters for
an always-on skill, and it is the one nobody computes. Fifty turns at 4,000 tokens is
200,000 tokens. If the skill was relevant on six of those turns, roughly 176,000 tokens
went to restating something the task did not need.

## 3. Measuring instead of estimating

Character count is a crude proxy for tokens, but it is deterministic, dependency-free, and
accurate enough to make a budget decision. Technical prose — code fences, identifiers,
punctuation — tokenises more densely than ordinary English, so divide by about 3.6
characters per token rather than the commonly cited 4. Under-estimating is the error that
actually hurts, so bias the divisor down.

```bash
# Per-file rough cost of an installed skill directory.
find .claude/skills -name '*.md' -print0 \
  | xargs -0 wc -c \
  | awk '{ printf "%-60s %8d chars  ~%6d tok\n", $2, $1, $1/3.6 }' \
  | sort -k3 -n -r
```

Do this before adopting, not after, and write the number into whatever record says why the
skill is installed. A cost nobody wrote down is a cost nobody will revisit.

Two refinements worth making once the totals matter:

- Count the **frontmatter description separately** from the body. They are paid on
  different schedules and a skill can be cheap on one and expensive on the other.
- Count **assets that get read into context** (templates, schemas, example files the
  instructions tell the agent to open) as part of activation cost. An instruction that says
  "read `reference/tokens.json` first" has a 3,000-token body no matter what the
  Markdown weighs.

## 4. Deciding: is it worth it

Set the comparison up as a ratio, not a feeling: *cost per turn* against *frequency it is
right*. A 4,000-token skill that changes the output on one turn in twenty is spending
80,000 tokens per useful intervention. A 600-token skill that fires on a third of turns
and prevents a rework cycle is cheap at several times the price.

Three adoption verdicts, and what each implies:

- **Adopt as-is.** Cost is stated, activation is narrow, no collision, no contradiction.
- **Adopt narrowed.** The content is right but the trigger is broad or the body is bloated.
  Fork it, tighten the trigger, move the long material into references, and record the
  delta against upstream so the next update can be re-applied deliberately.
- **Decline.** The gap it closes was not named, or it duplicates something installed, or
  the cost per useful turn is worse than the failure it prevents.

## 5. Cutting an over-budget skill

When the content is worth keeping and the cost is not, the fix is almost always one of
four moves, in order of preference:

1. **Split at a question boundary.** Anything that answers a different question than the
   body answers becomes a reference. The test is whether a reader would ever want that
   section *without* the rest — if so, it is a separate file. Splitting in the middle of
   one question produces two files that must both be loaded, which is worse than one.
2. **Narrow the activation.** Most bloat is not length, it is firing too often. A skill
   that costs 3,000 tokens on 10% of turns is cheaper than one costing 900 on every turn.
3. **Delete the restatement.** Compiled skill formats usually render the rules list and the
   verification checklist from structured fields. A body that also contains them pays
   twice for the same text.
4. **Drop the background.** Explanations of why the field works this way are what a
   reference is for. The body should carry the mechanism only where the mechanism changes
   what the agent does.

## 6. Symptoms of an over-installed agent

These show up before anyone suspects the skill set:

- Sessions truncate or summarise earlier than they used to on comparable tasks.
- The agent recites guidance that has nothing to do with the current file.
- Instructions given in the conversation are followed less reliably than they were, because
  they are now competing with several thousand tokens of standing text.
- Output quality varies between runs of the same prompt — usually a collision, and the
  install set grew past the point where anyone can predict which skills fire.

The remedy is subtraction, measured the same way as adoption: remove the most expensive
skill that fires least often, re-run the known-answer task, and see whether anything got
worse. Usually nothing does, which is the finding.
