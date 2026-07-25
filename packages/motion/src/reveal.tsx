'use client'

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react'
import type { MotionDistance, MotionIntent } from '@vishwakarma/core'
import { useMotion } from './use-motion.js'
import { useReducedMotion } from './use-reduced-motion.js'

/**
 * Scroll reveals, done so that they cannot hide your content.
 *
 * Almost every reveal implementation in the wild has the same latent bug: the element
 * starts at `opacity: 0` in the markup, and JavaScript is responsible for making it
 * visible. When the observer does not fire — a JavaScript error earlier on the page, a
 * blocked bundle, a browser extension, a crawler, a text-mode browser, a hydration
 * mismatch — the content stays invisible forever. The page has not degraded; it has
 * disappeared.
 *
 * The fix is to invert the responsibility. The markup renders visible. A tiny blocking
 * script sets a flag on the document, and the hiding CSS is scoped to that flag. If the
 * script never runs, or the bundle never loads, nothing is ever hidden and the page is
 * merely un-animated — which is the correct failure mode.
 *
 * The script must be inline and must run before first paint, so {@link RevealStyles} has
 * to be rendered in the document head or at the very top of the body.
 */

const FLAG = 'data-vk-reveal-ready'

/**
 * The blocking script and base styles that make reveals safe.
 *
 * Render this once, as high in the document as possible. The script is deliberately tiny
 * and synchronous: it sets one attribute. Anything larger would be a render-blocking cost
 * that a reveal effect does not justify.
 *
 * It also checks the reduced-motion preference at the same moment, so a user who asked for
 * calm never has content hidden from them in the first place — rather than having it
 * hidden and then immediately shown, which is itself a flash.
 */
export function RevealStyles({ nonce }: { nonce?: string } = {}): ReactNode {
  const script = `(function(){try{if(!window.matchMedia||!window.matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.setAttribute("${FLAG}","")}}catch(e){}})()`

  const css = `
[${FLAG}] [data-vk-reveal]:not([data-vk-revealed]) {
  opacity: 0;
  transform: var(--vk-reveal-from, translate3d(0, 12px, 0));
}
[data-vk-reveal] {
  will-change: opacity, transform;
}
[data-vk-revealed] {
  will-change: auto;
}
@media (prefers-reduced-motion: reduce) {
  [${FLAG}] [data-vk-reveal]:not([data-vk-revealed]) {
    opacity: 1;
    transform: none;
  }
}`.trim()

  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a synchronous pre-paint script cannot be expressed any other way, and the content is a fixed literal with no interpolation. */}
      <script {...(nonce ? { nonce } : {})} dangerouslySetInnerHTML={{ __html: script }} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static stylesheet text, no interpolation. */}
      <style {...(nonce ? { nonce } : {})} dangerouslySetInnerHTML={{ __html: css }} />
    </>
  )
}

export interface RevealProps {
  children: ReactNode
  /** Element to render. Defaults to a div. */
  as?: ElementType
  /** Direction the element travels in from. */
  from?: 'below' | 'above' | 'left' | 'right' | 'none'
  /** How far it travels. Larger distances get proportionally longer durations. */
  distance?: MotionDistance
  /** Travel distance in px. Overrides the value derived from `distance`. */
  offset?: number
  /** Also scale in from slightly smaller. Use sparingly. */
  scale?: boolean
  /** How much of the element must be visible before revealing, 0..1. */
  threshold?: number
  /**
   * Margin around the viewport for the intersection test. A negative bottom value delays
   * the reveal until the element is properly in view rather than just clipping the edge.
   */
  rootMargin?: string
  /** Delay before revealing, in ms. */
  delay?: number
  /**
   * Re-hide when scrolled out of view.
   *
   * Off by default, and it should usually stay off. Content that fades out when you scroll
   * past and fades back when you return is distracting, and it breaks find-in-page —
   * the browser scrolls to a match that is at zero opacity.
   */
  repeat?: boolean
  className?: string
  style?: CSSProperties
}

const OFFSETS: Record<NonNullable<RevealProps['from']>, (px: number) => string> = {
  below: (px) => `translate3d(0, ${px}px, 0)`,
  above: (px) => `translate3d(0, -${px}px, 0)`,
  left: (px) => `translate3d(-${px}px, 0, 0)`,
  right: (px) => `translate3d(${px}px, 0, 0)`,
  none: () => 'none',
}

const DISTANCE_PX: Record<MotionDistance, number> = {
  micro: 4,
  short: 8,
  medium: 12,
  long: 24,
  full: 40,
}

/**
 * Reveal an element as it enters the viewport.
 *
 * Uses `IntersectionObserver` rather than a scroll listener. A scroll handler that measures
 * element positions forces synchronous layout on every scroll event, which is the single
 * most common cause of scroll jank in otherwise well-built pages. The observer does the
 * same work off the main thread and tells you only when the answer changes.
 */
