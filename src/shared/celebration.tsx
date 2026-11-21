/**
 * Confetti and a banner. One reward moment, shared by the player and the room.
 *
 * Pieces are deterministic: the same index always takes the same path, so a
 * re-render cannot reshuffle the party. The theme owns the colours.
 */

import type { JSX } from "preact";

/** A champion screen gets a proper shower. */
const FALLING_PIECES = 56;

/** A correct answer gets a handful, not a screen. */
const BURST_PIECES = 18;

/** The theme's five confetti colours. */
const PALETTE: readonly string[] = [
  "var(--pq-confetti-1)",
  "var(--pq-confetti-2)",
  "var(--pq-confetti-3)",
  "var(--pq-confetti-4)",
  "var(--pq-confetti-5)",
];

const GOLDEN_ANGLE = 137.508;
const FULL_TURN = 360;
const HALF_TURN = 180;
const PERCENT = 100;

const DELAY_STEPS = 9;
const DELAY_STEP = 0.11;
const FALL_BASE = 2.4;
const FALL_STEPS = 5;
const FALL_STEP = 0.32;
const DRIFT_SPREAD = 5;
const DRIFT_STEP = 18;
const SPIN_BASE = 240;
const SPIN_STEPS = 7;
const SPIN_STEP = 90;
const SIZE_BASE = 6;
const SIZE_STEPS = 4;
const SIZE_STEP = 2.5;

const BURST_BASE = 34;
const BURST_STEPS = 5;
const BURST_STEP = 12;
const BURST_SIZE_BASE = 5;
const BURST_SIZE_STEPS = 3;
const BURST_SIZE_STEP = 2;
const DEGREES = Math.PI / HALF_TURN;

function colourAt(index: number): string {
  return PALETTE[index % PALETTE.length] ?? PALETTE[0] ?? "";
}

/** One falling piece, in its own lane. */
function fallStyle(index: number): string {
  const left = ((index * GOLDEN_ANGLE) % PERCENT).toFixed(2);
  const delay = ((index % DELAY_STEPS) * DELAY_STEP).toFixed(2);
  const fall = (FALL_BASE + (index % FALL_STEPS) * FALL_STEP).toFixed(2);
  const drift = ((index % (DRIFT_SPREAD * 2 + 1)) - DRIFT_SPREAD) * DRIFT_STEP;
  const spin = SPIN_BASE + (index % SPIN_STEPS) * SPIN_STEP;
  const size = SIZE_BASE + (index % SIZE_STEPS) * SIZE_STEP;
  return [
    `--pq-confetti-left:${left}%`,
    `--pq-confetti-delay:${delay}s`,
    `--pq-confetti-fall:${fall}s`,
    `--pq-confetti-drift:${drift}px`,
    `--pq-confetti-spin:${spin}deg`,
    `--pq-confetti-size:${size}px`,
    `--pq-confetti-colour:${colourAt(index)}`,
  ].join(";");
}

/** One piece of the small ring around a correct answer. */
function burstStyle(index: number): string {
  const angle = (index / BURST_PIECES) * FULL_TURN;
  const distance = BURST_BASE + (index % BURST_STEPS) * BURST_STEP;
  const x = Math.round(Math.cos(angle * DEGREES) * distance);
  const y = Math.round(Math.sin(angle * DEGREES) * distance);
  const size = BURST_SIZE_BASE + (index % BURST_SIZE_STEPS) * BURST_SIZE_STEP;
  return [
    `--pq-burst-x:${x}px`,
    `--pq-burst-y:${y}px`,
    `--pq-burst-spin:${(index * 97) % FULL_TURN}deg`,
    `--pq-burst-size:${size}px`,
    `--pq-burst-colour:${colourAt(index)}`,
  ].join(";");
}

/** A shower of confetti and one line of praise. */
export function Celebration({
  message,
}: {
  readonly message: string;
}): JSX.Element {
  return (
    <>
      <div class="pq-celebration" aria-hidden="true">
        <div class="pq-confetti">
          {Array.from({ length: FALLING_PIECES }, (_, index) => (
            <span
              key={index}
              class="pq-confetti-piece"
              style={fallStyle(index)}
            />
          ))}
        </div>
      </div>
      <p class="pq-celebration-banner" role="status">
        <span class="pq-celebration-emoji" aria-hidden="true">
          🏆
        </span>
        <span>{message}</span>
      </p>
    </>
  );
}

/** A tiny ring of colour, for one right answer. */
export function CelebrationBurst(): JSX.Element {
  return (
    <span class="pq-burst" aria-hidden="true">
      {Array.from({ length: BURST_PIECES }, (_, index) => (
        <span key={index} class="pq-burst-piece" style={burstStyle(index)} />
      ))}
    </span>
  );
}
