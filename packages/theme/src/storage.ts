// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Persistence for the theme choice.
 *
 * The single most important property of this module is that nothing in it can throw. A
 * theme toggle is a decorative control at the edge of the interface; if it takes the
 * application down, the trade has gone very badly wrong.
 *
 * Web storage throws more often than people expect, and not only in the obvious place.
 * Reading `window.localStorage` — the property access itself, before any method call —
 * throws a `SecurityError` when the document is a third-party iframe with storage access
 * blocked, which is the default in several browsers now. `setItem` throws `QuotaExceeded`
 * when the origin is full, and historically threw on every write in private browsing. So
 * `typeof localStorage !== 'undefined'` is not a sufficient guard: the guard has to be a
 * try/catch around the access, and every operation needs one.
 *
 * When storage is unavailable the correct behaviour is to degrade to "no memory between
 * page loads" rather than to fail. The theme still switches; it just does not persist.
 */

import type { ThemeStorageSource } from './settings.js'

/**
 * The storage contract.
 *
 * Deliberately narrower than the DOM `Storage` interface so that a cookie jar, an
 * in-memory map, a server-side session, or a user account preference can all satisfy it.
 */
export interface ThemeStorage {
  /** Return the stored value, or `null` when absent or unreadable. Must not throw. */
  read(key: string): string | null
  /** Persist a value. Must not throw; silently doing nothing is an acceptable outcome. */
  write(key: string, value: string): void
  /** Remove a value. Must not throw. */
  remove(key: string): void
  /**
   * Observe changes made to this key by *other* documents on the same origin.
   *
   * Optional because not every backing store can be observed. Implementations that cannot
   * observe should omit this rather than fake it with polling: a cross-tab sync that is up
   * to a second late is more confusing than none at all, because the user cannot tell
   * whether the second tab is stale or simply different.
   */
  subscribe?(key: string, onChange: (value: string | null) => void): () => void
}

/**
 * Wrap a DOM `Storage` object, swallowing every failure.
 *
 * The store is fetched lazily on each call rather than captured once, because in a
 * partitioned-storage context the access itself is what throws, and whether it throws can
 * change during the life of the page when the user grants storage access.
 */
function createWebStorage(pick: (window: Window) => Storage): ThemeStorage {
  const store = (): Storage | null => {
    if (typeof window === 'undefined') return null
    try {
      return pick(window)
    } catch {
      return null
    }
  }

  return {
    read(key) {
      try {
        return store()?.getItem(key) ?? null
      } catch {
        return null
      }
    },
    write(key, value) {
      try {
        store()?.setItem(key, value)
      } catch {
        // Quota, private mode, blocked partition. The in-memory state is already updated,
        // so the only thing lost is persistence across reloads.
      }
    },
    remove(key) {
      try {
        store()?.removeItem(key)
      } catch {
        // As above.
      }
    },
    subscribe(key, onChange) {
      if (typeof window === 'undefined') return () => {}

      const handler = (event: StorageEvent): void => {
        // `key === null` means the whole area was cleared — by a sign-out routine, say.
        // Treating that as "no event" is the bug that leaves one tab on a theme the user
        // has just reset everywhere else.
        if (event.key !== null && event.key !== key) return
        if (event.storageArea && event.storageArea !== store()) return
        onChange(event.key === null ? null : event.newValue)
      }

      window.addEventListener('storage', handler)
      return () => window.removeEventListener('storage', handler)
    },
  }
}

/** `localStorage`, with every access guarded. The default. */
export function createLocalStorage(): ThemeStorage {
  return createWebStorage((window) => window.localStorage)
}

/** `sessionStorage`, with every access guarded. Forgets the choice when the tab closes. */
export function createSessionStorage(): ThemeStorage {
  return createWebStorage((window) => window.sessionStorage)
}

/** Options for {@link createCookieStorage}. */
export interface CookieStorageOptions {
  /** Cookie lifetime in seconds. Defaults to one year. */
  maxAge?: number
  /** Path scope. Defaults to `/` so the choice applies to the whole site. */
  path?: string
  /**
   * `SameSite` attribute. Defaults to `Lax`, which is sent on top-level navigations — the
   * only case that matters here, because that is when the server renders the document.
   */
  sameSite?: 'Lax' | 'Strict' | 'None'
  /** Send only over HTTPS. Defaults to true when the page itself is secure. */
  secure?: boolean
}

/**
 * A cookie-backed store, for applications that resolve the theme on the server.
 *
 * The trade is explicit: a cookie is the only client-side store that the server can read,
 * so it is the only way to emit correct `data-theme` markup from the server and skip the
 * pre-paint script entirely. In exchange, every HTML response now varies by user and can
 * no longer be served from a shared cache. Reach for this when the pages are already
 * dynamic; do not reach for it to shave one attribute write off a static site.
 *
 * There is no cross-tab notification for cookies — nothing fires a `storage` event — so
 * `subscribe` is intentionally absent rather than stubbed.
 */
export function createCookieStorage(options: CookieStorageOptions = {}): ThemeStorage {
  const { maxAge = 60 * 60 * 24 * 365, path = '/', sameSite = 'Lax' } = options

  return {
    read(key) {
      if (typeof document === 'undefined') return null
      try {
        for (const entry of document.cookie ? document.cookie.split('; ') : []) {
          const split = entry.indexOf('=')
          if (split > 0 && entry.slice(0, split) === key) {
            return decodeURIComponent(entry.slice(split + 1))
          }
        }
      } catch {
        // `document.cookie` throws in sandboxed documents without allow-same-origin.
      }
      return null
    },
    write(key, value) {
      if (typeof document === 'undefined') return
      const secure =
        options.secure ?? (typeof location !== 'undefined' && location.protocol === 'https:')
      try {
        // biome-ignore lint/suspicious/noDocumentCookie: the CookieStore API is not available in Safari or in any non-secure context, and this store exists precisely to be readable by a pre-paint script in every browser.
        document.cookie = [
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
          `Path=${path}`,
          `Max-Age=${maxAge}`,
          `SameSite=${sameSite}`,
          ...(secure ? ['Secure'] : []),
        ].join('; ')
      } catch {
        // As above.
      }
    },
    remove(key) {
      if (typeof document === 'undefined') return
      try {
        // biome-ignore lint/suspicious/noDocumentCookie: as above.
        document.cookie = `${encodeURIComponent(key)}=; Path=${path}; Max-Age=0`
      } catch {
        // As above.
      }
    },
  }
}

/**
 * An in-memory store.
 *
 * Useful in tests and in server rendering, where a real store would either not exist or
 * leak one request's choice into another's.
 */
export function createMemoryStorage(initial?: Readonly<Record<string, string>>): ThemeStorage {
  const map = new Map<string, string>(initial ? Object.entries(initial) : [])
  return {
    read: (key) => map.get(key) ?? null,
    write: (key, value) => {
      map.set(key, value)
    },
    remove: (key) => {
      map.delete(key)
    },
  }
}

/** A store that remembers nothing. The honest choice when persistence is unwanted. */
export const nullStorage: ThemeStorage = {
  read: () => null,
  write: () => {},
  remove: () => {},
}

/** Build the store named by a {@link ThemeStorageSource}. */
export function storageFor(source: ThemeStorageSource): ThemeStorage {
  switch (source) {
    case 'cookie':
      return createCookieStorage()
    case 'sessionStorage':
      return createSessionStorage()
    default:
      return createLocalStorage()
  }
}
