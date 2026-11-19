/**
 * Question countdown. Reads the clock from the session; owns one interval and
 * cleans it up. No timer keeps running after the screen goes away.
 */

import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Quiz } from "../../../core/session/quiz";
import {
  formatTimer,
  timerUrgency,
  type TimerSound,
} from "../../../core/session/timers";

export function Timer({
  quiz,
  sound,
}: {
  readonly quiz: Quiz;
  readonly sound?: TimerSound | undefined;
}): JSX.Element | null {
  const timer = quiz.state.timer;
  const total = timer?.totalMs ?? null;
  const [remaining, setRemaining] = useState<number | null>(() =>
    quiz.timerRemaining(),
  );
  const expired = useRef(false);
  const lastSecond = useRef<number | null>(null);

  useEffect(() => {
    expired.current = false;
    lastSecond.current = null;
    setRemaining(quiz.timerRemaining());
    if (total === null) {
      return;
    }
    const beeps = sound !== undefined && quiz.config.timerSound === true;
    const tick = (): void => {
      const left = quiz.timerRemaining();
      setRemaining(left);
      if (left === null) {
        return;
      }
      const seconds = Math.ceil(left / 1000);
      if (beeps && left > 0 && seconds <= 5 && seconds !== lastSecond.current) {
        lastSecond.current = seconds;
        sound.warning();
      }
      if (left <= 0 && !expired.current) {
        expired.current = true;
        if (beeps) {
          sound.done();
        }
        quiz.expireTimer();
      }
    };
    tick();
    const handle = setInterval(tick, 250);
    return () => clearInterval(handle);
  }, [quiz, total, timer?.questionId, sound]);

  if (remaining === null || total === null) {
    return null;
  }
  const urgency = timerUrgency(remaining, total);
  const percent =
    total <= 0 ? 0 : Math.max(0, Math.min(100, (remaining / total) * 100));

  return (
    <div class="pq-timer" data-pq-urgency={urgency}>
      <p class="pq-timer-value" role="timer" aria-live="off">
        {formatTimer(remaining)}
      </p>
      <span class="pq-timer-bar" aria-hidden="true">
        <span style={`width: ${percent}%`} />
      </span>
      {urgency === "done" ? (
        <p class="pq-timer-note" role="status">
          Time is up. Answers stay open.
        </p>
      ) : null}
    </div>
  );
}
