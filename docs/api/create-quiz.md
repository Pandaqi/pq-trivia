# createQuiz

```ts
import { createQuiz } from "@pandaqi/pq-trivia";

const quiz = createQuiz({
  config: { seed: "quiz-night", shuffleQuestions: false },
});

await quiz.load({ type: "text", text, file: "quiz.trivia" });
```

## The one-liner

```ts
import { Quiz } from "@pandaqi/pq-trivia";

const quiz = new Quiz({ text, id: "quiz", seed: "quiz-night" });
```

Text goes in the constructor and loads itself. `id` names the element to mount
into, like V2. Leave it out and the quiz appends a block to the body, so a page
with nothing but a script tag still works.

`await quiz.loading` waits for that load. It is always a promise, already
resolved when nothing is loading. `quiz.destroy()` takes the mount down again.

Any other input rides along as `load`:

```ts
new Quiz({ load: { type: "inline", data: embeddedJson }, id: "quiz" });
```

Give both `text` and `load` and `load` wins. Give neither and the quiz waits for
`quiz.load()`.

The same class without the mount lives in `@pandaqi/pq-trivia/core`. `mountQuiz(quiz,
element)` still picks the element by hand, and `<pq-quiz>` still exists.

`new Quiz({ ... })` takes every config key inline, or in `config`. It is a thin
shell around the factory, so the state getters stay live.

## Config

Every key below also works in the `.trivia` header. The
[reference](../syntax/reference.html) lists the header spelling of each one.
Code wins over the file.

### Order

| Option                | Default | What it does                              |
| --------------------- | ------- | ----------------------------------------- |
| `seed`                | `pq`    | Same seed, same plan                      |
| `shuffleQuestions`    | `false` | Shuffle inside a round                    |
| `shuffleRounds`       | `false` | Shuffle the rounds                        |
| `keepQuestionOrder`   | `false` | Keep the author's question order          |
| `keepSectionOrder`    | `false` | Keep the author's round order             |
| `keepAnswerOrder`     | `false` | Never shuffle answers                     |
| `randomizeMedia`      | `false` | Shuffle media per question                |
| `pool`                | none    | Draw N questions per round                |
| `balanceDifficulty`   | `false` | Spread a pool across `Difficulty` tags    |
| `defaultSteps`        | none    | `Steps` for every question without its own |
| `defaultStepTransition` | `fade` | Animation between steps                  |

### Which questions play

| Option                 | Default | What it does                       |
| ---------------------- | ------- | ---------------------------------- |
| `include`              | none    | Property/value pairs to keep       |
| `exclude`              | none    | Property/value pairs to drop       |
| `groupBy`              | none    | Keep one property value together   |
| `questionTypesAllowed` | all     | Type filter                        |
| `minAnswers`           | none    | Answer-count floor                 |
| `maxAnswers`           | none    | Answer-count ceiling               |
| `excludeSections`      | `false` | Ignore rounds, play one list       |
| `filterSections`       | none    | Round names to hide                |

### Points and time

| Option                | Default    | What it does                                  |
| --------------------- | ---------- | --------------------------------------------- |
| `defaultScore`        | `1`        | Points for a question without `Points`        |
| `minScore`            | none       | Clamp question scores up                      |
| `maxScore`            | none       | Clamp question scores down                    |
| `hideScore`           | `false`    | Hide points                                   |
| `hideScoreOnAnswers`  | `false`    | Hide points in answer mode                    |
| `scoringPreset`       | standard   | `negative` costs points for a wrong answer    |
| `negativeMarking`     | `0.25`     | The slice a wrong answer costs when the preset is `negative`, 0 to 1 |
| `streaks`             | `false`    | 1.5x from three right, 2x from six            |
| `lifelines`           | none       | `50/50`, `extra-time`, `ask-room`             |
| `defaultTimer`        | none       | Seconds for questions without `Timer`         |
| `timerStrategy`       | `continue` | `expire`, `skip` or `continue`                |
| `hideTimerGlobal`     | `false`    | Hide the whole-quiz clock                     |
| `hideTimerQuestion`   | `false`    | Hide the per-question clock                   |
| `allowTimerOnSections`| `false`    | Section screens may use the default timer     |
| `timerSound`          | `false`    | Beep in the last five seconds                 |
| `quizLimit`           | none       | Whole-quiz limit, in milliseconds             |
| `roundTimer`          | none       | Default round limit, in milliseconds          |

