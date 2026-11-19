# Themes

The default theme is Paper. One stylesheet, tokens at the top, no components
to fight.

## Load it

```html
<link rel="stylesheet" href="themes/paper.css" />
<link rel="stylesheet" href="themes/print.css" media="print" />
```

## Override tokens

```css
:root {
  --pq-accent: #1c6b72;
  --pq-paper: #f6f1e4;
  --pq-font-heading: "Cormorant Garamond", serif;
}
```

Nothing else needs to change. Layout, spacing and print follow the tokens.

| Token | Job |
| --- | --- |
| `--pq-ink`, `--pq-muted` | text |
| `--pq-paper`, `--pq-slide` | background and card |
| `--pq-accent`, `--pq-honey`, `--pq-fern` | emphasis |
| `--pq-font-heading`, `--pq-font-body` | type |
| `--pq-r-sm` … `--pq-r-lg` | corners |
| `--pq-space` | page rhythm |

## Per-question styling

```txt
Question => ...
Class => loud wide
Style => --pq-accent: #a9556b
Background => #2f2a33
```

`Class` adds a class to the slide. Names without `pq-` get that prefix.

## Extra themes

`high-contrast.css` and `large-print.css` load after Paper and override it.

## Print

`print.css` builds the pages: cover, round pages, one question per page, answer
forms, grade tables, flash cards. The player prints the whole quiz on `Ctrl+P`.
