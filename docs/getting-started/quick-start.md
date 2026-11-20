# Five-minute quiz

Two files. No server. Open it from a folder and play.

## 1. Make the quiz file

Save this as `my-quiz.trivia`:

```txt
Title => Friday Night
Author => Your Name
Seed => friday

Question => Which superhero is called the Man of Steel?
Answers => Superman | Batman | Spider-Man
Type => Choice
Correct => Superman
Explanation => Clark Kent, mild-mannered reporter.

Question => In which year did the Berlin Wall fall?
Answers => 1989
Type => Range

## Music

Question => Which band wrote "Bohemian Rhapsody"?
Answers => Queen
```

`Answers` without `Type` is an open question. Two or more answers means choice.
The parser is forgiving; it will tell you what it did not understand.

## 2. Make the page

Copy `dist/v3/pq-trivia.min.js` next to your page. Put the quiz text in the page
and point one script tag at the bundle. Styles and the print sheet are inside
that bundle.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Friday Night</title>
  </head>
  <body>
    <script id="quiz-text" type="text/plain">
      Title => Friday Night
      Question => Which superhero is called the Man of Steel?
      Answers => Superman | Batman | Spider-Man
    </script>
    <script src="pq-trivia.min.js"></script>
  </body>
</html>
```

Double-click `index.html`. That is it: no server, no separate CSS, no build.

A quiz in its own `.trivia` file still works, but `file://` blocks `fetch`, so
that needs a server:

```html
<pq-quiz src="my-quiz.trivia" seed="friday"></pq-quiz>
<link rel="stylesheet" href="dist/v3/themes/paper.css" />
<script type="module" src="dist/v3/player.js"></script>
```

```bash
bun run preview
```

## 3. Play

Arrow keys move. `r` reveals. `h` shows a hint. Tab reaches every input.

## 4. Print it

`Ctrl+P` prints the whole quiz, not just the current slide. Pick a profile on
the results screen for an answer sheet or a grade table.

## 5. Ship it offline

The page already works offline. `Ctrl+P` prints the whole quiz, and
`bun run cli/index.ts pack my-quiz.trivia` builds a folder with a service
worker for a phone or a USB stick.

## Next

- [Syntax reference](../syntax/reference.html) for every attribute.
- [Themes](../guides/themes.html) to change the look.
- [Multiplayer](../guides/multiplayer.html) to bring phones into it.
