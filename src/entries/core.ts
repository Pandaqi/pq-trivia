/**
 * Bundle entry for `dist/v3/core.js`.
 *
 * Parser, model, plan, session, grading and the JSON save format. No controller
 * and no DOM. The big exporters (QTI, GIFT, standalone HTML) live behind their
 * own modules, so this artifact stays inside its budget.
 */

export {
  VERSION,
  SYNTAX_VERSION,
  EMBEDDED_SCHEMA_VERSION,
} from "../core/version";

// syntax
export * from "../core/syntax/ast";
export * from "../core/syntax/symbols";
export * from "../core/syntax/attributes";
export * from "../core/syntax/attributeRegistry";
export * from "../core/syntax/diagnostics";
export * from "../core/syntax/lexer";
export * from "../core/syntax/parser";
export * from "../core/syntax/serialize";

// values and formatting
export * from "../core/values/coerce";
export * from "../core/values/qval";
export * from "../core/values/media";
export * from "../core/format/inline";

// model
export * from "../core/model/ids";
export * from "../core/model/answers";
export * from "../core/model/question";
export * from "../core/model/round";
export * from "../core/model/quiz";
export * from "../core/model/validate";

// plan
export * from "../core/plan/rng";
export * from "../core/plan/shuffle";
export * from "../core/plan/order";
export * from "../core/plan/plan";

// grading
export * from "../core/grading/normalize";
export * from "../core/grading/grading";
export * from "../core/grading/report";

// session
export * from "../core/session/events";
export * from "../core/session/registry";
export * from "../core/session/responses";
export * from "../core/session/session";
export * from "../core/session/policies";
export * from "../core/session/storage";
export * from "../core/session/attempts";
export * from "../core/session/timers";
export * from "../core/session/flow";
export * from "../core/session/viewModel";

// The save format and the manifest. `content/include` is a CLI preprocessor
// and stays out of this artifact; exporters live behind their own modules.
export * from "../core/export/embedded";
export * from "../core/export/json";
export * from "../core/quiz/manifest";
