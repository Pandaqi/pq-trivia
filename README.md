# PQ Trivia

![Example screenshot of a quiz.](pq-trivia-header.webp)

[![CI](https://github.com/Pandaqi/pq-trivia/actions/workflows/ci.yml/badge.svg)](https://github.com/Pandaqi/pq-trivia/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-6f4b98)](LICENSE)

Write a quiz as plain text. Play it in a browser, print it, or grade it.

- Quizzes are text files with a syntax that reads like English.
- No account, no backend, no build step.
- Pub quizzes, classrooms, trivia nights. Whatever you need it for.

V3 adds a visual quiz editor, phones-in-the-room live mode, more question types
and more languages. V2 files still parse.

## Twenty-second start

Download [`pq-trivia.min.js`](https://github.com/Pandaqi/pq-trivia/releases/latest/download/pq-trivia.min.js), the one-file bundle. Or take the package: `bun add @pandaqi/pq-trivia`.

Create an `index.html` next to it:

```html
<script id="quiz-text" type="text/plain">
  Title => Friday Night
  Seed => quiz-night

  Question => Which superhero is called the Man of Steel?
  Answers => Superman | Batman | Spider-Man
  Type => Choice
  Correct => Superman
  Explanation => Clark Kent, mild-mannered reporter.
</script>
<script src="pq-trivia.min.js"></script>
```

Double-click the file. That is a quiz.

**Hosting it?** Put only what you need on the server, and use the element:

```html
<link rel="stylesheet" href="themes/paper.css" />
<script type="module" src="player.js"></script>

<pq-quiz src="my-quiz.trivia" seed="quiz-night"></pq-quiz>
```

Those two files are `dist/v3/player.js` and `dist/v3/themes/paper.css` after a
local `bun run build`. Copy them next to the page. From the package, the same
doors are `@pandaqi/pq-trivia` and `@pandaqi/pq-trivia/themes/paper.css`.

## What it does

|              |                                                                    |
| ------------ | ------------------------------------------------------------------ |
| **Play**     | Interactive, graded, results, review, resume. Keyboard first.       |
| **Print**    | Whole quiz, answer sheet, answer form, grade table, flash cards.    |
| **Types**    | Open, choice, list, range, estimate, sort, rank, match, cloze, matrix, parts, classification, diagram, hotspot, odd one out. |
| **Languages**| One file per language, shared IDs or order, eight UI languages.       |
| **Looks**    | Paper theme, theme folders, fonts, backgrounds, tokens, animation.  |
| **Offline**  | One folder on a USB stick. `file://` with no network.               |
| **Live**     | Phones join by code. Bundled, off by default.                       |
| **Exports**  | Embedded JSON, standalone HTML, GIFT, QTI, CSV.                     |
| **Tools**    | Validate, format, migrate, pack, encrypt, grade. Bun only.          |
| **Author**   | The wizard: slides, forms, Trivia Syntax and a preview in one page. |

## Install

From npm:

```bash
bun add @pandaqi/pq-trivia
```

```ts
import { createQuiz } from "@pandaqi/pq-trivia";
import "@pandaqi/pq-trivia/themes/paper.css";
```

Or build this repo:

```bash
bun install
bun run build
```

A build writes everything to `dist/v3/`; copy from there. `bun run build
--languages nl` ships one interface language. `bun run build:editor` adds the
wizard. Types land in `dist/types/`. Neither folder is in git: the release
assets and the npm tarball carry the built files.

The [install guide](docs/getting-started/install.md) has the three paths: one
script tag, an ES module, or a package.

## Documentation

- [Five-minute quiz](docs/getting-started/quick-start.md)
- [Trivia Syntax](docs/syntax/overview.md) and the [attribute reference](docs/syntax/reference.md)
- [API](docs/api/create-quiz.md)
- [Multiplayer](docs/guides/multiplayer.md)
- [Offline](docs/guides/offline.md)
- [Builds and languages](docs/guides/builds.md)
- [Migrating from V2](docs/getting-started/migrating-from-v2.md)

The docs are a VitePress site: `bun run docs:dev`.

## Demos and older versions

Runnable demos live in `examples/feature-demos/`: `index.html` links them all.
`examples/quick-start-template/` is the smallest folder that works.

| Folder                       | What                                                    |
| ---------------------------- | ------------------------------------------------------- |
| `dist/v3/`                   | Current. Built by `bun run build`, not in git.          |
| [`dist/v2/`](dist/v2/)       | Frozen V2. `pq-trivia.min.js`, 108 KB. Works, unchanged. |
| [`dist/v1-final/`](dist/v1-final/) | Older still.                                      |

V2 files parse unchanged. See [migrating from V2](docs/getting-started/migrating-from-v2.md).

## Working on it

```bash
bun run check     # types
bun run lint      # layers and hygiene
bun test          # under a minute
bun run build
bun run size      # budgets
bun run bench     # 10k questions
bun run release:dry
```

Read `docs/` before changing anything. Read `CODING-STYLE.md` too.

## Built with

Preact for the renderer. Trystero, bundled into the live build. VitePress for
the docs. Nothing else.

## License

MIT. See [LICENSE](LICENSE).
