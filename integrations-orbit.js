// Adereso home integration map, adapted to the static Desk landing page.
(() => {
  const root = document.querySelector('.desk-orbit');
  if (!root) return;
  const buttons = [...root.querySelectorAll('[data-integration]')];
  const wires = [...root.querySelectorAll('[data-wire]')];
  const detail = root.querySelector('.desk-orbit-detail');
  const title = detail.querySelector('strong'), description = detail.querySelector('p');
  const initialTitle = title.textContent, initialDescription = description.textContent;
  let selected = null;
  const highlight = button => {
    buttons.forEach(node => node.classList.toggle('is-highlighted', node === button));
    wires.forEach(node => node.classList.toggle('is-highlighted', node.dataset.wire === button?.dataset.integration));
    title.textContent = button?.dataset.name || initialTitle;
    description.textContent = button?.dataset.description || initialDescription;
  };
  const choose = button => {
    selected = selected === button ? null : button;
    buttons.forEach(node => node.setAttribute('aria-pressed', String(node === selected)));
    highlight(selected);
  };
  buttons.forEach(button => {
    button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') highlight(button); });
    button.addEventListener('pointerleave', () => highlight(selected));
    button.addEventListener('focus', () => highlight(button));
    button.addEventListener('blur', () => highlight(selected));
    button.addEventListener('click', () => choose(button));
    button.addEventListener('keydown', event => {
      if (event.key === 'Escape') { selected = null; buttons.forEach(node => node.setAttribute('aria-pressed','false')); highlight(null); }
    });
  });

  const {gsap, ScrollTrigger} = window;
  if (!gsap || !ScrollTrigger) return; // The complete diagram still works without motion.
  gsap.registerPlugin(ScrollTrigger);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const signals = [...root.querySelectorAll('.desk-orbit-signal')].map(group => ({
    group, delay: Number(group.dataset.delay), tails: [...group.querySelectorAll('path')]
  }));
  const hub = root.querySelector('.desk-orbit-hub');
  const glow = root.querySelector('.desk-orbit-glow'), beam = root.querySelector('.desk-orbit-beam');
  const clock = {time: 0};
  let suspended = false;
  const paint = () => {
    signals.forEach(({group, delay, tails}) => {
      const phase = ((clock.time - delay + 5.2) % 5.2) / 2.6;
      group.style.opacity = phase < 1 ? '.95' : '0';
      tails.forEach(path => path.setAttribute('stroke-dashoffset', Number(path.dataset.tail) - phase * 1014));
    });
    const wave = (1-Math.cos(clock.time / 5.2 * Math.PI * 2)) / 2;
    hub.style.transform = 'translateY(' + (-7 * wave).toFixed(2) + 'px)';
    glow.style.opacity = (.7 + .3 * wave).toFixed(3);
    beam.style.opacity = (.55 + .3 * wave).toFixed(3);
  };
  const timeline = gsap.timeline({paused:true,repeat:-1}).fromTo(clock,{time:0},{time:5.2,duration:5.2,ease:'none',immediateRender:false,onUpdate:paint});
  const sync = () => {
    const r = root.getBoundingClientRect();
    const navBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
    const visible = Math.min(innerHeight,r.bottom) - Math.max(navBottom,0,r.top) >= Math.min(48,r.height*.12)
      && r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth;
    const active = visible && !document.hidden && !suspended && !reduced.matches;
    if (active) timeline.play(); else timeline.pause();
    root.dataset.motion = active ? 'playing' : 'paused';
    if (reduced.matches) {
      signals.forEach(({group}) => {group.style.opacity='0';});
      hub.style.transform=''; glow.style.opacity=''; beam.style.opacity='';
    }
  };
  ScrollTrigger.create({id:'desk-integrations-orbit',trigger:root,start:'top bottom',end:'bottom top',onToggle:sync,onUpdate:sync,onRefresh:sync});
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>{suspended=true;sync();});
  window.addEventListener('pageshow',()=>{suspended=false;sync();});
  sync();
})();
