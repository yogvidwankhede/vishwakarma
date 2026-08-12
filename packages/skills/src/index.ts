// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/skills
 *
 * The Vishwakarma Skill Manifest format, its validator, and the skill catalog.
 */

export * from './catalog/index.js'
export {
  type Activation,
  type AgentTarget,
  ALL_TARGETS,
  assertValidManifest,
  type Evidence,
  estimateTokens,
  type RuleStrength,
  type SkillCheck,
  type SkillContent,
  type SkillManifest,
  type SkillRule,
  skillCost,
  TIER_BUDGETS,
  type ValidationIssue,
  validateManifest,
} from './manifest.js'
