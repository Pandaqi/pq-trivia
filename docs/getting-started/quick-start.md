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
The parser is forgiving; it tells you what it did not understand.

## 2. Make the page

Get `pq-trivia.min.js` from the [latest
release](https://github.com/Pandaqi/pq-trivia/releases/latest/download/pq-trivia.min.js),
or from `dist/v3/` after `bun run build`. Put it next to your page. Put the quiz
text in the page and point one script tag at the bundle.

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

## 3. Play

Arrow keys move. `r` reveals. `h` shows a hint. Tab reaches every input.

The whole key list is in [accessibility](../guides/accessibility.html).

## 4. Print it

`Ctrl+P` prints the whole quiz, not just the current slide. On the results
screen, pick a profile for an answer sheet, an answer form or a grade table.

## 5. Keep it in a folder

A quiz in its own `.trivia` file works, but `file://` blocks `fetch`. Serve the
folder:

```bash
bun run preview
```

```html
<link rel="stylesheet" href="themes/paper.css" />
<script type="module" src="player.js"></script>
<pq-quiz src="my-quiz.trivia" seed="friday"></pq-quiz>
```

A build writes those files to `dist/v3/`. Copy `player.js` and `themes/` beside
your page and the paths above hold.

For a USB stick or a phone, build an offline pack:

```bash
bun run cli/index.ts pack my-quiz.trivia
```

See [offline](../guides/offline.html).

## Next

- [Syntax reference](../syntax/reference.html) for every attribute.
- [Themes](../guides/themes.html) to change the look.
- [Languages](../guides/languages.html) to write the quiz twice.
- [Multiplayer](../guides/multiplayer.html) to bring phones into it.
