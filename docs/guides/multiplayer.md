# Multiplayer

Host on the big screen. Players join by code. Answers come back, the host
reveals, the leaderboard moves.

The live code lives in its own bundle. The default player does not contain it.

## The QR needs its encoder

The lobby draws a QR of the join link. The encoder (`uqr`) is not inside
`multiplayer.js`: it sits next to it as `chunk-qr.js`, fetched the first time a
lobby opens.

The one-file bundle works the same way. It fetches `pq-qr.min.js` from its own
folder when a lobby opens. Pack it with the quiz, or copy it beside
`pq-trivia.min.js`.

Without the encoder everything still works — the code and the link are right
there — but there is no QR to scan.

## Two transports

| Transport          | Reach                    | Setup                           |
| ------------------ | ------------------------ | ------------------------------- |
| `BroadcastChannel` | Same browser, two tabs   | None                            |
| Trystero           | Real devices over WebRTC | `bun add trystero`, one `appId` |

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

Without a name or a code in the URL, the player shows a name form. The room code
comes from `?pq-live=ABCD`.

## Watching

A watcher joins the same room with `watch: true`, or `?watch=1` in the link.
They get the questions and the reveals, and no answer form. A watcher takes no
seat, so a full room still lets one in, and never shows up on the board.

```html
<a href="?pq-live=ABCD&watch=1">Second screen</a>
```

That is the screen in the corridor, or the one behind the bar.

## Teams

A group of five can share one phone: one person types, everybody argues. Add
`?team=Red` to the join link and the host's list and the final board say Red.
The badge on the phone wears the team's colour.

```html
<a href="?pq-live=ABCD&team=Red">Team Red</a>
```

One phone per group. Two phones on one team are two rows with the same name and
two sets of answers, which is not what you want.

## When the answers come out

Four modes. The host picks one when the room opens.

| `revealMode` | The reveal happens                                    |
| ------------ | ----------------------------------------------------- |
| `Question`   | After every question. The classic.                    |
| `Round`      | After the last question of a round.                   |
| `End`        | At the end of the quiz. Scores only, no answers.      |
| `Pass`       | Never during play, then a second pass in answer mode. |

```js
import { LiveRole, RevealMode, mountLive } from "./multiplayer.js";

mountLive({
  target: document.querySelector("#host"),
  role: LiveRole.Host,
  code: "ABCD",
  quiz,
  transport,
  revealMode: RevealMode.Round,
});
```

`Pass` is the paper version. Everybody plays the whole quiz without a peek. Then
the host walks back through it and the phones show every answer next to every
name.

A custom host UI needs two calls. Both know the mode, so neither counts
questions:

```js
host.reveal(); // what the mode allows. Nothing when nothing is due.
host.next();   // next question, next reveal, the answer pass, or the end.
```

Round cards go to the phones too, so a player never sits on a frozen screen
between rounds. The host's lobby has both settings: a **Reveal** select and a
**round cards** checkbox. A custom host calls them directly, and both are
ignored after the first question, because changing either would move the flow
positions under everyone:

```js
host.setRevealMode(RevealMode.Round);
host.setSections(false); // keep the round title on the projector only
```

## What a player receives

A question, its answers, its media and its points. Not the correct answers. Not
the explanation. Not the plan.

That is enforced in `present.ts`, not in the renderer.

## Rules the host enforces

- Joins: lobby open, under the player limit, name 1–24 characters.
- Answers: known question, before the close, one per question unless
  `allowChanges`.
- Late answers are accepted but flagged and score zero.
- One message per player per 250ms.
- A reconnect token restores the player, the score, the current question and the
  last reveal.

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
  Quiz content goes peer to peer.
- No accounts. No analytics. No server of ours.
- The room code is the only secret. Four characters is a pub room, not a bank.

## Testing two clients

```bash
bun test test/multiplayer
```

The tests use an in-memory network: join, show, submit, reveal, late answer,
stranger, reconnect. No browser, no clock, under a second.

There is also `examples/feature-demos/multiplayer.html`: host and player on one
page.
