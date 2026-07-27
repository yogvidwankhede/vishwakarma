# Releasing

Publication to npm is the one step that has to happen from a maintainer's machine, because
it requires the npm account. Everything else is already in place: scoped package names,
`publishConfig.access: public`, changesets, and a dependency tree the licence audit keeps
permissive-only.

## One-time setup

1. Create the npm account and the `vishwakarma` organisation at npmjs.com, so the
   `@vishwakarma/*` scope is yours. Claim the unscoped `vishwakarma` name too — it is the
   CLI's package name, and squatters exist.
2. `npm login` locally.

## Every release

```bash
pnpm changeset            # describe what changed; pick a bump per package
pnpm version-packages     # apply the bumps and update the lockfile
git add -A && git commit -m "chore: version packages"
pnpm release              # builds every package, then `changeset publish`
git push --follow-tags
```

## After the first publish

Two fallbacks in this repository come alive on their own:

- `npx vishwakarma <command>` works everywhere, so the README's from-checkout
  instructions become the slow path rather than the only path.
- The `.mcp.json` emitted on machines *without* a local build (`npx -y @vishwakarma/mcp`)
  starts successfully instead of failing with a registry 404. `vishwakarma doctor`
  stops flagging it.

Update the README's Quick start to lead with npx at that point — the plugin install for
Claude Code stays as-is either way.
