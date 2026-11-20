# PQ-Trivia V3 — Roadmap & Specification

> **Working title:** _PQ-Trivia V3 — Trivia Syntax_
> **Status:** Phases 0–8 shipped.
> **Baseline:** v2.5.0 (`src/v2/`, `dist/v2/pq-trivia.min.js`, 108 KB)
> **Source:** `todo.md`, a full read of `src/`, and an audit of the build and distribution.

---

## 0. The short version

V3 rebuilds the library around three promises:

1. **Trivia Syntax stays the product.** A quiz is still plain text. Readable, diffable, writable by a human. Every V2 file keeps working.
2. **The engine goes headless.** Parse, plan, play and grade become pure modules. No DOM. The current screens become one renderer of several.
3. **Distribution gets professional.** Bun builds everything. Tree-shakeable entry points. npm, CDN, and one standalone file for `file://`. Real docs. Automated release.

Also: a better default look, working interactive mode, optional multiplayer, real exports for teacher platforms, and themes that cost nothing when unused.

**Shape:** 8 phases, plus 1 stretch goal. Phase 0–2 is the core. Everything else ships after 3.0 as minor versions.

**One rule to keep in mind:** every dependency must earn its kilobytes. Current list: Preact. That's it, for the library itself.

---

## 1. Goals and non-goals

### 1.1 Who it is for

| Who                      | What they need                                       | What V3 promises                                                  |
| ------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------- |
| **Pub quiz hosts** (you) | Fast authoring, projector playback, printed fallback | Same seed = same quiz. Keyboard play. Print that works. No setup. |
| **Teachers**             | Interactive play, grading, review, LMS export        | Correct grading. Results page. Accessible. GIFT/QTI/CSV.          |
| **Players**              | Phone or laptop, clear feedback                      | Responsive. Keyboard and touch. Progress saved.                   |
| **Authors**              | Send one text file                                   | Tolerant parser. Helpful errors. No numbering.                    |
| **Developers**           | Custom frontends, tiny bundles                       | Headless API. Events. Plugin types. Import only what you use.     |
| **Theme designers**      | Stable CSS contract                                  | Documented tokens and classes. No framework lock-in.              |

### 1.2 Done means

- Every quiz you sell at The Wayward Melody loads **without edits**.
- Core (parser, model, plan, grading, attempts): **≤ 24 KB gzip**. Player: **≤ 48 KB**. Full build: **≤ 55 KB**. IIFE: **≤ 60 KB**.
- `bun install && bun run check && bun run build` passes on a clean clone. Windows, macOS, Linux.
- A first-time author goes from empty folder to playable quiz in **under 5 minutes**.
- Every interactive type grades correctly. Documented rules. Tested.
- WCAG 2.2 AA on the default theme. Automated where cheap, manual where not.
- One command cuts a release: tag, GitHub Release, npm publish, docs deploy.
- Public types are versioned. No breaking change without a major bump and a migration note.

### 1.3 Not doing

- Parsing `.docx` / `.pdf`. (Already discarded. Still true.)
- Background music with mixing. Authors can play their own.
- Language switch on the load screen before questions exist. Impossible without pre-declaring languages. The manifest solves the cosmetic part.
- Accounts, cloud sync, DRM, or a backend for core play.
- Cheat-proof offline mode. We can hide answers better. We cannot hide them entirely.
- Replacing Trivia Syntax with YAML/JSON/TOML. JSON is an export, not an authoring format.

---

## 2. Audit: where V2 stands

### 2.1 Keep this

- **The input philosophy.** `Question => ...`, `Answers => ...`, block lists, `##` rounds, comments. Opens in Notepad. Diffs in Git.
- **Attribute masks.** `?` question-only, `!` answer-only, `$` keep-as-is. Weird. Useful. Keep.
- **Seeded determinism.** Same content + same seed = same quiz.
- **Sections as questions.** With computed stats and secret themes.
- **Media inside answers.** Not just next to the question.
- **Print-first exports.** Per-page questions, answer sheet, answer form, grade table.
- **Theming via CSS variables.** No component library.
- **Zero runtime dependencies.** V3 keeps the core dependency-free.

### 2.2 Structural problems

| Problem                                                | Evidence                                                                                                                | Result                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| No `package.json`, no `tsconfig.json`, no build config | repo root                                                                                                               | Cannot install, typecheck or build from source. `dist/v2` came from somewhere else. |
| Imports that cannot resolve                            | `quizScreenLoad.ts` → `lib/pq-trivia/...`; `quizScreenSettings.ts` → `lib/pq-trivia/...`; `quizTheme.ts` → `..` (cycle) | No clean build is possible today.                                                   |
| One class owns everything                              | `Quiz` owns loader, nodes, DOM, export, storage, translator, timers                                                     | "Parser only" is impossible. Every test needs a DOM.                                |
| DOM mixed into data                                    | `QuestionTyper*` return `HTMLElement`                                                                                   | Cannot run in a Worker or a CLI.                                                    |
| Global side effects                                    | `document.head`, `document.body`, `window.onbeforeunload`, `localStorage`, `document.fonts`                             | No teardown. No two quizzes per page. No isolation.                                 |
| Docs drift from code                                   | `backgroundAlpha`, `filenamePattern`, `loadDefaultStyles`, `FormatText`, `fileExtensions`                               | Authors follow the docs and get silence.                                            |
| Zero tests                                             | —                                                                                                                       | The "needs testing" list is exactly the branching logic.                            |

### 2.3 Defects

**S1** = data loss, crash or security. **S2** = visibly wrong. **S3** = papercut.

| #   | Sev | Issue                                                                                                                                                        | Where                                                                             | Fixed in |
| --- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | -------- |
| 1   | S1  | **HTML injection.** Question text, answers, comments, sources, titles and translations go through `innerHTML`. A submitted quiz file can run script.         | `createNode.ts`, `createAnswerNode.ts`, `createQuestionNode.ts`, `markdownify.ts` | 1–2      |
| 2   | S2  | **`translate()` renders all text.** Every `[...]` in any string is treated as a UI key. Unknown keys become empty strings.                                   | `createNode.ts`, `translator.ts`                                                  | 1        |
| 3   | S1  | **Grade screen wipes the page.** `document.body.innerHTML = ""` kills the quiz, error handler and toolbar. "Go Back" has nowhere to go.                      | `quizScreenEnd.ts`                                                                | 2        |
| 4   | S1  | **Toolbar mutates config.** `toolbarActions.splice()` edits `quiz.params.toolbar` itself. Each screen change removes buttons.                                | `nodes.ts`                                                                        | 2        |
| 5   | S1  | **HTTP loader duplicates URLs.** `arr.push(path)` inside the language loop and again after it. Path may point at a file that failed.                         | `loaderHTTP.ts`                                                                   | 1        |
| 6   | S1  | **JSON and RTF upload crash.** `parseRawFile` returns an object or `undefined`, then `.split` is called on it. RTF is offered in the picker.                 | `parser.ts`, `loaderUpload.ts`                                                    | 0        |
| 7   | S2  | **camelCase attributes ignored.** Parser lowercases keys; `Question.fromData` reads `formatText` etc. Also `"false"` is truthy. Booleans can never be off.   | `question.ts`, `parser.ts`                                                        | 1        |
| 8   | S1  | **Choice grading compares by index.** Sparse arrays keyed by click order. Sort has the same shape. Reveal reads `dataset.id`, which choice inputs overwrite. | `questionTyperChoice.ts`, `storageInteractive.ts`                                 | 3        |
| 9   | S1  | **No teardown.** Listeners, intervals, `<style>`, fonts and `onbeforeunload` all outlive the quiz.                                                           | `dom.ts`, `timer.ts`, `quizTheme.ts`                                              | 2        |
| 10  | S2  | **Theme URLs break on file pages.** `${window.location.href}/${path}` gives `.../index.html/theme/...`.                                                      | `quizTheme.ts`                                                                    | 1        |
| 11  | S2  | **Sync XHR per media file.** `HEAD` with `async=false`, once per item. On `file://` status `0` counts as "exists".                                           | `loader.ts`                                                                       | 6        |
| 12  | S2  | **Export re-randomizes the quiz.** `finalizeQuestions()` shuffles in place. Export twice, lose the author's order.                                           | `exporter.ts`                                                                     | 1/5      |
| 13  | S2  | **Embedded export is clipboard-only.** Needs a secure context and a gesture. No download. No error.                                                          | `exporter.ts`                                                                     | 5        |
| 14  | S2  | **Sorting fights authors.** Defaults alphabetize rounds, then shuffle. Questions too.                                                                        | `questionDatabase.ts`                                                             | 1        |
| 15  | S2  | **IDs depend on load order.** Assigned before sorting, with parallel file loads. Unstable across machines.                                                   | `questionDatabase.ts`                                                             | 1        |
| 16  | S2  | **Naive `setInterval` timer.** Drift, no pause, no visibility handling, `STAY_BUT_HIDE` is a one-way trip.                                                   | `timer.ts`                                                                        | 3        |
| 17  | S2  | **Fragile language matching.** Equal counts required, matched by order, silent fallback.                                                                     | `translator.ts`                                                                   | 1        |
| 18  | S2  | **Print CSS is broken.** Absolute-positioned screens, nested selector inside `@page`, `print-color-adjust: exact` against the docs.                          | `stylesCoreTheme.css`                                                             | 2/5      |
| 19  | S3  | **Invalid CSS.** `--heading-weight: "regular"`, `white-space: preserve`, `--font-size` never set.                                                            | `stylesCoreTheme.css`                                                             | 2        |
| 20  | S3  | **`.includes` link detection.** Any answer containing `.com` becomes a link.                                                                                 | `parser.ts`                                                                       | 1        |
| 21  | S3  | **`parseFloat(...) ?? 1`.** Gives `NaN`, not `1`. One typo poisons the stats.                                                                                | `question.ts`                                                                     | 1        |
| 22  | S3  | **`initializeParameters` mutates the caller.** Pushes defaults into `params.settings` every call.                                                            | `params.ts`                                                                       | 1        |
| 23  | S3  | **Inverted booleans.** `this.failed = ... && length <= 0` works by accident.                                                                                 | `question.ts`                                                                     | 1        |
| 24  | S3  | **Dead code.** `console.log` in `gotoNextSection`, no-op `finalizeMedia`, `this` at module scope, stray TODOs.                                               | multiple                                                                          | 1        |
| 25  | S3  | **Hardcoded `VERSION`.** Duplicated in docs. No changelog. No source map.                                                                                    | `quiz.ts`                                                                         | 0        |
| 26  | S3  | **Template ships its own 108 KB copy.** Nothing refreshes it. It will drift.                                                                                 | `template/`                                                                       | 0        |
| 27  | S3  | **`getURLsFixed` hardcodes `.txt`.** Stops at the first gap. Ignores `fileExtensions`.                                                                       | `loaderHTTP.ts`                                                                   | 1        |
| 28  | S3  | **Storage key has no version.** No attempt separation. Quota errors unhandled. Start screen wipes answers.                                                   | `storageInteractive.ts`                                                           | 3        |
| 29  | S3  | **No accessibility baseline.** Global `user-select:none`, emoji-only icons, no live regions, no focus management, no `alt`.                                  | theme, screens                                                                    | 2        |
| 30  | S3  | **"Raw" and "initialized" params are the same object.** Later refactors are unsafe.                                                                          | `quiz.ts`                                                                         | 1        |

**The pattern:** almost every S1 comes from two choices. Strings go straight into `innerHTML`. State is smeared across mutable classes. Fix the architecture and the whole class of bug goes away.

---

## 3. Design rules

1. **Plain text in, plain text out.** Trivia Syntax is the only authoring format. Anything must fit in a file you can email.
2. **Offline first.** `file://`, a USB stick, no Wi-Fi. First-class.
3. **Embedded or loaded.** Baked in, loaded from files, or fetched. Same pipeline.
4. **Localization is structural.** UI strings, content languages, RTL, number formats. One system.
5. **The core has no DOM.** `src/core/**` never imports `document`, `window` or a renderer.
6. **Dependencies point one way.** Lower layers never import higher ones.
7. **Pay for what you use.** Parser-only users ship no screens. No-animation users ship no animations.
8. **Determinism.** Same content, same seed, same config, same plan. Every browser.
9. **Fail loudly and kindly.** Every problem has a code, a place, a sentence and a suggestion. No silent drops.
10. **No global mutation without cleanup.** Every listener and timer belongs to an instance. `destroy()` removes it.
11. **No dependencies.** Preact for the renderer. Trystero only in the multiplayer entry. VitePress only for docs. Nothing else.

---

## 4. Architecture

### 4.1 Framework choice

`todo.md` asks: Preact, Svelte, or Web Components? Answer: **all three, at different levels.**

