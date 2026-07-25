'use client'

import { useEffect, useLayoutEffect } from 'react'

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * The theme has to be written to the DOM in a layout effect rather than a passive one:
 * passive effects run after the browser has painted, so any correction made there is a
 * visible flash by construction. But React logs a warning when `useLayoutEffect` appears
 * during server rendering, since it cannot run there and the warning is usually pointing
 * at a real bug. Here it is not — the effect exists precisely to do the thing that only a
 * browser can do — so the choice is made at module scope, where it is decided once rather
 * than re-evaluated per render.
 *
 * The branch is on `window` rather than on a render-time signal, so it is stable for the
 * life of the module and cannot change the hook order between renders.
 */
export const useIsomorphicLayoutEffect: typeof useLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect
