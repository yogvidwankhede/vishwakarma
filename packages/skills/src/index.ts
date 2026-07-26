// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/skills
 *
 * The Vishwakarma Skill Manifest format, its validator, and the skill catalog.
 */

export {
  type AgentTarget,
  type Activation,
  type RuleStrength,
  type Evidence,
  type SkillRule,
  type SkillContent,
  type SkillCheck,
  type SkillManifest,
  type ValidationIssue,
  ALL_TARGETS,
  TIER_BUDGETS,
  estimateTokens,
  validateManifest,
  assertValidManifest,
  skillCost,
} from './manifest.js'

export * from './catalog/index.js'
