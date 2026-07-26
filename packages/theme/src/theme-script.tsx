'use client'

import type { ReactNode } from 'react'
import {
  resolveSettings,
  type ThemePreference,
  type ThemeSettings,
  type ThemeStorageSource,
} from './settings.js'

/**
 * The flash-free mechanism.
 *
 * The problem is a scheduling one. A user's stored theme lives in `localStorage`, which is
 * not sent with the request, so the server cannot know it and the HTML it returns cannot
 * contain it. The browser therefore paints the document's default theme first, and only
 * later does JavaScript get a chance to correct it. That gap is the flash of light theme
 * that dark-mode users have learned to expect from the entire web, and on a slow
 * connection it is not a flicker but a full second of white.
 *
 * A `useEffect` cannot close that gap, and no amount of care makes it possible. Effects
 * run after React commits, and React commits after the browser has painted the frame; the
 * effect's whole contract is that it happens too late. `useLayoutEffect` moves the
 * correction before paint of the *hydrated* frame, but hydration itself requires the
 * bundle to have been downloaded, parsed, and executed, so the browser has already painted
 * many frames of the wrong theme by then. Streaming, `Suspense`, and partial pre-rendering
 * all make this worse, not better, because they get real pixels on screen sooner.
 *
 * The only thing that runs before first paint is a synchronous, parser-blocking, inline
 * script in the document head. Inline, because an external file costs a network round trip
 * during which the browser paints. Blocking, because `defer` and `async` both explicitly
 * permit execution after paint. The cost is real but small: this is roughly 400 bytes of
 * straight-line code with no allocation and one `matchMedia` call, on the order of tens of
 * microseconds, and it is the entire price of never shipping a flash.
 *
 * Resolution order is: explicit stored choice, then system preference, then the configured
 * default. The stored choice wins outright — a user who chose light on a dark-preferring
 * machine chose that on purpose, and an interface that overrides them at every page load
 * has taken their setting and thrown it away.
 */

/**
 * Serialise a value for embedding in an inline script.
 *
 * `JSON.stringify` alone is not enough. The HTML parser terminates a `<script>` element at
 * the first `</script>` sequence in its text, without any awareness of JavaScript string
 * literals — so a storage key containing that text would end the script early and inject
 * the remainder as markup. Escaping `<` removes the possibility entirely. U+2028 and
 * U+2029 are escaped for the benefit of anything that later re-parses this as JSON.
 */
function toScriptLiteral(value: string): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/**
 * The reader half of the script, which is the only part that varies by storage source.
 *
 * Every access is wrapped, because reading `window.localStorage` throws outright in a
 * partitioned third-party context. An exception here would abort the script before the
 * theme is applied, turning a missing preference into a broken page.
 */
function readerSource(source: ThemeStorageSource): string {
  if (source === 'cookie') {
    return 'function r(k){try{var c=document.cookie?document.cookie.split("; "):[];for(var i=0;i<c.length;i++){var e=c[i],s=e.indexOf("=");if(s>0&&decodeURIComponent(e.slice(0,s))===k)return decodeURIComponent(e.slice(s+1))}}catch(_){}return null}'
  }
  const area = source === 'sessionStorage' ? 'sessionStorage' : 'localStorage'
  return `function r(k){try{return window.${area}.getItem(k)}catch(_){}return null}`
}

/**
 * Generate the source of the pre-paint script.
 *
 * Exported separately from the component because some frameworks want the string rather
 * than the element — an Astro `is:inline` script, a Next `<Script strategy="beforeInteractive">`,
 * or a hand-written HTML template. The rules do not change: whatever renders it must place
 * it in the head, inline, and unmarked by `defer` or `async`.
 */
export function themeScriptSource(overrides: Partial<ThemeSettings> = {}): string {
  const settings = resolveSettings(overrides)

  return [
    '(function(){try{',
    'var d=document.documentElement;',
    readerSource(settings.source),
    `var p=r(${toScriptLiteral(settings.storageKey)});`,
    // Validate rather than trust. Storage is user-editable and outlives renames, so an
    // unrecognised value must fall back to the default instead of reaching setAttribute.
    `if(p!=="light"&&p!=="dark"&&p!=="system")p=${toScriptLiteral(settings.defaultPreference)};`,
    'var t=p==="system"?(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;',
    `d.setAttribute(${toScriptLiteral(settings.attribute)},t);`,
    // Told at the same instant as the attribute, so the user agent paints its own
    // furniture — canvas, scrollbars, form controls — in the right scheme from frame one.
    'd.style.colorScheme=t;',
    `var n=r(${toScriptLiteral(settings.densityStorageKey)});`,
    `if(n!=="comfortable"&&n!=="compact")n=${toScriptLiteral(settings.defaultDensity)};`,
    `d.setAttribute(${toScriptLiteral(settings.densityAttribute)},n);`,
    // A failure in here must never take the document with it. The worst outcome of the
    // catch firing is the default theme, which is exactly where we started.
    '}catch(_){}})()',
  ].join('')
}

export interface ThemeScriptProps extends Partial<ThemeSettings> {
  /**
   * CSP nonce.
   *
   * A strict Content-Security-Policy blocks inline scripts, and this script must be
   * inline, so the nonce is not optional under such a policy — it is the mechanism. It has
   * to be generated per response and match the one in the `script-src` directive; a
   * constant nonce checked into source is the same as having no policy. The alternative,
   * `unsafe-inline`, disables the protection for the whole document to save one attribute.
   */
  nonce?: string
}

/**
 * Emit the inline, render-blocking script that resolves the theme before first paint.
 *
 * Render this once, inside `<head>`, above any stylesheet that depends on the theme. In a
 * framework whose root layout owns the document — Next's App Router, for instance — that
 * means directly inside the `<head>` element of the root layout, not inside a client
 * boundary further down the tree, where it would run after paint and defeat the point.
 *
 * The settings passed here must match those passed to {@link ThemeProvider}. The simplest
 * way to guarantee that is to declare them once and spread the same object into both.
 */
export function ThemeScript({ nonce, ...overrides }: ThemeScriptProps = {}): ReactNode {
  const source = themeScriptSource(overrides)

  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: a script that must execute before first paint cannot be expressed any other way; every interpolated value is escaped by toScriptLiteral.
    <script {...(nonce ? { nonce } : {})} dangerouslySetInnerHTML={{ __html: source }} />
  )
}

/**
 * The resolution the script performs, in TypeScript.
 *
 * Exists so a server that *can* see the preference — one using cookie storage — can render
 * the attribute into its HTML directly and reach the same answer the script would, without
 * the two implementations drifting apart in a way nobody would notice until a user
 * complained about a flash on one route.
 */
export function resolvePreparedTheme(
  storedValue: string | null,
  systemPrefersDark: boolean,
  defaultPreference: ThemePreference = 'system',
): { preference: ThemePreference; theme: 'light' | 'dark' } {
  const preference: ThemePreference =
    storedValue === 'light' || storedValue === 'dark' || storedValue === 'system'
      ? storedValue
      : defaultPreference
  const theme = preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference
  return { preference, theme }
}
