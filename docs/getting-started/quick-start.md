# Five-minute quiz

One file. Five questions. Then play it.

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

# Music

Question => Which band wrote "Bohemian Rhapsody"?
Answers => Queen
```

`Answers` without `Type` is an open question. Two or more answers means choice.
The parser is forgiving; it will tell you what it did not understand.

## 2. Make the page

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Friday Night</title>
    <link rel="stylesheet" href="dist/v3/themes/paper.css" />
    <script type="module" src="dist/v3/player.js"></script>
  </head>
  <body>
    <pq-quiz src="my-quiz.trivia" seed="friday"></pq-quiz>
  </body>
</html>
```

Serve the folder. `file://` blocks `fetch`, so the text has to come from a
server or be inlined.

```bash
bun run preview
```

## 3. Play

Arrow keys move. `r` reveals. `h` shows a hint. Tab reaches every input.

## 4. Print it

`Ctrl+P` prints the whole quiz, not just the current slide. Pick a profile on
the results screen for an answer sheet or a grade table.

## 5. Ship it offline

```bash
bun run cli/index.ts pack my-quiz.trivia
```

`dist/pack/my-quiz/index.html` opens from a folder, Wi-Fi or not.

## Next

- [Syntax reference](/syntax/reference) for every attribute.
- [Themes](/guides/themes) to change the look.
- [Multiplayer](/guides/multiplayer) to bring phones into it.
