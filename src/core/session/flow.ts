/**
 * Flow control. `When => score >= 12` hides a question until it is earned.
 *
 * A tiny expression language, parsed properly. No `eval`, no `Function`, no
 * strings that turn into code. Bad expressions fail open: the question stays,
 * the diagnostic tells the author why.
 */

import { gradeQuestion } from "../grading/grading";
import { questionMaxScore } from "../model/question";
import type { PlannedRound, QuizPlan } from "../plan/plan";
import type { ResponseMap } from "./responses";

/** Score compares against a number; round against a name. */
function scoreNode(comparison: CompareOp, value: Token): FlowNode {
  if (value.kind !== TokenKind.Number) {
    throw new Error("Score compares against a number.");
  }
  return { kind: "score", op: comparison, value: Number(value.value) };
}

export enum CompareOp {
  Gt = ">",
  Gte = ">=",
  Lt = "<",
  Lte = "<=",
  Eq = "=",
  Ne = "!=",
}

export type FlowNode =
  | {
      readonly kind: "call";
      readonly name: "correct" | "wrong" | "answered";
      readonly id: string;
    }
  | { readonly kind: "score"; readonly op: CompareOp; readonly value: number }
  | { readonly kind: "round"; readonly op: CompareOp; readonly value: string }
  | { readonly kind: "and"; readonly left: FlowNode; readonly right: FlowNode }
  | { readonly kind: "or"; readonly left: FlowNode; readonly right: FlowNode }
  | { readonly kind: "not"; readonly node: FlowNode }
  | { readonly kind: "const"; readonly value: boolean };

export interface FlowContext {
  readonly score: number;
  readonly round: string | null;
  readonly correct: ReadonlySet<string>;
  readonly wrong: ReadonlySet<string>;
  readonly answered: ReadonlySet<string>;
}

export type FlowParse =
  | { readonly ok: true; readonly node: FlowNode }
  | { readonly ok: false; readonly error: string };

enum TokenKind {
  Word = "word",
  Number = "number",
  String = "string",
  Op = "op",
  Open = "open",
  Close = "close",
}

interface Token {
  readonly kind: TokenKind;
  readonly value: string;
}

const CALL_NAMES: ReadonlySet<string> = new Set([
  "correct",
  "wrong",
  "answered",
]);
/** The comparison symbols, and what each one means. One table, no drift. */
const COMPARE_OPS: Readonly<Record<string, CompareOp>> = {
  ">": CompareOp.Gt,
  ">=": CompareOp.Gte,
  "<": CompareOp.Lt,
  "<=": CompareOp.Lte,
  "=": CompareOp.Eq,
  "!=": CompareOp.Ne,
};

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source.charAt(index);
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "(") {
      tokens.push({ kind: TokenKind.Open, value: char });
      index += 1;
      continue;
    }
    if (char === ")") {
      tokens.push({ kind: TokenKind.Close, value: char });
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      const end = source.indexOf(char, index + 1);
      if (end < 0) {
        throw new Error("A quoted string is not closed.");
      }
      tokens.push({
        kind: TokenKind.String,
        value: source.slice(index + 1, end),
      });
      index = end + 1;
      continue;
    }
    if (char in COMPARE_OPS) {
      const two = source.slice(index, index + 2);
      if (two in COMPARE_OPS) {
        tokens.push({ kind: TokenKind.Op, value: two });
        index += 2;
        continue;
      }
      tokens.push({ kind: TokenKind.Op, value: char });
      index += 1;
      continue;
    }
    if (
      /\d/.test(char) ||
      (char === "-" && /\d/.test(source.charAt(index + 1)))
    ) {
      let cursor = index + 1;
      while (/[\d.]/.test(source.charAt(cursor))) {
        cursor += 1;
      }
      tokens.push({
        kind: TokenKind.Number,
        value: source.slice(index, cursor),
      });
      index = cursor;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let cursor = index + 1;
      while (/[\w:-]/.test(source.charAt(cursor))) {
        cursor += 1;
      }
      tokens.push({ kind: TokenKind.Word, value: source.slice(index, cursor) });
      index = cursor;
      continue;
    }
    throw new Error(`Unexpected character "${char}".`);
  }
  return tokens;
}

