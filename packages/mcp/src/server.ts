/**
 * The Vishwakarma MCP server.
 *
 * Every other integration in this project writes files into a repository and hopes the
 * agent reads them. This one is different in kind: the agent asks, and gets an answer
 * computed at the moment of asking.
 *
 * That distinction matters more than it sounds. File-based instructions are static text
 * that must be loaded before it is known to be relevant, so a toolkit distributed that way
 * is always trading breadth against context cost. Here the standing cost is a list of tool
 * names, and everything else — a skill body, a generated palette, a contrast verdict, an
 * audit of the agent's own output — is fetched only when the question actually arises.
 *
 * It also lets us expose things a Markdown file simply cannot: real computation. An agent
 * can ask whether a colour pair passes contrast and get an arithmetic answer rather than
 * guessing, which is the difference between guidance and verification.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  DEFAULT_CONTRACT,
  VIEWPORT_MATRIX,
  buildRamp,
  checkContract,
  checksFor,
  contrastRatio,
  apcaContrast,
  fluidClamp,
  findAccessibleLightness,
  labelRamp,
  parseHex,
  resolveMotion,
  rgbToOklch,
  oklchToRgb,
  stagger,
  judgeProperty,
  resolveVariation,
  variationSpace,
  toCssOklch,
  toHex,
  type MotionIntent,
  type Observation,
} from '@vishwakarma/core'
import { catalog, catalogById, categories, skillCost } from '@vishwakarma/skills'
import {
  defaultTokenSet,
  buildTokenSet,
  toCss,
  toJson,
  toMarkdown,
  toTailwindTheme,
  toTypeScript,
} from '@vishwakarma/tokens'

const VERSION = '0.1.0'

const server = new McpServer(
  { name: 'vishwakarma', version: VERSION },
  {
    instructions: [
      'Vishwakarma provides design intelligence for building interfaces.',
      '',
      'Before building any UI, call `search_skills` with a description of what you are about',
      'to do, then `get_skill` for whichever skills it returns. Skills carry the working',
      'knowledge, the normative rules, and the self-checks to run before you report done.',
      '',
      'Prefer the computational tools over your own estimates. `check_contrast` gives an',
      'arithmetic answer where a guess would be unreliable, `build_palette` produces a',
      'perceptually even ramp that hand-picking will not match, and `audit_design` evaluates',
      'work against the project contract rather than against an impression.',
    ].join('\n'),
  },
)

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const text = (value: string) => ({ content: [{ type: 'text' as const, text: value }] })
const json = (value: unknown) => text(JSON.stringify(value, null, 2))

function parseColour(input: string): { r: number; g: number; b: number } {
  const parsed = parseHex(input)
  if (!parsed) {
    throw new Error(
      `Could not parse "${input}" as a colour. Provide a hex value such as #3d5afe or #fff.`,
    )
  }
  return parsed
}

/* -------------------------------------------------------------------------- */
/* Skill tools                                                                 */
/* -------------------------------------------------------------------------- */

server.registerTool(
  'list_skills',
  {
    title: 'List skills',
    description:
      'List every available Vishwakarma skill with its id, category, trigger description, and context cost. Call this to see what guidance exists before deciding what to load.',
    inputSchema: {
      category: z
        .enum(categories as [string, ...string[]])
        .optional()
        .describe('Filter to one category.'),
    },
  },
  ({ category }) => {
    const skills = category ? catalog.filter((skill) => skill.category === category) : catalog
    return json({
      count: skills.length,
      categories,
      skills: skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        category: skill.category,
        description: skill.description,
        ruleCount: skill.rules?.length ?? 0,
        estimatedTokens: skillCost(skill).activated,
        references: (skill.content.references ?? []).map((reference) => ({
          id: reference.id,
          answers: reference.answers,
        })),
      })),
    })
  },
)

