# createQuiz

```ts
// Until the package is on npm: import from "./dist/v3/player.js".
import { createQuiz } from "pq-trivia";

const quiz = createQuiz({
  config: {
    seed: "quiz-night",
    shuffleQuestions: false,
    restricted: false,
  },
});
```

## The one-liner

```ts
import { Quiz } from "pq-trivia";

const quiz = new Quiz({ text, id: "quiz", seed: "quiz-night" });
```

Text goes in the constructor and loads itself. `id` names the element to mount
into, like V2, and that is the whole setup: no `mountQuiz` afterwards. Leave it out and the quiz appends a block to the body, so a page
with nothing but a script tag still works. `quiz.destroy()` takes the mount
down again.

`await quiz.loading` waits for the load. It is always a promise, already
resolved when the constructor started nothing.

Any other input rides along as `load`:

```ts
new Quiz({ load: { type: "inline", data: embeddedJson }, id: "quiz" });
```

Set neither and the quiz waits for `quiz.load()`, like before. Give both `text`
and `load` and `load` wins.

The same class without the mount lives in `pq-trivia/core`; `mountQuiz(quiz,
element)` still picks the element by hand, and `<pq-quiz>` still exists.

`new Quiz({ ... })` takes every config key inline, or in `config`. It is the
same object `createQuiz` returns: the constructor is a thin shell around the
factory, so the state getters stay live. Nothing is copied eagerly and nothing
costs extra at runtime. Import the class or the function, whichever reads better.

## Config

| Option                                                                        | Default            | What it does                                                                 |
| ----------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------- |
| `seed`                                                                        | header or `pq`     | same seed, same plan                                                         |
| `shuffleQuestions`                                                            | `false`            | author order stays                                                           |
| `shuffleRounds`                                                               | `false`            | same                                                                         |
| `language`                                                                    | header             | content language now                                                         |
| `languageDefault`                                                             | first language     | root language                                                                |
| `languages`                                                                   | found              | shortlist of languages                                                       |
| `translations`                                                                | built-in `en`/`nl` | UI strings per language                                                      |
| `syncPropertiesWithTranslations`                                              | `false`            | copy layout and scoring from the root                                        |
| `include` / `exclude`                                                         | none               | property-value filters                                                       |
| `groupBy`                                                                     | none               | keep one property together                                                   |
| `minAnswers` / `maxAnswers`                                                   | none               | answer-count filter                                                          |
| `questionTypesAllowed`                                                        | all                | type filter                                                                  |
| `excludeSections` / `filterSections`                                          | `false` / none     | ignore or hide rounds                                                        |
| `minScore` / `maxScore`                                                       | none               | clamp question scores                                                        |
| `hideScore` / `hideScoreOnAnswers`                                            | `false`            | hide points                                                                  |
| `defaultAuthor` / `defaultCategory`                                           | none               | fill empty properties                                                        |
| `possibleAuthors` / `possibleCategories`                                      | none               | reserved; not validated                                                      |
| `hideAuthor` / `hideCategory`                                                 | `false`            | hide the meta strip                                                          |
| `showPropertiesWithoutDiversity`                                              | `false`            | show a property with one value                                               |
| `dateCreation`                                                                | none               | year on the start screen                                                     |
| `addSecretThemeQuestions` / `hideSecretThemeMessage`                          | `false`            | secret round question and banner                                             |
| `keepQuestionOrder` / `keepSectionOrder` / `keepAnswerOrder`                  | `false`            | explicit order                                                               |
| `randomizeMedia`                                                              | `false`            | shuffle media                                                                |
| `defaultTimer`                                                                | none               | seconds without `Timer`                                                      |
| `timerStrategy`                                                               | `continue`         | `expire`, `skip` or `continue`                                               |
| `hideTimerGlobal` / `hideTimerQuestion`                                       | `false`            | hide the countdown                                                           |
| `disableTextFormatting`                                                       | `false`            | every value as written                                                       |
| `forbidInlineLists`                                                           | `false`            | do not split values on `\|`                                                  |
| `symbols`                                                                     | default            | swap syntax characters                                                       |
| `hideErrors`                                                                  | `false`            | hide the problems panel                                                      |
| `enableSafety` / `enableMouse` / `disableKeys` / `disableUI` / `disableTouch` | `false`            | interaction switches                                                         |
| `hotkeys` / `hotkeysForbidden` / `toolbar`                                    | none               | keys and visible buttons                                                     |
| `answerLabels`                                                                | `letters`          | `letters`, `lowercase`, `numbers`, `roman` or `none`                         |
| `metadataIcons`                                                               | `true`             | icons in the question header                                                 |
| `questionTypeHints`                                                           | `true`             | "This is an open question." under the title                                  |
| `printTypeHints`                                                              | `true`             | the same line under the question on paper                                    |
| `allowInput`                                                                  | `true`             | offer interactive play on the start screen                                   |
| `mediaAutoPlay` / `loadExternalMediaAsIframe`                                 | `false`            | media behaviour                                                              |
| `url` / `subFolderMedia`                                                      | none               | root and folder for relative media                                           |
| `linkPrefixes` / `mediaFormats`                                               | V2 defaults        | which paths are links, which extensions are media                            |
| `subFolderTheme`                                                              | `themes/`          | folder for a bare `theme` name                                               |
| `addMissingSectionScreens`                                                    | `true`             | a section screen before each round                                           |
| `allowTimerOnSections`                                                        | `false`            | section screens may use the default timer                                    |
| `settings` / `hideDefaultSettings`                                            | none / `false`     | host controls on the start screen                                            |
| `title` / `icon` / `bannerImage`                                              | header             | page details                                                                 |
| `themeDisabled`                                                               | `false`            | ignore `theme`                                                               |
| `defaultScore`                                                                | `1`                | points for a question without `Points`                                       |
| `restricted`                                                                  | `false`            | no answers mode, no reveal, no back                                          |
| `revealMode`                                                                  | `never`            | `always` or `afterAnswer`                                                    |
| `policy`                                                                      | `required`         | what counts as answered                                                      |
| `grading`                                                                     | question           | one mode for the whole quiz                                                  |
| `allowScripts`                                                                | `false`            | sandboxed `Script` widgets                                                   |
| `timerSound`                                                                  | `false`            | beeps in the last five seconds                                               |
| `codeHighlight`                                                               | `false`            | colour fenced code                                                           |
| `answersKey`                                                                  | none               | opens encrypted files                                                        |
| `theme`                                                                       | none               | theme folder or `.css`, like V2                                              |
| `themeUpload`                                                                 | `false`            | "Load a theme folder" on the start screen                                    |
| `layoutMode`                                                                  | `viewport`         | `viewport` fills the window and scrolls inside; `inline` grows with the page |
| `defaultTimer`                                                                | none               | seconds for questions without `Timer`                                        |
| `disableTextFormatting`                                                       | `false`            | show every value as written                                                  |
| `addSecretThemeQuestions`                                                     | `false`            | ask each round's secret at its end                                           |