| Option             | Good                                            | Bad                                                                                                    |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Preact**         | ~4 KB. JSX. Huge ecosystem. Works on `file://`. | One dependency. Needs a build step (we have one).                                                      |
| **Svelte 5**       | Great DX. Compiled output.                      | Compiler coupling. Scoped CSS fights author themes. Harder to swap one screen.                         |
| **Web Components** | Native. `<pq-quiz>` tag.                        | **Shadow DOM hurts here.** Authors must restyle everything with plain CSS. Print and fonts get harder. |
| **Raw DOM (now)**  | No deps.                                        | Manual diffing. Imperative updates. That is where the bugs live.                                       |

**Decision:**

- **Core:** plain TypeScript. Zero dependencies. No DOM.
- **Default renderer:** Preact. No signals package. `useSyncExternalStore` is enough.
- **Wrapper:** optional `<pq-quiz>` custom element. **Light DOM by default.** Shadow DOM opt-in only.
- **Escape hatch:** headless renderer plus per-screen view overrides. If Preact ever becomes a liability, only `renderers/preact` gets replaced.
- **No Svelte.** The compiler makes the library harder to consume as source, and saves little once screens and themes are counted.

**Renderer contract:** the session emits a serializable `ScreenViewModel`. Preact does `vm => VNode`. Your renderer does `vm => void`. This one decision also delivers the "turn off default output" and `onQuestionLoad` todos.

### 4.2 Layers

Strict. One direction only.

```
8  entries        full · player · core · multiplayer · editor · compat-v2
7  renderers      preact (default) · dom primitives · headless
6  themes         tokens · core · default · print · high-contrast
5  platform       fetch · file picker · storage · clipboard · worker · clock
4  features       export · i18n catalogs · editor services
3  session        state machine · navigation · responses · grading · timers
2  plan           rng · shuffle · constraints · selection · flow
1  model          question · round · quiz · ids · validation
0  syntax         lexer · parser · AST · symbols · values · format · serialize
```

Rules:

- Layer _n_ imports layers `< n`. Same-layer imports stay acyclic.
- `core/**` (0–4) never imports `renderers`, `themes`, `platform` or `entries`.
- Only `platform` touches `window`, `document`, `navigator`, `localStorage`, `fetch`, `File`, `WebSocket`.
- Only `renderers` creates DOM nodes.
- Only `entries` registers side effects.
- **Enforced by the compiler, not a linter.** `tsconfig.core.json` sets `"lib": ["ES2022"]`. Any DOM use in core fails to compile. That is stronger than a rule file.
- Remaining import rules: one small script, `scripts/check-layers.ts` (~40 lines, our own code, `bun run layers`). No dependency-cruiser.

### 4.3 Layout

```
pq-trivia/
├─ package.json                 # type: module, exports map
├─ bunfig.toml
├─ tsconfig.json                # app-wide, strictest settings
├─ tsconfig.core.json           # core only, lib: ES2022 (no DOM)
├─ .editorconfig
├─ src/
│  ├─ core/
│  │  ├─ syntax/                symbols · lexer · parser · ast · diagnostics
│  │  │                         · serialize · attributes.ts · grammar.ebnf
│  │  ├─ values/                qval · coerce · media
│  │  ├─ format/                inlineAst · parseInline · toPlainText · normalize
│  │  ├─ model/                 question · round · quiz · ids · validate
│  │  ├─ plan/                  rng · shuffle · constraints · select · flow · plan
│  │  ├─ session/               session · navigation · responses · grading
│  │  │                         · scoring · timers · viewModel · events
│  │  ├─ content/               manifest · include · merge
│  │  ├─ i18n/                  messages · translate · locales/
│  │  └─ export/                embedded · printModel · answerSheet · gradeReport
│  │                            · qti · gift · csv
│  ├─ platform/browser/         fetchSource · uploadSource · fileSystemSource
│  │                            · storage/{memory,local,indexedDb} · clipboard
│  │                            · download · workerParser · clock
│  ├─ renderers/
│  │  ├─ preact/                QuizApp · screens/ · questionTypes/ · components/
│  │  ├─ dom/                   customElement · primitives
│  │  └─ headless/
│  ├─ editor/                   ← stretch goal, own bundle (§10.5)
│  │  ├─ EditorApp.tsx          slide list · form pane · text pane · preview
│  │  ├─ forms/                 attribute-driven field widgets
│  │  ├─ commands.ts            add · remove · move · duplicate · undo
│  │  └─ io.ts                  open folder · save file · media picker
│  ├─ themes/                   tokens · core · default/ · print · high-contrast
│  ├─ animations/               registry · presets/ · index
│  └─ entries/                  full · player · core · multiplayer · editor · compat-v2
├─ cli/                         validate · build · pack · encrypt · format · migrate · grade · stats
├─ test/                        fixtures · core tests (see §15)
├─ docs/                        VitePress
├─ examples/
├─ template/
└─ dist/
   ├─ v1-final/                 archived, untouched
   ├─ v2/                       archived, untouched
   └─ v3/                       generated
```

### 4.4 Packages and bundles

```jsonc
{
  "name": "pq-trivia",
  "type": "module",
  "version": "3.0.0",
  "sideEffects": false,
  "dependencies": {
    "preact": "^10.27.0",
  },
  "peerDependencies": {
    "trystero": "^0.21.0",
  },
  "peerDependenciesMeta": {
    "trystero": { "optional": true },
  },
  "devDependencies": {
    "@types/bun": "^1.3.0",
    "vitepress": "^1.6.0",
    "happy-dom": "^21.0.0",
    "axe-core": "^4.14.0",
  },
  "exports": {
    ".": {
      "types": "./dist/v3/types/index.d.ts",
      "import": "./dist/v3/pq-trivia.js",
    },
    "./core": {
      "types": "./dist/v3/types/core.d.ts",
      "import": "./dist/v3/core.js",
    },
    "./player": {
      "types": "./dist/v3/types/player.d.ts",
      "import": "./dist/v3/player.js",
    },
    "./headless": {
      "types": "./dist/v3/types/headless.d.ts",
      "import": "./dist/v3/headless.js",
    },
    "./animations": {
      "types": "./dist/v3/types/animations.d.ts",
      "import": "./dist/v3/animations.js",
    },
    "./multiplayer": { "import": "./dist/v3/multiplayer.js" },
    "./editor": { "import": "./dist/v3/editor.js" },
    "./compat/v2": { "import": "./dist/v3/compat-v2.js" },
    "./themes/default.css": "./dist/v3/themes/default.css",
    "./themes/print.css": "./dist/v3/themes/print.css",
  },
}
```

Only two real dependencies. `trystero` is optional and only imported by the multiplayer entry. `happy-dom` and `axe-core` are dev-only: they test the renderer, they never ship. `typescript` is **not** listed: `bun check` does the type checking, and declarations are emitted at release with `bunx tsc` (cache only, no manifest entry).

| Artifact                        | Format                                    | Contents                                                     | Budget (gzip)     |
| ------------------------------- | ----------------------------------------- | ------------------------------------------------------------ | ----------------- |
| `dist/v3/core.js`               | ESM                                       | syntax, values, model, plan, session, grading, JSON export   | ≤ 40 KB           |
| `dist/v3/player.js`             | ESM                                       | core + Preact + default theme + theme folders + 3 animations | ≤ 100 KB          |
| `dist/v3/pq-trivia.js`          | ESM                                       | player + all question types + exporters                      | ≤ 105 KB          |
| `dist/v3/pq-trivia.min.js`      | IIFE, `window.PQTrivia` (+ `window.Quiz`) | full, standalone, `file://`-safe                             | ≤ 115 KB          |
| `dist/v3/pq-trivia.core.min.js` | IIFE                                      | core only                                                    | ≤ 42 KB           |
| `dist/v3/multiplayer.js`        | ESM                                       | full + Trystero adapter                                      | ≤ 32 KB           |
| `dist/v3/chunk-qr.js`           | ESM, lazy                                 | the join QR encoder, fetched by the lobby only               | ≤ 8 KB            |
| `dist/v3/animations.js`         | ESM                                       | full animation set                                           | ≤ 10 KB           |
| `dist/v3/editor.js`             | ESM                                       | QuizWizard. **Not in any default build.**                    | ≤ 60 KB, separate |
| `dist/v3/types/**`              | `.d.ts`                                   | release only, `bunx tsc --emitDeclarationOnly`               | —                 |

Every artifact gets a `/*! PQ-Trivia vX.Y.Z | MIT | commit */` banner and an external map. Budgets are checked by `bun run size` (our own 30-line script). Release-time, not on every save.

The budgets used to describe a build that no longer existed. Core measured 27 KB against a 24 KB limit, headless 39 against 27, the player 73 against 52, the standalone 84 against 60. Four red lines, all of them noise. So they were rewritten as current size plus a third for the features already planned: core 40, player 100, standalone 115. A budget you are over before you start is not a budget.

The earlier note still explains why the numbers are round: they are measured size plus air, not a target someone picked first. When an artifact lands well under its number, bring that number down. That is the fun job.

### 4.5 Session

Pure reducer. Injected clock. Injected storage. Testable without a browser. Reusable by the CLI.

```ts
interface SessionState {
  status: "idle" | "loading" | "ready" | "playing" | "finished" | "error";
  plan: QuizPlan | null;
  config: ResolvedConfig;
  language: string;
  mode: "questions" | "answers";
  index: number; // -1 start, 0..n-1 questions, n end
  responses: ResponseMap; // questionId -> typed response
  hinted: Record<string, number>;
  revealed: Set<string>;
  startedAt?: number;
  endedAt?: number;
  diagnostics: Diagnostic[];
}

type Action =
  | { type: "load/start" }
  | { type: "load/success"; plan: QuizPlan }
  | { type: "load/failure"; diagnostics: Diagnostic[] }
  | { type: "nav/next" }
  | { type: "nav/prev" }
  | { type: "nav/goTo"; index: number }
  | { type: "mode/set"; mode: "questions" | "answers" }
  | { type: "answer/toggle"; index: number }
  | { type: "response/set"; questionId: string; response: Response }
  | { type: "hint/reveal"; questionId: string }
  | { type: "timer/tick"; questionId: string; remainingMs: number }
  | { type: "timer/expire"; questionId: string }
  | { type: "language/set"; language: string }
  | { type: "finish" }
  | { type: "restart" };
```

Selectors produce the renderer contract:

```ts
type ScreenViewModel =
  | StartScreenVM
  | QuestionScreenVM
  | RoundScreenVM
  | SettingsScreenVM
  | EndScreenVM
  | ResultsScreenVM;

interface QuestionScreenVM {
  kind: "question" | "round";
  layout: LayoutId;
  classes: string[];
  meta: {
    index: number;
    total: number;
    round?: string;
    points?: number;
    categories: string[];
    authors: string[];
    language?: string;
  };
  title: InlineAst;
  body: InlineAst[];
  media: MediaVM[];
  answers: AnswerVM[]; // no `correct` in restricted mode
  input?: InputVM;
  hints: { revealed: InlineAst[]; total: number };
  explanation?: InlineAst;
  timer?: { totalMs: number; remainingMs: number };
  background?: BackgroundVM;
  transition?: AnimationId;
}
```

**Hard rule:** in question mode, the view model contains no correct answers. Grading reads the plan. That is what makes DOM inspection useless in educational mode.

### 4.6 Events

Typed emitter. Also mirrored as `CustomEvent`s on the host element.

```ts
interface QuizEventMap {
  ready: { version: string; stats: QuizStats };
  "state:change": { from: SessionState["status"]; to: SessionState["status"] };
  "screen:change": { screen: ScreenViewModel };
  "question:enter": { index: number; id: string };
  "question:leave": { index: number; id: string; responses: ResponseMap };
  "answer:reveal": { index: number; id: string };
  "response:change": { id: string; response: Response };
  "hint:reveal": { id: string; remaining: number };
  "timer:tick": { id: string; remainingMs: number; totalMs: number };
  "timer:expire": { id: string };
  "language:change": { from: string; to: string };
  "grade:ready": { report: GradeReport };
  diagnostic: { diagnostic: Diagnostic };
  "export:ready": { kind: ExportKind; blob: Blob };
  destroy: {};
  error: { error: QuizError };
}
```

`quiz.on(event, handler)` returns an unsubscribe function. Consumer handlers run inside try/catch. A throwing handler becomes a diagnostic, not a dead quiz.

### 4.7 Versioning

- Public types: `QuizPlan`, `ScreenViewModel`, `Response`, `Diagnostic`, `GradeReport`, `QuizEventMap`. Semver applies.
- Internals are not exported from the package root.
- `CONFIG_SCHEMA_VERSION` and `EMBEDDED_SCHEMA_VERSION` are their own numbers.
- Deprecations warn once in dev, live for one major, then leave with a migration note.

---

## 5. Trivia Syntax V3

The name is official now: **Trivia Syntax**.

Canonical extension: **`.trivia`**. `.txt` and `.md` accepted forever. `.md` is not Markdown. It is a text file with a fancy name.

Still line-based. Still tolerant. Everything below is optional sugar, chosen to stay readable in Notepad.

### 5.1 Rules

