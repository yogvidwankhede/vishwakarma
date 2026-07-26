'use client'

import { useCallback, useEffect } from 'react'

/**
 * Announce something to a screen reader without moving focus.
 *
 * ## Why the region has to exist first
 *
 * This is the rule that everything else here follows from, and it is the reason most live
 * regions in the wild silently do nothing.
 *
 * A live region is not a message. It is a *watched node*. When an element with `aria-live`
 * enters the accessibility tree, the platform starts observing it for mutations; when the
 * text inside it subsequently changes, the change is announced. Both halves are required. If
 * the element is inserted with its text already in place — which is what
 * `{message && <div role="alert">{message}</div>}` does — then from the platform's point of
 * view there was never a mutation to observe. Nothing is announced. The code looks right, it
 * passes a static accessibility audit, and it has never once spoken.
 *
 * So this hook creates its regions eagerly, empty, on mount, and only ever writes text into
 * nodes that were already being watched.
 *
 * The same reasoning rules out `display: none` on the region: a hidden node is not in the
 * accessibility tree at all, so it cannot be observed. The regions are visually hidden with
 * the clipping technique instead — see {@link visuallyHiddenStyle}, replicated here because
 * these nodes are created outside React.
 *
 * ## Why identical messages are announced twice
 *
 * Assistive technology deduplicates: writing the same string into a region that already
 * contains it is not a mutation, and "3 results" after "3 results" is silence. The fix is to
 * clear the region and write the message on a later task, which is what the two-step write
 * below does. The delay must be a real task, not a microtask — a promise callback runs before
 * the platform has processed the clear.
 */

const POLITE = 'vk-live-polite'
const ASSERTIVE = 'vk-live-assertive'

/**
 * How insistent the announcement is.
 *
 * `polite` waits for the user to stop; it is right for almost everything — results counts,
 * "saved", filter changes. `assertive` interrupts whatever the reader is currently saying
 * mid-word, and is only right when the user must act immediately: a session about to expire,
 * an error that discards their work. Using `assertive` for routine feedback makes a screen
 * reader unusable, because the user can never finish hearing anything.
 */
export type Politeness = 'polite' | 'assertive'

const HIDDEN_CSS =
  'position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;' +
  'overflow:hidden;clip-path:inset(50%);white-space:nowrap;'

function ensureRegion(politeness: Politeness): HTMLElement | null {
  if (typeof document === 'undefined') return null

  const id = politeness === 'assertive' ? ASSERTIVE : POLITE
  const existing = document.getElementById(id)
  if (existing) return existing

  const region = document.createElement('div')
  region.id = id
  region.setAttribute('aria-live', politeness)
  // `aria-atomic="true"` makes the reader announce the whole region rather than only the
  // changed part. Without it, replacing "4 results" with "14 results" can be announced as
  // just "1", because that is the character that changed.
  region.setAttribute('aria-atomic', 'true')
  // `role="status"` and `role="alert"` carry implicit live semantics of their own and are
  // better supported than a bare `aria-live` on some older combinations, so both are set.
  region.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status')
  region.style.cssText = HIDDEN_CSS

  document.body.appendChild(region)
  return region
}

export interface LiveRegionOptions {
  /** Default politeness for calls to `announce` that do not specify one. */
  politeness?: Politeness
  /**
   * Milliseconds between clearing the region and writing the message.
   *
   * A small delay is required, not cosmetic — see the note above about deduplication. 60ms
   * is comfortably longer than a frame and short enough that the announcement still feels
   * like a response to the action that caused it.
   */
  delay?: number
}

/**
 * Get a function that announces a message.
 *
 * The regions are shared across every caller and outlive any single component: creating one
 * per component would mean a region that is inserted at the moment it is needed, which is
 * the failure this hook exists to avoid. They are never removed, because they are two empty
 * `div`s and removing them would reintroduce the same race the next time anything announces.
 *
 * ```tsx
 * const announce = useLiveRegion()
 * // after filtering
 * announce(`${results.length} results`)
 * ```
 */
export function useLiveRegion(
  options: LiveRegionOptions = {},
): (message: string, politeness?: Politeness) => void {
  const { politeness: defaultPoliteness = 'polite', delay = 60 } = options

  // Create both regions on mount, well before anything needs to say anything.
  useEffect(() => {
    ensureRegion('polite')
    ensureRegion('assertive')
  }, [])

  return useCallback(
    (message: string, politeness?: Politeness) => {
      const region = ensureRegion(politeness ?? defaultPoliteness)
      if (!region) return

      region.textContent = ''
      window.setTimeout(() => {
        region.textContent = message
      }, delay)
    },
    [defaultPoliteness, delay],
  )
}