`quizLimit` and `roundTimer` are milliseconds in code. The header takes a
duration: `QuizLimit => 45m`.

### Play

| Option                     | Default    | What it does                                    |
| -------------------------- | ---------- | ----------------------------------------------- |
| `restricted`               | `false`    | No answer mode, no reveal, no going back        |
| `revealMode`               | `never`    | `always` or `afterAnswer`                       |
| `allowReveal`              | `true`     | The manual show-answer button and key           |
| `policy`                   | `required` | What counts as answered                         |
| `grading`                  | question   | One text-grading mode for the whole quiz        |
| `addMissingSectionScreens` | `true`     | A section screen before each round              |
| `addSecretThemeQuestions`  | `false`    | Ask each round's secret at its end              |
| `hideSecretThemeMessage`   | `false`    | Do not announce the secret round                |
| `allowInput`               | `true`     | Offer interactive play on the start screen      |
| `allowScripts`             | `false`    | Sandboxed `Script` widgets                      |
| `teams`                    | none       | Team names to start with                        |
| `layoutMode`               | `viewport` | `viewport` fills the window, `inline` grows     |
| `themeMode`                | `auto`     | `auto`, `light`, `dark` or `high-contrast`      |

`policy` takes `permissive`, `required` or `strict`.

### Labels and meta

| Option                          | Default   | What it does                                  |
| ------------------------------- | --------- | --------------------------------------------- |
| `title`                         | header    | Quiz title                                    |
| `id`                            | none      | Element to mount into                         |
| `dateCreation`                  | none      | Year on the start screen                      |
| `defaultAuthor`                 | none      | Fill an empty author                          |
| `possibleAuthors`               | none      | Warn about authors outside the list           |
| `hideAuthor`                    | `false`   | Hide the author strip                         |
| `defaultCategory`               | none      | Fill an empty category                        |
| `possibleCategories`            | none      | Warn about categories outside the list        |
| `hideCategory`                  | `false`   | Hide the category strip                       |
| `showPropertiesWithoutDiversity`| `false`   | Show a property with only one value           |
| `bannerImage`                   | none      | Image on the start screen                     |
| `icon`                          | none      | Page icon                                     |
| `showSources`                   | `false`   | Show `Sources` under a question               |
| `printAnswerLines`              | `false`   | Ruled lines under written answers             |
| `printTypeHints`                | `true`    | Type line on paper                            |
| `questionNumbers`               | `true`    | Number questions on screen and paper          |
| `questionTypeHints`             | `true`    | "This is an open question." under the title   |
| `metadataIcons`                 | `true`    | Icons in the question header                  |
| `answerLabels`                  | `letters` | `letters`, `lowercase`, `numbers`, `roman`, `none` |

### Languages

| Option                          | Default            | What it does                       |
| ------------------------------- | ------------------ | ---------------------------------- |
| `language`                      | header             | Content language now               |
| `languageDefault`               | first language     | Root language                      |
| `languages`                     | found              | Shortlist of languages             |
| `translations`                  | built-in languages | UI strings per language            |
| `uiLanguage`                    | follows quiz       | Interface language, `null` follows  |
| `syncPropertiesWithTranslations`| `false`            | Copy layout and scoring from root  |

### Interface

