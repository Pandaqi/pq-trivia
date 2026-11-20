/**
 * The `quiz.export` door: one object, plain strings, no DOM.
 *
 * The CLI writes the same files from the same functions, so a host pressing a
 * button and a script in a build step cannot drift apart.
 */

import type { GradeReport } from "../grading/report";
import type { QuizModel } from "../model/quiz";
import type { QuizPlan } from "../plan/plan";
import type { QuizApi } from "../quiz/types";
import {
  toEmbedded,
  type EmbeddedOptions,
  type EmbeddedQuizV3,
} from "./embedded";
import { gradesCsv, questionsCsv } from "./csv";
import { toGift } from "./gift";
import { toQti } from "./qti";

export interface ExportPort {
  readonly model: () => QuizModel | null;
  readonly plan: () => QuizPlan | null;
  readonly report: () => GradeReport | null;
}

const NOT_LOADED = "No quiz loaded.";

export function createExports(port: ExportPort): QuizApi["export"] {
  const model = (): QuizModel => {
    const found = port.model();
    if (found === null) {
      throw new Error(NOT_LOADED);
    }
    return found;
  };
  const plan = (): QuizPlan => {
    const found = port.plan();
    if (found === null) {
      throw new Error(NOT_LOADED);
    }
    return found;
  };
  return {
    embedded(options: EmbeddedOptions = {}): EmbeddedQuizV3 {
      return toEmbedded(model(), options);
    },
    csv(): string {
      return questionsCsv(plan(), model().meta);
    },
    gift(): string {
      return toGift(plan(), model().meta);
    },
    qti(): string {
      return toQti(plan(), model().meta);
    },
    grades(): string | null {
      const report = port.report();
      return report === null ? null : gradesCsv(report);
    },
  };
}
