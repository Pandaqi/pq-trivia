# Which file do I need?

| Folder      | What it is                                                       |
| ----------- | ---------------------------------------------------------------- |
| `v3/`       | Current. Built from `src/` with `bun run build`.                 |
| `v2/`       | Frozen V2 release. `pq-trivia.min.js`, 108 KB. Works, unchanged. |
| `v1-final/` | Older still. Kept for old pages. Do not start here.              |

## V3 artifacts

| File                          | Use                                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `v3/core.js`                  | Parser, model, plan, session and embedded JSON. No DOM. For CLIs, Workers and tests.                                                                     |
| `v3/headless.js`              | Core plus `createQuiz`. Same data, no renderer.                                                                                                          |
| `v3/player.js`                | Core plus the Preact player. ESM.                                                                                                                        |
| `v3/browser.js`               | Optional: worker parsing, IndexedDB cache, manifest loading.                                                                                             |
| `v3/parse.worker.js`          | The worker that `browser.js` starts. Keep it next to the bundle.                                                                                         |
| `v3/multiplayer.js`           | Optional live rooms: lobby, player view, leaderboard. BroadcastChannel included, Trystero optional.                                                      |
| `v3/animations.js`            | Optional: the full animation preset list.                                                                                                                |
| `v3/pq-trivia.min.js`         | Standalone IIFE, `window.PQTrivia`. For `file://` pages.                                                                                                 |
| `v3/themes/paper.css`         | The Paper theme. Link it, or override its tokens.                                                                                                        |
| `v3/themes/print.css`         | Cover, round pages, one question per page, answer form, grade table, flash cards. Safe to link without `media="print"`; the player prints on Ctrl+P.     |
| `v3/themes/print.proof.css`   | Generated from `print.css` for `examples/print.html`. On screen only. Not for production.                                                                |
| `v3/themes/high-contrast.css` | Colour and weight overrides. Load after Paper.                                                                                                           |
| `v3/themes/large-print.css`   | Bigger type for a big room. Load after Paper.                                                                                                            |
| `v3/SHA256SUMS`               | Checksums, written by `bun run release:dry`.                                                                                                             |

## The short version

```html
<link rel="stylesheet" href="v3/themes/paper.css" />
<script type="module" src="v3/player.js"></script>

<pq-quiz src="quiz.trivia" seed="music-night"></pq-quiz>
```

No build step for the page. No server for the quiz.

Live mode is a separate import:

```html
<script type="module">
  import { LiveRole, createBroadcastTransport, mountLive } from "./v3/multiplayer.js";
</script>
```

Offline pack, manifests, worker parsing and caching are described in
`docs/guides/offline.md`. Printing, exports and the API are in `docs/`.

Nothing in `v2/` is regenerated. If a V3 release updates the past, that is a
bug, not a feature.
