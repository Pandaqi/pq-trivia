# Syntax

A quiz is a text file. `Key => Value` lines, a blank line between blocks, and a
heading ladder:

```txt
# The quiz title
## A round
### A question
#### A long key block
```

That is the whole grammar. Everything below is optional.

## The header

```txt
# The Big Music Quiz
Author => Pandaqi
Language => en
Seed => vinyl-night
Syntax => 3
```

`# Title` names the quiz. `Title => ...` does the same. The header is everything
above the first block.

Any global setting also works here: `MediaFormats => jpg | png`,
`ShuffleQuestions => true`, `FilterSections => Round two`. The
[reference](reference.html) lists every header spelling and its config key.

Code wins over the file. Pass the same key to `new Quiz({ ... })` and your value
is used.

## A question

```txt
Question => Which superhero is called the Man of Steel?
Answers => Superman | Batman | Spider-Man
Type => Choice
Correct => Superman
Points => 2
Explanation => Clark Kent, mild-mannered reporter.
```

- `Question` is the title. A `#### Question` block under it adds body text.
- `Answers` is a list. One answer means open, several mean choice, unless `Type`
  says otherwise.
- `Correct` marks the right ones. For list and sort, order matters.
- `Explanation` shows on the reveal and in the results.

A list can be written three ways, all equivalent:

```txt
Answers => a | b | c
```

```txt
Answers =>
a
b
c
```

```txt
#### Answers
a
b
c
```

Use whichever reads best. Inside a `####` block, a `|` is just a character.

## Rounds

```txt
## Warm-up

Question => ...
```

`## Name` starts a round. Questions before the first round go into a round
called `General`. `Section => Warm-up` puts one question in a round without
starting a new one there.

One `#` means "start of the quiz". A second `#` is a second quiz, and one file
holds one quiz. The parser keeps the first title and warns about the second.

## `###` shorthand

```txt
### Which band wrote "Bohemian Rhapsody"?
Answers => Queen
```

`###` opens a question with its text on the same line. Every other key works as
usual.

## Types

Pick one with `Type =>`. Without it, one answer is open and several are choice.

| Type             | You write                                | They do                                  |
| ---------------- | ---------------------------------------- | ---------------------------------------- |
| `Open`           | one answer                               | type it                                  |
| `Choice`         | several answers                          | pick one                                 |
| `List`           | several answers                          | type them, any order                     |
| `Range`          | one number                               | type a number                            |
| `Estimate`       | one number, `Tolerance => 500`           | guess, close counts                      |
| `Sort`           | answers in the right order               | reorder all of them                      |
| `Rank`           | answers in the right order               | reorder, points per neighbouring pair    |
| `Match`          | `left ~ right`                           | connect the pairs                        |
| `Cloze`          | `[blank]` in the text                    | fill the blanks                          |
| `Matrix`         | `Rows` plus a scale in `Answers`         | answer every row                         |
| `Parts`          | `Parts => open: Name: 2`                 | fill in each part                        |
| `Classification` | `Buckets` and `Correct => item @ bucket` | sort items into buckets                  |
| `Diagram`        | `Targets` and `Correct => label @ target`| place labels on an image                 |
| `Hotspot`        | one point per answer, `Answers => 30,40` | click the image                          |
| `OddOneOut`      | several answers, the odd one in `Correct`| pick it, then say why                    |
| `Section`        | a round heading                          | turn the page                            |
| `Start` / `End`  | a slide                                  | bookend the quiz                         |

### Numbers

`Range` is the simple one: a number, with an error margin.

```txt
Question => In which year did the Berlin Wall fall?
Answers => 1989
Type => Range
Range => 0
```

`Range => 2` accepts 1987 to 1991. `Type => Range` is implied by `Range`.

For a guess with a wider margin, use `Estimate`. `Tolerance` is the margin.
`Unit` is printed next to the number and never graded.

```txt
Question => How far away is the moon?
Answers => 384400
Type => Estimate
Tolerance => 500
Unit => km
```

Add `Slider => 380000..390000` for a slider. Add `Suggest => 1969 | 1968` to
offer autocomplete suggestions while they type.

### Choice extras

`Negate => true` flips the choice: `Correct` lists the true statements, and the
player picks the one that is false. Good for "which one is not a planet".

