// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The rule map.
 *
 * Keys are the names a user writes in their config, without the plugin prefix. They are
 * spelled out here rather than derived from file names because a rule name is a public API:
 * renaming a file must never silently rename a rule and turn every existing config entry into
 * an "unknown rule" error at the top of someone's lint output.
 */

import type { AnyRuleModule } from '../rule-types.js'
import noEmojiIcon from './no-emoji-icon.js'
import noGradientText from './no-gradient-text.js'
import noLayoutAnimation from './no-layout-animation.js'
import noOffScaleSpacing from './no-off-scale-spacing.js'
import noPositiveTabindex from './no-positive-tabindex.js'
import noRawColour from './no-raw-colour.js'
import requireAltText from './require-alt-text.js'
import requireButtonType from './require-button-type.js'
import requireReducedMotionGuard from './require-reduced-motion-guard.js'

/** Every rule in the package, keyed by its configurable name. */
export const rules = {
  'no-raw-colour': noRawColour,
  'no-off-scale-spacing': noOffScaleSpacing,
  'no-layout-animation': noLayoutAnimation,
  'require-reduced-motion-guard': requireReducedMotionGuard,
  'no-emoji-icon': noEmojiIcon,
  'require-alt-text': requireAltText,
  'no-positive-tabindex': noPositiveTabindex,
  'require-button-type': requireButtonType,
  'no-gradient-text': noGradientText,
} satisfies Record<string, AnyRuleModule>

/** The name of every rule this package ships. */
export type RuleName = keyof typeof rules

export {
  noEmojiIcon,
  noGradientText,
  noLayoutAnimation,
  noOffScaleSpacing,
  noPositiveTabindex,
  noRawColour,
  requireAltText,
  requireButtonType,
  requireReducedMotionGuard,
}
