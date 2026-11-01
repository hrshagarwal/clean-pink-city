/* ---------------- map rendering ---------------- */
const cv = $('#map'), ctx = cv.getContext('2d');
const layers = {beats:true, trails:true, bins:true, hosp:true, reports:true};
let W=0,H=0,DPR=1,scale=1,ox=0,oy=0, staticCv=null;
const VIEW = D.radius + 120;
const P = (x,y) => [ox + x*scale, oy - y*scale];
function resize(){
  const r = cv.getBoundingClientRect(); DPR = Math.min(2, window.devicePixelRatio||1);
  W = r.width; H = r.height; cv.width = W*DPR; cv.height = H*DPR;
  scale = Math.min(W,H)/(2*VIEW); ox = W/2; oy = H/2;
  buildStatic();
}
function poly(c, pts){ c.beginPath(); pts.forEach((p,i)=>{const [x,y]=P(p[0],p[1]); i?c.lineTo(x,y):c.moveTo(x,y);}); }
function buildStatic(){
  staticCv = document.createElement('canvas'); staticCv.width = W*DPR; staticCv.height = H*DPR;
  const c = staticCv.getContext('2d'); c.scale(DPR,DPR);
  c.fillStyle='#fbfaf7'; c.fillRect(0,0,W,H);
  // soft grid
  c.strokeStyle='rgba(22,33,59,.04)'; c.lineWidth=1;
  for(let g=-VIEW; g<=VIEW; g+=100){ const [x1,y1]=P(g,-VIEW),[x2,y2]=P(g,VIEW); c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke(); const [a,b]=P(-VIEW,g),[d,e]=P(VIEW,g); c.beginPath();c.moveTo(a,b);c.lineTo(d,e);c.stroke(); }
  c.lineCap='round'; c.lineJoin='round';
  c.strokeStyle='#e4e0d9'; c.lineWidth=Math.max(1, 2.2*scale*3);
  D.bg.forEach(l=>{poly(c,l); c.stroke();});
  // study circle
  const [cx0,cy0]=P(0,0); c.setLineDash([6,5]); c.strokeStyle='rgba(22,33,59,.35)'; c.lineWidth=1.2; c.beginPath(); c.arc(cx0,cy0,D.radius*scale,0,Math.PI*2); c.stroke(); c.setLineDash([]);
  // park
  if (D.park.length){ poly(c,D.park); c.closePath(); c.fillStyle='#dcefd9'; c.fill(); c.strokeStyle='#9fcf98'; c.lineWidth=1; c.stroke(); }
  // streets
  c.lineWidth=Math.max(1.6, 6*scale);
  D.streets.forEach(s=>{ poly(c,s.c); c.strokeStyle = layers.beats ? hexA(BEAT_COL[D.beats[s.b].colour], .38) : '#cfcac2'; c.stroke(); });
  // main road
  c.strokeStyle='#16213b'; c.lineWidth=Math.max(3, 11*scale); D.main.forEach(l=>{poly(c,l); c.stroke();});
  c.strokeStyle='#ffffff'; c.lineWidth=Math.max(1, 2.5*scale); c.setLineDash([5,6]); D.main.forEach(l=>{poly(c,l); c.stroke();}); c.setLineDash([]);
}
function drawLabels(c){
  c.font = `600 ${Math.max(10, 11)}px Hanken Grotesk, system-ui, sans-serif`;
  D.landmarks.forEach(l=>{ const [x,y]=P(l.p[0],l.p[1]);
    c.fillStyle = l.kind==='bulk' ? '#f2a516' : '#16213b';
    c.beginPath(); if(l.kind==='bulk'){c.moveTo(x,y-6);c.lineTo(x+6,y);c.lineTo(x,y+6);c.lineTo(x-6,y);c.closePath();} else c.arc(x,y,4,0,7); c.fill();
    labelPill(c, l.n, x+9, y-9);
  });
  // beat labels
  if (layers.beats) D.beats.forEach(b=>{ const [x,y]=P(b.label[0],b.label[1]); const col=BEAT_COL[b.colour];
    c.fillStyle='#fff'; roundRect(c,x-26,y-15,52,30,8); c.fill(); c.strokeStyle=col; c.lineWidth=2; c.stroke();
    c.fillStyle='#16213b'; c.textAlign='center'; c.font='800 13px Bricolage Grotesque, system-ui'; c.fillText(b.id,x,y-1); c.font='600 9.5px JetBrains Mono, monospace'; c.fillStyle='#4b5672'; c.fillText(b.street_km.toFixed(1)+' km',x,y+11); c.textAlign='left'; });
}
function labelPill(c, t, x, y){ c.font='600 11px Hanken Grotesk, system-ui, sans-serif'; const w=c.measureText(t).width+10; c.fillStyle='rgba(255,255,255,.9)'; roundRect(c,x,y-9,w,17,5); c.fill(); c.fillStyle='#16213b'; c.fillText(t,x+5,y+3); }
function roundRect(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function hexA(h,a){ const n=parseInt(h.slice(1),16); return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`; }

function drawFrame(t, now){
  const c = ctx; c.setTransform(DPR,0,0,DPR,0,0);
  c.drawImage(staticCv,0,0,W,H);
  c.lineCap='round'; c.lineJoin='round';
  // cleared lanes
  if (layers.trails) hoppers.forEach(h=>{
    c.strokeStyle = BEAT_COL[D.beats[+h.id.slice(1)-1].colour]; c.lineWidth=Math.max(2.4, 8*scale);
    for (const s of h.segs){ if (s.m!=='collect' || t < s.t0) continue; const frac=Math.min(1,(t-s.t0)/(s.t1-s.t0)); const pt=pointAt(s,frac);
      c.beginPath(); for(let k=0;k<pt.i;k++){const [x,y]=P(s.p[k][0],s.p[k][1]); k?c.lineTo(x,y):c.moveTo(x,y);} const [x,y]=P(pt.x,pt.y); c.lineTo(x,y); c.stroke(); }
  });
  // bins
  if (layers.bins) D.bins.forEach(b=>{ const [x,y]=P(b[0],b[1]); c.fillStyle='#fff'; c.strokeStyle='#16213b'; c.lineWidth=1.6; c.beginPath(); c.arc(x,y,4.5,0,7); c.fill(); c.stroke(); });
  if (layers.hosp) D.hosp.forEach(b=>{ const [x,y]=P(b[0],b[1]); c.fillStyle='#d03b3b'; c.fillRect(x-1.8,y-6,3.6,12); c.fillRect(x-6,y-1.8,12,3.6); });
  drawLabels(c);
  // WRC pulse
  const [wx,wy]=P(D.wrc_node[0],D.wrc_node[1]); const pulse=(now/1400)%1;
  c.strokeStyle=hexA('#d6336c',.5*(1-pulse)); c.lineWidth=2; c.beginPath(); c.arc(wx,wy,10+pulse*26,0,7); c.stroke();
  c.fillStyle='#d6336c'; c.beginPath(); c.arc(wx,wy,9,0,7); c.fill(); c.fillStyle='#fff'; c.font='800 10px Bricolage Grotesque, system-ui'; c.textAlign='center'; c.fillText('WRC',wx,wy+3.5); c.textAlign='left';
  labelPill(c,'Ward Resource Centre',wx+13,wy-14);
  // reports
  if (layers.reports) reports.forEach(r=>{ const [x,y]=P(r.x,r.y); const b=(now/900+r.x)%1; c.fillStyle=hexA('#d6336c',.25*(1-b)); c.beginPath(); c.arc(x,y,6+b*14,0,7); c.fill();
    c.fillStyle='#d6336c'; c.beginPath(); c.moveTo(x,y); c.arc(x,y-12,7,Math.PI*0.75,Math.PI*0.25); c.closePath(); c.fill(); c.fillStyle='#fff'; c.beginPath(); c.arc(x,y-12,2.6,0,7); c.fill(); });
  // pending pick
  if (pickPt){ const [x,y]=P(pickPt.x,pickPt.y); c.strokeStyle='#d6336c'; c.lineWidth=2; c.setLineDash([3,3]); c.beginPath(); c.arc(x,y,12,0,7); c.stroke(); c.setLineDash([]); }
  // hoppers
  hoppers.forEach(h=>{ const st=h._st; if(!st) return; const [x,y]=P(st.pos.x,st.pos.y); const ang = -(st.pos.ang||0);
    c.save(); c.translate(x,y);
    c.fillStyle='rgba(242,165,22,.22)'; c.beginPath(); c.arc(0,0,15,0,7); c.fill();
    c.rotate(ang);
    c.fillStyle='#16213b'; roundRect(c,-10,-6,20,12,3); c.fill();          // body
    c.fillStyle='#f2a516'; roundRect(c,-9,-5,11,10,2); c.fill();          // hopper box
    c.fillStyle='#1baf7a'; c.fillRect(-8,-4,4.5,8); c.fillStyle='#2a78d6'; c.fillRect(-3,-4,4.5,8);
    c.fillStyle='#e8eefc'; roundRect(c,4,-4.5,5,9,1.5); c.fill();          // cab
    c.restore();
    c.font='800 11px Bricolage Grotesque, system-ui'; const tw=c.measureText(h.id).width+10;
    c.fillStyle=h.col; roundRect(c,x-tw/2,y-29,tw,16,5); c.fill(); c.fillStyle='#fff'; c.textAlign='center'; c.fillText(h.id,x,y-17.5); c.textAlign='left';
  });
}
