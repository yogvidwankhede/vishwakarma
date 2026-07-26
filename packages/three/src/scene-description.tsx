'use client'

import {
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useId,
  useState,
} from 'react'

/**
 * The accessibility pattern for anything rendered into a canvas.
 *
 * A canvas is a single opaque element. Screen readers see one node with no children, no
 * text and no structure, whatever is painted inside it. There is no equivalent of alt text
 * that the renderer can infer, no DOM to traverse, and no amount of care taken over the
 * geometry changes that. So the rule is unconditional: **every piece of information the
 * scene conveys must also exist as text**. If the model is the product, the specification
 * has to be readable. If the visualisation shows a trend, the trend has to be stated. If
 * the scene is purely decorative, say so — and then it needs no description at all, only
 * `aria-hidden`.
 *
 * The useful test is to load the page with the canvas element deleted. Everything a user
 * would have learned from it should still be obtainable. If it is not, the scene is
 * carrying content that some of your users cannot reach, and the fix is content, not ARIA.
 *
 * The second half is keyboard operation. A scene the user can rotate with a mouse and not
 * with a keyboard is a control that exists for some people and not others. When
 * {@link AccessibleScene} is marked interactive it becomes a focus stop with a visible
 * focus indicator, announces itself as a 3D viewer, exposes its key bindings as text, and
 * reports arrow-key input as camera deltas for the application to apply. That last part is
 * a callback rather than an implementation because the control scheme belongs to the scene,
 * and a keyboard contract bolted on top of somebody else's orbit controls fights them.
 */

/**
 * Hide content visually while leaving it available to assistive technology.
 *
 * `display: none` and `visibility: hidden` both remove the node from the accessibility tree
 * as well as from the page, which defeats the entire purpose. The clip-path-and-one-pixel
 * approach below is verbose precisely because it is the only combination that survives
 * every browser without also breaking text selection or causing scroll jumps when a
 * descendant receives focus.
 */
export const VISUALLY_HIDDEN: CSSProperties = Object.freeze({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
})

/** Camera deltas produced by keyboard input, in radians and unitless zoom steps. */
export interface OrbitDelta {
  /** Horizontal rotation. Positive is to the right, from the viewer's perspective. */
  azimuth: number
  /** Vertical rotation. Positive is upwards. */
  polar: number
  /** Zoom step. Positive moves the camera closer. */
  zoom: number
}

export interface AccessibleSceneProps {
  /** The canvas, or whatever renders it. */
  children: ReactNode
  /**
   * A short name for the scene, used as its accessible name. Describe what it *is*, not
   * that it is 3D — "Herman Miller Aeron chair, front three-quarter view", not "3D model".
   */
  label: string
  /**
   * The textual equivalent of the scene's content.
   *
   * Rendered into the accessibility tree, and visible on screen when `showDescription` is
   * set. Anything the scene teaches a sighted user belongs here. Omit it only when the
   * scene is decorative, in which case set `decorative` instead.
   */
  description?: ReactNode
  /**
   * Mark the scene as conveying nothing.
   *
   * Applies `aria-hidden` and removes it from the tree entirely. Honest and correct for a
   * background effect; badly wrong for anything a user is expected to look at, and it is
   * the shortcut people reach for when writing the description feels like work.
   */
  decorative?: boolean
  /** Whether the user can manipulate the scene. Makes it a focus stop. */
  interactive?: boolean
  /**
   * Called on arrow-key, page-key and +/- input while the scene has focus.
   *
   * Wire it to whatever drives the camera. Returning without doing anything is fine; the
   * scene simply stays still, which is better than the key doing something unexpected.
   */
  onOrbit?: (delta: OrbitDelta) => void
  /** Radians per arrow-key press. */
  keyboardStep?: number
  /** Show the description on screen as well as exposing it. */
  showDescription?: boolean
  /** Instructions announced to keyboard users. A sensible default is supplied. */
  instructions?: string
  className?: string
  style?: CSSProperties
}

const DEFAULT_INSTRUCTIONS =
  'Use the arrow keys to rotate the view, plus and minus to zoom, and Home to reset.'

/**
 * Compute the camera delta for a key.
 *
 * Split out so the contract is testable and so an application can reuse the same bindings
 * for on-screen buttons — which are worth adding, because a keyboard-only contract still
 * leaves out anyone using a touch screen with a switch or voice control.
 */
