// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/ui
 *
 * The styled component library: a small set of components that are correct in the places
 * component libraries usually are not — focus indication, target size, state signalling that
 * does not depend on colour, and disabled states that stay readable.
 *
 * The components are built from Tailwind utilities addressing the token namespaces generated
 * by `@vishwakarma/tokens`, so a rebrand is a token change rather than a fork of this
 * package. They assume the generated `@theme` block has been imported; without it the class
 * names resolve to nothing and every component renders unstyled, which is the one failure
 * mode to look for first when something here appears to do nothing.
 */

export { Alert, type AlertProps, type AlertVariant } from './alert.js'
export {
  Avatar,
  AvatarGroup,
  type AvatarGroupProps,
  type AvatarProps,
  type AvatarSize,
  initialsFor,
  toneIndexFor,
} from './avatar.js'
export {
  Badge,
  type BadgeProps,
  type BadgeVariant,
  CountBadge,
  type CountBadgeProps,
} from './badge.js'

export {
  Button,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
  type IconOnlyButtonProps,
  type LabelledButtonProps,
} from './button.js'
export {
  Card,
  type CardElevation,
  type CardProps,
  type CardSectionProps,
} from './card.js'
export { EmptyState, type EmptyStateProps } from './empty-state.js'
export {
  Field,
  type FieldControlProps,
  type FieldProps,
  mergeDescribedBy,
  useField,
} from './field.js'
export {
  type ControlSize,
  Input,
  type InputProps,
  Textarea,
  type TextareaProps,
} from './input.js'
export { Separator, type SeparatorProps } from './separator.js'
export {
  Skeleton,
  SkeletonGroup,
  type SkeletonGroupProps,
  type SkeletonProps,
  type SkeletonShape,
} from './skeleton.js'
export { Spinner, type SpinnerProps, type SpinnerSize } from './spinner.js'
export {
  calmMotion,
  disabledSurface,
  focusRing,
  focusWithinRing,
  tapTarget,
} from './styles.js'
export {
  Table,
  type TableCellProps,
  type TableHeaderCellProps,
  type TableProps,
  type TableRowProps,
} from './table.js'
export {
  Checkbox,
  type CheckboxProps,
  Switch,
  type SwitchProps,
} from './toggle.js'
export {
  type ClassValue,
  type CompoundVariant,
  cx,
  type VariantConfig,
  type VariantFunction,
  type VariantGroups,
  type VariantProps,
  type VariantSelection,
  variants,
} from './variants.js'
