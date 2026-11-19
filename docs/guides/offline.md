# Offline

A pub with bad Wi-Fi is the normal case, not the edge case.

## The pack

```bash
bun run cli/index.ts pack questions/my-quiz.trivia --out dist/pack/night
```

The folder contains the text, the player, both themes, a manifest and a service
worker. Open `index.html` from the folder. No network, no server.

Media is not copied yet. Local media next to the pack works; an absolute URL
still needs the network.

## `file://`

Browsers block `fetch` on `file://`. The player says so instead of failing
mysteriously. Your options:

1. Use a pack (`pack` inlines the text).
2. Inline the quiz text in the page.
3. Serve the folder locally: `bun run preview`.

## Hosted, then offline

Load `browser.js` and use the cache:

```js
import { createQuiz } from "./player.js";
import { loadQuizSourceCached } from "./browser.js";

const quiz = createQuiz();
await loadQuizSourceCached(quiz, "quiz/manifest.json");
```

The IndexedDB cache stores fetched text with an ETag. It serves the cached copy
first and revalidates behind it. Quota full? It drops the oldest half and tries
again. Private window? It keeps a small memory cache and moves on.

## Manifests

```json
{
  "version": 3,
  "files": [
    { "path": "questions.en.trivia", "language": "en" },
    { "path": "questions.nl.trivia", "language": "nl" }
  ],
  "build": { "hash": "sha256-…" }
}
```

One manifest means no name guessing and no `HEAD` probing. Without one, a
single `.trivia` file is fetched by its exact URL.
