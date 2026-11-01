const BEAT_COL = ['#2a78d6','#eb6834','#1baf7a','#4a3aa7'];
const $ = s => document.querySelector(s);
const fmtT = m => { const t = 390 + Math.floor(m); return String(Math.floor(t/60)%24).padStart(2,'0') + ':' + String(t%60).padStart(2,'0'); };
