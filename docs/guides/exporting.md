# Exporting

Every export is a pure function. The plan is never mutated, and the author's
order is never reshuffled.

## From the page

The results screen downloads JSON or a handout. The toolbar prints.

```js
import {
  downloadQuizJson,
  downloadQuizHandout,
  downloadQuizCsv,
  downloadQuizGift,
  downloadQuizQti,
  downloadQuizGrades,
  downloadQuizTrivia,
} from "pq-trivia";

downloadQuizJson(quiz);     // embedded JSON v3
downloadQuizHandout(quiz);  // one HTML file, answers included
downloadQuizCsv(quiz);      // one row per question
downloadQuizGift(quiz);     // Moodle
downloadQuizQti(quiz);      // Canvas
downloadQuizGrades(quiz);   // results so far, as CSV
downloadQuizTrivia(quiz);   // the source text back
```

Or use the controller:

```js
quiz.export.embedded();
quiz.export.csv();
quiz.export.gift();
quiz.export.qti();
quiz.export.grades(); // null before there is a plan
```

## From the CLI

```bash
bun run cli/index.ts build quiz.trivia --format html --out quiz.html
bun run cli/index.ts build quiz.trivia --format html --answers --out handout.html
bun run cli/index.ts build quiz.trivia --format json --out quiz.json
bun run cli/index.ts build quiz.trivia --format gift --out quiz.gift
bun run cli/index.ts build quiz.trivia --format qti  --out quiz.xml
bun run cli/index.ts build quiz.trivia --format csv  --out questions.csv
```

| Format           | Use                                 |
| ---------------- | ----------------------------------- |
| Embedded JSON v3 | Offline packs, other tools          |
| Standalone HTML  | One file to email or host           |
| HTML + `--answers` | A handout for printing            |
| GIFT / QTI       | Moodle, Canvas, Blackboard          |
| CSV              | Spreadsheets, Kahoot/Quizlet import |
| Offline pack     | USB stick, `file://`                |

## Import

A spreadsheet or a Markdown file into Trivia Syntax:

```bash
bun run cli/index.ts import questions.csv --out quiz.trivia
bun run cli/index.ts import notes.md --format markdown --out quiz.trivia
```

CSV expects a header row. Markdown reads headings as questions and bullets as
answers. The importer reports columns it does not know instead of guessing.

## Count and check

```bash
bun run cli/index.ts stats questions/
```

Questions, rounds, points and types, without loading a browser.

## Sharing the order, not the answers

The settings panel copies a link with the seed and the order flags in it:
`?seed=music-night&shuffle=1`. Open it and you get the same plan. Answers never
travel in a URL.

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
import { downloadQuizAttempts } from "pq-trivia";

await downloadQuizAttempts(quiz); // false when nothing is saved
```

The settings panel has **Save class analytics**. The saved attempts are the same
records the resume prompt reads, so nothing is collected twice.

`analyticsCsv(attempts)` is the function behind it. It lives in
`src/core/export/analytics.ts` and is not part of `pq-trivia/core`; import it
directly if you keep your own list of attempts.

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
