# Themes

A theme is a folder, like V2:

```txt
themes/forest/
  theme.trivia-theme   settings, in plain text
  style.css            the look
  Lora-Regular.woff2   fonts
  bg-dots.svg          background images
```

No JavaScript config, no build step. Point a quiz at the folder and the folder
brings its own fonts, colours and backgrounds.

## Point a quiz at it

```html
<pq-quiz src="quiz.trivia" theme="themes/forest/"></pq-quiz>
```

Or from a host that builds its own player:

```ts
const quiz = createQuiz({ config: { theme: "themes/forest/" } });
mountQuiz(quiz, target);
```

Or in the quiz header, where `forest` is a name under `themes/`:

```txt
Theme => forest
```

A header value with a slash is used as a path. An attribute wins over the header.
`theme="./theme.css"` also works when a folder is overkill: it links that one
stylesheet and nothing else.

Theme URLs resolve against the page's base URL, so `file://` cannot fetch the
settings file. Serve the folder, or let the author pick it.

Before a quiz night, ask the CLI whether the folder is complete:

```bash
bun run cli/index.ts validate my-quiz.trivia --assets
```

It reads the settings file and checks the stylesheet, every font and every
background image. A typo in a font name is a console warning otherwise.

## Theme folders

`theme: "forest"` loads `themes/forest/` by default. Set `subFolderTheme` to
change the root, for example `theme: "forest", subFolderTheme: "theme/"`.
`<pq-quiz subfolder-theme="theme/">` does the same on the element.

## Colour schemes

A question can ask for a named scheme with `ColorScheme => night`. The theme
defines it in a block:

```txt
### ColorScheme night
Light => #eeeeee
Dark => #111111
Background => #101014
Text => #f5f2ea
```

The four values become `--pq-scheme-light`, `--pq-scheme-dark`,
`--pq-scheme-bg` and `--pq-scheme-text` on the quiz root. No scheme, no change.

## Readable colours

A theme that sets its own paper must keep its ink readable on it. The player
measures the text tokens against their surfaces and shows a warning under
4.5:1, the WCAG AA line. It checks `--pq-ink` on `--pq-paper` and `--pq-slide`,
`--pq-muted` on paper, and both ink-on-strip pairs.

A theme that pins a light paper should pin its colour scheme too:

```txt
ColorScheme => light
```

Without it, `light-dark()` tokens still follow the reader's dark mode: the ink
turns light while the paper stays light. The setting applies `color-scheme` on
the quiz root, the same as the CSS rule would.

The audit checks five text/surface pairs against WCAG AA (4.5:1): ink on paper,
ink on slide, muted text on paper, accent ink on accent, and strip ink on strip.
It also loads each background, warns when one is stretched past twice its width,
and names a background file that is not there. The warning floats over the page in its own colours, so it stays readable
in any theme. It fades after twelve seconds and a click dismisses it. Turn it off
with `ThemeAudit => false` or the setting in Settings.

## `theme.trivia-theme`

The settings file uses the same `Key => Value` syntax as the quiz.

```txt
Label => Forest
Stylesheet => style.css
BackgroundAlpha => 0.55
BoldHeadings => true

Font => heading | Lora | regular | Lora-Regular.woff2
Font => heading | Lora | bold | Lora-Bold.woff2
Font => body | Lora | regular | Lora-Regular.woff2
Font => body | Lora | italic | Lora-Italic.woff2

--pq-accent => #2f6b4f
--pq-paper => #eaf0e2
--pq-slide => #f7faf2

### Background
bg-dots.svg
bg-waves.svg
```

| Key               | Job                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `Label`           | Name shown to the author                                                                  |
| `Stylesheet`      | File to load. Defaults to `style.css`.                                                     |
| `Font`            | `slot \| family \| variant \| file`. Variants: `regular`, `italic`, `bold`, `bold-italic`. |
| `Background`      | Images to choose from per question. Both `a \| b` and one per line work.                   |
| `BackgroundAlpha` | 0 to 1. Lower fades the image behind the paper.                                            |
| `BoldHeadings`    | `true` makes headings use the bold face.                                                   |
| `ColorScheme`     | `light`, `dark`, `light dark` or `normal`. Pin it when the paper is pinned.                 |
| `--pq-*`          | Any CSS custom property. Applied on the quiz root.                                         |

`### Background` is the same block syntax the quiz uses: one value per line,
ending at the next `Key =>` or heading. The settings parser accepts it too, so a
folder full of images stays readable.

A background is picked per question from a stable hash, so going back to a
question brings its image back.

## Upload a folder at quiz start

A host can open a theme folder from disk. Nothing is uploaded; the files stay
local and become blob URLs.

```html
<pq-quiz src="quiz.trivia" theme-upload></pq-quiz>
```

That puts **Load a theme folder** on the start screen, whether or not a theme is
already loaded. Picking another folder replaces the active theme. Set
`ThemeUpload => false` (or `theme-upload="false"`) to take the picker away.

Or do it yourself:

```ts
import { themeFromFiles, setTheme } from "pq-trivia/player";

const files = input.files; // <input type="file" webkitdirectory multiple>
setTheme(await themeFromFiles(Array.from(files)));
```

The folder needs a `theme.trivia-theme`, or just a `style.css`. Paths inside the
settings resolve inside the picked folder.

## Tokens

Everything in Paper is a token, so a theme can be one stylesheet with ten lines.

| Token                                    | Job                                   |
| ---------------------------------------- | ------------------------------------- |
| `--pq-ink`, `--pq-muted`                 | text                                  |
| `--pq-paper`, `--pq-slide`               | background and card                   |
| `--pq-accent`, `--pq-honey`, `--pq-fern` | emphasis                              |
| `--pq-font-heading`, `--pq-font-body`    | type                                  |
| `--pq-heading-weight`                    | heading weight, set by `BoldHeadings` |
| `--pq-r-sm` … `--pq-r-lg`                | corners                               |
| `--pq-space`                             | page rhythm                           |

## Per-question styling

```txt
Question => ...
Class => loud wide
Background => image: themes/forest/bg-waves.svg
```

`Class` adds a class to the slide. Names without `pq-` get that prefix.

### Built-in classes

Five classes ship with Paper, so an author can set the mood without a stylesheet.
Write the short name; the prefix is added for you.

| Write       | What it does                                              |
| ----------- | --------------------------------------------------------- |
| `center`    | Centres the text.                                         |
| `dark`      | A dark panel, for a question that should feel like a card. |
| `invert`    | Flips the colours.                                        |
| `quote`     | Italics, for a line someone said.                         |
| `spotlight` | Dims the edges, so the middle is the only thing lit.      |

```txt
Question => Name this painting.
Class => spotlight center
```

Order does not matter. Every theme keeps these five, so content written on Paper
still works when a theme folder adds its own colours.

## Default type

The default theme bundles Figtree, a variable sans with weights 300 to 900. Two
WOFF2 subsets (latin and latin-ext) ride inside the player, so the default look
needs no network. Figtree is under the SIL Open Font License; the full text is
in `src/themes/fonts/Figtree-OFL.txt`. Antique, the old serif and cream look,
lives in `examples/themes/antique/`.

## Extra themes

`high-contrast.css` and `large-print.css` load after Paper and override it.

## Print

`print.css` builds the pages: cover, round pages, one question per page, answer
forms, grade tables, flash cards. The player prints the whole quiz on `Ctrl+P`.

## One file, no theme folder

`pq-trivia.min.js` contains Paper and the print sheet. A quiz with no theme
folder needs nothing else, which is the quick start. A theme folder adds to
that; it does not replace the bundle's base styles.