- One attribute per line: `Key => Value`. Keys are case-insensitive.
- No required numbering, quoting, escaping or indentation.
- Everything is optional except `Question` (or a `Start`/`End`/section header) and `Answers` for types that need it.
- Unknown attributes are **warnings with a suggestion**. Never dropped in silence.
- Lists: `|` inline, or one item per line.
- Text is never HTML unless you ask for it.
- Any grammar symbol can be changed via `symbols`.

### 5.2 Header

Optional. Must come before the first question. Same `Key => Value` shape, so there is nothing new to learn.

```trivia
Quiz => The Big Music Quiz
Syntax => 3
Language => en
Title => The Big Music Quiz (2026 edition)
Theme => vinyl
Description => Five rounds about records, bands and one-hit wonders.
Date => 2026-03-01
Seed => music-night
Author => Tiamo
Version => 1.2
```

Also allowed: `Languages`, `License`, `Homepage`, `Image`. A manifest can override these. The manifest wins and the conflict becomes a warning.

### 5.3 Attributes

Aliases are accepted and rewritten to canonical form by the formatter.

| Canonical        | Aliases                     | Type                           | Notes                                                                                            |
| ---------------- | --------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `Question`       | `Q`                         | text                           | starts a question                                                                                |
| `Answers`        | `Answer`, `A`               | list                           | options or expected answers                                                                      |
| `Correct`        | `CorrectAnswer`             | list                           | defaults to first answer                                                                         |
| `Type`           |                             | enum                           | `Open`, `Choice`, `List`, `Range`, `Sort`, `Match`, `Cloze`, `Section`, `Start`, `End`, `Custom` |
| `Range`          | `Margin`                    | number                         | error margin. Implies `Range`.                                                                   |
| `Media`          | `Image`, `Audio`, `Video`   | media list                     | §5.6                                                                                             |
| `Category`       | `Categories`, `Tag`, `Tags` | list                           |                                                                                                  |
| `Author`         | `Authors`, `By`             | list                           |                                                                                                  |
| `Score`          | `Points`                    | number                         | checked against `minScore` / `maxScore`                                                          |
| `Scoring`        | `ScoreMethod`               | enum                           | `all-or-nothing`, `partial`, `per-correct`                                                       |
| `Grading`        |                             | enum                           | `exact`, `normalized` (default), `fuzzy`                                                         |
| `FuzzyDistance`  |                             | number                         | max edit distance                                                                                |
| `AlsoAccept`     | `Aliases`, `Accept`         | list                           | equivalent answers                                                                               |
| `Reject`         |                             | list                           | explicitly wrong. Beats fuzzy.                                                                   |
| `Explanation`    | `Explain`                   | text                           | after reveal and in results                                                                      |
| `Comment`        | `Comments`, `Note`          | list                           | shown to players                                                                                 |
| `Hints`          | `Hint`                      | list                           |                                                                                                  |
| `Sources`        | `Source`                    | list                           |                                                                                                  |
| `Secret`         | `Theme`                     | text                           | rounds only                                                                                      |
| `Timer`          | `Time`                      | duration                       | `90`, `1:30`, `1m30s`                                                                            |
| `ID`             | `Id`                        | string                         | stable reference                                                                                 |
| `Language`       | `Lang`                      | string                         |                                                                                                  |
| `Translation`    | `TranslationOf`             | string                         | explicit cross-language link                                                                     |
| `Section`        | `Round`                     | string                         | assign to a round                                                                                |
| `PlaceAt`        |                             | number                         | rounds only                                                                                      |
| `PlaceBefore`    |                             | id list                        |                                                                                                  |
| `PlaceAfter`     |                             | id list                        |                                                                                                  |
| `AnswersOrder`   |                             | `keep` \| `shuffle`            |                                                                                                  |
| `MediaOrder`     |                             | `keep` \| `shuffle`            |                                                                                                  |
| `FormatText`     |                             | boolean                        | real boolean now                                                                                 |
| `HiddenAtPlay`   | `Hide`                      | boolean                        |                                                                                                  |
| `HiddenAtExport` |                             | boolean                        |                                                                                                  |
| `SyncAll`        |                             | boolean                        | copy missing props from root                                                                     |
| `Class`          | `Classes`                   | list                           | CSS classes on the screen                                                                        |
| `Layout`         |                             | enum                           | §7.3                                                                                             |
| `Background`     |                             | descriptor                     | `color:...`, `image:...`, `none`                                                                 |
| `ColorScheme`    |                             | string                         | named scheme                                                                                     |
| `Transition`     | `Animation`                 | preset                         | screen enter                                                                                     |
| `Reveal`         |                             | preset                         | answer reveal                                                                                    |
| `Print`          |                             | flags                          | `hide`, `background`, `no-background`, `notes`                                                   |
| `Direction`      | `Dir`                       | `auto`/`ltr`/`rtl`             |                                                                                                  |
| `Description`    |                             | text                           | screen-reader summary                                                                            |
| `Alt`            |                             | list                           | fallback alt text                                                                                |
| `Include`        | `Import`                    | path[#selector]                | merge a file or bank                                                                             |
| `Script`         |                             | path                           | sandboxed widget                                                                                 |
| `When`           |                             | expression                     | conditional visibility                                                                           |
| `Continue`       |                             | `always`/`onCorrect`/`onWrong` | flow control                                                                                     |

Deprecated but still parsed (warning + rewrite): `ScoreMethod` as free text, `FormatText` as a string.

### 5.4 Values

- **Booleans:** `true/false`, `yes/no`, `on/off`, `1/0`. Anything else is a diagnostic with the nearest match suggested. Real booleans in the model. That kills defect #7.
- **Numbers:** `1.5` or `1,5`. Durations: `90`, `1:30`, `1:02:03`, `90s`, `2m`, `1m30s`.
- **Lists:** `A | B | C`, or a block:
  ```trivia
  Answers =>
  A
  B
  C
  ```
- **Escapes:** `\|` for a literal pipe, `\=>` for a literal arrow, `\\` for a backslash.
- **Comments:** `// line` and `/* block */`. A leading `#` is a round header, not a comment.
- **Keep as-is:** `$value` skips formatting and media detection.
- **Masks:** `?value` question-only, `!value` answer-only. Works on every list attribute.
- **No line continuation.** One line is one thing. Need a newline? Use a block list item.
- **Empty lists are errors.** `Answers =>` with nothing after it is a diagnostic.

### 5.5 Inline formatting

`markdownify` currently chains a dozen `replaceAll` calls and nests badly. V3 parses to an **inline AST**: `text`, `strong`, `em`, `underline`, `strike`, `code`, `link`, `span`, `sup`, `sub`, `blank`, `break`, `mark`, `kbd`, `abbr`, `fn`, `spoiler`.

```
**bold**   _italic_   __underline__   ~~strike~~   `code`
[Link text](https://example.com)
[color=red]red[/color]
[size=150%]big[/size]
[class="warning"]styled[/class]
[style="color:red;font-weight:bold"]inline CSS[/style]
[blank]
^[sup]   _[sub]
[mark]highlight[/mark]   [kbd]Ctrl[/kbd]
[abbr="HyperText Markup Language"]HTML[/abbr]
[fn]footnote[/fn]   [spoiler]hidden until clicked[/spoiler]
\* literal asterisk
```

Rules:

- `class` must match `^[a-zA-Z][\w-]*$` and gets a `pq-` prefix on render. Authors cannot hit internal classes by accident.
- `style` is allowlisted: color, background-color, font-size, font-weight, font-style, text-decoration, text-align. The rest is dropped with a diagnostic.
- Links: `http(s)`, `mailto`, `tel`, `#anchor`. `javascript:` and `data:` are rejected.
- Raw HTML is off. `Html =>` or `allowHtml: true` renders through a small allowlist sanitizer. Documented escape hatch, not the default.
- Formatting off means literal text nodes. Never `innerHTML`.
- Parse once per value. Memoize the AST. Reuse it for question, reveal and print.

### 5.6 Media descriptors

Old syntax still works: `Media => picture.jpg`.

New optional descriptor keeps metadata next to the file:

```trivia
Media => crowd.jpg { alt="A packed concert hall", credit="Photo: Jane Doe / CC BY 4.0", fit=cover }
Media => intro.mp3 { transcript="intro-transcript.txt" }
Media => clip.mp4 { poster="clip-poster.jpg", captions="clip.en.vtt", loop, muted }
```

- `{ ... }` group after the filename. Pairs are `key=value`. Bare keys are booleans.
- Values may be quoted. Quotes inside can be escaped.
- `alt` is required for images when `strictMedia: true` (recommended for education), a warning otherwise. `alt=""` is allowed for decoration.
- Resolution: relative to `media/` by default. Absolute URLs fine. `$` still forces literal text.
- A file used as an answer uses the same syntax inside `Answers`.

### 5.7 New question types

#### `Start` and `End`

Not questions. They never appear in counts, stats or grading.

```trivia
Type => Start
Question => The Wayward Melody presents
Comment => A night of questionable music knowledge.
Media => cover.jpg { alt="Quiz cover art" }
Description => Five rounds, forty questions, one winner.
Buttons => play | interactive | answers | settings

Type => End
Question => That's all, folks!
Comment => Thanks for playing. Argue about question 12 on the way home.
Buttons => answers | restart | exit
Credits => Questions by Tiamo
```

- `Buttons` sets which actions appear, in order: `play`, `interactive`, `answers`, `settings`, `restart`, `exit`, `grade`, `export`.
- `Media`, `Background`, `Layout`, `Class`, `Transition` all apply.
- Two `Start` blocks: last one wins, with a warning. (Branches come later.)
- `HiddenAtPlay` is meaningless here and rejected.

#### `Match`

```trivia
Question => Match the artist to the album.
Answers => The Beatles ~ Abbey Road | Daft Punk ~ Discovery | Björk ~ Homogenic
Type => Match
```

- Pairs use `~`. Configurable via `symbols.match`.
- Left and right columns shuffle independently, deterministically per seed.
- One point per pair by default. `Scoring => all-or-nothing` requires all of them.
- Click left, click right to connect. Click a connection to remove it. Keyboard works: select and Enter.
- Print: two columns, answer key shows the pairs.
- Limits: 2 to 12 pairs. Outside that is a diagnostic.

#### `Cloze`

```trivia
Question => The first moon landing was in [blank] and the mission was [blank].
Answers => 1969 | Apollo 11
Type => Cloze
```

- Each `[blank]` takes the next answer.
- `||` separates per-blank answer lists: `Answers => 1969|1969 AD || Apollo 11|Apollo XI`.
- Graded per blank, partial credit per blank.
- Print: numbered underscores, numbered answer form.

### 5.8 Layouts and per-question styling

```trivia
Class => spotlight | dark
Layout => media-left
Background => color:#101820
ColorScheme => midnight
Print => no-background
```

- `Class` adds namespaced classes. The theme decides what they mean.
- Built-in utility classes: `spotlight`, `center`, `compact`, `full-bleed`, `dark`, `invert`, `quote`, `code`.
- `Layout` sets `data-pq-layout`. CSS does the rest. See §7.3.
- `Background` takes `color:`, `image:`, `gradient:`, `none`. Alpha is a theme token, not a per-question number.
- `Print` flags let one question opt in or out of ink-heavy styling.

### 5.9 Flow control (V3.2, opt-in)

```trivia
Type => Section
Question => Bonus Round
ID => bonus
When => score >= 12

Question => ...
ID => hard-1
Unlock => bonus
```

- Conditions use a tiny grammar. **No `eval`.** `correct(id)`, `wrong(id)`, `answered(id)`, `score >= N`, `round = "Name"`, joined with `and`, `or`, `not`, parentheses.
- Parsed by a Pratt parser. Evaluated against the response map.
- The plan is recomputed **after each round**, never mid-question. The current index stays put. A `plan:change` event fires.
- Deterministic: same responses plus seed, same branch.
- Safety: max 3 recomputations, cycle detection, diagnostics for unknown IDs.
- No adaptive testing. A plugin can build that on `quiz.plan.replace()`.

### 5.10 Sandboxed custom content

The todo asks for executable code inside questions. `eval` would destroy the security model. V3 uses an iframe.

```trivia
Type => Custom
Question => Adjust the equalizer until the waveform matches.
Script => eq-widget.js
Height => 24em
```

- Scripts load only when `allowScripts: true` (default false) **and** the script is in the manifest's `scripts` list.
- Runs in `<iframe sandbox="allow-scripts">`. No same-origin, no forms, no popups, no top navigation.
- Talk over `postMessage`, versioned:
  - widget → host: `pq:ready`, `pq:resize`, `pq:response`, `pq:correct|wrong` (only if `grading: 'self'`), `pq:diagnostic`
  - host → widget: `pq:init`, `pq:reveal`, `pq:reset`, `pq:grade`
- Host validates every response against the declared schema. A hostile widget cannot inject state.
- Offline: the iframe gets a Blob URL built from the script text. Works on `file://`.
- Print: static fallback from `PrintFallback =>` or a screenshot the script provides.

### 5.11 Localization

Keep both V2 methods, make them explicit.

1. **Same ID, different language:**
   ```trivia
   Question => Wanneer was de watersnoodramp?
   ID => north-sea-flood
   Language => nl
   Answers => 1953

   Question => When was the North Sea Flood?
   ID => north-sea-flood
   Language => en
   Answers => 1953
   ```
2. **One file per language.** `questions.nl.trivia`, `questions.en.trivia`. Matched by `Translation` or, failing that, by position plus a count check.

Additions:

- `Languages => en | nl` in the header declares intent. Files outside the list get a warning.
- `Translation => <id>` removes the ambiguity.
- A manifest names files and languages, so there is no filename archaeology and no `HEAD` probing.
- Missing translations fall back per question, with a "not translated" marker in the picker. Host-only. Never printed.
- Partial translations are fine (`strictLanguages: false`). `strictLanguages: true` makes them errors.
- UI catalog: `MessageKey` union generated from `en.ts`. `bun run i18n:check` reports missing, extra and unused keys, plus placeholder mismatches.
- Locales are JSON. No code.

### 5.12 Grammar, diagnostics, formatter

- Publish `grammar.ebnf`. Generate the syntax reference from it. Docs and parser cannot drift.
- Every diagnostic has `code` (`PQ1xx` syntax … `PQ6xx` export), `severity`, `message`, `location {file,line,column}`, `suggestion`, `docsUrl`.
- Recovery: skip the bad line, keep the question if possible, load the quiz anyway, show "3 problems in questions-2.trivia".
- `pq-trivia format` rewrites to canonical form. Round-trip test: `parse(format(x))` deep-equals `parse(x)` for the whole fixture set.
- Strictness: `tolerant` (default), `strict` (fail on errors), `ci` (fail on warnings too).

---

## 6. Public API

### 6.1 Create and mount

```ts
import { createQuiz } from "pq-trivia";

const quiz = createQuiz({
  target: "#quiz",
  theme: { name: "vinyl" },
  renderer: "default", // 'default' | 'headless' | Renderer
  config: {
    seed: "music-night",
    language: "en",
    allowInput: true,
    interactivePolicy: "permissive",
    requireAltText: true,
    allowScripts: false,
  },
});

await quiz.load({ type: "url", manifest: "./quiz.manifest.json" });
// or: { type: 'upload', files }
// or: { type: 'inline', data: embeddedJson }
// or: { type: 'text', files: [{ name: 'questions.trivia', text }] }

await quiz.ready();
quiz.mount(document.querySelector("#quiz")!);
```

Lifecycle: `createQuiz()` → `load()` → `ready()` → `mount()` → play → `destroy()`.

- `mount()` twice is a no-op with a warning.
- `destroy()` removes every listener, timer, style tag, font, object URL and DOM node. The instance is dead afterwards. Make a new one.
- `new Quiz(params)` still works via `pq-trivia/compat/v2` and `window.Quiz`.

### 6.2 Playback

```ts
quiz.next();                    // next question or end screen
quiz.prev();
quiz.goTo(5);
quiz.goToId('north-sea-flood');
quiz.nextRound(); / quiz.prevRound();
quiz.goToStart(); / quiz.goToEnd();
quiz.reveal();
quiz.setMode('answers');
quiz.setLanguage('nl');
quiz.restart({ keepResponses?: boolean });
```

Everything goes through the reducer. Keyboard, toolbar, custom code and multiplayer produce the same transitions.

`next()` returns `{ ok, reason?: 'blocked' | 'invalid' | 'end' }`. No silent nothing.

### 6.3 Read

```ts
quiz.state; // Readonly<SessionState>
quiz.currentQuestion(); // QuestionMeta | null
quiz.currentScreen(); // ScreenViewModel
quiz.progress(); // { index, total, answered, scoreSoFar, percent }
quiz.responses.get("north-sea-flood");
quiz.responses.all();
quiz.diagnostics();
quiz.grade(); // GradeReport
quiz.stats();
```

Selectors, not mutable fields. `quiz.state` is replaced on every transition, so the "signal" todo is one line:

```ts
quiz.subscribe((state, screen) => {
  /* your UI */
});
```

### 6.4 Render overrides

Three levels.

1. **Headless:** `createQuiz({ renderer: 'headless' })`. No DOM renderer imported. You get view models and events.
2. **Per screen:**
   ```ts
   quiz.views.set("question", (vm, ctx) => {
     const el = document.createElement("section");
     el.className = "my-question";
     el.append(ctx.renderInline(vm.title));
     vm.answers.forEach((a) => el.append(ctx.renderAnswer(a)));
     return el;
   });
   ```
3. **Per component:** `quiz.components.set('media', MyMedia)`.

`quiz.onQuestionLoad = fn` is sugar for `views.set('question', fn)`, with the full question model as the second argument. The default renderer is just the registered `question` view. No privileged path.

`ctx` gives you: `renderInline`, `renderAnswer`, `renderMedia`, `t(key, params)`, `actions`, `theme`, `formatScore`, `a11y.announce`.

### 6.5 Config

Plain object. Schema, defaults, validation. Unknown keys become diagnostics, not silence.

Groups:

- `quiz`: id, title, seed, url, base paths, manifest, files, date, icon, banner
- `content`: include/exclude, groupBy, sections, allowed types, min/max answers, min/max score, default score/category/author, `requireAltText`, `shuffleQuestions`, `shuffleRounds`
- `languages`: default, available, strict, fallback
- `appearance`: theme, layouts, transitions, motion (`full`/`reduced`/`off`), color schemes, font scale
- `play`: allowInput, interactivePolicy, revealMode, showAnswersAfterEach, timers, safety
- `input`: mouse, keys, touch, hotkeys, forbidden hotkeys
- `ui`: toolbar, disableUI, hideErrors, errorPlacement, settings
- `media`: formats, lazy, autoplay, iframes allowlist, captions
- `export`: defaults for print, sheet, form
- `advanced`: allowHtml, allowScripts, sandbox origins, worker threshold

`quiz.configure(partial)` re-resolves and replans when content options change. `quiz.config` is read-only.

### 6.6 Exports

```ts
quiz.export.embedded({ compact?: boolean });
quiz.export.download('embedded');
quiz.export.printQuestions();
quiz.export.printAnswers();
quiz.export.answerSheet({ columns?: 2 });
quiz.export.answerForm({ columns?: 1, lines?: 1 });
quiz.export.gradeReport();
quiz.export.csv('grades');
quiz.export.qti();
quiz.export.gift();
```

Every exporter is a pure `(plan, options) => ExportResult` in `core/export`. The browser methods are thin wrappers. The CLI calls the same functions.

### 6.7 Plugins

```ts
import { defineQuestionType } from "pq-trivia";

quiz.registerQuestionType(
  defineQuestionType({
    id: "hotspot",
    parse({ answers, raw }) {
      /* -> HotspotModel */
    },
    validate(model, ctx) {
      return ctx.diagnostics;
    },
    defaultResponse: () => ({ kind: "hotspot", points: [] }),
    render: { screen: HotspotView, input: HotspotInput, print: printHotspot },
    grade(response, model) {
      /* -> { score, correct, given } */
    },
    export: { embedded: toJSON, answerSheet: toCell },
  }),
);
```

Built-ins use the same interface. No `switch (type)` in core. That is both the plugin API and the reason core stays tree-shakeable.

### 6.8 Custom element

```html
<script type="module" src="/pq-trivia.js"></script>
<pq-quiz src="./quiz.manifest.json" theme="./theme.css"></pq-quiz>

<script>
  const el = document.querySelector("pq-quiz");
  el.addEventListener("pq:question:enter", (e) => console.log(e.detail.id));
  el.quiz.next();
</script>
```

- Light DOM by default. `shadow` opts into Shadow DOM. Documented trade-off.
- Attributes: `src`, `inline`, `theme`, `language`, `seed`, `config`, `storage`.
- Properties: `el.quiz`, `el.config`.
- IIFE sets `window.PQTrivia` and, for old pages, `window.Quiz`.

---

## 7. Rendering, themes, animation, print

### 7.1 Renderer rules

- One screen at a time. No pile of absolutely positioned screens. That pile is why print currently cheats.
- Semantic markup: `<main>` → `<section data-pq-screen>` → `<header>`, `<h1>`, `<div data-pq-content>`, `<ol data-pq-answers>`.
- State lives in data attributes: `data-pq-mode`, `data-pq-layout`, `data-pq-answered`, `data-pq-correct`, `data-pq-revealed`, `data-pq-disabled`.
- Text comes from the inline AST. Only allowlisted HTML gets parsed.
- Focus moves to the screen heading on change. Mouse users do not see the ring (`:focus-visible`).
- `aria-live="polite"` announces "Question 4 of 40", timer milestones, grade ready.
- Images: `loading="lazy"`, `decoding="async"`, width/height from the manifest, `fetchpriority="high"` for the next question's first image.
- Real `<button>`, `<input>`, `<select>`. No clickable divs. (Tempting. No.)

### 7.2 Screens

| Screen   | Purpose               | Contents                                                                    |
| -------- | --------------------- | --------------------------------------------------------------------------- |
| Load     | pick a source         | title, cover, built-in/server/upload/drop, manifest picker, problem summary |
| Start    | set expectations      | cover, title, description, date, language, mode buttons, settings           |
| Settings | options + export      | order and seed, rounds, theme, motion, exports, reset                       |
| Play     | question or round     | metadata, content, media, answers, hints, timer, toolbar                    |
| End      | breathe before review | stats, grade/answers/restart/exit                                           |
| Results  | grade breakdown       | total, percentage, per-round table, review, filters, print/export           |

### 7.3 Layouts

`data-pq-layout` plus CSS grid. Zero JS cost.

- `text-only` — centered question, answers below.
- `media-left` / `media-right` — 50/50, stacks under 720px.
- `media-top` — full-width media, content below.
- `media-full` — hero media with a contrast-safe panel.
- `split` — half color panel, half plain.
- `center` — one big column. Projector food.
- `quote` — oversized quote with attribution.
- `code` — monospace, line numbers, copy button.
- `custom` — no layout CSS. Only your `Class` classes.

Themes add layouts with `[data-pq-layout="name"]`. Contract documented.

### 7.4 Default theme: "Paper"

- Neutral, roomy, projector-legible. AA contrast. Light and dark. Prints well. No web fonts.
- Type: system stack, fluid `clamp()` scale. Body 1–1.5rem. Question 2–3.5rem.
- Spacing: 4px base. Radii 6/10/16. One shadow. 1px borders.
- Color: OKLCH with hex fallbacks. Neutral background, near-black text, one accent. Eight schemes.
- Feedback: green + check + "Correct". Red + cross + "Not quite". Never color alone.
- Focus: 3px ring, 2px offset. Visible on anything.
- Touch: 44×44 minimum.
- Motion: 180ms ease-out. Off under reduced motion.
- Round screens: inverted surface, big number, stat chips ("6 questions · 7 points"), secret theme card. Not a question wearing a hat.
- Toolbar: slim, translucent, icon+label, overflow menu, `?` for shortcuts.
- Drop the global `user-select: none`. People copy question text. Let them.

### 7.5 Animation

- Presets: `fade`, `slide-left`, `slide-right`, `slide-up`, `zoom-in`, `zoom-out`, `flip-x`, `wipe`, `blur-in`, `stagger-children`, `typewriter`, `count-up`, `shake`, `pulse`, `confetti`, `none`.
- CSS `@keyframes` plus the Web Animations API. View Transitions where available, no polyfill.
- Scope: screen enter/exit, reveal, hint, feedback, score count, timer urgency, error toast. Separate settings for each.
- Default build imports `fade`, `slide`, `shake`. Everything else is in `pq-trivia/animations` or dynamically imported by name. Base bundle never pays.
- Per question: `Transition =>`, `Reveal =>`. Per API: `{ motion: 'reduced', animations: ['zoom-in'] }`.
- Budget: transform and opacity only. No layout thrash. ≤ 300ms per transition. ≤ 40ms per stagger item, 8 items max. Cancel on navigation.
- `prefers-reduced-motion` and `motion: 'off'` make everything instant. Nothing flashes above 3 Hz.

### 7.6 Print

Print is a target, not a leftover.

- A **print model** (`PrintDocument`) is generated from the plan: pages, blocks, media placeholders, page numbers, headers, answer key.
- Static flow layout. One question per page via `break-after: page`. `@page` size and margins configurable (A4, Letter).
- Options: questions, answers, explanations, hints, sources, backgrounds (off), two-column key, page numbers, cut marks.
- Audio and video print as a labelled placeholder with filename and optional QR/link.
- `print-color-adjust: economy` by default. `backgrounds: true` opts into exact.
- Print opens a separate window. The live quiz is never destroyed. (Fixes defect #3.)
- Checked by eye in Chrome, Firefox and Safari at release. No test framework.

### 7.7 Order and seed in the UI

Default is author order. Nothing shuffles unless you ask.

- Settings has a visible **Order** block. Not buried in an advanced tab.
- Two switches: **Shuffle questions**, **Shuffle rounds**. Both off.
- Seed field showing the current seed, plus a **New seed** button. Type your own to reproduce a quiz exactly.
- While shuffling is on, one line explains what changes and a **Preview order** link shows the first few items.
- Choices are remembered per quiz. Changing them replans instantly and keeps responses.
- No hidden defaults. No config file needed. Chaos is two clicks away, and clearly labelled.

---

## 8. Interactive mode

This is the teacher-facing half. Right now it is the least reliable part.

### 8.1 Response model

```ts
type Response =
  | { kind: "open"; text: string }
  | { kind: "range"; value: number | null }
  | { kind: "choice"; selected: string[] } // answer IDs, not indices
  | { kind: "list"; items: string[] }
  | { kind: "sort"; order: string[] } // answer IDs
  | { kind: "match"; pairs: Array<[string, string]> }
  | { kind: "cloze"; blanks: string[] }
  | { kind: "custom"; value: unknown };
```

- Answers have stable IDs (content hash, or explicit `ID`). Never display indices. That fixes defect #8 by construction.
- `choice.selected` is a set. Order does not matter.
- Sorting uses an order of IDs. Correct order comes from `Answers`, which is never shuffled in the model.
- Responses are stored per question ID, per attempt, with a schema version.

### 8.2 Input UX

- One widget per type. Inline errors. No toasts.
- Empty answer and you hit next? The **field** gets `aria-invalid`, a red border and a message ("Choose at least one answer"). Focus jumps there. Small shake unless reduced motion.
- Policies: `permissive` (warn once), `required` (needs some response, default), `strict` (needs a valid response).
- `revealMode`: `never` (default), `afterAnswer`, `always`.
- Autosave on change, debounced 300ms, with a quiet "saved" tick.

### 8.3 Grading

One pure function for browser and CLI:

```ts
gradeQuestion(question, response, config): GradeResult
// { points, maxPoints, correct, detail: perPart[], normalizedGiven, normalizedCorrect }
```

Normalization:

1. NFC.
2. Trim, collapse whitespace.
3. Locale-aware case fold.
4. Strip diacritics (`café` = `cafe`). On for `normalized`.
5. Strip punctuation and articles ("the", "a", "an"). Off by default, on for `fuzzy`.
6. Parse numbers for `Range` (`1,5`, `1.5`, `1 500`).
7. Compare against `Correct` + `AlsoAccept`, minus `Reject`.
8. `fuzzy` only: Levenshtein ≤ `FuzzyDistance`. Default 1 for short words, 2 for long. Never for words under 3 characters. (Nobody deserves "a" matching "i".)

| Type   | Correct when                                 | Points                       |
| ------ | -------------------------------------------- | ---------------------------- |
| Open   | normalized match against accepted list       | all-or-nothing               |
| Range  | `abs(given - correct) <= margin`             | all-or-nothing               |
| Choice | set equality (subset for multi-select)       | all-or-nothing, or `partial` |
| List   | each expected answer matched once, any order | per item                     |
| Sort   | exact position                               | per position                 |
| Match  | pair equality                                | per pair                     |
| Cloze  | per blank                                    | per blank                    |
| Custom | plugin                                       | plugin                       |

`Scoring => partial` and `per-correct` become real. `Answers` order is the truth for list, sort and cloze.

### 8.4 Results

Replaces the "dump a table into `document.body`" approach.

- Header: score, max, percentage, band, time.
- Breakdown: per round, per category, small bars, best/worst.
- Review: your answer next to the correct one, icon, explanation, sources, thumbnail, points.
- Filters: all / wrong / unanswered. Jump to question. "Retry wrong only".
- Actions: print, CSV, JSON, restart, exit.
- Accessible tables with `scope`. No color-only status. Print styles.
- Attempts in IndexedDB, localStorage fallback: `{id, startedAt, endedAt, responses, report, configSnapshot}`. Resume on reload. "Clear history" in settings.

### 8.5 Compare while playing

The todo asks for real answer next to your answer, as an option. That is `revealMode` (§8.2).

- When revealed: your choice or text sits next to the correct one, with icon, color and explanation.
- In `never`, the answers are not in the view model. Not hidden with CSS. Absent.
- Host can always switch to answer mode afterwards. Students cannot, unless allowed.

### 8.6 Restricted mode, honestly

- Disables answer mode, reveal and backward navigation by default.
- Correct answers are not rendered in question mode. They live in the session.
- Optional `answersEncrypted: true` with a passphrase: AES-GCM over correct answers. Casual inspection is useless. A determined player with a weak passphrase still wins. Say so in the docs.
- No telemetry. No accounts. No IP logging.

### 8.7 Storage

- Adapter: `get/set/remove/clear/keys`. Memory, localStorage, IndexedDB.
- Quota exceeded → memory fallback + one diagnostic. No crash.
- Storage blocked → memory only, with a visible "progress won't be saved".
- Schema version plus a migration function.
- `beforeunload` guard only while playing, only if `enableSafety`, removed on `destroy()`.

---

## 9. Multiplayer (optional package)

### 9.1 Goal

Host on a big screen. Players join by code or link. Questions mirror to phones. Answers come back. Host reveals. Leaderboard moves.

Works on LAN. No account. No server to run for the Trystero path.

### 9.2 Transport

```ts
interface RoomTransport {
  create(code: string): Promise<Room>;
  join(code: string): Promise<Room>;
  room.on('peer:join' | 'peer:leave' | 'message' | 'error', handler): Unsubscribe;
  room.send(msg: HostToPlayer | PlayerToHost, to?: PeerId): void;
  room.leave(): void;
}
```

Adapters:

- `TrysteroTransport` — P2P over WebRTC. No server. Optional dependency. Only in `pq-trivia/multiplayer`.
- `WebSocketTransport` — for a hosted room server. Thin, documented protocol.
- `BroadcastChannelTransport` — same browser, multiple tabs. Tests and demos.

### 9.3 Protocol v1

Messages: `{ v: 1, type, id, ts, payload }`. `id` is a UUID, for idempotency. The host owns state.

Host → players: `room:state`, `question:show` (allowlisted subset), `question:close`, `answer:reveal`, `score:update`, `quiz:end`, `ping`.
Players → host: `join`, `answer:submit`, `ready`, `pong`.

- Host validates joins (room open, max players, name length) and answers (known question, before deadline, one per question unless `allowChanges`).
- Players never get correct answers before reveal. They get an allowlist, not the host's model.
- Reconnect with a stored token: current state plus current question. Missed reveals replay from sequence number.
- Host time is the deadline. Late answers get flagged.
- Rate limit: one message per 250ms per player.

### 9.4 UX

- **Host:** "Play live" → 4-letter code (no ambiguous characters) → big URL + QR → lobby → start → answer counter → reveal → leaderboard → podium.
- **Reveal timing:** a mode, not a constant. Per question, per round, at the end, or the paper way: play it all, then a second pass through the answers. §9.4 detail lives in `docs/guides/multiplayer.md`.
- **Player:** link or code → name → waiting → question (big tap targets) → submitted → reveal → leaderboard → final.
- **QR:** the join link encoded locally with `uqr`, drawn as one SVG path from the module matrix. No image, no network, no external service.
- **Media:** thumbnails from the manifest. No autoplay with sound. "Play on my phone" button.
- **Accessibility:** same components as the player. Live regions. Haptics optional.
- The whole `encodeURIComponent` situation with room codes: 4 characters, uppercase, no O/0 or I/1.

### 9.5 Separation

- `pq-trivia/multiplayer` holds the transport and the lobby UI.
- The default player build contains zero multiplayer code and zero Trystero.
- Live mode configured but multiplayer not loaded? The button is absent, plus a dev diagnostic. Never a dead button.

---

## 10. Authoring features

### 10.1 Includes and banks

```trivia
Include => banks/music.trivia#beatles
Include => banks/general.trivia
```

- Paths resolve relative to the including file.
- `#selector` picks a round by name or a tag (`#tag:music`).
- Cycle detection. Max depth 10.
- Merged **before** planning, so rounds, IDs, languages and constraints behave as one file.
- Included IDs get namespaced (`bank:music/question-id`) unless already unique.
- This is how you get a personal library and sellable quiz packs that share a bank.

### 10.2 Content checks

- `pq-trivia stats` / `bun run check:content`: counts by type, round, category, author, language. Score spread. Duplicate text. Duplicate IDs. Missing alt. Unused answers. Very long answers. Missing explanations. Broken media.
- Shown in the GUI under Settings → Content check, with links to the culprit.

### 10.3 Search and jump

- Searchable list of all questions: round, number, type, category, author. Click to jump.
- Host-only. Never shown to interactive players.
- Needed once a bank passes 100 questions. So, immediately.

### 10.4 Code display

````
Question => What does this print?
```
console.log(2 + 2)
```
````

- Renders `<pre><code class="language-js">` with escaped text.
- Optional highlighter loaded lazily, only if `codeHighlight: true`. Default is plain monospace.
- Line numbers, copy button, wrap toggle, max-height scroll, print-safe.
- Inline `` `code` `` uses the same styles.

### 10.5 The QuizWizard (stretch goal, optional build)

Author a quiz **inside** the page. No text file, no editor.

**Shape:**

- Separate entry: `pq-trivia/editor`. Separate bundle. **Default builds leave it out.**
- Build flag: `bun run build --editor`. Off by default.
- Uses core only: `parse`, `serialize`, `validate`, plus the player for preview.
- Three panes: **slide list** | **form editor** | **Trivia Syntax text**.
- Optional fourth: live preview.

**What it does:**

- Add, remove, duplicate and reorder slides (rounds, questions, start, end).
- Edit fields through generated forms. Forms come from the attribute registry, so new attributes appear automatically. No hand-written field lists.
- Edit the text pane directly. Press Refresh (or blur) → parse → forms update.
- Form edits rewrite the text buffer via `serialize()`. One serializer. The text _is_ the model.
- Diagnostics appear on the slide that owns them.
- Media: drop a file → copied to `media/` when File System Access is available; otherwise a preview-only data URL with a warning.
- Undo/redo: stack of serialized snapshots. Text is small. No dependency.
- Save: download `.trivia` + `quiz.manifest.json`. Optional "save to folder".
- Import: paste, upload files, or open a folder.
- Preview: run the real player against the current buffer.

**Rules:**

- **Text is the single source of truth.** Every UI action becomes text. No separate model to keep in sync. This is why the wizard is cheap later.
- No server. No account. Works offline.
- Accessible forms, labelled fields, keyboard reorder (Alt+↑/↓), no drag-only interactions.
- Host-side only. Players never see it.

**What the plan must already have (Phase 1–2), so this stays cheap:**

- `core/syntax/serialize.ts` — the canonical formatter. Non-negotiable from Phase 1.
- `core/syntax/attributes.ts` — one registry: key, aliases, type, group, description, default. Drives forms, docs table, formatter order and validation.
- AST nodes with stable IDs, so a slide survives a reparse.
- `QuizPlan` as a pure function of text + config, so preview is free.
- An `editor` entry point in the build matrix, budgeted separately.

**Why stretch:** it is a product of its own. Syntax + formatter + validator + templates already cover authoring. Ship 3.0 first.

### 10.6 Timer sound

- Theme-level audio cues: `{ tick, lastFive, expire }`.
- Default theme has a soft tick, **off by default**. No music.
- Autoplay rules apply. Enabled only after a first gesture. Blocked means silent, with a diagnostic.
- `motion: 'off'` does not mute. Separate `sound: 'on'|'off'`.
- Last 5 seconds: pitch or tempo change, not just louder. Screen reader announces 30/10/0. Bar color shifts.
- Timer uses `performance.now()` deltas. No drift. Pauses on `visibilitychange` if `pauseWhenHidden`. `stayButHide` gets a "show timer" control.
- Global and per-question timers pause together.

### 10.7 Toolbar

Replace the half-finished `toolbar` with a declarative one.

```ts
toolbar: {
  position: 'bottom',
  pinned: ['prev', 'next', 'reveal', 'font-plus', 'font-minus'],
  overflow: ['hint', 'media', 'next-round', 'language', 'end'],
  labels: 'auto',
  hideOnIdle: true,
}
```

- Actions register like question types: `defineAction({ id, label, icon, shortcut, run, when })`.
- `when` decides visibility and enabled state per screen and mode. `reveal` is disabled in restricted mode.
- Pinning is editable in settings and remembered per quiz.
- Overflow collapses to "⋯". Next/prev never disappear, even on a phone.
- Keyboard help is generated from the registry.
- Mobile: safe-area insets. 44px targets.

### 10.8 Content variants (later, cheap)

`Variant => short` on a question plus `variants: ['short']` in config. A quick version of a long quiz without a second file. Wait until after 3.0. It is a filter once the plan pipeline exists.

---

## 11. Media, loading, offline

### 11.1 Sources

Every source returns the same `RawQuiz` (path → text or parsed JSON). One pipeline after that.

```ts
type QuizSource =
  | { type: "inline"; data: EmbeddedQuizV3 }
  | { type: "text"; files: Array<{ name: string; text: string }> }
  | { type: "upload"; files: FileList | File[] }
  | { type: "url"; manifest?: string; files?: string[]; baseUrl?: string }
  | { type: "custom"; load: () => Promise<RawQuiz> };
```

- No sync XHR. No `HEAD` probing. Discovery is a manifest, an explicit list, or one index file.
- `file://`: fetch is limited. Upload, drag-drop and inline are the supported paths. The load screen detects `file:` and says so instead of failing mysteriously.
- Drag a folder (`webkitdirectory`) or files. Read in parallel with `File.text()`.
- File System Access API for "open folder" with remembered permission. Progressive. Never required.
- Above `workerThreshold` (250 questions or 1 MB), parse in a Worker. The parser is pure, so it moves without drama.

### 11.2 Manifest

```json
{
  "version": 3,
  "title": "The Big Music Quiz",
  "syntax": 3,
  "languages": ["en", "nl"],
  "files": [
    { "path": "questions.en.trivia", "language": "en" },
    { "path": "questions.nl.trivia", "language": "nl" }
  ],
  "media": { "base": "media/", "thumbnails": "media/thumb/" },
  "theme": "themes/vinyl/theme.css",
  "scripts": ["scripts/eq-widget.js"],
  "build": { "date": "2026-03-01", "hash": "sha256-..." }
}
```

- No manifest? Fall back to V2 discovery (`questions-0.txt`, `.language.txt`) with a deprecation warning.
- The manifest is what makes offline packs, caching and language selection reliable.

### 11.3 Media

- Lazy load with `IntersectionObserver`. Only the current question's media is in the DOM.
- Preload the next question's first image or audio at idle.
- Responsive images if the manifest gives `srcset`. Otherwise document the convention (`name-640.jpg`, `name-1280.jpg`).
- Audio/video: `<track>` captions, poster, `preload="metadata"`, `playsinline`, no autoplay with sound.
- Missing file: styled placeholder ("Media not found: crowd.jpg") with retry and a diagnostic. Never a broken icon.
- External iframes blocked by default. Allowlist required. YouTube → `youtube-nocookie.com`.
- Object URLs tracked and revoked on navigation and destroy.
- Offline pack: `pq-trivia pack` writes a folder with the quiz text inline, the IIFE, both themes, a manifest and a service worker. Media is not copied yet; an absolute URL still needs a network.
- Optional service worker (`pq-trivia/pwa`) with versioned caches and an update prompt. It does not work on `file://`. The folder still does.

### 11.4 Cache

- IndexedDB for media and plans, keyed by content hash. LRU, default 200 MB. Evict on quota errors.
- Plan cache invalidated by manifest hash + seed + config hash.
- No storage (private mode)? Memory only.

---

## 12. Exports

### 12.1 Embedded JSON v3

```json
{
  "$schema": "https://pq-trivia.dev/schema/v3/quiz.json",
  "schemaVersion": 3,
  "meta": { "title": "...", "languages": ["en"], "created": "2026-03-01" },
  "config": { "seed": "music-night" },
  "rounds": [
    {
      "id": "round-1",
      "name": "Warm-up",
      "secret": "Colors",
      "questions": ["q1", "q2"]
    }
  ],
  "questions": {
    "q1": {
      "type": "choice",
      "text": "Which superhero is called the Man of Steel?",
      "answers": [{ "id": "a1", "text": "Superman" }],
      "correct": ["a1"],
      "score": 1,
      "language": "en"
    }
  }
}
```

- Answer IDs come from content. Text is stored raw; formatting parses at load, or ships precompiled as an inline AST. Export both, with `format: 'text' | 'ast'`.
- `compact` drops defaults. `readable` is pretty-printed for diffs. Both parse to the same plan.
- Settings UI downloads `.json`. Clipboard is secondary, with a clear error when unavailable.
- JSON Schema in `schema/v3/quiz.json`. Validated on load. Unknown fields kept under `extra`, so nothing is lost.

### 12.2 Formats

| Format              | Use                                 | Version |
| ------------------- | ----------------------------------- | ------- |
| Embedded JSON v3    | builtin, offline packs, other tools | 3.0     |
| Standalone HTML     | one file to email or host           | 3.0     |
| Print HTML / PDF    | questions, answers, explanations    | 3.0     |
| Answer sheet / form | classrooms                          | 3.0     |
| Grade report        | results, CSV/JSON                   | 3.0     |
| Offline pack        | USB stick                           | 3.0     |
| Moodle GIFT         | teacher platforms                   | 3.1     |
| QTI 2.1             | Canvas, Moodle, Blackboard          | 3.1     |
| Generic CSV         | spreadsheets, Kahoot/Quizlet import | 3.1     |
| `.trivia` formatter | authoring, diffs, migration         | 3.0     |
| Anki apkg           | plugin                              | later   |

Rules: pure functions. Never mutate the plan. Header with source, version, seed, date. Round-trip where the format allows.

### 12.3 Your store workflow

- `pq-trivia build ./my-quiz --out ./dist --formats html,offline,pdf` → customer-ready folder.
- `--brand` adds store name, logo, footer. No license keys. No DRM.
- Manifest plus hashed media makes updates reproducible.
- Existing store layout keeps working. V2 quizzes load with a migration warning.

---

## 13. Errors, accessibility, i18n

### 13.1 Errors

Now: red boxes top-left, permanent, duplicated. Console for everything else. Fix:

- Centered stack at the top, safe-area padding, max 40rem. `role="status"` for warnings, `role="alert"` for errors.
- Auto-dismiss after 8s (info) or 12s (error). Visible progress bar. Pause on hover or focus. "Must fix" errors stay.
- Dedupe by code + message. Repeats get "×3" instead of a stack.
- Max 3 visible. Rest behind "Show all (7)".
- Each one: icon, short human sentence, location (`questions-2.trivia:14`), suggestion, "Copy details", docs link.
- No silence. Recoverable problems warn. Only truly harmless things are debug-only.
- `?pq-debug` shows diagnostics, plan summary, timings, version. Off in production.
- Renderer crash → friendly fallback with reload and copy-details. Not a white page.
- API: `quiz.diagnostics()`, `quiz.on('diagnostic')`, `pq-trivia validate` (exit 1 on errors, `--strict` on warnings).

### 13.2 Accessibility

Target WCAG 2.2 AA on the default theme.

- Landmarks, one `<h1>` per screen, lists for answers, tables for results, `<button>` for actions.
- Keyboard: everything reachable, logical order, no traps, `Escape` closes overlays. Single-letter shortcuts off while typing.
- Focus: to the heading after navigation, back after overlays, `:focus-visible`.
- Live regions: question changes, timer milestones, grades, errors.
- Media: `alt` required in strict mode, captions and transcripts supported, no autoplay with sound.
- Contrast ≥ 4.5:1 text, ≥ 3:1 UI. Never color alone. High-contrast theme. Dark mode.
- Reduced motion honored. No flashing. Timers can be paused or hidden.
- 200% zoom. No horizontal scroll at 320px. `rem` sizing.
- Plain language. One action per screen. No time pressure unless the author asked for it.
- Screen reader pass on: load, start, play, input, reveal, results, settings.
- Automated checks: optional. §15 explains why.

### 13.3 i18n

- Typed keys. Named interpolation (`{count}`, `{total}`). `Intl.PluralRules`. No string concatenation for grammar.
- Locale files are JSON.
- `bun run i18n:check` fails on missing keys, extra keys, placeholder mismatches, untranslated copies.
- Language picker uses native names (`Nederlands`, `English`), not codes.
- Content language and UI language are separate. Content falls back to UI.
- Dates and numbers via `Intl`.
- Docs list every key with context. `docs/contributing/translations.md` explains the PR flow.

---

## 14. Tooling

### 14.1 Bun does everything

| Job                    | Command                          | Dependency                          |
| ---------------------- | -------------------------------- | ----------------------------------- |
| Run TypeScript         | `bun src/...`                    | none                                |
| Type check             | `bun check`                      | none (built in since 1.4.3)         |
| Lint                   | `bun lint`                       | none (built in)                     |
| Format                 | `bun fmt`                        | none (built in since 1.4.4)         |
| Test                   | `bun test`                       | none                                |
| Bundle                 | `bun build`                      | none                                |
| Docs                   | `vitepress`                      | VitePress (allowed)                 |
| Renderer               | `preact`                         | Preact (allowed)                    |
| Multiplayer            | `trystero`                       | optional peer                       |
| `.d.ts`                | `bunx tsc --emitDeclarationOnly` | release only, not in `package.json` |
| Bun globals in scripts | `tsconfig.scripts.json`          | `@types/bun` (dev only)             |

No Biome. No ESLint. No Prettier. No dependency-cruiser. No ts-node. No bundler config file. One `bunfig.toml` and one `tsconfig.json`.

**Dependencies, total:** `preact` (runtime), `trystero` (optional peer), `vitepress` (dev). That is the whole list. If a PR adds a fourth, the answer is no.

**Layer check without dependency-cruiser:** `scripts/check-layers.ts`, ~40 lines, runs with `bun run layers`. Reads imports with a regex, compares against the layer table, exits 1 with a path list. Plus `tsconfig.core.json` with `lib: ["ES2022"]` so DOM use in core cannot compile. Two small guards beat one config file and a dependency.

### 14.2 tsconfig, as strict as it goes

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedSideEffectImports": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": false,
    "target": "ES2022",
    "module": "preserve",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": [],
  },
}
```

- `types: []` — no accidental globals. `tsconfig.scripts.json` adds `"types": ["bun"]` for `scripts/` and `cli/`. `@types/bun` is listed in `devDependencies`.
- Enums are welcome. Bun transpiles them fine. No setting that bans them.
- `skipLibCheck: false` is the strict setting. If a third-party `.d.ts` breaks, that is information, not noise.
- `tsconfig.core.json` extends this with `"lib": ["ES2022"]` and `"include": ["src/core/**/*"]`. Core that touches the DOM does not compile. Best architecture rule we own.
- `noUncheckedIndexedAccess` will make array code noisy. Good. That noise is where defects #8 and #15 live.

### 14.3 Scripts

```jsonc
{
  "scripts": {
    "check": "bun check",
    "lint": "bun lint",
    "fmt": "bun fmt",
    "layers": "bun run scripts/check-layers.ts",
    "build": "bun run scripts/build.ts",
    "test": "bun test",
    "size": "bun run scripts/size.ts",
    "i18n:check": "bun run scripts/i18n-check.ts",
    "check:content": "bun run cli/index.ts validate examples/quick-start-template/template/quiz.trivia test/fixtures/simple.trivia test/fixtures/all-types.trivia test/fixtures/v2-real.trivia --strict",
    "dev": "bun run scripts/build.ts --watch",
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "release": "bun run scripts/release.ts",
  },
}
```

`build` uses `bun build` with `--splitting` for ESM entries, an IIFE pass for the standalone files, and CSS copied as-is. `scripts/build.ts` is our own code, about 150 lines. It reads `src/entries/`, so adding an entry is a file, not a config edit.

### 14.4 Old versions

- `dist/v1-final/` and `dist/v2/` stay exactly as they are. Add `dist/README.md` explaining which file to grab.
- V3 goes to `dist/v3/`.
- Docs get a version switcher. V2 frozen.
- Tag `v2.5.0` before the rewrite starts.
- `template/` points at `dist/v3/pq-trivia.min.js` and ships a copy, so quick start works without a build. Release checklist refreshes that copy. (It is the one duplicate copy we tolerate, because `file://` users need it.)

