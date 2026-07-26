/**
 * Class fragments shared by every interactive component.
 *
 * They live in one place because each of them encodes a decision that is expensive to
 * rediscover, and because a design system whose focus ring is written out thirty times has
 * thirty focus rings.
 */

/**
 * The focus indicator.
 *
 * Two decisions worth keeping.
 *
 * It is an `outline`, not a `box-shadow` ring. Outlines survive Windows High Contrast Mode
 * and any other forced-colours setting, where box shadows are stripped entirely — so a
 * shadow-based ring leaves exactly the users who most depend on a visible focus indicator
 * with none at all. Outlines also follow `border-radius` in every current browser, which was
 * the original reason people reached for shadows.
 *
 * And it never sets `outline: none`. Resetting the outline and then re-adding it on
 * `:focus-visible` looks equivalent and is not: between the reset and the re-add sits every
 * state the author did not think of, and the forced-colours fallback is gone for all of them.
 * We only ever *add*.
 */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'

/**
 * Focus styling for a container that indicates focus on behalf of a descendant — a card
 * holding a single link, for instance.
 *
 * Keyed on `:has(:focus-visible)` rather than `:focus-within`, because `:focus-within`
 * matches on pointer focus too and the card would light up on every click.
 */
export const focusWithinRing =
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus-ring'

/**
 * Enlarge the pointer target to at least 44x44 CSS pixels without changing layout.
 *
 * WCAG 2.2 asks for 24x24 as a minimum and every platform human-interface guideline asks for
 * something near 44. Meeting that by growing the control makes small, dense interfaces
 * impossible, so instead a centred pseudo-element extends the hit area past the visible box.
 * The pseudo-element participates in hit testing on the control's behalf and generates no
 * layout box in flow, so nothing moves.
 *
 * The consequence to remember: enlarged areas of adjacent controls can overlap, and the
 * later sibling wins the overlap. Space rows of icon-only controls by at least `gap-1`, or
 * the left edge of one button quietly steals taps from the right edge of its neighbour.
 */
export const tapTarget =
  'relative after:absolute after:left-1/2 after:top-1/2 after:h-[max(100%,2.75rem)] after:w-[max(100%,2.75rem)] after:-translate-x-1/2 after:-translate-y-1/2 after:content-[""]'

/**
 * Disabled appearance.
 *
 * Deliberately not "fade the label until it disappears". A disabled control the user cannot
 * read is a control they cannot ask a colleague about, cannot search the documentation for,
 * and cannot report accurately in a support ticket — and the usual `opacity-50` on small
 * grey text lands well under 3:1. So the label stays legible, and unavailability is carried
 * by desaturation, the cursor, and `aria-disabled`, which is the part that actually reaches
 * assistive technology.
 */
export const disabledSurface =
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-75 aria-disabled:saturate-50 aria-disabled:shadow-none'

/**
 * Suppress transitions for users who asked for reduced motion.
 *
 * Applied as a class rather than read through a hook wherever the animation is expressed in
 * CSS, because a class is correct during server rendering and before hydration, and a hook
 * is not.
 */
export const calmMotion = 'motion-reduce:transition-none motion-reduce:animate-none'
