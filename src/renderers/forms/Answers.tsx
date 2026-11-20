/**
 * One input per question type, chosen from a table.
 *
 * The extras under the field are the small honest ones: "No idea" records a
 * deliberate blank, confidence says how sure you are, and a wager puts points
 * on the line. None of them touch the score except the wager's own risk line
 * on the report.
 */

import { h, type JSX } from "preact";
import { QuestionType } from "../../core/model/question";
import { CONFIDENCE_LEVELS, Confidence } from "../../core/session/responses";
import { useT } from "../preact/i18n";
import { ChoiceInput, ReasonedInput } from "./choice";
import { ClassificationInput } from "./classification";
import { DiagramInput, HotspotInput } from "./hotspot";
import { MatchInput } from "./match";
import { MatrixInput } from "./matrix";
import { PartsInput } from "./parts";
import { SortInput } from "./sort";
import {
  ClozeInput,
  EstimateInput,
  ListInput,
  OpenInput,
  RangeInput,
} from "./text";
import type { InputProps } from "./fields";

const INPUTS: Readonly<Record<string, (props: InputProps) => JSX.Element>> = {
  [QuestionType.Choice]: ChoiceInput,
  [QuestionType.OddOneOut]: ReasonedInput,
  [QuestionType.Open]: OpenInput,
  [QuestionType.Range]: RangeInput,
  [QuestionType.Estimate]: EstimateInput,
  [QuestionType.List]: ListInput,
  [QuestionType.Cloze]: ClozeInput,
  [QuestionType.Sort]: SortInput,
  [QuestionType.Rank]: SortInput,
  [QuestionType.Match]: MatchInput,
  [QuestionType.Hotspot]: HotspotInput,
  [QuestionType.Diagram]: DiagramInput,
  [QuestionType.Matrix]: MatrixInput,
  [QuestionType.Parts]: PartsInput,
  [QuestionType.Classification]: ClassificationInput,
};

const CONFIDENCE_LABELS: Readonly<Record<string, string>> = {
  [Confidence.Low]: "confidenceLow",
  [Confidence.Medium]: "confidenceMedium",
  [Confidence.High]: "confidenceHigh",
};

function NoIdea({ quiz, screen }: InputProps): JSX.Element {
  const t = useT();
  return (
    <button
      type="button"
      class="pq-no-idea"
      aria-pressed={screen.noIdea}
      onClick={() => quiz.setNoIdea(screen.id, !screen.noIdea)}
    >
      {t("noIdea")}
    </button>
  );
}

function ConfidencePicker({ quiz, screen }: InputProps): JSX.Element {
  const t = useT();
  return (
    <div
      class="pq-confidence pq-center"
      role="group"
      aria-label={t("confidence")}
    >
      <span class="pq-field-label">{t("confidence")}</span>
      {CONFIDENCE_LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          class="pq-confidence-key"
          aria-pressed={screen.confidence === level}
          onClick={() =>
            quiz.setConfidence(
              screen.id,
              screen.confidence === level ? null : level,
            )
          }
        >
          {t(CONFIDENCE_LABELS[level] ?? level)}
        </button>
      ))}
    </div>
  );
}

function WagerPicker({ quiz, screen }: InputProps): JSX.Element | null {
  const t = useT();
  // Nothing to bet when the score is empty. A slider from 0 to 0 is not a
  // choice, it is a tease.
  if (!screen.wager || screen.revealed || screen.wagerMax <= 0) {
    return null;
  }
  const value = Math.min(screen.wagerValue ?? 0, screen.wagerMax);
  return (
    <label class="pq-wager pq-center">
      <span class="pq-field-label">
        {t("wagerLabel", {
          max: screen.wagerMax,
          unit: t(screen.wagerMax === 1 ? "point_one" : "point_other"),
        })}
      </span>
      <input
        type="range"
        min={0}
        max={screen.wagerMax}
        step={1}
        value={value}
        onInput={(event) =>
          quiz.setWager(screen.id, Number(event.currentTarget.value))
        }
      />
      <output class="pq-wager-value">{value}</output>
    </label>
  );
}

/** A registered type brings its own input. Opaque in core, Preact here. */
function customInput(
  props: InputProps,
): ((props: InputProps) => JSX.Element) | null {
  const plugin = props.quiz.questionTypes.get(props.screen.plugin);
  const input = plugin?.render?.input;
  return typeof input === "function"
    ? (input as (props: InputProps) => JSX.Element)
    : null;
}

export function Answers(props: InputProps): JSX.Element {
  const custom = customInput(props);
  if (custom !== null) {
    return h(custom, props);
  }
  const Input = INPUTS[props.screen.type] ?? OpenInput;
  return (
    <>
      <Input {...props} />
      <div class="pq-response-extras pq-center">
        <NoIdea {...props} />
        <ConfidencePicker {...props} />
      </div>
      <WagerPicker {...props} />
    </>
  );
}
