/*! PQ-Trivia v3.0.0-dev.0 | editor | MIT | https://pq-trivia.dev */
import{s,d,m,A,y,T,f,I,E,h,_,b,a,g,t,o,i,u,e,w,p,c}from"./chunk-editor.js";var it,$e,Ee,at=(n,r)=>{for(var[l,v,S]of it||[])for(var q=[n],x=globalThis,F=x.document,P,C,z,R,O;C=q.pop();)if(!$e[C]&&(z=v[C])){$e[C]=1;for(R=1;R<z.length;R++)q.push(S[z[R]]);if(!r&&C!==n&&(P=F&&F.head)){if(Ee===void 0)Ee=(R=F.querySelector("meta[property=csp-nonce]"))&&(R.nonce||R.getAttribute("nonce"))||"";if(O=F.createElement("link"),O.rel="modulepreload",O.crossOrigin="",Ee)O.nonce=Ee;O.href=new x.URL(z[0],l),P.appendChild(O)}}},Zt=(n,r,l,v)=>{for(var S={},q=0;q<r.length;q++)S[r[q]]=l[q];(it||=[]).push([n,S,r]),$e||={},at(r[v],1)};Zt(import.meta.url,["kh8qwqge","84v7wec9","rh154ba0"],[["./editor.js",2],["./chunk-preview.js",2],["./chunk-editor.js"]],0);
function st(n){let r=[],l=new Map;for(let S of n){let q=l.get(S.key);if(q){q.values.push(...S.values);continue}r.push(S.key),l.set(S.key,{key:S.key,rawKey:S.rawKey,values:[...S.values]})}return r.map((S)=>l.get(S)).filter((S)=>S!==void 0).sort((S,q)=>f(S.key)-f(q.key))}function Be(n,r){let l="",v=0;while(v<n.length){let S=n.charAt(v);if(S==="\\"){l+=n.slice(v,v+2),v+=2;continue}if(n.startsWith(r,v)){l+=`\\${r}`,v+=r.length;continue}l+=S,v+=1}return l}function j(n,r){let l=y(n.key),v=l!==void 0&&E(l.key),S=n.values.filter((q)=>q.length>0);if(S.length===0)return[];if(v){let q=S.map((x)=>Be(x,r.inlineList)).join(` ${r.inlineList} `);return[`${n.rawKey} ${r.pairing} ${q}`]}return S.map((q)=>`${n.rawKey} ${r.pairing} ${Be(q,r.pairing)}`)}function en(n){return n.attributes.find((l)=>l.key==="Type")?.values.some((l)=>l.trim().toLowerCase()==="section")??!1}function tn(n,r){let l=st(n.attributes),v=[],S=l.find((P)=>P.key==="Question"),q=l.filter((P)=>P.key!=="Question"),x=l.find((P)=>P.key==="Type"),F=x?.values[0]?.trim().toLowerCase();if(x!==void 0&&(F==="start"||F==="end")){if(v.push(...j(x,r)),S!==void 0)v.push(...j(S,r));for(let P of q){if(P.key==="Type")continue;v.push(...j(P,r))}return v}if(en(n)&&S!==void 0&&S.values.length===1){let P=S.values[0]??"";v.push(`${r.section} ${Be(P,r.section)}`);for(let C of q){if(C.key==="Type")continue;v.push(...j(C,r))}return v}if(S!==void 0)v.push(...j(S,r));for(let P of q)v.push(...j(P,r));return v}function dt(n){let r=A.findIndex((l)=>l.toLowerCase()===n.toLowerCase());return r>=0?r:A.length+f(n)}function We(n,r={}){let l=h(r.symbols),v=[];if(r.header!==!1){let S=st(n.header).sort((P,C)=>dt(P.key)-dt(C.key)),q=S.find((P)=>P.key==="Title"),x=[],F=q?.values[0]?.trim()??"";if(F.length>0)x.push(`${l.title} ${F}`);for(let P of S){if(P.key==="Title")continue;x.push(...j(P,l))}if(x.length>0)v.push(x.join(`
`))}for(let S of n.questions){let q=tn(S,l);if(q.length>0)v.push(q.join(`
`))}return`${v.join(`

`)}
`}var lt={file:"<wizard>",line:1,column:1},Q="";function ee(n){return n.split(/\r?\n/)}function nn(n){let r=Number.POSITIVE_INFINITY;for(let l of n.attributes)r=Math.min(r,l.location.line);return Number.isFinite(r)?r:1}function U(n){let r=_(n),l=ee(n).length,v=r.document.questions.map(nn),S=v.map((C,z)=>({start:C,end:(v[z+1]??l+1)-1})),q=v[0],x=q===void 0?l:q-1,F=ue(n,{start:1,end:x}),P=r.document.header.length>0&&F.trim().length>0;return{document:r.document,diagnostics:r.diagnostics,header:P?{start:1,end:x}:null,blocks:S}}function ue(n,r){return ee(n).slice(r.start-1,r.end).join(`
`)}function pe(n,r){return r.header===null?Q:ue(n,r.header).trim()}function ae(n,r,l){let v=r.blocks[l];return v===void 0?Q:ue(n,v).trim()}function te(n,r){return r.blocks.map((l)=>ue(n,l).trim())}function Z(n){let r=[];for(let l of ee(n)){let v=l.replace(/[ \t]+$/,Q),S=r[r.length-1];if(v.length===0&&(S===void 0||S===Q))continue;r.push(v)}while(r[r.length-1]===Q)r.pop();return`${r.join(`
`)}
`}function Xe(n,r){return n.filter((l)=>l.key===r).flatMap((l)=>[...l.values])}function ce(n,r){return Xe(n,r)[0]}function rn(n,r){return n.find((l)=>l.key===r)?.location??lt}function ut(n,r,l){let v=n.filter((S)=>S.key!==r);if(l.length===0)return v;return[...v,{key:r,rawKey:r,values:[...l],location:rn(n,r)}]}function pt(n,r,l){let v=y(r)?.key??r;return ut(n,v,l)}function ct(n,r,l){let v=T(r)??r;return ut(n,v,l)}function mt(n,r){return n.document.questions[r]?.attributes??[]}function ft(n,r=lt){return We({header:[],questions:[{attributes:n,location:r}]},{header:!1}).replace(/\n+$/,Q)}function ht(n){return We({header:n,questions:[]}).replace(/\n+$/,Q)}function gt(n){let r=n.replace(/^\n+/,Q).replace(/\n+$/,Q);return r.length===0?[]:ee(r)}function me(n,r,l){let v=U(n),S=v.blocks[r];if(S===void 0)return n;let q=ee(n),x=gt(l);if(x.length>0&&r<v.blocks.length-1)x.push(Q);return q.splice(S.start-1,S.end-S.start+1,...x),Z(q.join(`
`))}function fe(n,r){let l=U(n),v=ee(n),S=gt(r);if(l.header===null){if(S.length===0)return Z(n);return v.splice(0,0,...S,Q),Z(v.join(`
`))}v.splice(l.header.start-1,l.header.end-l.header.start+1,...S);let q=l.header.start-1+S.length;if(S.length>0&&q<v.length)v.splice(q,0,Q);return Z(v.join(`
`))}function ne(n,r){let l=U(n),S=[pe(n,l),...r.map((q)=>q.trim())].filter((q)=>q.length>0);return Z(S.join(`

`))}var Se;((q)=>{q.Header="header";q.Start="start";q.Round="round";q.Question="question";q.End="end"})(Se||={});var qe={["header"]:"Header",["start"]:"Start",["round"]:"Round",["question"]:"Question",["end"]:"End"},K=-1,bt=64,on="…",an={start:"start",end:"end",section:"round"};function vt(n){let r=d(s(n).nodes).trim();return r.length>bt?`${r.slice(0,bt-1)}${on}`:r}function dn(n){let r=n.document.header;return vt(ce(r,"Title")??ce(r,"Quiz")??"")}function yt(n,r){if(r<0){let v=n.header?.end??0;return n.diagnostics.filter((S)=>S.location===void 0||S.location.line>=1&&S.location.line<=v)}let l=n.blocks[r];if(l===void 0)return[];return n.diagnostics.filter((v)=>v.location!==void 0&&v.location.line>=l.start&&v.location.line<=l.end)}function sn(n){return vt(ce(n,"Question")??"")}function he(n){let r=[{index:K,kind:"header",label:dn(n)||"Quiz settings",type:"header",round:null,problems:yt(n,K)}],l=null;return n.document.questions.forEach((v,S)=>{let q=(ce(v.attributes,"Type")??"open").toLowerCase(),x=an[q]??"question",F=sn(v.attributes)||"(no text)";if(x==="round")l=F;r.push({index:S,kind:x,label:F,type:q,round:x==="round"?null:l,problems:yt(n,S)})}),r}function Qe(n,r){return n.find((l)=>l.index===r)}function Je(n){return n.problems.filter((r)=>r.severity==="error"||r.severity==="warning").length}var xe=`# Untitled quiz

## Round one

### What do you call a group of flamingos?

Type => Choice
Answers => A flamboyance | A flock | A wiggle
Correct => A flamboyance
`,ln=100;class ke{text;doc;slides;selected;note=null;past=[];future=[];cached;listeners=new Set;constructor(n=xe){this.text=n,this.doc=U(n),this.slides=he(this.doc),this.selected=this.doc.blocks.length>0?0:K,this.cached=this.build()}build(){return{text:this.text,doc:this.doc,slides:this.slides,selected:this.selected,note:this.note,canUndo:this.past.length>0,canRedo:this.future.length>0}}snapshot(){return this.cached}subscribe(n){return this.listeners.add(n),()=>{this.listeners.delete(n)}}notify(){this.cached=this.build();for(let n of[...this.listeners])n()}refresh(n,r){this.text=n,this.doc=U(n),this.slides=he(this.doc);let l=r??this.selected,v=this.doc.blocks.length-1;this.selected=Math.min(Math.max(l,K),v)}update(n,r){if(n===this.text){if(r!==void 0&&r!==this.selected)this.selected=r,this.notify();return}if(this.past.push(this.text),this.past.length>ln)this.past.shift();this.future=[],this.refresh(n,r),this.notify()}select(n){let r=this.doc.blocks.length-1,l=Math.min(Math.max(n,K),r);if(l===this.selected)return;this.selected=l,this.notify()}say(n){this.note=n,this.notify()}reset(n){this.past=[],this.future=[],this.selected=0,this.refresh(n,0),this.say(null)}undo(){let n=this.past.pop();if(n===void 0)return;this.future.push(this.text),this.refresh(n),this.notify()}redo(){let n=this.future.pop();if(n===void 0)return;this.past.push(this.text),this.refresh(n),this.notify()}destroy(){this.listeners.clear(),this.past=[],this.future=[]}}function Te(n){return new ke(n)}var wt=`
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
`;var ge=["slides","form","syntax","preview"],de={["slides"]:"Slides",["form"]:"Details",["syntax"]:"Syntax",["preview"]:"Preview"};var Ge={["slides"]:1.1,["form"]:1.8,["syntax"]:1.5,["preview"]:1.7};function un(n,r,l){return Math.min(Math.max(n,r),l)}function Et(n){return{panes:n?["slides","preview"]:["slides","form"],sizes:{}}}function Ue(n,r){let l=new Set(n);return ge.filter((v)=>l.has(v)&&(v!=="preview"||r))}function pn(n){return typeof n==="string"&&ge.some((r)=>r===n)}function cn(n){let r={};if(typeof n!=="object"||n===null)return r;let l=n;for(let v of ge){let S=l[v];if(typeof S==="number"&&Number.isFinite(S)&&S>0)r[v]=S}return r}function mn(n){try{let r=window.localStorage.getItem("pq-editor-layout");if(r===null)return null;let l=JSON.parse(r);if(typeof l!=="object"||l===null)return null;let v=l.panes;if(!Array.isArray(v))return null;let S=Ue(v.filter(pn),n);if(S.length===0)return null;return{panes:S,sizes:cn(l.sizes)}}catch{return null}}function St(n,r){let l=n.layout!==void 0?{panes:Ue(n.layout.panes,r),sizes:n.layout.sizes}:(n.rememberLayout===!1?null:mn(r))??Et(r),v=l.panes.length===0?Et(r).panes:l.panes,S=n.previewOpen===!1?v.filter((q)=>q!=="preview"):v;return{panes:S.length===0?v:S,sizes:l.sizes}}function Ve(n){try{window.localStorage.setItem("pq-editor-layout",JSON.stringify({panes:n.panes,sizes:n.sizes}))}catch{}}function be(n,r){let v=n.panes.includes(r)?n.panes.filter((S)=>S!==r):[...n.panes,r];if(v.length===0)return n;return{...n,panes:Ue(v,!0)}}function qt(n,r,l,v,S,q){let x=v+S;if(x<300)return null;let F=(n[r]??Ge[r])+(n[l]??Ge[l]),P=un(v+q,150,x-150),C=F*P/x;return{[r]:C,[l]:F-C}}function xt(n){return n.panes.map((r)=>`minmax(0, ${(n.sizes[r]??Ge[r]).toFixed(3)}fr)`).join(" ")}var Pe;((q)=>{q.Question="question";q.Choice="choice";q.Round="round";q.Start="start";q.End="end"})(Pe||={});var kt={["question"]:`Question => New question
Answers => One | Two`,["choice"]:`Question => New question
Type => Choice
Answers => One | Two
Correct => One`,["round"]:`Type => Section
Question => New round`,["start"]:`Type => Start
Question => Welcome`,["end"]:`Type => End
Question => That's all, folks!`},fn="New answer",hn="media/",Ae=[K];function gn(n,r){if(!n.includes(r))return r;let l=2;while(n.includes(`${r} ${l}`))l+=1;return`${r} ${l}`}function bn(n,r){if(r===K)return n.doc.document.header;return mt(n.doc,r)}function N(n,r,l){return Xe(bn(n,r),l)}function W(n,r,l,v){let S=n.snapshot();if(r===K){let F=ct(S.doc.document.header,l,v);n.update(fe(S.text,ht(F)));return}let q=S.doc.document.questions[r];if(q===void 0)return;let x=pt(q.attributes,l,v);n.update(me(S.text,r,ft(x,q.location)))}function re(n,r,l,v){let S=v.trim();W(n,r,l,S.length===0?[]:[S])}function Tt(n,r,l){let v=n.snapshot(),S=te(v.text,v.doc),q=Math.min(Math.max(l,0),S.length);S.splice(q,0,r),n.update(ne(v.text,S),q)}function ye(n,r){let l=n.snapshot();Tt(n,kt[r],l.selected+1)}function Fe(n,r){if(Ae.includes(r))return;let l=n.snapshot(),v=te(l.text,l.doc);if(v[r]===void 0)return;v.splice(r,1),n.update(ne(l.text,v),r-1)}function Le(n,r){if(Ae.includes(r))return;let l=n.snapshot(),v=ae(l.text,l.doc,r);if(v.length===0)return;Tt(n,v,r+1)}function oe(n,r,l){if(Ae.includes(r))return;let v=n.snapshot(),S=te(v.text,v.doc),q=r+l,x=S[r],F=S[q];if(x===void 0||F===void 0)return;S[r]=F,S[q]=x,n.update(ne(v.text,S),q)}function Ye(n,r,l){if(Ae.includes(r)||r===l)return;let v=n.snapshot(),S=te(v.text,v.doc),q=S[r];if(q===void 0||S[l]===void 0)return;S.splice(r,1),S.splice(l,0,q),n.update(ne(v.text,S),l)}function De(n,r,l){let v=n.snapshot();if(r===K){n.update(fe(v.text,l));return}let S=v.doc.blocks.length;if(n.update(me(v.text,r,l)),n.snapshot().doc.blocks.length!==S)n.say(l.trim().length===0?"Slide removed.":"That slide now holds more or fewer blocks. Check the list.")}function Re(n,r){n.update(r),n.say("Parsed the whole file.")}function Ce(n,r){let l=N(n.snapshot(),r,"Answers");W(n,r,"Answers",[...l,gn(l,fn)])}function Ie(n,r,l,v){let S=n.snapshot(),q=N(S,r,"Answers"),x=q[l];if(x===void 0||x===v)return;q[l]=v;let F=N(S,r,"Correct").map((P)=>P===x?v:P);if(W(n,r,"Answers",q),F.length>0)W(n,r,"Correct",F)}function Me(n,r,l){let v=n.snapshot(),S=N(v,r,"Answers"),q=S[l];if(q===void 0)return;S.splice(l,1),W(n,r,"Answers",S);let x=N(n.snapshot(),r,"Correct").filter((F)=>F!==q);if(x.length>0)W(n,r,"Correct",x)}function je(n,r,l,v){let S=N(n.snapshot(),r,"Answers"),q=l+v,x=S[l],F=S[q];if(x===void 0||F===void 0)return;S[l]=F,S[q]=x,W(n,r,"Answers",S)}function Oe(n,r,l){let v=N(n.snapshot(),r,"Correct"),S=v.includes(l)?v.filter((q)=>q!==l):[...v,l];W(n,r,"Correct",S)}function se(n,r,l){let v=N(n.snapshot(),r,"Media");W(n,r,"Media",[...v,l.trim().length===0?hn:l.trim()])}function ze(n,r,l){let v=N(n.snapshot(),r,"Media");if(v[l]===void 0)return;v.splice(l,1),W(n,r,"Media",v)}function Ze(n,r,l,v){let S=N(n.snapshot(),r,"Media");if(S[l]===void 0)return;S[l]=v,W(n,r,"Media",S)}function et(n,r,l,v){let S=N(n.snapshot(),r,"Media"),q=l+v,x=S[l],F=S[q];if(x===void 0||F===void 0)return;S[l]=F,S[q]=x,W(n,r,"Media",S)}var Pt={Question:"Starts a question block.",Type:"What kind of question this is.",Answers:"Options or expected answers.",Correct:"Which answers count. Defaults to the first, or to all for list, sort, match and cloze.",Range:"Error margin. Implies Type => Range.",ID:"Stable reference for translations, storage and flow.",Section:"Assign this question to a round.",PlaceAt:"Rounds only: fix this round at a position, counting from one.",PlaceBefore:"Put this block before the given IDs.",PlaceAfter:"Put this block after the given IDs.",AnswersOrder:"Keep or shuffle the answers.",MediaOrder:"Keep or shuffle the media.",Buttons:"Start and End screens: which buttons to show, in order.",Timer:"Time limit. 90, 1:30 and 1m30s all work.",Media:"A file to show, play or link.",Category:"Topic tags.",Author:"Who wrote it.",Score:"Points for a correct answer.",Scoring:"How points are awarded: all-or-nothing, partial or per-correct.",Grading:"How strictly text answers are compared: exact, normalized or fuzzy.",FuzzyDistance:"Maximum edit distance for fuzzy grading.",AlsoAccept:"Equivalent answers.",Reject:"Explicitly wrong answers. Beats fuzzy.",Explanation:"Shown after the reveal and in the results.",Comment:"Shown to players.",Hints:"Revealed one at a time.",Sources:"Where the answer comes from.",Description:"Screen-reader summary.",Alt:"Fallback alt text for media.",Variant:"Tag for a short or alternate version.",SyncAll:"Copy missing properties from the other language.",Secret:"Rounds only: hidden theme.",FormatText:"Parse inline formatting.",HiddenAtPlay:"Skip this block during play.",HiddenAtExport:"Leave this block out of exports.",Class:"Extra CSS classes on the screen.",Layout:"Named layout. CSS does the rest.",Background:"color:..., image:..., gradient:..., none.",ColorScheme:"Named color scheme.",Transition:"Screen enter animation.",Reveal:"Answer reveal animation.",Steps:"Reveal one part at a time: media, question, answers, comments, hints, sources, explanation, or all. An animation name between two parts sets the transition for what follows.",StepTransition:"Default animation between steps. Fade when nobody says.",Print:"hide, background, no-background, notes.",Direction:"Text direction: auto, ltr or rtl.",Height:"Height for a custom script widget.",PrintFallback:"Static text for print when a widget cannot be printed.",Credits:"End screen: who made this quiz.",Language:"Content language code.",Translation:"Explicit link to another language.",Unlock:"Round ID this block waits for.",When:"Tiny condition grammar. No eval.",Continue:"When the player may move on.",Include:"Path[#selector] to merge before planning.",Script:"Sandboxed widget file."};var yn={text:"text",list:"list",number:"number",boolean:"boolean",enum:"enum",duration:"duration",media:"media"},vn={Type:m,Scoring:["all-or-nothing","partial","per-correct"],Grading:["exact","normalized","fuzzy"],AnswersOrder:["keep","shuffle"],MediaOrder:["keep","shuffle"],Layout:["viewport","inline","center","compact","quote","full-bleed"],Direction:["auto","ltr","rtl"],Continue:["always","onCorrect","onWrong"]},wn=new Set(["Question","Type","Answers","Correct","Media"]),At=[{group:"content",label:"Content"},{group:"display",label:"Display"},{group:"meta",label:"Meta"},{group:"flow",label:"Flow"}],En=I().filter((n)=>!wn.has(n.key)).map((n)=>({key:n.key,label:n.key,kind:yn[n.type],group:n.group,description:Pt[n.key]??"",options:vn[n.key]??[]})).sort((n,r)=>f(n.key)-f(r.key));function Ft(n){return En.filter((r)=>r.group===n)}var Lt=[{key:"Description",label:"Description",kind:"text",description:"One line about the quiz."},{key:"Author",label:"Author",kind:"list",description:"Who wrote it."},{key:"Theme",label:"Theme",kind:"text",description:"A theme folder name, or a path to one."},{key:"Language",label:"Language",kind:"text",description:"Two-letter code for the content language."},{key:"Languages",label:"Languages",kind:"text",description:"Every language the quiz ships in, separated by a bar."},{key:"Date",label:"Date",kind:"text",description:"When the quiz is for."},{key:"Seed",label:"Seed",kind:"text",description:"Same seed, same shuffle, every time."}];function ve({id:n,values:r,correct:l,onToggleCorrect:v,onChange:S,onAdd:q,onRemove:x,onMove:F,addLabel:P,emptyText:C,extra:z}){let R=l!==void 0&&v!==void 0?{correct:l,onToggleCorrect:v}:null,O=(L,D)=>{if(!L.altKey)return;if(L.key!=="ArrowUp"&&L.key!=="ArrowDown")return;L.preventDefault(),F(D,L.key==="ArrowUp"?-1:1)};return e("div",{class:"pq-editor-list-editor",children:[r.length===0?e("p",{class:"pq-editor-hint",children:C},void 0,!1,void 0,this):null,e("ul",{class:"pq-editor-list",children:r.map((L,D)=>e("li",{class:"pq-editor-row",children:[R===null?null:e("input",{type:"checkbox",id:`${n}-correct-${D}`,checked:R.correct.includes(L),onChange:()=>R.onToggleCorrect(L),"aria-label":`Correct: ${L}`,title:"Mark as correct"},void 0,!1,void 0,this),e(ie,{id:`${n}-value-${D}`,value:L,onCommit:(H)=>S(D,H)},void 0,!1,void 0,this),e("button",{type:"button",onClick:()=>F(D,-1),disabled:D===0,"aria-label":`Move ${L} up`,onKeyDown:(H)=>{O(H,D)},children:"↑"},void 0,!1,void 0,this),e("button",{type:"button",onClick:()=>F(D,1),disabled:D===r.length-1,"aria-label":`Move ${L} down`,onKeyDown:(H)=>{O(H,D)},children:"↓"},void 0,!1,void 0,this),e("button",{type:"button",onClick:()=>x(D),"aria-label":`Remove ${L}`,children:"×"},void 0,!1,void 0,this)]},`${n}-${D}`,!0,void 0,this))},void 0,!1,void 0,this),e("div",{class:"pq-editor-actions",children:[e("button",{type:"button",onClick:q,children:P},void 0,!1,void 0,this),z??null]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)}function V({id:n,label:r,description:l,children:v}){let S=i(null),[q,x]=t(!1),F=l!==void 0&&l.length>0;return e("div",{ref:S,class:F?"pq-editor-field pq-editor-has-note":"pq-editor-field",onPointerEnter:()=>x(F),onPointerLeave:()=>x(!1),onFocusIn:()=>x(F),onFocusOut:()=>x(!1),children:[e("label",{class:"pq-editor-label",for:n,children:r},void 0,!1,void 0,this),v,q&&F?e(w,{anchor:S,text:l,class:"pq-editor-bubble",onClose:()=>x(!1)},void 0,!1,void 0,this):null]},void 0,!0,void 0,this)}function ie(n){let[r,l]=t(n.value);o(()=>{l(n.value)},[n.value]);let v=()=>{if(r!==n.value)n.onCommit(r)},S=(F)=>{let P=F.target;if(P instanceof HTMLInputElement||P instanceof HTMLTextAreaElement)l(P.value)},q=(F)=>{if(F.key!=="Enter")return;let P=F.target;if(P instanceof HTMLInputElement)P.blur()};if(n.multiline===!0)return e("textarea",{id:n.id,class:"pq-editor-input",rows:n.rows??3,value:r,placeholder:n.placeholder??"",onInput:S,onBlur:v},void 0,!1,void 0,this);let x={id:n.id,class:"pq-editor-input",value:r,placeholder:n.placeholder??"",autocomplete:"off",onInput:S,onBlur:v,onKeyDown:q};if(n.numeric===!0)return e("input",{...x,type:"number"},void 0,!1,void 0,this);return e("input",{...x,type:"text"},void 0,!1,void 0,this)}function He({id:n,value:r,options:l,onChange:v,emptyLabel:S}){let q=r.length===0||l.includes(r)?l:[r,...l];return e("select",{id:n,class:"pq-editor-input",value:r,onChange:(x)=>v(x.currentTarget.value),children:[e("option",{value:"",children:S??"(default)"},void 0,!1,void 0,this),q.map((x)=>e("option",{value:x,children:x},x,!1,void 0,this))]},void 0,!0,void 0,this)}function tt({field:n,values:r,onChange:l}){let v=`pq-editor-field-${n.key}`,S=r[0]??"",q=(P)=>{let C=P.trim();l(C.length===0?[]:[C])},x=(()=>e(ve,{id:v,values:r,onChange:(z,R)=>{let O=[...r];O[z]=R,l(O)},onAdd:()=>l([...r,""]),onRemove:(z)=>{let R=[...r];R.splice(z,1),l(R)},onMove:(z,R)=>{let O=[...r],L=z+R,D=O[z],H=O[L];if(D===void 0||H===void 0)return;O[z]=H,O[L]=D,l(O)},addLabel:`Add ${n.label.toLowerCase()}`,emptyText:"Nothing yet."},void 0,!1,void 0,this))(),F=(()=>{if(n.kind==="boolean")return e(He,{id:v,value:S,options:["true","false"],onChange:(P)=>q(P)},void 0,!1,void 0,this);if(n.kind==="enum"&&(n.options??[]).length>0)return e(He,{id:v,value:S,options:n.options??[],onChange:(P)=>q(P)},void 0,!1,void 0,this);return e(ie,{id:v,value:S,numeric:n.kind==="number",placeholder:n.kind==="duration"?"90, 1:30, 1m30s":"",onCommit:q},void 0,!1,void 0,this)})();return e(V,{id:v,label:n.label,description:n.description,children:n.kind==="list"?x:F},void 0,!1,void 0,this)}var Dt=0;function Sn(){return Dt+=1,`pq-editor-bubble-${Dt}`}function le({label:n,note:r}){let l=i(null),v=u(Sn,[]),[S,q]=t(!1);return e(a,{children:[e("h2",{ref:l,class:"pq-editor-has-note","aria-describedby":S?v:void 0,onPointerEnter:()=>q(!0),onPointerLeave:()=>q(!1),children:[n,e("span",{class:"pq-editor-ask","aria-hidden":"true",children:"?"},void 0,!1,void 0,this)]},void 0,!0,void 0,this),S?e(w,{anchor:l,text:r,id:v,class:"pq-editor-bubble",onClose:()=>q(!1)},void 0,!1,void 0,this):null]},void 0,!0,void 0,this)}var Ne=new Set(["section","start","end"]),qn=new Set([...Ne,"custom"]),xn=m.filter((n)=>n!=="open"),kn={open:"One accepted answer per row. AlsoAccept adds alternatives.",choice:"Tick every option that counts as correct.",list:"Tick the answers a player must give, in any order.",sort:"Write them in the right order. The player sorts them.",range:"The expected number. Range sets the margin.",match:"Write each pair as Left ~ Right.",cloze:"One answer per [blank], or groups split by ||."};function Tn(n){if(n==="section")return"Round name";if(Ne.has(n))return"Screen text";return"Question text"}function Pn(n){if(n==="section")return"The heading on its own screen at the start of the round.";if(Ne.has(n))return"The big line. Inline formatting works.";return"Inline formatting works. [blank] is a cloze gap."}function Rt({store:n,snapshot:r,options:l}){if(r.selected===K)return e(An,{store:n,snapshot:r},void 0,!1,void 0,this);return e(Fn,{store:n,snapshot:r,options:l,index:r.selected},r.selected,!1,void 0,this)}function An({store:n,snapshot:r}){let l=r.slides.length===1;return e("section",{class:"pq-editor-panel","aria-label":"Quiz settings",children:[e(le,{label:"Quiz settings",note:"These lines sit above the first question. Empty a field to drop its line."},void 0,!1,void 0,this),Lt.map((v)=>e(tt,{field:v,values:N(r,K,v.key),onChange:(S)=>W(n,K,v.key,S)},v.key,!1,void 0,this)),l?e("p",{class:"pq-editor-hint",children:["No slides yet. Use ",e("strong",{children:"+ Question"},void 0,!1,void 0,this)," in the toolbar."]},void 0,!0,void 0,this):null]},void 0,!0,void 0,this)}function Fn({store:n,snapshot:r,options:l,index:v}){let S=Qe(r.slides,v),q=N(r,v,"Type")[0]?.toLowerCase()??"open",x=N(r,v,"Question")[0]??"",F=N(r,v,"Answers"),P=N(r,v,"Correct"),C=N(r,v,"Media"),z=Ne.has(q),R=!qn.has(q),O=()=>{let L=l.onPickMedia;if(L===void 0){se(n,v,"");return}L().then((D)=>{if(D===null)return;se(n,v,D.name),n.say(D.copied?`Copied ${D.name} into media/.`:`${D.name} is only a path. Put the file next to the quiz.`)})};return e("section",{class:"pq-editor-panel","aria-label":"Slide editor",children:[e("div",{class:"pq-editor-panel-head",children:[e("h2",{children:[e("span",{class:"pq-editor-kind",children:S===void 0?"Slide":qe[S.kind]},void 0,!1,void 0,this),S?.label??"Slide"]},void 0,!0,void 0,this),e("div",{class:"pq-editor-actions",children:[e("button",{type:"button",class:"pq-editor-button",onClick:()=>oe(n,v,-1),disabled:v===0,title:"Alt+↑",children:"↑"},void 0,!1,void 0,this),e("button",{type:"button",class:"pq-editor-button",onClick:()=>oe(n,v,1),disabled:v>=r.slides.length-2,title:"Alt+↓",children:"↓"},void 0,!1,void 0,this),e("button",{type:"button",class:"pq-editor-button",onClick:()=>Le(n,v),children:"Duplicate"},void 0,!1,void 0,this),e("button",{type:"button",class:"pq-editor-button",onClick:()=>Fe(n,v),children:"Remove"},void 0,!1,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this),e(V,{id:"pq-editor-question",label:Tn(q),description:Pn(q),children:e(ie,{id:"pq-editor-question",value:x,multiline:!0,rows:3,onCommit:(L)=>re(n,v,"Question",L)},void 0,!1,void 0,this)},void 0,!1,void 0,this),e(V,{id:"pq-editor-type",label:"Type",description:"Open asks for typed text. The rest show answer cards.",children:e(He,{id:"pq-editor-type",value:q==="open"?"":q,options:xn,emptyLabel:"open (default)",onChange:(L)=>re(n,v,"Type",L)},void 0,!1,void 0,this)},void 0,!1,void 0,this),z?null:e(V,{id:"pq-editor-answers",label:"Answers",description:kn[q]??"",children:e(ve,{id:"pq-editor-answers",values:F,...R?{correct:P,onToggleCorrect:(L)=>Oe(n,v,L)}:{},onChange:(L,D)=>Ie(n,v,L,D),onAdd:()=>Ce(n,v),onRemove:(L)=>Me(n,v,L),onMove:(L,D)=>je(n,v,L,D),addLabel:"Add answer",emptyText:"Open questions can skip this."},void 0,!1,void 0,this)},void 0,!1,void 0,this),e(V,{id:"pq-editor-media",label:"Media",description:"Pick a file to copy it into media/. Any path works too.",children:e(ve,{id:"pq-editor-media",values:C,onChange:(L,D)=>Ze(n,v,L,D),onAdd:O,onRemove:(L)=>ze(n,v,L),onMove:(L,D)=>et(n,v,L,D),addLabel:"Add file",emptyText:"No media on this slide.",extra:e("button",{type:"button",class:"pq-editor-button",onClick:()=>se(n,v,""),children:"Add path"},void 0,!1,void 0,this)},void 0,!1,void 0,this)},void 0,!1,void 0,this),At.map(({group:L,label:D})=>{let H=Ft(L);if(H.length===0)return null;return e("details",{class:"pq-editor-more",children:[e("summary",{children:D},void 0,!1,void 0,this),e("div",{class:"pq-editor-more-body",children:H.map((J)=>e(tt,{field:J,values:N(r,v,J.key),onChange:(G)=>W(n,v,J.key,G)},J.key,!1,void 0,this))},void 0,!1,void 0,this)]},L,!0,void 0,this)})]},void 0,!0,void 0,this)}var Ln=400,Dn=2.5,Rn=0.004;function Cn(n,r){let l=r.querySelector(".pq-quiz");if(l===null)return;let{clientWidth:v,clientHeight:S}=n;if(v<8||S<8)return;let q=v*Dn,x=(P)=>Math.min(q,v/Math.max(P,0.01)),F=1;for(let P=0;P<3;P+=1){l.style.width=`${x(F)}px`;let C=l.offsetHeight;if(C<=0)return;let z=Math.min(1,S/C),R=Math.abs(z-F)<Rn;if(F=z,R)break}l.style.width=`${x(F)}px`,r.style.transform=`scale(${F})`}function Ct({text:n,preview:r,place:l}){let v=i(null),S=i(null),q=i(null),x=i(r),F=i(n),P=i(l);x.current=r,P.current=l;let C=()=>{if(v.current!==null&&S.current!==null)Cn(v.current,S.current)};o(()=>{let L=S.current;if(L===null)return;let D=x.current(n,L);q.current=D;let H=window.setTimeout(C,0);return()=>{window.clearTimeout(H),q.current=null,D.destroy(),L.replaceChildren()}},[]),o(()=>{if(n===F.current)return;let L=setTimeout(()=>{F.current=n,q.current?.load(n)},Ln);return()=>clearTimeout(L)},[n]);let z=l?.kind,R=l?.index,O=l?.line;return o(()=>{let L=P.current;if(L===null)return;q.current?.show?.(L)},[z,R,O]),o(()=>{let L=v.current,D=S.current;if(L===null||D===null)return;let H=0,J=()=>{if(H!==0)return;H=window.setTimeout(()=>{H=0,C()},0)},G=typeof ResizeObserver>"u"?null:new ResizeObserver(J);G?.observe(L);let k=typeof MutationObserver>"u"?null:new MutationObserver(J);return k?.observe(D,{childList:!0,subtree:!0}),()=>{if(H!==0)window.clearTimeout(H);G?.disconnect(),k?.disconnect()}},[]),e("section",{class:"pq-editor-panel pq-editor-preview","aria-label":"Preview",children:[e("h2",{children:"Preview"},void 0,!1,void 0,this),e("div",{class:"pq-editor-stage",ref:v,children:e("div",{class:"pq-editor-preview-host",ref:S},void 0,!1,void 0,this)},void 0,!1,void 0,this)]},void 0,!0,void 0,this)}function It(n,r){return`${n} ${r}${n===1?"":"s"}`}function In(n){if(n.kind==="round")return 1;if(n.kind==="question")return n.round===null?1:2;return 0}function Mt({store:n,snapshot:r,onSelect:l}){let v=i(new Map),S=i(null),[q,x]=t(null),[F,P]=t(null);o(()=>{let k=S.current;if(k===null)return;S.current=null,v.current.get(k)?.focus()},[r.slides]);let C=(k,M)=>{S.current=k+M,oe(n,k,M)},z=(k,M)=>{if(!k.altKey)return;if(k.key!=="ArrowUp"&&k.key!=="ArrowDown")return;k.preventDefault(),C(M,k.key==="ArrowUp"?-1:1)},R=()=>{x(null),P(null)},O=(k)=>(M)=>{if(M.dataTransfer!==null)M.dataTransfer.effectAllowed="move",M.dataTransfer.setData("text/plain",String(k));x(k),P(k)},L=(k)=>(M)=>{if(q===null||q===k)return;if(M.preventDefault(),M.dataTransfer!==null)M.dataTransfer.dropEffect="move";P(k)},D=(k)=>(M)=>{M.preventDefault();let B=q;if(R(),B===null||B===k)return;S.current=k,Ye(n,B,k)},H=r.slides.filter((k)=>k.kind==="question").length,J=r.slides.filter((k)=>k.kind==="round").length,G=r.slides[r.slides.length-1]?.index??-1;return e("nav",{class:"pq-editor-panel pq-editor-slide-list","aria-label":"Slides",children:[e(le,{label:"Slides",note:"Drag a slide, or Alt+↑ and Alt+↓. The quiz header stays put."},void 0,!1,void 0,this),e("ol",{class:"pq-editor-slides",children:r.slides.map((k)=>{let M=k.index===r.selected,B=Je(k),X=k.kind==="header",we=q!==null&&F===k.index&&!X;return e("li",{class:"pq-editor-slide-item","data-depth":In(k),"data-dragging":q===k.index?"true":void 0,"data-drop":we&&q!==k.index?"true":void 0,draggable:X?void 0:!0,onDragStart:X?void 0:O(k.index),onDragOver:X?void 0:L(k.index),onDrop:X?void 0:D(k.index),onDragEnd:X?void 0:R,children:e("div",{class:"pq-editor-slide-row","data-current":M?"true":void 0,children:[e("button",{type:"button",class:"pq-editor-slide","aria-current":M?"true":void 0,ref:(Y)=>{if(Y===null){v.current.delete(k.index);return}v.current.set(k.index,Y)},onClick:()=>l(k.index),onKeyDown:(Y)=>z(Y,k.index),children:[e("span",{class:"pq-editor-slide-kind",children:qe[k.kind]},void 0,!1,void 0,this),e("span",{class:"pq-editor-slide-label",children:k.label},void 0,!1,void 0,this),B>0?e("span",{class:"pq-editor-badge","aria-label":`${B} problems`,children:B},void 0,!1,void 0,this):e("span",{"aria-hidden":"true"},void 0,!1,void 0,this)]},void 0,!0,void 0,this),X?null:e("span",{class:"pq-editor-move",children:[e("button",{type:"button",class:"pq-editor-move-button","aria-label":`Move "${k.label}" up`,title:"Move up",disabled:k.index<=0,onClick:()=>C(k.index,-1),children:"↑"},void 0,!1,void 0,this),e("button",{type:"button",class:"pq-editor-move-button","aria-label":`Move "${k.label}" down`,title:"Move down",disabled:k.index>=G,onClick:()=>C(k.index,1),children:"↓"},void 0,!1,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)},`slide-${k.index}`,!1,void 0,this)})},void 0,!1,void 0,this),e("p",{class:"pq-editor-hint",children:[It(H,"question")," · ",It(J,"round")]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)}var Ot="pq-editor-syntax",Mn=20;function zt({store:n,snapshot:r}){let[l,v]=t("slide"),S=On(r,l),[q,x]=t(S);o(()=>{x(S)},[S]);let F=()=>{if(q===S)return;if(l==="file"){Re(n,q);return}De(n,r.selected,q)};return e("section",{class:"pq-editor-panel","aria-label":"Trivia Syntax",children:[e(le,{label:"Trivia Syntax",note:"Edits land on blur or Apply. The text always wins: the forms are rebuilt from it."},void 0,!1,void 0,this),e("div",{class:"pq-editor-tabs",role:"tablist","aria-label":"Text scope",children:[e("button",{type:"button",role:"tab","aria-selected":l==="slide",onClick:()=>v("slide"),children:"This slide"},void 0,!1,void 0,this),e("button",{type:"button",role:"tab","aria-selected":l==="file",onClick:()=>v("file"),children:"Whole file"},void 0,!1,void 0,this)]},void 0,!0,void 0,this),e("label",{class:"pq-editor-label",for:Ot,children:l==="file"?"Every block, as written":"This block, as written"},void 0,!1,void 0,this),e("textarea",{id:Ot,class:"pq-editor-code",rows:Mn,spellcheck:!1,value:q,onInput:(P)=>x(P.currentTarget.value),onBlur:F},void 0,!1,void 0,this),e("div",{class:"pq-editor-actions",children:[e("button",{type:"button",onClick:F,children:"Apply"},void 0,!1,void 0,this),e("button",{type:"button",onClick:()=>x(S),children:"Reset"},void 0,!1,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)}function On(n,r){if(r==="file")return n.text;if(n.selected===K)return pe(n.text,n.doc);return ae(n.text,n.doc,n.selected)}var Ht="pq-editor-title";function Hn({label:n,children:r}){let l=i(null);return e("details",{class:"pq-editor-menu",ref:l,children:[e("summary",{class:"pq-editor-button",children:n},void 0,!1,void 0,this),e("div",{class:"pq-editor-menu-list",onClick:()=>{if(l.current!==null)l.current.open=!1},children:r},void 0,!1,void 0,this)]},void 0,!0,void 0,this)}function Nt({store:n,snapshot:r,options:l,panes:v,hasPreview:S,onTogglePane:q}){let x=N(r,K,"Title")[0]??N(r,K,"Quiz")[0]??"",F=(R)=>{if(R===void 0)return;R().then((O)=>{if(O===null)return;n.reset(O.text),n.say(`Opened ${O.name}.`)})},P=()=>{l.onSave?.(x,r.text),n.say("Saved. One .trivia file, nothing else.")},C=()=>{l.onSaveToFolder?.(x,r.text).then((R)=>{n.say(R?"Written to the open folder.":"No folder open. Use Save instead.")})},z=l.onOpen!==void 0||l.onOpenFolder!==void 0||l.onSaveToFolder!==void 0;return e("div",{class:"pq-editor-bar",children:[e("div",{class:"pq-editor-bar-name",children:e(V,{id:Ht,label:"Quiz title",children:e(ie,{id:Ht,value:x,placeholder:"Untitled quiz",onCommit:(R)=>re(n,K,"Title",R)},void 0,!1,void 0,this)},void 0,!1,void 0,this)},void 0,!1,void 0,this),e("div",{class:"pq-editor-groups",children:[e("div",{class:"pq-editor-group",role:"group","aria-label":"Panes",children:ge.map((R)=>{let O=v.includes(R),L=R==="preview"&&!S;return e("button",{type:"button",class:"pq-editor-pane-toggle","aria-pressed":O,disabled:L,title:L?"No preview hook on this page":`Show or hide the ${de[R]} pane`,onClick:()=>q(R),children:de[R]},R,!1,void 0,this)})},void 0,!1,void 0,this),e("div",{class:"pq-editor-group",role:"group","aria-label":"History",children:[e("button",{type:"button",class:"pq-editor-button",onClick:()=>n.undo(),disabled:!r.canUndo,title:"Ctrl+Z",children:"Undo"},void 0,!1,void 0,this),e("button",{type:"button",class:"pq-editor-button",onClick:()=>n.redo(),disabled:!r.canRedo,title:"Ctrl+Shift+Z",children:"Redo"},void 0,!1,void 0,this)]},void 0,!0,void 0,this),e("div",{class:"pq-editor-group",role:"group","aria-label":"Add a slide",children:[e("button",{type:"button",class:"pq-editor-button",onClick:()=>ye(n,"question"),title:"Insert after the selected slide",children:"+ Question"},void 0,!1,void 0,this),e("button",{type:"button",class:"pq-editor-button",onClick:()=>ye(n,"round"),title:"Insert after the selected slide",children:"+ Round"},void 0,!1,void 0,this)]},void 0,!0,void 0,this),e("div",{class:"pq-editor-group",role:"group","aria-label":"File",children:[z?e(Hn,{label:"File",children:[e("button",{type:"button",onClick:()=>n.update(xe,0),children:"New quiz"},void 0,!1,void 0,this),l.onOpen===void 0?null:e("button",{type:"button",onClick:()=>F(l.onOpen),children:"Open file…"},void 0,!1,void 0,this),l.onOpenFolder===void 0?null:e("button",{type:"button",onClick:()=>F(l.onOpenFolder),children:"Open folder…"},void 0,!1,void 0,this),l.onSaveToFolder===void 0?null:e("button",{type:"button",onClick:C,children:"Save to folder…"},void 0,!1,void 0,this)]},void 0,!0,void 0,this):null,l.onSave===void 0?null:e("button",{type:"button",class:"pq-editor-primary",onClick:P,title:"Download this quiz as a .trivia file",children:"Save"},void 0,!1,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)}function _t(n){let[r,l]=t(()=>n.snapshot());return o(()=>{let v=()=>l(n.snapshot());return v(),n.subscribe(v)},[n]),r}function Nn(n,r){switch(n){case"slides":return e(Mt,{store:r.store,snapshot:r.snapshot,onSelect:r.onSelect},void 0,!1,void 0,this);case"form":return e(Rt,{store:r.store,snapshot:r.snapshot,options:r.options},void 0,!1,void 0,this);case"syntax":return e(zt,{store:r.store,snapshot:r.snapshot},void 0,!1,void 0,this);case"preview":return r.options.preview===void 0?null:e(Ct,{text:r.snapshot.text,preview:r.options.preview,place:r.place},void 0,!1,void 0,this)}}function Kt({store:n,options:r}){let l=_t(n),v=r.preview!==void 0,S=r.rememberLayout!==!1,[q,x]=t(()=>St(r,v)),F=i(null),P=i(q);P.current=q;let C=(k)=>{if(P.current=k,x(k),S)Ve(k)},z=i(l.slides.length);o(()=>{let k=l.slides.length,M=k>z.current;if(z.current=k,!M)return;if(P.current.panes.includes("form"))return;C(be(P.current,"form"))},[l.slides.length]),o(()=>{let k=(M)=>{if(!M.ctrlKey&&!M.metaKey)return;let B=M.target;if(B instanceof HTMLElement&&(B.tagName==="INPUT"||B.tagName==="TEXTAREA"||B.isContentEditable))return;let X=M.key.toLowerCase();if(X==="z"&&!M.shiftKey){M.preventDefault(),n.undo();return}if(X==="y"||X==="z"&&M.shiftKey)M.preventDefault(),n.redo()};return window.addEventListener("keydown",k),()=>{window.removeEventListener("keydown",k)}},[n]);let R=(k)=>{let M=P.current,B=M.panes.includes("form");if(k===l.selected&&B){C(be(M,"form"));return}if(n.select(k),!B)C(be(M,"form"))},O=(k,M)=>(B)=>{let X=F.current;if(X===null)return;let we=X.querySelector(`[data-pq-pane="${k}"]`),Y=X.querySelector(`[data-pq-pane="${M}"]`);if(we===null||Y===null)return;B.preventDefault();let Ut=B.clientX,Vt=we.getBoundingClientRect(),Yt=Y.getBoundingClientRect(),nt=(jt)=>{let ot=qt(P.current.sizes,k,M,Vt.width,Yt.width,jt.clientX-Ut);if(ot===null)return;P.current={...P.current,sizes:{...P.current.sizes,...ot}},x(P.current)},rt=()=>{if(window.removeEventListener("pointermove",nt),window.removeEventListener("pointerup",rt),S)Ve(P.current)};window.addEventListener("pointermove",nt),window.addEventListener("pointerup",rt)},L=l.slides.reduce((k,M)=>k+M.problems.length,0),D=l.slides.find((k)=>k.index===l.selected),H=D?.problems[0],J=D===void 0?null:{kind:D.kind,index:D.index,line:D.index<0?0:l.doc.blocks[D.index]?.start??0},G=q.panes;return e("div",{class:"pq-editor",children:[e(Nt,{store:n,snapshot:l,options:r,panes:G,hasPreview:v,onTogglePane:(k)=>C(be(q,k))},void 0,!1,void 0,this),e("div",{ref:F,class:"pq-editor-grid",style:`--pq-ed-grid:${xt(q)}`,children:G.map((k,M)=>{let B=G[M+1];return e("div",{class:"pq-editor-cell","data-pq-pane":k,children:[Nn(k,{store:n,snapshot:l,options:r,onSelect:R,place:J}),B===void 0?null:e("div",{class:"pq-editor-grip",role:"separator","aria-orientation":"vertical","aria-label":`Resize ${de[k]} and ${de[B]}`,title:"Drag to resize. Double-click to reset.",onPointerDown:O(k,B),onDblClick:()=>C({...q,sizes:{}})},void 0,!1,void 0,this)]},k,!0,void 0,this)})},void 0,!1,void 0,this),e("div",{class:"pq-editor-status",children:[e("span",{class:L===0?"pq-editor-good":"pq-editor-bad",children:L===0?"No problems":_n(L)},void 0,!1,void 0,this),H===void 0?null:e("span",{class:"pq-editor-bad",children:[H.code," ",H.message]},void 0,!0,void 0,this),e("span",{class:"pq-editor-note-line",role:"status","aria-live":"polite",children:l.note??"Nothing saved yet."},void 0,!1,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)}function _n(n){return n===1?"1 problem":`${n} problems`}var $t="pq-editor-style";function Kn(n){if(n.getElementById($t)!==null)return;let r=n.createElement("style");r.id=$t,r.textContent=wt,n.head.append(r)}function _e(n,r={}){let l=r.store??Te(r.text),v=n.ownerDocument;if(v!==null)Kn(v);return g(b(Kt,{store:l,options:r}),n),{store:l,text:()=>l.snapshot().text,destroy(){g(null,n),l.destroy()}}}var $n="pq-trivia-wizard",Bn="media",Bt=[".trivia",".txt",".md"],Wt="text/plain",Ke=null;function Xt(){if(typeof window>"u")return;return window.showDirectoryPicker}async function Qt(){let n=Xt();if(n===void 0)return null;try{return await n.call(window,{id:$n,mode:"readwrite"})}catch{return null}}function Wn(n,r){let l=document.createElement("input");return l.type="file",l.accept=n,l.multiple=r,l}function Jt(n,r){return new Promise((l)=>{let v=Wn(n,r),S=()=>l([...v.files??[]]);v.addEventListener("change",S,{once:!0}),window.addEventListener("focus",()=>{setTimeout(()=>l([]),400)},{once:!0}),v.click()})}async function Xn(n){let r=await Promise.all(n.map(async(v)=>({name:v.name,text:await v.text()})));if(r.length===0)return null;return r.sort((v,S)=>v.name.localeCompare(S.name)),{name:r[0]?.name??"quiz.trivia",text:r.map((v)=>v.text).join(`

`)}}async function Gt(){return Xn(await Jt(Bt.join(","),!0))}async function Qn(n){let r=[];for await(let l of n.values()){if(l.kind!=="file")continue;let v=l.name.toLowerCase();if(!Bt.some((q)=>v.endsWith(q)))continue;let S=await l.getFile();r.push({name:l.name,text:await S.text()})}if(r.length===0)return null;return r.sort((l,v)=>l.name.localeCompare(v.name)),{name:`${n.name}.trivia`,text:r.map((l)=>l.text).join(`

`)}}async function Jn(){if(Xt()===void 0)return Gt();let n=await Qt();if(n===null)return null;return Ke=n,Qn(n)}async function Gn(n,r){let l=Ke??await Qt();if(l===null)return!1;Ke=l;try{let S=await(await l.getFileHandle(`${c(n)}.trivia`,{create:!0})).createWritable();return await S.write(new Blob([r],{type:Wt})),await S.close(),!0}catch{return!1}}async function Un(n){let r=Ke;if(r===null)return!1;try{let S=await(await(await r.getDirectoryHandle(Bn,{create:!0})).getFileHandle(n.name,{create:!0})).createWritable();return await S.write(n),await S.close(),!0}catch{return!1}}async function Vn(){let r=(await Jt("image/*,audio/*,video/*",!1))[0];if(r===void 0)return null;let l=await Un(r);return{name:r.name,copied:l}}function Yn(n,r){p(`${c(n)}.trivia`,r,Wt)}function jn(n,r){let l=n,v=null,S=!1,q=null;return (at("84v7wec9"),import("./chunk-preview.js")).then(({mountPreview:x})=>{if(S)return;if(q=x(l,r,{keepHead:!0}),v!==null)q.show?.(v)}),{load(x){l=x,q?.load(x)},show(x){v=x,q?.show?.(x)},destroy(){S=!0,q?.destroy(),q=null}}}function Zn(n,r={}){return _e(n,{...r.text===void 0?{}:{text:r.text},onSave:r.onSave??Yn,onOpen:r.onOpen??Gt,onOpenFolder:Jn,onSaveToFolder:Gn,onPickMedia:Vn,preview:r.preview??jn,...r.previewOpen===void 0?{}:{previewOpen:r.previewOpen}})}if(typeof document<"u")for(let n of document.querySelectorAll("[data-pq-wizard]"))Zn(n);export{ke as EditorStore,K as HEADER_INDEX,Se as SlideKind,Pe as SlideTemplate,Ce as addAnswer,se as addMedia,ye as addSlide,ae as blockTextAt,te as blockTexts,Te as createEditorStore,Le as duplicateSlide,pe as headerText,he as listSlides,_e as mountEditor,Zn as mountQuizWizard,oe as moveSlide,U as readText,Me as removeAnswer,ze as removeMedia,Fe as removeSlide,Ie as setAnswerAt,re as setFieldValue,De as setSlideText,W as setValuesField,Re as setWholeText,Z as tidy,Oe as toggleCorrect,N as valuesFor,me as withBlockText,ne as withBlocks,fe as withHeaderText};

//# debugId=65DF45366558A10A64756E2164756E21
