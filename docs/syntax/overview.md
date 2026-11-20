# Syntax

A quiz is text. `Key => Value` lines, blank lines between blocks, and a heading
ladder: `#` for the quiz, `##` for rounds, `###` for questions. That is the whole
grammar.

## Header

```txt
# The Big Music Quiz

Author => Pandaqi
Language => en
Seed => vinyl-night
Syntax => 3
```

`# Title` names the quiz. `Title => ...` does the same. The header is everything
above the first block.

Any global setting can live here too: `MediaFormats => jpg | png`,
`ShuffleQuestions => true`, `FilterSections => Round two`. `Title` (or `Quiz`),
`Seed`, `Language`, `Languages` and `Theme` keep their own rows. The reference
lists every header attribute, its config key, and the few settings that only
exist in code. Code still wins: pass the same key to `new Quiz({ ... })` and the
file's value is overridden.

Anything written after a round or question starts belongs to that block, not to
the header.

## A question

```txt
Question => Which superhero is called the Man of Steel?
Answers => Superman | Batman | Spider-Man
Type => Choice
Correct => Superman
Points => 2
Explanation => Clark Kent, mild-mannered reporter.
```

- `Question` is the title. A second `Question` line is body text.
- `Answers` is a list. One answer is open, many is choice, unless `Type` says
  otherwise. Write it as `a | b | c`, one value per line after `Answers =>`, or
  a `#### Answers` block.
- `Correct` marks the right answers. For lists and sorts, order matters.
- `Explanation` shows on the reveal and in results.

## Rounds

```txt
## Warm-up

Question => ...
```

`## Name` starts a round. `# Name` is the quiz title, never a round.
`Section => Warm-up` moves one question into a round without starting a new one
there. All of it is optional: questions before the first `##` go into a round
called `General`.

## `###` shorthand

Like Markdown headings, and just as optional:

```txt
### Which band wrote "Bohemian Rhapsody"?
Answers => Queen
```

`###` opens a question block with the question text. Every other key works as
usual.

## `#### Key` blocks

For a long list, put the key in a heading and one value per line:

```txt
### Put these in order
Type => Sort
#### Answers
The wheel
The printing press
The internet
#### Media
poster.png
photo.jpg
Correct => The wheel | The printing press | The internet
```

The block ends at the next `Key => Value` line or the next heading. It is a
third way to fill a list, next to `a | b` and one value per line after
`Answers =>`. Use whichever reads best; they mean the same thing.

Blank lines inside a block are fine. Values are taken verbatim, so a `|` in a
line is not a separator there.

## Types

| Type            | You write                | They do                         |
| --------------- | ------------------------ | ------------------------------- |
| `Open`          | one answer               | type it                         |
| `Choice`        | several answers          | pick one                        |
| `List`          | several answers          | list them                       |
| `Sort`          | answers in order         | reorder                         |
| `Match`         | `left ~ right`           | connect them                    |
| `Range`         | one number, `Range => 2` | type a number within the margin |
| `Cloze`         | `[blank]` in the text    | fill the blanks                 |
| `Section`       | a round heading          | turns the page                  |
| `Start` / `End` | a slide                  | bookends                        |

## Inline formatting

```txt
Question => **Bold**, *italic*, `code`, [link](https://example.com)
Answers => ![A small photo](photo.jpg) | Second choice
```

Formatting is parsed to an AST and rendered as nodes. No raw HTML by default.
Answers use the same formatter, so emphasis, links and images work there too.

Lead an answer with `!` and it is an answer-only line; an image `![alt](src)`
is left alone.

## Media

```txt
Media => crowd.jpg { alt="A packed hall", credit="Jane Doe" }
Media => intro.mp3
```

An answer that is just a file (image, audio, video) is shown as that media,
like V2 did:

```txt
Answers => photo.jpg | intro.mp3 | A text answer
```

Images lazy-load. Audio and video never autoplay with sound. `alt` is checked
in strict mode.

## Steps

A question can arrive in parts:

```txt
### Which year is this clip from?
Media => intro.mp4
Answers => 1969 | 1972 | 1975
Steps => media | question | answers
```

- Step one shows the video. Step two brings in the question. Step three brings in
  the answers.
- A part stays. Step three still shows the video.
- Parts: `media`, `question`, `answers`, `comments`, `hints`, `sources`,
  `explanation`.
- `all` means everything that is left: `Steps => media | all`.
- A part you do not name joins the last step, so the screen always ends complete.
- No `Steps`? Everything appears at once, exactly like before.

Put an animation between two parts to say how the next one comes in:

```txt
Steps => media | fade | question | slide-up | answers
```

The name stays in force until another one changes it, so one `fade` at the front
covers the rest. These are the same names `Transition` takes: `fade`,
`slide-up`, `slide-left`, `slide-right`, `zoom-in`, `zoom-out`, `flip-x`,
`wipe`, `blur-in`, `shake`, `pulse`, `none`.

One list for the whole quiz lives in the header:

```txt
DefaultSteps => media | question | answers
DefaultStepTransition => fade
```

A question's own `Steps` wins over `DefaultSteps`.

To move on: the **Next step** button, the next-question key, or a video that
finishes playing. Revealing the answer shows everything at once, so nobody waits
through three clicks.

## Masks

```txt
?Question only
!answer only
$keep as written
```

`?` and `!` switch a block between the question view and the answer view. `$`
keeps the line exactly as typed.

## Language

```txt
Language => NL
ID => north-sea-flood
SyncAll => true
Translation => other-id
```

`Language` marks which translation a block belongs to. Blocks with the same
`ID` are the same question in different languages. Without an `ID`, questions
line up by position inside their round. `SyncAll` copies properties the
question left alone from the root language. See the languages guide.

## Sources

```txt
Sources => https://example.com/study | The 1989 book, chapter 4
```

Shown as small print under the question. Not on the start screen, where they
would spoil a quiz.

## Time

```txt
Timer => 1:30
```

Ninety seconds on this question. `defaultTimer` in the config gives every
question without a `Timer` one; a question with `Timer => 0` has none.

When time runs out the question is marked expired and answers stay open. There
is no automatic skip yet.

## Flow

```txt
When => score >= 12
Unlock => round-two
Continue => onCorrect
```

- `When` hides a block until the expression is true. It understands
  `score >= 12`, `correct(question-id)`, `wrong(question-id)`,
  `answered(question-id)`, `round = "round-id"`, and `and`, `or`, `not`.
- `Unlock` waits for a round ID.
- `Continue` takes `always`, `onCorrect` or `onWrong`.

No `eval`, no `Function`. A bad expression keeps the question and leaves a
diagnostic.

## Sources, widgets and hiding

```txt
HiddenAtPlay => true
Script => widgets/map.html
Height => 30em
```

`Script` widgets are sandboxed and only run when the host sets
`allowScripts: true`. `HiddenAtPlay` keeps a block out of the plan without
deleting it.

## Comments

```txt
// This line is not shown.
```

## Includes

```txt
Include => banks/music.trivia
```

Includes are a CLI preprocessor. The browser never fetches a surprise file.

## Every attribute

The [reference](reference.html) is generated from `attributeRegistry.ts`.
Same source as the docs and the tooling, so it cannot drift.
