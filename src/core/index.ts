/**
 * Core entry. No DOM, no renderer, no platform code.
 *
 * `import { parse, buildQuiz, planQuiz } from "pq-trivia/core"` and you have
 * a quiz engine in a Worker, a CLI or a test.
 */

export { VERSION, SYNTAX_VERSION, EMBEDDED_SCHEMA_VERSION } from "./version";

// syntax
export * from "./syntax/ast";
export * from "./syntax/symbols";
export * from "./syntax/attributes";
export * from "./syntax/attributeRegistry";
export * from "./syntax/diagnostics";
export * from "./syntax/lexer";
export * from "./syntax/parser";
export * from "./syntax/serialize";
export * from "./syntax/headings";

// values
export * from "./values/coerce";
export * from "./values/qval";
export * from "./values/media";

// formatting
export * from "./format/inline";

// model
export * from "./model/ids";
export * from "./model/answers";
export * from "./model/question";
export * from "./model/round";
export * from "./model/quiz";
export * from "./model/validate";

// plan
export * from "./plan/rng";
export * from "./plan/shuffle";
export * from "./plan/order";
export * from "./plan/plan";
export * from "./plan/pool";
export * from "./plan/variants";
export * from "./plan/share";

// grading
export * from "./grading/normalize";
export * from "./grading/grading";
export * from "./grading/plugins";
export * from "./grading/report";
export * from "./grading/points";
export * from "./grading/teams";
export * from "./grading/aids";

// session
export * from "./session/responses";
export * from "./session/session";
export * from "./session/policies";
export * from "./session/storage";
export * from "./session/attempts";
export * from "./session/timers";
export * from "./session/flow";

// content
export * from "./content/include";
export * from "./content/import";
export * from "./content/duplicates";

// export
export * from "./export/embedded";
export * from "./export/json";
export * from "./export/csv";
export * from "./export/analytics";
export * from "./export/gift";
export * from "./export/qti";
export * from "./export/printModel";
export * from "./export/standalone";
