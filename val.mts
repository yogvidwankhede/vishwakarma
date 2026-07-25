import { responsiveArchitecture } from './packages/skills/src/catalog/responsive-architecture.js'
import { validateManifest, estimateTokens } from './packages/skills/src/manifest.js'
const m = responsiveArchitecture
console.log('issues:', JSON.stringify(validateManifest(m), null, 1))
console.log('description tokens', estimateTokens(m.description))
console.log('summary tokens', estimateTokens(m.content.summary))
console.log('body tokens', estimateTokens(m.content.body), 'chars', m.content.body.length)
for (const r of m.content.references ?? []) console.log('ref', r.id, estimateTokens(r.content ?? ''))
console.log('rules', m.rules?.length)
