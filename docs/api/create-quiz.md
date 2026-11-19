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

## Config

| Option | Default | What it does |
| --- | --- | --- |
| `seed` | header or `pq` | same seed, same plan |
| `shuffleQuestions` | `false` | author order stays |
| `shuffleRounds` | `false` | same |
| `language` | header | content language |
| `defaultScore` | `1` | points for a question without `Points` |
| `restricted` | `false` | no answers mode, no reveal, no back |
| `revealMode` | `never` | `always` or `afterAnswer` |
| `policy` | `required` | what counts as answered |
| `grading` | question | one mode for the whole quiz |
| `allowScripts` | `false` | sandboxed `Script` widgets |
| `timerSound` | `false` | beeps in the last five seconds |
| `codeHighlight` | `false` | colour fenced code |
| `answersKey` | none | opens encrypted files |

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
quiz.next();          // { ok, reason?, issues? }
quiz.prev();
quiz.goTo(3);
quiz.setResponse(questionId, response);
quiz.reveal();
quiz.revealHint();
quiz.setMode(PlayMode.Answers);
quiz.showResults();
```

A blocked `next()` says why: `invalid`, `required`, `blocked` or `end`.

## Read

```ts
quiz.state;           // the whole session, plain data
quiz.currentScreen(); // the view model
quiz.progress();      // { index, total, answered, percent }
quiz.grade();         // GradeReport or null
quiz.diagnostics();   // every parse and validation problem
quiz.meta;            // title, authors, seed, language
```

In question mode the view model has no correct answers. That is the contract.

## Events

```ts
quiz.on("question:enter", ({ index, id }) => {});
quiz.on("grade:ready", ({ report }) => {});
quiz.on("diagnostic", ({ diagnostic }) => {});
quiz.subscribe((state, screen) => {});
```

| Event | When |
| --- | --- |
| `ready` | the plan exists |
| `state:change` | status changed |
| `screen:change` | new screen view model |
| `question:enter` | a question is shown |
| `response:change` | an answer changed |
| `hint:reveal` | a hint was used |
| `timer:tick` / `timer:expire` | countdown |
| `grade:ready` | results calculated |
| `mode:change` | questions ↔ answers |
| `diagnostic` | a problem was found |
| `destroy` | teardown |

## Override a screen

```ts
quiz.views.set(ScreenKind.Results, (screen, quiz) => {
  const node = document.createElement("section");
  node.textContent = `${screen.report.percent}%`;
  return node;
});
```

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