### 14.5 CI

One job. Cheap. Runs on push and PR.

1. `bun install --frozen-lockfile`
2. `bun check`
3. `bun lint`
4. `bun test`
5. `bun build`
6. `bun run size`

That is it. No browser install, no coverage upload, no matrix of six Node versions. Add `windows-latest` and `ubuntu-latest` only, because file paths break there first.

**Release** on tag `v*`:

1. Tag matches `package.json`.
2. `bun check && bun lint && bun test && bun build && bun run size`.
3. `bunx tsc --emitDeclarationOnly` for types.
4. GitHub Release with artifacts, checksums and changelog.
5. `npm publish --provenance --access public`.
6. Docs deploy.

**Version watch:** if `package.json` version changed on `main`, open a "Release vX.Y.Z" PR. That covers the todo about auto-tagging on version bumps.

### 14.6 Repo polish

- README: one-line pitch, 20-second start, animated GIF, feature table, screenshots, sizes, badges, docs link, store link.
- Badges: CI, npm, bundle size, license.
- Examples live on GitHub Pages: barebones, themed, educational, pub-style, multilingual, multiplayer.
- Templates: `barebones`, `themed`, `educational`, `print-only`.
- Files: `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, issue templates (with a quiz-file field), PR template, `.editorconfig`.
- Branching: `main` stable, short branches, docs previews.

---

## 15. Testing (small on purpose)

Your laptop is 15 years old and has opinions. The suite must stay cheap.

### 15.1 What gets tested

`bun test`. Core only. No DOM. No browser.

| What                 | Why it earns its place                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Parser fixtures      | One file per syntax feature, plus the full attribute table. Catches regressions in the thing users type.                |
| Formatter round-trip | `parse(format(x))` equals `parse(x)`. Protects the wizard and the CLI.                                                  |
| Grading tables       | Every type × normalization option. This is where wrong answers get marked wrong. Fixed inputs, fixed outputs, no clock. |
| Plan and constraints | Shuffle determinism, `PlaceBefore/After/At`, 1,000 random seeds. Cheap and fast.                                        |
| JSON round-trip      | Embedded export → import → same plan.                                                                                   |

Rules:

- Whole suite under **10 seconds** on your machine. If it is slower, the test is wrong, not the machine.
- No coverage threshold. Coverage gates reward tests that exist to raise a number.
- No snapshot of entire HTML pages. Those break on every CSS tweak.
- One fixture per bug fix. Not more.

### 15.2 What is explicitly optional

Both of these are in use now. The rest stays optional.

- **happy-dom** builds a real DOM in `bun test`. `test/ui/dom.ts` copies the globals, one window per suite. It costs about a second for the whole renderer suite.
- **axe-core** runs on the start and question screens in `test/ui/screens.test.ts`. Colour contrast is off, because happy-dom does not lay anything out. Everything else is checked.
- **Playwright** for end-to-end. Run by hand before a release: load → play → reveal → grade → results. Stretch.
- Visual snapshots. Skip. Look at the page.
- Lighthouse. Skip. Check sizes with `bun run size`.
- Benchmarks. One script (`bun run bench`), run when something feels slow. Not in CI.

### 15.3 Manual checks per phase

A short list. Do it once, with a coffee.

- Parse the real sold quiz. Play it. Print it.
- Keyboard only: Tab, arrows, Enter, Escape.
- 200% zoom and a 320px window.
- `file://` load from the template folder.
- Two quizzes on one page, then `destroy()` both. Memory should not climb.

