# Migrating from V2

V2 still ships in `dist/v2/` and still works. Nothing forces you to move.

## What stays

- Every V2 line still works: questions, answers, scores, types, order,
  comments, masks. Only the headings moved down one level.
- `dist/v2/pq-trivia.min.js` stays downloadable.
- Embedded JSON loads through `load({ type: "inline", data })`, with a warning.
- Theme folders still work: stylesheet, fonts, backgrounds, settings.

## What changed on purpose

| Change                                            | Why                                    | What you do                                              |
| ------------------------------------------------- | -------------------------------------- | -------------------------------------------------------- |
| Author order is the default                       | Shuffling by default surprised people  | Turn on shuffle in Settings, or `shuffleQuestions: true` |
| Raw HTML is off                                   | A quiz file could run script           | Use the syntax, or opt in                                |
| `FormatText` and `HiddenAtPlay` need real booleans | `"false"` was truthy                   | Write `false`                                            |
| Theme URLs resolve from the page's base URL       | The old way broke on file pages        | `theme="themes/forest/"`, or `Theme => forest`           |
| Theme settings are a file, not JS                 | No script to run, no object to import  | Move `QuizTheme` values into `theme.trivia-theme`        |
| `rtf` upload is gone                              | It never worked                        | Convert to `.txt`                                        |
| Export does not reshuffle                         | That was a bug                         | Nothing                                                  |

## Headings moved one level

V2 used `#` for a round, `##` for a question and `###` for a key block. V3 adds
the quiz title on top, so every heading moves down one:

| V2            | V3                 |
| ------------- | ------------------ |
| (none)        | `# The quiz title` |
| `# Round`     | `## Round`         |
| `## Question` | `### Question`     |
| `### Answers` | `#### Answers`     |

Everything is optional, including the title. `Question =>` blocks need no
heading at all. The formatter writes the title as `#` and sections as `##`.

Convert a folder without touching anything else:

```bash
bun run cli/index.ts migrate questions/ --headings --write
```

The command reads the headings around them and shifts `#`, `##` and `###` one
level. It keeps a `.bak`.

A file with a single `#` heading is ambiguous: it could be a title or a round.
Add `--from-v2` to force the old reading. `--check` exits 1 when work is needed.
The formatter leaves ambiguous files untouched, and skips files with no quiz
content.

## V2 options, one by one

Almost every V2 option has a V3 home. The few that do not are named with the
reason.

| V2                                                                                                                       | V3                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `id`                                                                                                                     | One quiz per `<pq-quiz>`; no container ID                                                               |
| `title`                                                                                                                  | `title` config, or the `Quiz` header                                                                    |
| `seed`, `keepQuestionOrder`, `keepSectionOrder`, `keepAnswerOrder`                                                       | `seed`, `shuffleQuestions`, `shuffleRounds`, `keepQuestionOrder`, `keepSectionOrder`, `keepAnswerOrder` |
| `url`                                                                                                                    | `base-url` on the element, used for probing and themes                                                  |
| `builtin`                                                                                                                | `load({ type: "inline", data })` and `quiz.export.embedded()`                                           |
| `filenamePattern`, `filenames`, `fileExtensions`, `subFolderQuestions`                                                   | `filename`, `filenames`, `file-extensions`, `questions-folder` element attributes                       |
| `subFolderMedia`, `subFolderTheme`                                                                                       | Same options; relative media goes under `subFolderMedia`, a bare `theme` name under `subFolderTheme`    |
| `dateCreation`                                                                                                           | `dateCreation` config, shown on the start screen                                                        |
| `settings`, `hideDefaultSettings`                                                                                        | `settings` config (`button`, `toggle`, `text`) and `hideDefaultSettings`                                |
| `languageDefault`, `languages`, `translations`, `syncPropertiesWithTranslations`                                         | Same names on `QuizConfig`; see the languages guide                                                     |
| `theme`, `themeDisabled`                                                                                                 | `theme` config, `<pq-quiz theme>`, `themeDisabled`, `themeUpload`                                       |
| `icon`, `bannerImage`                                                                                                    | `icon` config and `bannerImage` config                                                                  |
| `hideDefaultStyles`                                                                                                      | The host chooses whether to load `themes/paper.css`                                                     |
| `skipLoadingScreen`, `skipLoadingScreenIfBuiltin`                                                                        | Loading is a promise; the host decides what to show meanwhile                                           |
| `allowInput`                                                                                                             | `restricted` config                                                                                     |
| `defaultScore`, `minScore`, `maxScore`, `hideScore`, `hideScoreOnAnswers`                                                | Same options; scores are clamped when the plan is built                                                 |
| `defaultAuthor`, `defaultCategory`, `hideAuthor`, `hideCategory`                                                         | Same options                                                                                            |
| `possibleAuthors`, `possibleCategories`                                                                                  | Same options; an outside value produces a warning, as in V2                                              |
| `showPropertiesWithoutDiversity`                                                                                         | Same option                                                                                             |
| `include`, `exclude`, `groupBy`, `minAnswers`, `maxAnswers`, `questionTypesAllowed`, `excludeSections`, `filterSections` | Same names on `QuizConfig`                                                                              |
| `randomizeMedia`                                                                                                         | `randomizeMedia`, or `MediaOrder => shuffle`                                                            |
| `addSecretThemeQuestions`, `hideSecretThemeMessage`                                                                      | Same options; the secret question is translated                                                         |
| `disableTextFormatting`                                                                                                  | Same option, or `FormatText => false` per question                                                      |
| `defaultTimer`, `hideTimerGlobal`, `hideTimerQuestion`, `timerStrategy`                                                  | Same options (`expire`, `skip`, `continue`)                                                             |
| `allowTimerOnSections`, `addMissingSectionScreens`                                                                       | Same options; a section screen opens each round and can carry the default timer                         |
| `dateCreation`, `mediaAutoPlay`, `loadExternalMediaAsIframe`                                                             | Same names                                                                                              |
| `enableSafety`, `enableMouse`, `disableKeys`, `disableUI`, `disableTouch`                                                | Same names                                                                                              |
| `hotkeys`, `hotkeysForbidden`, `toolbar`                                                                                 | Same names; V2 action names such as `font-size-plus` are accepted                                       |
| `forbidInlineLists`, `hideErrors`                                                                                        | Same names                                                                                              |
| `symbols`                                                                                                                | `symbols` config                                                                                        |
| `fileExtensionsUpload`                                                                                                   | Uploads are the host's `<input type="file">`, then `load({ type: "files" })`                            |
| `linkPrefixes`, `mediaFormats`                                                                                           | Same options; prefixes stay external, other extensions fall back to links                               |

