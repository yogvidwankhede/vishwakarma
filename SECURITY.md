# Security policy

## Reporting a vulnerability

Report security issues privately through GitHub's security advisory feature on this
repository, or by email to the address listed on the organisation profile. Do not open a
public issue.

You will get an acknowledgement within a few days, an assessment of severity, and a fix
timeline. We will credit you in the advisory unless you prefer otherwise.

## What is in scope

Vishwakarma reads source code and writes files into a repository, so the interesting risks
are about that boundary rather than about a running service.

**Path traversal in the CLI.** Every path we write is derived from a skill id or an adapter
constant, and skill ids are validated as lowercase kebab-case. A skill id that escaped its
directory and let us write outside the project root would be a serious bug.

**Injection through generated files.** Skill content becomes YAML frontmatter, Markdown, and
JSON. A skill whose description could break out of its frontmatter block and inject
arbitrary configuration into an agent would be a serious bug. The frontmatter serialiser
quotes anything ambiguous specifically to prevent this, and it is tested.

**Prompt injection through skill content.** A malicious third-party skill could contain
instructions aimed at the agent rather than guidance for the user. This is a real risk of
the whole category, not something we can fully solve. Treat installing a skill with the same
caution as installing a dependency: read it first, and prefer catalogs you trust.

**MCP server input handling.** The server accepts arbitrary strings and parses colours,
globs, and numbers from them. Anything that turns that into code execution, unbounded
memory growth, or a crash loop is in scope.

**Supply chain.** A dependency with a compromised or non-permissive licence, or a transitive
dependency we did not intend, is in scope. CI runs a licence audit and fails on anything
outside the permissive set.

## What is out of scope

**The advice being wrong.** A rule that gives poor design guidance is a correctness bug, not
a security issue — please open a normal issue, ideally arguing with the stated mechanism.

**Agents behaving badly with correct guidance.** We can only supply instructions; we cannot
constrain what an agent does with them.

**Vulnerabilities in the agents themselves.** Report those to the agent's vendor.

**Denial of service through absurd input.** Passing a hundred-megabyte string to a colour
parser will be slow. That is expected.

## Our commitments

**No telemetry.** A tool that reads your source code should not phone home about it.
Vishwakarma collects nothing, sends nothing, and has no network calls at runtime beyond
whatever your package manager does at install time.

**No network access at runtime.** The CLI, the auditors, and the MCP server operate entirely
on local files. The MCP server speaks to its client over stdio and to nothing else.

**No code execution from skill content.** Skill bodies are text. The only executable field
is a `command` check, which is displayed to the user as a shell command to run rather than
executed automatically.

**Minimal dependency surface.** The foundation packages have zero runtime dependencies. The
CLI has five, all widely used and permissively licensed. We would rather write fifty lines
than add a dependency for them.

**Licence gating in CI.** A pull request introducing a copyleft, source-available, or
unrecognised licence fails the build, so a licence problem cannot arrive quietly.

## Supported versions

While the project is pre-1.0, only the latest published version receives security fixes.

## Disclosure

We aim to publish a fix and an advisory within thirty days of a confirmed report, sooner for
anything actively exploitable. We will coordinate timing with you if you plan to publish
your own write-up.