### 15.4 Fixtures

- `simple`: 5 questions, one round, image and audio.
- `all-types`: every type, masks, media in answers, hints, explanations.
- `multilang`: en/nl/de, one gap and one count mismatch.
- `broken`: duplicate IDs, unknown attributes, bad booleans, missing answers.
- `v2-real`: a real quiz you sell, with expected text.

### 15.5 Rules of the road

- No test without a failure it would catch.
- Prefer a fixture over a mock.
- Prefer a pure function over a harness. If it needs a DOM to test, it probably belongs in the renderer.
- Every PR that changes parsing, grading or rendering adds one fixture.

---

## 16. Docs

### 16.1 Structure (VitePress)

```
docs/
  index.md
  getting-started/   install · quick-start · project-structure · migrating-from-v2
  syntax/            overview · questions · answers-and-types · media · sections
                     · formatting · layouts · localization · scripts · flow
                     · reference (generated)
  guides/            themes · animations · interactive · printing · offline
                     · multiplayer · exporting · embedding · accessibility
  api/               create-quiz · events · session · plugins · types (generated)
  recipes/           pub-quiz-night · classroom-test · projector-setup
                     · custom-question-type · build-a-quiz-with-the-wizard
  contributing/      setup · architecture · translations · releasing
```

- Code blocks in docs are typechecked in CI. Examples cannot rot.
- Syntax reference generated from `attributes.ts`. Same source as the wizard forms. Three consumers, one truth.
- Version switcher. V2 frozen.
- Local search. Dark mode. "Edit on GitHub" links.

