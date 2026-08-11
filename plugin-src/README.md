# Vishwakarma

Design intelligence and engineering discipline as one skill.

Installs as a single skill named **vishwakarma**. One entry in the Skills panel, 32 reference
files and 3 verification scripts behind it, loaded on the branch you are actually on.

## What it is

Most design guidance for agents is adjectives — "make it modern", "keep it clean" — which do not
survive contact with a language model. Vishwakarma states every rule as a **checkable constraint
with a stated mechanism**: what goes wrong when the rule is violated, so the rule can be
correctly overridden when that mechanism does not apply.

- **Colour is computed, not described.** OKLCh ramps with contrast contracts, not hex literals.
- **Motion is derived from intent.** Timing and easing follow from what the animation is for.
- **Platform constants are not averaged.** 44pt on Apple and 48dp on Android are both right; 46
  is native to neither. The platform is resolved before any value is chosen.
- **Findings are graded by evidence.** Verified, flagged, and human-required are kept separate,
  because conflating them destroys the credibility of a report.

## What it covers

| Layer | Contents |
|---|---|
| Working discipline | Ambiguity resolution, baselines, checkable tasks, scoped diffs, debugging, stop conditions |
| Platform | Web, Android (Compose / Material 3), Apple (SwiftUI / HIG) |
| Design core | Judgment, colour, typography, layout, surface, tokens, theming, responsive, IA, components |
| Motion | Intent and timing, spring physics, gestures, micro-interactions, scroll |
| Quality | Accessibility rules and evidence grading, web and mobile performance, code quality and testing |
| Specialist | SEO, binary structural analysis, multiplayer games, 3D assets |

## Verification

Three scripts, run rather than read. Each exits non-zero on failure, writes JSON to stdout and
human status to stderr, and returns a distinct code when it examined nothing — a clean exit from
a script that found nothing to inspect is not a pass.

```bash
python3 scripts/check_contrast.py "#1a1a1a" "#ffffff"      # WCAG ratio and verdict
python3 scripts/check_contrast.py --palette tokens.json     # audit a token set
bash    scripts/audit_design.sh ./src --platform android    # hardcoded values, banned patterns
python3 scripts/check_motion.py ./src                       # durations, easings, reduced motion
```

## Attribution

Original work. Built after studying how production agent skills are structured — including the
Anthropic skills repository and its authoring guidance, and public skill sets covering Android,
Apple design, accessibility, and agent working discipline. No prose, code, or assets were copied
from any of them; platform constants, API names, and WCAG criteria are facts of the underlying
platforms and are cited as such.

Apache-2.0 · Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
<https://github.com/yogvidwankhede/vishwakarma>