server.registerTool(
  'search_skills',
  {
    title: 'Search skills by situation',
    description:
      'Find the skills relevant to what you are about to do. Describe the task in your own words — for example "building a pricing page with animated cards" — and this returns the skills that apply, ranked. Call this first, before writing any interface code.',
    inputSchema: {
      situation: z.string().describe('What you are about to build, fix, or review.'),
      limit: z.number().int().min(1).max(20).default(5).describe('Maximum skills to return.'),
    },
  },
  ({ situation, limit }) => {
    const needle = situation.toLowerCase()
    const words = needle.split(/\W+/).filter((word) => word.length > 3)

    // Deliberately a transparent lexical score rather than an opaque similarity number.
    // The agent can see why each skill matched, and can override the ranking when the
    // reason is wrong — which is not possible with a bare relevance float.
    const scored = catalog.map((skill) => {
      const reasons: string[] = []
      let score = 0

      for (const intent of skill.activation.intents ?? []) {
        const overlap = words.filter((word) => intent.toLowerCase().includes(word))
        if (overlap.length > 0) {
          score += overlap.length * 3
          reasons.push(`matches intent "${intent}"`)
        }
      }

      for (const keyword of skill.activation.keywords ?? []) {
        if (needle.includes(keyword.toLowerCase())) {
          score += 4
          reasons.push(`keyword "${keyword}"`)
        }
      }

      for (const tag of skill.tags ?? []) {
        if (needle.includes(tag.toLowerCase())) {
          score += 2
          reasons.push(`tag "${tag}"`)
        }
      }

      const descriptionOverlap = words.filter((word) => skill.description.toLowerCase().includes(word))
      score += descriptionOverlap.length

      return { skill, score, reasons: Array.from(new Set(reasons)) }
    })

    const matches = scored
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    // Never return nothing: a UI task always has at least a judgment component, and an
    // empty result would leave the agent to fall back on its defaults, which is exactly
    // what this toolkit exists to prevent.
    if (matches.length === 0) {
      const fallback = catalogById.get('design-judgment') ?? catalog[0]
      return json({
        matched: 0,
        note: 'No specific match. Returning the general design-judgment skill, which applies to any interface work.',
        skills: fallback
          ? [{ id: fallback.id, name: fallback.name, description: fallback.description, why: ['default'] }]
          : [],
      })
    }

    return json({
      matched: matches.length,
      skills: matches.map((entry) => ({
        id: entry.skill.id,
        name: entry.skill.name,
        description: entry.skill.description,
        estimatedTokens: skillCost(entry.skill).activated,
        why: entry.reasons,
      })),
      next: 'Call get_skill with each id you want to apply.',
    })
  },
)

server.registerTool(
  'get_skill',
  {
    title: 'Get a skill',
    description:
      'Retrieve the full working knowledge of one skill: its body, its normative rules with the reasoning behind each, and the self-checks to run before reporting completion.',
    inputSchema: {
      id: z.string().describe('The skill id, from list_skills or search_skills.'),
      includeRules: z.boolean().default(true).describe('Include the normative rules.'),
      includeChecks: z.boolean().default(true).describe('Include the verification checklist.'),
    },
  },
  ({ id, includeRules, includeChecks }) => {
    const skill = catalogById.get(id)
    if (!skill) {
      return text(
        `No skill with id "${id}". Available: ${catalog.map((s) => s.id).join(', ')}`,
      )
    }

    const parts: string[] = [skill.content.body]

    if (includeRules && skill.rules?.length) {
      parts.push('\n## Rules\n')
      for (const rule of skill.rules) {
        parts.push(`### ${rule.strength.toUpperCase().replace('-', ' ')} — ${rule.statement}`)
        if (rule.evidence?.rationale) parts.push(`\nWhy: ${rule.evidence.rationale}`)
        if (rule.exceptions?.length) {
          parts.push(`\nExceptions: ${rule.exceptions.join(' ')}`)
        }
        if (rule.examples?.bad) {
          parts.push(`\nIncorrect:\n\`\`\`${rule.examples.language ?? ''}\n${rule.examples.bad}\n\`\`\``)
        }
        if (rule.examples?.good) {
          parts.push(`\nCorrect:\n\`\`\`${rule.examples.language ?? ''}\n${rule.examples.good}\n\`\`\``)
        }
        parts.push('')
      }
    }

    if (includeChecks && skill.verification?.length) {
      parts.push('\n## Before reporting completion\n')
      for (const check of skill.verification) {
        parts.push(`### ${check.description}${check.blocking ? ' (blocking)' : ''}`)
        for (const question of check.questions ?? []) parts.push(`- ${question}`)
        parts.push('')
      }
    }

    if (skill.content.references?.length) {
      parts.push('\n## Available references\n')
      parts.push('Fetch one with get_skill_reference when its question is your question.\n')
      for (const reference of skill.content.references) {
        parts.push(`- \`${reference.id}\` — ${reference.answers}`)
      }
    }

    return text(parts.join('\n'))
  },
)

