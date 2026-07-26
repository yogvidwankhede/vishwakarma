/**
 * The DOM writes.
 *
 * Everything here targets `document.documentElement` rather than a React-rendered wrapper
 * element, and that is a correctness decision rather than a convenience one. The pre-paint
 * script has to set the theme before React exists, so it can only write to an element that
 * already exists — the root. If React then rendered the same attribute onto a wrapper it
 * owned, hydration would find server markup that says one thing and a live DOM that says
 * another, and React would either warn or, worse, discard the script's work. React
 * deliberately tolerates unexpected attributes on `<html>` and `<body>` precisely because
 * extensions and scripts write there, which makes the root the one safe target.
 */

import type { Density, ResolvedTheme, ThemeSettings } from './settings.js'

function rootElement(doc?: Document): HTMLElement | null {
  const target = doc ?? (typeof document === 'undefined' ? null : document)
  return target?.documentElement ?? null
}

/**
 * Write the theme to the document element.
 *
 * Two things are set, not one. The attribute drives the token CSS. The `color-scheme`
 * property drives everything the browser paints on its own account: the canvas background
 * behind your page, scrollbars, form controls, spellcheck underlines, and the default
 * colour of a `<dialog>` backdrop. Set only the attribute and a dark page keeps white
 * scrollbars and flashes white in the gap between navigations, because the user agent has
 * never been told what kind of page this is.
 *
 * It is written as an inline style rather than left to a stylesheet so that it survives a
 * stylesheet that has not loaded yet, which is exactly the window the flash lives in.
 */
export function applyTheme(
  theme: ResolvedTheme,
  settings: Pick<ThemeSettings, 'attribute'>,
  doc?: Document,
): void {
  const root = rootElement(doc)
  if (!root) return
  root.setAttribute(settings.attribute, theme)
  root.style.colorScheme = theme
}

/** Write the density to the document element. */
export function applyDensity(
  density: Density,
  settings: Pick<ThemeSettings, 'densityAttribute'>,
  doc?: Document,
): void {
  rootElement(doc)?.setAttribute(settings.densityAttribute, density)
}

/** Read back what is currently on the document element, for change detection. */
export function readRootAttribute(attribute: string, doc?: Document): string | null {
  return rootElement(doc)?.getAttribute(attribute) ?? null
}

/**
 * Disable transitions for the duration of a theme swap.
 *
 * Without this, changing one attribute on the root invalidates every custom property below
 * it, and every element with `transition: background-color` or `transition: colors` starts
 * animating simultaneously. The result is a slow coloured wipe across the page — not a
 * theme change but a costly, distracting impression of one — and on a large document the
 * accompanying style recalculation and paint is the single most expensive thing the toggle
 * does.
 *
 * The returned release function must be called synchronously, in the same task as the
 * attribute change. It forces a reflow before removing the lock so that the new colours
 * are committed while transitions are still off; skip the reflow and the browser coalesces
 * the whole sequence, ending up with transitions enabled and the swap animating anyway.
 */
export function lockTransitions(doc?: Document): () => void {
  const target = doc ?? (typeof document === 'undefined' ? null : document)
  const root = target?.documentElement
  if (!target || !root || !target.head) return () => {}

  const style = target.createElement('style')
  style.setAttribute('data-vk-theme-lock', '')
  style.append(
    target.createTextNode(
      '*,*::before,*::after{transition-duration:0s !important;transition-delay:0s !important}',
    ),
  )
  target.head.appendChild(style)

  return () => {
    // Deliberate forced reflow. Do not remove: it is what makes the lock work.
    void root.offsetHeight
    style.remove()
  }
}
