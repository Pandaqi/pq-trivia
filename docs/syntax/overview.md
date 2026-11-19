# Syntax

A quiz is text. `Key => Value` lines, blank lines between blocks, `#` for
rounds. That is the whole grammar.

## Header

```txt
Title => The Big Music Quiz
Author => Pandaqi
Language => en
Seed => vinyl-night
Syntax => 3
```

The header is everything before the first question.

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
  a `### Answers` block.
- `Correct` marks the right answers. For lists and sorts, order matters.
- `Explanation` shows on the reveal and in results.

## Rounds

```txt
# Warm-up

Question => ...
```

`# Name` starts a round. `Section => Warm-up` moves one question into a round
without starting a new one there.

## `##` shorthand

Like Markdown headings, and just as optional:

```txt
## Which band wrote "Bohemian Rhapsody"?
Answers => Queen
```

`##` opens a question block with the question text. Every other key works as
usual.

## `### Key` blocks

For a long list, put the key in a heading and one value per line:

```txt
## Put these in order
Type => Sort
### Answers
The wheel
The printing press
The internet
### Media
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

| Type | You write | They do |
| --- | --- | --- |
| `Open` | one answer | type it |
| `Choice` | several answers | pick one |
| `List` | several answers | list them |
| `Sort` | answers in order | reorder |
| `Match` | `left ~ right` | connect them |
| `Range` | one number, `Range => 2` | type a number within the margin |
| `Cloze` | `[blank]` in the text | fill the blanks |
| `Section` | a round heading | turns the page |
| `Start` / `End` | a slide | bookends |

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

The [reference](/syntax/reference) is generated from `attributeRegistry.ts`.
Same source as the docs and the tooling, so it cannot drift.
