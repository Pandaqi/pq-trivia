# PQ Trivia

![Example screenshot of a quiz.](pq-trivia-header.webp)

[![CI](https://github.com/Pandaqi/pq-trivia/actions/workflows/ci.yml/badge.svg)](https://github.com/Pandaqi/pq-trivia/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-6f4b98)](LICENSE)
[![core 24 KB gzip](https://img.shields.io/badge/core-24%20KB%20gzip-839c66)](dist/README.md)

A quiz is a text file. Write questions, open a page, play.

Plain text in. Playable, printable, gradable out. No account, no backend, no
build step for the person hosting the quiz night.

## Twenty-second start

One bundle. One page. Double-click it.

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

`pq-trivia.min.js` carries the player, Paper and the print sheet. No stylesheet,
no second file.

Hosting from a server? Use the element instead:

```html
<link rel="stylesheet" href="dist/v3/themes/paper.css" />
<script type="module" src="dist/v3/player.js"></script>

<pq-quiz src="my-quiz.trivia" seed="quiz-night"></pq-quiz>
```

## What it does

|               |                                                                                |
| ------------- | ------------------------------------------------------------------------------ |
| **Play**      | Interactive, graded, results, review, resume. Keyboard first.                  |
| **Print**     | Whole quiz, answer sheet, answer form, grade table, flash cards.               |
| **Types**     | Open, choice, list, range, sort, match, cloze, sections, start/end.            |
| **Languages** | One file per language, shared IDs or order, English/Dutch UI, live switching.  |
| **Looks**     | Paper theme, theme folders, fonts, randomized backgrounds, tokens, animations. |
| **Offline**   | One folder on a USB stick. `file://` with no network.                          |
| **Live**      | Optional phones-in-the-room bundle. Separate. Zero weight by default.          |
| **Exports**   | Embedded JSON, standalone HTML, GIFT, QTI, CSV.                                |
| **Tools**     | Validate, format, migrate, pack, encrypt, grade. Bun only.                     |
| **Author**    | The wizard: slides, forms, Trivia Syntax and a preview in one page. Separate.  |

## Sizes

Gzipped, measured by `bun run size`:

| File                      | Budget                |
| ------------------------- | --------------------- |
| `core.js`                 | 24 KB                 |
| `player.js`               | 52 KB                 |
| `pq-trivia.min.js` (IIFE) | 60 KB                 |
| `multiplayer.js`          | 22 KB, separate       |
| `browser.js`              | 8 KB, optional extras |

## Install

```bash
bun install
bun run build
# or only the interface language you need
bun run build --languages nl
```

Copy from `dist/v3/`. The [install guide](docs/getting-started/install.md) has
the three paths: one script tag, an ES module, or a package.

## Documentation

- [Five-minute quiz](docs/getting-started/quick-start.md)
- [Trivia Syntax](docs/syntax/overview.md) and the [attribute reference](docs/syntax/reference.md)
- [API](docs/api/create-quiz.md)
- [Multiplayer](docs/guides/multiplayer.md)
- [Offline](docs/guides/offline.md)
- [Builds and languages](docs/guides/builds.md)
- [Migrating from V2](docs/getting-started/migrating-from-v2.md)

The docs are a VitePress site: `bun run docs:dev`.

## Older versions

| Folder           | What                                                     |
| ---------------- | -------------------------------------------------------- |
| `dist/v3/`       | Current.                                                 |
| `dist/v2/`       | Frozen V2. `pq-trivia.min.js`, 108 KB. Works, unchanged. |
| `dist/v1-final/` | Older still.                                             |
| `template/`      | The V2 starter folder. Still works, still points at V2.  |

V3 demos live in `examples/`: player, element, print, custom, multiplayer.
V2 files parse unchanged. See [migrating from V2](docs/getting-started/migrating-from-v2.md).

## Working on it

```bash
bun run check     # types
bun run lint      # layers and hygiene
bun test          # under a second
bun run build
bun run size      # budgets
bun run bench     # 10k questions
bun run release:dry
```

Read `docs/` before changing anything. Read `CODING_STYLE.md` too.

## Built with

Preact for the renderer. Trystero, only in the multiplayer bundle. VitePress
for these docs. Nothing else.

## License

MIT. See [LICENSE](LICENSE).
