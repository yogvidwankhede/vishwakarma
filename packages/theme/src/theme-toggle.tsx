'use client'

import { type CSSProperties, type KeyboardEvent, type ReactNode, type Ref, useRef } from 'react'
import { THEME_PREFERENCES, type ThemePreference } from './settings.js'
import { useTheme } from './theme-provider.js'

/**
 * A three-state theme control.
 *
 * The obvious implementation — a switch, or a checkbox styled as one — is the wrong
 * control, and it is wrong for a reason that outlives styling. A switch has two states.
 * The preference has three, and the third one, "follow the system", is not a value but the
 * absence of one: it is what lets the interface go dark at sunset with the rest of the
 * machine. Bind a switch to it and that state has nowhere to live. The user who has never
 * touched the control is nominally on `system`, but the first tap pins them to a concrete
 * theme with no gesture available to un-pin. ARIA offers no escape either: `aria-checked`
 * takes `mixed`, but `mixed` means "partially checked", and a screen reader announcing
 * "partially checked" for "follows my operating system" is simply wrong.
 *
 * Three mutually exclusive options with exactly one active is the definition of a radio
 * group, so that is what this is: `role="radiogroup"` with three `role="radio"` buttons,
 * roving tabindex, and arrow keys that move and select in one action. It is built from
 * buttons rather than native `<input type="radio">` because native radios cannot be
 * arranged as a segmented control without hiding the input, and a hidden input is where
 * focus indicators go to die.
 *
 * The component ships no styling and, more importantly, no CSS reset. The commonest way a
 * component library breaks keyboard access is an `outline: none` in a reset that nothing
 * replaces; by never touching `outline`, the user agent's focus ring survives whatever the
 * consumer does or does not add.
 */

/** State handed to a custom option renderer. */
export interface ThemeToggleOptionState {
  /** Whether this option is the current preference. */
  checked: boolean
  /** The accessible label for this option. */
  label: string
  /** The theme this option would result in right now — for `system`, the OS's current one. */
  effectiveTheme: 'light' | 'dark'
}

export interface ThemeToggleProps {
  /**
   * Which options to offer, in presentation order.
   *
   * Dropping `system` is possible and almost always a mistake: it removes the only option
   * that keeps tracking the user's machine.
   */
  options?: readonly ThemePreference[]
  /**
   * Visible and accessible labels.
   *
   * Whatever is rendered inside an option must contain this text, because it is also used
   * as the accessible name. A name that does not contain the visible label breaks
   * voice control — the user says "click Dark" and nothing happens.
   */
  labels?: Readonly<Record<ThemePreference, string>>
  /** Accessible name for the group. Every radio group needs one. */
  label?: string
  /** Use an existing element as the group's label instead of `label`. */
  'aria-labelledby'?: string
  /** Layout axis. Determines which arrow keys are advertised, not which ones work. */
  orientation?: 'horizontal' | 'vertical'
  /** Render an option's contents. Defaults to its label as text. */
  renderOption?: (option: ThemePreference, state: ThemeToggleOptionState) => ReactNode
  className?: string
  /** Class applied to each option button. */
  optionClassName?: string
  style?: CSSProperties
  ref?: Ref<HTMLDivElement>
}

const DEFAULT_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}

