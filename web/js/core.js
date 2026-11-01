const BEAT_COL = ['#2e7bd6','#d9734e','#2fa36b','#8c7ae6'];
const $ = s => document.querySelector(s);
const fmtT = m => { const t = 390 + Math.floor(m); return String(Math.floor(t/60)%24).padStart(2,'0') + ':' + String(t%60).padStart(2,'0'); };
