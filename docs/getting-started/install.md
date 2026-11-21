# Install

PQ-Trivia is a JavaScript file and a quiz text file. No account, no server, no
separate CSS.

## One file

Copy `dist/v3/pq-trivia.min.js` next to your `index.html`:

```html
<script id="quiz-text" type="text/plain">
  Title => Friday Night
  Question => Which band wrote "Bohemian Rhapsody"?
  Answers => Queen
</script>
<script src="pq-trivia.min.js"></script>
```

Open the page. That is the whole setup, `file://` included. The theme, the print
sheet and the live code are inside the bundle.

The QR encoder is the one optional second file. Copy `pq-qr.min.js` beside the
bundle and a live lobby can draw a join QR. Without it the lobby shows the room
code and the link.

## From this repo

```bash
bun install
bun run build
```

Then copy what you need from `dist/v3/`:

| File                       | Use                                                  |
| -------------------------- | ---------------------------------------------------- |
| `pq-trivia.min.js`         | One `<script>` tag. Theme and print inside.          |
| `pq-qr.min.js`             | QR encoder, loaded on demand by the one-file bundle. |
| `player.js`                | ES module: core plus the Preact player.              |
| `core.js`                  | Parser, model, plan, session, grading. No DOM.       |
| `headless.js`              | Core plus `createQuiz`. No DOM.                      |
| `browser.js`               | Worker parsing, IndexedDB cache, manifests.          |
| `multiplayer.js`           | Live rooms over BroadcastChannel or Trystero.        |
| `animations.js`            | The full animation preset list.                      |
| `themes/paper.css`         | The default theme.                                   |
| `themes/print.css`         | Print layout. Link it with `media="print"`.          |
| `themes/high-contrast.css` | Overrides for contrast.                              |
| `themes/large-print.css`   | Bigger type.                                         |

The wizard is not in a normal build. Add it with `bun run build --editor`; see
[the wizard](../guides/wizard.html).

## Served, with an element

```html
<link rel="stylesheet" href="themes/paper.css" />
<script type="module" src="player.js"></script>

<pq-quiz
  src="my-quiz.trivia"
  theme="themes/forest/"
  seed="quiz-night"
></pq-quiz>
```

A theme folder is optional. Without `theme`, Paper is what you see.

## From a package

The package is not on npm yet. When it is:

```bash
bun add pq-trivia
```

```ts
import { createQuiz } from "pq-trivia";
import "pq-trivia/themes/paper.css";
```

## Big quiz, worker parsing

Above about 1 MB, parsing on the main thread is noticeable. Hand it the worker:

```js
import { QuizElement } from "./player.js";
import { createWorkerParser } from "./browser.js";

QuizElement.parser = createWorkerParser();
```

Or with the factory:

```ts
import { createQuiz } from "./player.js";
import { createWorkerParser } from "./browser.js";

const quiz = createQuiz({ parseText: createWorkerParser() });
```

## Requirements

A browser from this decade. `BigInt`, ES modules, CSS custom properties.

The core runs in Bun, a Worker or a test without a DOM.
