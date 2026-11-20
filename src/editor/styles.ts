/**
 * The wizard's stylesheet, as a string.
 *
 * One bundle, no separate CSS file to forget. Paper tokens are used when the
 * page has them and sensible colours when it does not.
 */

export const EDITOR_CSS = `
.pq-editor {
  --pq-ed-ink: var(--pq-ink, #2f2a33);
  --pq-ed-muted: var(--pq-muted, #5f585e);
  --pq-ed-paper: var(--pq-paper, #faf5ea);
  --pq-ed-panel: var(--pq-slide, #fffdf7);
  --pq-ed-line: var(--pq-line, #d9d0be);
  --pq-ed-accent: var(--pq-accent, #6f4b98);
  --pq-ed-accent-ink: var(--pq-accent-ink, #fffdf7);
  --pq-ed-right: var(--pq-right, #3e7a4c);
  --pq-ed-wrong: var(--pq-wrong, #a03a3a);
  --pq-ed-mono: var(--pq-font-mono, ui-monospace, Consolas, monospace);
  --pq-ed-radius: var(--pq-r-md, 0.6rem);
  --pq-ed-gap: var(--pq-gap, 0.75rem);
  --pq-ed-tall: 44rem;
  display: flex;
  flex-direction: column;
  gap: var(--pq-ed-gap);
  box-sizing: border-box;
  min-height: 34rem;
  padding: var(--pq-ed-gap);
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

/* Toolbar: name on the left, three button groups on the right. */
.pq-editor-bar {
  display: flex;
  flex-wrap: wrap;
  gap: .75rem;
  align-items: flex-end;
  justify-content: space-between;
}
.pq-editor-bar-name { flex: 1 1 16rem; min-width: 11rem; max-width: 22rem; }
.pq-editor-groups { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.pq-editor-group {
  display: flex;
  align-items: center;
  gap: .25rem;
  padding-left: .5rem;
  border-left: 1px solid var(--pq-ed-line);
}
.pq-editor-group:first-child { padding-left: 0; border-left: 0; }

.pq-editor button,
.pq-editor summary.pq-editor-button {
  font: inherit;
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
.pq-editor button.pq-editor-primary {
  color: var(--pq-ed-accent-ink);
  background: var(--pq-ed-accent);
  border-color: var(--pq-ed-accent);
  font-weight: 600;
}
.pq-editor button:disabled { opacity: .45; cursor: not-allowed; }

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

/* Grid: slides, form, syntax, preview. */
.pq-editor-grid {
  display: grid;
  gap: var(--pq-ed-gap);
  grid-template-columns: minmax(12rem, 15rem) minmax(20rem, 1.15fr) minmax(18rem, 1fr) minmax(19rem, 1.05fr);
  align-items: stretch;
  min-height: 0;
}
.pq-editor-grid[data-pq-preview="off"] {
  grid-template-columns: minmax(12rem, 15rem) minmax(20rem, 1.15fr) minmax(18rem, 1fr);
}
@media (max-width: 87.99rem) {
  .pq-editor-grid,
  .pq-editor-grid[data-pq-preview="off"] { grid-template-columns: minmax(10rem, 13rem) minmax(0, 1fr) minmax(0, 1fr); }
  .pq-editor-grid > .pq-editor-preview { grid-column: 1 / -1; max-height: 38rem; }
}
@media (max-width: 62rem) {
  .pq-editor-grid,
  .pq-editor-grid[data-pq-preview="off"] { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .pq-editor-grid > .pq-editor-slide-list { grid-column: 1 / -1; }
}
@media (max-width: 44rem) {
  .pq-editor-grid,
  .pq-editor-grid[data-pq-preview="off"] { grid-template-columns: minmax(0, 1fr); }
  /* One column: the page scrolls, not four boxes inside it. */
  .pq-editor-panel { max-height: none; overflow: visible; }
  .pq-editor-preview { max-height: 40rem; overflow: auto; }
  .pq-editor-bar-name { flex-basis: 100%; max-width: none; }
}

/* Panels. */
.pq-editor-panel {
  display: flex;
  flex-direction: column;
  gap: .55rem;
  min-width: 0;
  max-height: var(--pq-ed-tall);
  padding: .7rem .8rem;
  overflow: auto;
  background: var(--pq-ed-panel);
  border: 1px solid var(--pq-ed-line);
  border-radius: var(--pq-ed-radius);
}
.pq-editor-panel > h2,
.pq-editor-panel-head h2 {
  margin: 0;
  font-size: .78rem;
  font-weight: 700;
  letter-spacing: .09em;
  text-transform: uppercase;
  opacity: .7;
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
  min-width: 0;
  text-transform: none;
  letter-spacing: 0;
  font-size: 1rem;
  opacity: 1;
}
.pq-editor-kind {
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .09em;
  text-transform: uppercase;
  color: var(--pq-ed-accent);
}
.pq-editor-panel-head .pq-editor-actions button {
  min-width: 2.25rem;
  min-height: 2rem;
  padding: .15rem .5rem;
}

/* Slides. */
.pq-editor-slides { display: flex; flex-direction: column; gap: .2rem; margin: 0; padding: 0; list-style: none; }
.pq-editor-slide {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: .4rem;
  width: 100%;
  text-align: left;
  border-radius: .5rem !important;
}
.pq-editor-slide[aria-current="true"] {
  color: var(--pq-ed-accent-ink);
  background: var(--pq-ed-accent);
  border-color: var(--pq-ed-accent);
}
.pq-editor-slide-kind { font-size: .6rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; opacity: .7; }
.pq-editor-slide[aria-current="true"] .pq-editor-slide-kind { opacity: .9; }
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
.pq-editor-field { display: grid; gap: .2rem; margin-bottom: .5rem; }
.pq-editor-label { font-size: .78rem; font-weight: 700; letter-spacing: .02em; }
.pq-editor-hint { margin: 0; font-size: .78rem; color: var(--pq-ed-muted); }
.pq-editor input,
.pq-editor select,
.pq-editor textarea {
  width: 100%;
  padding: .4rem .5rem;
  font: inherit;
  color: inherit;
  background: var(--pq-ed-paper);
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
.pq-editor-list { display: flex; flex-direction: column; gap: .3rem; margin: 0 0 .3rem; padding: 0; list-style: none; }
.pq-editor-list-editor { display: flex; flex-direction: column; gap: .3rem; }
.pq-editor-actions { display: flex; flex-wrap: wrap; gap: .3rem; }
.pq-editor-actions button { min-height: 2rem; padding: .2rem .6rem; }

/* Groups of optional attributes. */
.pq-editor details.pq-editor-more {
  border-top: 1px solid var(--pq-ed-line);
  padding-top: .45rem;
  margin-top: .1rem;
}
.pq-editor details.pq-editor-more > summary {
  cursor: pointer;
  font-size: .74rem;
  font-weight: 700;
  letter-spacing: .09em;
  text-transform: uppercase;
  color: var(--pq-ed-muted);
  padding: .1rem 0;
}
.pq-editor details.pq-editor-more[open] > summary { margin-bottom: .45rem; }

/* Syntax tabs. */
.pq-editor-tabs { display: flex; gap: .3rem; }

/* Preview. */
.pq-editor-preview { padding: 0; overflow: auto; }
.pq-editor-preview > h2 { padding: .7rem .8rem 0; }
.pq-editor-preview .pq-quiz { min-height: 0; }

/* Status. */
.pq-editor-status {
  display: flex;
  flex-wrap: wrap;
  gap: .75rem;
  align-items: baseline;
  padding-top: .1rem;
  font-size: .82rem;
}
.pq-editor-good { color: var(--pq-ed-right); font-weight: 600; }
.pq-editor-bad { color: var(--pq-ed-wrong); font-weight: 600; }
.pq-editor-note { color: var(--pq-ed-muted); }
`;