```txt
Question => Which one is not a planet?
Answers => Mars | Venus | Pluto
Type => Choice
Correct => Mars | Venus
Negate => true
```

`Feedback` takes one line per answer and shows it after the reveal.

```txt
Answers => Mars | Venus | Pluto
Correct => Pluto
Feedback => A rocky neighbour. | Also rocky. | Not a planet any more.
```

### Matrix

`Rows` is one statement per line. `Answers` is the scale. `Multiple => true`
allows more than one tick per row.

```txt
Question => Mark each claim.
Answers => True | False
Rows => The sky is blue | Water is dry
Correct => True | False
Type => Matrix
```

No `Answers` means the scale is `True | False`.

### Parts

Each part gets its own input and its own share of the points. The format is
`kind: label: weight`, and `||` separates the answers. Kinds are `open` and
`number`.

```txt
Question => Name the band and the singer.
Type => Parts
Parts => open: Band: 2 | open: Singer: 1
Answers => The Beatles || Paul McCartney
```

### Classification

`Buckets` names the groups. `Correct` says where every answer goes.

```txt
Question => Put these in the right bucket.
Type => Classification
Answers => Apple | Carrot
Buckets => Fruit | Vegetable
Correct => Apple @ Fruit | Carrot @ Vegetable
```

### Hotspot and diagram

Both work on an image. A point is `label @ x,y`, in percent of the image.

`Hotspot` has one answer point per spot. `HitRadius` says how close a click must
land; the default is 8.

```txt
Question => Where is the lighthouse?
Media => map.png { alt="A coastline map" }
Answers => 30,40
Type => Hotspot
HitRadius => 6
```

`Diagram` places named labels on named targets.

```txt
Question => Label the parts.
Media => door.png { alt="A diagram of a door" }
Type => Diagram
Answers => Handle | Hinge
Targets => Handle spot @ 30,50 | Hinge spot @ 70,50
Correct => Handle @ Handle spot | Hinge @ Hinge spot
```

### Odd one out

`Correct` holds the odd answer. A second accepted answer is the reason, so the
pick and the reason each score half.

```txt
Question => Which one is not a planet?
Answers => Mars | Venus | Pluto
Type => OddOneOut
Correct => Pluto
AlsoAccept => pluto is a dwarf planet
```

## Media

```txt
Media => crowd.jpg { alt="A packed hall", credit="Jane Doe" }
Media => intro.mp3 { captions="intro.en.vtt", transcript="intro.txt" }
```

An answer that is only a file is shown as that media, like V2 did:

```txt
Answers => photo.jpg | intro.mp3 | A text answer
```

Images lazy-load. Audio and video never autoplay with sound. Give every image
`alt` text; that is what a screen reader says. `captions` adds a WebVTT track,
`transcript` adds plain text under the player.

`PlayLimit => 1` lets a clip play once per question.

A parser cannot see the disk. Run `validate <path> --assets` and it checks every
local path, including answer media, posters, captions and transcripts. It also
reports images without `alt`.

Media paths resolve against the page, not the quiz file. Keep the page next to
the quiz, or set `Url` when the files live somewhere else.

## Inline formatting

```txt
Question => **Bold**, *italic*, `code`, [link](https://example.com)
Answers => ![A small photo](photo.jpg) | Second choice
```

Formatting becomes nodes, not HTML. Raw HTML is off by default.

An answer that starts with `!` is an answer-only line. An image
`![alt](src)` is left alone.

## Steps

Show a question in parts:

```txt
### Which year is this clip from?
Media => intro.mp4
Answers => 1969 | 1972 | 1975
Steps => media | question | answers
```

- Step one shows the video. Step two brings the question. Step three brings the
  answers.
- A part stays. Step three still shows the video.
- Parts: `media`, `question`, `answers`, `comments`, `hints`, `sources`,
  `explanation`.
- `all` means everything that is left: `Steps => media | all`.
- A part you do not name joins the last step, so the screen always ends complete.

Put an animation between two parts to say how the next one arrives:

```txt
Steps => media | fade | question | slide-up | answers
```

The name stays in force until another one changes it. These are the same names
`Transition` takes: `fade`, `slide-up`, `slide-left`, `slide-right`, `zoom-in`,
`zoom-out`, `flip-x`, `wipe`, `blur-in`, `shake`, `pulse`, `none`.