class Parser {
  readonly #tokens: readonly Token[];
  #index = 0;

  constructor(tokens: readonly Token[]) {
    this.#tokens = tokens;
  }

  #peek(): Token | undefined {
    return this.#tokens[this.#index];
  }

  #take(): Token | undefined {
    const token = this.#tokens[this.#index];
    this.#index += 1;
    return token;
  }

  #word(value: string): boolean {
    const token = this.#peek();
    if (token?.kind === TokenKind.Word && token.value.toLowerCase() === value) {
      this.#index += 1;
      return true;
    }
    return false;
  }

  parse(): FlowNode {
    const node = this.#or();
    if (this.#index < this.#tokens.length) {
      throw new Error(`Unexpected "${this.#peek()?.value ?? ""}".`);
    }
    return node;
  }

  #or(): FlowNode {
    let left = this.#and();
    while (this.#word("or")) {
      left = { kind: "or", left, right: this.#and() };
    }
    return left;
  }

  #and(): FlowNode {
    let left = this.#unary();
    while (this.#word("and")) {
      left = { kind: "and", left, right: this.#unary() };
    }
    return left;
  }

  #unary(): FlowNode {
    if (this.#word("not")) {
      return { kind: "not", node: this.#unary() };
    }
    if (this.#peek()?.kind === TokenKind.Open) {
      this.#index += 1;
      const node = this.#or();
      if (this.#take()?.kind !== TokenKind.Close) {
        throw new Error("Missing a closing bracket.");
      }
      return node;
    }
    return this.#predicate();
  }

  #predicate(): FlowNode {
    const token = this.#take();
    if (token === undefined) {
      throw new Error("The expression ends where a condition should start.");
    }
    if (token.kind === TokenKind.Word) {
      const name = token.value.toLowerCase();
      if (CALL_NAMES.has(name)) {
        if (this.#take()?.kind !== TokenKind.Open) {
          throw new Error(`"${name}" needs an ID in brackets.`);
        }
        const argument = this.#take();
        if (argument === undefined || argument.kind !== TokenKind.Word) {
          throw new Error(`"${name}" needs an ID in brackets.`);
        }
        if (this.#take()?.kind !== TokenKind.Close) {
          throw new Error(`"${name}" needs one ID and a closing bracket.`);
        }
        return {
          kind: "call",
          name: name as "correct" | "wrong" | "answered",
          id: argument.value,
        };
      }
      if (name === "score" || name === "round") {
        const op = this.#take();
        const comparison = op === undefined ? undefined : COMPARE_OPS[op.value];
        if (
          op === undefined ||
          op.kind !== TokenKind.Op ||
          comparison === undefined
        ) {
          throw new Error(`"${name}" needs a comparison, like >= 10.`);
        }
        const value = this.#take();
        if (value === undefined) {
          throw new Error(`"${name}" needs a value after ${op.value}.`);
        }
        if (name === "score") {
          return scoreNode(comparison, value);
        }
        return { kind: "round", op: comparison, value: value.value };
      }
      if (name === "true" || name === "false") {
        return { kind: "const", value: name === "true" };
      }
    }
    throw new Error(`Unknown condition "${token.value}".`);
  }
}

