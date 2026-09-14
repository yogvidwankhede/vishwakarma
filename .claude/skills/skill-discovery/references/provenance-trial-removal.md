# Provenance, executables, trial, and removal

A skill is text until it ships something that runs, at which point it is a dependency with
a supply chain. And a skill that cannot be removed cleanly is not an experiment, it is a
commitment. Load this before installing anything with a `scripts/` or `hooks/` directory,
before copying rules into a repository you publish, or when planning a trial.

---

## 1. What is actually being installed

Skill packages carry more than instructions. Inventory before install:

| Component | Risk | What to check |
| --- | --- | --- |
| Instruction text | Steers the agent on every activation | Read it; it is the whole product |
| Reference files | Context cost when loaded | Size, and whether the body forces a load |
| Templates / schemas | Low | Whether they hardcode anything project-specific |
| Scripts / commands | Runs on invocation | Every line, before the first run |
| Hooks | **Runs without invocation** | Every line, plus which events fire it |
| Config edits | Persist after uninstall | What file, what key, what value |
| Declared tool permissions | Widens what the agent may do | Whether the list exceeds the stated job |

The last three are the ones that make removal messy, and they are the ones a listing never
mentions.

## 2. Executable review

Read scripts as you would read a new dependency's postinstall step, because that is
structurally what they are.

- **Network.** Does it fetch anything at run time? A script that downloads its own logic
  means the code you reviewed is not the code that runs.
- **Credentials and environment.** Does it read `.env`, keychains, `~/.ssh`, cloud
  credential files, or the full environment? A formatting helper has no reason to.
- **Writes outside the project.** Home directory, global config, other repositories.
- **Shell construction.** Command strings assembled from arguments the agent supplies are
  an injection surface reachable from ordinary task text.
- **Opacity.** Minified, obfuscated, or base64 payloads in a skill are disqualifying. There
  is no legitimate reason for a skill's helper to be unreadable.

**Hooks deserve a separate pass.** They execute on lifecycle events rather than on an
explicit call, so there is no moment where someone decides to run them. Establish which
events fire each hook, whether it can block or mutate agent actions, and what it does on
failure. A hook that runs before every tool call is on the hot path for everything the
agent does.

## 3. Pinning and update posture

Install at a commit or a released version, never a moving branch.

The mechanism: a skill's content *is* the agent's standing instructions. Tracking a branch
means those instructions change between runs, with no diff presented and no review
performed, and the output shift that follows will be attributed to the model or the prompt
rather than to the update. Pinning turns updates into reviewed events.

When updating, diff the rules and the trigger line specifically. A body reword is usually
cosmetic; a changed threshold or a broadened trigger is a new adoption decision and needs
the overlap and contradiction passes run again.

## 4. Licence and attribution

Skills are creative text, and the default is restrictive.

- **No licence file** means no grant. Public visibility is not permission to redistribute,
  whatever the README encourages. Use it locally if the terms of the host allow; do not
  ship it inside your own catalogue.
- **Permissive (MIT, Apache-2.0, BSD)** allows redistribution and modification with the
  notice preserved. Apache-2.0 additionally asks that modified files be marked as changed —
  relevant precisely when you fork a skill to narrow its trigger.
- **Copyleft (GPL family)** on a text asset is unusual and its reach over a bundle is
  contested; get a real answer before shipping rather than assuming.
- **CC-BY and similar** allow redistribution with attribution; the attribution has to be
  visible where the content is, not buried in a repository nobody opens.

When in doubt, do the cheap thing: cite the source, keep the notice, and link back.
Rewriting the mechanism in your own words is legitimate; copying the prose is redistribution
regardless of how much you rearranged it.

## 5. Trial protocol

The purpose of a trial is to produce evidence you could show someone. That requires a task
whose correct output you can already judge.

1. **Pick the known-answer task.** Something in the gap you named, where you can recognise a
   good result without consulting the skill you are testing. A task you cannot grade proves
   nothing, and a task the skill chose for you proves less.
2. **Baseline it.** Run the task with the skill absent, save the output verbatim. Without
   this, "better" is a memory, and memory grades in favour of the decision already made.
3. **Install one skill.** One. Two at once and any change has two candidate causes, and
   separating them costs more than the sequential install would have.
4. **Re-run and diff.** Compare against the baseline on the specific failure you named, not
   on general impression. Note anything that got *worse* — added verbosity, ceremony on
   small tasks, guidance that fired where it did not belong.
5. **Run a holdout task outside the skill's domain.** This catches over-broad activation:
   if the new skill fires on unrelated work, it will tax every session.
6. **Decide in writing.** Keep, keep-narrowed, or remove, with the cost figure and the
   observed delta beside it.

A trial that produces "seems better" produced nothing. Either the named failure stopped
appearing or it did not.

## 6. Install record

One entry per installed skill, wherever the project keeps operational notes:

```text
skill:        <id>
source:       <url> @ <commit or version>
installed:    <date>   by: <who>
gap:          <the failure it is meant to fix>
cost:         <tokens per activation> / <always-on? yes-no>
touches:      <paths outside its own directory>
conflicts:    <resolved overlaps and precedence decisions>
removal:      <the exact steps>
```

The `touches` line is the one that earns its keep. Everything else can be reconstructed;
a forgotten edit to a shared settings file cannot.

## 7. Clean removal

Removal is only cheap if the install was recorded. The order matters:

1. Delete the skill directory.
2. Revert every shared-file edit it made — hook registrations, settings keys, tool
   permission entries, lines appended to a root instructions file.
3. Re-run the known-answer task and confirm the output returns to the baseline. If it does
   not, something was left behind.
4. Re-run the activation probe for any skill whose trigger was narrowed to accommodate this
   one, and widen it back.

The failure to avoid is **residue**: a hook still registered, a permission still granted, a
paragraph still appended to the root instructions, all continuing to steer the agent with
nothing in the catalogue left to explain why. Residue is worse than the skill was, because
the skill at least had a description.

If removal cannot be reduced to a short list of reversible steps, that is a reason not to
install, not a detail to work out later.