### 16.2 Community

- Translations via JSON + a status table + PR template. Credit translators.
- A gallery, starting with The Wayward Melody.
- Discussions for questions, issues for bugs.
- A short authoring guide PDF for teachers, generated from docs.
- Changelog in plain language, split into "for authors" and "for developers".

---

## 17. Migration

### 17.1 Promises

- **V2 syntax parses unchanged.** Same questions, answers, scores, types and order (except the new default order, below).
- **V2 embedded JSON loads** through `migrateV2()`, with a warning.
- **`new Quiz(params)`** works via `pq-trivia/compat/v2` and `window.Quiz`.
- **Old theme objects** convert. Old CSS variable names stay as aliases.
- **`dist/v2` stays downloadable** and documented.

### 17.2 Intentional breaking changes

| Change                                            | Why                                     | What you do                                                             |
| ------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| Default order keeps author order                  | Shuffling by default surprises everyone | Toggle "Shuffle questions" in Settings, or set `shuffleQuestions: true` |
| Raw HTML off by default                           | Security                                | `allowHtml: true`, or use the syntax                                    |
| `ScoreMethod` free text no longer implies scoring | It never did                            | Use `Scoring => partial`                                                |
| `FormatText` / `HiddenAtPlay` need real booleans  | `"false"` was truthy                    | Write `false`                                                           |
| Theme URLs resolve from base, not page URL        | The old one was broken                  | None, unless your assets were oddly placed                              |
| Toolbar no longer mutates config                  | Bug                                     | None                                                                    |
| `document.body` is never wiped                    | Bug                                     | None                                                                    |
| Export no longer re-randomizes                    | Bug                                     | None                                                                    |
| `rtf` upload removed                              | Never worked                            | Convert to `.txt`                                                       |
| `AnswersOrder => keep` canonical is `keep         | shuffle`                                | Clarity                                                                 | Formatter rewrites |

