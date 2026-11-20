# The wizard

Write a whole quiz in the page. No Notepad open on the other screen.

The wizard is its own bundle. A normal build leaves it out, so a player page
never downloads an authoring tool.

```bash
bun run build:editor
```

```html
<link rel="stylesheet" href="dist/v3/themes/paper.css" />
<div data-pq-wizard></div>
<script type="module" src="dist/v3/editor.js"></script>
```

Every `[data-pq-wizard]` element gets one. Or mount it yourself:

```js
import { mountQuizWizard } from "./editor.js";

const wizard = mountQuizWizard(document.getElementById("wizard"), {
  text: "### First question\nAnswers => One | Two",
});

wizard.text(); // the current buffer
wizard.destroy(); // gives the page back
```

## Four panes, one buffer

| Pane          | What it does                                                  |
| ------------- | ------------------------------------------------------------- |
| Slides        | pick a block, add one, remove one, Alt+↑/↓ to reorder          |
| Form          | the fields for this slide, generated from the attribute table  |
| Trivia Syntax | this block, or the whole file, exactly as written             |
| Preview       | the real player, running on the current text                  |

The text is the model. A form edit rewrites that block's text. A text edit
reparses, and the forms follow. There is no hidden state to lose.

## Editing

- Text fields commit on blur or Enter. Selects and checkboxes commit at once.
- Answers are rows. Tick the ones that count, ↑ and ↓ reorder, × removes.
- Media rows take a file. With a folder open the file is copied into `media/`.
  Without one you get a path and an honest note.
- Undo and redo walk the text snapshots. Ctrl+Z and Ctrl+Shift+Z work outside
  the text boxes.
- Alt+↑ and Alt+↓ move the selected slide. Buttons do the same thing, so no
  interaction is drag-only.

## Opening and saving

- **Save** downloads `your-quiz.trivia`. That file plays in any normal build.
- **Open file** reads `.trivia`, `.txt` and `.md`. Several files merge in name
  order.
- **Open folder** asks for directory access where the browser has it. Picked
  media lands in `media/` inside it, and **Save to folder** writes back there.
- Nothing is stored anywhere. Close the tab and the buffer is gone, which is
  why Save sits in the toolbar.

## What it will not do

- No comments kept through a form edit. That block is written back in canonical
  form. Use the text pane when comments matter.
- No raw HTML, no scripts. Same rules as the player.
- No account, no cloud, no autosave.

## A field is missing

Then the wizard does not know the attribute yet. Add a row to
`src/core/syntax/attributeRegistry.ts` and the form grows one. That is the whole
coupling between the two.
