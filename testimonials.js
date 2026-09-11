(() => {
  const root = document.querySelector('.desk-testimonials');
  if (!root) return;
  const stage = root.querySelector('.desk-testimonials-stage');
  const cards = [...root.querySelectorAll('[data-testimonial]')];
  const dots = [...root.querySelectorAll('[data-testimonial-dot]')];
  const status = root.querySelector('.desk-testimonials-status');
  let active = cards.findIndex(card => card.classList.contains('is-active'));
  let drag = null, suppressClick = false;
  const wrap = n => (n + cards.length) % cards.length;
  function paint(progress = 0) {
    cards.forEach((card,index) => {
      let offset = index-active;
      if (offset > cards.length/2) offset -= cards.length;
      if (offset < -cards.length/2) offset += cards.length;
      const visual = offset-progress, abs = Math.abs(visual);
      card.style.transform = 'translateX(' + (visual*58) + '%) scale(' + (1-Math.min(abs,1)*.15) + ')';
      card.style.opacity = abs > 1.35 ? '0' : String(Math.max(0,1-abs*.72));
      card.style.zIndex = String(Math.round(4-abs*2));
      card.classList.toggle('is-active',index===active);
      card.setAttribute('aria-hidden',String(index!==active));
      card.tabIndex = index===active ? 0 : -1;
    });
    dots.forEach((dot,index)=>dot.setAttribute('aria-current',String(index===active)));
  }
  function go(index) {
    const focusedCard = cards.includes(document.activeElement);
    active=wrap(index); paint();
    status.textContent=(active+1)+' de '+cards.length+': '+cards[active].dataset.author+'.';
    if(focusedCard)cards[active].focus({preventScroll:true});
  }
  root.querySelector('[data-testimonial-prev]').addEventListener('click',()=>go(active-1));
  root.querySelector('[data-testimonial-next]').addEventListener('click',()=>go(active+1));
  dots.forEach((dot,index)=>dot.addEventListener('click',()=>go(index)));
  root.addEventListener('keydown',event=>{
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    if(event.key==='ArrowLeft'){event.preventDefault();go(active-1);}
    if(event.key==='ArrowRight'){event.preventDefault();go(active+1);}
    if(event.key==='Home'){event.preventDefault();go(0);}
    if(event.key==='End'){event.preventDefault();go(cards.length-1);}
  });
  stage.addEventListener('dragstart',event=>event.preventDefault());
  stage.addEventListener('pointerdown',event=>{
    if(!event.isPrimary || event.button!==0) return;
    suppressClick=false;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,progress:0,moved:false,step:cards[active].getBoundingClientRect().width*.58};
  });
  stage.addEventListener('pointermove',event=>{
    if(!drag || event.pointerId!==drag.id) return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.moved){
      if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){drag=null;return;}
      if(Math.abs(dx)<8)return;
      drag.moved=true;suppressClick=true;stage.classList.add('is-dragging');stage.setPointerCapture(event.pointerId);
    }
    drag.progress=Math.max(-1,Math.min(1,-dx/drag.step));
    paint(drag.progress);
  });
  function settle(event,cancelled=false) {
    if(!drag || event.pointerId!==drag.id)return;
    const previous=drag;drag=null;
    if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
    stage.classList.remove('is-dragging');
    if(previous.moved){
      const direction=!cancelled&&Math.abs(previous.progress)>.18 ? Math.sign(previous.progress):0;
      go(active+direction);
    }
  }
  stage.addEventListener('pointerup',event=>settle(event));
  stage.addEventListener('pointercancel',event=>settle(event,true));
  stage.addEventListener('lostpointercapture',event=>settle(event,true));
  stage.addEventListener('click',event=>{if(suppressClick){if(event.detail!==0)event.preventDefault();suppressClick=false;}},true);
  root.classList.add('is-ready');
  root.querySelector('.desk-testimonials-controls').hidden=false;
  paint();
})();
