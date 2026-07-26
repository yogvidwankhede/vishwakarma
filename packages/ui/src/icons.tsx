import type { ReactNode } from 'react'

/**
 * The few glyphs this package needs, inlined.
 *
 * Not because inline SVG is elegant, but because the alternative is an icon-font or an
 * external sprite, and both fail in ways a component library cannot recover from: an icon
 * font renders a random CJK glyph when the font fails to load and is read aloud as garbage
 * by screen readers, and a sprite needs a build step that a consumer may not have.
 *
 * Every icon here is decorative — the meaning is always carried by adjacent text or an
 * `aria-label` on the control — so every icon is `aria-hidden`. An icon that ever needs to
 * be announced belongs to the caller, not to this file.
 */

interface IconProps {
  className?: string
}

const BASE = 'shrink-0'

/** Tick, for checked states. */
export function CheckIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ? `${BASE} ${className}` : BASE}
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  )
}

/** Horizontal bar, for the indeterminate checkbox state. */
export function DashIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className={className ? `${BASE} ${className}` : BASE}
    >
      <path d="M4 8h8" />
    </svg>
  )
}

/** Cross, for dismissing things. */
export function CloseIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className={className ? `${BASE} ${className}` : BASE}
    >
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  )
}

/** Circled exclamation, for errors. */
export function DangerIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className={className ? `${BASE} ${className}` : BASE}
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.75v3.75" />
      <path d="M8 11.15v.1" />
    </svg>
  )
}

/** Triangled exclamation, for warnings. Distinct in silhouette from {@link DangerIcon}. */
export function WarningIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ? `${BASE} ${className}` : BASE}
    >
      <path d="M8 2.2 14.6 13.3H1.4Z" />
      <path d="M8 6.4v3" />
      <path d="M8 11.4v.1" />
    </svg>
  )
}

/** Circled tick, for success. */
export function SuccessIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ? `${BASE} ${className}` : BASE}
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="m5.2 8.3 2 2 3.6-4.2" />
    </svg>
  )
}

/** Circled 'i', for neutral information. */
export function InfoIcon({ className }: IconProps): ReactNode {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className={className ? `${BASE} ${className}` : BASE}
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 7.4v4" />
      <path d="M8 4.75v.1" />
    </svg>
  )
}
