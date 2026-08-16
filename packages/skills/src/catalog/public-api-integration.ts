// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * "Find an API for this" looks like a lookup and is actually a selection problem with a
 * verification step, and every failure mode in agent-written integrations comes from
 * treating it as the former.
 *
 * The public-apis catalog is a hand-maintained Markdown table — 1,683 entries across 52
 * categories, with five columns and no sixth. There is no rate limit column, no uptime
 * column, no licence column, and no last-verified column, because a directory is not a
 * registry. An agent that reads a row and starts writing a fetch call has silently
 * assumed all four of the missing facts, and the row it read may describe a service that
 * stopped answering two years ago.
 *
 * Two numbers from the table generate most of the rules below. **CORS is `Unknown` for
 * 977 of the 1,683 entries and `No` for another 150**, so a browser-direct call is
 * unsupported or unverified for roughly two thirds of the catalog; only 297 entries are
 * simultaneously no-auth, HTTPS, and CORS `Yes`. The default architecture is therefore a
 * server-side route, and browser-direct is the exception that has to earn itself with a
 * preflight probe. And **728 entries require an `apiKey`** — which means a signup, a
 * secret, and a class of mistake (key in client bundle, key in git) that is trivially
 * avoidable at integration time and expensive afterwards.
 *
 * So the shape of the work is: state what the interface actually needs, shortlist from the
 * table, *probe the live endpoint before writing any code against it*, pick the
 * architecture from the verified CORS answer rather than the claimed one, put the call
 * behind an adapter so the provider is one file rather than fifty call sites, and design
 * the failure state before the success state — because a third-party API that a project
 * does not pay for is not a dependency it can hold to any promise.
 */
