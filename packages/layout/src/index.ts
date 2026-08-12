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

// Re-exported so a consumer can reason about breakpoints without also depending on core.
export {
  BREAKPOINT_GUIDANCE,
  BREAKPOINTS,
  containerUp,
  mediaDown,
  mediaUp,
} from '@vishwakarma/core'
export {
  Bento,
  type BentoFill,
  type BentoProps,
  type BentoRank,
  BentoTile,
  type BentoTileProps,
  planBentoSpans,
} from './bento.js'
export { Cluster, type ClusterProps, Row, type RowProps } from './cluster.js'
export { Container, type ContainerProps, FullBleed, type FullBleedProps } from './container.js'
export {
  ContainerQuery,
  type ContainerQueryProps,
  type ContainerQueryState,
  type ContainerSize,
  type UseContainerSizeOptions,
  type UseContainerSizeResult,
  useContainerSize,
} from './container-query.js'
export { Grid, type GridFlow, type GridProps } from './grid.js'
export {
  Center,
  type CenterProps,
  Cover,
  type CoverProps,
  Frame,
  type FrameProps,
  Spacer,
  type SpacerProps,
} from './measure.js'
export {
  type Align,
  alignValue,
  cx,
  type Justify,
  justifyValue,
  type LayoutPrimitiveProps,
  type Length,
  MIN_INLINE_SIZE_NOTE,
  toLength,
  withVars,
} from './primitive.js'
export { assignRef, useMergedRef } from './refs.js'
export { Sidebar, type SidebarProps, Switcher, type SwitcherProps } from './sidebar.js'
export {
  FLUID_GUTTER,
  resolveSpace,
  SPACE_ALIASES,
  SPACE_STEPS,
  type Space,
  type SpaceAlias,
  type SpaceStep,
  spaceVar,
} from './space.js'
export { Stack, type StackProps } from './stack.js'
