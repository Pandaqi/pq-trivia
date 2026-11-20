/**
 * The QR encoder, behind one name.
 *
 * Bun names a split chunk after the module that pulled it in, so importing
 * `uqr` through this file gives us `chunk-qr.js` instead of `chunk-q1bymsdc.js`.
 * A named chunk can be documented, cached and found in a network panel.
 *
 * Only the multiplayer lobby imports this, and only when it has a join link to
 * draw. Folders that never show a QR never download the encoder.
 */

export { encode } from "uqr";
