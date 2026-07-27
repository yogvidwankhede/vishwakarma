# Prompt engineering

This document covers what actually works when prompting an AI coding agent to build frontend interfaces. Most prompting guides focus on the general case; this one focuses on what is different about visual output, where an agent generating syntactically correct code that looks bad is the most common failure mode.

## The core problem

An agent's default is to produce the safest, most average-looking output that satisfies the literal request. "Build a pricing page with three tiers" produces three identical-looking cards with equal emphasis — the aggregate of everything the model has seen.

The skills in Vishwakarma exist precisely to break that default. But the skills are guidance, and guidance competes with priors. The prompts you write determine which wins.

## Rank before you style

The single highest-leverage prompt habit is to specify the hierarchy before specifying anything visual.

**Weak prompt:**
```
Build a pricing page with three tiers: Starter, Pro, and Enterprise.
```

**Strong prompt:**
```
Build a pricing page with three tiers: Starter, Pro, and Enterprise.
Pro is the recommended tier — it should be visually dominant, the first thing the eye goes to.
Starter exists for comparison; it should be visible but clearly secondary.
Enterprise is for large buyers who will reach out directly; it should not compete with Pro.
```

The second prompt gives the agent a ranking, which the design-judgment skill can act on. Without a ranking, the agent applies equal weight to everything and produces a page with no hierarchy.

## Specify what is missing, not just what is present

Agents reliably generate the happy path. They rarely think to generate the empty state, the loading state, the error state, or the overflow case without being asked.

```
Build a user list with:
- The list of users when populated
- An empty state for accounts with no users yet (first-time experience)
- A loading skeleton while the list is fetching
- An error state if the fetch fails, with a retry button
- Behaviour when there are more than 100 users (pagination or virtual scroll)
```

You can also use negative specification: "Do not generate a loading spinner — use a skeleton that matches the shape of the loaded content."

## Give the agent permission to criticise

Agents default to producing output that satisfies the literal request, not output that pushes back on it. A prompt that invites judgment gets better design:

```
Build this card. If any of the fields I've listed would make the card harder to scan,
tell me which ones and why before you build it.
```

The design-review skill runs a critique pass after generation. A prompt that asks for critique *during* planning catches problems earlier and produces cleaner first drafts.

## Reference your tokens, not raw values

Prompts that name raw values train the agent to hard-code them:

**Weak:** `Use a teal colour for the primary button, about #0f766e or similar.`

**Strong:** `Use the brand primary colour from the token system for the primary button.`

If the agent has the design-tokens skill installed, it will look up the correct token. Hard-coded values bypass the token system and break dark mode, theming, and future updates.

## Audit before you accept

The most reliable technique is a two-stage prompt:

```
[First message]
Build a settings form with sections for Profile, Notifications, and Security.

[Second message]
Now audit what you just built against the Design Contract:
- Are all spacing values on the 4px grid?
- Do all text/background colour pairs pass 4.5:1 contrast?
- Is there a visible focus indicator on every interactive element?
- Are all labels properly associated with their inputs?
List any failures.
```

Separate passes produce different findings. Prompting explicitly for an audit makes the agent treat it as a real check rather than a rubber stamp.

## The description field matters

For skills to load at the right time, the description in each skill's frontmatter must read as a trigger condition, not a label. Agents that use description-based activation — Cursor in particular — decide whether to load a skill from that one string.

| Weak description | Strong description |
|---|---|
| "Design tokens" | "Use when creating, naming, or wiring design tokens into CSS, Tailwind, or TypeScript" |
| "Motion" | "Use when adding, tuning, or reviewing any animation, transition, gesture, or scroll effect" |
| "Layout" | "Use when structuring a page or component, or fixing overflow, stacking, or alignment" |

The strong version names a situation. The weak version names a topic.

## What the skills handle automatically

Once installed, the skills handle several prompting decisions for you. You do not need to ask the agent to check contrast, design a dark theme, generate empty and error states, use semantic motion intents, or run a self-review pass. The relevant skills do these things.

What the skills do not handle, and what you should always specify: the hierarchy of your content, the user's goal in this context, what should not appear, and your actual brand values.

The skills provide the grammar. The prompts provide the meaning.
