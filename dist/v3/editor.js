/*! PQ-Trivia v3.0.0-dev.0 | editor | MIT | https://pq-trivia.dev */
import{i,d,g,R,y,A,m,L,P,h,T,b,o,f,n,s,a,u,e,w,p,c}from"./chunk-editor.js";var it,$e,Ee,at=(t,r)=>{for(var[l,v,E]of it||[])for(var S=[t],q=globalThis,F=q.document,k,M,H,I,z;M=S.pop();)if(!$e[M]&&(H=v[M])){$e[M]=1;for(I=1;I<H.length;I++)S.push(E[H[I]]);if(!r&&M!==t&&(k=F&&F.head)){if(Ee===void 0)Ee=(I=F.querySelector("meta[property=csp-nonce]"))&&(I.nonce||I.getAttribute("nonce"))||"";if(z=F.createElement("link"),z.rel="modulepreload",z.crossOrigin="",Ee)z.nonce=Ee;z.href=new q.URL(H[0],l),k.appendChild(z)}}},Zt=(t,r,l,v)=>{for(var E={},S=0;S<r.length;S++)E[r[S]]=l[S];(it||=[]).push([t,E,r]),$e||={},at(r[v],1)};Zt(import.meta.url,["sczw625q","5dpwazvw","yyq5kx77"],[["./editor.js",2],["./chunk-preview.js",2],["./chunk-editor.js"]],0);
function st(t){let r=[],l=new Map;for(let E of t){let S=l.get(E.key);if(S){S.values.push(...E.values);continue}r.push(E.key),l.set(E.key,{key:E.key,rawKey:E.rawKey,values:[...E.values]})}return r.map((E)=>l.get(E)).filter((E)=>E!==void 0).sort((E,S)=>m(E.key)-m(S.key))}function Be(t,r){let l="",v=0;while(v<t.length){let E=t.charAt(v);if(E==="\\"){l+=t.slice(v,v+2),v+=2;continue}if(t.startsWith(r,v)){l+=`\\${r}`,v+=r.length;continue}l+=E,v+=1}return l}function j(t,r){let l=y(t.key),v=l!==void 0&&P(l.key),E=t.values.filter((S)=>S.length>0);if(E.length===0)return[];if(v){let S=E.map((q)=>Be(q,r.inlineList)).join(` ${r.inlineList} `);return[`${t.rawKey} ${r.pairing} ${S}`]}return E.map((S)=>`${t.rawKey} ${r.pairing} ${Be(S,r.pairing)}`)}function en(t){return t.attributes.find((l)=>l.key==="Type")?.values.some((l)=>l.trim().toLowerCase()==="section")??!1}function tn(t,r){let l=st(t.attributes),v=[],E=l.find((k)=>k.key==="Question"),S=l.filter((k)=>k.key!=="Question"),q=l.find((k)=>k.key==="Type"),F=q?.values[0]?.trim().toLowerCase();if(q!==void 0&&(F==="start"||F==="end")){if(v.push(...j(q,r)),E!==void 0)v.push(...j(E,r));for(let k of S){if(k.key==="Type")continue;v.push(...j(k,r))}return v}if(en(t)&&E!==void 0&&E.values.length===1){let k=E.values[0]??"";v.push(`${r.section} ${Be(k,r.section)}`);for(let M of S){if(M.key==="Type")continue;v.push(...j(M,r))}return v}if(E!==void 0)v.push(...j(E,r));for(let k of S)v.push(...j(k,r));return v}function dt(t){let r=R.findIndex((l)=>l.toLowerCase()===t.toLowerCase());return r>=0?r:R.length+m(t)}function We(t,r={}){let l=h(r.symbols),v=[];if(r.header!==!1){let E=st(t.header).sort((k,M)=>dt(k.key)-dt(M.key)),S=E.find((k)=>k.key==="Title"),q=[],F=S?.values[0]?.trim()??"";if(F.length>0)q.push(`${l.title} ${F}`);for(let k of E){if(k.key==="Title")continue;q.push(...j(k,l))}if(q.length>0)v.push(q.join(`
`))}for(let E of t.questions){let S=tn(E,l);if(S.length>0)v.push(S.join(`
`))}return`${v.join(`

`)}
`}var lt={file:"<wizard>",line:1,column:1},Q="";function ee(t){return t.split(/\r?\n/)}function nn(t){let r=Number.POSITIVE_INFINITY;for(let l of t.attributes)r=Math.min(r,l.location.line);return Number.isFinite(r)?r:1}function U(t){let r=T(t),l=ee(t).length,v=r.document.questions.map(nn),E=v.map((M,H)=>({start:M,end:(v[H+1]??l+1)-1})),S=v[0],q=S===void 0?l:S-1,F=ue(t,{start:1,end:q}),k=r.document.header.length>0&&F.trim().length>0;return{document:r.document,diagnostics:r.diagnostics,header:k?{start:1,end:q}:null,blocks:E}}function ue(t,r){return ee(t).slice(r.start-1,r.end).join(`
`)}function pe(t,r){return r.header===null?Q:ue(t,r.header).trim()}function ae(t,r,l){let v=r.blocks[l];return v===void 0?Q:ue(t,v).trim()}function te(t,r){return r.blocks.map((l)=>ue(t,l).trim())}function Z(t){let r=[];for(let l of ee(t)){let v=l.replace(/[ \t]+$/,Q),E=r[r.length-1];if(v.length===0&&(E===void 0||E===Q))continue;r.push(v)}while(r[r.length-1]===Q)r.pop();return`${r.join(`
`)}
`}function Xe(t,r){return t.filter((l)=>l.key===r).flatMap((l)=>[...l.values])}function ce(t,r){return Xe(t,r)[0]}function rn(t,r){return t.find((l)=>l.key===r)?.location??lt}function ut(t,r,l){let v=t.filter((E)=>E.key!==r);if(l.length===0)return v;return[...v,{key:r,rawKey:r,values:[...l],location:rn(t,r)}]}function pt(t,r,l){let v=y(r)?.key??r;return ut(t,v,l)}function ct(t,r,l){let v=A(r)??r;return ut(t,v,l)}function mt(t,r){return t.document.questions[r]?.attributes??[]}function ft(t,r=lt){return We({header:[],questions:[{attributes:t,location:r}]},{header:!1}).replace(/\n+$/,Q)}function ht(t){return We({header:t,questions:[]}).replace(/\n+$/,Q)}function gt(t){let r=t.replace(/^\n+/,Q).replace(/\n+$/,Q);return r.length===0?[]:ee(r)}function me(t,r,l){let v=U(t),E=v.blocks[r];if(E===void 0)return t;let S=ee(t),q=gt(l);if(q.length>0&&r<v.blocks.length-1)q.push(Q);return S.splice(E.start-1,E.end-E.start+1,...q),Z(S.join(`
`))}function fe(t,r){let l=U(t),v=ee(t),E=gt(r);if(l.header===null){if(E.length===0)return Z(t);return v.splice(0,0,...E,Q),Z(v.join(`
`))}v.splice(l.header.start-1,l.header.end-l.header.start+1,...E);let S=l.header.start-1+E.length;if(E.length>0&&S<v.length)v.splice(S,0,Q);return Z(v.join(`
`))}function ne(t,r){let l=U(t),E=[pe(t,l),...r.map((S)=>S.trim())].filter((S)=>S.length>0);return Z(E.join(`

`))}var Se;((S)=>{S.Header="header";S.Start="start";S.Round="round";S.Question="question";S.End="end"})(Se||={});var qe={["header"]:"Header",["start"]:"Start",["round"]:"Round",["question"]:"Question",["end"]:"End"},K=-1,bt=64,on="…",an={start:"start",end:"end",section:"round"};function vt(t){let r=d(i(t).nodes).trim();return r.length>bt?`${r.slice(0,bt-1)}${on}`:r}function dn(t){let r=t.document.header;return vt(ce(r,"Title")??ce(r,"Quiz")??"")}function yt(t,r){if(r<0){let v=t.header?.end??0;return t.diagnostics.filter((E)=>E.location===void 0||E.location.line>=1&&E.location.line<=v)}let l=t.blocks[r];if(l===void 0)return[];return t.diagnostics.filter((v)=>v.location!==void 0&&v.location.line>=l.start&&v.location.line<=l.end)}function sn(t){return vt(ce(t,"Question")??"")}function he(t){let r=[{index:K,kind:"header",label:dn(t)||"Quiz settings",type:"header",round:null,problems:yt(t,K)}],l=null;return t.document.questions.forEach((v,E)=>{let S=(ce(v.attributes,"Type")??"open").toLowerCase(),q=an[S]??"question",F=sn(v.attributes)||"(no text)";if(q==="round")l=F;r.push({index:E,kind:q,label:F,type:S,round:q==="round"?null:l,problems:yt(t,E)})}),r}function Qe(t,r){return t.find((l)=>l.index===r)}function Je(t){return t.problems.filter((r)=>r.severity==="error"||r.severity==="warning").length}var xe=`# Untitled quiz

## Round one

### What do you call a group of flamingos?

Type => Choice
Answers => A flamboyance | A flock | A wiggle
Correct => A flamboyance
`,ln=100;class ke{text;doc;slides;selected;note=null;past=[];future=[];cached;listeners=new Set;constructor(t=xe){this.text=t,this.doc=U(t),this.slides=he(this.doc),this.selected=this.doc.blocks.length>0?0:K,this.cached=this.build()}build(){return{text:this.text,doc:this.doc,slides:this.slides,selected:this.selected,note:this.note,canUndo:this.past.length>0,canRedo:this.future.length>0}}snapshot(){return this.cached}subscribe(t){return this.listeners.add(t),()=>{this.listeners.delete(t)}}notify(){this.cached=this.build();for(let t of[...this.listeners])t()}refresh(t,r){this.text=t,this.doc=U(t),this.slides=he(this.doc);let l=r??this.selected,v=this.doc.blocks.length-1;this.selected=Math.min(Math.max(l,K),v)}update(t,r){if(t===this.text){if(r!==void 0&&r!==this.selected)this.selected=r,this.notify();return}if(this.past.push(this.text),this.past.length>ln)this.past.shift();this.future=[],this.refresh(t,r),this.notify()}select(t){let r=this.doc.blocks.length-1,l=Math.min(Math.max(t,K),r);if(l===this.selected)return;this.selected=l,this.notify()}say(t){this.note=t,this.notify()}reset(t){this.past=[],this.future=[],this.selected=0,this.refresh(t,0),this.say(null)}undo(){let t=this.past.pop();if(t===void 0)return;this.future.push(this.text),this.refresh(t),this.notify()}redo(){let t=this.future.pop();if(t===void 0)return;this.past.push(this.text),this.refresh(t),this.notify()}destroy(){this.listeners.clear(),this.past=[],this.future=[]}}function Te(t){return new ke(t)}var wt=`
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
`;var ge=["slides","form","syntax","preview"],de={["slides"]:"Slides",["form"]:"Details",["syntax"]:"Syntax",["preview"]:"Preview"};var Ge={["slides"]:1.1,["form"]:1.8,["syntax"]:1.5,["preview"]:1.7};function un(t,r,l){return Math.min(Math.max(t,r),l)}function Et(t){return{panes:t?["slides","preview"]:["slides","form"],sizes:{}}}function Ue(t,r){let l=new Set(t);return ge.filter((v)=>l.has(v)&&(v!=="preview"||r))}function pn(t){return typeof t==="string"&&ge.some((r)=>r===t)}function cn(t){let r={};if(typeof t!=="object"||t===null)return r;let l=t;for(let v of ge){let E=l[v];if(typeof E==="number"&&Number.isFinite(E)&&E>0)r[v]=E}return r}function mn(t){try{let r=window.localStorage.getItem("pq-editor-layout");if(r===null)return null;let l=JSON.parse(r);if(typeof l!=="object"||l===null)return null;let v=l.panes;if(!Array.isArray(v))return null;let E=Ue(v.filter(pn),t);if(E.length===0)return null;return{panes:E,sizes:cn(l.sizes)}}catch{return null}}function St(t,r){let l=t.layout!==void 0?{panes:Ue(t.layout.panes,r),sizes:t.layout.sizes}:(t.rememberLayout===!1?null:mn(r))??Et(r),v=l.panes.length===0?Et(r).panes:l.panes,E=t.previewOpen===!1?v.filter((S)=>S!=="preview"):v;return{panes:E.length===0?v:E,sizes:l.sizes}}function Ve(t){try{window.localStorage.setItem("pq-editor-layout",JSON.stringify({panes:t.panes,sizes:t.sizes}))}catch{}}function be(t,r){let v=t.panes.includes(r)?t.panes.filter((E)=>E!==r):[...t.panes,r];if(v.length===0)return t;return{...t,panes:Ue(v,!0)}}function qt(t,r,l,v,E,S){let q=v+E;if(q<300)return null;let F=(t[r]??Ge[r])+(t[l]??Ge[l]),k=un(v+S,150,q-150),M=F*k/q;return{[r]:M,[l]:F-M}}function xt(t){return t.panes.map((r)=>`minmax(0, ${(t.sizes[r]??Ge[r]).toFixed(3)}fr)`).join(" ")}var Pe;((S)=>{S.Question="question";S.Choice="choice";S.Round="round";S.Start="start";S.End="end"})(Pe||={});var kt={["question"]:`Question => New question
Answers => One | Two`,["choice"]:`Question => New question
Type => Choice
Answers => One | Two
Correct => One`,["round"]:`Type => Section
Question => New round`,["start"]:`Type => Start
Question => Welcome`,["end"]:`Type => End
Question => That's all, folks!`},fn="New answer",hn="media/",Ae=[K];function gn(t,r){if(!t.includes(r))return r;let l=2;while(t.includes(`${r} ${l}`))l+=1;return`${r} ${l}`}function bn(t,r){if(r===K)return t.doc.document.header;return mt(t.doc,r)}function _(t,r,l){return Xe(bn(t,r),l)}function W(t,r,l,v){let E=t.snapshot();if(r===K){let F=ct(E.doc.document.header,l,v);t.update(fe(E.text,ht(F)));return}let S=E.doc.document.questions[r];if(S===void 0)return;let q=pt(S.attributes,l,v);t.update(me(E.text,r,ft(q,S.location)))}function re(t,r,l,v){let E=v.trim();W(t,r,l,E.length===0?[]:[E])}function Tt(t,r,l){let v=t.snapshot(),E=te(v.text,v.doc),S=Math.min(Math.max(l,0),E.length);E.splice(S,0,r),t.update(ne(v.text,E),S)}function ye(t,r){let l=t.snapshot();Tt(t,kt[r],l.selected+1)}function Fe(t,r){if(Ae.includes(r))return;let l=t.snapshot(),v=te(l.text,l.doc);if(v[r]===void 0)return;v.splice(r,1),t.update(ne(l.text,v),r-1)}function Le(t,r){if(Ae.includes(r))return;let l=t.snapshot(),v=ae(l.text,l.doc,r);if(v.length===0)return;Tt(t,v,r+1)}function oe(t,r,l){if(Ae.includes(r))return;let v=t.snapshot(),E=te(v.text,v.doc),S=r+l,q=E[r],F=E[S];if(q===void 0||F===void 0)return;E[r]=F,E[S]=q,t.update(ne(v.text,E),S)}function Ye(t,r,l){if(Ae.includes(r)||r===l)return;let v=t.snapshot(),E=te(v.text,v.doc),S=E[r];if(S===void 0||E[l]===void 0)return;E.splice(r,1),E.splice(l,0,S),t.update(ne(v.text,E),l)}function De(t,r,l){let v=t.snapshot();if(r===K){t.update(fe(v.text,l));return}let E=v.doc.blocks.length;if(t.update(me(v.text,r,l)),t.snapshot().doc.blocks.length!==E)t.say(l.trim().length===0?"Slide removed.":"That slide now holds more or fewer blocks. Check the list.")}function Re(t,r){t.update(r),t.say("Parsed the whole file.")}function Ce(t,r){let l=_(t.snapshot(),r,"Answers");W(t,r,"Answers",[...l,gn(l,fn)])}function Ie(t,r,l,v){let E=t.snapshot(),S=_(E,r,"Answers"),q=S[l];if(q===void 0||q===v)return;S[l]=v;let F=_(E,r,"Correct").map((k)=>k===q?v:k);if(W(t,r,"Answers",S),F.length>0)W(t,r,"Correct",F)}function Me(t,r,l){let v=t.snapshot(),E=_(v,r,"Answers"),S=E[l];if(S===void 0)return;E.splice(l,1),W(t,r,"Answers",E);let q=_(t.snapshot(),r,"Correct").filter((F)=>F!==S);if(q.length>0)W(t,r,"Correct",q)}function je(t,r,l,v){let E=_(t.snapshot(),r,"Answers"),S=l+v,q=E[l],F=E[S];if(q===void 0||F===void 0)return;E[l]=F,E[S]=q,W(t,r,"Answers",E)}function Oe(t,r,l){let v=_(t.snapshot(),r,"Correct"),E=v.includes(l)?v.filter((S)=>S!==l):[...v,l];W(t,r,"Correct",E)}function se(t,r,l){let v=_(t.snapshot(),r,"Media");W(t,r,"Media",[...v,l.trim().length===0?hn:l.trim()])}function ze(t,r,l){let v=_(t.snapshot(),r,"Media");if(v[l]===void 0)return;v.splice(l,1),W(t,r,"Media",v)}function Ze(t,r,l,v){let E=_(t.snapshot(),r,"Media");if(E[l]===void 0)return;E[l]=v,W(t,r,"Media",E)}function et(t,r,l,v){let E=_(t.snapshot(),r,"Media"),S=l+v,q=E[l],F=E[S];if(q===void 0||F===void 0)return;E[l]=F,E[S]=q,W(t,r,"Media",E)}var Pt={Question:"Starts a question block.",Type:"What kind of question this is.",Answers:"Options or expected answers.",Correct:"Which answers count. Defaults to the first, or to all for list, sort, match and cloze.",Range:"Error margin. Implies Type => Range.",ID:"Stable reference for translations, storage and flow.",Section:"Assign this question to a round.",PlaceAt:"Rounds only: fix this round at a position, counting from one.",PlaceBefore:"Put this block before the given IDs.",PlaceAfter:"Put this block after the given IDs.",AnswersOrder:"Keep or shuffle the answers.",MediaOrder:"Keep or shuffle the media.",Buttons:"Start and End screens: which buttons to show, in order.",Timer:"Time limit. 90, 1:30 and 1m30s all work.",Media:"A file to show, play or link.",Category:"Topic tags.",Author:"Who wrote it.",Score:"Points for a correct answer.",Scoring:"How points are awarded: all-or-nothing, partial or per-correct.",Grading:"How strictly text answers are compared: exact, normalized or fuzzy.",FuzzyDistance:"Maximum edit distance for fuzzy grading.",AlsoAccept:"Equivalent answers.",Reject:"Explicitly wrong answers. Beats fuzzy.",Explanation:"Shown after the reveal and in the results.",Comment:"Shown to players.",Hints:"Revealed one at a time.",Sources:"Where the answer comes from.",Description:"Screen-reader summary.",Alt:"Fallback alt text for media.",Variant:"Tag for a short or alternate version.",SyncAll:"Copy missing properties from the other language.",Secret:"Rounds only: hidden theme.",FormatText:"Parse inline formatting.",HiddenAtPlay:"Skip this block during play.",HiddenAtExport:"Leave this block out of exports.",Class:"Extra CSS classes on the screen.",Layout:"Named layout. CSS does the rest.",Background:"color:..., image:..., gradient:..., none.",ColorScheme:"Named color scheme.",Transition:"Screen enter animation.",Reveal:"Answer reveal animation.",Steps:"Reveal one part at a time: media, question, answers, comments, hints, sources, explanation, or all. An animation name between two parts sets the transition for what follows.",StepTransition:"Default animation between steps. Fade when nobody says.",Print:"hide, background, no-background, notes.",Direction:"Text direction: auto, ltr or rtl.",Height:"Height for a custom script widget.",PrintFallback:"Static text for print when a widget cannot be printed.",Credits:"End screen: who made this quiz.",Language:"Content language code.",Translation:"Explicit link to another language.",Unlock:"Round ID this block waits for.",When:"Tiny condition grammar. No eval.",Continue:"When the player may move on.",Include:"Path[#selector] to merge before planning.",Script:"Sandboxed widget file.",Wager:"Bet up to your score, never more than the question's points. Right wins the stake, wrong loses it, and a score never goes below zero."};var yn={text:"text",list:"list",number:"number",boolean:"boolean",enum:"enum",duration:"duration",media:"media"},vn={Type:g,Scoring:["all-or-nothing","partial","per-correct"],Grading:["exact","normalized","fuzzy"],AnswersOrder:["keep","shuffle"],MediaOrder:["keep","shuffle"],Layout:["viewport","inline","center","compact","quote","full-bleed"],Direction:["auto","ltr","rtl"],Continue:["always","onCorrect","onWrong"]},wn=new Set(["Question","Type","Answers","Correct","Media"]),At=[{group:"content",label:"Content"},{group:"display",label:"Display"},{group:"meta",label:"Meta"},{group:"flow",label:"Flow"}],En=L().filter((t)=>!wn.has(t.key)).map((t)=>({key:t.key,label:t.key,kind:yn[t.type],group:t.group,description:Pt[t.key]??"",options:vn[t.key]??[]})).sort((t,r)=>m(t.key)-m(r.key));function Ft(t){return En.filter((r)=>r.group===t)}var Lt=[{key:"Description",label:"Description",kind:"text",description:"One line about the quiz."},{key:"Author",label:"Author",kind:"list",description:"Who wrote it."},{key:"Theme",label:"Theme",kind:"text",description:"A theme folder name, or a path to one."},{key:"Language",label:"Language",kind:"text",description:"Two-letter code for the content language."},{key:"Languages",label:"Languages",kind:"text",description:"Every language the quiz ships in, separated by a bar."},{key:"Date",label:"Date",kind:"text",description:"When the quiz is for."},{key:"Seed",label:"Seed",kind:"text",description:"Same seed, same shuffle, every time."}];function ve({id:t,values:r,correct:l,onToggleCorrect:v,onChange:E,onAdd:S,onRemove:q,onMove:F,addLabel:k,emptyText:M,extra:H}){let I=l!==void 0&&v!==void 0?{correct:l,onToggleCorrect:v}:null,z=(D,C)=>{if(!D.altKey)return;if(D.key!=="ArrowUp"&&D.key!=="ArrowDown")return;D.preventDefault(),F(C,D.key==="ArrowUp"?-1:1)};return e("div",{class:"pq-editor-list-editor",children:[r.length===0?e("p",{class:"pq-editor-hint",children:M},void 0,!1,void 0,this):null,e("ul",{class:"pq-editor-list",children:r.map((D,C)=>e("li",{class:"pq-editor-row",children:[I===null?null:e("input",{type:"checkbox",id:`${t}-correct-${C}`,checked:I.correct.includes(D),onChange:()=>I.onToggleCorrect(D),"aria-label":`Correct: ${D}`,title:"Mark as correct"},void 0,!1,void 0,this),e(ie,{id:`${t}-value-${C}`,value:D,onCommit:(N)=>E(C,N)},void 0,!1,void 0,this),e("button",{type:"button",onClick:()=>F(C,-1),disabled:C===0,"aria-label":`Move ${D} up`,onKeyDown:(N)=>{z(N,C)},children:"↑"},void 0,!1,void 0,this),e("button",{type:"button",onClick:()=>F(C,1),disabled:C===r.length-1,"aria-label":`Move ${D} down`,onKeyDown:(N)=>{z(N,C)},children:"↓"},void 0,!1,void 0,this),e("button",{type:"button",onClick:()=>q(C),"aria-label":`Remove ${D}`,children:"×"},void 0,!1,void 0,this)]},`${t}-${C}`,!0,void 0,this))},void 0,!1,void 0,this),e("div",{class:"pq-editor-actions",children:[e("button",{type:"button",onClick:S,children:k},void 0,!1,void 0,this),H??null]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)}function V({id:t,label:r,description:l,children:v}){let E=a(null),[S,q]=n(!1),F=l!==void 0&&l.length>0;return e("div",{ref:E,class:F?"pq-editor-field pq-editor-has-note":"pq-editor-field",onPointerEnter:()=>q(F),onPointerLeave:()=>q(!1),onFocusIn:()=>q(F),onFocusOut:()=>q(!1),children:[e("label",{class:"pq-editor-label",for:t,children:r},void 0,!1,void 0,this),v,S&&F?e(w,{anchor:E,text:l,class:"pq-editor-bubble",onClose:()=>q(!1)},void 0,!1,void 0,this):null]},void 0,!0,void 0,this)}function ie(t){let[r,l]=n(t.value);s(()=>{l(t.value)},[t.value]);let v=()=>{if(r!==t.value)t.onCommit(r)},E=(F)=>{let k=F.target;if(k instanceof HTMLInputElement||k instanceof HTMLTextAreaElement)l(k.value)},S=(F)=>{if(F.key!=="Enter")return;let k=F.target;if(k instanceof HTMLInputElement)k.blur()};if(t.multiline===!0)return e("textarea",{id:t.id,class:"pq-editor-input",rows:t.rows??3,value:r,placeholder:t.placeholder??"",onInput:E,onBlur:v},void 0,!1,void 0,this);let q={id:t.id,class:"pq-editor-input",value:r,placeholder:t.placeholder??"",autocomplete:"off",onInput:E,onBlur:v,onKeyDown:S};if(t.numeric===!0)return e("input",{...q,type:"number"},void 0,!1,void 0,this);return e("input",{...q,type:"text"},void 0,!1,void 0,this)}function He({id:t,value:r,options:l,onChange:v,emptyLabel:E}){let S=r.length===0||l.includes(r)?l:[r,...l];return e("select",{id:t,class:"pq-editor-input",value:r,onChange:(q)=>v(q.currentTarget.value),children:[e("option",{value:"",children:E??"(default)"},void 0,!1,void 0,this),S.map((q)=>e("option",{value:q,children:q},q,!1,void 0,this))]},void 0,!0,void 0,this)}function tt({field:t,values:r,onChange:l}){let v=`pq-editor-field-${t.key}`,E=r[0]??"",S=(k)=>{let M=k.trim();l(M.length===0?[]:[M])},q=(()=>e(ve,{id:v,values:r,onChange:(H,I)=>{let z=[...r];z[H]=I,l(z)},onAdd:()=>l([...r,""]),onRemove:(H)=>{let I=[...r];I.splice(H,1),l(I)},onMove:(H,I)=>{let z=[...r],D=H+I,C=z[H],N=z[D];if(C===void 0||N===void 0)return;z[H]=N,z[D]=C,l(z)},addLabel:`Add ${t.label.toLowerCase()}`,emptyText:"Nothing yet."},void 0,!1,void 0,this))(),F=(()=>{if(t.kind==="boolean")return e(He,{id:v,value:E,options:["true","false"],onChange:(k)=>S(k)},void 0,!1,void 0,this);if(t.kind==="enum"&&(t.options??[]).length>0)return e(He,{id:v,value:E,options:t.options??[],onChange:(k)=>S(k)},void 0,!1,void 0,this);return e(ie,{id:v,value:E,numeric:t.kind==="number",placeholder:t.kind==="duration"?"90, 1:30, 1m30s":"",onCommit:S},void 0,!1,void 0,this)})();return e(V,{id:v,label:t.label,description:t.description,children:t.kind==="list"?q:F},void 0,!1,void 0,this)}var Dt=0;function Sn(){return Dt+=1,`pq-editor-bubble-${Dt}`}function le({label:t,note:r}){let l=a(null),v=u(Sn,[]),[E,S]=n(!1);return e(o,{children:[e("h2",{ref:l,class:"pq-editor-has-note","aria-describedby":E?v:void 0,onPointerEnter:()=>S(!0),onPointerLeave:()=>S(!1),children:[t,e("span",{class:"pq-editor-ask","aria-hidden":"true",children:"?"},void 0,!1,void 0,this)]},void 0,!0,void 0,this),E?e(w,{anchor:l,text:r,id:v,class:"pq-editor-bubble",onClose:()=>S(!1)},void 0,!1,void 0,this):null]},void 0,!0,void 0,this)}var Ne=new Set(["section","start","end"]),qn=new Set([...Ne,"custom"]),xn=g.filter((t)=>t!=="open"),kn={open:"One accepted answer per row. AlsoAccept adds alternatives.",choice:"Tick every option that counts as correct.",list:"Tick the answers a player must give, in any order.",sort:"Write them in the right order. The player sorts them.",range:"The expected number. Range sets the margin.",match:"Write each pair as Left ~ Right.",cloze:"One answer per [blank], or groups split by ||."};function Tn(t){if(t==="section")return"Round name";if(Ne.has(t))return"Screen text";return"Question text"}function Pn(t){if(t==="section")return"The heading on its own screen at the start of the round.";if(Ne.has(t))return"The big line. Inline formatting works.";return"Inline formatting works. [blank] is a cloze gap."}function Rt({store:t,snapshot:r,options:l}){if(r.selected===K)return e(An,{store:t,snapshot:r},void 0,!1,void 0,this);return e(Fn,{store:t,snapshot:r,options:l,index:r.selected},r.selected,!1,void 0,this)}function An({store:t,snapshot:r}){let l=r.slides.length===1;return e("section",{class:"pq-editor-panel","aria-label":"Quiz settings",children:[e(le,{label:"Quiz settings",note:"These lines sit above the first question. Empty a field to drop its line."},void 0,!1,void 0,this),Lt.map((v)=>e(tt,{field:v,values:_(r,K,v.key),onChange:(E)=>W(t,K,v.key,E)},v.key,!1,void 0,this)),l?e("p",{class:"pq-editor-hint",children:["No slides yet. Use ",e("strong",{children:"+ Question"},void 0,!1,void 0,this)," in the toolbar."]},void 0,!0,void 0,this):null]},void 0,!0,void 0,this)}function Fn({store:t,snapshot:r,options:l,index:v}){let E=Qe(r.slides,v),S=_(r,v,"Type")[0]?.toLowerCase()??"open",q=_(r,v,"Question")[0]??"",F=_(r,v,"Answers"),k=_(r,v,"Correct"),M=_(r,v,"Media"),H=Ne.has(S),I=!qn.has(S),z=()=>{let D=l.onPickMedia;if(D===void 0){se(t,v,"");return}D().then((C)=>{if(C===null)return;se(t,v,C.name),t.say(C.copied?`Copied ${C.name} into media/.`:`${C.name} is only a path. Put the file next to the quiz.`)})};return e("section",{class:"pq-editor-panel","aria-label":"Slide editor",children:[e("div",{class:"pq-editor-panel-head",children:[e("h2",{children:[e("span",{class:"pq-editor-kind",children:E===void 0?"Slide":qe[E.kind]},void 0,!1,void 0,this),E?.label??"Slide"]},void 0,!0,void 0,this),e("div",{class:"pq-editor-actions",children:[e("button",{type:"button",class:"pq-editor-button",onClick:()=>oe(t,v,-1),disabled:v===0,title:"Alt+↑",children:"↑"},void 0,!1,void 0,this),e("button",{type:"button",class:"pq-editor-button",onClick:()=>oe(t,v,1),disabled:v>=r.slides.length-2,title:"Alt+↓",children:"↓"},void 0,!1,void 0,this),e("button",{type:"button",class:"pq-editor-button",onClick:()=>Le(t,v),children:"Duplicate"},void 0,!1,void 0,this),e("button",{type:"button",class:"pq-editor-button",onClick:()=>Fe(t,v),children:"Remove"},void 0,!1,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this),e(V,{id:"pq-editor-question",label:Tn(S),description:Pn(S),children:e(ie,{id:"pq-editor-question",value:q,multiline:!0,rows:3,onCommit:(D)=>re(t,v,"Question",D)},void 0,!1,void 0,this)},void 0,!1,void 0,this),e(V,{id:"pq-editor-type",label:"Type",description:"Open asks for typed text. The rest show answer cards.",children:e(He,{id:"pq-editor-type",value:S==="open"?"":S,options:xn,emptyLabel:"open (default)",onChange:(D)=>re(t,v,"Type",D)},void 0,!1,void 0,this)},void 0,!1,void 0,this),H?null:e(V,{id:"pq-editor-answers",label:"Answers",description:kn[S]??"",children:e(ve,{id:"pq-editor-answers",values:F,...I?{correct:k,onToggleCorrect:(D)=>Oe(t,v,D)}:{},onChange:(D,C)=>Ie(t,v,D,C),onAdd:()=>Ce(t,v),onRemove:(D)=>Me(t,v,D),onMove:(D,C)=>je(t,v,D,C),addLabel:"Add answer",emptyText:"Open questions can skip this."},void 0,!1,void 0,this)},void 0,!1,void 0,this),e(V,{id:"pq-editor-media",label:"Media",description:"Pick a file to copy it into media/. Any path works too.",children:e(ve,{id:"pq-editor-media",values:M,onChange:(D,C)=>Ze(t,v,D,C),onAdd:z,onRemove:(D)=>ze(t,v,D),onMove:(D,C)=>et(t,v,D,C),addLabel:"Add file",emptyText:"No media on this slide.",extra:e("button",{type:"button",class:"pq-editor-button",onClick:()=>se(t,v,""),children:"Add path"},void 0,!1,void 0,this)},void 0,!1,void 0,this)},void 0,!1,void 0,this),At.map(({group:D,label:C})=>{let N=Ft(D);if(N.length===0)return null;return e("details",{class:"pq-editor-more",children:[e("summary",{children:C},void 0,!1,void 0,this),e("div",{class:"pq-editor-more-body",children:N.map((J)=>e(tt,{field:J,values:_(r,v,J.key),onChange:(G)=>W(t,v,J.key,G)},J.key,!1,void 0,this))},void 0,!1,void 0,this)]},D,!0,void 0,this)})]},void 0,!0,void 0,this)}var Ln=400,Dn=2.5,Rn=0.004;function Cn(t,r){let l=r.querySelector(".pq-quiz");if(l===null)return;let{clientWidth:v,clientHeight:E}=t;if(v<8||E<8)return;let S=v*Dn,q=(k)=>Math.min(S,v/Math.max(k,0.01)),F=1;for(let k=0;k<3;k+=1){l.style.width=`${q(F)}px`;let M=l.offsetHeight;if(M<=0)return;let H=Math.min(1,E/M),I=Math.abs(H-F)<Rn;if(F=H,I)break}l.style.width=`${q(F)}px`,r.style.transform=`scale(${F})`}function Ct({text:t,preview:r,place:l}){let v=a(null),E=a(null),S=a(null),q=a(r),F=a(t),k=a(l);q.current=r,k.current=l;let M=()=>{if(v.current!==null&&E.current!==null)Cn(v.current,E.current)};s(()=>{let D=E.current;if(D===null)return;let C=q.current(t,D);S.current=C;let N=window.setTimeout(M,0);return()=>{window.clearTimeout(N),S.current=null,C.destroy(),D.replaceChildren()}},[]),s(()=>{if(t===F.current)return;let D=setTimeout(()=>{F.current=t,S.current?.load(t)},Ln);return()=>clearTimeout(D)},[t]);let H=l?.kind,I=l?.index,z=l?.line;return s(()=>{let D=k.current;if(D===null)return;S.current?.show?.(D)},[H,I,z]),s(()=>{let D=v.current,C=E.current;if(D===null||C===null)return;let N=0,J=()=>{if(N!==0)return;N=window.setTimeout(()=>{N=0,M()},0)},G=typeof ResizeObserver>"u"?null:new ResizeObserver(J);G?.observe(D);let x=typeof MutationObserver>"u"?null:new MutationObserver(J);return x?.observe(C,{childList:!0,subtree:!0}),()=>{if(N!==0)window.clearTimeout(N);G?.disconnect(),x?.disconnect()}},[]),e("section",{class:"pq-editor-panel pq-editor-preview","aria-label":"Preview",children:[e("h2",{children:"Preview"},void 0,!1,void 0,this),e("div",{class:"pq-editor-stage",ref:v,children:e("div",{class:"pq-editor-preview-host",ref:E},void 0,!1,void 0,this)},void 0,!1,void 0,this)]},void 0,!0,void 0,this)}function It(t,r){return`${t} ${r}${t===1?"":"s"}`}function In(t){if(t.kind==="round")return 1;if(t.kind==="question")return t.round===null?1:2;return 0}function Mt({store:t,snapshot:r,onSelect:l}){let v=a(new Map),E=a(null),[S,q]=n(null),[F,k]=n(null);s(()=>{let x=E.current;if(x===null)return;E.current=null,v.current.get(x)?.focus()},[r.slides]);let M=(x,O)=>{E.current=x+O,oe(t,x,O)},H=(x,O)=>{if(!x.altKey)return;if(x.key!=="ArrowUp"&&x.key!=="ArrowDown")return;x.preventDefault(),M(O,x.key==="ArrowUp"?-1:1)},I=()=>{q(null),k(null)},z=(x)=>(O)=>{if(O.dataTransfer!==null)O.dataTransfer.effectAllowed="move",O.dataTransfer.setData("text/plain",String(x));q(x),k(x)},D=(x)=>(O)=>{if(S===null||S===x)return;if(O.preventDefault(),O.dataTransfer!==null)O.dataTransfer.dropEffect="move";k(x)},C=(x)=>(O)=>{O.preventDefault();let B=S;if(I(),B===null||B===x)return;E.current=x,Ye(t,B,x)},N=r.slides.filter((x)=>x.kind==="question").length,J=r.slides.filter((x)=>x.kind==="round").length,G=r.slides[r.slides.length-1]?.index??-1;return e("nav",{class:"pq-editor-panel pq-editor-slide-list","aria-label":"Slides",children:[e(le,{label:"Slides",note:"Drag a slide, or Alt+↑ and Alt+↓. The quiz header stays put."},void 0,!1,void 0,this),e("ol",{class:"pq-editor-slides",children:r.slides.map((x)=>{let O=x.index===r.selected,B=Je(x),X=x.kind==="header",we=S!==null&&F===x.index&&!X;return e("li",{class:"pq-editor-slide-item","data-depth":In(x),"data-dragging":S===x.index?"true":void 0,"data-drop":we&&S!==x.index?"true":void 0,draggable:X?void 0:!0,onDragStart:X?void 0:z(x.index),onDragOver:X?void 0:D(x.index),onDrop:X?void 0:C(x.index),onDragEnd:X?void 0:I,children:e("div",{class:"pq-editor-slide-row","data-current":O?"true":void 0,children:[e("button",{type:"button",class:"pq-editor-slide","aria-current":O?"true":void 0,ref:(Y)=>{if(Y===null){v.current.delete(x.index);return}v.current.set(x.index,Y)},onClick:()=>l(x.index),onKeyDown:(Y)=>H(Y,x.index),children:[e("span",{class:"pq-editor-slide-kind",children:qe[x.kind]},void 0,!1,void 0,this),e("span",{class:"pq-editor-slide-label",children:x.label},void 0,!1,void 0,this),B>0?e("span",{class:"pq-editor-badge","aria-label":`${B} problems`,children:B},void 0,!1,void 0,this):e("span",{"aria-hidden":"true"},void 0,!1,void 0,this)]},void 0,!0,void 0,this),X?null:e("span",{class:"pq-editor-move",children:[e("button",{type:"button",class:"pq-editor-move-button","aria-label":`Move "${x.label}" up`,title:"Move up",disabled:x.index<=0,onClick:()=>M(x.index,-1),children:"↑"},void 0,!1,void 0,this),e("button",{type:"button",class:"pq-editor-move-button","aria-label":`Move "${x.label}" down`,title:"Move down",disabled:x.index>=G,onClick:()=>M(x.index,1),children:"↓"},void 0,!1,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)},`slide-${x.index}`,!1,void 0,this)})},void 0,!1,void 0,this),e("p",{class:"pq-editor-hint",children:[It(N,"question")," · ",It(J,"round")]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)}var Ot="pq-editor-syntax",Mn=20;function zt({store:t,snapshot:r}){let[l,v]=n("slide"),E=On(r,l),[S,q]=n(E);s(()=>{q(E)},[E]);let F=()=>{if(S===E)return;if(l==="file"){Re(t,S);return}De(t,r.selected,S)};return e("section",{class:"pq-editor-panel","aria-label":"Trivia Syntax",children:[e(le,{label:"Trivia Syntax",note:"Edits land on blur or Apply. The text always wins: the forms are rebuilt from it."},void 0,!1,void 0,this),e("div",{class:"pq-editor-tabs",role:"tablist","aria-label":"Text scope",children:[e("button",{type:"button",role:"tab","aria-selected":l==="slide",onClick:()=>v("slide"),children:"This slide"},void 0,!1,void 0,this),e("button",{type:"button",role:"tab","aria-selected":l==="file",onClick:()=>v("file"),children:"Whole file"},void 0,!1,void 0,this)]},void 0,!0,void 0,this),e("label",{class:"pq-editor-label",for:Ot,children:l==="file"?"Every block, as written":"This block, as written"},void 0,!1,void 0,this),e("textarea",{id:Ot,class:"pq-editor-code",rows:Mn,spellcheck:!1,value:S,onInput:(k)=>q(k.currentTarget.value),onBlur:F},void 0,!1,void 0,this),e("div",{class:"pq-editor-actions",children:[e("button",{type:"button",onClick:F,children:"Apply"},void 0,!1,void 0,this),e("button",{type:"button",onClick:()=>q(E),children:"Reset"},void 0,!1,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)}function On(t,r){if(r==="file")return t.text;if(t.selected===K)return pe(t.text,t.doc);return ae(t.text,t.doc,t.selected)}var Ht="pq-editor-title";function Hn({label:t,children:r}){let l=a(null);return e("details",{class:"pq-editor-menu",ref:l,children:[e("summary",{class:"pq-editor-button",children:t},void 0,!1,void 0,this),e("div",{class:"pq-editor-menu-list",onClick:()=>{if(l.current!==null)l.current.open=!1},children:r},void 0,!1,void 0,this)]},void 0,!0,void 0,this)}function Nt({store:t,snapshot:r,options:l,panes:v,hasPreview:E,onTogglePane:S}){let q=_(r,K,"Title")[0]??_(r,K,"Quiz")[0]??"",F=(I)=>{if(I===void 0)return;I().then((z)=>{if(z===null)return;t.reset(z.text),t.say(`Opened ${z.name}.`)})},k=()=>{l.onSave?.(q,r.text),t.say("Saved. One .trivia file, nothing else.")},M=()=>{l.onSaveToFolder?.(q,r.text).then((I)=>{t.say(I?"Written to the open folder.":"No folder open. Use Save instead.")})},H=l.onOpen!==void 0||l.onOpenFolder!==void 0||l.onSaveToFolder!==void 0;return e("div",{class:"pq-editor-bar",children:[e("div",{class:"pq-editor-bar-name",children:e(V,{id:Ht,label:"Quiz title",children:e(ie,{id:Ht,value:q,placeholder:"Untitled quiz",onCommit:(I)=>re(t,K,"Title",I)},void 0,!1,void 0,this)},void 0,!1,void 0,this)},void 0,!1,void 0,this),e("div",{class:"pq-editor-groups",children:[e("div",{class:"pq-editor-group",role:"group","aria-label":"Panes",children:ge.map((I)=>{let z=v.includes(I),D=I==="preview"&&!E;return e("button",{type:"button",class:"pq-editor-pane-toggle","aria-pressed":z,disabled:D,title:D?"No preview hook on this page":`Show or hide the ${de[I]} pane`,onClick:()=>S(I),children:de[I]},I,!1,void 0,this)})},void 0,!1,void 0,this),e("div",{class:"pq-editor-group",role:"group","aria-label":"History",children:[e("button",{type:"button",class:"pq-editor-button",onClick:()=>t.undo(),disabled:!r.canUndo,title:"Ctrl+Z",children:"Undo"},void 0,!1,void 0,this),e("button",{type:"button",class:"pq-editor-button",onClick:()=>t.redo(),disabled:!r.canRedo,title:"Ctrl+Shift+Z",children:"Redo"},void 0,!1,void 0,this)]},void 0,!0,void 0,this),e("div",{class:"pq-editor-group",role:"group","aria-label":"Add a slide",children:[e("button",{type:"button",class:"pq-editor-button",onClick:()=>ye(t,"question"),title:"Insert after the selected slide",children:"+ Question"},void 0,!1,void 0,this),e("button",{type:"button",class:"pq-editor-button",onClick:()=>ye(t,"round"),title:"Insert after the selected slide",children:"+ Round"},void 0,!1,void 0,this)]},void 0,!0,void 0,this),e("div",{class:"pq-editor-group",role:"group","aria-label":"File",children:[H?e(Hn,{label:"File",children:[e("button",{type:"button",onClick:()=>t.update(xe,0),children:"New quiz"},void 0,!1,void 0,this),l.onOpen===void 0?null:e("button",{type:"button",onClick:()=>F(l.onOpen),children:"Open file…"},void 0,!1,void 0,this),l.onOpenFolder===void 0?null:e("button",{type:"button",onClick:()=>F(l.onOpenFolder),children:"Open folder…"},void 0,!1,void 0,this),l.onSaveToFolder===void 0?null:e("button",{type:"button",onClick:M,children:"Save to folder…"},void 0,!1,void 0,this)]},void 0,!0,void 0,this):null,l.onSave===void 0?null:e("button",{type:"button",class:"pq-editor-primary",onClick:k,title:"Download this quiz as a .trivia file",children:"Save"},void 0,!1,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)}function _t(t){let[r,l]=n(()=>t.snapshot());return s(()=>{let v=()=>l(t.snapshot());return v(),t.subscribe(v)},[t]),r}function Nn(t,r){switch(t){case"slides":return e(Mt,{store:r.store,snapshot:r.snapshot,onSelect:r.onSelect},void 0,!1,void 0,this);case"form":return e(Rt,{store:r.store,snapshot:r.snapshot,options:r.options},void 0,!1,void 0,this);case"syntax":return e(zt,{store:r.store,snapshot:r.snapshot},void 0,!1,void 0,this);case"preview":return r.options.preview===void 0?null:e(Ct,{text:r.snapshot.text,preview:r.options.preview,place:r.place},void 0,!1,void 0,this)}}function Kt({store:t,options:r}){let l=_t(t),v=r.preview!==void 0,E=r.rememberLayout!==!1,[S,q]=n(()=>St(r,v)),F=a(null),k=a(S);k.current=S;let M=(x)=>{if(k.current=x,q(x),E)Ve(x)},H=a(l.slides.length);s(()=>{let x=l.slides.length,O=x>H.current;if(H.current=x,!O)return;if(k.current.panes.includes("form"))return;M(be(k.current,"form"))},[l.slides.length]),s(()=>{let x=(O)=>{if(!O.ctrlKey&&!O.metaKey)return;let B=O.target;if(B instanceof HTMLElement&&(B.tagName==="INPUT"||B.tagName==="TEXTAREA"||B.isContentEditable))return;let X=O.key.toLowerCase();if(X==="z"&&!O.shiftKey){O.preventDefault(),t.undo();return}if(X==="y"||X==="z"&&O.shiftKey)O.preventDefault(),t.redo()};return window.addEventListener("keydown",x),()=>{window.removeEventListener("keydown",x)}},[t]);let I=(x)=>{let O=k.current,B=O.panes.includes("form");if(x===l.selected&&B){M(be(O,"form"));return}if(t.select(x),!B)M(be(O,"form"))},z=(x,O)=>(B)=>{let X=F.current;if(X===null)return;let we=X.querySelector(`[data-pq-pane="${x}"]`),Y=X.querySelector(`[data-pq-pane="${O}"]`);if(we===null||Y===null)return;B.preventDefault();let Ut=B.clientX,Vt=we.getBoundingClientRect(),Yt=Y.getBoundingClientRect(),nt=(jt)=>{let ot=qt(k.current.sizes,x,O,Vt.width,Yt.width,jt.clientX-Ut);if(ot===null)return;k.current={...k.current,sizes:{...k.current.sizes,...ot}},q(k.current)},rt=()=>{if(window.removeEventListener("pointermove",nt),window.removeEventListener("pointerup",rt),E)Ve(k.current)};window.addEventListener("pointermove",nt),window.addEventListener("pointerup",rt)},D=l.slides.reduce((x,O)=>x+O.problems.length,0),C=l.slides.find((x)=>x.index===l.selected),N=C?.problems[0],J=C===void 0?null:{kind:C.kind,index:C.index,line:C.index<0?0:l.doc.blocks[C.index]?.start??0},G=S.panes;return e("div",{class:"pq-editor",children:[e(Nt,{store:t,snapshot:l,options:r,panes:G,hasPreview:v,onTogglePane:(x)=>M(be(S,x))},void 0,!1,void 0,this),e("div",{ref:F,class:"pq-editor-grid",style:`--pq-ed-grid:${xt(S)}`,children:G.map((x,O)=>{let B=G[O+1];return e("div",{class:"pq-editor-cell","data-pq-pane":x,children:[Nn(x,{store:t,snapshot:l,options:r,onSelect:I,place:J}),B===void 0?null:e("div",{class:"pq-editor-grip",role:"separator","aria-orientation":"vertical","aria-label":`Resize ${de[x]} and ${de[B]}`,title:"Drag to resize. Double-click to reset.",onPointerDown:z(x,B),onDblClick:()=>M({...S,sizes:{}})},void 0,!1,void 0,this)]},x,!0,void 0,this)})},void 0,!1,void 0,this),e("div",{class:"pq-editor-status",children:[e("span",{class:D===0?"pq-editor-good":"pq-editor-bad",children:D===0?"No problems":_n(D)},void 0,!1,void 0,this),N===void 0?null:e("span",{class:"pq-editor-bad",children:[N.code," ",N.message]},void 0,!0,void 0,this),e("span",{class:"pq-editor-note-line",role:"status","aria-live":"polite",children:l.note??"Nothing saved yet."},void 0,!1,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)}function _n(t){return t===1?"1 problem":`${t} problems`}var $t="pq-editor-style";function Kn(t){if(t.getElementById($t)!==null)return;let r=t.createElement("style");r.id=$t,r.textContent=wt,t.head.append(r)}function _e(t,r={}){let l=r.store??Te(r.text),v=t.ownerDocument;if(v!==null)Kn(v);return f(b(Kt,{store:l,options:r}),t),{store:l,text:()=>l.snapshot().text,destroy(){f(null,t),l.destroy()}}}var $n="pq-trivia-wizard",Bn="media",Bt=[".trivia",".txt",".md"],Wt="text/plain",Ke=null;function Xt(){if(typeof window>"u")return;return window.showDirectoryPicker}async function Qt(){let t=Xt();if(t===void 0)return null;try{return await t.call(window,{id:$n,mode:"readwrite"})}catch{return null}}function Wn(t,r){let l=document.createElement("input");return l.type="file",l.accept=t,l.multiple=r,l}function Jt(t,r){return new Promise((l)=>{let v=Wn(t,r),E=()=>l([...v.files??[]]);v.addEventListener("change",E,{once:!0}),window.addEventListener("focus",()=>{setTimeout(()=>l([]),400)},{once:!0}),v.click()})}async function Xn(t){let r=await Promise.all(t.map(async(v)=>({name:v.name,text:await v.text()})));if(r.length===0)return null;return r.sort((v,E)=>v.name.localeCompare(E.name)),{name:r[0]?.name??"quiz.trivia",text:r.map((v)=>v.text).join(`

`)}}async function Gt(){return Xn(await Jt(Bt.join(","),!0))}async function Qn(t){let r=[];for await(let l of t.values()){if(l.kind!=="file")continue;let v=l.name.toLowerCase();if(!Bt.some((S)=>v.endsWith(S)))continue;let E=await l.getFile();r.push({name:l.name,text:await E.text()})}if(r.length===0)return null;return r.sort((l,v)=>l.name.localeCompare(v.name)),{name:`${t.name}.trivia`,text:r.map((l)=>l.text).join(`

`)}}async function Jn(){if(Xt()===void 0)return Gt();let t=await Qt();if(t===null)return null;return Ke=t,Qn(t)}async function Gn(t,r){let l=Ke??await Qt();if(l===null)return!1;Ke=l;try{let E=await(await l.getFileHandle(`${c(t)}.trivia`,{create:!0})).createWritable();return await E.write(new Blob([r],{type:Wt})),await E.close(),!0}catch{return!1}}async function Un(t){let r=Ke;if(r===null)return!1;try{let E=await(await(await r.getDirectoryHandle(Bn,{create:!0})).getFileHandle(t.name,{create:!0})).createWritable();return await E.write(t),await E.close(),!0}catch{return!1}}async function Vn(){let r=(await Jt("image/*,audio/*,video/*",!1))[0];if(r===void 0)return null;let l=await Un(r);return{name:r.name,copied:l}}function Yn(t,r){p(`${c(t)}.trivia`,r,Wt)}function jn(t,r){let l=t,v=null,E=!1,S=null;return (at("5dpwazvw"),import("./chunk-preview.js")).then(({mountPreview:q})=>{if(E)return;if(S=q(l,r,{keepHead:!0}),v!==null)S.show?.(v)}),{load(q){l=q,S?.load(q)},show(q){v=q,S?.show?.(q)},destroy(){E=!0,S?.destroy(),S=null}}}function Zn(t,r={}){return _e(t,{...r.text===void 0?{}:{text:r.text},onSave:r.onSave??Yn,onOpen:r.onOpen??Gt,onOpenFolder:Jn,onSaveToFolder:Gn,onPickMedia:Vn,preview:r.preview??jn,...r.previewOpen===void 0?{}:{previewOpen:r.previewOpen}})}if(typeof document<"u")for(let t of document.querySelectorAll("[data-pq-wizard]"))Zn(t);export{ke as EditorStore,K as HEADER_INDEX,Se as SlideKind,Pe as SlideTemplate,Ce as addAnswer,se as addMedia,ye as addSlide,ae as blockTextAt,te as blockTexts,Te as createEditorStore,Le as duplicateSlide,pe as headerText,he as listSlides,_e as mountEditor,Zn as mountQuizWizard,oe as moveSlide,U as readText,Me as removeAnswer,ze as removeMedia,Fe as removeSlide,Ie as setAnswerAt,re as setFieldValue,De as setSlideText,W as setValuesField,Re as setWholeText,Z as tidy,Oe as toggleCorrect,_ as valuesFor,me as withBlockText,ne as withBlocks,fe as withHeaderText};

//# debugId=791875A258172F1F64756E2164756E21
