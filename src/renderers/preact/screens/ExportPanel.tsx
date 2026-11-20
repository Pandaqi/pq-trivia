/**
 * Every way out of the quiz, in three groups.
 *
 * A host on a projector wants paper. A teacher wants CSV, GIFT or QTI. The
 * files are the same exports the CLI writes, so nothing here is a second
 * implementation.
 */

import type { JSX } from "preact";
import { useState } from "preact/hooks";
import type { Quiz } from "../../../core/session/quiz";
import {
  copyQuizJson,
  copyQuizShareLink,
  copyQuizTrivia,
  downloadQuizAttempts,
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
import { GroupHead, HoverNote } from "./Info";

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
  const [note, setNote] = useState<string | null>(null);

  return (
    <>
      <fieldset class="pq-settings-group" aria-label={t("settingsExport")}>
        <GroupHead label={t("settingsExport")} note={t("downloadNote")} />
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
          <button
            type="button"
            onClick={() => {
              void copyQuizShareLink(quiz).then((ok) =>
                setCopied(ok ? t("shareWord") : null),
              );
            }}
          >
            {t("saveShare")}
          </button>
        </div>
        <CopyNote what={copied} />
        <p class="pq-settings-note">{t("shareNote")}</p>
      </fieldset>

      <fieldset
        class="pq-settings-group"
        aria-label={t("settingsExportClassroom")}
      >
        <GroupHead
          label={t("settingsExportClassroom")}
          note={t("classroomNote")}
        />
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
      </fieldset>

      <fieldset class="pq-settings-group" aria-label={t("saveAnalyticsCsv")}>
        <GroupHead label={t("saveAnalyticsCsv")} note={t("analyticsNote")} />
        <div class="pq-settings-row">
          <button
            type="button"
            onClick={() => {
              void downloadQuizAttempts(quiz).then((ok) =>
                setNote(ok ? null : t("noAttempts")),
              );
            }}
          >
            {t("saveAnalyticsCsv")}
          </button>
        </div>
        {note === null ? null : (
          <p class="pq-settings-note" role="status">
            {note}
          </p>
        )}
      </fieldset>

      <fieldset class="pq-settings-group" aria-label={t("settingsPrint")}>
        <GroupHead label={t("settingsPrint")} note={t("printNote")} />
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
        <HoverNote text={t("printAnswerLinesNote")}>
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
        </HoverNote>
        <HoverNote text={t("printTypeHintsNote")}>
          <label class="pq-check">
            <input
              type="checkbox"
              checked={quiz.config.printTypeHints !== false}
              onChange={(event) => {
                quiz.configure({
                  printTypeHints: event.currentTarget.checked,
                });
              }}
            />
            {t("printTypeHints")}
          </label>
        </HoverNote>
      </fieldset>
    </>
  );
}
