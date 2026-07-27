# The Motion Grammar

Motion is the only channel that can express *change*: where something came from, what caused it, whether it is still the same object. Static design says what things are; motion says what just happened. Anything animated that says nothing is a delay you imposed.

The governing question is never "how long" but **"what does this motion tell the user that the start and end frames do not?"** Only four answers count:

- **Origin and destination.** A dialog scaling from its trigger *is* that button expanded; one appearing dead-centre forces a re-parse.
- **Causality.** Motion on the frame the user acts binds effect to cause. Past ~100ms the two read as separate events.
- **Continuity.** Moving elements through a reorder preserves object identity; cutting destroys it.
- **Feedback.** Input received, or refused.

Fail all four and delete it. That test alone removes most motion in generated interfaces.

## The eight intents

Every animation maps to one of eight semantic intents, each with prescribed duration, curve, and property defaults.

| Intent | Duration | Curve | Property |
|---|---|---|---|
| **enter** | 200–300ms | decelerate | opacity + translate |
| **exit** | 120–180ms | accelerate | opacity + translate |
| **transform** | 250–350ms | ease-in-out | transform |
| **respond** | 60–120ms | ease-out | scale / opacity |
| **attract** | 500ms, max 3 cycles | ease-in-out | transform |
| **occupy** | looping | linear | transform |
| **affirm** | 300–400ms | overshoot | scale |
| **reject** | 350ms, 2 cycles | decaying | translateX 6px |

`occupy` alone may loop forever, and only while an operation is outstanding.

## Easing is a physical story

**Entrances decelerate** — `cubic-bezier(0.16, 1, 0.3, 1)`. The element arrives carrying momentum and settles where the user must read it.

**Exits accelerate** — `cubic-bezier(0.4, 0, 1, 1)`. It is departing, so there is nothing to read.

**On-screen transforms use both** — `cubic-bezier(0.4, 0, 0.2, 1)`.

**Never `linear`** outside loops and gesture-tracked motion. Zero-then-infinite acceleration matches no physical event.

The commonest motion bug in shipped UI is an entrance curve on an exit. Run exits at 60–70% of the matching entrance duration.

## Duration comes from perception

Below **~100ms** a change reads as instantaneous: the budget for press and hover responses.

At **200–300ms** the eye can track an object: entrances and transforms.

Past **~400ms** motion stops being information and becomes a wait. Past 600ms the user attributes the delay to their device.

The motion contract enforces a 600ms ceiling. This is where the perception curve breaks.

## The MCP tools

`resolve_motion` computes duration and easing from a semantic intent:

```
resolve_motion(intent: "enter", distance: "far")
→ duration: 280ms
  easing: "cubic-bezier(0.16, 1, 0.3, 1)"
  css: "transition: opacity 280ms ..., transform 280ms ...;"
```

`check_animation_property` says whether a property is composited or forces layout:

```
check_animation_property(property: "width")
→ composited: false
  forcesLayout: true
  recommendation: "Animate transform: scaleX() instead."
```

`compute_stagger` produces per-element delays with automatic compression for long lists:

```
compute_stagger(count: 12, baseDelay: 40)
→ delays: [0, 40, 80, 120, 160, 180, 200, 210, 220, 225, 230, 235]
  note: "Compressed after item 6 so the list completes in under 300ms."
```

## prefers-reduced-motion

The motion contract requires a `prefers-reduced-motion` guard by default. The correct fallback is opacity-only transitions, which preserve causality without vestibular stimulation.

```css
@media (prefers-reduced-motion: reduce) {
  .animated {
    transition: opacity 200ms ease;
    /* no transform */
  }
}
```

## Using the @vishwakarma/motion package

```tsx
import { Reveal, RevealStyles, useMotion } from '@vishwakarma/motion'

export function Layout({ children }) {
  return (
    <html>
      <head><RevealStyles /></head>
      <body>{children}</body>
    </html>
  )
}

export function Features({ items }) {
  return items.map((item, i) => (
    <Reveal key={item.id} from="below" distance="short" delay={i * 40}>
      {item.title}
    </Reveal>
  ))
}
```

`RevealStyles` emits a small blocking script that arms the reveal CSS. Without it, elements appear without animating — the correct failure mode.