One list for the whole quiz lives in the header:

```txt
DefaultSteps => media | question | answers
DefaultStepTransition => fade
```

A question's own `Steps` wins.

To move on: the **Next step** button, the next-question key, or a video that
finishes. Revealing the answer shows everything at once.

## Masks

```txt
?Question only
!answer only
$keep as written
```

`?` and `!` switch a block between the question view and the answer view. `$`
keeps the line exactly as typed.

## Time

```txt
Timer => 1:30
RoundTimer => 10m
QuizLimit => 45m
```

`Timer` is one question. `defaultTimer` in the config covers questions without
one; `Timer => 0` means no timer. `RoundTimer` puts one clock on a round.
`QuizLimit` puts one on the whole quiz, and counts up when there is none.

When time runs out the question is marked expired and answers stay open.

## Languages

```txt
Language => NL
ID => north-sea-flood
SyncAll => true
Translation => other-id
```

`Language` marks which translation a block belongs to. Blocks with the same `ID`
are the same question in different languages. Without an `ID`, questions line up
by position inside their round. `SyncAll` copies properties the question left
alone from the root language.

One file per language: `questions.en.trivia`, `questions.nl.trivia`. The last
part before the extension is the language code.

See [languages](../guides/languages.html).

## Sources

```txt
Sources => https://example.com/study | The 1989 book, chapter 4
```

Small print under the question. Off on the start screen, where it would spoil a
quiz. Turn it on with `ShowSources => true`.

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

## Widgets

```txt
Script => widgets/map.html
Height => 30em
PrintFallback => Look at the map in the original quiz.
```

Sandboxed. They only run when the host sets `allowScripts: true`.
`PrintFallback` is what paper says when the widget cannot print.

## Including files

```txt
Include => banks/music.trivia
```

Includes are a CLI preprocessor. The browser never fetches a surprise file.

## Pools and difficulty

```txt
## Round three

Type => Section
Question => Round three
Pool => 10

Question => Who wrote Hey Jude?
Answers => Paul McCartney
Difficulty => 2
```

`Pool => 10` draws ten of the round's questions. Seeded, so the same seed draws
the same ten, and the report says which ones. `BalanceDifficulty => true`
spreads the draw across `Difficulty` tags instead of taking whatever the shuffle
gives. Difficulty runs 1 to 5, or `easy`, `medium`, `hard`.

## Variants

One line per slot. `{1}` and `{2}` in the text take the value picked for that
slot, so the same question comes back differently each play.

```txt
Question => In {1}, who sang {2}?
Answers => Paul McCartney | Paul Simon
Variants => 1969 | 1970
Variants => Hey Jude | Let It Be
```

Picked from the seed. On screen and on paper it is the same value, because the
print sheet reads the plan.

## Host notes and teams

```txt
Notes => Ask the B-side first. Someone always knows it.
```

`Notes` are for the host. They never reach the player view model and never get
printed.

```txt
Streaks => true
ScoringPreset => negative
NegativeMarking => 0.25
Lifelines => 50/50 | extra-time | ask-room
Teams => The Regulars | Quizzy McQuizface
Wager => true
Buzzer => true
```

- `Streaks` pays 1.5x from three right in a row and 2x from six.
- `ScoringPreset => negative` costs a slice of the question for a wrong answer.
- A lifeline costs points, and restricted mode turns them off.
- `Teams` keeps each team's own answers. Solo is still the default.
- `Wager` lets a player bet points before the reveal.
- `Buzzer` is for the live room: first correct answer wins.

## Hiding and ordering

```txt
HiddenAtPlay => true
HiddenAtExport => true
PlaceAt => 2
AnswersOrder => shuffle
MediaOrder => keep
```

`HiddenAtPlay` keeps a block out of the plan without deleting it.
`HiddenAtExport` leaves it out of exports. `PlaceAt`, `PlaceBefore` and
`PlaceAfter` fix the order. `AnswersOrder` and `MediaOrder` take `keep` or
`shuffle`.

## Comments

```txt
// This line is not shown.
```

## Every attribute

The [reference](reference.html) is generated from
`src/core/syntax/attributeRegistry.ts`, the same table the parser and the wizard
use. If it is not there, it does not exist.