export function Reveal({
  children,
  as: Component = 'div',
  from = 'below',
  distance = 'medium',
  offset,
  scale = false,
  threshold = 0.15,
  rootMargin = '0px 0px -10% 0px',
  delay = 0,
  repeat = false,
  className,
  style,
}: RevealProps): ReactNode {
  const ref = useRef<HTMLElement | null>(null)
  const [revealed, setRevealed] = useState(false)
  const prefersReduced = useReducedMotion()
  const motion = useMotion({ intent: 'enter', distance, delay })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // No observer support means no reveal, and the CSS flag guarantees the content is
    // already visible in that case. Nothing to do.
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }

    if (prefersReduced) {
      setRevealed(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true)
            // A one-shot reveal has no further use for the observer, and leaving it
            // attached across hundreds of elements is a real cost on long pages.
            if (!repeat) observer.disconnect()
          } else if (repeat) {
            setRevealed(false)
          }
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, rootMargin, repeat, prefersReduced])

  const travel = offset ?? DISTANCE_PX[distance]
  const fromTransform = OFFSETS[from](travel)
  const scaleSuffix = scale ? ' scale(0.98)' : ''

  const combinedStyle: CSSProperties = {
    ...style,
    // Exposed as a custom property so the pre-paint CSS can apply the same starting
    // transform without JavaScript having computed it yet.
    ['--vk-reveal-from' as string]: from === 'none' ? 'none' : `${fromTransform}${scaleSuffix}`,
    transitionProperty: 'opacity, transform',
    transitionDuration: `${motion.durationMs}ms`,
    transitionTimingFunction: motion.cssEasing,
    transitionDelay: `${motion.delayMs}ms`,
    ...(revealed ? { opacity: 1, transform: 'none' } : {}),
  }

  const attributes: Record<string, string> = { 'data-vk-reveal': '' }
  if (revealed) attributes['data-vk-revealed'] = ''

  return (
    <Component ref={ref} className={className} style={combinedStyle} {...attributes}>
      {children}
    </Component>
  )
}

export interface RevealGroupProps extends Omit<RevealProps, 'children' | 'delay'> {
  children: ReactNode
  /** Delay between consecutive children, in ms. */
  step?: number
  /** Where the wave begins. */
  order?: 'first' | 'last' | 'centre' | 'edges'
  /** Cap on the total stagger span, in ms. */
  maxTotal?: number
}

/**
 * Reveal a group of children as one gesture.
 *
 * The whole group shares a single observer on the container rather than one per child.
 * That is both cheaper and more correct: staggering exists to imply that these items are
 * related and ordered, and per-child observers break that by making the stagger depend on
 * scroll speed rather than on the group's structure.
 */
export function RevealGroup({
  children,
  step = 34,
  order = 'first',
  maxTotal = 420,
  ...revealProps
}: RevealGroupProps): ReactNode {
  const items = Children.toArray(children).filter(isValidElement)
  const prefersReduced = useReducedMotion()

  const delayFor = useCallback(
    (index: number): number => {
      if (prefersReduced) return 0
      const count = items.length
      if (count <= 1) return 0

      const rank =
        order === 'last'
          ? count - 1 - index
          : order === 'centre'
            ? Math.abs(index - (count - 1) / 2)
            : order === 'edges'
              ? (count - 1) / 2 - Math.abs(index - (count - 1) / 2)
              : index

      const maxRank = order === 'centre' || order === 'edges' ? (count - 1) / 2 : count - 1
      const uncompressed = maxRank * step
      const factor = uncompressed > maxTotal ? maxTotal / uncompressed : 1
      return Math.round(rank * step * factor)
    },
    [items.length, order, step, maxTotal, prefersReduced],
  )

  return (
    <>
      {items.map((child, index) => (
        <Reveal key={child.key ?? index} {...revealProps} delay={delayFor(index)}>
          {child}
        </Reveal>
      ))}
    </>
  )
}

export interface TransitionProps {
  /** Whether the content should be present. */
  show: boolean
  children: ReactNode
  intent?: MotionIntent
  distance?: MotionDistance
  as?: ElementType
  className?: string
  style?: CSSProperties
  /** Remove from the DOM once the exit finishes. */
  unmountOnExit?: boolean
}

/**
 * Show and hide content with matched entrance and exit.
 *
 * The exit is resolved from the `exit` intent rather than by replaying the entrance
 * backwards, which is what produces the two most common errors in interface motion: an
 * exit that takes as long as the entrance, and an exit that uses a decelerating curve. Both
 * read as sluggishness, because the user has already decided and is now waiting for the
 * interface to catch up.
 */
export function Transition({
  show,
  children,
  intent = 'enter',
  distance = 'short',
  as: Component = 'div',
  className,
  style,
  unmountOnExit = true,
}: TransitionProps): ReactNode {
  const [mounted, setMounted] = useState(show)
  const [visible, setVisible] = useState(show)

  const enter = useMotion({ intent, distance })
  const exit = useMotion({ intent: 'exit', distance })

  useEffect(() => {
    if (show) {
      setMounted(true)
      // Two frames, not one. A single frame is enough for the element to be in the DOM but
      // not reliably enough for the browser to have computed its initial style, so the
      // transition sometimes fails to start and the element simply appears.
      const outer = requestAnimationFrame(() => {
        const inner = requestAnimationFrame(() => setVisible(true))
        return inner
      })
      return () => cancelAnimationFrame(outer)
    }

    setVisible(false)
    if (!unmountOnExit) return

    const timer = setTimeout(() => setMounted(false), exit.durationMs + exit.delayMs)
    return () => clearTimeout(timer)
  }, [show, unmountOnExit, exit.durationMs, exit.delayMs])

  if (!mounted && unmountOnExit) return null

  const active = visible ? enter : exit

  return (
    <Component
      className={className}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translate3d(0, 4px, 0)',
        transitionProperty: 'opacity, transform',
        transitionDuration: `${active.durationMs}ms`,
        transitionTimingFunction: active.cssEasing,
        pointerEvents: visible ? undefined : 'none',
      }}
      {...(visible ? {} : { 'aria-hidden': true })}
    >
      {children}
    </Component>
  )
}
