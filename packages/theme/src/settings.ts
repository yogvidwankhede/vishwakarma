// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The theme vocabulary, and the settings that the pre-paint script and the React runtime
 * must agree on.
 *
 * These two halves run at completely different times — one as raw JavaScript inside the
 * document head before React exists, the other inside a component tree several hundred
 * milliseconds later — and they write to the same attribute on the same element. If they
 * disagree about the attribute name or the storage key, the script sets one attribute
 * before paint and React sets a different one afterwards, which produces a permanent,
 * un-debuggable flash on every navigation. That is why the settings live here as one
 * shape, and why both halves take the same partial overrides.
 */

/**
 * A theme that can actually be painted.
 *
 * `system` is deliberately not a member: the DOM attribute must always name a concrete
 * theme, because CSS cannot resolve an intent.
 */
export type ResolvedTheme = 'light' | 'dark'

/**
 * What the user asked for, which is not the same thing as what gets painted.
 *
 * Three states, not a boolean. A boolean can only express "dark: yes or no", which forces
 * the interface to discard the most common preference of all — "follow my operating
 * system". Users on that setting expect the interface to move with them at sunset. Store
 * a boolean and the first time they touch the control you have silently pinned them to
 * whatever the OS happened to be at that moment, with no way back short of clearing site
 * data. The third state is not a nicety; it is the only one that can be un-chosen.
 */
export type ThemePreference = 'system' | ResolvedTheme

/**
 * Interface density.
 *
 * Density changes the spacing and typographic rhythm of a layout. It must never change
 * hit-target sizes: a compact interface with 18px targets fails WCAG 2.2 target size, and
 * the users most likely to enable compact mode — power users on large displays — are not
 * the only ones who will end up with it. Compact means less air, not smaller buttons.
 *
 * There is no `system` state here because no operating system exposes a density
 * preference. Anything claiming otherwise is inferring it from pointer type, which is a
 * different question with a different answer.
 */
export type Density = 'comfortable' | 'compact'

/**
 * Where the persisted choice lives.
 *
 * `localStorage` is the default and is right for almost everyone. `cookie` exists for
 * applications that render the theme attribute on the server: a cookie travels with the
 * request, so the server can emit the correct markup, at the cost of making every HTML
 * response user-specific and therefore uncacheable at the edge. `sessionStorage` forgets
 * the choice when the tab closes, which is occasionally what a kiosk or shared terminal
 * wants and almost never what anybody else wants.
 */
export type ThemeStorageSource = 'localStorage' | 'sessionStorage' | 'cookie'

/** Settings shared by {@link ThemeScript} and {@link ThemeProvider}. */
export interface ThemeSettings {
  /**
   * Attribute written to the document element, e.g. `data-theme="dark"`.
   *
   * The default matches the selector that `@vishwakarma/tokens` emits under its default
   * `attribute` theme strategy, so generated token CSS and this package line up with no
   * configuration. Change one and you must change the other.
   */
  attribute: string
  /** Storage key holding the three-state preference. */
  storageKey: string
  /** Attribute written to the document element for density. */
  densityAttribute: string
  /** Storage key holding the density choice. */
  densityStorageKey: string
  /** Preference to use when nothing has been stored. */
  defaultPreference: ThemePreference
  /** Density to use when nothing has been stored. */
  defaultDensity: Density
  /** Where the choice is persisted. */
  source: ThemeStorageSource
}

/** The default settings. Both halves of the engine start from these. */
export const THEME_SETTINGS: ThemeSettings = {
  attribute: 'data-theme',
  storageKey: 'vk-theme',
  densityAttribute: 'data-density',
  densityStorageKey: 'vk-density',
  defaultPreference: 'system',
  defaultDensity: 'comfortable',
  source: 'localStorage',
}

/** Every valid preference, in the order a three-state control should present them. */
export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark']

/** Every valid density. */
export const DENSITIES: readonly Density[] = ['comfortable', 'compact']

/**
 * Fill in defaults for anything the caller left out.
 *
 * Written as explicit `??` rather than an object spread because an object spread treats an
 * explicitly-passed `undefined` as a value and would overwrite the default with it. In
 * JSX that case is not exotic — `<ThemeScript storageKey={props.key} />` passes `undefined`
 * whenever the parent omits it.
 */
export function resolveSettings(overrides: Partial<ThemeSettings> = {}): ThemeSettings {
  return {
    attribute: overrides.attribute ?? THEME_SETTINGS.attribute,
    storageKey: overrides.storageKey ?? THEME_SETTINGS.storageKey,
    densityAttribute: overrides.densityAttribute ?? THEME_SETTINGS.densityAttribute,
    densityStorageKey: overrides.densityStorageKey ?? THEME_SETTINGS.densityStorageKey,
    defaultPreference: overrides.defaultPreference ?? THEME_SETTINGS.defaultPreference,
    defaultDensity: overrides.defaultDensity ?? THEME_SETTINGS.defaultDensity,
    source: overrides.source ?? THEME_SETTINGS.source,
  }
}

/**
 * Narrow an unknown value — anything read back out of storage is unknown — to a
 * preference.
 *
 * Storage is shared with every other script on the origin, survives deploys, and is
 * trivially editable by the user. A value that was valid in a previous version of the
 * application will still be sitting there after a rename, so parsing has to be total.
 */
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

/** Narrow an unknown value to a resolved theme. */
export function isResolvedTheme(value: unknown): value is ResolvedTheme {
  return value === 'light' || value === 'dark'
}

/** Narrow an unknown value to a density. */
export function isDensity(value: unknown): value is Density {
  return value === 'comfortable' || value === 'compact'
}

/** Collapse a preference and the current system theme into the theme to paint. */
export function resolveTheme(
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme {
  return preference === 'system' ? systemTheme : preference
}
