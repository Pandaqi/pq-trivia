# Offline

A pub with bad Wi-Fi is the normal case, not the edge case.

## The pack

```bash
bun run cli/index.ts pack questions/my-quiz.trivia --out dist/pack/night
```

The folder holds:

| File               | What it is                                                   |
| ------------------ | ------------------------------------------------------------ |
| `index.html`       | The page. The quiz text is inside it.                        |
| `quiz.trivia`      | The same quiz as a file you can edit.                        |
| `pq-trivia.min.js` | The player.                                                  |
| `pq-qr.min.js`     | The QR encoder, loaded only when a lobby draws one.          |
| `style.css`        | Paper, for the screen.                                       |
| `print.css`        | The print sheet.                                             |
| `manifest.json`    | The pack's inventory: name, version, seed, count, file list. |
| `sw.js`            | The service worker.                                          |
| `media/…`          | Local media, under `subFolderMedia` (default `media/`).      |

Open `index.html` from the folder. No network, no server. An absolute media URL
still needs the network.

## Updating a pack

The service worker caches the pack under a name that includes a content hash.
Change the quiz, pack again, upload the folder, and the next visit finds the new
worker. A small bar says "A new version is ready" and waits for a click. It does
not swap the quiz out from under a player mid-round.

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

One manifest means no name guessing and no `HEAD` probing. Without one, a single
`.trivia` file is fetched by its exact URL.

This is the loader manifest that `browser.js` reads. A pack writes a different
`manifest.json`: an inventory of its own files, with the title, seed and question
count. The player never fetches that one.

## Media in a pack

`pack` copies local media into `media/` (or the quiz's `subFolderMedia` folder)
and adds every file to the service worker's cache list. A pack that points at a
folder on your laptop is a pack that breaks in the pub.

Absolute URLs are left alone: they belong to somebody else's network, and the
offline pack cannot promise them.

## Signed packs

A hash catches a corrupted file. A signature says who shipped the pack.

```bash
bun run cli/index.ts keygen --out keys
bun run cli/index.ts pack quiz.trivia --out dist/pack/night --key keys/pq-pack-private.pem
bun run cli/index.ts verify dist/pack/night
```

`pack --key` writes `signature.json`: a SHA-256 per file, the Ed25519 public key
and the signature. `verify` reads the folder, rehashes every file and checks the
signature. Keep the private key off the web; the public key travels with the
pack.

No key? The pack still works. It just cannot prove where it came from.

## Encrypted quizzes

```bash
bun run cli/index.ts encrypt quiz.trivia --passphrase "the usual one"
```

The file is AES-GCM. Loading it needs `answersKey`:

```ts
import { Quiz, browserAnswerKey } from "pq-trivia";

const quiz = new Quiz({
  load: { type: "encrypted", data: locked },
  config: { answersKey: browserAnswerKey },
});

if (quiz.locked()) {
  await quiz.unlock(passphrase);
}
```

`browserAnswerKey` is the key object itself. Pass it once; `quiz.unlock` takes the
passphrase.

There is no recovery. Lose the passphrase and the file stays locked.
