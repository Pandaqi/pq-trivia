# Install

PQ-Trivia is one JavaScript file and one CSS file. No account, no server.

## From this repo

```bash
bun install
bun run build
```

Then copy what you need from `dist/v3/`:

| File                  | Use                                            |
| --------------------- | ---------------------------------------------- |
| `pq-trivia.min.js`    | One `<script>` tag. `window.PQTrivia`.         |
| `player.js`           | ES module, core plus the Preact player.        |
| `core.js`             | Parser, model, plan, session, grading. No DOM. |
| `themes/paper.css`    | The default theme.                             |
| `themes/print.css`    | Print layout. Link it with `media="print"`.    |

## In a page

```html
<link rel="stylesheet" href="themes/paper.css" />
<script type="module" src="player.js"></script>

<pq-quiz src="my-quiz.trivia" seed="quiz-night"></pq-quiz>
```

That is the whole setup.

## From a package

The package is not on npm yet. When it is:

```bash
bun add pq-trivia
```

```ts
import { createQuiz } from "pq-trivia";
import "pq-trivia/themes/paper.css";
```

## Optional bundles

Nothing here is in the default build. Load it when you need it.

| Bundle            | What it adds                                              |
| ----------------- | --------------------------------------------------------- |
| `browser.js`      | Worker parsing, IndexedDB cache, manifest loading.        |
| `multiplayer.js`  | Live rooms over BroadcastChannel or Trystero.             |
| `animations.js`   | The full preset list.                                     |

Big quiz in an element? Hand it the worker parser:

```js
import { QuizElement } from "./player.js";
import { workerParser } from "./browser.js";

QuizElement.parser = workerParser();
```

## Requirements

A browser from this decade. `BigInt`, ES modules, CSS custom properties.
Nothing else. The core runs in Bun, a Worker or a test without a DOM.
