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

Download `dist/v3/pq-trivia.min.js`, the one-file bundle.

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
<link rel="stylesheet" href="dist/v3/themes/paper.css" />
<script type="module" src="dist/v3/player.js"></script>

<pq-quiz src="my-quiz.trivia" seed="quiz-night"></pq-quiz>
```

## What it does

|              |                                                                    |
| ------------ | ------------------------------------------------------------------ |
| **Play**     | Interactive, graded, results, review, resume. Keyboard first.       |
| **Print**    | Whole quiz, answer sheet, answer form, grade table, flash cards.    |
| **Types**    | Open, choice, list, range, estimate, sort, rank, match, cloze, matrix, parts, classification, diagram, hotspot, odd one out. |
| **Languages**| One file per language, shared IDs or order, eight UI languages.       |
| **Looks**    | Paper theme, theme folders, fonts, backgrounds, tokens, animation.  |
| **Offline**  | One folder on a USB stick. `file://` with no network.               |
| **Live**     | Phones join by code. Separate bundle.                               |
| **Exports**  | Embedded JSON, standalone HTML, GIFT, QTI, CSV.                     |
| **Tools**    | Validate, format, migrate, pack, encrypt, grade. Bun only.          |
| **Author**   | The wizard: slides, forms, Trivia Syntax and a preview in one page. |

## Install

```bash
bun install
bun run build
```

Copy from `dist/v3/`. `bun run build --languages nl` ships one interface
language. `bun run build --editor` adds the wizard.

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

| Folder           | What                                                    |
| ---------------- | ------------------------------------------------------- |
| `dist/v3/`       | Current.                                                |
| `dist/v2/`       | Frozen V2. `pq-trivia.min.js`, 108 KB. Works, unchanged. |
| `dist/v1-final/` | Older still.                                            |

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

Preact for the renderer. Trystero, only when you want phones. VitePress for the
docs. Nothing else.

## License

MIT. See [LICENSE](LICENSE).