server.registerTool(
  'get_skill_reference',
  {
    title: 'Get a skill reference',
    description:
      'Retrieve deep reference material attached to a skill — edge cases, catalogues, worked examples. Only fetch one when its stated question is the question you actually have.',
    inputSchema: {
      skillId: z.string().describe('The skill that owns the reference.'),
      referenceId: z.string().describe('The reference id.'),
    },
  },
  ({ skillId, referenceId }) => {
    const skill = catalogById.get(skillId)
    if (!skill) return text(`No skill with id "${skillId}".`)

    const reference = skill.content.references?.find((entry) => entry.id === referenceId)
    if (!reference) {
      const available = (skill.content.references ?? []).map((r) => r.id).join(', ')
      return text(`No reference "${referenceId}" on skill "${skillId}". Available: ${available || 'none'}`)
    }

    return text(reference.content ?? `Reference "${referenceId}" has no inline content.`)
  },
)

/* -------------------------------------------------------------------------- */
/* Colour tools                                                                */
/* -------------------------------------------------------------------------- */

server.registerTool(
  'check_contrast',
  {
    title: 'Check colour contrast',
    description:
      'Compute the contrast between a foreground and background colour, and report whether it meets accessibility requirements. Use this instead of estimating — contrast is arithmetic, and estimates are unreliable in the mid-tones where most failures happen.',
    inputSchema: {
      foreground: z.string().describe('Foreground colour as hex.'),
      background: z.string().describe('Background colour as hex.'),
      textSize: z
        .enum(['body', 'large', 'non-text'])
        .default('body')
        .describe('body: normal text. large: 18.66px bold or 24px regular and above. non-text: borders, icons, focus rings.'),
    },
  },
  ({ foreground, background, textSize }) => {
    const fg = parseColour(foreground)
    const bg = parseColour(background)

    const ratio = contrastRatio(fg, bg)
    const apca = apcaContrast(fg, bg)

    const requirements = { body: { aa: 4.5, aaa: 7 }, large: { aa: 3, aaa: 4.5 }, 'non-text': { aa: 3, aaa: 3 } }
    const required = requirements[textSize]

    const result: Record<string, unknown> = {
      wcagRatio: Number(ratio.toFixed(2)),
      apcaLc: Number(apca.toFixed(1)),
      textSize,
      passesAA: ratio >= required.aa,
      passesAAA: ratio >= required.aaa,
      requiredAA: required.aa,
    }

    if (ratio < required.aa) {
      // Do not just report failure — compute the fix. An agent told "this fails" will
      // usually guess a darker colour and guess wrong; an agent given the exact passing
      // colour will use it.
      const suggestion = findAccessibleLightness(rgbToOklch(fg), bg, required.aa)
      result.verdict = `Fails. Needs ${required.aa}:1 for ${textSize}, has ${ratio.toFixed(2)}:1.`
      if (suggestion) {
        const fixed = oklchToRgb(suggestion)
        result.suggestedForeground = toHex(fixed)
        result.suggestedForegroundOklch = toCssOklch(suggestion)
        result.suggestionNote =
          'Same hue and chroma, lightness adjusted to the nearest value that passes, so the colour still reads as the same colour.'
      } else {
        result.suggestionNote =
          'No lightness of this hue and chroma can reach the target against this background. Reduce chroma, or change the background.'
      }
    } else {
      result.verdict = `Passes ${ratio >= required.aaa ? 'AAA' : 'AA'} for ${textSize} text.`
    }

    return json(result)
  },
)

