# Multiplayer

Host on the big screen. Players join by code. Answers come back, the host
reveals, the leaderboard moves.

The live code lives in its own bundle. The default player does not contain it.

## Two transports

| Transport          | Reach                    | Setup                           |
| ------------------ | ------------------------ | ------------------------------- |
| `BroadcastChannel` | Same browser, two tabs   | None                            |
| `Trystero`         | Real devices over WebRTC | `bun add trystero`, one `appId` |

```js
import {
  LiveRole,
  createBroadcastTransport,
  mountLive,
} from "./multiplayer.js";

const transport = createBroadcastTransport();

mountLive({
  target: document.querySelector("#host"),
  role: LiveRole.Host,
  code: "ABCD",
  quiz, // already loaded
  transport,
});
```

On a phone:

```html
<link rel="stylesheet" href="themes/paper.css" />
<script type="module">
  import {
    LiveRole,
    mountLive,
    createTrysteroTransport,
  } from "./multiplayer.js";
  const transport = await createTrysteroTransport({ appId: "my-quiz-app" });
  mountLive({ target: document.body, role: LiveRole.Player, transport });
</script>
```

Without a name or a code in the URL, the player shows a name form. The room
code comes from `?pq-live=ABCD`.

## What a player receives

A question, its answers, its media and its points. Not the correct answers.
Not the explanation. Not the plan.

That is enforced in `present.ts`, not in the renderer.

## Rules the host enforces

- Joins: lobby open, under the player limit, name 1–24 characters.
- Answers: known question, before the close, one per question unless
  `allowChanges`.
- Late answers are accepted but flagged and score zero.
- One message per player per 250ms.
- A reconnect token restores the player, the score, the current question and
  the last reveal.

## Protocol v1

```ts
{
  v: (1, type, id, ts, from, payload);
}
```

Host to players: `room:state`, `question:show`, `question:close`,
`answer:reveal`, `score:update`, `quiz:end`, `ping`.

Players to host: `join`, `answer:submit`, `ready`, `pong`.

Message ids are deduplicated. The host owns all state.

## Privacy

- BroadcastChannel: nothing leaves the machine.
- Trystero: WebRTC between browsers. Signalling goes through public relays.
  The quiz content goes peer to peer.
- No accounts. No analytics. No server of ours.
- The room code is the only secret. Four characters is a pub room, not a bank.

## Testing two clients

```bash
bun test test/multiplayer
```

The tests use an in-memory network: join, show, submit, reveal, late answer,
stranger, reconnect. No browser, no clock, under a second.

There is also `examples/multiplayer.html`: host and player on one page.