export function ThemeToggle({
  options = THEME_PREFERENCES,
  labels = DEFAULT_LABELS,
  label = 'Colour theme',
  'aria-labelledby': labelledBy,
  orientation = 'horizontal',
  renderOption,
  className,
  optionClassName,
  style,
  ref,
}: ThemeToggleProps): ReactNode {
  const { preference, setPreference, systemTheme } = useTheme()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  // Roving tabindex: exactly one button in the group is reachable with Tab, and it is the
  // selected one. Leaving every button tabbable would force a keyboard user to press Tab
  // three times to cross a single control, and would contradict the radio pattern that
  // screen reader users are navigating by.
  const activeIndex = Math.max(options.indexOf(preference), 0)

  const select = (index: number): void => {
    const option = options[index]
    if (!option) return
    setPreference(option)
    // Focus must follow selection, or the next arrow press operates from the old position
    // and the user's focus is left on a button that is no longer checked.
    buttons.current[index]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const count = options.length
    if (count === 0) return

    let next: number
    switch (event.key) {
      // Both axes are handled regardless of `orientation`. The pattern only requires one
      // pair, but a user who reaches for the other pair on a segmented control gets
      // nothing back — and worse, the page scrolls instead.
      case 'ArrowRight':
      case 'ArrowDown':
        next = (activeIndex + 1) % count
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (activeIndex - 1 + count) % count
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = count - 1
        break
      default:
        return
    }

    // Only after we know the key was ours: swallowing keys we do not handle would break
    // Tab, and swallowing arrows we do handle is required to stop the page scrolling.
    event.preventDefault()
    select(next)
  }

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-orientation={orientation}
      {...(labelledBy ? { 'aria-labelledby': labelledBy } : { 'aria-label': label })}
      onKeyDown={onKeyDown}
      className={className}
      style={style}
      data-vk-theme-toggle=""
    >
      {options.map((option, index) => {
        const checked = option === preference
        const optionLabel = labels[option] ?? DEFAULT_LABELS[option]
        const effectiveTheme = option === 'system' ? systemTheme : option
        const state: ThemeToggleOptionState = { checked, label: optionLabel, effectiveTheme }

        return (
          // biome-ignore lint/a11y/useSemanticElements: a native radio cannot be laid out as a segmented control without visually hiding the input, which is where focus indicators get lost; the full radio-group keyboard and ARIA contract is implemented by hand instead.
          <button
            key={option}
            // Explicit, because a button inside a form defaults to type="submit" and a
            // theme control that submits the checkout form is a memorable bug.
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={optionLabel}
            tabIndex={index === activeIndex ? 0 : -1}
            ref={(node) => {
              buttons.current[index] = node
            }}
            onClick={() => select(index)}
            className={optionClassName}
            // Styling hooks, so a consumer can express the selected and effective states in
            // CSS without re-deriving them or reaching for a class-name prop per state.
            data-state={checked ? 'checked' : 'unchecked'}
            data-preference={option}
            data-effective-theme={effectiveTheme}
          >
            {renderOption ? renderOption(option, state) : optionLabel}
          </button>
        )
      })}
    </div>
  )
}

export interface DensityToggleProps {
  /** Accessible name for the group. */
  label?: string
  labels?: Readonly<Record<'comfortable' | 'compact', string>>
  className?: string
  optionClassName?: string
  style?: CSSProperties
  ref?: Ref<HTMLDivElement>
}

const DENSITY_LABELS: Record<'comfortable' | 'compact', string> = {
  comfortable: 'Comfortable',
  compact: 'Compact',
}

/**
 * A two-state density control.
 *
 * A switch would be defensible here — density genuinely has two states and no system
 * value — but it is built as a radio group anyway, so that the two controls share one
 * keyboard contract and one visual treatment. A settings panel where two adjacent controls
 * respond to different keys is worse than one that spends an extra element.
 */
export function DensityToggle({
  label = 'Interface density',
  labels = DENSITY_LABELS,
  className,
  optionClassName,
  style,
  ref,
}: DensityToggleProps): ReactNode {
  const { density, setDensity } = useTheme()
  const options: readonly ('comfortable' | 'compact')[] = ['comfortable', 'compact']
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const activeIndex = Math.max(options.indexOf(density), 0)

  const select = (index: number): void => {
    const option = options[index]
    if (!option) return
    setDensity(option)
    buttons.current[index]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        select((activeIndex + 1) % options.length)
        return
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        select((activeIndex - 1 + options.length) % options.length)
        return
      case 'Home':
        event.preventDefault()
        select(0)
        return
      case 'End':
        event.preventDefault()
        select(options.length - 1)
        return
      default:
    }
  }

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={className}
      style={style}
      data-vk-density-toggle=""
    >
      {options.map((option, index) => (
        // biome-ignore lint/a11y/useSemanticElements: see the note on ThemeToggle — the same segmented layout and the same hand-implemented radio contract apply.
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === density}
          aria-label={labels[option]}
          tabIndex={index === activeIndex ? 0 : -1}
          ref={(node) => {
            buttons.current[index] = node
          }}
          onClick={() => select(index)}
          className={optionClassName}
          data-state={option === density ? 'checked' : 'unchecked'}
          data-density={option}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  )
}
