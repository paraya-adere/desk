// One visibility-gated timeline per analytics mockup. The mobile hero adopts the
// same live DOM into an iframe; keep those references and observe its OUTER stage.
(() => {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) return; // The authored dashboards remain readable.
  gsap.registerPlugin(ScrollTrigger);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const states = [];
  let suspended = false;
  let refreshFrame = 0;

  function visible(state) {
    if (suspended || document.hidden || reduced.matches || !state.root.isConnected || state.root.hidden) return false;
    if (state.tab && state.tab.getAttribute('aria-selected') !== 'true') return false;
    const rect = state.surface.getBoundingClientRect();
    const navBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
    const top = Math.max(0, navBottom, rect.top);
    const bottom = Math.min(innerHeight, rect.bottom);
    return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < innerWidth
      && bottom - top >= Math.min(48, rect.height * .12);
  }

  function prepare(state) {
    const restorers = [];
    const lines = [];
    const dots = [];
    const bars = [];
    const metrics = [];
    const remember = (node, names) => {
      const attrs = names.map(name => [name, node.getAttribute(name)]);
      restorers.push(() => attrs.forEach(([name, value]) => {
        if (value === null) node.removeAttribute(name);
        else node.setAttribute(name, value);
      }));
    };
    state.root.querySelectorAll('.monitor-plot, .analytics-plot').forEach(plot => {
      plot.querySelectorAll('path[stroke]').forEach(path => {
        const length = path.getTotalLength();
        if (!Number.isFinite(length) || length <= 0) return;
        remember(path, ['stroke-dasharray', 'stroke-dashoffset']);
        // Preserve a faint full series so a replay never empties the chart.
        const ghost = path.cloneNode(false);
        ghost.removeAttribute('id');
        ghost.setAttribute('opacity', '.13');
        ghost.setAttribute('aria-hidden', 'true');
        path.before(ghost);
        restorers.push(() => ghost.remove());
        path.setAttribute('stroke-dasharray', String(length));
        lines.push({ node: path, length });
      });
      plot.querySelectorAll('circle').forEach(dot => {
        remember(dot, ['opacity']);
        dots.push({ node: dot, at: Math.max(0, Math.min(1, (Number(dot.getAttribute('cx')) - 26) / 312)) });
      });
      plot.querySelectorAll('rect[height]').forEach(bar => {
        const height = Number(bar.getAttribute('height'));
        const y = Number(bar.getAttribute('y'));
        remember(bar, ['height', 'y']);
        const ghost = bar.cloneNode(false);
        ghost.removeAttribute('id');
        ghost.setAttribute('opacity', '.13');
        ghost.setAttribute('aria-hidden', 'true');
        bar.before(ghost);
        restorers.push(() => ghost.remove());
        bars.push({ node: bar, height, y });
      });
    });
    state.root.querySelectorAll('.analytics-kpis > div, .monitor-metrics > div').forEach(node => {
      const value = node.style.getPropertyValue('box-shadow');
      const priority = node.style.getPropertyPriority('box-shadow');
      restorers.push(() => {
        if (value) node.style.setProperty('box-shadow', value, priority);
        else node.style.removeProperty('box-shadow');
      });
      metrics.push({ node, value });
    });
    const clock = { progress: 0 };
    const paint = () => {
      const p = clock.progress;
      lines.forEach(({ node, length }) => node.setAttribute('stroke-dashoffset', String(length * (1 - p))));
      dots.forEach(({ node, at }) => node.setAttribute('opacity', p >= at ? '1' : '.13'));
      bars.forEach(({ node, height, y }, index) => {
        const amount = Math.max(0, Math.min(1, (p - index * .045) / .8));
        node.setAttribute('height', String(height * amount));
        node.setAttribute('y', String(y + height * (1 - amount)));
      });
      const glow = Math.sin(p * Math.PI) * .18;
      metrics.forEach(({ node, value }) => {
        if (p >= 1) {
          if (value) node.style.setProperty('box-shadow', value);
          else node.style.removeProperty('box-shadow');
        } else node.style.setProperty('box-shadow', `inset 0 0 0 40px rgba(105, 128, 220, ${glow.toFixed(3)})`);
      });
    };
    state.restore = () => restorers.reverse().forEach(restore => restore());
    // Immediate first frame on entry; readable hold between slow, subtle replays.
    state.timeline = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 5.2 });
    state.timeline.fromTo(clock, { progress: 0 }, {
      progress: 1, duration: 2.8, ease: 'none', immediateRender: false, onUpdate: paint
    });
    paint();
  }

  function sync(state) {
    if (reduced.matches) {
      state.timeline?.kill();
      state.timeline = null;
      state.playing = false;
      state.restore?.();
      state.restore = null;
      state.root.dataset.analyticsMotion = 'reduced';
      return;
    }
    if (visible(state)) {
      if (!state.timeline) prepare(state);
      // Start immediately on every new viewing session, never in a repeat delay.
      if (!state.playing) state.timeline.restart();
      state.playing = true;
      state.root.dataset.analyticsMotion = 'playing';
    } else {
      state.timeline?.pause();
      state.playing = false;
      state.root.dataset.analyticsMotion = 'paused';
    }
  }
  const syncAll = () => states.forEach(sync);
  const refresh = () => {
    if (refreshFrame) return;
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0;
      ScrollTrigger.refresh();
      syncAll();
    });
  };
  function register(root, surface, tab) {
    if (!root || !surface) return;
    const state = { root, surface, tab, timeline: null, restore: null, playing: false };
    states.push(state);
    state.trigger = ScrollTrigger.create({
      id: tab ? 'desk-analytics-hero' : 'desk-analytics-section',
      trigger: surface, start: 'top bottom', end: 'bottom top',
      onToggle: () => sync(state), onUpdate: () => sync(state), onRefresh: () => sync(state)
    });
    new ResizeObserver(refresh).observe(surface);
    if (tab) new MutationObserver(() => { sync(state); refresh(); }).observe(tab, {
      attributes: true, attributeFilter: ['aria-selected']
    });
    sync(state);
  }
  register(document.querySelector('#mockup-analitica'), document.querySelector('.desk-mockup-stage'), document.querySelector('#tab-analitica'));
  register(document.querySelector('.analytics-dashboard'), document.querySelector('.analytics-frame'));
  reduced.addEventListener('change', syncAll);
  document.addEventListener('visibilitychange', syncAll);
  window.addEventListener('pagehide', () => { suspended = true; syncAll(); });
  window.addEventListener('pageshow', () => { suspended = false; refresh(); });
  document.fonts?.ready.then(refresh);
  window.addEventListener('load', refresh, { once: true });
})();
