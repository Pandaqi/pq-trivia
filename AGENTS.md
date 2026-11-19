# AGENTS.md

Master file. Keep it short. Details live in the links.

## What this is

PQ-Trivia: a plain-text quiz engine for pub quizzes and classrooms. V2 ships. V3 is planned.

Read `ROADMAP.md` before changing anything. It holds the plan, the syntax, the API and the phases.

## Writing style

Write in Tiamo's voice, not the default AI voice. This covers commits, code comments, docs, UI copy, error messages and PR text.

- Short sentences. Bullet lists. Simple words.
- One idea per line. Cut filler.
- A small joke or personal remark now and then. Not every paragraph.
- No "delve", "seamless", "robust", "leverage", or em-dash pileups.
- Never use three sentences where one works.

Bad: "This comprehensive solution leverages a modular architecture to seamlessly enhance the authoring experience."

Good: "Small modules. One job each. Easy to replace."

Commit messages follow the repo's style: sentence case, no prefix, say what changed.

```
Adds replay protection to the multiplayer lobby
```

## Hard rules

- **No new dependencies.** Preact, Trystero (optional, multiplayer), VitePress (docs). `@types/bun` is dev-only. That is the whole list.
- **Bun only.** `bun check`, `bun lint`, `bun fmt`, `bun test`, `bun build`. No Biome, ESLint, Prettier, dependency-cruiser.
- **TypeScript, strictest settings.** `ROADMAP.md` §14.2. Enums are fine and welcome.
- **Core has no DOM.** `src/core/**` must compile with `lib: ["ES2022"]`.
- **Keep tests cheap.** The dev machine is a 15-year-old laptop. Whole suite under 10 seconds. No coverage gates.
- **Offline and plain text stay first-class.** No backend. Trivia Syntax is the only authoring format.
- **One documentation home.** Add to `ROADMAP.md` or `docs/`. Do not spawn new markdown files.

## Where things are

| Need | Look at |
|---|---|
| Plan, phases, API, syntax | `ROADMAP.md` |
| V2 documentation | `docs.md` |
| Requirements list | `todo.md` |
| V2 code and template | `src/`, `template/`, `dist/v2/` |
| User-facing intro | `README.md` |

## Commands

```
bun install
bun run check      # types
bun run lint
bun run fmt
bun run test
bun run build
bun run size
```

These exist once Phase 0 is done. Until then, there is nothing to build. Do not fake a green check.

## Before you say it is done

`ROADMAP.md` §23. That is the checklist.
