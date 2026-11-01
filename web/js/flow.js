/* ---------------- flow (Sankey-style) ---------------- */
const FLOW_CATS = [
  {k:'Composted', n:'Composted', c:'#2fa36b'},
  {k:'Recycled (formal + informal)', n:'Recycled', c:'#2e7bd6'},
  {k:'Inert reused', n:'Inert reused (C&D, road fill)', c:'#8e8a7e'},
  {k:'RDF / Waste-to-energy', n:'RDF / Waste-to-energy', c:'#f4b63f'},
  {k:'Dumped / landfilled', n:'Dumped / landfilled', c:'#a8435a'},
  {k:'Uncollected (littered, burnt, drains)', n:'Uncollected: littered, burnt, drains', c:'#e04848'}
];
const flowSvg = $('#flow'); const NS='http://www.w3.org/2000/svg';
const TOT = NUM.tot_tpd;
const flowEls = FLOW_CATS.map(cat=>{
  const g=document.createElementNS(NS,'g');
  const rib=document.createElementNS(NS,'path'); rib.setAttribute('class','ribbon'); rib.setAttribute('fill','none'); rib.setAttribute('stroke',cat.c); rib.setAttribute('stroke-opacity','.55');
  const par=document.createElementNS(NS,'path'); par.setAttribute('class','particles'); par.setAttribute('fill','none'); par.setAttribute('stroke','#fff'); par.setAttribute('stroke-opacity','.9');
  const bar=document.createElementNS(NS,'rect'); bar.setAttribute('fill',cat.c); bar.setAttribute('rx','3'); bar.setAttribute('class','ribbon');
  const t=document.createElementNS(NS,'text'); t.setAttribute('font-size','14'); t.setAttribute('font-weight','700');
  const v=document.createElementNS(NS,'text'); v.setAttribute('class','val');
  g.append(rib,par,bar,t,v); flowSvg.append(g); return {rib,par,bar,t,v,cat};
});
const src=document.createElementNS(NS,'g'); flowSvg.append(src);
function drawFlow(mode){
  const d = mode==='ex' ? NUM.existing_fate : NUM.proposed_fate;
  const H0=360, top=30, k=H0/TOT, gap=8;
  src.innerHTML = `<rect x="40" y="${top}" width="16" height="${H0}" rx="4" fill="#22304a"/><text x="40" y="${top-10}" font-size="14" font-weight="800">Ward 44 · <tspan style="font-family:var(--f-display)" font-size="18">${TOT.toFixed(1)}</tspan> <tspan class="val">t/day generated</tspan></text>`;
  let ys=top, yd=top; const xd=720;
  FLOW_CATS.forEach((cat,i)=>{
    const val=d[cat.k]||0; const h=Math.max(val*k, 0.0001); const e=flowEls[i];
    if (!(val>0)) yd+=14;  // room for the previous label's value line
    const y1=ys+h/2, y2=yd+h/2;
    const path=`M56 ${y1} C 380 ${y1}, 420 ${y2}, ${xd} ${y2}`;
    e.rib.setAttribute('d',path); e.rib.setAttribute('stroke-width',Math.max(0.5,h)); e.par.setAttribute('d',path); e.par.setAttribute('stroke-width', val>0.05?Math.min(4,h*0.4):0);
    e.bar.setAttribute('x',xd); e.bar.setAttribute('y',yd); e.bar.setAttribute('width',12); e.bar.setAttribute('height',Math.max(1,h));
    e.t.setAttribute('x',xd+22); e.t.setAttribute('y',y2+2); e.t.textContent=cat.n;
    e.v.setAttribute('x',xd+22); e.v.setAttribute('y',y2+18); e.v.textContent= val>0 ? `${val.toFixed(2)} t/day · ${(val/TOT*100).toFixed(0)} %` : 'none';
    e.t.setAttribute('opacity', val>0?1:.45); e.v.setAttribute('opacity', val>0?1:.45);
    ys+=h; yd+=h+gap;
  });
}
$('#fEx').onclick=()=>{ $('#fEx').setAttribute('aria-pressed','true'); $('#fPr').setAttribute('aria-pressed','false'); drawFlow('ex'); };
$('#fPr').onclick=()=>{ $('#fPr').setAttribute('aria-pressed','true'); $('#fEx').setAttribute('aria-pressed','false'); drawFlow('pr'); };
drawFlow('pr');