| Option                  | Default | What it does                                   |
| ----------------------- | ------- | ---------------------------------------------- |
| `settings`              | none    | Host controls on the start screen              |
| `hideDefaultSettings`   | `false` | Hide the built-in settings                     |
| `hideErrors`            | `false` | Hide the problems panel                        |
| `hideDefaultStyles`     | `false` | Do not inject the built-in stylesheet          |
| `themeDisabled`         | `false` | Ignore `theme`                                 |
| `themeUpload`           | `true`  | "Load a theme folder" on the start screen      |
| `enableSafety`          | `false` | Confirm before mode change or skipping ahead   |
| `enableMouse`           | `false` | Mouse gestures                                 |
| `disableKeys`           | `false` | No keyboard shortcuts                          |
| `disableUI`             | `false` | Hide the toolbar                               |
| `disableTouch`          | `false` | No touch gestures                              |
| `hotkeys`               | none    | Remap actions to keys                          |
| `hotkeysForbidden`      | none    | Switch actions off                             |
| `allowHotkeyMapping`    | `false` | Show the key mapping panel in Settings         |
| `toolbar`               | none    | Visible toolbar buttons                        |
| `codeHighlight`         | `false` | Colour fenced code                             |
| `dictation`             | `false` | Microphone on open answers                     |

### Media and paths

| Option                       | Default     | What it does                                  |
| ---------------------------- | ----------- | --------------------------------------------- |
| `mediaAutoPlay`              | `false`     | Autoplay media where the browser allows it    |
| `loadExternalMediaAsIframe`  | `false`     | Load external pages in an iframe              |
| `linkPrefixes`               | V2 defaults | Which paths count as links                    |
| `mediaFormats`               | V2 defaults | Which extensions count as media               |
| `url`                        | none        | Root for relative media                       |
| `subFolderMedia`             | none        | Folder for relative media                     |
| `subFolderTheme`             | `themes/`   | Folder for a bare `theme` name                |
| `subFolderQuestions`         | none        | Folder for question files                     |
| `filenamePattern`            | `questions` | Base name for probing                         |
| `filenames`                  | none        | Explicit file list                            |
| `fileExtensions`             | none        | Extensions to try when probing                |
| `autoDiscoverQuestions`      | `false`     | Probe for `questions-0.trivia`, …             |
| `theme`                      | none        | Theme folder or `.css`, like V2               |

### Parsing and data

| Option                 | Default | What it does                              |
| ---------------------- | ------- | ----------------------------------------- |
| `disableTextFormatting`| `false` | Show every value exactly as written       |
| `forbidInlineLists`    | `false` | Do not split values on `|`                |
| `symbols`              | default | Swap the syntax characters                |
| `answersKey`           | none    | Opens encrypted files                     |
| `builtin`              | none    | Prepared quiz data for the start screen   |

## Load

```ts
await quiz.load({ type: "text", text, file: "quiz.trivia" });
await quiz.load({ type: "files", files: [{ name: "a.trivia", text }] });
await quiz.load({ type: "inline", data: embeddedJson });
await quiz.load({ type: "encrypted", data: lockedJson });
await quiz.load({ type: "model", quiz: preparedModel });
```

Above 1 MB, move parsing off the main thread:

```ts
import { createWorkerParser } from "@pandaqi/pq-trivia/browser";
const quiz = createQuiz({ parseText: createWorkerParser() });
```

Encrypted files stay locked until you pass the key:

```ts
createQuiz({ config: { answersKey: browserAnswerKey } });
quiz.locked(); // true until unlocked
await quiz.unlock(passphrase);
```

## Play

```ts
quiz.next();          // { ok, reason?, issues? }
quiz.prev();
quiz.nextStep();      // one more staged part
quiz.nextRound();
quiz.goTo(3);
quiz.goToStart();
quiz.goToEnd();
quiz.setResponse(questionId, response);
quiz.reveal();
quiz.toggleReveal();
quiz.revealHint();
quiz.setMode(PlayMode.Answers);
quiz.showResults();
quiz.restart();
quiz.retryWrong();
quiz.undo();
quiz.canUndo();
```