### 17.3 Migration tool

- `pq-trivia migrate questions/ --write`: canonical names, real booleans, document header, split mixed-language files, `.bak` per file.
- `pq-trivia migrate --check`: CI-safe diff, exit 1 if work is needed.
- `docs/getting-started/migrating-from-v2.md`: before/after, step by step.

---

## 18. Phases

Sizes are for one focused developer. Not deadlines.

Phases 0–8 are shipped. The specification above describes what exists; this
list starts at what is left.

What is left for a person, not for CI: mount/destroy 100× in a real browser,
the three-browser offline and manual accessibility passes, two real devices
over Trystero on a real network, a look at the lobby on a phone, and publishing
the release itself.

### Phase 9 — QuizWizard (stretch, M–L, after 3.0)

**Only after Phases 0–8 have landed in real use.** The plan makes it cheap.
It is still a product.

- `editor` entry + separate bundle. Build flag, default off.
- Slide list, generated forms, text pane, preview.
- Add, remove, reorder, duplicate.
- Parse-on-blur and serialize-on-edit. One buffer.
- Basic edits to questions can be done through this wizard/UI. For example (the UI should do much more than these few examples):
  - Click part of the slide/question and type what text should be there instead ("edit a textbox")
  - Add/remove multiple choice answers, change the correct answer
  - Add/remove media in place
  - The "Trivia Syntax" edit box is per-slide too, so you can (for example) design the overall quiz structure with the UI/automatically, but then update a few individual slides by hand through changing the Trivia Syntax for it.
- Undo/redo over text snapshots.
- Media picker, save/download, open folder.
- Keyboard reorder. Labels. No drag-only.
- Docs recipe: "build a quiz with the wizard".

**Done when:** you can write a full quiz without opening Notepad. The output is a normal `.trivia` file that plays in the default build. The wizard's bundle never appears in a normal build.

### Phase 10 — Ideas, made concrete (M–L, after 3.0)

The old ideas list, with one owner-sized task per line. Pick one, ship it end to
end, tick it. Nothing here is promised for 3.0.

**Where a new question type lands:** §5 syntax, `src/core/model/question.ts`,
`src/core/model/validate.ts`, `src/core/grading/grading.ts`,
`src/core/session/viewModel.ts`, `src/renderers/preact/components/Answers.tsx`,
`src/themes/paper.*.css`, `test/core/grading.test.ts`, and one new file in
`test/fixtures/`.

**Question types**

- [ ] **Ranking (S).** New `Type => Rank`. `Answers` are written in the correct order. Click-to-place UI with arrow-key support. Score is the fraction of adjacent pairs in order. Tests: full, partial, empty, duplicate item.
- [ ] **Estimate (S).** `Type => Estimate` with `Answer => 42`, `Tolerance => 2`, `Unit => km`. Slider plus a number field. Correct when the value is inside the tolerance. Tests at the edges.
- [ ] **Negation (S).** `Negate => true` on a Choice question. Grading marks the one wrong option correct. Add `negated` to the answer view model so the UI can say "Pick the false one".
- [ ] **Odd one out (S).** Choice plus a required reason. Two score parts: the pick, then the reason graded like an open answer.
- [ ] **Hotspot (M).** `Media => map.png` plus `Answer => 120,80` regions. Click layer over the image, keyboard fallback as a region list, distance check in grading. Needs an authoring helper to read coordinates.
- [ ] **Matrix (M).** Rows of statements against one shared scale. `Rows =>` block. One score per row, partial credit, checkbox and radio variants.
- [ ] **Multi-part (M).** One stem, several inputs, one total. `Parts =>` with a type and points per part. Reuse the existing grading parts rather than inventing a second scorer.
- [ ] **Classification (M).** Items dropped into named buckets. Click-to-place first, drag later. Score per item.
- [ ] **Audio and video clips (S).** No new type: give `Media` a `PlayLimit` and controls. Count plays in the attempt.
- [ ] **Wager (M).** `Wager => true`. Bet 0 to max before the reveal, store it in the session, show risk on the report.
- [ ] **Diagram labels (M).** Drag labels onto targets. Shares the Hotspot click layer, so build Hotspot first.
- [ ] **Buzzer (L).** First correct answer wins. Needs the live-room transport. Do not fake it with timers.

**Answer interfaces**

- [ ] **Click on image (M).** Pairs with Hotspot. Include a visible list of regions for keyboard and screen readers.
- [ ] **Slider (S).** Drag, arrow keys and a live value. Reuse the Range field's parser.
- [ ] **Drag and drop (M).** Sort and Match work by click today. Add drag, keep the click path, and test both.
- [ ] **Number pad (S).** Large keys for phones. Sits next to Range and Estimate inputs.
- [ ] **Autocomplete (S).** Suggest from `Aliases` or a `Suggest =>` list. Forgive spelling without accepting nonsense.
- [ ] **"No idea" button (S).** Records a deliberate blank, keeps it out of the wrong count, shows it in the report.
- [ ] **Confidence (M).** Low, medium, high per response. Store it, export it in CSV, leave scoring alone for now.
- [ ] **Per-option feedback (S).** `Feedback =>` under an answer, shown after the reveal. One line per option.
- [ ] **Speech input (M).** Optional Web Speech adapter in `platform/`. Say plainly which browsers support it; the field still works by typing.

**Play and host**

- [ ] **Team mode (M).** Team name before Start, responses per team, a scoreboard between rounds. Keep solo mode the default.
- [ ] **Host view (M).** Two windows on one machine via `BroadcastChannel` first, then the live rooms for real devices. The host sees answers; the player view never does.
- [ ] **Streaks and multipliers (S).** Three in a row, cap at 2×. Report shows the multiplier. Tests for the cap.
- [ ] **Lifelines (M).** 50/50, extra time, ask the room. Each costs points. Restricted mode disables them.
- [ ] **Round timer (S).** A timer for the whole round, not one question. Reuses `timers.ts`.
- [ ] **Presenter notes (S).** `Notes =>` on a question. Host-only, never in the view model or print.
- [ ] **Undo answer (S).** One step back, written to the attempt journal.
- [ ] **Leaderboard (M).** Show it between rounds, never during a question.
- [ ] **Spectator mode (M).** Watch without answering. Same transport as the host view.

**Authoring**

- [ ] **Question pools (M).** `Pool => 10` per round, seeded selection, and the report says which questions were drawn.
- [ ] **Variants (L).** One template with placeholders, different values per play. Print the chosen values so a handout matches the screen.
- [ ] **Difficulty tags (M).** Tag questions, then balance a round by score instead of trusting vibes.
- [ ] **Scoring presets (S).** Negative marking, all-or-nothing, partial. One enum in config, no new maths.
- [ ] **Translations (M).** Per question, not per file. Falls back to the file language.
- [ ] **CSV and Markdown import (M).** Teachers already have spreadsheets. One importer, diagnostics per row.
- [ ] **Near-duplicate detector (S).** Same answer with different wording. Part of `check:content`, warning only.
- [ ] **Media in packs (S).** `pack` copies local media next to the HTML instead of leaving a path that needs a network.

**Technical and distribution**

- [ ] **Service worker update prompt (S).** The pack has a cache; add "new version, reload".
- [ ] **Transcripts and captions (S).** Audio rounds without captions exclude people. Plain text under the player.
- [ ] **Screen-reader timer announcements (S).** 30, 10 and 0 seconds, once each.
- [ ] **Share by seed (S).** A URL carries the seed and order, never answers.
- [ ] **Signed packs (M).** Hash plus signature, so a downloaded quiz is the one you shipped.
- [ ] **Attempt analytics export (M).** Per-question stats across a class, as CSV.
- [ ] **Plugin API (L).** Register a question type from outside core. Only after two new types prove the seams.

**Order I would pick:** the S items in Question types and Answer interfaces first (a week of small wins), then Hotspot and Matrix, then team mode and host view once live rooms are in daily use.