export function orbitDeltaForKey(key: string, step: number): OrbitDelta | null {
  switch (key) {
    case 'ArrowLeft':
      return { azimuth: -step, polar: 0, zoom: 0 }
    case 'ArrowRight':
      return { azimuth: step, polar: 0, zoom: 0 }
    case 'ArrowUp':
      return { azimuth: 0, polar: step, zoom: 0 }
    case 'ArrowDown':
      return { azimuth: 0, polar: -step, zoom: 0 }
    case 'PageUp':
      return { azimuth: 0, polar: 0, zoom: 1 }
    case 'PageDown':
      return { azimuth: 0, polar: 0, zoom: -1 }
    case '+':
    case '=':
      return { azimuth: 0, polar: 0, zoom: 1 }
    case '-':
    case '_':
      return { azimuth: 0, polar: 0, zoom: -1 }
    case 'Home':
      // A reset, expressed as zeroes. The scene distinguishes it by the key, not the delta,
      // so applications that do not implement reset simply do nothing — which is safe.
      return { azimuth: 0, polar: 0, zoom: 0 }
    default:
      return null
  }
}

/**
 * Wrap a canvas so that it has a name, a textual equivalent and keyboard operation.
 *
 * Renders a plain element around the scene rather than putting ARIA on the canvas itself.
 * Attributes set directly on a canvas that a renderer owns are liable to be overwritten
 * when the renderer resizes or recreates it, and the failure is silent — the scene looks
 * identical and has simply stopped being announced.
 */
export function AccessibleScene({
  children,
  label,
  description,
  decorative = false,
  interactive = false,
  onOrbit,
  keyboardStep = 0.15,
  showDescription = false,
  instructions = DEFAULT_INSTRUCTIONS,
  className,
  style,
}: AccessibleSceneProps): ReactNode {
  const descriptionId = useId()
  const instructionsId = useId()
  const [focusRing, setFocusRing] = useState(false)

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (!interactive || !onOrbit) return
      const delta = orbitDeltaForKey(event.key, keyboardStep)
      if (!delta) return
      // Only claim the key once we know we handle it. Swallowing arrow keys unconditionally
      // steals page scrolling from anyone who tabs through the scene on the way past.
      event.preventDefault()
      onOrbit(delta)
    },
    [interactive, onOrbit, keyboardStep],
  )

  const onFocus = useCallback((event: FocusEvent<HTMLDivElement>): void => {
    // Show the ring only for keyboard focus. `:focus-visible` cannot be expressed inline,
    // so it is queried directly; browsers that reject the selector get the ring always,
    // which is the safe direction — an occasional unwanted outline beats an invisible
    // focus position.
    try {
      setFocusRing(event.currentTarget.matches(':focus-visible'))
    } catch {
      setFocusRing(true)
    }
  }, [])

  const onBlur = useCallback((): void => setFocusRing(false), [])

  if (decorative) {
    return (
      <div className={className} style={style} aria-hidden="true">
        {children}
      </div>
    )
  }

  const describedBy = [description ? descriptionId : null, interactive ? instructionsId : null]
    .filter((value): value is string => value !== null)
    .join(' ')

  return (
    <div
      className={className}
      style={{
        ...style,
        position: style?.position ?? 'relative',
        outline: focusRing ? '2px solid var(--vk-focus-ring, currentColor)' : undefined,
        outlineOffset: focusRing ? '2px' : undefined,
      }}
      // `img` rather than `application`: the scene is a picture with a description, and
      // `application` suppresses the screen reader's own navigation keys, which trades one
      // set of shortcuts the user knows for another set they do not.
      role="img"
      aria-label={label}
      aria-roledescription={interactive ? 'interactive 3D scene' : undefined}
      {...(describedBy ? { 'aria-describedby': describedBy } : {})}
      {...(interactive ? { tabIndex: 0 } : {})}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {children}
      {description ? (
        <div id={descriptionId} style={showDescription ? undefined : VISUALLY_HIDDEN}>
          {description}
        </div>
      ) : null}
      {interactive ? (
        <div id={instructionsId} style={VISUALLY_HIDDEN}>
          {instructions}
        </div>
      ) : null}
    </div>
  )
}

export interface SceneDescriptionProps {
  children: ReactNode
  /** Render the text on screen as well. Consider doing this; see below. */
  visible?: boolean
  id?: string
  className?: string
}

/**
 * A standalone textual equivalent, for scenes wired up by hand.
 *
 * Worth considering with `visible` set. A caption under a 3D viewer that states what the
 * viewer shows helps far more people than the ones it is required for: anybody on a slow
 * connection watching the fallback, anybody who has scrolled past before the scene loaded,
 * and anybody trying to work out what they are meant to be looking at.
 */
export function SceneDescription({
  children,
  visible = false,
  id,
  className,
}: SceneDescriptionProps): ReactNode {
  return (
    <div id={id} className={className} style={visible ? undefined : VISUALLY_HIDDEN}>
      {children}
    </div>
  )
}
