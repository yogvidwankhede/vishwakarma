---
name: vishwakarma
description: >
  Design intelligence for UI, interface, and game development. Use for: "build a UI", "create a
  component", "make this look designed", "does this look good", "review my design", "critique this
  UI", "choose colours", "colour palette", "OKLCh", "add animation", "motion", "transition",
  "make it accessible", "ARIA", "keyboard navigation", "design tokens", "dark mode", "typography
  scale", "font loading", "layout", "grid", "component architecture", "navigation patterns",
  "form validation", "UI copy", "loading state", "empty state", "micro-interaction", "web vitals",
  "render performance", "responsive", "scroll animation", "SEO", "metadata", "elevation",
  "gradient", "surface hierarchy", "multiplayer game", "SharkyNet", "HTML game", "3D assets",
  "GLB", "Three.js", "generate 3D model", or any visual or interface work.
metadata:
  version: "0.2.0"
  author: "Yogvid Wankhede and the Vishwakarma project authors"
---

<!--
  Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
  SPDX-License-Identifier: Apache-2.0
-->

# Vishwakarma — Design Intelligence

Vishwakarma gives Claude real design taste. Every rule states *why* it exists so Claude can
correctly override it when the reason doesn't apply. Colour values are computed (OKLCh), not
described ("make it premium"). Motion timing is derived from intent, not picked from a range.
Design is checkable: each domain has pass conditions, not opinions.

## How to Use This Skill

When a request arrives, identify the primary domain from the table below, then read the
corresponding reference file for that domain's full Design Contract and rules.

| Domain | When to load | Reference |
|---|---|---|
| UI Generation Workflow | Building a page, component, or interface from scratch | `references/ui-generation-workflow.md` |
| Design Judgment | "Does this look good?", any aesthetic decision, make it feel designed | `references/design-judgment.md` |
| Design Review | Critiquing, auditing, or finding problems in an existing UI | `references/design-review.md` |
| Colour Systems | Choosing colours, contrast checks, palettes, OKLCh, player colours | `references/colour-systems.md` |
| Motion Design | Animation, transitions, timing, Motion Grammar, prefers-reduced-motion | `references/motion-design.md` |
| Accessible Components | ARIA, keyboard nav, screen readers, focus management, WCAG | `references/accessible-components.md` |
| Component Architecture | Compound components, typed variants, component APIs, composition | `references/component-architecture.md` |
| Design Tokens | Token architecture, theming pipeline, CSS custom properties, Style Dictionary | `references/design-tokens.md` |
| Information Architecture | Navigation, dashboard hierarchy, IA audits, menu structure | `references/information-architecture.md` |
| Interaction Design | Form validation, error states, state machines, interaction flows | `references/interaction-design.md` |
| Interface Copy | Button labels, error messages, empty states, accessible naming | `references/interface-copy.md` |
| Interface States | Loading, empty, error, skeleton, success — the full state inventory | `references/interface-states.md` |
| Layout Composition | Grid, whitespace, visual hierarchy, overflow, composition patterns | `references/layout-composition.md` |
| Micro-interactions | Hover effects, gesture physics, subtle animations, interaction catalogue | `references/micro-interactions.md` |
| Rendering Performance | Web Vitals, LCP, CLS, React render optimisation, diagnosing slowness | `references/rendering-performance.md` |
| Responsive Architecture | Fluid scales, viewport strategies, breakpoints, viewport test matrix | `references/responsive-architecture.md` |
| Scroll Experiences | Scroll-driven animations, parallax, pinned sequences, CSS scroll | `references/scroll-experiences.md` |
| SEO & Metadata | Next.js metadata, Open Graph, structured data, canonical URLs | `references/seo-and-metadata.md` |
| Surface & Depth | Elevation tokens, shadow systems, gradients, depth hierarchy | `references/surface-and-depth.md` |
| Theming Systems | Dark mode, flash-free theme switching, dark token sets, system preference | `references/theming-systems.md` |
| Typographic Systems | Type scales, font loading, CLS prevention, worked type system | `references/typographic-systems.md` |
| Multiplayer Game Publishing | Browser multiplayer HTML games, SharkyNet, join flows, real-time sync | `references/multiplayer-game-publishing.md` |
| 3D Game Assets | GLB generation, Three.js integration, orientation verification, asset manifests | `references/3d-game-assets.md` |

## Design Contract — Always Active

These constraints apply across all domains. They are errors if violated.

**Colour:** All colours in OKLCh. Never use HSL or RGB for perceptual decisions. Contrast ratio
≥ 4.5:1 for text (WCAG AA), ≥ 3:1 for UI components.

**Motion:** All animation must respect `prefers-reduced-motion`. Collapse to opacity-only when
the media query matches. Never use duration > 500 ms for UI feedback.

**Typography:** Line length 45–75 ch for body. Minimum 16px base on mobile. Never use `px`
for font sizes in component libraries — use `rem`.

**Spacing:** Use a 4px base grid. All spacing values multiples of 4.

**Touch targets:** Minimum 44×44 px on mobile for any interactive element.

**Mechanism rule:** Every design decision in the references states the mechanism (why it works).
When the mechanism doesn't apply to the user's context, override the rule and explain why.
