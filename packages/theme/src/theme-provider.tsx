'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { applyDensity, applyTheme, lockTransitions, readRootAttribute } from './dom.js'
import {
  type Density,
  isDensity,
  isThemePreference,
  type ResolvedTheme,
  resolveSettings,
  resolveTheme,
  type ThemePreference,
  type ThemeSettings,
} from './settings.js'
import { storageFor, type ThemeStorage } from './storage.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'
import { useForcedColors, useSystemTheme } from './use-system-theme.js'

/**
 * The React half of the theme engine.
 *
 * It owns three things the pre-paint script cannot: the preference as state that
 * components can read and change, synchronisation with other tabs, and the write back to
 * the DOM when either of those changes. It does not own the *initial* theme — the script
 * does — and it is careful not to fight it.
 *
 * The hydration rule that shapes everything below: the first client render must produce
 * exactly what the server produced, so the provider deliberately does *not* read storage
 * during render. It starts from the configured default, matching the server, and adopts
 * the stored value in a layout effect immediately afterwards. Reading storage in a
 * `useState` initialiser is the tempting shortcut and it is precisely what causes the
 * hydration mismatch warnings that everyone then papers over with `suppressHydrationWarning`.
 * The user sees no flash from this, because the document already carries the right theme:
 * only React's idea of it is briefly behind, and it catches up before paint.
 */

