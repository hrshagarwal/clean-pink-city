/* ---------------- HUD, fleet, feed ---------------- */
const fleetEl = $('#fleet');
const statusName = {idle:'Waiting', collect:'Collecting', travel:'Driving', unload:'Unloading at WRC', done:'Shift done'};
fleetEl.innerHTML = hoppers.map(h=>`
  <article class="hop" id="card-${h.id}">
    <header><div class="badge" style="background:${h.col}">${h.id}</div><div><b>Beat ${h.beat}</b><span>${(h.colL/1000).toFixed(1)} km of lanes · ${Math.round(h.cust)} customers</span></div><span class="status st-idle" data-k="status">Waiting</span></header>
    <div class="gauges">
      <div class="gauge">Wet <b class="mono" data-k="wet">0 kg</b><div class="bar"><i data-k="wbar" style="background:var(--wet)"></i></div></div>
      <div class="gauge">Dry <b class="mono" data-k="dry">0 kg</b><div class="bar"><i data-k="dbar" style="background:var(--dry)"></i></div></div>
    </div>
    <div class="row"><span>Round</span><b data-k="round">0 / 3</b></div>
    <div class="row"><span>Driven</span><b data-k="km">0.0 km</b></div>
    <div class="row"><span>Delivered to WRC</span><b data-k="del">0.00 t</b></div>
  </article>`).join('') + `
  <article class="hop" style="opacity:.75">
    <header><div class="badge" style="background:#8a90a3">H6</div><div><b>Standby</b><span>20 % reserve · covers breakdowns and festival peaks</span></div><span class="status st-idle">Standby</span></header>
    <p style="font-size:13px;color:var(--ink-2)">Parked and charged at the Ward Resource Centre. It is dispatched when a hopper reports a fault or a beat runs more than 30 minutes late.</p>
  </article>`;
const cardRefs = hoppers.map(h=>{ const el=$('#card-'+h.id); const m={}; el.querySelectorAll('[data-k]').forEach(n=>m[n.dataset.k]=n); return m; });

const feedEl = $('#feed'); const seen = new Set();
function pushFeed(time, h, msg){ const li=document.createElement('li'); li.innerHTML=`<time>${fmtT(time)}</time><span><span class="tag" style="background:${h.col}">${h.id}</span>${msg}</span>`; feedEl.prepend(li); while(feedEl.children.length>14) feedEl.lastChild.remove(); }

let simT = 150, speed = 180, playing = true, last = performance.now();
function tick(now){
  const dt = Math.min(0.1,(now-last)/1000); last = now;
  if (playing) { simT += dt*speed/60; if (simT > SHIFT_END) { simT = 0; seen.clear(); feedEl.innerHTML=''; } }
  let T=0,Hh=0,Wd=0,Dd=0;
  hoppers.forEach((h,i)=>{
    const st = stateOf(h, simT); h._st = st;
    T += st.deliveredW + st.deliveredD + st.wet + st.dry; Hh += st.served; Wd += st.deliveredW; Dd += st.deliveredD;
    const r = cardRefs[i];
    r.status.textContent = statusName[st.mode]; r.status.className = 'status st-' + st.mode;
    r.wet.textContent = Math.round(st.wet)+' kg'; r.dry.textContent = Math.round(st.dry)+' kg';
    r.wbar.style.width = Math.min(100, st.wet/480*100)+'%'; r.dbar.style.width = Math.min(100, st.dry/234*100)+'%';
    r.round.textContent = (st.mode==='done'?3:st.seg.round)+' / 3'; r.km.textContent = st.km.toFixed(1)+' km'; r.del.textContent = ((st.deliveredW+st.deliveredD)/1000).toFixed(2)+' t';
    const key = h.id+'|'+h.segs.indexOf(st.seg)+'|'+st.mode;
    if (!seen.has(key) && st.mode!=='idle'){ seen.add(key);
      if (st.mode==='collect') pushFeed(st.seg.t0,h,`started round ${st.seg.round} on Beat ${h.beat}`);
      else if (st.mode==='unload') pushFeed(st.seg.t0,h,`unloading ${(st.wet/1000).toFixed(2)} t wet + ${(st.dry/1000).toFixed(2)} t dry at the WRC`);
      else if (st.mode==='done') pushFeed(h.end,h,`finished Beat ${h.beat}: ${Math.round(st.served)} customers, ${st.km.toFixed(1)} km`);
    }
  });
  $('#sT').textContent=(T/1000).toFixed(2); $('#sH').textContent=Math.round(Hh).toLocaleString('en-IN'); $('#sW').textContent=(Wd/1000).toFixed(2); $('#sD').textContent=(Dd/1000).toFixed(2);
  $('#clock').textContent = fmtT(simT);
  const pct = Math.min(100, simT/SHIFT_END*100); $('#shiftbar').style.width=pct+'%'; $('#pct').textContent=Math.round(pct)+'%';
  const active = hoppers.map(h=>h._st.seg.round||0); const rnd=Math.max(...active);
  $('#phase').textContent = simT>=SHIFT_END-10 ? 'All beats cleared' : rnd<=1 ? 'Round 1 · morning sweep' : rnd===2 ? 'Round 2 · mid-morning' : 'Round 3 · final sweep';
  drawFrame(simT, now);
  requestAnimationFrame(tick);
}

/* controls */
$('#play').onclick = e => { playing=!playing; e.currentTarget.textContent = playing?'Pause':'Play'; e.currentTarget.setAttribute('aria-pressed',playing); };
document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{ speed=+b.dataset.speed; document.querySelectorAll('[data-speed]').forEach(x=>x.setAttribute('aria-pressed', x===b)); });
$('#restart').onclick = ()=>{ simT=0; seen.clear(); feedEl.innerHTML=''; };
document.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>{ const k=b.dataset.layer; layers[k]=!layers[k]; b.setAttribute('aria-pressed',layers[k]); if(k==='beats') buildStatic(); });
