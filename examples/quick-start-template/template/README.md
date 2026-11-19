# Quick start template

Two files, no build step, no server:

- `index.html` — the quiz sits inside the page, so it opens from a folder.
- `pq-trivia.min.js` — the whole framework: player, styles, print layout.

Open `index.html` in a browser. That is the whole install.

## Edit the quiz

Change the text inside `<script id="quiz-text" type="text/plain">`, or edit
`quiz.trivia` and paste it in. The [syntax reference](../../../docs/syntax/overview.md)
has every attribute.

## Add a theme

`themes/forest/` is a complete theme:

```
themes/forest/
  theme.trivia-theme   settings: fonts, backgrounds, tokens
  style.css            the rest of the look
  *.woff2              font files
  *.svg                background images
```

`theme.html` loads it:

```html
<pq-quiz src="quiz.trivia" theme="themes/forest/" theme-upload></pq-quiz>
```

That page needs a server, because browsers block `fetch` on `file://`:

```bash
bun run preview
# then open /examples/quick-start-template/template/theme.html
```

`theme-upload` adds "Load a theme folder" on the start screen. Pick any folder
with a `theme.trivia-theme` in it; nothing is uploaded anywhere.

## Print

`Ctrl+P` prints the whole quiz: cover, rounds, one question per page, answer
sheets and grade tables. The print styles are inside the bundle too.