/** What {@link useTheme} returns. */
export interface ThemeContextValue {
  /** The theme actually being painted. Never `system`. */
  theme: ResolvedTheme
  /** What the user asked for, including `system`. */
  preference: ThemePreference
  /** Change the preference and persist it. */
  setPreference: (preference: ThemePreference) => void
  /** What the operating system currently prefers, regardless of the user's choice here. */
  systemTheme: ResolvedTheme
  /** The current density. */
  density: Density
  /** Change the density and persist it. */
  setDensity: (density: Density) => void
  /** Whether the platform is overriding colours entirely. See {@link useForcedColors}. */
  forcedColors: boolean
  /**
   * Whether the client has taken over and the values above reflect stored state.
   *
   * `false` during server rendering and for the first client render. Gate any output that
   * would differ between the two on this rather than on `typeof window`, which lies during
   * hydration.
   */
  hydrated: boolean
  /** The resolved settings, so descendants can address the same attributes and keys. */
  settings: ThemeSettings
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export interface ThemeProviderProps extends Partial<ThemeSettings> {
  children: ReactNode
  /**
   * Where to persist the choice. Defaults to the store named by `source`.
   *
   * Injecting a store that is not backed by the same key the pre-paint script reads —
   * a server-side account preference, say — means the script cannot see the choice and the
   * user gets a flash on first paint of every page. If you inject, either keep a mirror in
   * `localStorage` under `storageKey` or render the attribute from the server instead.
   */
  storage?: ThemeStorage
  /**
   * Suppress CSS transitions for the duration of the swap. On by default; see
   * {@link lockTransitions} for why.
   */
  suppressTransitions?: boolean
}

/**
 * Memoise the settings on their fields rather than on the object.
 *
 * A fresh object literal every render would invalidate every effect below it on every
 * render, which for the apply effect means re-reading and rewriting the document element
 * continuously.
 */
function useResolvedSettings(overrides: Partial<ThemeSettings>): ThemeSettings {
  const {
    attribute,
    storageKey,
    densityAttribute,
    densityStorageKey,
    defaultPreference,
    defaultDensity,
    source,
  } = overrides

  return useMemo(
    () =>
      resolveSettings({
        attribute,
        storageKey,
        densityAttribute,
        densityStorageKey,
        defaultPreference,
        defaultDensity,
        source,
      }),
    [
      attribute,
      storageKey,
      densityAttribute,
      densityStorageKey,
      defaultPreference,
      defaultDensity,
      source,
    ],
  )
}

/**
 * Provide the theme to a React tree.
 *
 * Must be paired with {@link ThemeScript} in the document head, configured identically.
 * Without the script the provider still works, but the first paint of every page load is
 * the default theme.
 */
export function ThemeProvider({
  children,
  storage,
  suppressTransitions = true,
  ...overrides
}: ThemeProviderProps): ReactNode {
  const settings = useResolvedSettings(overrides)
  const store = useMemo(() => storage ?? storageFor(settings.source), [storage, settings.source])

  const [preference, setPreferenceState] = useState<ThemePreference>(settings.defaultPreference)
  const [density, setDensityState] = useState<Density>(settings.defaultDensity)
  const [hydrated, setHydrated] = useState(false)

  const systemTheme = useSystemTheme()
  const forcedColors = useForcedColors()
  const theme = resolveTheme(preference, systemTheme)

  // Adopt the persisted choice. Runs once per store, in a layout effect so that the
  // adoption and the re-render it triggers both complete before the browser paints.
  useIsomorphicLayoutEffect(() => {
    const storedPreference = store.read(settings.storageKey)
    if (isThemePreference(storedPreference)) setPreferenceState(storedPreference)

    const storedDensity = store.read(settings.densityStorageKey)
    if (isDensity(storedDensity)) setDensityState(storedDensity)

    setHydrated(true)
  }, [store, settings.storageKey, settings.densityStorageKey])

  // Write the theme to the document element.
  //
  // The read-before-write is not an optimisation. On the very first commit the resolved
  // theme can still be based on the server snapshot of the system preference, which
  // `useSyncExternalStore` corrects moments later in the same pre-paint sequence; skipping
  // the write when the document already agrees means the script's correct answer is never
  // briefly replaced by a stale one, and means the transition lock is not engaged for a
  // change that is not happening.
  useIsomorphicLayoutEffect(() => {
    if (readRootAttribute(settings.attribute) === theme) return
    const release = suppressTransitions ? lockTransitions() : null
    applyTheme(theme, settings)
    release?.()
  }, [theme, settings, suppressTransitions])

  useIsomorphicLayoutEffect(() => {
    if (readRootAttribute(settings.densityAttribute) === density) return
    const release = suppressTransitions ? lockTransitions() : null
    applyDensity(density, settings)
    release?.()
  }, [density, settings, suppressTransitions])

  // Follow the choice made in another tab.
  //
  // The `storage` event fires only in documents *other* than the one that made the change,
  // which is why `setPreference` below updates state directly instead of waiting for an
  // event that will never arrive in the tab the user is looking at.
  useEffect(() => {
    const subscribe = store.subscribe
    if (!subscribe) return

    const unsubscribeTheme = subscribe.call(store, settings.storageKey, (value) => {
      setPreferenceState(isThemePreference(value) ? value : settings.defaultPreference)
    })
    const unsubscribeDensity = subscribe.call(store, settings.densityStorageKey, (value) => {
      setDensityState(isDensity(value) ? value : settings.defaultDensity)
    })

    return () => {
      unsubscribeTheme()
      unsubscribeDensity()
    }
  }, [
    store,
    settings.storageKey,
    settings.densityStorageKey,
    settings.defaultPreference,
    settings.defaultDensity,
  ])

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next)
      store.write(settings.storageKey, next)
    },
    [store, settings.storageKey],
  )

  const setDensity = useCallback(
    (next: Density) => {
      setDensityState(next)
      store.write(settings.densityStorageKey, next)
    },
    [store, settings.densityStorageKey],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      preference,
      setPreference,
      systemTheme,
      density,
      setDensity,
      forcedColors,
      hydrated,
      settings,
    }),
    [
      theme,
      preference,
      setPreference,
      systemTheme,
      density,
      setDensity,
      forcedColors,
      hydrated,
      settings,
    ],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Read and change the theme.
 *
 * Throws outside a provider rather than returning a neutral default. A theme control that
 * silently does nothing is far more expensive to diagnose than one that names its missing
 * ancestor the first time it renders, and the failure is always the same mistake:
 * the provider sits below the component in the tree, or on the other side of a route
 * boundary that remounts it.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error(
      'useTheme was called outside a ThemeProvider. Wrap the tree in <ThemeProvider>.',
    )
  }
  return context
}

/** The density half of {@link useTheme}, for components that only care about spacing. */
export function useDensity(): { density: Density; setDensity: (density: Density) => void } {
  const { density, setDensity } = useTheme()
  return { density, setDensity }
}

/**
 * Whether the client has taken over.
 *
 * Use it to defer rendering anything that depends on stored state — a label reading
 * "Dark", say — until after hydration, rather than rendering a guess the server could not
 * have made.
 */
export function useHydrated(): boolean {
  return useTheme().hydrated
}
