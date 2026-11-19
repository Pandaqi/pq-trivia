import type { Quiz } from "../quiz";
import { translate } from "../translator/translator";
import { ExportAnswersParams, convertQuizToTable } from "./exporterAnswerSheet";

export const exporterAnswerForm = (params: ExportAnswersParams) => {
  return (q: Quiz) => {
    params.heading = translate(`[export-answer-form-heading]`, q);
    params.displayAnswers = false;
    params.seed = q.params.seed;
    return convertQuizToTable(q, params);
  };
};
