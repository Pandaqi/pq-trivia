/**
 * Ask for one kind of paper, then print.
 *
 * `mountQuiz` draws the sheet on `beforeprint`, and reads the kind requested
 * here. Without a request it follows the play mode, like Ctrl+P always did.
 */

export type PrintKind = "questions" | "answers" | "sheet" | "form" | "media";

let requested: PrintKind | null = null;

export function requestPrint(kind: PrintKind): void {
  requested = kind;
  if (typeof window !== "undefined") {
    window.print();
  }
}

/** Read once per `beforeprint`. A request is never reused by accident. */
export function consumePrintKind(): PrintKind | null {
  const kind = requested;
  requested = null;
  return kind;
}
