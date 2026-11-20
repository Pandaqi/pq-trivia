# Exporting

Everything here is a pure function. The plan is never mutated, the author's
order is never reshuffled.

## From the page

The results screen downloads JSON or a handout. The toolbar prints.

```js
import { downloadQuizJson, downloadQuizHandout } from "pq-trivia";

downloadQuizJson(quiz); // embedded JSON v3
downloadQuizHandout(quiz); // one HTML file, answers included
```

## From the CLI

```bash
bun run cli/index.ts build quiz.trivia --format html  --out quiz.html
bun run cli/index.ts build quiz.trivia --format json  --out quiz.json
bun run cli/index.ts build quiz.trivia --format gift  --out quiz.gift
bun run cli/index.ts build quiz.trivia --format qti   --out quiz.xml
bun run cli/index.ts build quiz.trivia --format csv   --out questions.csv
```

| Format           | Use                                 |
| ---------------- | ----------------------------------- |
| Embedded JSON v3 | offline packs, other tools          |
| Standalone HTML  | one file to email or host           |
| HTML handout     | print, with answers                 |
| GIFT / QTI       | Moodle, Canvas, Blackboard          |
| CSV              | spreadsheets, Kahoot/Quizlet import |
| Offline pack     | USB stick, `file://`                |

## Sharing the order, not the answers

The settings panel copies a link with the seed and the order flags in it:
`?seed=music-night&shuffle=1`. Open it and you get the same plan. The answers
never travel in a URL.

```js
import { shareQuizUrl, copyQuizShareLink } from "pq-trivia";

shareQuizUrl(quiz); // the full URL, or null outside a page
await copyQuizShareLink(quiz);
```

## Class analytics

One row per question across every attempt saved on the device: attempts,
answered, correct, correct percent, points and average points. The summary at
the top counts graded attempts and the average score.

```js
import { analyticsCsv } from "pq-trivia/core";
```

The settings panel has **Save class analytics**. The saved attempts are the
same records the resume prompt reads, so nothing is collected twice.

## Grading a stack of answers

```bash
bun run cli/index.ts grade quiz.trivia --answers responses.json
bun run cli/index.ts grade quiz.trivia --answers responses.json --csv
```

`responses.json` is either a map of question id to response, or
`{ "responses": { … } }`.

## The JSON shape

```json
{
  "schemaVersion": 3,
  "meta": { "title": "Friday Night" },
  "questions": {
    "q1": {
      "type": "choice",
      "text": "Man of Steel?",
      "answers": [{ "id": "a1", "text": "Superman" }],
      "correct": ["a1"]
    }
  }
}
```

Answer ids come from content, not position. Shuffle a question and the ids stay
put.
