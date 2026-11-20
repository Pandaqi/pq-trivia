/**
 * The wizard's stylesheet, as a string.
 *
 * One bundle, no separate CSS file to forget. Paper tokens are used when the
 * page has them and sensible colours when it does not.
 */

export const EDITOR_CSS = `
.pq-editor {
  --pq-ed-ink: var(--pq-ink, #2f2a33);
  --pq-ed-paper: var(--pq-paper, #faf5ea);
  --pq-ed-panel: var(--pq-slide, #fffdf7);
  --pq-ed-line: var(--pq-line, #d9d0be);
  --pq-ed-accent: var(--pq-accent, #6f4b98);
  --pq-ed-right: var(--pq-right, #3e7a4c);
  --pq-ed-wrong: var(--pq-wrong, #a03a3a);
  --pq-ed-mono: var(--pq-font-mono, ui-monospace, Consolas, monospace);
  --pq-ed-radius: var(--pq-r-md, 0.6rem);
  --pq-ed-gap: var(--pq-gap, 0.75rem);
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
.pq-editor-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.5rem;
}
.pq-editor-bar-group { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.pq-editor-title { flex: 1 1 14rem; min-width: 10rem; display: grid; gap: 0.15rem; }
.pq-editor button {
  font: inherit;
  padding: 0.35rem 0.6rem;
  min-height: 2.2rem;
  color: inherit;
  background: var(--pq-ed-panel);
  border: 1px solid var(--pq-ed-line);
  border-radius: 999rem;
  cursor: pointer;
}
.pq-editor button:hover { border-color: var(--pq-ed-accent); }
.pq-editor button[aria-pressed="true"] { background: var(--pq-ed-accent); color: #fff; border-color: var(--pq-ed-accent); }
.pq-editor button:disabled { opacity: 0.45; cursor: not-allowed; }
.pq-editor-grid {
  display: grid;
  gap: var(--pq-ed-gap);
  grid-template-columns: minmax(11rem, 15rem) minmax(17rem, 1fr) minmax(17rem, 1fr);
  align-items: start;
  min-height: 0;
}
.pq-editor-grid[data-pq-preview="on"] {
  grid-template-columns: minmax(10rem, 13rem) minmax(16rem, 1fr) minmax(15rem, 1fr) minmax(17rem, 1.1fr);
}
@media (max-width: 78rem) {
  .pq-editor-grid,
  .pq-editor-grid[data-pq-preview="on"] { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .pq-editor-grid > .pq-editor-preview { grid-column: 1 / -1; }
}
@media (max-width: 46rem) {
  .pq-editor-grid,
  .pq-editor-grid[data-pq-preview="on"] { grid-template-columns: minmax(0, 1fr); }
}
.pq-editor-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
  max-height: 44rem;
  padding: 0.6rem;
  overflow: auto;
  background: var(--pq-ed-panel);
  border: 1px solid var(--pq-ed-line);
  border-radius: var(--pq-ed-radius);
}
.pq-editor-panel > h2 {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.7;
}
.pq-editor-slides { display: flex; flex-direction: column; gap: 0.25rem; margin: 0; padding: 0; list-style: none; }
.pq-editor-slide {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  text-align: left;
  border-radius: var(--pq-ed-radius) !important;
}
.pq-editor-slide[aria-current="true"] { background: var(--pq-ed-accent); border-color: var(--pq-ed-accent); color: #fff; }
.pq-editor-slide-kind { font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.75; }
.pq-editor-slide-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pq-editor-badge {
  min-width: 1.4rem;
  padding: 0 0.3rem;
  font-size: 0.75rem;
  text-align: center;
  color: #fff;
  background: var(--pq-ed-wrong);
  border-radius: 999rem;
}
.pq-editor-field { display: grid; gap: 0.15rem; margin-bottom: 0.45rem; }
.pq-editor-label { font-size: 0.78rem; font-weight: 600; letter-spacing: 0.03em; }
.pq-editor-hint { margin: 0; font-size: 0.78rem; opacity: 0.7; }
.pq-editor input,
.pq-editor select,
.pq-editor textarea {
  width: 100%;
  padding: 0.4rem 0.5rem;
  font: inherit;
  color: inherit;
  background: var(--pq-ed-paper);
  border: 1px solid var(--pq-ed-line);
  border-radius: 0.35rem;
}
.pq-editor textarea.pq-editor-code {
  font-family: var(--pq-ed-mono);
  font-size: 0.82rem;
  white-space: pre;
  tab-size: 2;
}
.pq-editor-row { display: flex; align-items: center; gap: 0.3rem; }
.pq-editor-row > input[type="text"] { flex: 1 1 auto; }
.pq-editor-row > input[type="checkbox"] { width: auto; flex: 0 0 auto; }
.pq-editor-row > button { min-height: 2rem; padding: 0.15rem 0.45rem; }
.pq-editor-list { display: flex; flex-direction: column; gap: 0.3rem; margin: 0 0 0.3rem; padding: 0; list-style: none; }
.pq-editor-tabs { display: flex; gap: 0.3rem; }
.pq-editor-tabs button { border-radius: var(--pq-ed-radius) !important; }
.pq-editor-actions { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.pq-editor details { border-top: 1px solid var(--pq-ed-line); padding-top: 0.4rem; margin-top: 0.2rem; }
.pq-editor summary { cursor: pointer; font-size: 0.78rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.75; }
.pq-editor-problems { margin: 0; padding-left: 1.1rem; font-size: 0.82rem; color: var(--pq-ed-wrong); }
.pq-editor-preview { max-height: 44rem; overflow: auto; }
.pq-editor-preview .pq-quiz { min-height: 0; }
.pq-editor-status { display: flex; gap: 0.6rem; align-items: baseline; font-size: 0.82rem; opacity: 0.8; }
`;
