/* ---------------- AI bin sorter (ONNX Runtime Web) ---------------- */
(()=>{
  const CLASSES=["battery","biological","brown-glass","cardboard","clothes","green-glass","metal","paper","plastic","shoes","trash","white-glass"];
  const NICE={battery:"Battery",biological:"Food / organic","brown-glass":"Brown glass",cardboard:"Cardboard",clothes:"Clothes","green-glass":"Green glass",metal:"Metal",paper:"Paper",plastic:"Plastic",shoes:"Shoes",trash:"Mixed trash","white-glass":"Clear glass"};
  const BIN={biological:"green",battery:"red"}; const binOf=c=>BIN[c]||"blue";
  const BINTXT={green:["Green bin","Wet waste: goes to the compost shed"],blue:["Blue bin","Dry waste: goes to the kabadi co-op"],red:["Red bin","Hazardous: keep separate for safe disposal"]};
  const COL={green:"#2fa36b",blue:"#2e7bd6",red:"#e04848"};
  const ORT=new URL("vendor/ort/", location.href).href;  // ONNX Runtime Web 1.19.2, bundled so the demo works offline
  let session=null, loading=null, stream=null;
  const q=s=>document.querySelector(s);
  const verdict=q('#verdict'), vbin=q('#vbin'), vcls=q('#vcls'), probs=q('#probs');
  function setIdle(t,sub){ verdict.className='verdict v-idle'; vbin.innerHTML=t; vcls.textContent=sub||''; }
  function loadSession(){
    if(session) return Promise.resolve(session);
    if(loading) return loading;
    loading=new Promise((res,rej)=>{
      const sc=document.createElement('script'); sc.src=ORT+'ort.min.js';
      sc.onload=async()=>{ try{ ort.env.wasm.wasmPaths=ORT; session=await ort.InferenceSession.create('waste_mobilenetv2.onnx',{executionProviders:['wasm']}); res(session);}catch(e){ loading=null; rej(e);} };
      sc.onerror=()=>{ loading=null; rej(new Error('Could not load the AI library. Open the app through python -m http.server, not by double-clicking the file.')); };
      document.head.appendChild(sc);
    });
    return loading;
  }
  function toTensor(src){
    const c=document.createElement('canvas'); c.width=224; c.height=224; const g=c.getContext('2d');
    g.drawImage(src,0,0,224,224); const d=g.getImageData(0,0,224,224).data;
    const A=224*224, f=new Float32Array(3*A);
    for(let i=0;i<A;i++){ f[i]=d[i*4]/255; f[A+i]=d[i*4+1]/255; f[2*A+i]=d[i*4+2]/255; }
    return new ort.Tensor('float32',f,[1,3,224,224]);
  }
  async function classify(src){
    setIdle('<span class="spinner"></span> Thinking…','The first run loads the model, which takes a few seconds');
    NN.think(src);
    try{
      const s=await loadSession();
      const out=await s.run({image:toTensor(src)}); const z=Array.from(out.logits.data);
      const m=Math.max(...z), e=z.map(v=>Math.exp(v-m)), sum=e.reduce((a,b)=>a+b,0), p=e.map(v=>v/sum);
      const order=p.map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]);
      const top=CLASSES[order[0][1]], bin=binOf(top);
      NN.fire(p, order[0][1], src);
      verdict.className='verdict v-'+bin; vbin.textContent=BINTXT[bin][0];
      vcls.textContent=NICE[top]+' ('+(order[0][0]*100).toFixed(0)+'% sure) · '+BINTXT[bin][1];
      probs.innerHTML=order.slice(0,3).map(([v,i])=>'<li><span>'+NICE[CLASSES[i]]+'</span><div class="pb"><i style="background:'+COL[binOf(CLASSES[i])]+'"></i></div><span class="mono">'+(v*100).toFixed(0)+'%</span></li>').join('');
      requestAnimationFrame(()=>probs.querySelectorAll('.pb i').forEach((el,k)=>el.style.width=(order[k][0]*100)+'%'));
    }catch(err){
      setIdle('Could not run the model', location.protocol==='file:' ? 'Open the deployed site or a local server; browsers block loading the model from a plain file.' : (err && err.message) || 'Unknown error');
    }
  }
  const img=q('#aiimg'), vid=q('#aivid'), hint=q('#aihint'), drop=q('#drop');
  function stopCam(){ if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; } q('#camSnap').hidden=true; q('#camOff').hidden=true; q('#camOn').hidden=false; }
  function showImage(file){ if(!file || !file.type.startsWith('image/')) return; stopCam(); vid.hidden=true;
    img.onload=()=>classify(img); img.src=URL.createObjectURL(file); img.hidden=false; hint.hidden=true; }
  q('#aifile').addEventListener('change',e=>showImage(e.target.files[0]));
  ['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{ e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{ e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop',e=>showImage(e.dataTransfer.files[0]));
  drop.addEventListener('click',e=>{ if(stream) e.preventDefault(); });
  q('#camOn').onclick=async()=>{
    try{ stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
      vid.srcObject=stream; await vid.play(); vid.hidden=false; img.hidden=true; hint.hidden=true;
      q('#camSnap').hidden=false; q('#camOff').hidden=false; q('#camOn').hidden=true; loadSession().catch(()=>{});
    }catch(e){ setIdle('Camera not available','Allow camera access, or tap the box to upload a photo instead.'); }
  };
  q('#camSnap').onclick=()=>classify(vid);
  document.querySelectorAll('[data-sample]').forEach(b=>b.onclick=()=>{ stopCam(); vid.hidden=true; img.onload=()=>classify(img); img.src=b.dataset.sample; img.hidden=false; hint.hidden=true; });
  q('#camOff').onclick=()=>{ stopCam(); vid.hidden=true; if(img.hidden) hint.hidden=false; };
})();