server.registerTool(
  'build_palette',
  {
    title: 'Build a colour palette',
    description:
      'Generate a perceptually even colour ramp from a single seed colour, in OKLCh. Produces the 50–950 steps with lightness spaced by perception rather than by arithmetic, chroma shed toward the ends, and every step gamut-mapped without hue drift.',
    inputSchema: {
      seed: z.string().describe('Seed colour as hex.'),
      steps: z.number().int().min(3).max(15).default(11).describe('Number of steps.'),
      hueShift: z
        .number()
        .min(-40)
        .max(40)
        .default(0)
        .describe('Degrees of hue drift across the ramp. A small value mimics how light tints highlights and reads as designed rather than computed.'),
    },
  },
  ({ seed, steps, hueShift }) => {
    const parsed = parseColour(seed)
    const ramp = labelRamp(buildRamp(rgbToOklch(parsed), { steps, hueShift }))

    const white = { r: 1, g: 1, b: 1 }
    const black = { r: 0, g: 0, b: 0 }

    return json({
      seed,
      steps: Object.entries(ramp).map(([stop, colour]) => {
        const rgb = oklchToRgb(colour)
        return {
          stop,
          oklch: toCssOklch(colour),
          hex: toHex(rgb),
          contrastOnWhite: Number(contrastRatio(rgb, white).toFixed(2)),
          contrastOnBlack: Number(contrastRatio(rgb, black).toFixed(2)),
          usableAsBodyTextOn: [
            contrastRatio(rgb, white) >= 4.5 ? 'white' : null,
            contrastRatio(rgb, black) >= 4.5 ? 'black' : null,
          ].filter(Boolean),
        }
      }),
      note: 'Steps that list no usable background must not carry body text at any size.',
    })
  },
)

/* -------------------------------------------------------------------------- */
/* Motion tools                                                                */
/* -------------------------------------------------------------------------- */

server.registerTool(
  'resolve_motion',
  {
    title: 'Resolve motion parameters',
    description:
      'Turn a semantic motion intent into concrete duration, easing, and CSS. Choose the intent by what the motion means, not by how long you want it to take — the timing follows from the meaning.',
    inputSchema: {
      intent: z
        .enum(['enter', 'exit', 'transform', 'respond', 'attract', 'occupy', 'affirm', 'reject'])
        .describe(
          'enter: arriving. exit: leaving. transform: changing between held states. respond: tracking input. attract: drawing attention. occupy: showing work in progress. affirm: confirming success. reject: reporting failure.',
        ),
      distance: z
        .enum(['micro', 'short', 'medium', 'long', 'full'])
        .default('medium')
        .describe('How far the element travels.'),
      reducedMotion: z.boolean().default(false).describe('Whether the user prefers reduced motion.'),
    },
  },
  ({ intent, distance, reducedMotion }) => {
    const resolved = resolveMotion({ intent: intent as MotionIntent, distance, reducedMotion })
    return json({
      durationMs: resolved.durationMs,
      easing: resolved.cssEasing,
      cssTransition: resolved.cssTransition,
      reduced: resolved.reduced,
      guidance: resolved.notes,
    })
  },
)

server.registerTool(
  'check_animation_property',
  {
    title: 'Check whether a property is safe to animate',
    description:
      'Report whether a CSS property can be animated on the compositor or forces layout every frame, with a concrete alternative when it does.',
    inputSchema: {
      properties: z.array(z.string()).describe('CSS property names to check.'),
    },
  },
  ({ properties }) => json({ verdicts: properties.map((property) => judgeProperty(property)) }),
)

