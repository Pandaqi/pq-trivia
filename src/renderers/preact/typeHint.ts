/**
 * One quiet line saying what kind of answer is wanted.
 *
 * The screen and the print sheet both use it, so a sentence never drifts into
 * two versions. Nothing here names a device: "2 answers" reads the same on a
 * projector, a phone and a sheet of paper.
 */

import { QuestionType } from "../../core/model/question";
import type { QuestionTypeHint } from "../../core/session/viewModel";
import type { Translate } from "./i18n";

export function typeHintText(
  t: Translate,
  hint: QuestionTypeHint,
): string | null {
  const answers = t(hint.correctCount === 1 ? "answer_one" : "answer_other");
  const points = t(hint.pointsPerAnswer === 1 ? "point_one" : "point_other");
  const score = { points: hint.pointsPerAnswer, point: points };
  switch (hint.kind) {
    case QuestionType.Open:
      return t("typeHintOpen");
    case QuestionType.Choice:
      return t("typeHintChoice", {
        count: hint.correctCount,
        answer: answers,
        ...score,
      });
    case QuestionType.List:
      return t("typeHintList", {
        count: hint.correctCount,
        answer: answers,
        ...score,
      });
    case QuestionType.Range:
      return t("typeHintRange", { range: hint.range ?? 0 });
    case QuestionType.Estimate:
      return t("typeHintEstimate", {
        ...score,
        unit: hint.unit ?? "",
      });
    case QuestionType.Sort:
      return t("typeHintSort", score);
    case QuestionType.Rank:
      return t("typeHintRank", score);
    case QuestionType.Match:
      return t("typeHintMatch", score);
    case QuestionType.Cloze:
      return t("typeHintCloze", score);
    case QuestionType.OddOneOut:
      return t("typeHintOddOneOut", score);
    case QuestionType.Hotspot:
      return t("typeHintHotspot", score);
    case QuestionType.Matrix:
      return t("typeHintMatrix", {
        ...score,
        rows: hint.rows,
        answer: answers,
      });
    case QuestionType.Parts:
      return t("typeHintParts", { count: hint.answerCount, ...score });
    case QuestionType.Classification:
      return t("typeHintClassification", score);
    case QuestionType.Diagram:
      return t("typeHintDiagram", score);
    default:
      return null;
  }
}
