# Pushing this to GitHub

The repository is already initialised with clean commit history. Two steps.

## 1. Create an empty repo on GitHub

Go to https://github.com/new — name it `vishwakarma`, leave every "initialise with"
checkbox **unticked** (no README, no .gitignore, no licence), and create it.

## 2. Push

Replace `YOUR-USERNAME`, then paste the whole block into a terminal from inside the
unzipped folder:

```bash
git remote add origin https://github.com/YOUR-USERNAME/vishwakarma.git
git branch -M main
git push -u origin main
```

If you have the GitHub CLI, this does both steps at once:

```bash
gh repo create vishwakarma --public --source=. --remote=origin --push \
  --description "Design intelligence for AI coding agents. Skills, tokens, and motion that install into Claude Code, Cursor, Windsurf, Codex, Gemini CLI and more."
```

## After pushing

Add topics so it is findable:

```bash
gh repo edit --add-topic ai,agent-skills,claude-code,cursor,design-system,frontend,react,tailwindcss,mcp,design-tokens
```

## Verifying it builds on a clean checkout

```bash
pnpm install
pnpm build
pnpm test
node packages/cli/dist/index.js list
```