server.registerTool(
  'compute_stagger',
  {
    title: 'Compute stagger delays',
    description:
      'Compute per-element delays for a group reveal, with automatic compression so a long list still reads as one gesture rather than a queue.',
    inputSchema: {
      count: z.number().int().min(1).max(500).describe('Number of elements.'),
      step: z.number().min(0).max(300).default(34).describe('Delay between consecutive elements, in ms.'),
      from: z.enum(['first', 'last', 'centre', 'edges']).default('first'),
      maxTotal: z.number().min(50).max(2000).default(420).describe('Cap on total stagger span, in ms.'),
    },
  },
  ({ count, step, from, maxTotal }) => {
    const delays = stagger({ count, step, from, maxTotal })
    return json({
      delays,
      totalSpanMs: Math.max(...delays),
      compressed: Math.max(...delays) < (count - 1) * step,
      note:
        Math.max(...delays) < (count - 1) * step
          ? 'Compressed to stay within the maximum span, so the last element does not arrive after the user has started reading the first.'
          : 'No compression needed.',
    })
  },
)


server.registerTool(
  'design_direction',
  {
    title: 'Get a design direction for this brief',
    description:
      'Resolve a deterministic set of design decisions — hero composition, section rhythm, emphasis strategy, accent discipline, motion character — from the brief. Call this BEFORE designing anything. It exists to stop the design collapsing onto the most predictable option, which is what makes generated work recognisable as generated. Every option in every set is a defensible choice, so an unfamiliar selection is unfamiliar rather than wrong.',
    inputSchema: {
      brief: z
        .string()
        .describe("The user's brief, verbatim. Do not summarise it first — the exact text is the seed, and summarising collapses distinct briefs onto the same direction."),
      salt: z
        .string()
        .optional()
        .describe('Extra seed material. Pass something new when the user asks for a different direction for the same brief.'),
      constraints: z
        .array(z.string())
        .optional()
        .describe('Conditions that exclude options, for when an existing brand or design system fixes a decision.'),
    },
  },
  ({ brief, salt, constraints }) => {
    const result = resolveVariation({
      brief,
      ...(salt ? { salt } : {}),
      ...(constraints ? { constraints } : {}),
    })
    const space = variationSpace()

    return text(
      [
        result.directive,
        '',
        '---',
        `Selected from ${space.combinations.toLocaleString()} possible directions across ${space.axes.length} axes.`,
        'The same brief always resolves to the same direction, so this is reproducible and reviewable.',
      ].join('\n'),
    )
  },
)

/* -------------------------------------------------------------------------- */
/* Layout and audit tools                                                      */
/* -------------------------------------------------------------------------- */

server.registerTool(
  'fluid_size',
  {
    title: 'Generate a fluid CSS clamp',
    description:
      'Build a CSS clamp() that scales a value with viewport width. Retains a rem term so the result still respects the user’s browser font-size setting, which a pure vw value would ignore.',
    inputSchema: {
      minValue: z.number().describe('Value at the small viewport, in rem.'),
      maxValue: z.number().describe('Value at the large viewport, in rem.'),
      minViewport: z.number().default(360).describe('Viewport width where scaling begins, in px.'),
      maxViewport: z.number().default(1440).describe('Viewport width where scaling stops, in px.'),
    },
  },
  ({ minValue, maxValue, minViewport, maxViewport }) =>
    json({
      css: fluidClamp({ minValue, maxValue, minViewport, maxViewport }),
      note: 'The rem term preserves user font-size preferences; a pure vw value would override them and fail accessibility requirements.',
    }),
)

server.registerTool(
  'viewport_checklist',
  {
    title: 'Get the responsive test matrix',
    description:
      'Return the viewport configurations to verify against, and exactly what to check at each. Use this instead of asking whether something "is responsive", which is not a checkable question.',
    inputSchema: {
      requiredOnly: z.boolean().default(true).describe('Return only the release-blocking configurations.'),
    },
  },
  ({ requiredOnly }) => {
    const profiles = requiredOnly ? VIEWPORT_MATRIX.filter((v) => v.required) : VIEWPORT_MATRIX
    return json({
      viewports: profiles.map((profile) => ({
        id: profile.id,
        label: profile.label,
        width: profile.width,
        height: profile.height,
        zoom: profile.zoom,
        pointer: profile.pointer,
        required: profile.required,
        whyItIsInTheMatrix: profile.rationale,
        checks: checksFor(profile),
      })),
    })
  },
)