A blocked `next()` says why: `invalid`, `required`, `blocked` or `end`.

Answers, teams and extras:

```ts
quiz.setConfidence(questionId, Confidence.High);
quiz.setNoIdea(questionId, true);
quiz.setWager(questionId, 3);
quiz.noteMediaPlay();                 // counts one play of the clip
quiz.setTeams(["Red", "Blue"]);
quiz.setActiveTeam(1);
quiz.standings();                     // [{ name, points }, …]
quiz.useLifeline("50/50");
quiz.eliminated();                    // answer ids a 50/50 removed
```

Language:

```ts
quiz.setLanguage("NL");    // answers and hints travel along
quiz.languages();          // ["EN", "NL"]
quiz.t("next");            // the current UI language
```

Time:

```ts
quiz.timerRemaining();
quiz.elapsed();            // ms since the first question
quiz.quizRemaining();      // ms left on QuizLimit
quiz.roundRemaining();     // ms left in this round
quiz.expireTimer();
```

Host notes stay out of the view model:

```ts
quiz.presenterNotes();     // the current question's Notes
```

## Read

```ts
quiz.state;             // the whole session, plain data
quiz.currentScreen();   // the view model
quiz.progress();        // { index, total, answered, percent }
quiz.grade();           // GradeReport or null
quiz.diagnostics();     // every parse and validation problem
quiz.meta;              // title, authors, seed, language
quiz.rounds();          // every round, including hidden ones
quiz.sourceText();      // the Trivia Syntax it was loaded from
```

In question mode the view model has no correct answers. That is the contract.

## Events

```ts
quiz.on("question:enter", ({ index, id }) => {});
quiz.on("grade:ready", ({ report }) => {});
quiz.on("diagnostic", ({ diagnostic }) => {});
quiz.subscribe((state, screen) => {});
```

| Event                         | When                    |
| ----------------------------- | ----------------------- |
| `ready`                       | the plan exists         |
| `state:change`                | status changed          |
| `screen:change`               | new screen view model   |
| `question:enter`              | a question is shown     |
| `response:change`             | an answer changed       |
| `hint:reveal`                 | a hint was used         |
| `timer:tick` / `timer:expire` | countdown               |
| `grade:ready`                 | results calculated      |
| `mode:change`                 | questions ↔ answers     |
| `language:change`             | the content language switched |
| `diagnostic`                  | a problem was found     |
| `destroy`                     | teardown                |

## Override a screen

```ts
quiz.views.set(ScreenKind.Results, (screen, quiz) => {
  const node = document.createElement("section");
  node.textContent = `${screen.report.percent}%`;
  return node;
});
```

`views.set` returns an unsubscribe. `ScreenKind` has `Start`, `Question`,
`End` and `Results`.

## Themes

```ts
import { loadTheme, setTheme, themeFromFiles } from "@pandaqi/pq-trivia/player";

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
`element.manifest` is filled when a manifest loader is used.

| Attribute            | Does                                          |
| -------------------- | --------------------------------------------- |
| `src`                | Load this file                                |
| `seed`               | Plan seed                                     |
| `shuffle-questions`  | Shuffle inside a round                        |
| `shuffle-rounds`     | Shuffle rounds                                |
| `theme`              | Theme folder or stylesheet                    |
| `theme-upload`       | Show the folder picker                        |
| `base-url`           | Root for relative paths                       |
| `subfolder-media`    | Folder for media                              |
| `subfolder-theme`    | Folder for bare theme names                   |
| `media-formats`      | Extensions treated as media                   |
| `language-default`   | Root language                                 |
| `filenames`          | Explicit file list, comma separated           |
| `filename`           | Base name for probing                         |
| `file-extensions`    | Extensions to try when probing                |
| `questions-folder`   | Folder for question files                     |
| `auto-discover`      | Probe `questions-0.trivia`, …                 |

`auto-discover` is off by default. An explicit `filenames` list works without
it.
