/**
 * Every way out of the quiz, in three boxes.
 *
 * A host on a projector wants paper. A teacher wants CSV, GIFT or QTI. The
 * files are the same exports the CLI writes, so nothing here is a second
 * implementation. Keeping the three jobs apart means the paper page is not
 * lost among the classroom files, and the classroom files are not mistaken for
 * another download.
 */

import type { JSX } from "preact";
import { useState } from "preact/hooks";
import type { Quiz } from "../../../core/session/quiz";
import {
  copyQuizJson,
  copyQuizTrivia,
  downloadQuizCsv,
  downloadQuizGift,
  downloadQuizGrades,
  downloadQuizHandout,
  downloadQuizJson,
  downloadQuizQti,
  downloadQuizTrivia,
  printQuiz,
} from "../../../platform/browser/exports";
import { useT } from "../i18n";

function CopyNote({
  what,
}: {
  readonly what: string | null;
}): JSX.Element | null {
  const t = useT();
  return what === null ? null : (
    <p class="pq-settings-note" role="status">
      {t("copiedWhat", { what })}
    </p>
  );
}

export function ExportPanel({ quiz }: { readonly quiz: Quiz }): JSX.Element {
  const t = useT();
  const trivia = quiz.sourceText();
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <>
      <fieldset class="pq-settings-group">
        <legend>{t("settingsExport")}</legend>
        <div class="pq-settings-row">
          <button type="button" onClick={() => downloadQuizJson(quiz)}>
            {t("saveJson")}
          </button>
          <button
            type="button"
            onClick={() => {
              void copyQuizJson(quiz).then((ok) =>
                setCopied(ok ? t("jsonWord") : null),
              );
            }}
          >
            {t("copyJson")}
          </button>
          <button type="button" onClick={() => downloadQuizHandout(quiz)}>
            {t("saveHandout")}
          </button>
          <button
            type="button"
            disabled={trivia === null}
            onClick={() => downloadQuizTrivia(quiz)}
          >
            {t("saveTrivia")}
          </button>
          <button
            type="button"
            disabled={trivia === null}
            onClick={() => {
              void copyQuizTrivia(quiz).then((ok) =>
                setCopied(ok ? t("triviaWord") : null),
              );
            }}
          >
            {t("copyTrivia")}
          </button>
        </div>
        <p class="pq-settings-note">{t("downloadNote")}</p>
        <CopyNote what={copied} />
      </fieldset>

      <fieldset class="pq-settings-group">
        <legend>{t("settingsExportClassroom")}</legend>
        <div class="pq-settings-row">
          <button type="button" onClick={() => downloadQuizCsv(quiz)}>
            {t("saveCsv")}
          </button>
          <button type="button" onClick={() => downloadQuizGift(quiz)}>
            {t("saveGift")}
          </button>
          <button type="button" onClick={() => downloadQuizQti(quiz)}>
            {t("saveQti")}
          </button>
          <button type="button" onClick={() => downloadQuizGrades(quiz)}>
            {t("saveResultsCsv")}
          </button>
        </div>
        <p class="pq-settings-note">{t("classroomNote")}</p>
      </fieldset>

      <fieldset class="pq-settings-group">
        <legend>{t("settingsPrint")}</legend>
        <div class="pq-settings-row">
          <button type="button" onClick={() => printQuiz("questions")}>
            {t("printQuestions")}
          </button>
          <button type="button" onClick={() => printQuiz("answers")}>
            {t("printAnswers")}
          </button>
          <button type="button" onClick={() => printQuiz("sheet")}>
            {t("printAnswerSheet")}
          </button>
          <button type="button" onClick={() => printQuiz("form")}>
            {t("printAnswerForm")}
          </button>
          <button type="button" onClick={() => printQuiz("media")}>
            {t("printMediaOnly")}
          </button>
        </div>
        <label class="pq-check">
          <input
            type="checkbox"
            checked={quiz.config.printAnswerLines === true}
            onChange={(event) => {
              quiz.configure({
                printAnswerLines: event.currentTarget.checked,
              });
            }}
          />
          {t("printAnswerLines")}
        </label>
        <p class="pq-settings-note">{t("printAnswerLinesNote")}</p>
        <label class="pq-check">
          <input
            type="checkbox"
            checked={quiz.config.printTypeHints !== false}
            onChange={(event) => {
              quiz.configure({ printTypeHints: event.currentTarget.checked });
            }}
          />
          {t("printTypeHints")}
        </label>
        <p class="pq-settings-note">{t("printTypeHintsNote")}</p>
        <p class="pq-settings-note">{t("printNote")}</p>
      </fieldset>
    </>
  );
}