server.registerTool(
  'audit_design',
  {
    title: 'Audit against the Design Contract',
    description:
      'Evaluate measurements taken from an interface against the project Design Contract, and return specific violations with fixes. Extract the actual values from your output and pass them here rather than judging by impression.',
    inputSchema: {
      spacingValues: z.array(z.number()).optional().describe('Every distinct spacing value used, in px.'),
      fontSizesRem: z.array(z.number()).optional().describe('Every distinct font size, in rem.'),
      fontWeights: z.array(z.number()).optional(),
      durationsMs: z.array(z.number()).optional().describe('Every animation duration, in ms.'),
      radiiPx: z.array(z.number()).optional(),
      animatedProperties: z.array(z.string()).optional().describe('CSS properties being animated.'),
      hasReducedMotionGuard: z.boolean().optional(),
      headingLevels: z.array(z.number()).optional().describe('Heading levels in document order.'),
      contrastPairs: z
        .array(
          z.object({
            ratio: z.number(),
            kind: z.enum(['body', 'large', 'non-text']),
            label: z.string().optional(),
          }),
        )
        .optional(),
      touchTargetsPx: z
        .array(z.object({ width: z.number(), height: z.number(), label: z.string().optional() }))
        .optional(),
      rawColourLiterals: z.array(z.string()).optional().describe('Hard-coded colour values found in source.'),
    },
  },
  (observation) => {
    const report = checkContract(DEFAULT_CONTRACT, observation as Observation)
    return json({
      passed: report.passed,
      score: report.score,
      summary: report.summary,
      violations: report.violations.map((violation) => ({
        rule: violation.rule,
        severity: violation.severity,
        problem: violation.message,
        found: violation.actual,
        expected: violation.expected,
        fix: violation.fix,
      })),
      verdict: report.passed
        ? 'No blocking violations. Warnings are worth reviewing but do not block.'
        : 'Blocking violations present. Fix every error before reporting the work complete.',
    })
  },
)

/* -------------------------------------------------------------------------- */
/* Token tools                                                                 */
/* -------------------------------------------------------------------------- */

server.registerTool(
  'get_tokens',
  {
    title: 'Get design tokens',
    description:
      'Generate a complete design token set in the requested format. Supply a brand colour to derive the whole system from it, including a dark theme that is a separate design rather than an inversion.',
    inputSchema: {
      format: z.enum(['css', 'tailwind', 'typescript', 'json', 'markdown']).default('css'),
      brandColour: z.string().optional().describe('Brand colour as hex. Omit for the default set.'),
      accentColour: z.string().optional(),
      typeRatio: z.number().min(1.05).max(1.7).optional().describe('Modular scale ratio for the type scale.'),
    },
  },
  ({ format, brandColour, accentColour, typeRatio }) => {
    const set = brandColour
      ? buildTokenSet({
          primary: brandColour,
          ...(accentColour ? { accent: accentColour } : {}),
          ...(typeRatio ? { typeRatio } : {}),
        })
      : defaultTokenSet

    switch (format) {
      case 'tailwind':
        return text(toTailwindTheme(set))
      case 'typescript':
        return text(toTypeScript(set))
      case 'json':
        return text(toJson(set))
      case 'markdown':
        return text(toMarkdown(set))
      default:
        return text(toCss(set))
    }
  },
)

/* -------------------------------------------------------------------------- */
/* Resources                                                                   */
/* -------------------------------------------------------------------------- */

