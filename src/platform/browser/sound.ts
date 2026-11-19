/**
 * Timer beeps from Web Audio. No files, no dependencies, no autoplay.
 *
 * Browsers only allow audio after a gesture, so the context starts on the first
 * beep, which always follows a click on Start.
 */

export interface TimerSound {
  /** Last five seconds. */
  warning(): void;
  /** Time is up. */
  done(): void;
}

interface AudioWindow extends Window {
  readonly webkitAudioContext?: typeof AudioContext;
}

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (context === null) {
    const ctor =
      window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (ctor === undefined) {
      return null;
    }
    try {
      context = new ctor();
    } catch {
      return null;
    }
  }
  if (context.state === "suspended") {
    void context.resume();
  }
  return context;
}

function tone(frequency: number, durationMs: number, volume: number): void {
  const audioContext = audio();
  if (audioContext === null) {
    return;
  }
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  const end = now + durationMs / 1000;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  // A short ramp stops the click you get from a hard stop.
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(end + 0.02);
}

export const browserTimerSound: TimerSound = {
  warning: () => tone(880, 90, 0.05),
  done: () => {
    tone(440, 180, 0.07);
    window.setTimeout(() => tone(330, 260, 0.07), 190);
  },
};
