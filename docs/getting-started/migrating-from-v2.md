# Migrating from V2

V2 still ships in `dist/v2/` and still works. Nothing here forces you to move.

## What stays

- Every V2 syntax file parses unchanged: questions, answers, scores, types,
  order, comments, masks.
- `dist/v2/pq-trivia.min.js` stays downloadable.
- Embedded JSON loads through `load({ type: "inline", data })`, with a warning.
- CSS variable names from V2 themes stay as aliases.

## What changed on purpose

| Change | Why | What you do |
| --- | --- | --- |
| Author order is the default | Shuffling by default surprised everyone | Turn on shuffle in Settings, or `shuffleQuestions: true` |
| Raw HTML is off | A quiz file could run script | Use the syntax, or opt in |
| `FormatText` / `HiddenAtPlay` need real booleans | `"false"` was truthy | Write `false` |
| Theme URLs resolve from the base | The old way broke on file pages | Nothing, usually |
| `rtf` upload is gone | It never worked | Convert to `.txt` |
| Export does not reshuffle | That was a bug | Nothing |

## The new page

```html
<link rel="stylesheet" href="dist/v3/themes/paper.css" />
<script type="module" src="dist/v3/player.js"></script>
<pq-quiz src="questions/quiz.txt" seed="my-seed"></pq-quiz>
```

## The new API

```ts
import { createQuiz, mountQuiz } from "pq-trivia";

const quiz = createQuiz({ config: { seed: "my-seed" } });
mountQuiz(quiz, document.querySelector("#quiz"));
await quiz.load({ type: "text", text: myText });
```

`new Quiz(params)` is gone from the default build. The V2 file still has it.

## Migrate a folder

```bash
bun run cli/index.ts migrate questions/ --check   # exit 1 if work is needed
bun run cli/index.ts migrate questions/ --write   # canonical, with .bak files
```

The formatter rewrites attribute names, booleans and list separators. It does
not touch your text, answers or order.

## If something breaks

Run:

```bash
bun run cli/index.ts validate questions/ --strict
```

Every diagnostic has a code, a location and a suggestion. If a real V2 file
does not parse, that is a bug worth an issue.
