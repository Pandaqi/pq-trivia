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
  otherwise.
- `Correct` marks the right answers. For lists and sorts, order matters.
- `Explanation` shows on the reveal and in results.

## Rounds

```txt
# Warm-up

Question => ...
```

`# Name` starts a round. `Section => Warm-up` moves one question into a round
without starting a new one there.

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
```

Formatting is parsed to an AST and rendered as nodes. No raw HTML by default.

## Media

```txt
Media => crowd.jpg { alt="A packed hall", credit="Jane Doe" }
Media => intro.mp3
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
