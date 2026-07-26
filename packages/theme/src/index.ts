// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/theme
 *
 * The runtime theme engine.
 *
 * It is built around one uncomfortable fact: the theme a user wants is stored on their
 * machine, and the server that renders the first paint cannot see it. Everything else
 * follows from that. There is a pre-paint script because nothing else runs early enough to
 * fix it; there is a three-state preference because two states cannot express "follow my
 * system"; there is a storage abstraction that swallows every exception because a theme
 * toggle has no business taking an application down; and the React layer is written to
 * catch up with the DOM rather than to fight it, because the script got there first and
 * the script was right.
 *
 * The two halves — {@link ThemeScript} in the document head and {@link ThemeProvider} in
 * the tree — must be configured identically. Declare the settings once and spread them
 * into both.
 */

export { applyDensity, applyTheme, lockTransitions, readRootAttribute } from './dom.js'
export {
  DENSITIES,
  type Density,
  isDensity,
  isResolvedTheme,
  isThemePreference,
  type ResolvedTheme,
  resolveSettings,
  resolveTheme,
  THEME_PREFERENCES,
  THEME_SETTINGS,
  type ThemePreference,
  type ThemeSettings,
  type ThemeStorageSource,
} from './settings.js'
export {
  type CookieStorageOptions,
  createCookieStorage,
  createLocalStorage,
  createMemoryStorage,
  createSessionStorage,
  nullStorage,
  storageFor,
  type ThemeStorage,
} from './storage.js'
export {
  type ThemeContextValue,
  ThemeProvider,
  type ThemeProviderProps,
  useDensity,
  useHydrated,
  useTheme,
} from './theme-provider.js'
export {
  resolvePreparedTheme,
  ThemeScript,
  type ThemeScriptProps,
  themeScriptSource,
} from './theme-script.js'
export {
  DensityToggle,
  type DensityToggleProps,
  ThemeToggle,
  type ThemeToggleOptionState,
  type ThemeToggleProps,
} from './theme-toggle.js'
export { TokenStyles, type TokenStylesProps } from './token-styles.js'
export { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'
export {
  useForcedColors,
  useMediaQuery,
  usePrefersMoreContrast,
  useSystemTheme,
} from './use-system-theme.js'
