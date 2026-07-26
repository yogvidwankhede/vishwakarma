'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEventCallback } from './use-event-callback.js'

/**
 * One state API that serves both controlled and uncontrolled consumers.
 *
 * Every primitive here has a piece of state the consumer may or may not want to own: whether
 * a dialog is open, which tab is selected. Writing the component twice is not an option, so
 * the component always reads a single value and always calls a single setter, and this hook
 * decides where the value actually lives.
 *
 * The rule is the one React established for form inputs: `value === undefined` means the
 * consumer is not controlling this, and internal state is authoritative. Anything else,
 * including `null`, means the consumer is controlling it, and the prop is authoritative.
 * `null` is a legitimate value — "no tab selected" — so it cannot double as "uncontrolled".
 *
 * ## The trap
 *
 * Switching modes mid-life is the failure this hook exists to make visible. It happens by
 * accident, not by design, and it always looks the same:
 *
 * ```tsx
 * <Dialog open={someQuery.data?.isOpen} onOpenChange={setOpen} />
 * ```
 *
 * While the query is loading, `open` is `undefined` and the dialog is uncontrolled, so it
 * opens and closes by itself and ignores the parent entirely. When the data arrives the prop
 * becomes defined and the dialog silently switches to controlled — discarding whatever the
 * user did in the meantime, and jumping to the server's idea of the state. The reverse
 * (defined, then `undefined` on a later render) is worse: internal state resumes from
 * `defaultValue`, which is usually the initial value from mount, so the component appears to
 * jump backwards in time.
 *
 * Neither direction throws, and neither produces a React warning of its own, so we emit one.
 * The fix is always to stabilise the prop at the call site — `open={data?.isOpen ?? false}`,
 * or don't render the component until the data is there.
 */
export interface ControllableStateOptions<T> {
  /**
   * The controlled value. Pass `undefined` — consistently, for the component's whole life —
   * to let the component own the state.
   */
  value?: T | undefined
  /** The starting value when uncontrolled. Ignored entirely when `value` is supplied. */
  defaultValue: T
  /**
   * Called whenever the value should change, in both modes.
   *
   * In controlled mode this is the only way the value ever changes; ignoring it means the
   * component appears frozen, which is a legitimate thing to do deliberately (a dialog that
   * refuses to close while a form is dirty) and a very confusing thing to do by accident.
   */
  onChange?: (value: T) => void
  /** A name used in the mode-switch warning, so the message points at a component. */
  name?: string
}

/**
 * Read and write a value that may or may not be owned by the consumer.
 *
 * Returns the current value and a setter that accepts a value or an updater function, in the
 * same shape as `useState`, so call sites do not have to know which mode they are in.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
  name = 'Component',
}: ControllableStateOptions<T>): [T, (next: T | ((previous: T) => T)) => void] {
  const [uncontrolled, setUncontrolled] = useState<T>(defaultValue)

  const isControlled = value !== undefined
  const current = isControlled ? value : uncontrolled

  const emit = useEventCallback(onChange)

  // The authoritative "previous value" for updater functions. It is kept in a ref rather
  // than read from the closure because the setter's identity has to be stable — consumers
  // put it in dependency arrays and pass it to memoised children — so it cannot close over
  // a value that changes every render.
  const latest = useRef(current)
  const controlledRef = useRef(isControlled)

  useEffect(() => {
    latest.current = current
    controlledRef.current = isControlled
  })

  const previouslyControlled = useRef(isControlled)
  useEffect(() => {
    if (previouslyControlled.current === isControlled) return
    previouslyControlled.current = isControlled

    // Deliberately not gated behind a build-time development flag. This package ships as
    // plain ESM to bundlers that may not define one, and a component that has quietly
    // stopped listening to its own props is worth a line in a production console.
    console.error(
      `${name}: switched between controlled and uncontrolled state. ` +
        'The `value` prop changed to or from `undefined` after the first render, so the ' +
        'component has changed which copy of the state it believes. Give `value` a defined ' +
        'value on every render, or omit it on every render.',
    )
  }, [isControlled, name])

  const setState = useCallback(
    (next: T | ((previous: T) => T)) => {
      const previous = latest.current
      // The cast is unavoidable: `T` may itself be a function type, and TypeScript cannot
      // distinguish "T that happens to be callable" from "updater for T" at runtime. This is
      // the same ambiguity `useState` has, resolved the same way.
      const resolved =
        typeof next === 'function' ? (next as (previous: T) => T)(previous) : (next as T)

      if (Object.is(resolved, previous)) return

      if (controlledRef.current) {
        // No optimistic write to `latest` here. In controlled mode the consumer decides
        // whether the change happens at all, and pretending it did would leave the ref
        // permanently ahead of the prop the moment a consumer rejects a change.
        emit(resolved)
        return
      }

      latest.current = resolved
      setUncontrolled(resolved)
      emit(resolved)
    },
    [emit],
  )

  return [current, setState]
}
