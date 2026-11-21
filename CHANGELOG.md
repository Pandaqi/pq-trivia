# Changelog

Newest first. For authors and for developers, split where it matters.

## 3.0.0 — V3

The rewrite. Same Trivia Syntax, new bones.

### For authors

- **Paper theme.** Warm cream, ink, fern. Tokens you can override.
- **Theme folders.** A folder with `theme.trivia-theme`, a stylesheet, fonts and
  background images. `theme="themes/forest/"`, or `Theme => forest` in the
  header. Pick a folder from disk at quiz start with `theme-upload`.
- **One file.** `pq-trivia.min.js` has the player, Paper and the print sheet
  inside. Put the quiz in `<script id="quiz-text">` and open the page.
- **`#### Key` blocks.** `#### Answers` with one value per line, ending at the
  next key or heading. `###` stays the question shorthand.
- **Languages are back.** One file per language, `Language` + shared `ID`,
  order matching, `SyncAll`, a start-screen picker and `L` to switch mid-quiz.
  Answers, hints and reveals survive the switch.
- **English and Dutch interface.** Every screen, button and validation message
  goes through one dictionary, and hosts can override any key.
- **Filtered builds.** `bun run build --languages nl` ships one language,
  `--languages none` ships no interface strings at all. English is not a
  fallback; a missing key stays a key.
- **Section screens and timers.** `addMissingSectionScreens` opens each round
  with its name, and `allowTimerOnSections` lets that screen count down.
- **Paths follow the config.** `subFolderMedia`, `subFolderTheme`,
  `linkPrefixes` and `mediaFormats` now resolve and classify media instead of
  sitting in the type as decoration.
- **Answers keep their formatting.** Markdown, links, `![images](file)` and
  media-as-answer (V2's behaviour) all render in answer lists.
- **The rest of the V2 switches.** Filters, `groupBy`, score clamps, timer
  strategies, `toolbar`, `hotkeys`, `forbidInlineLists`, custom settings,
  theme colour schemes, filename probing and the media options all do what
  their names say.
- **V2 config doors.** `theme`, `defaultTimer`, `addSecretThemeQuestions` and
  `disableTextFormatting` work from `createQuiz`.
- **Orders that listen.** `AnswersOrder` and `MediaOrder` finally do something.
- **V2 keys and marks.** Space, `<` and `>`, `a` and `m` work; `~strike~` is
  back; `Sources` show under the question.
- **More question types.** Estimate, rank, matrix, parts, classification,
  diagram, hotspot and odd one out, next to the old ones.
- **Interactive play.** Type answers, get graded, see results, review what you
  missed, resume an unfinished attempt.
- **Real print.** Cover, rounds, one question per page, answer sheet, answer
  form, grade table, flash cards.
- **Export.** Embedded JSON, one-file HTML handout, GIFT, QTI, CSV.
- **Live mode.** Phones join by code. Separate bundle, off by default.
- **QuizWizard.** Slide list, generated forms, the Trivia Syntax text and a
  live preview in one page. Build it with `bun run build --editor`. It is never
  in a normal build.
- **Encrypted quizzes.** `pq-trivia encrypt` with a passphrase.
- **Offline pack.** One folder, opens from `file://`. It offers a reload when
  a new version is packed, instead of swapping the quiz mid-round.
- **Transcripts.** `transcript="intro.txt"` under an audio or video player.
- **Share by seed.** A link carries the seed and the order. Never an answer.
- **Class analytics.** One CSV, one row per question, across every saved
  attempt on the device.
- **Better diagnostics.** Every problem has a code, a place, a sentence and a
  suggestion.
- **All V2 files still parse.** Default order is author order now. Shuffle is
  opt-in.

### For developers

- **Headless core.** Parse, plan, session and grading with no DOM. Runs in a
  Worker, a CLI or a test.
- **Typed entries.** `core`, `headless`, `player`, `browser`, `multiplayer`,
  `animations`, `editor`, and the IIFE.
- **Editor entry.** `editor.js`, budgeted apart. The text is the only model, so
  the wizard has no state to drift.
- **`<pq-quiz>` element.** Light DOM. One quiz per element.
- **Events and view models.** `ScreenViewModel` is the renderer contract.
- **Worker parsing.** `createWorkerParser()` above 1 MB, with a sync fallback.
- **IndexedDB cache.** Text with ETag revalidation, LRU eviction, quota handling.
- **Manifests.** Explicit file lists. No probing, no `HEAD` requests.
- **Live protocol v1.** Host owns state, players get an allowlist, reconnect
  tokens, late flags, rate limits.
- **Budgets in CI.** A gzipped limit for every artifact, checked by
  `bun run size`.
- **CLI.** Validate, format, migrate, build, import, pack, encrypt, grade,
  stats, docs, plus `keygen` and `verify` for signed packs.
- **Plugin question types.** `defineQuestionType` and
  `quiz.registerQuestionType`. The type grades itself and brings its own input
  component; core stays free of Preact and the DOM.
- **Signed packs.** Ed25519 over a SHA-256 per file, with the public key in the
  pack. `pack --key`, `verify`.

### Changed

- Author order is the default. `shuffleQuestions: true` when you want chaos.
- Raw HTML is off. Use the syntax.
- `FormatText` and `HiddenAtPlay` need real booleans.
- Theme URLs resolve from the page's base URL, not the old fixed folder.
- The toolbar no longer mutates config. `document.body` is never wiped.
- Export no longer reshuffles.
- `rtf` upload removed. It never worked.

### Fixed

The V2 defect list, roughly in order of pain: HTML injection, the results
screen wiping the page, choice grading by index, sync XHR, unstable IDs, the
broken print CSS, timers that drift, and the theme cycle.

## 2.5.0

The last V2 release. Frozen in `dist/v2/`. Works as it always did.
