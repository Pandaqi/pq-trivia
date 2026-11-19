# Changelog

Newest first. For authors and for developers, split where it matters.

## 3.0.0 — V3

The rewrite. Same Trivia Syntax, new bones.

### For authors

- **Paper theme.** Warm cream, ink, fern. Tokens you can override.
- **Interactive play.** Type answers, get graded, see results, review what you
  missed, resume an unfinished attempt.
- **Real print.** Cover, rounds, one question per page, answer sheet, answer
  form, grade table, flash cards.
- **Export.** Embedded JSON, one-file HTML handout, GIFT, QTI, CSV.
- **Live mode.** Phones join by code. Separate bundle, off by default.
- **Encrypted quizzes.** `pq-trivia encrypt` with a passphrase.
- **Offline pack.** One folder, opens from `file://`.
- **Better diagnostics.** Every problem has a code, a place, a sentence and a
  suggestion.
- **All V2 files still parse.** Default order is author order now. Shuffle is
  opt-in.

### For developers

- **Headless core.** Parse, plan, session and grading with no DOM. Runs in a
  Worker, a CLI or a test.
- **Typed entries.** `core`, `headless`, `player`, `browser`, `multiplayer`,
  `animations`, and the IIFE.
- **`<pq-quiz>` element.** Light DOM. One quiz per element.
- **Events and view models.** `ScreenViewModel` is the renderer contract.
- **Worker parsing.** `createWorkerParser()` above 1 MB, with a sync fallback.
- **IndexedDB cache.** Text with ETag revalidation, 200 MB LRU, quota handling.
- **Manifests.** Explicit file lists. No probing, no `HEAD` requests.
- **Live protocol v1.** Host owns state, players get an allowlist, reconnect
  tokens, late flags, rate limits.
- **Budgets in CI.** Core 24 KB, player 48 KB, IIFE 60 KB. Gzipped.
- **CLI.** Validate, format, migrate, build, pack, encrypt, grade, stats, docs.

### Changed

- Author order is the default. `shuffleQuestions: true` when you want chaos.
- Raw HTML is off. Use the syntax.
- `FormatText` and `HiddenAtPlay` need real booleans.
- Theme URLs resolve from the base, not the page.
- The toolbar no longer mutates config. `document.body` is never wiped.
- Export no longer reshuffles.
- `rtf` upload removed. It never worked.

### Fixed

The V2 defect list, roughly in order of pain: HTML injection, the results
screen wiping the page, choice grading by index, sync XHR, unstable IDs, the
broken print CSS, timers that drift, and the theme cycle.

## 2.5.0

The last V2 release. Frozen in `dist/v2/`. Works as it always did.
