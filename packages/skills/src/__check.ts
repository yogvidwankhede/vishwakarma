// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { accessibleComponents } from './catalog/accessible-components.js'
import { validateManifest, estimateTokens, skillCost } from './manifest.js'
const issues = validateManifest(accessibleComponents)
console.log('issues:', JSON.stringify(issues, null, 2))
console.log('description tokens', estimateTokens(accessibleComponents.description))
console.log('summary tokens', estimateTokens(accessibleComponents.content.summary))
console.log('body tokens', estimateTokens(accessibleComponents.content.body), 'chars', accessibleComponents.content.body.length)
for (const r of accessibleComponents.content.references ?? []) console.log('ref', r.id, estimateTokens(r.content ?? ''))
console.log('rules', accessibleComponents.rules?.length)
console.log(skillCost(accessibleComponents))