export function parseFlow(source: string): FlowParse {
  try {
    const node = new Parser(tokenize(source)).parse();
    return { ok: true, node };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function compare(
  op: CompareOp,
  left: number | string,
  right: number | string,
): boolean {
  if (typeof left === "number" && typeof right === "number") {
    switch (op) {
      case CompareOp.Gt:
        return left > right;
      case CompareOp.Gte:
        return left >= right;
      case CompareOp.Lt:
        return left < right;
      case CompareOp.Lte:
        return left <= right;
      case CompareOp.Eq:
        return left === right;
      case CompareOp.Ne:
      default:
        return left !== right;
    }
  }
  const a = String(left).toLowerCase();
  const b = String(right).toLowerCase();
  switch (op) {
    case CompareOp.Eq:
      return a === b;
    case CompareOp.Ne:
      return a !== b;
    default:
      return false;
  }
}

export function evaluateFlow(node: FlowNode, context: FlowContext): boolean {
  switch (node.kind) {
    case "and":
      return (
        evaluateFlow(node.left, context) && evaluateFlow(node.right, context)
      );
    case "or":
      return (
        evaluateFlow(node.left, context) || evaluateFlow(node.right, context)
      );
    case "not":
      return !evaluateFlow(node.node, context);
    case "const":
      return node.value;
    case "score":
      return compare(node.op, context.score, node.value);
    case "round":
      return compare(node.op, context.round ?? "", node.value);
    case "call":
      if (node.name === "correct") {
        return context.correct.has(node.id);
      }
      if (node.name === "wrong") {
        return context.wrong.has(node.id);
      }
      return context.answered.has(node.id);
    default:
      return false;
  }
}

/** Grade what the player has answered so far. Used by flow conditions only. */
export function flowContext(
  plan: QuizPlan,
  responses: ResponseMap,
): FlowContext {
  const correct = new Set<string>();
  const wrong = new Set<string>();
  const answered = new Set<string>();
  let score = 0;
  for (const question of plan.questions) {
    const response = responses[question.id];
    if (response === undefined) {
      continue;
    }
    const result = gradeQuestion(question, response);
    if (!result.answered) {
      continue;
    }
    answered.add(question.id);
    score += result.points;
    if (result.correct) {
      correct.add(question.id);
    } else {
      wrong.add(question.id);
    }
  }
  return { score, round: null, correct, wrong, answered };
}

/** Every ID a condition mentions, so unknown ones can be reported. */
export function flowIds(node: FlowNode): string[] {
  switch (node.kind) {
    case "call":
      return [node.id];
    case "and":
    case "or":
      return [...flowIds(node.left), ...flowIds(node.right)];
    case "not":
      return flowIds(node.node);
    default:
      return [];
  }
}

function rebuild(
  plan: QuizPlan,
  questions: readonly QuizPlan["questions"][number][],
): QuizPlan {
  const rounds: PlannedRound[] = [];
  for (const round of plan.rounds) {
    const items = questions.filter((question) => question.round === round.id);
    const first = items[0];
    if (first === undefined) {
      continue;
    }
    rounds.push({
      ...round,
      index: questions.indexOf(first),
      count: items.length,
    });
  }
  return {
    ...plan,
    questions,
    rounds,
    total: questions.length,
    maxScore: questions.reduce(
      (total, question) => total + questionMaxScore(question),
      0,
    ),
  };
}

export interface FlowResult {
  readonly plan: QuizPlan;
  readonly problems: readonly string[];
}

/** Filter the plan by `When`. Conditions are read only for questions that have one. */
export function applyFlow(plan: QuizPlan, responses: ResponseMap): FlowResult {
  if (!plan.questions.some((question) => question.when !== null)) {
    return { plan, problems: [] };
  }
  const context = flowContext(plan, responses);
  const problems: string[] = [];
  const known = new Set(plan.questions.map((question) => question.id));
  const kept = plan.questions.filter((question) => {
    if (question.when === null) {
      return true;
    }
    const parsed = parseFlow(question.when);
    if (!parsed.ok) {
      problems.push(`${question.id}: ${parsed.error}`);
      return true;
    }
    for (const id of flowIds(parsed.node)) {
      if (!known.has(id)) {
        problems.push(`${question.id}: unknown question ID "${id}".`);
      }
    }
    return evaluateFlow(parsed.node, { ...context, round: question.round });
  });
  return { plan: rebuild(plan, kept), problems };
}
