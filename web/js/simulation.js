/* ---------------- simulation model ---------------- */
const SPEED_COLLECT_MIN = 90;        // min per load (Worrell b)
const TRAVEL_M_PER_MIN = 333;        // 20 km/h
const UNLOAD_MIN = 15;
const CUSTOMERS = 3613, WET_KG = 0.99, DRY_KG = 0.87;
const totalCollect = D.beats.reduce((a,b)=>a+b.day.filter(s=>s.m==='collect').reduce((x,s)=>x+s.L,0),0);
const hoppers = D.beats.map((b,i) => {
  const segs = []; let t = i*4; // staggered start
  const colL = b.day.filter(s=>s.m==='collect').reduce((x,s)=>x+s.L,0);
  const cust = CUSTOMERS * colL / totalCollect;
  let round = 0;
  for (const s0 of b.day) {
    const s = s0.p.length ? s0 : {...s0, p:[D.wrc_node], L:0};
    let dur = s.m==='collect' ? SPEED_COLLECT_MIN * (s.L/(colL/3)) : s.m==='travel' ? Math.max(1, s.L/TRAVEL_M_PER_MIN) : UNLOAD_MIN;
    if (s.m==='collect') round++;
    const cum=[0]; for (let k=1;k<s.p.length;k++){const dx=s.p[k][0]-s.p[k-1][0],dy=s.p[k][1]-s.p[k-1][1];cum.push(cum[k-1]+Math.hypot(dx,dy));}
    segs.push({...s, t0:t, t1:t+dur, cum, round, cust: s.m==='collect' ? cust*s.L/colL : 0});
    t += dur;
  }
  return {id:'H'+(i+1), beat:b.id, col: BEAT_COL[b.colour], segs, end:t, cust, colL, km:(colL+b.day.filter(s=>s.m==='travel').reduce((x,s)=>x+s.L,0))/1000};
});
const SHIFT_END = Math.max(...hoppers.map(h=>h.end)) + 10;

function pointAt(seg, frac){
  const L = seg.cum[seg.cum.length-1]; if (seg.p.length===1 || L===0) return {x:seg.p[0][0], y:seg.p[0][1], i:0};
  const d = frac*L; let k=1; while(k<seg.cum.length-1 && seg.cum[k]<d) k++;
  const a=seg.p[k-1], b=seg.p[k], f=(d-seg.cum[k-1])/((seg.cum[k]-seg.cum[k-1])||1);
  return {x:a[0]+(b[0]-a[0])*f, y:a[1]+(b[1]-a[1])*f, i:k, ang:Math.atan2(b[1]-a[1], b[0]-a[0])};
}
function stateOf(h, t){
  let wet=0, dry=0, served=0, deliveredW=0, deliveredD=0, km=0;
  for (const s of h.segs){
    if (t < s.t0) return {seg:s, frac:0, mode: s===h.segs[0]?'idle':s.m, wet, dry, served, deliveredW, deliveredD, km, pos: pointAt(s,0)};
    const frac = Math.min(1, (t-s.t0)/(s.t1-s.t0));
    if (s.m==='collect'){ const c = s.cust*frac; served += c; wet += c*WET_KG; dry += c*DRY_KG; }
    if (s.m==='unload' && frac>=1){ deliveredW += wet; deliveredD += dry; wet=0; dry=0; }
    if (s.m!=='unload') km += s.L*frac/1000;
    if (frac < 1) {
      let mode = s.m;
      if (s.m==='unload'){ const fw = 1-frac; return {seg:s, frac, mode, wet:wet*fw, dry:dry*fw, served, deliveredW:deliveredW+wet*frac, deliveredD:deliveredD+dry*frac, km, pos:pointAt(s,frac)}; }
      return {seg:s, frac, mode, wet, dry, served, deliveredW, deliveredD, km, pos: pointAt(s, frac)};
    }
  }
  const last = h.segs[h.segs.length-1];
  return {seg:last, frac:1, mode:'done', wet:0, dry:0, served, deliveredW, deliveredD, km, pos: pointAt(last,1)};
}
