import { catalog } from './packages/skills/src/catalog/index.js'
import { validateManifest, estimateTokens } from './packages/skills/src/manifest.js'
for (const m of catalog) {
  console.log(m.id, 'body', estimateTokens(m.content.body), 'warnings', validateManifest(m).length)
}