Every option above can also be set in the `.trivia` header, next to `Title` and
`Seed`: `MediaFormats => jpg | png`, `FilterSections => Round two`, and so on.
The syntax reference lists the header spelling of each key. Code wins over the
file, so a host can always override what the author wrote.

## Load

```ts
await quiz.load({ type: "text", text, file: "quiz.trivia" });
await quiz.load({ type: "files", files: [{ name: "a.trivia", text }] });
await quiz.load({ type: "inline", data: embeddedJson });
await quiz.load({ type: "encrypted", data: lockedJson });
```

Above 1 MB, move parsing off the main thread:

```ts
import { createWorkerParser } from "pq-trivia/browser";
const quiz = createQuiz({ parseText: createWorkerParser() });
```

## Play

```ts
quiz.next(); // { ok, reason?, issues? }
quiz.prev();
quiz.goTo(3);
quiz.setResponse(questionId, response);
quiz.reveal();
quiz.revealHint();
quiz.setMode(PlayMode.Answers);
quiz.showResults();
quiz.setLanguage("NL"); // answers and hints travel along
quiz.languages(); // ["EN", "NL"]
quiz.t("next"); // current UI language
```

A blocked `next()` says why: `invalid`, `required`, `blocked` or `end`.

## Read

```ts
quiz.state; // the whole session, plain data
quiz.currentScreen(); // the view model
quiz.progress(); // { index, total, answered, percent }
quiz.grade(); // GradeReport or null
quiz.diagnostics(); // every parse and validation problem
quiz.meta; // title, authors, seed, language
```

In question mode the view model has no correct answers. That is the contract.

## Events

```ts
quiz.on("question:enter", ({ index, id }) => {});
quiz.on("grade:ready", ({ report }) => {});
quiz.on("diagnostic", ({ diagnostic }) => {});
quiz.subscribe((state, screen) => {});
```

| Event                         | When                  |
| ----------------------------- | --------------------- |
| `ready`                       | the plan exists       |
| `state:change`                | status changed        |
| `screen:change`               | new screen view model |
| `question:enter`              | a question is shown   |
| `response:change`             | an answer changed     |
| `hint:reveal`                 | a hint was used       |
| `timer:tick` / `timer:expire` | countdown             |
| `grade:ready`                 | results calculated    |
| `mode:change`                 | questions ↔ answers   |
| `diagnostic`                  | a problem was found   |
| `destroy`                     | teardown              |

## Override a screen

```ts
quiz.views.set(ScreenKind.Results, (screen, quiz) => {
  const node = document.createElement("section");
  node.textContent = `${screen.report.percent}%`;
  return node;
});
```

## Themes

```ts
import { loadTheme, setTheme, themeFromFiles } from "pq-trivia/player";

setTheme(await loadTheme("themes/forest/")); // a folder, or a .css file
setTheme(await themeFromFiles(Array.from(input.files ?? []))); // stays local
```

`getTheme()` and `subscribeTheme(fn)` read the active theme. A theme applies
tokens, fonts and one background per question to `.pq-quiz`.

## Destroy

```ts
quiz.destroy();
```

Listeners, timers, views and actions go. Mount and destroy a hundred times and
nothing should grow.

## `<pq-quiz>`

```html
<pq-quiz src="quiz.trivia" seed="music-night" shuffle-questions></pq-quiz>
```

Light DOM. One quiz per element. `element.quiz` gives you the controller;
`element.manifest` is filled when a manifest loader is used. `theme="themes/forest/"`
loads a theme folder, `theme-upload` adds the folder picker, and `Theme => name`
in the header works when the attribute is absent.
