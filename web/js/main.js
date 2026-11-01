/* ---------------- boot ---------------- */
new ResizeObserver(()=>resize()).observe(cv);
resize();
document.fonts && document.fonts.ready.then(()=>buildStatic());
requestAnimationFrame(t=>{ last=t; tick(t); });
