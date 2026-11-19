# Which file do I need?

| Folder      | What it is                                                       |
| ----------- | ---------------------------------------------------------------- |
| `v3/`       | Current. Built from `src/` with `bun run build`.                 |
| `v2/`       | Frozen V2 release. `pq-trivia.min.js`, 108 KB. Works, unchanged. |
| `v1-final/` | Older still. Kept for old pages. Do not start here.              |

## V3 artifacts

| File                          | Use                                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `v3/core.js`                  | Parser, model, plan, session and embedded JSON. No DOM. For CLIs, Workers and tests.                                                                                |
| `v3/headless.js`              | Core plus `createQuiz`. Same data, no renderer.                                                                                                                     |
| `v3/player.js`                | Core plus the Preact player. ESM.                                                                                                                                   |
| `v3/pq-trivia.min.js`         | Standalone IIFE, `window.PQTrivia`. For `file://` pages.                                                                                                            |
| `v3/themes/paper.css`         | The Paper theme. Link it, or override its tokens.                                                                                                                   |
| `v3/themes/print.css`         | Cover, round pages, one question per page, answer form, grade table, flash cards. Safe to link without `media="print"`; the player prints the whole quiz on Ctrl+P. |
| `v3/themes/print.proof.css`   | Generated from `print.css` for `examples/print.html`. On screen only. Not for production.                                                                           |
| `v3/themes/high-contrast.css` | Colour and weight overrides. Load after Paper.                                                                                                                      |
| `v3/themes/large-print.css`   | Bigger type for a big room. Load after Paper.                                                                                                                       |

V3 plays a quiz and prints it. Grading, results, loading from files and the
CLI builders are later phases. For a hosted quiz night today, plain play and
print are ready; `v2/pq-trivia.min.js` still has the grading tables.

```html
<script type="module" src="v3/player.js"></script>
<pq-quiz src="quiz.trivia" seed="music-night"></pq-quiz>
```

Printing more than one slide per page, or as cards:

```js
import { mountPrintSheet } from "v3/player.js";

const sheet = mountPrintSheet(quiz, element, {
  variant: "answers", // or "quiz", "form", "grade"
  perPage: 4, // 1, 2 or 4 slides per sheet
  flashCards: false, // question front, answer back
  formStyle: "compact", // roomy or compact answer form
  roundPageBreak: true, // each round starts a page
  onProblem: (problem) => console.warn(problem.message),
});

sheet.problems; // pages that would still be clipped
sheet.fit(); // measure again: page count, pages shrunk, problems
```

Every printed page is a fixed A4 box. A page that is too tall is shrunk to fit,
down to 70%. Past that the type stops being readable on paper, so it is marked in
the printout and reported. Shrinking below 85% also reports itself, without a mark.

Nothing in `v2/` is regenerated. If a V3 release updates the past, that is a
bug, not a feature.
