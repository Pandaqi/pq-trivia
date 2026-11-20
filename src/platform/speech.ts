/**
 * Dictation, through the Web Speech API.
 *
 * Supported in Chrome, Edge and Safari (as `webkitSpeechRecognition`). Firefox
 * does not ship it. That is fine: the field is an ordinary input, so typing
 * always works. The button only appears when the browser says it can listen.
 *
 * Nothing here records. Recognition runs in the browser's own speech service,
 * which may be online. Say that plainly in the docs and let the host choose.
 */

interface SpeechResult {
  readonly transcript: string;
}

interface SpeechResultEvent {
  readonly results: ArrayLike<ArrayLike<SpeechResult>>;
}

interface SpeechRecognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type RecognizerConstructor = new () => SpeechRecognizer;

interface SpeechWindow {
  readonly SpeechRecognition?: RecognizerConstructor;
  readonly webkitSpeechRecognition?: RecognizerConstructor;
}

export interface Dictation {
  stop(): void;
}

export interface DictationHandlers {
  readonly onText: (text: string) => void;
  readonly onEnd?: () => void;
}

function recognizerClass(): RecognizerConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const scope = window as unknown as SpeechWindow;
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return recognizerClass() !== null;
}

/** Start listening once. Returns null when the browser has no speech input. */
export function startDictation(
  handlers: DictationHandlers,
  lang = "en-US",
): Dictation | null {
  const Recognizer = recognizerClass();
  if (Recognizer === null) {
    return null;
  }
  const recognizer = new Recognizer();
  recognizer.lang = lang;
  recognizer.continuous = false;
  recognizer.interimResults = false;
  recognizer.onresult = (event) => {
    const first = event.results[0];
    const result = first?.[0];
    if (result !== undefined && result.transcript.trim().length > 0) {
      handlers.onText(result.transcript.trim());
    }
  };
  recognizer.onerror = () => {
    handlers.onEnd?.();
  };
  recognizer.onend = () => {
    handlers.onEnd?.();
  };
  try {
    recognizer.start();
  } catch {
    return null;
  }
  return { stop: () => recognizer.stop() };
}
