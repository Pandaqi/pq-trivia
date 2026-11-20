# Contributing

Small repo, small rules. Read `AGENTS.md` and `CODING_STYLE.md` first.

## Setup

```bash
bun install
bun run check
bun run lint
bun test
bun run build
```

Bun does everything: run TypeScript, check types, lint, format, test, bundle.
No Biome, no ESLint, no Prettier, no bundler config.

## Rules that matter

- **No new dependencies.** Preact, optional Trystero, VitePress for docs.
  `@types/bun` is dev-only. A PR that adds a fourth gets a kind no.
- **Core has no DOM.** `src/core/**` compiles with `lib: ["ES2022"]`. If it
  needs a `document`, it belongs in `renderers/` or `platform/`.
- **500 lines per file, 12 entries per folder.** `bun run lint` checks it.
- **Tests stay cheap.** Whole suite under 10 seconds. No coverage number.
- **One documentation home.** `docs/`. No new markdown files in the repo
  root.

## Writing

Short sentences. Bullet lists. Simple words. A small joke now and then. Cut
filler. Never three sentences where one works.

Commit messages are sentence case, no prefix, what changed:

```
Adds reconnect tokens to the live room
```

## Changing the parser, grading or rendering

Add one fixture. `test/fixtures/` has `simple`, `all-types`, `broken`,
`v2-real`. A bug fix gets the file that would have caught it.

## Pull requests

- One thing per PR. Say why, not just what.
- `bun run check && bun run lint && bun test && bun run build && bun run size`
  must pass.
- Screenshots for visual changes. Look at the page before claiming it works.