export const publicApiIntegration: SkillManifest = {
  vsm: '1.0',
  id: 'public-api-integration',
  name: 'Public API Integration',
  description:
    'Use when an interface needs live third-party data and no API is chosen yet: selecting from public-apis, probing it, and wiring it safely.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'integration',
  tags: ['api', 'integration', 'public-apis', 'http', 'data-fetching', 'cors', 'secrets'],

  activation: {
    intents: [
      'the interface needs real data from some third-party service and no API has been chosen yet',
      'finding a free or public API for weather, currency, geocoding, sports, images, or similar',
      'wiring a REST endpoint into an app and deciding whether it can be called from the browser',
      'a fetch to a third-party API is failing with a CORS error',
      'an API key needs to be introduced into a project without leaking it',
      'replacing mock or hardcoded data in a prototype with a live source',
      'a third-party API the app depends on has started failing, rate-limiting, or returning a changed shape',
      'evaluating several candidate APIs for the same job and needing to pick one',
    ],
    globs: [
      '**/lib/api/**',
      '**/services/**/*.{ts,tsx,js,jsx}',
      '**/app/api/**/route.{ts,js}',
      '**/pages/api/**/*.{ts,js}',
      '**/*.{adapter,client,provider}.{ts,js}',
      '**/.env*',
    ],
    keywords: [
      'public api',
      'public-apis',
      'free api',
      'third-party api',
      'rest api',
      'api key',
      'cors',
      'preflight',
      'rate limit',
      'fetch',
      'endpoint',
      'proxy route',
      'integrate an api',
    ],
  },

  content: {
    summary:
      'Use when no API is chosen yet: shortlist from the public-apis catalog, probe the endpoint before writing code, route through the server unless verified CORS says otherwise, keep keys off the client, and design the failure state first.',

    body: `# Public API Integration

The source catalog is \`github.com/public-apis/public-apis\` — a Markdown table at
\`README.md\`, fetchable raw from
\`raw.githubusercontent.com/public-apis/public-apis/master/README.md\`. **1,683 entries,
52 categories, five columns: API, Description, Auth, HTTPS, CORS.**

There is no rate-limit column, no uptime column, no licence column, and no
last-verified column. Reading a row and writing a fetch call against it assumes all
four. Treat the table as a *shortlist generator*, never as an integration spec.

> The old \`api.publicapis.org\` JSON service is unreliable and should not be depended on.
> Parse the Markdown; it is the artefact the project actually maintains.

---

## 1. What the columns actually say

| Column | Values in the table | What it means for you |
|---|---|---|
| **Auth** | \`No\` (782) · \`apiKey\` (728) · \`OAuth\` (150) | \`No\` = usable immediately. \`apiKey\` = signup + a secret. \`OAuth\` = a full consent flow; rarely worth it for read-only display data. |
| **HTTPS** | Yes (1,580) · No (92) | \`No\` is disqualifying. Not a preference — a plaintext dependency in a TLS page is a mixed-content block and a tampering surface. |
| **CORS** | Unknown (977) · Yes (545) · No (150) | \`Unknown\` means *nobody checked*, not "probably fine". |

**Only 297 of 1,683 entries are simultaneously no-auth, HTTPS, and CORS \`Yes\`** — under
one in five. That single number decides the architecture below.

Parsing note: rows are not perfectly uniform. Some carry trailing pipes, a few wrap the
Auth value in backticks or embed a Postman button in the cell. Match on
\`^\\|\\s*\\[(name)\\]\\((url)\\)\\s*\\|\` and split the remainder on \`|\`, then normalise —
strip backticks, trim, and treat anything unrecognised as \`Unknown\`.

---

## 2. The pipeline

**Frame → Shortlist → Probe → Architect → Adapt → Degrade → Record.**

### Frame
Write one sentence: *what field does the interface render, at what freshness, for how many
users?* "A weather API" is not a requirement. "Current temperature and condition icon for
one city, refreshed every 10 minutes, on a page with maybe 200 daily views" is — and it
rules out three quarters of the candidates immediately.

### Shortlist
Fetch the raw README, filter to the category, then rank: HTTPS \`Yes\` is a hard filter;
Auth \`No\` beats \`apiKey\` beats \`OAuth\`; CORS \`Yes\` beats \`Unknown\` beats \`No\`. Keep
**three** candidates, not one. The top choice fails the probe often enough that having a
second costs nothing now and saves a round trip later.

### Probe — the step that is always skipped
Before writing a line of integration code, call the real endpoint:

\`\`\`bash
curl -s -o /tmp/probe.json -w '%{http_code} %{time_total}s %{size_download}B\\n' \\
  'https://api.example.com/v1/thing?q=test'
curl -sI 'https://api.example.com/v1/thing?q=test' | grep -iE 'access-control|ratelimit|retry-after'
\`\`\`

You are answering five questions the table cannot: does it still exist, what is the real
response shape, how slow is it, what rate limit headers come back, and does
\`Access-Control-Allow-Origin\` actually appear. **A CORS header that is absent here
overrides a \`Yes\` in the table.** The table drifts; the response does not.

### Architect
- \`Access-Control-Allow-Origin\` present **and** auth is \`No\` → browser-direct is allowed.
- Anything else → **server-side route**. This is the default, and it is the right default
  for two thirds of the catalog. A proxy route also gives you the only place to put
  caching, the key, and a timeout.

### Adapt
One module per provider, exporting a function that returns *your* domain type, not theirs:

\`\`\`ts
export interface Weather { tempC: number; condition: string; observedAt: Date }
export async function getWeather(city: string): Promise<Weather> { /* map here */ }
\`\`\`

Provider fields never leak past this file. Swapping APIs then edits one module instead of
every component that touched \`data.main.temp\`.

### Degrade
Every call gets a timeout, a bounded retry with jitter on 429/5xx only, and a defined
state for *failed* as well as *loading* and *empty*. A free API you do not pay for owes
you nothing; treat unavailability as a normal state, not an exception.

### Record
Note which API was chosen, which two were rejected and why, and what the probe measured.
The next person to hit a failure needs to know whether the alternatives were already
tried.

---

## 3. Secrets

An \`apiKey\` entry means a secret exists from that moment. It goes in \`.env.local\`,
is read **only** in server code, and \`.env*\` is in \`.gitignore\` before the key is pasted
anywhere. \`NEXT_PUBLIC_\`, \`VITE_\`, and every equivalent prefix ship the value to the
browser — a key behind one of those is public, and rotating it is the only fix.
`,

    references: [
      {
        id: 'catalog-parsing',
        title: 'Parsing and filtering the public-apis catalog',
        answers:
          'How do I turn the README table into a filtered, ranked candidate list, and what does the messy real-world markup look like?',
        content: `# Parsing the public-apis catalog

Source: \`https://raw.githubusercontent.com/public-apis/public-apis/master/README.md\`

## Structure

\`### <Category>\` headings open a section; each is followed by a header row, a separator
row, and one row per API:

\`\`\`
### Animals
API | Description | Auth | HTTPS | CORS
|:---|:---|:---|:---|:---|
| [Cat Facts](https://catfact.ninja/) | Random cat facts | No | Yes | Yes |
| [Cats](https://docs.thecatapi.com/) | Pictures of cats from Tumblr | \`apiKey\` | Yes | No |
\`\`\`

## Reference extractor

\`\`\`python
import re, urllib.request

URL = "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md"
ROW = re.compile(r"^\\|\\s*\\[([^\\]]+)\\]\\(([^)]+)\\)\\s*\\|(.*)$")

def norm(v):
    v = v.strip().strip("\`").strip()
    return v if v else "Unknown"

def load():
    md = urllib.request.urlopen(URL).read().decode("utf-8")
    category, out = None, []
    for line in md.splitlines():
        if line.startswith("### "):
            category = line[4:].strip()
            continue
        m = ROW.match(line)
        if not (m and category):
            continue
        cells = [c.strip() for c in m.group(3).split("|")]
        # cells: description, auth, https, cors, (possibly empty trailing cells)
        out.append({
            "category": category,
            "name": m.group(1),
            "url": m.group(2),
            "description": cells[0] if cells else "",
            "auth": norm(cells[1]) if len(cells) > 1 else "Unknown",
            "https": norm(cells[2]) if len(cells) > 2 else "Unknown",
            "cors": norm(cells[3]) if len(cells) > 3 else "Unknown",
        })
    return out
\`\`\`

## Ranking

\`\`\`python
AUTH_RANK  = {"No": 0, "apiKey": 1, "X-Mashape-Key": 1, "OAuth": 2}
CORS_RANK  = {"Yes": 0, "Unknown": 1, "No": 2}

def shortlist(rows, category=None, query=None, allow_key=True):
    c = [r for r in rows if r["https"] == "Yes"]                       # hard filter
    if not allow_key:
        c = [r for r in c if r["auth"] == "No"]
    else:
        c = [r for r in c if AUTH_RANK.get(r["auth"], 3) <= 1]         # drop OAuth
    if category:
        c = [r for r in c if r["category"].lower() == category.lower()]
    if query:
        q = query.lower()
        c = [r for r in c if q in r["name"].lower() or q in r["description"].lower()]
    return sorted(c, key=lambda r: (AUTH_RANK.get(r["auth"], 3), CORS_RANK.get(r["cors"], 3)))[:3]
\`\`\`

## Known messiness

- Trailing empty cells produce a spurious sixth column. Index defensively.
- A handful of Auth cells contain a "Run In Postman" image link instead of a value.
- \`No\` appears both bare and backticked; \`apiKey\` likewise.
- Eleven rows have an empty HTTPS cell — treat as \`Unknown\` and let the probe decide.
- The APILayer promotional section near the top of the file is not a category. Start
  parsing from the first \`### \` heading that has a table under it, and ignore rows whose
  URL host is a tracking or referral domain.

## What the table cannot tell you

Rate limits, quotas, uptime, licence and terms of use, response schema, pagination style,
whether the service still exists. Every one of those is answered by the probe or by the
provider's own docs, and none of them by the row.
`,
      },
    ],
  },

  rules: [
    {
      id: 'public-api/reject-plaintext',
      strength: 'must-not',
      statement:
        'Integrate an API whose HTTPS column is `No`, or any endpoint that answers only over http://.',
      evidence: {
        rationale:
          'A plaintext dependency inside an HTTPS page is blocked as mixed content by every current browser, so it fails outright in production even when it works in local development. Where it is not blocked — a server-side call — the response is modifiable in transit by anything on the path, which means the interface renders attacker-controlled data.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Row: | [SomeAPI](http://api.example.com) | ... | No | No | Unknown |  → integrated anyway',
        good: 'HTTPS column is `No` → discard the candidate and take the next one on the shortlist.',
      },
      verifiedBy: 'selection-review',
    },
    {
      id: 'public-api/probe-before-integrating',
      strength: 'must',
      statement:
        'Call the live endpoint and inspect status, body shape, latency, and response headers before writing any integration code against it.',
      evidence: {
        rationale:
          'The catalog carries no last-verified field, so a row is evidence that an API existed when someone added it and nothing more. The probe is also the only source for the four facts the table omits entirely — real response shape, rate limit headers, latency, and whether CORS headers are actually sent — and each of those changes the code you would write.',
        confidence: 'established',
      },
      examples: {
        language: 'bash',
        bad: '// table says CORS: Yes\nconst r = await fetch(url)  // written before anyone called the endpoint',
        good: "curl -s -o /tmp/p.json -w '%{http_code} %{time_total}s\\n' 'https://api.example.com/v1/thing'\ncurl -sI 'https://api.example.com/v1/thing' | grep -i 'access-control\\|ratelimit'",
      },
      verifiedBy: 'selection-review',
    },
    {
      id: 'public-api/server-side-by-default',
      strength: 'must',
      statement:
        'Route third-party calls through a server-side handler unless the probe showed an `Access-Control-Allow-Origin` header and the API needs no key.',
      evidence: {
        rationale:
          'CORS is Unknown for 977 of the 1,683 catalogued entries and No for 150, so browser-direct is unsupported or unverified for roughly two thirds of the catalog and a Yes in the table is a claim rather than a measurement. The server route is also the only place that can hold the key, the cache, and the timeout, so choosing it by default collapses four decisions into one.',
        confidence: 'established',
      },
      exceptions: [
        'A probe confirmed the CORS header and the API requires no credential — then browser-direct removes a hop and a server dependency.',
      ],
      verifiedBy: 'security-review',
    },
    {
      id: 'public-api/never-expose-keys',
      strength: 'must-not',
      statement:
        'Place an API key in client-side code, in a client-exposed environment variable (NEXT_PUBLIC_, VITE_, REACT_APP_), or in a committed file.',
      evidence: {
        rationale:
          'Build-time inlining means a prefixed variable is a literal string in the shipped bundle, readable by anyone who opens the network tab — the prefix is an explicit declaration that the value is public, not a naming convention. A committed key stays in git history after deletion, so the only real remediation is rotation, and that is a task nobody schedules until the quota is already exhausted by someone else.',
          confidence: 'established',
      },
      examples: {
        language: 'ts',
        bad: "const key = process.env.NEXT_PUBLIC_WEATHER_KEY  // shipped to the browser",
        good: "// app/api/weather/route.ts — server only\nconst key = process.env.WEATHER_API_KEY",
      },
      verifiedBy: 'security-review',
    },
    {
      id: 'public-api/adapter-boundary',
      strength: 'must',
      statement:
        'Wrap every third-party call in one module that returns a domain type you define, so no provider-shaped field reaches a component.',
      evidence: {
        rationale:
          'Free APIs are the dependencies most likely to disappear, rate-limit, or change shape without notice, and the cost of that event is set entirely by how many files mention their field names. An adapter makes the swap a single-file edit and makes the response shape mockable in tests without a network.',
        confidence: 'strong',
      },
      examples: {
        language: 'ts',
        bad: "<span>{data.main.temp}</span>  // OpenWeather's shape, in a component",
        good: "const weather = await getWeather(city)   // Weather { tempC, condition, observedAt }\n<span>{weather.tempC}</span>",
      },
      verifiedBy: 'resilience-review',
    },
    {
      id: 'public-api/design-the-failure-state',
      strength: 'must',
      statement:
        'Give every third-party call an explicit timeout, a bounded retry with jitter on 429 and 5xx only, and a designed failed state alongside loading and empty.',
      evidence: {
        rationale:
          'An unpaid third-party API owes the project no availability, so failure is a normal operating state rather than an exception, and an interface with no failed state renders a spinner forever when it occurs. Retrying on 4xx other than 429 cannot succeed — the request is wrong, not unlucky — and retrying without jitter synchronises every client into a thundering herd against a service that is already struggling.',
        confidence: 'established',
      },
      examples: {
        language: 'ts',
        bad: 'const r = await fetch(url)          // no timeout, no retry policy, no failed state',
        good: 'const r = await fetch(url, { signal: AbortSignal.timeout(5000) })\n// retry 429/5xx only, 2 attempts, backoff * (1 + Math.random() * 0.3)',
      },
      verifiedBy: 'resilience-review',
    },
    {
      id: 'public-api/verify-terms-before-shipping',
      strength: 'must',
      statement:
        "Read the provider's own terms, quota, and attribution requirements before shipping, and record what they say.",
      evidence: {
        rationale:
          'The catalog has no licence or rate-limit column, so a row cannot tell you whether commercial use is permitted, whether attribution is required, or how many requests a day are free. Discovering any of those after launch means either a takedown or an unplanned migration, and both cost more than the ten minutes the check takes.',
        confidence: 'strong',
      },
      verifiedBy: 'selection-review',
    },
    {
      id: 'public-api/shortlist-three',
      strength: 'should',
      statement:
        'Carry three candidates through the probe rather than committing to the first matching row.',
      evidence: {
        rationale:
          'Probes fail often enough on a directory with no liveness checking that a single candidate turns a routine step into a restart of the whole selection. The marginal cost of two extra probes is seconds; the cost of re-deriving the shortlist later is the whole task.',
        confidence: 'strong',
      },
      verifiedBy: 'selection-review',
    },
    {
      id: 'public-api/no-speculative-fanout',
      strength: 'must-not',
      statement:
        'Integrate several APIs for the same field "for redundancy" before one has been shown to be insufficient.',
      evidence: {
        rationale:
          'Each additional provider multiplies the failure surface, the response shapes to reconcile, and the secrets to manage, in exchange for redundancy the interface has not yet been shown to need. Fallback chains are also the code least likely to be exercised, so the second provider is usually broken by the time the first one fails.',
        confidence: 'opinion',
      },
      exceptions: [
        'A measured availability requirement exists and the primary has been observed to miss it.',
      ],
      verifiedBy: 'resilience-review',
    },
    {
      id: 'public-api/trust-the-response-over-the-table',
      strength: 'should-not',
      statement:
        'Treat the Auth, HTTPS, or CORS columns as authoritative once a live response contradicts them.',
      evidence: {
        rationale:
          'The table is community-maintained with no automated re-verification, so its columns record what was true when a contributor last looked. Where the observed response and the row disagree, the response is the current fact and the row is history.',
        confidence: 'established',
      },
      verifiedBy: 'selection-review',
    },
  ],

  verification: [
    {
      id: 'selection-review',
      kind: 'self-review',
      description:
        'Confirm the API was chosen from evidence rather than from the first matching row.',
      blocking: true,
      questions: [
        'Was the live endpoint actually called before integration code was written, and what were the status, latency, and response shape?',
        'Did the probe show an Access-Control-Allow-Origin header, and does that agree with the CORS column? If they disagree, which one did the architecture follow?',
        'Is the HTTPS column `Yes` for the chosen API, and does the endpoint refuse plaintext?',
        'Were three candidates shortlisted, and is it written down which two were rejected and why?',
        'Have the provider’s terms, quota, and attribution requirements been read, and is what they say recorded somewhere the next person will find it?',
      ],
    },
    {
      id: 'security-review',
      kind: 'self-review',
      description: 'Confirm no credential reaches the client and the call path is deliberate.',
      blocking: true,
      questions: [
        'Grep the built client bundle for the key value itself, not the variable name. Does it appear?',
        'Is every environment variable holding a secret free of a client-exposed prefix (NEXT_PUBLIC_, VITE_, REACT_APP_, PUBLIC_)?',
        'Was `.env*` in `.gitignore` before any real key was written to disk, and does `git log -S "<key prefix>"` come back empty?',
        'If the call is browser-direct, was that chosen because a probe confirmed CORS and no credential is needed — or because it was simply easier?',
        'Does the server route validate and constrain its own input, so it cannot be used as an open proxy to arbitrary upstream URLs?',
      ],
    },
    {
      id: 'resilience-review',
      kind: 'self-review',
      description:
        'Confirm the integration behaves when the third party is slow, rate-limited, or gone.',
      blocking: true,
      questions: [
        'Block the endpoint in DevTools and reload. Does the interface reach a designed failed state, or does it spin forever?',
        'Does every call carry an explicit timeout, and is the retry policy limited to 429 and 5xx with jitter on the backoff?',
        'Does any provider-shaped field name appear outside the adapter module?',
        'What happens on a 429 specifically — is Retry-After read, and is the user told something more useful than "error"?',
        'Can the whole integration be tested without a network, by mocking the adapter rather than the HTTP layer?',
      ],
    },
  ],

  relatedSkills: ['engineering-discipline', 'interface-states', 'code-quality', 'interface-copy'],
}
