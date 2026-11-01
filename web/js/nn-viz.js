/* ---------------- neural-network visualiser ---------------- */
const NN = (()=>{
  const cv=document.getElementById('nnviz'); if(!cv) return {think(){},fire(){}};
  const g=cv.getContext('2d');
  const NAMES=["Battery","Food / organic","Brown glass","Cardboard","Clothes","Green glass","Metal","Paper","Plastic","Shoes","Mixed trash","Clear glass"];
  const BINC=["#e04848","#2fa36b","#2e7bd6","#2e7bd6","#2e7bd6","#2e7bd6","#2e7bd6","#2e7bd6","#2e7bd6","#2e7bd6","#2e7bd6","#2e7bd6"];
  const BINS=[["Green",'#2fa36b'],["Blue",'#2e7bd6'],["Red",'#e04848']];
  const binIdx=k=>k===1?0:(k===0?2:1);
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W=0,H=0,DPR=1, probs=null, win=-1, t0=0, mode='idle', thumb=null;
  const NF=10;
  function size(){ const r=cv.getBoundingClientRect(); DPR=Math.min(2,devicePixelRatio||1); W=r.width; H=r.height; cv.width=W*DPR; cv.height=H*DPR; }
  function L(){ // layout
    const x0=14, xConv=W*0.13, xF=W*0.42, xC=W*0.58, xB=W*0.93;
    const fy=i=>H*0.12+i*(H*0.76)/(NF-1), cy=i=>H*0.08+i*(H*0.84)/11, by=i=>H*0.25+i*H*0.25;
    return {x0,xConv,xF,xC,xB,fy,cy,by};
  }
  function ease(x){ return x<0?0:x>1?1:1-Math.pow(1-x,3); }
  function draw(now){
    const l=L(); g.setTransform(DPR,0,0,DPR,0,0); g.clearRect(0,0,W,H);
    const t=(now-t0)/1000; // seconds since fire/think
    const amb=reduce?0:(now/1000);
    // input thumb
    const ix=4, iw=Math.min(54,W*0.09), iy=H/2-iw/2;
    g.fillStyle='#f3eee2'; g.fillRect(ix,iy,iw,iw);
    if(thumb){ try{ g.drawImage(thumb,ix,iy,iw,iw);}catch(e){} }
    g.strokeStyle='#22304a'; g.lineWidth=1; g.strokeRect(ix,iy,iw,iw);
    // conv blocks
    const cw=W*0.22, bx0=ix+iw+12;
    for(let k=0;k<5;k++){
      const bh=H*(0.62-k*0.1), bw=cw/7, x=bx0+k*(cw/5.2), y=H/2-bh/2;
      const lit = mode!=='idle' ? ease((t- k*0.12)/0.25) : 0;
      g.fillStyle=`rgba(46,123,214,${0.12+0.35*lit})`; g.strokeStyle='rgba(46,123,214,.7)';
      g.beginPath(); g.roundRect ? g.roundRect(x,y,bw,bh,3) : g.rect(x,y,bw,bh); g.fill(); g.stroke();
    }
    g.fillStyle='#5b6478'; g.font='14px Patrick Hand, cursive'; g.textAlign='center';
    const sm=W<420; g.fillText(sm?'CNN':'MobileNetV2', bx0+cw/2, H-6);
    g.fillText(sm?'1280':'1,280 features', l.xF, H-6); g.fillText(sm?'12':'12 classes', l.xC, H-6); g.fillText('bin', l.xB, H-6);
    // edges features -> classes
    for(let i=0;i<NF;i++) for(let j=0;j<12;j++){
      let a=0.06;
      if(mode!=='idle'){ const w=ease((t-0.7)/0.5); a=0.05+ (probs? probs[j]*0.55*w : 0.1*Math.abs(Math.sin(t*3+i+j))); }
      g.strokeStyle=`rgba(91,100,120,${a})`; g.lineWidth=probs&&j===win?1.2:0.6;
      g.beginPath(); g.moveTo(l.xF,l.fy(i)); g.lineTo(l.xC,l.cy(j)); g.stroke();
    }
    // class -> bin edges
    for(let j=0;j<12;j++){
      const b=binIdx(j); const on = probs && j===win ? ease((t-1.2)/0.4) : 0;
      g.strokeStyle = on>0 ? BINC[j] : 'rgba(91,100,120,.12)'; g.lineWidth = on>0 ? 1+2*on : 0.7;
      const lx = W>360 ? l.xC+86 : l.xC+8; g.beginPath(); g.moveTo(lx,l.cy(j)); g.lineTo(l.xB-14,l.by(b)); g.stroke();
    }
    // conv -> features arrow
    g.strokeStyle='rgba(91,100,120,.5)'; g.lineWidth=1.2; g.beginPath(); g.moveTo(bx0+cw+4,H/2); g.lineTo(l.xF-14,H/2); g.stroke();
    // travelling pulses
    if(mode!=='idle' && !reduce){
      const p=(t%1.1)/1.1;
      if(mode==='think' || t<1.3){
        for(let k=0;k<6;k++){ const q=(p+k/6)%1; const x=bx0+cw+4+q*(l.xF-14-bx0-cw-4); g.fillStyle='rgba(224,96,126,.8)'; g.beginPath(); g.arc(x,H/2,2.2,0,7); g.fill(); }
      }
    }
    // feature neurons
    for(let i=0;i<NF;i++){
      const y=l.fy(i); let v=0.15+0.08*Math.sin(amb*1.5+i);
      if(mode!=='idle') v=0.25+0.6*Math.abs(Math.sin(i*1.7+ (mode==='think'? t*6 : 3)))*ease((t-0.45)/0.3);
      g.fillStyle=`rgba(46,123,214,${v})`; g.strokeStyle='rgba(46,123,214,.85)'; g.lineWidth=1;
      g.beginPath(); g.arc(l.xF,y,5,0,7); g.fill(); g.stroke();
      
    }
    // class neurons
    g.textAlign='left'; g.font='13px Patrick Hand, cursive';
    for(let j=0;j<12;j++){
      const y=l.cy(j); const pv = probs ? probs[j]*ease((t-1.0)/0.4) : 0;
      const r=4.5+ (j===win? 3*ease((t-1.1)/0.3):0);
      if(j===win && probs){ g.fillStyle=BINC[j]+'33'; g.beginPath(); g.arc(l.xC,y,r+6+2*Math.sin(t*5),0,7); g.fill(); }
      g.fillStyle = pv>0.02 ? BINC[j] : '#efe9da'; g.globalAlpha = pv>0.02 ? 0.35+0.65*Math.min(1,pv*1.4) : 1;
      g.beginPath(); g.arc(l.xC,y,r,0,7); g.fill(); g.globalAlpha=1;
      g.strokeStyle=BINC[j]; g.lineWidth=1; g.stroke();
      g.fillStyle = j===win&&probs ? '#22304a' : '#8e8a7e'; g.font = (j===win&&probs?'700 ':'400 ')+'13px Patrick Hand, cursive';
      if(W>360) g.fillText(NAMES[j], l.xC+10, y+3.5);
    }
    // bin nodes
    g.textAlign='center';
    for(let b=0;b<3;b++){
      const y=l.by(b), on = probs && binIdx(win)===b ? ease((t-1.45)/0.35) : 0;
      if(on>0){ g.fillStyle=BINS[b][1]+'30'; g.beginPath(); g.arc(l.xB,y,15+8*on+2*Math.sin(t*4),0,7); g.fill(); }
      g.fillStyle = on>0 ? BINS[b][1] : '#ffffff'; g.strokeStyle=BINS[b][1]; g.lineWidth=2;
      g.beginPath(); g.arc(l.xB,y,12+3*on,0,7); g.fill(); g.stroke();
      g.fillStyle = on>0 ? '#fff' : BINS[b][1]; g.font='700 11px Kalam, cursive'; g.fillText(BINS[b][0][0], l.xB, y+3.5);
    }
    requestAnimationFrame(draw);
  }
  new ResizeObserver(size).observe(cv); size(); requestAnimationFrame(draw);
  return {
    think(src){ thumb=src||thumb; probs=null; win=-1; mode='think'; t0=performance.now(); document.getElementById('nnstate').textContent='Running the photo through the network…'; },
    fire(p,k,src){ thumb=src||thumb; probs=p; win=k; mode='fire'; t0=performance.now(); document.getElementById('nnstate').textContent=NAMES[k]+' → '+BINS[binIdx(k)][0]+' bin'; }
  };
})();
