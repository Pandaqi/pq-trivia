/**
 * The wizard's stylesheet, as a string.
 *
 * One bundle, no separate CSS file to forget. Paper tokens are used when the
 * page has them and sensible colours when it does not.
 *
 * Panes are open columns, not cards: a heading, a dotted rule under it, then
 * fields. One border per control is enough. The old version boxed the boxes.
 */

export const EDITOR_CSS = `
.pq-editor {
  --pq-ed-ink: var(--pq-ink, #2f2a33);
  --pq-ed-muted: var(--pq-muted, #5f585e);
  --pq-ed-paper: var(--pq-paper, #faf5ea);
  --pq-ed-panel: var(--pq-slide, #fffdf7);
  --pq-ed-line: var(--pq-line, #d9d0be);
  --pq-ed-line-strong: var(--pq-line-strong, #b9ad99);
  --pq-ed-pop: var(--pq-pop, #fff);
  --pq-ed-rule: 1px dotted var(--pq-ed-line-strong);
  --pq-ed-accent: var(--pq-accent, #6f4b98);
  --pq-ed-accent-ink: var(--pq-accent-ink, #fffdf7);
  --pq-ed-right: var(--pq-right, #3e7a4c);
  --pq-ed-wrong: var(--pq-wrong, #a03a3a);
  --pq-ed-mono: var(--pq-font-mono, ui-monospace, Consolas, monospace);
  --pq-ed-radius: var(--pq-r-md, 0.6rem);
  --pq-ed-gap: var(--pq-gap, 0.75rem);
  --pq-ed-wide: 1.85rem;
  --pq-ed-tall: 44rem;
  display: flex;
  flex-direction: column;
  gap: var(--pq-ed-gap);
  box-sizing: border-box;
  min-height: 34rem;
  padding: var(--pq-ed-gap) var(--pq-ed-wide) var(--pq-ed-wide);
  color: var(--pq-ed-ink);
  background: var(--pq-ed-paper);
  font-family: var(--pq-font-body, "Segoe UI", system-ui, sans-serif);
  font-size: 0.95rem;
  line-height: 1.45;
}
.pq-editor *,
.pq-editor *::before,
.pq-editor *::after { box-sizing: border-box; }
.pq-editor :focus-visible { outline: 3px solid var(--pq-ed-accent); outline-offset: 2px; }

/* Toolbar: name on the left, then the groups. */
.pq-editor-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--pq-ed-gap);
  align-items: flex-end;
  justify-content: space-between;
}
.pq-editor-bar-name { flex: 1 1 16rem; min-width: 11rem; max-width: 22rem; }
.pq-editor-groups { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.pq-editor-group {
  display: flex;
  align-items: center;
  gap: .25rem;
  padding-left: .6rem;
  border-left: 1px solid var(--pq-ed-line);
}
.pq-editor-group:first-child { padding-left: 0; border-left: 0; }

.pq-editor button,
.pq-editor summary.pq-editor-button {
  font: inherit;
  font-size: .85rem;
  padding: .35rem .65rem;
  min-height: 2.25rem;
  color: inherit;
  background: var(--pq-ed-panel);
  border: 1px solid var(--pq-ed-line);
  border-radius: 999rem;
  cursor: pointer;
}
.pq-editor button:hover,
.pq-editor summary.pq-editor-button:hover { border-color: var(--pq-ed-accent); }
.pq-editor button[aria-pressed="true"] {
  border-color: var(--pq-ed-accent);
  box-shadow: inset 0 0 0 1px var(--pq-ed-accent);
  font-weight: 600;
}
.pq-editor button[aria-pressed="false"] { color: var(--pq-ed-muted); }
.pq-editor button.pq-editor-primary {
  color: var(--pq-ed-accent-ink);
  background: var(--pq-ed-accent);
  border-color: var(--pq-ed-accent);
  font-weight: 600;
}
.pq-editor button:disabled { opacity: .45; cursor: not-allowed; }

/* Panes you can turn on and off, in the toolbar. */
.pq-editor-pane-toggle { font-size: .8rem; padding: .3rem .55rem; }

/* File menu. */
.pq-editor-menu { position: relative; }
.pq-editor-menu summary { list-style: none; }
.pq-editor-menu summary::-webkit-details-marker { display: none; }
.pq-editor-menu summary::after { content: " ▾"; }
.pq-editor-menu-list {
  position: absolute;
  z-index: 5;
  top: calc(100% + .3rem);
  left: 0;
  display: flex;
  flex-direction: column;
  gap: .2rem;
  min-width: 12rem;
  padding: .35rem;
  background: var(--pq-ed-panel);
  border: 1px solid var(--pq-ed-line);
  border-radius: var(--pq-ed-radius);
  box-shadow: 0 10px 26px -16px rgb(0 0 0 / .55);
}
.pq-editor-menu-list button { text-align: left; border-radius: .4rem; }

/* The row of open panes. Widths come from a custom property, so the stacking
   rules below can still overrule the whole template on a narrow window. */
.pq-editor-grid {
  display: grid;
  gap: var(--pq-ed-wide);
  grid-template-columns: var(--pq-ed-grid, minmax(0, 1fr));
  align-items: stretch;
  min-height: 0;
}
.pq-editor-cell { position: relative; display: flex; min-width: 0; }
.pq-editor-cell > * { flex: 1 1 auto; min-width: 0; }

/* The divider. A dotted line you can grab, sitting in the gap. */
.pq-editor-grip {
  position: absolute;
  top: 0;
  bottom: 0;
  right: calc(var(--pq-ed-wide) / -2 - 6px);
  z-index: 6;
  width: 12px;
  cursor: col-resize;
  touch-action: none;
}
.pq-editor-grip::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  border-left: var(--pq-ed-rule);
  opacity: .6;
  transition: opacity 120ms, border-color 120ms;
}
.pq-editor-grip:hover::before {
  border-color: var(--pq-ed-accent);
  opacity: 1;
}

@media (max-width: 62rem) {
  /* One column: the page scrolls, not four boxes inside it. */
  .pq-editor-grid { grid-template-columns: minmax(0, 1fr); }
  .pq-editor-grip { display: none; }
  .pq-editor-panel { max-height: 32rem; }
}
@media (max-width: 44rem) {
  .pq-editor-panel { max-height: none; overflow: visible; }
  /* Below the others, the preview still needs a room of its own. */
  .pq-editor-preview { max-height: none; height: 32rem; overflow: hidden; }
  .pq-editor-bar-name { flex-basis: 100%; max-width: none; }
}

/* Panes. */
.pq-editor-panel {
  display: flex;
  flex-direction: column;
  gap: .6rem;
  min-width: 0;
  max-height: var(--pq-ed-tall);
  padding: 0;
  overflow: auto;
}

/* A section heading, in the player's voice: heading type, ink, dotted rule. */
.pq-editor-panel > h2,
.pq-editor-panel-head {
  margin: 0;
  padding-bottom: .4rem;
  border-bottom: var(--pq-ed-rule);
}
.pq-editor-panel > h2 {
  font-family: var(--pq-font-heading, Georgia, serif);
  font-size: 1.02rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--pq-ed-ink);
}
.pq-editor-panel-head {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  align-items: center;
  justify-content: space-between;
}
.pq-editor-panel-head h2 {
  display: flex;
  gap: .45rem;
  align-items: baseline;
  margin: 0;
  min-width: 0;
  font-family: var(--pq-font-heading, Georgia, serif);
  font-size: 1.02rem;
  font-weight: 600;
  letter-spacing: 0;
}
.pq-editor-kind {
  font-family: var(--pq-font-label, inherit);
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--pq-ed-accent);
}
.pq-editor-panel-head .pq-editor-actions button {
  min-width: 2.25rem;
  min-height: 2rem;
  padding: .15rem .5rem;
}

/* Slides: one rectangle per slide, move arrows inside its right edge. */
.pq-editor-slides { display: flex; flex-direction: column; gap: .2rem; margin: 0; padding: 0; list-style: none; }
.pq-editor-slide-item { padding-left: calc(var(--pq-ed-depth, 0) * .9rem); }
.pq-editor-slide-item[data-depth="1"] { --pq-ed-depth: 1; }
.pq-editor-slide-item[data-depth="2"] { --pq-ed-depth: 2; }
.pq-editor-slide-item[data-dragging="true"] { opacity: .45; }
.pq-editor-slide-row {
  position: relative;
  display: flex;
  align-items: stretch;
  border: 1px solid var(--pq-ed-line);
  border-radius: .5rem;
  background: var(--pq-ed-panel);
}
.pq-editor-slide-row:hover { border-color: var(--pq-ed-accent); }
.pq-editor-slide-row[data-current="true"] {
  color: var(--pq-ed-accent-ink);
  background: var(--pq-ed-accent);
  border-color: var(--pq-ed-accent);
}
/* A branch tick, so a question reads as hanging off its round. */
.pq-editor-slide-item[data-depth="1"] > .pq-editor-slide-row::before,
.pq-editor-slide-item[data-depth="2"] > .pq-editor-slide-row::before {
  content: "";
  position: absolute;
  left: -.58rem;
  top: .5rem;
  bottom: .5rem;
  width: .32rem;
  border-left: 1px dotted var(--pq-ed-line-strong);
  border-bottom: 1px dotted var(--pq-ed-line-strong);
  border-bottom-left-radius: .3rem;
  opacity: .6;
  pointer-events: none;
}
.pq-editor-slide-item[data-drop="true"] > .pq-editor-slide-row {
  border-top: 2px solid var(--pq-ed-accent);
}
.pq-editor .pq-editor-slide {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: .4rem;
  width: auto;
  min-width: 0;
  min-height: 2.25rem;
  padding: .35rem .5rem;
  text-align: left;
  color: inherit;
  background: none;
  border: 0;
  border-radius: .5rem;
}
.pq-editor .pq-editor-slide:hover { border-color: transparent; }
.pq-editor .pq-editor-move { display: flex; align-items: center; gap: .1rem; padding-right: .2rem; }
.pq-editor .pq-editor-move-button {
  width: 1.5rem;
  height: 1.75rem;
  min-height: 0;
  padding: 0;
  display: grid;
  place-items: center;
  font-size: .8rem;
  line-height: 1;
  color: var(--pq-ed-muted);
  background: none;
  border: 0;
  border-radius: .35rem;
  opacity: .4;
}
.pq-editor-slide-row[data-current="true"] .pq-editor-move-button { color: inherit; opacity: .75; }
.pq-editor-slide-row:hover .pq-editor-move-button,
.pq-editor-slide-row:focus-within .pq-editor-move-button { opacity: 1; }
/* Last, so a missing direction stays invisible wherever the row sits. */
.pq-editor .pq-editor-move-button:disabled { opacity: 0; cursor: default; }
.pq-editor-slide-kind { font-size: .6rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; opacity: .7; }
.pq-editor-slide-row[data-current="true"] .pq-editor-slide-kind { opacity: .9; }
.pq-editor-slide-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pq-editor-badge {
  min-width: 1.35rem;
  padding: 0 .3rem;
  font-size: .72rem;
  text-align: center;
  color: #fff;
  background: var(--pq-ed-wrong);
  border-radius: 999rem;
}

/* Fields. */
.pq-editor-field { display: grid; gap: .25rem; }
.pq-editor-label { font-size: .78rem; font-weight: 700; letter-spacing: .02em; }
.pq-editor-hint { margin: 0; font-size: .78rem; color: var(--pq-ed-muted); }
.pq-editor input,
.pq-editor select,
.pq-editor textarea {
  width: 100%;
  padding: .4rem .5rem;
  font: inherit;
  color: inherit;
  background: var(--pq-ed-panel);
  border: 1px solid var(--pq-ed-line);
  border-radius: .35rem;
}
.pq-editor input[type="checkbox"] { width: auto; }
.pq-editor textarea { resize: vertical; }
.pq-editor textarea.pq-editor-code {
  flex: 1 1 auto;
  min-height: 18rem;
  font-family: var(--pq-ed-mono);
  font-size: .82rem;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  tab-size: 2;
}
.pq-editor-row { display: flex; align-items: center; gap: .3rem; }
.pq-editor-row > input[type="text"] { flex: 1 1 auto; }
.pq-editor-row > input[type="checkbox"] { flex: 0 0 auto; }
.pq-editor-row > button { min-height: 2rem; padding: .15rem .5rem; }
.pq-editor-list { display: flex; flex-direction: column; gap: .3rem; margin: 0; padding: 0; list-style: none; }
.pq-editor-list-editor { display: flex; flex-direction: column; gap: .4rem; }
.pq-editor-actions { display: flex; flex-wrap: wrap; gap: .3rem; }
.pq-editor-actions button { min-height: 2rem; padding: .2rem .6rem; font-size: .82rem; }

/* Help, on hover. A dotted label or a small "?" says the note exists. */
.pq-editor-has-note { cursor: help; }
.pq-editor-field.pq-editor-has-note > .pq-editor-label {
  justify-self: start;
  border-bottom: 1px dotted var(--pq-ed-line);
}
.pq-editor-ask {
  margin-left: .3rem;
  color: var(--pq-ed-muted);
  font-family: var(--pq-font-label, inherit);
  font-size: .72rem;
  font-weight: 700;
}

/* A note that floats, pointed at its heading or field. */
.pq-editor-bubble {
  position: fixed;
  z-index: 60;
  max-width: min(22rem, calc(100vw - 1.5rem));
  padding: .55rem .75rem;
  border: 1px solid var(--pq-ed-line-strong);
  border-radius: var(--pq-ed-radius);
  background: var(--pq-ed-pop);
  box-shadow: 0 10px 26px -16px rgb(0 0 0 / .55);
  color: var(--pq-ed-ink);
  font-size: .8rem;
  line-height: 1.45;
  text-align: left;
  opacity: 0;
  pointer-events: none;
}
.pq-editor-bubble[data-pq-placed="true"] { opacity: 1; }
.pq-editor-bubble::before {
  content: "";
  position: absolute;
  left: var(--pq-arrow, 1.1rem);
  width: .6rem;
  height: .6rem;
  border: inherit;
  background: inherit;
  transform: rotate(45deg);
}
.pq-editor-bubble[data-pq-side="below"]::before {
  top: -.35rem;
  margin-left: -.3rem;
  border-right: 0;
  border-bottom: 0;
}
.pq-editor-bubble[data-pq-side="above"]::before {
  bottom: -.35rem;
  margin-left: -.3rem;
  border-top: 0;
  border-left: 0;
}

/* Groups of optional attributes. A divider, not another box. */
.pq-editor details.pq-editor-more {
  margin-top: .35rem;
  padding-top: .5rem;
  border-top: var(--pq-ed-rule);
}
.pq-editor details.pq-editor-more > summary {
  cursor: pointer;
  padding: .1rem 0;
  font-size: .74rem;
  font-weight: 700;
  letter-spacing: .09em;
  text-transform: uppercase;
  color: var(--pq-ed-muted);
}
.pq-editor details.pq-editor-more[open] > summary { margin-bottom: .1rem; }
.pq-editor-more-body { display: grid; gap: .6rem; margin-top: .5rem; }

/* Syntax tabs. */
.pq-editor-tabs { display: flex; gap: .3rem; }

/* Preview. The pane never scrolls: the page is shrunk to fit the stage. */
.pq-editor-preview { overflow: hidden; }
.pq-editor-preview > h2 { flex: 0 0 auto; }
.pq-editor-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 20rem;
  overflow: hidden;
}
.pq-editor-preview-host { position: absolute; inset: 0; transform-origin: top left; }
/* A page inside a box is not a page: no fixed height, no inner scroller. */
.pq-editor-preview .pq-quiz { height: auto; min-height: 0; overflow: visible; }
.pq-editor-preview .pq-screen { height: auto; min-height: 0; overflow: visible; }

/* Status. */
.pq-editor-status {
  display: flex;
  flex-wrap: wrap;
  gap: .75rem;
  align-items: baseline;
  padding-top: .45rem;
  border-top: var(--pq-ed-rule);
  font-size: .82rem;
}
.pq-editor-good { color: var(--pq-ed-right); font-weight: 600; }
.pq-editor-bad { color: var(--pq-ed-wrong); font-weight: 600; }
.pq-editor-note-line { color: var(--pq-ed-muted); }
`;