server.registerResource(
  'design-contract',
  'vishwakarma://contract',
  {
    title: 'Design Contract',
    description:
      'The machine-checkable constraints that generated interfaces must satisfy: spacing scale, type scale, contrast minimums, motion limits, and accessibility requirements.',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [
      { uri: uri.href, mimeType: 'application/json', text: JSON.stringify(DEFAULT_CONTRACT, null, 2) },
    ],
  }),
)

server.registerResource(
  'skill-catalog',
  'vishwakarma://skills',
  {
    title: 'Skill catalog',
    description: 'Index of every available skill with its trigger conditions and context cost.',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(
          catalog.map((skill) => ({
            id: skill.id,
            name: skill.name,
            category: skill.category,
            description: skill.description,
            estimatedTokens: skillCost(skill).activated,
          })),
          null,
          2,
        ),
      },
    ],
  }),
)

/* -------------------------------------------------------------------------- */
/* Prompts                                                                     */
/* -------------------------------------------------------------------------- */

server.registerPrompt(
  'build-interface',
  {
    title: 'Build an interface',
    description: 'The full Vishwakarma workflow for building any UI, from brief to verified output.',
    argsSchema: {
      brief: z.string().describe('What to build.'),
    },
  },
  ({ brief }) => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Build this interface: ${brief}

Follow the Vishwakarma workflow rather than going straight to code.

1. Call \`search_skills\` with a description of this task and load every skill it returns.

2. Before writing any markup, write down the content hierarchy: what is the single most
   important element on this screen, what is second, what is third. You will use this to
   decide visual weight, and without it every styling choice becomes a local guess.

3. Structure the layout with real content at realistic lengths. Do not use placeholder text
   that happens to fit — most layout defects are content-length defects that are invisible
   against convenient sample data.

4. Resolve every value to a token. Use \`get_tokens\` for the system. If you find yourself
   wanting a value that is not on a scale, that is a decision to make consciously rather
   than a number to type.

5. Verify colour choices with \`check_contrast\` rather than estimating. Use
   \`build_palette\` if you need a ramp.

6. Design the empty, loading, and error states, not only the happy path.

7. Add motion only where it carries meaning, and use \`resolve_motion\` to derive the
   timing from the intent. Check every animated property with
   \`check_animation_property\`.

8. Run the viewport sweep from \`viewport_checklist\`.

9. Extract the actual spacing values, font sizes, durations, and contrast ratios from what
   you built and pass them to \`audit_design\`. Fix every error-level violation.

10. Report what you built, what you assumed, what you deliberately left out, and anything
    that needs a human decision.`,
        },
      },
    ],
  }),
)

server.registerPrompt(
  'review-interface',
  {
    title: 'Review an interface',
    description: 'Run the structured critique protocol against existing interface code.',
    argsSchema: {
      target: z.string().describe('What to review — a file path, a component name, or a description.'),
    },
  },
  ({ target }) => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Review this interface: ${target}

Load the \`design-review\` and \`design-judgment\` skills with \`get_skill\` first, then run
the seven-pass protocol they describe.

Report findings as a prioritised list. Each finding must state the location, what is
actually wrong, why it matters, and the exact change to make. "Improve the spacing" is not
a finding. "Increase the gap between the section heading and the first card from 16px to
32px, because the current gap is smaller than the gap between the cards themselves, so the
heading reads as belonging to the first card rather than to the section" is.

Label each finding as a defect or a preference, and be honest about which. Lead with what
is working — a review that finds only faults gets discounted entirely, and usually
deserves to be.

Extract real measurements and run \`audit_design\` on them rather than judging by
impression.`,
        },
      },
    ],
  }),
)

/* -------------------------------------------------------------------------- */
/* Start                                                                       */
/* -------------------------------------------------------------------------- */

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // stdout carries the protocol, so any diagnostic output must go to stderr or it will
  // corrupt the message stream and the client will fail to initialise.
  process.stderr.write(`Vishwakarma MCP server ${VERSION} ready (${catalog.length} skills).\n`)
}

main().catch((error: unknown) => {
  process.stderr.write(`Vishwakarma MCP server failed to start: ${(error as Error).message}\n`)
  process.exit(1)
})
