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

/** Spoken once each. Below these numbers, ears need the news. */
const TIMER_MILESTONES: readonly number[] = [30, 10, 0];

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
  const [announcement, setAnnouncement] = useState("");
  const expired = useRef(false);
  const lastSecond = useRef<number | null>(null);
  const announced = useRef(new Set<number>());
  const totalSeconds = total === null ? 0 : Math.ceil(total / 1000);

  useEffect(() => {
    expired.current = false;
    lastSecond.current = null;
    announced.current.clear();
    setAnnouncement("");
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
      // 30, 10 and 0, once each. A screen reader should hear the clock, not
      // read it in a race with the beeps.
      for (const milestone of TIMER_MILESTONES) {
        if (
          seconds <= milestone &&
          totalSeconds >= milestone &&
          !announced.current.has(milestone)
        ) {
          announced.current.add(milestone);
          setAnnouncement(
            milestone === 0 ? "Time is up." : `${milestone} seconds left.`,
          );
        }
      }
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
  }, [quiz, total, timer?.questionId, sound, totalSeconds]);

  if (remaining === null || total === null) {
    return null;
  }
  const urgency = timerUrgency(remaining, total);
  const percent =
    total <= 0 ? 0 : Math.max(0, Math.min(100, (remaining / total) * 100));

  return (
    <div class="pq-timer" data-pq-urgency={urgency}>
      <p
        class="pq-timer-value"
        role="timer"
        aria-live="off"
        aria-label={`${formatTimer(remaining)} remaining`}
      >
        {formatTimer(remaining)}
      </p>
      <p class="pq-visually-hidden" aria-live="assertive" aria-atomic="true">
        {announcement}
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
