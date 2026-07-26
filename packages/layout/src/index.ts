// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/layout
 *
 * Intrinsic layout primitives.
 *
 * Each one solves a single layout problem and composes with the others, rather than being
 * a configurable box that solves all of them badly. Three properties hold across the whole
 * set.
 *
 * **Spacing is owned by the container.** Gaps are a property of the arrangement, not of the
 * things arranged, so they survive reordering and conditional rendering. Margins on
 * children do not.
 *
 * **Every primitive sets `min-inline-size: 0`.** A flex or grid item defaults to
 * `min-width: auto`, which refuses to shrink below its content and is the usual cause of
 * unexplained horizontal overflow. See `MIN_INLINE_SIZE_NOTE`.
 *
 * **Breakpoints are the exception, not the mechanism.** `Sidebar` and `Switcher` change
 * arrangement intrinsically, at the width where their own content stops fitting, and
 * `ContainerQuery` asks about the container rather than the viewport — because a component
 * does not know the viewport, it knows the box it was put in.
 */

export {
  type LayoutPrimitiveProps,
  type Align,
  type Justify,
  type Length,
  MIN_INLINE_SIZE_NOTE,
  alignValue,
  justifyValue,
  withVars,
  cx,
  toLength,
} from './primitive.js'

export { assignRef, useMergedRef } from './refs.js'

export {
  type Space,
  type SpaceStep,
  type SpaceAlias,
  SPACE_STEPS,
  SPACE_ALIASES,
  FLUID_GUTTER,
  spaceVar,
  resolveSpace,
} from './space.js'

export { type StackProps, Stack } from './stack.js'
export { type ClusterProps, type RowProps, Cluster, Row } from './cluster.js'
export { type GridFlow, type GridProps, Grid } from './grid.js'
export { type BentoRank, type BentoFill, type BentoProps, type BentoTileProps, Bento, BentoTile, planBentoSpans } from './bento.js'
export { type ContainerProps, type FullBleedProps, Container, FullBleed } from './container.js'
export { type SidebarProps, type SwitcherProps, Sidebar, Switcher } from './sidebar.js'
export {
  type ContainerSize,
  type ContainerQueryState,
  type ContainerQueryProps,
  type UseContainerSizeOptions,
  type UseContainerSizeResult,
  ContainerQuery,
  useContainerSize,
} from './container-query.js'
export { type CenterProps, type CoverProps, type FrameProps, type SpacerProps, Center, Cover, Frame, Spacer } from './measure.js'

// Re-exported so a consumer can reason about breakpoints without also depending on core.
export { BREAKPOINTS, BREAKPOINT_GUIDANCE, mediaUp, mediaDown, containerUp } from '@vishwakarma/core'