### Dependencies

```
0 ─▶ 1 ─▶ 2 ─▶ 3 ─▶ 4 ─▶ 5 ─▶ 6 ─▶ 8
                  └────────▶ 7        (after 3)
                                    8 ─▶ 9   (stretch)
```

Phase 10 can start any time after Phase 5. Its items do not depend on 8 or 9.

### Phase 11: Publish

- [ ] `npm publish --provenance --access public`.
- [ ] Tag `3.0.0`, push the tag, check the GitHub Release.
- [ ] Deploy the docs and the examples to GitHub Pages.
- [ ] GIF and screenshots in the README. A gallery, starting with The Wayward Melody.
- [ ] Announcement. Store update. `v2.5.0` archive stays frozen.

---

## 19. Todo traceability

| #   | Todo                                                    | Spec       | Phase       |
| --- | ------------------------------------------------------- | ---------- | ----------- |
| T1  | Bun build into `dist`, archive old versions, call it V3 | §14.1–14.4 | 0           |
| T2  | Preact vs Svelte vs Web Components                      | §4.1       | 0, 2        |
| T3  | CSS classes per question                                | §5.3, §5.8 | 4           |
| T4  | Default layouts                                         | §7.3       | 4           |
| T5  | Full background color per question                      | §5.8       | 4           |
| T6  | Default to no backgrounds on print                      | §5.3, §7.6 | 4           |
| T7  | Inline `[class]` / `[style]`                            | §5.5       | 4           |
| T8  | Turn off default output, plain nodes                    | §6.4       | 2           |
| T9  | `onQuestionLoad` with full info                         | §6.4       | 2           |
| T10 | Default display is just a callback                      | §6.4       | 2           |
| T11 | Clean public API, signals                               | §6         | 2           |
| T12 | Modular pure functions, no side effects                 | §4.2       | 1           |
| T13 | Import only what you need                               | §4.4       | 1–2         |
| T14 | Stay fast with many questions and media                 | §11.3      | 6           |
| T15 | Big animation library, no bundle bloat                  | §7.5       | 4           |
| T16 | A few animations by default                             | §7.5       | 4           |
| T17 | Animations in syntax, theme and API                     | §5.3, §7.5 | 4           |
| T18 | Better default look                                     | §7.4       | 2           |
| T19 | Errors centered, auto-fade                              | §13.1      | 2           |
| T20 | No duplicate errors                                     | §13.1      | 2           |
| T21 | More visible problem messages                           | §13.1      | 1–2         |
| T22 | Distinct section pages                                  | §7.4       | 2           |
| T23 | Interactive play, grade, results                        | §8         | 3           |
| T24 | Nice error when continuing empty                        | §8.2       | 3           |
| T25 | Compare real and given answers, optional                | §8.5       | 3           |
| T26 | Multiplayer via Trystero, optional                      | §9         | 7           |
| T27 | Timer tick sound                                        | §10.6      | 4           |
| T28 | Toolbar pinning via config                              | §10.7      | 4           |
| T29 | Code display, optional highlighter                      | §10.4      | 4           |
| T30 | Executable JS in questions                              | §5.10      | 4           |
| T31 | `Start` / `End` types                                   | §5.7       | 4           |
| T32 | `Match` type                                            | §5.7       | 4           |
| T33 | Unlockable rounds                                       | §5.9       | 4 (or 3.2)  |
| T34 | GitHub page: badges, images, examples                   | §14.6, §16 | 8           |
| T35 | CI/CD tagging and release                               | §14.5      | 0, 5–8      |
| T36 | Docs split by topic                                     | §16.1      | 5–8         |
| T37 | Test `PlaceBefore/After/At`                             | §15.1      | 1           |
| T38 | Test toolbar buttons                                    | §15.3      | 2           |
| T39 | Test manual `Language`                                  | §15.1      | 1–2         |
| T40 | Icons, banner, styling                                  | §7.4       | 2           |
| T41 | _(Discarded)_ language switch before load               | §1.3       | —           |
| T42 | _(Discarded)_ background music                          | §1.3       | —           |
| T43 | **QuizWizard: build and edit a quiz in the UI** (new)   | §10.5      | 9 (stretch) |

---

## 20. Extra findings

Not in `todo.md`. Ordered by value per unit of pain.

### 20.1 Authoring

1. **Manifest** (§11.2). No probing. Explicit languages, media, scripts. Unlocks offline packs and caching. Cheap.
2. **Includes and banks** (§10.1). Reuse sets. Sell shared banks. Build a library. Made for your store.
3. **`Explanation`**. The single most requested educational feature. Shown on reveal and in results.
4. **Aliases and tolerant grading**. Kills "but that was correct" complaints.
5. **Real partial credit**. Makes list, sort, match and cloze usable for tests.
6. **`Cloze`**. Natural extension of `[blank]`. Cheap because the blank node exists.
7. **Content lint**. Duplicate IDs, missing alt, broken media, dead rounds. The difference between a hobby and a 500-question bank.
8. **Search and jump**. Practical at 50 questions. Essential at 500.
9. **Print profiles**. A4/Letter, answer lines, cut marks. Your audience prints things.
10. **Stable IDs**. Needed for storage, translations, cross-references and multiplayer. Currently a gamble.

### 20.2 Developer experience

11. **A real package**. The library cannot be installed today. This one item unlocks wrappers, CDN and TypeScript users.
12. **Headless plus events**. React/Vue wrappers, Discord bots, CLI graders, custom projectors.
13. **Plugin types**. The community adds hotspot and diagrams without touching core.
14. **CLI**. Validation in CI, formatting, offline builds, migration, grading. And `bun build --compile` binaries for people who fear terminals.
15. **`?pq-debug`**. Diagnostics, plan, timings. Bug reports become useful.
16. **JSON Schema**. Autocomplete in editors.
17. **VS Code support**. `.trivia` grammar and snippets. Low effort, high polish.
18. **Templates per use case**. Barebones, themed, educational, print-only.

### 20.3 Correctness and privacy

19. **XSS-safe rendering**. The biggest hidden risk in a system built on "anyone can send questions".
20. **Sandboxed scripts**. The executable-content feature must not become `eval`.
21. **Iframe privacy**. Block third parties by default. YouTube → nocookie. Document what leaves the machine.
22. **No stray network calls**. A quiz should work with the network tab empty.
23. **Storage honesty**. Say when progress is not saved.
24. **Answer exposure**. Keep answers out of the DOM in restricted mode. Offer encryption, with honest limits.

### 20.4 Accessibility

25. **Keyboard-first play**. Hosts use clickers. Edge-click navigation is an accident waiting to happen.
26. **Screen readers**. Live regions, labels, focus. Currently absent.
27. **Captions and transcripts**. Required for educational use.
28. **Reduced motion, high contrast, large print**.
29. **RTL and logical CSS**. Opens more languages.
30. **Dyslexia-friendly theme**. More spacing, better font. A theme, not a rewrite.

### 20.5 Distribution

31. **npm, CDN, standalone file**. Three paths, three audiences.
32. **Maps, banner, checksums**.
33. **Automated releases**. Version bump → tag → release → npm → docs.
34. **Deployed examples**. The best ad for a quiz library is a playable quiz.
35. **Docs versioning and migration guide**.
36. **Translation workflow**.
37. **Store build script**. `pq-trivia build --brand` for reproducible customer packages.

### 20.6 Not doing

- **A backend for core play.** Breaks offline. Adds ops. No.
- **DRM on sold quizzes.** Complex, ineffective, annoying to buyers. The value is the content and the updates.
- **Framework wrappers before the headless API is stable.** Ship core and the custom element. Wrappers are thin afterwards.
- **Rewriting everything at once.** Phases keep a working V2 in `dist/v2` and a usable build at every step.
- **A second linter, a second formatter, a second build tool.** Bun has all three. Use them.

---

## 21. Risks

| Risk                                | Impact              | Mitigation                                                                                          |
| ----------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------- |
| Scope creep                         | V3 never ships      | Phase gates. 3.0 = parity + architecture + theme + interactive. Everything else is a minor version. |
| Preact ages badly                   | Renderer rewrite    | Headless contract. Only one folder depends on it.                                                   |
| Animations bloat the bundle         | Breaks "lean"       | Separate entry, dynamic import, size script.                                                        |
| Multiplayer becomes its own project | Delays launch       | After 3.0. Separate package.                                                                        |
| XSS from submitted questions        | Reputation          | AST rendering. No raw HTML by default. Sanitizer.                                                   |
| Print fidelity differs per browser  | Pub workflow breaks | Print model, dedicated CSS, manual check in three browsers.                                         |
| `file://` limits                    | "It's broken"       | Detect it. Explain it. Offer upload, inline and offline pack.                                       |
| Translation capacity                | UI stuck in en/nl   | Typed keys, JSON files, English fallback, credit.                                                   |
| Migration breaks sold quizzes       | Angry customers     | Real-quiz fixture, migration CLI, v2 archive, staged deprecations.                                  |
| Public API churn                    | Developer trust     | Freeze types before docs. Deprecation policy.                                                       |
| Solo maintainer burnout             | Nothing ships       | Phases sized part-time. The wizard is a stretch, not a promise.                                     |

---

## 22. Decisions (locked)

All settled. Nothing left open for 3.0.

| #   | Decision          | Choice                                                           |
| --- | ----------------- | ---------------------------------------------------------------- |
| 1   | Renderer          | Preact + light-DOM `<pq-quiz>`. Shadow DOM opt-in only.          |
| 2   | Default order     | Author order. Shuffle is opt-in, and obvious in Settings (§7.7). |
| 3   | Extension         | `.trivia` canonical. `.txt` and `.md` accepted forever.          |
| 4   | Multiplayer       | Not in 3.0. Ships as `pq-trivia/multiplayer` in 3.1+.            |
| 5   | LMS exports       | GIFT + CSV first (3.0/3.1). QTI in 3.1.                          |
| 6   | Encrypted answers | Optional, off by default. Documented limits.                     |
| 7   | Docs hosting      | VitePress on GitHub Pages.                                       |
| 8   | Package name      | `pq-trivia`, unscoped.                                           |
| 9   | `window.Quiz`     | Stays in the IIFE build. `PQTrivia.createQuiz` is the future.    |
| 10  | Theme name        | "Paper".                                                         |
| 11  | Timer sound       | Off by default. Opt-in per theme.                                |
| 12  | Store builds      | `--strict`. Warnings fail the build.                             |
| 13  | Wizard            | Same repo, `editor` entry, separate bundle. Phase 9.             |

**On #2, be loud about it.** Author order is the default. Someone who wants chaos gets it in two clicks: Settings → Order → **Shuffle questions** / **Shuffle rounds**, plus a seed field and a **New seed** button. See §7.7. No config file, no hidden switch, no surprise reshuffle between sessions.

---

## 23. Definition of Done for 3.0

- [ ] `bun install && bun run check && bun run build` green on Windows, macOS, Linux.
- [x] `dist/v3` has core, headless, player, IIFE and animations, with maps, banners and budgets met.
- [ ] Every V2 fixture, including a real sold quiz, plays through compat. Differences documented.
- [x] Core ≤ 24 KB gzip. Player ≤ 52 KB. Full ≤ 55 KB. IIFE ≤ 60 KB.
- [x] Theme folders: `.trivia-theme` settings, fonts, randomized backgrounds, per-folder uploads, one-file bundle.
- [ ] Public API documented and typed. Every event, selector, exporter and hook has an example.
- [x] Syntax reference complete and generated from `attributes.ts`.
- [x] Interactive mode grades every built-in type. Results, review, resume, print.
- [ ] Default theme passes a manual WCAG AA pass on every screen.
- [ ] Errors dedupe, auto-dismiss, announce, and are available via API.
- [x] No `innerHTML` from untrusted content. Raw HTML and scripts opt-in and sandboxed.
- [ ] `destroy()` leaves nothing behind. 100× mount/destroy, no growth.
- [ ] Print gives clean pages and answer sheets in Chrome, Firefox and Safari.
- [ ] Offline pack plays from `file://` with no network. PWA works when hosted.
- [x] CLI validates, formats, migrates, builds, packs, encrypts and grades.
- [ ] Docs live and versioned. V2 archive and migration guide.
- [ ] Release automation: tag → GitHub Release → npm → docs.
- [ ] README has badges, GIF, screenshots, feature table and a 5-minute start.
- [ ] Every todo T1–T42 is shipped or explicitly deferred with a version. T43 is documented as a stretch goal.

---

## 24. First commit

```
chore: set up bun toolchain and make the source buildable

- add package.json, strict tsconfig, tsconfig.core, bunfig
- fix the dead lib/pq-trivia imports and the theme cycle
- drop rtf uploads, fix the json upload crash
- add the layer check script
- refresh the template bundle, add dist/README
- add simple and real-quiz fixtures plus one parse test
```

Then freeze the AST and the question model. Every later feature sits on those types.

And if the whole thing starts to feel enormous: remember that V2 already ships, already works, and is already in `dist/v2`. This is an upgrade, not a rescue mission.