## Already there, easy to miss

- `###` question shorthand and `#### Key` blocks.
- `$` keeps a value exactly as written. A bare `photo.jpg`, `song.mp3` or
  `clip.mp4` in `Answers` becomes media, like V2.
- `PlaceAt`, `PlaceBefore`, `PlaceAfter` for order constraints.
- `AnswersOrder` and `MediaOrder` take `keep` or `shuffle`.
- `When`, `Unlock` and `Continue` control flow. See the syntax guide.
- `HiddenAtPlay`, `HiddenAtExport`, `Print`, `PrintFallback`, `Buttons`,
  `Credits`, `Class`, `Layout`, `Background`, `Transition`, `Reveal`,
  `ColorScheme`, `Variant`, `Alt` and `SyncAll`.
- `AlsoAccept`, `Reject`, `Grading` and `FuzzyDistance` for text answers.
- `Script` widgets, sandboxed and off unless `allowScripts` is on.
- `Include`, manifests, worker parsing and the IndexedDB cache.
- Embedded JSON, print variants, GIFT, QTI, CSV and standalone HTML.
- Encryption, resume, retry-wrong and the review screen.

## Themes, languages and switching

- A theme is still a folder with fonts, backgrounds and a stylesheet.
- `### ColorScheme name` adds `Light`, `Dark`, `Background` and `Text`
  values, used by `ColorScheme => name`.
- `Language => NL` in a question, `quiz.nl.trivia` file names, and
  `Language =>` headers all feed the same language picker.
- Press `L`, use the start-screen picker, or call `quiz.setLanguage("NL")`.
  Answers, reveals and hints travel with you.

## The new page

One file, no server:

```html
<script id="quiz-text" type="text/plain">
  Question => ...
</script>
<script src="pq-trivia.min.js"></script>
```

Or served, with an element and a theme folder. Copy `player.js` and `themes/`
from `dist/v3/` after a build, and keep them beside the page:

```html
<link rel="stylesheet" href="themes/paper.css" />
<script type="module" src="player.js"></script>
<pq-quiz src="questions/quiz.txt" theme="themes/forest/" seed="my-seed"></pq-quiz>
```

## Your old theme

A V2 `QuizTheme` object maps almost line for line to a folder:

| V2                             | V3 `theme.trivia-theme`                                 |
| ------------------------------ | ------------------------------------------------------- |
| `label`                        | `Label => forest`                                       |
| `external`                     | `Stylesheet => style.css`                               |
| `fonts.body` / `fonts.heading` | `Font => body \| Lora \| bold \| Lora-Bold.woff2`       |
| `backgroundImages`             | `### Background` and one file per line                  |
| `backgroundAlpha`              | `BackgroundAlpha => 0.5`                                |
| `boldHeadings`                 | `BoldHeadings => true`                                  |
| `colors`                       | `--pq-accent => #2f6b4f`, and the other `--pq-*` tokens |

The folder keeps `style.css`, the font files and the images. Inline CSS can move
into `style.css`. `QuizTheme` itself is not part of V3; the CSS is the contract.

## The new API

```ts
import { Quiz } from "@pandaqi/pq-trivia";

new Quiz({ text: myText, id: "quiz", seed: "my-seed" });
```

`new Quiz(params)` still mounts itself: `id` fills an existing `#quiz` (or any
selector), and without one the quiz appends to the body. The text loads in the
constructor; `await quiz.loading` if you need to wait. Config keys go inline,
like V2, with the V3 names. The CLI `migrate` renames the old ones for you.

## If something breaks

```bash
bun run cli/index.ts validate questions/ --strict
```

Every diagnostic has a code, a location and a suggestion. If a real V2 file does
not parse, that is a bug worth an issue.
