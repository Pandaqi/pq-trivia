# Builds

The normal build carries every language in `src/i18n/locales/`.

```bash
bun run build
```

Most hosts need one language. A filtered build leaves the others out of the
bundle: no strings, no code, no dead weight.

```bash
bun run build --languages <code>
bun run build --languages <code>,<code>
bun run build --languages none
```

- `--languages <code>` puts only that language's interface strings in `dist/v3`.
- `--languages <code>,<code>` puts several in. Order does not matter.
- `--languages none` (or `--no-languages`) ships no strings. The player still
  works. Every label shows its key (`next`, `play`, `settings`) until the host
  fills them with `translations`.

Filtered builds write the same files as a normal build. Run the one you want
last. `bun run size` measures what is actually in `dist/v3`.

## The wizard bundle

The QuizWizard has its own entry and its own flag.

```bash
bun run build --editor
```

That writes `dist/v3/editor.js` beside everything else, with its own size
budget. Every other build leaves it out and removes an old copy, so a player
folder never carries an authoring tool it does not use.

## Add a language

One file in `src/i18n/locales/`, named after its code.

```ts
// src/i18n/locales/de.ts
import type { TranslationTable } from "../types";

export const de: TranslationTable = { next: "Weiter" };
```

Then add it to `src/i18n/locales/index.ts` and the `*Locales.ts` registries in
`src/i18n/`. The index file is for the default build and for type checking. A
filtered build gets a generated registry with only the languages you asked for.

Copy the keys from any complete language file. Missing keys are not filled in
from another language; the host sees the key and knows what to translate. That
is on purpose. Every language is equal, not a fallback.

## Content versus interface

Filtering changes the **interface** language. Quiz content still comes from the
`.trivia` files. A filtered build still plays a quiz written in any language;
the buttons use the build's language, the questions are whatever the file says.
