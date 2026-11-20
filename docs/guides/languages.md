# Languages

V2's localization is back, including switching while people are playing.

Two things are translated, and they are separate:

- **Questions**: `Language`, `Translation` and `SyncAll` in the quiz file.
- **Interface**: every label, button and status line, in the languages your
  build carries, with your own strings on top.

## One file per language

Name the files so the language is in the name:

```txt
questions.en.trivia
questions.nl.trivia
```

That is the whole contract. The last part before the extension is the language
code. Both files must have the same rounds in the same order, and their
questions must line up. V2 matched by order; V3 does the same, and it keeps
answers when you switch.

```ts
await quiz.load({
  type: "files",
  files: [
    { name: "questions.en.trivia", text: english },
    { name: "questions.nl.trivia", text: dutch },
  ],
});
quiz.languages(); // ["EN", "NL"]
quiz.setLanguage("NL");
```

`<pq-quiz filenames="questions.en.trivia,questions.nl.trivia">` does the same
without JavaScript. So does the V2 naming pattern:
`<pq-quiz filename="questions" file-extensions="trivia">` loads
`questions-0.trivia`, `questions-1.trivia`, and so on.

## Two languages in one file

Give both questions the same `ID` and a different `Language`:

```txt
Question => When did the North Sea Flood happen?
ID => north-sea-flood
Language => EN
Answers => 1953

Question => Wanneer was de watersnoodramp?
ID => north-sea-flood
Language => NL
Answers => 1953
```

The `ID` is the link. The order does not have to match when IDs do. If you leave
the IDs out, questions are linked by their position inside their round, exactly
like V2's file method.

`Translation => some-id` is an explicit pointer for the rare case where the ID
itself is translated.

## Choosing the language

```ts
const quiz = createQuiz({
  config: {
    languageDefault: "NL",
    languages: ["NL", "EN"],
  },
});
```

- `languageDefault` is the root: the language shown first, and the one
  translations copy properties from.
- `languages` is a shortlist. Leave it out and every language found in the
  files is available.
- `quiz.languages()` lists what actually loaded.
- `quiz.setLanguage("EN")` switches the whole quiz. `L` does the same from the
  keyboard, and the start screen shows a picker when there is more than one.

Answers, revealed answers, hints and the current question survive the switch.
Question IDs are shared, so saved attempts work too.

## Sharing properties between translations

```ts
createQuiz({ config: { syncPropertiesWithTranslations: true } });
```

A translation keeps its own text, answers and hints. Everything it leaves at the
default (score, timer, media, layout, background, colour scheme, classes,
grading, placement, flow) is copied from the root language. `SyncAll => true`
asks for the same for one question even when the global option is off;
`SyncAll => false` opts one question out.

## The interface

The default build carries every language file in `src/i18n/locales/`. Pick the language with
`languageDefault` or switch with `setLanguage`; the interface follows. Build
with `--languages` to ship only the ones you need, including none. See
[builds](builds.md).

Override any string:

```ts
createQuiz({
  config: {
    languageDefault: "NL",
    translations: {
      nl: {
        next: "Verder",
        startKicker: "Quizavond",
      },
    },
  },
});
```

A missing key shows the key itself. No language silently fills in for another.
Hosts can read one string directly:

```ts
quiz.t("next"); // "Volgende"
quiz.t("pointsLabel", { points: 2, unit: quiz.t("point_other") });
```

### Keys worth knowing

| Key                             | Default                        | Translation                             |
| ------------------------------- | ------------------------------ | --------------------------------------- |
| `next` / `previous`             | Next / Previous                | Volgende / Vorige                       |
| `play`                          | Play the questions!            | Speel de quiz!                          |
| `settings`                      | Settings                       | Instellingen                            |
| `results`                       | Results                        | Resultaten                              |
| `correct` / `wrong` / `skipped` | Correct / Wrong / Skipped      | Juist / Fout / Overgeslagen             |
| `questionOf`                    | Question {index} of {total}    | Vraag {index} van {total}               |
| `roundNumber`                   | Round {number}                 | Ronde {number}                          |
| `theme`                         | Theme: {theme}                 | Thema: {theme}                          |
| `timeUp`                        | Time is up. Answers stay open. | De tijd is om. Antwoorden blijven open. |
| `resumeTitle`                   | You have an unfinished attempt | Je hebt een onafgemaakte poging         |
| `bandExcellent`                 | Excellent                      | Uitstekend                              |
| `lockedTitle`                   | Locked quiz                    | Beveiligde quiz                         |

The full table is in `src/i18n/dictionary.ts`. Keys are stable; hosts may use
them in `translations`.

## What is translated and what is not

Question text, answers, hints, sources and explanations are content. They come
from the file in the language you wrote; V3 never machine-translates them.
Only the interface, the generated secret question and validation messages have
dictionaries.
