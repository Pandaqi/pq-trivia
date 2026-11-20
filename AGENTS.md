# AGENTS.md

Master file. Keep it short. Details live in the links.

## What this is

PQ-Trivia: a plain-text quiz engine for pub quizzes and classrooms. V2 ships. V3 is planned.

Read `docs/` before changing anything. The syntax, the API and the guides live there.

Code style rules live in `CODING_STYLE.md`. Read that too.

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

- **No new dependencies.** Preact, Trystero (optional, multiplayer) and `uqr` (lazy join QR) at runtime. Dev only: VitePress, `@types/bun`, `happy-dom`, `axe-core`. That is the whole list.
- **Bun only.** `bun check`, `bun lint`, `bun fmt`, `bun test`, `bun build`. No Biome, ESLint, Prettier, dependency-cruiser.
- **TypeScript, strictest settings.** The `tsconfig` files hold them. Enums are fine and welcome.
- **Core has no DOM.** `src/core/**` must compile with `lib: ["ES2022"]`.
- **Keep tests cheap.** The dev machine is a 15-year-old laptop. Whole suite under 10 seconds. No coverage gates.
- **Offline and plain text stay first-class.** No backend. Trivia Syntax is the only authoring format.
- **One documentation home.** Add to `docs/`. Do not spawn new markdown files.

## Where things are

| Need                      | Look at                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| Syntax, API and guides    | `docs/`                                                             |
| V2 documentation          | `docs.md`                                                           |
| Requirements list         | `todo.md`                                                           |
| V3 code                   | `src/core/`, `src/entries/`, `cli/`                                 |
| Renderers and platform    | `src/renderers/`, `src/platform/`                                   |
| Shared player/wizard bits | `src/shared/` (the info bubble)                                     |
| Live mode                 | `src/multiplayer/`                                                  |
| Docs site                 | `docs/` (VitePress)                                                 |
| Runnable examples         | `examples/` (`player`, `element`, `print`, `custom`, `multiplayer`) |
| V2 code, frozen           | `src/v2/`, `template/`, `dist/v2/`                                  |
| User-facing intro         | `README.md`                                                         |

## Commands

```
bun install
bun run check      # types
bun run lint
bun run fmt
bun run test
bun run build
bun run size
bun run bench           # 10k questions through parse, plan and grade
bun run check:content   # parse, validate and count the real quiz files
bun run docs            # print the attribute reference as a Markdown table
bun run docs:dev        # VitePress, local
bun run docs:reference  # regenerate docs/syntax/reference.md
bun run release:dry     # every check, then the human checklist
bun run preview         # serve the repo and open examples/player.html
```

These exist once Phase 0 is done. Until then, there is nothing to build. Do not fake a green check.

## Before you say it is done

`CONTRIBUTING.md` has the checks. Then look at the page yourself.
