# Coding style

How the agent writes code here. `AGENTS.md` links this file, so it applies to
every change.

## Start from V2

Read `src/v2/` before writing new code. That is the house style: small modules,
plain functions, names that say what they do, comments that explain why.

Match it, except where there is a clear better way. "Better" means fewer lines,
less state, or a shorter path from input to output. Not cleverness for its own
sake.

## Hard limits

- **Three levels of nesting, maximum.** Four means extract a function and give
  it a name. 
  - No nested ternaries or if statements with more than 3 parts.
  - Don't write loops within loops unless absolutely necessary.
- **No magic numbers.** No magic numbers (use named `const`s), no hardcoded strings (use Enums), no `type = "a" | "b"` (use Enums), no hacky workarounds when a more declarative/verbose style would make the code much more intuitive.
- **500 lines per file, maximum.** One file, one job.
- **12 entries per folder, maximum.** Files and folders count the same. That is
  what keeps a folder readable in one screen.

Files and folders are checked by `bun run lint`. Nesting is checked by the
person reading the diff, which is you.

The check has no allowlist. If a file grows past 500 lines, split it: the parser,
shapes and public door of the inline formatter are three files for exactly this
reason, and the question model builds in `questionBuilder.ts`. Adding an entry
to the lint allowlist is not a fix.

## Shape over branches

Prefer a table or a function call to a long `if`/`else` chain or a `switch`.

```ts
// No.
switch (screen.kind) {
  case ScreenKind.Start: return h(StartScreen, props);
  case ScreenKind.Question: return h(QuestionScreen, props);
  case ScreenKind.End: return h(EndScreen, props);
}

// Yes.
const SCREENS = {
  [ScreenKind.Start]: StartScreen,
  [ScreenKind.Question]: QuestionScreen,
  [ScreenKind.End]: EndScreen,
};
return h(SCREENS[screen.kind], props);
```

A short `switch` that returns a value per case is fine. The rule is about
volume, not syntax.

## Guard Clauses

Use guard clauses to exit functions as early as possible.

```ts
// No
function login()
{
  if(isUsernameValid()) { 
    doStuff(); 
  } else {
    doOtherSuff()
  }
}

// Yes
function login()
{
  if(!isUserNameValid()) { doStuff(); return; }
  doOtherStuff();
}


```

## Braces

Wanted style:

```ts
export function someFunction(): number
{
  return 1;
}
```

**Status: blocked by the formatter.** `bun fmt` has no brace-style option (checked
`bun fmt --help --all`) and rewrites the brace onto the same line. Until Bun
ships that option, the formatter wins and code stays `function x() {`.

Do not hand-format against `bun fmt`. A style that the formatter undoes on the
next run is worse than one we do not have yet. When the option exists, turn it
on in `bunfig.toml` and this rule becomes real.

## House rules

- Enum values over magic strings.
- `readonly` on things that do not change.
- No `any`, no `@ts-ignore` (lint).
- No DOM outside `renderers/` and `platform/`. Core compiles with `lib: ["ES2022"]`.
- Comments explain why. The code already explains what.
- One documentation home. `ROADMAP.md` or `docs/`.
