/* ---------------- KPI count-up (from a complete resting state) ---------------- */
const io = new IntersectionObserver(es=>es.forEach(e=>{ if(!e.isIntersecting) return; io.unobserve(e.target);
  const b=e.target, to=+b.dataset.count, dec=+b.dataset.dec, unit=b.querySelector('.u').outerHTML, t0=performance.now();
  const step=n=>{ const f=Math.min(1,(n-t0)/1100), v=to*(1-Math.pow(1-f,3)); b.innerHTML=v.toFixed(dec)+unit; if(f<1) requestAnimationFrame(step); }; requestAnimationFrame(step); }),{threshold:.6});
document.querySelectorAll('[data-count]').forEach(b=>io.observe(b));

/* ---------------- scorecard ---------------- */
const pilot=[78,71,84,66,74];
$('#scoreBody').innerHTML = hoppers.map((h,i)=>`<tr><td><b style="color:${h.col}">${h.beat}</b></td><td class="mono">${(h.colL/1000).toFixed(1)}</td><td class="mono">${Math.round(h.cust)}</td><td class="barcell"><div style="display:flex;align-items:center;gap:8px"><div style="flex:1"><i style="width:${pilot[i]}%;background:${pilot[i]>=75?'var(--good)':'var(--warn)'}"></i></div><span class="mono" style="font-size:12px">${pilot[i]} %</span></div></td></tr>`).join('');

/* ---------------- QR + flip ---------------- */
try { const q=qrcode(0,'M'); q.addData('NNGJ|WARD-44|KDH-44-0127|BEAT-B2|KARDHANI'); q.make(); $('#qr').innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true}); } catch(e){ $('#qr').textContent='KDH-44-0127'; }
const flip=$('#flip'); flip.onclick=()=>flip.classList.toggle('on'); flip.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault(); flip.classList.toggle('on');} };
