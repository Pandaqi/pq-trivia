# Question type plugins

A quiz library cannot ship every question type. A plugin adds one without
touching core, using the same fields every other question uses.

```ts
import {
  defineQuestionType,
  DiagnosticCodes,
  ResponseKind,
  syntaxWarning,
} from "@pandaqi/pq-trivia";

const confidence = defineQuestionType({
  id: "confidence",
  label: "Confidence",
  validate(question, diagnostics) {
    if (question.score > 5) {
      diagnostics.push(
        syntaxWarning(DiagnosticCodes.InvalidNumber, "A confidence question caps at 5 points.", {
          location: question.location,
        }),
      );
    }
  },
  grade(question, response) {
    const sure =
      response.kind === ResponseKind.Custom &&
      (response.value as { sure?: boolean } | null)?.sure === true;
    return {
      points: sure ? question.score : 0,
      correct: sure,
      normalizedGiven: [sure ? "sure" : "not sure"],
      normalizedCorrect: ["sure"],
    };
  },
  render: { input: ConfidenceInput },
});

quiz.registerQuestionType(confidence);
await quiz.load({ type: "text", text });
```

The quiz file asks for it by name:

```trivia
Question => Are you sure about this one?
Answers => yes | no
Score => 2
Type => Confidence
```

## What the plugin gets

`grade(question, response)` is pure. Return points and say whether the answer is
correct. `maxPoints` defaults to the question's score, and points are clamped
between zero and that maximum. Throw and core falls back to the self-reported
custom grade, so a broken plugin costs a question, not the quiz.

Anything the type needs of its own goes in the question's `extra` record, where
unknown attributes already land:

```trivia
Type => Confidence
SurePoints => 2
```

`question.extra["SurePoints"]` holds `["2"]`.

## Rendering

`render.input` is opaque to core. The Preact player calls it with the normal
input props (`quiz`, `screen`, `response`, `issues`), so one component serves any
renderer that knows what to do with it. Core never imports Preact.

`render.screen` and `render.print` are reserved for a host that wants a whole
screen or a paper version.

## Order matters for parsing

Register the type before `load()`. The parser needs the name to accept
`Type => Confidence`; without it you get a diagnostic and an open question.
Registering after a load still works for grading and rendering, and the loaded
questions are validated then.

## Rules

- An id is lowercase letters, digits and dashes: `confidence`, `odd-words`.
- Built-in type names are taken. Use your own.
- A plugin has no DOM access through core. Input components live in your code.
- Custom types are not part of any default build. They cost what your code
  costs.
