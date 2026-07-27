# Structured critique protocol

Run this after building and before reporting completion. It takes a few minutes and
catches most of what a designer would catch in a first review.

## Pass 1 — Squint

Blur the interface, mentally or literally. What remains visible is the hierarchy the user
actually perceives.

- If several elements remain equally prominent, rank them and increase the differences.
- If nothing remains prominent, the page has no focal point. Choose one.
- If something unimportant remains prominent — a decorative image, a large empty card — it
  is stealing attention that belongs elsewhere.

## Pass 2 — Measure

Extract the actual numbers rather than trusting appearance.

- List every distinct spacing value. Values that are close but unequal are errors.
- List every distinct font size. More than six on one screen is too many.
- List every distinct border radius. More than three is usually too many.
- Compute the ratio of section separation to element separation. Below 3:1, the page reads
  flat.

## Pass 3 — Contrast

- Check every text-on-background pair against 4.5:1 for body and 3:1 for large text.
- Check interactive boundaries — borders, focus rings, icon buttons — against 3:1. These
  are the ones that are usually missed.
- Check the focus indicator against both the component and the page background.
- Verify that no state is communicated by colour alone.

## Pass 4 — Content stress

- Replace every string with one three times longer.
- Replace every list with an empty one.
- Replace every list with one containing fifty items.
- Remove every image.
- Set a number to 999,999.

Anything that breaks was going to break in production.

## Pass 5 — Viewport sweep

Check 320px, 768px, 1024px, and 1440px, plus 200% browser zoom at 1280px.

- No horizontal scrolling at any width.
- No text smaller than 14px at any width.
- No interactive target below 44px in either dimension on touch widths.
- Nothing clipped or overlapping at 200% zoom.

## Pass 6 — Keyboard

- Tab through the whole interface. Every interactive element must be reachable.
- The focus indicator must be visible at every stop, against every background it lands on.
- Focus order must match visual order.
- Escape must close anything that opened.
- Focus must be trapped inside modals and returned to the trigger on close.

## Pass 7 — Motion

- Enable reduced-motion and confirm that spatial animation stops while state changes stay
  legible.
- Confirm nothing animates a layout-triggering property.
- Confirm no animation exceeds 600ms.
- Confirm no infinite animation runs outside a genuine loading context.

## Output format

Report findings as a prioritised list, each with the location, the specific problem, and
the exact change. "Increase the gap between the section heading and the first card from
16px to 32px" is useful. "Improve spacing" is not.
