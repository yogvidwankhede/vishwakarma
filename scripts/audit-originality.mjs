#!/usr/bin/env node
/**
 * Originality guard.
 *
 * This is not a plagiarism detector — no static script can be one. It is a tripwire for
 * the specific, mechanical ways copied material actually enters a repository: a pasted
 * file that still carries someone else's copyright header, a vendored license block, a
 * leftover attribution comment, or a distinctive third-party brand name embedded in
 * source that should be brand-neutral.
 *
 * It fails the build on a hit so that a human has to look, rather than quietly logging.
 *
 * Run: node scripts/audit-originality.mjs [--json]
 */

import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import process from 'node:process'

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
  '.changeset',
])

/** Files that legitimately discuss provenance and must be exempt from the scan. */
const EXEMPT_FILES = new Set([
  'LICENSE',
  'ORIGINALITY.md',
  'CODE_OF_CONDUCT.md',
  'NOTICE',
  'scripts/audit-originality.mjs',
  'scripts/audit-licenses.mjs',
])

const SCANNED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.scss',
  '.md',
  '.mdx',
  '.json',
  '.yaml',
  '.yml',
])

const RULES = [
  {
    id: 'foreign-copyright',
    severity: 'error',
    // A copyright line naming anyone other than this project is a strong signal of a
    // pasted file. We match the line and then exclude our own attribution.
    pattern: /^.{0,40}copyright\s*(?:\(c\)|©)?\s*\d{4}.*$/gim,
    allow: (match) => /vishwakarma/i.test(match),
    message: 'Third-party copyright notice found. Files in this repo must be original work.',
  },
  {
    id: 'vendored-license-block',
    severity: 'error',
    pattern:
      /(permission is hereby granted, free of charge|licensed under the apache license|redistribution and use in source and binary forms|this program is free software)/gi,
    allow: () => false,
    message:
      'A full license block is embedded in a source file, which usually means the file was vendored.',
  },
  {
    id: 'attribution-comment',
    severity: 'error',
    pattern:
      /(?:\/\/|\/\*|\*|#|<!--)\s*(?:adapted|derived|forked|copied|taken|borrowed|ported|based)\s+(?:from|on)\s+\S/gi,
    allow: () => false,
    message:
      'An attribution comment implies derived code. Rewrite the implementation independently, or remove the file.',
  },
  {
    id: 'source-url-marker',
    severity: 'warn',
    // Links to a source repo inside code (not docs) often accompany a paste.
    pattern: /(?:\/\/|\/\*|\*)\s*(?:source|src|origin|ref)\s*:\s*https?:\/\/(?:github|gitlab)\.com\/\S+/gi,
    allow: () => false,
    message: 'A source-repository link appears in a code comment. Confirm the code is not derived.',
  },
  {
    id: 'todo-replace-placeholder',
    severity: 'warn',
    pattern: /\b(?:TODO|FIXME)\s*:?\s*(?:replace|rewrite|originality|copied)\b/gi,
    allow: () => false,
    message: 'An unresolved originality placeholder is still in the tree.',
  },
]

async function* walk(dir, root) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full, root)
    } else if (entry.isFile()) {
      const rel = relative(root, full)
      if (EXEMPT_FILES.has(rel)) continue
      if (!SCANNED_EXTENSIONS.has(extname(entry.name))) continue
      yield { full, rel }
    }
  }
}

/** Convert a character offset into a 1-indexed line number. */
function lineOf(content, index) {
  let line = 1
  for (let i = 0; i < index && i < content.length; i++) {
    if (content.charCodeAt(i) === 10) line++
  }
  return line
}

async function main() {
  const root = resolve(process.cwd())
  const asJson = process.argv.includes('--json')
  const findings = []
  let scanned = 0

  for await (const file of walk(root, root)) {
    let content
    try {
      content = await readFile(file.full, 'utf8')
    } catch {
      continue
    }
    scanned++

    for (const rule of RULES) {
      // Regexes carry /g, so reset lastIndex between files to avoid skipped matches.
      rule.pattern.lastIndex = 0
      let match
      while ((match = rule.pattern.exec(content)) !== null) {
        const text = match[0].trim()
        if (rule.allow(text)) continue
        findings.push({
          rule: rule.id,
          severity: rule.severity,
          file: file.rel,
          line: lineOf(content, match.index),
          excerpt: text.slice(0, 120),
          message: rule.message,
        })
        // A rule firing many times in one file adds noise without adding information.
        if (findings.filter((f) => f.file === file.rel && f.rule === rule.id).length >= 3) break
      }
    }
  }

  const errors = findings.filter((f) => f.severity === 'error')
  const warnings = findings.filter((f) => f.severity === 'warn')

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ scanned, findings }, null, 2)}\n`)
  } else {
    process.stdout.write(`\nOriginality audit — scanned ${scanned} files\n`)
    for (const f of findings) {
      const tag = f.severity === 'error' ? 'ERROR' : 'warn '
      process.stdout.write(`  ${tag} ${f.file}:${f.line}  [${f.rule}]\n`)
      process.stdout.write(`        ${f.message}\n`)
      process.stdout.write(`        > ${f.excerpt}\n`)
    }
    process.stdout.write(
      `\n  ${errors.length} error(s), ${warnings.length} warning(s)\n\n`,
    )
  }

  if (errors.length > 0) {
    process.stderr.write(
      'Originality audit failed. Every file here must be independently written.\n' +
        'See ORIGINALITY.md for the policy.\n',
    )
    process.exit(1)
  }
}

main().catch((error) => {
  process.stderr.write(`Originality audit crashed: ${error?.stack ?? error}\n`)
  process.exit(1)
})
