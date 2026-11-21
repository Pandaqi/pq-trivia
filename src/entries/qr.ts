/**
 * The QR encoder as its own script. `dist/v3/pq-qr.min.js`.
 *
 * The one-file bundle does not carry `uqr`: ten kilobytes of encoder for a
 * lobby that uses BroadcastChannel until the page loads Trystero. The bundle
 * loads this file the first time a lobby has a join link to draw.
 *
 * `src/multiplayer/ui/parts.tsx` reads `PQTriviaQR.encode`. A page without this
 * file still runs the lobby; it shows the room code and the link instead.
 */

import { encode } from "uqr";

(globalThis as unknown as Record<string, unknown>)["PQTriviaQR"] = { encode };
