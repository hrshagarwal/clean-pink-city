/* ---------------- citizen reports ---------------- */
let reports = []; let pickPt = null; let arming=false;
const rland=$('#rland');
const LM = D.landmarks.map(l=>({n:l.n,p:l.p})).concat([{n:'Kardhani Central Park',p:[D.park.length?D.park.reduce((a,p)=>a+p[0],0)/D.park.length:0, D.park.length?D.park.reduce((a,p)=>a+p[1],0)/D.park.length:0]},{n:'Ward Resource Centre',p:D.wrc_node}]);
rland.innerHTML = LM.map((l,i)=>`<option value="${i}">${l.n}</option>`).join('');
$('#pick').onclick=()=>{ arming=true; $('#armhint').hidden=false; $('#mapcard').scrollIntoView({behavior:'smooth',block:'center'}); };
cv.addEventListener('click',e=>{ if(!arming) return; const r=cv.getBoundingClientRect(); const x=(e.clientX-r.left-ox)/scale, y=-(e.clientY-r.top-oy)/scale;
  pickPt={x,y}; arming=false; $('#armhint').hidden=true; $('#pickstate').textContent='Exact spot picked on the map ✓'; $('#rform').scrollIntoView({behavior:'smooth',block:'center'}); });
function nearestBeat(x,y){ let best=null,bd=1e18; D.streets.forEach(s=>s.c.forEach(p=>{const d=(p[0]-x)**2+(p[1]-y)**2; if(d<bd){bd=d;best=s.b;}})); return 'B'+(best+1); }
function renderReports(){
  const el=$('#rlist'); $('#rempty').hidden = reports.length>0;
  el.innerHTML = reports.slice().sort((a,b)=>b.at-a.at).map(r=>`<li><b>${esc(r.type)}</b><span class="muted" style="font-size:12.5px">${esc(r.place)} · Beat ${esc(r.beat)} · ${new Date(r.at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>${r.note?`<span>${esc(r.note)}</span>`:''}</li>`).join('');
}
function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(m){ const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,2600); }
function loadLocal(){ try{ reports = JSON.parse(localStorage.getItem('kdh-reports')||'[]'); }catch(e){ reports=[]; } renderReports(); }
function saveLocal(){ try{ localStorage.setItem('kdh-reports', JSON.stringify(reports.slice(-50))); }catch(e){} }
$('#rmode').textContent='Reports are saved on this device.';
loadLocal();

$('#rform').addEventListener('submit', async e=>{
  e.preventDefault();
  const type=document.querySelector('input[name="type"]:checked').value; const lm=LM[+rland.value];
  const jitter=()=> (Math.random()-.5)*30;
  const pt = pickPt || {x:lm.p[0]+jitter(), y:lm.p[1]+jitter()};
  const r = {type, place: pickPt ? 'Pinned near '+lm.n : lm.n, note: $('#rnote').value.trim().slice(0,200), x:Math.round(pt.x*10)/10, y:Math.round(pt.y*10)/10, beat: nearestBeat(pt.x,pt.y), at: Date.now()};
  reports.push(r); saveLocal(); renderReports();
  pickPt=null; $('#pickstate').textContent='Using the landmark location'; $('#rnote').value='';
  toast(`Report sent to the Beat ${r.beat} hopper`);
});
