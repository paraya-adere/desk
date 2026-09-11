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
    const root = state.root;
    const restorers = [];
    const remember = (node, names) => {
      const saved = names.map(name => [name, node.getAttribute(name)]);
      restorers.push(() => saved.forEach(([name, value]) => {
        if (value === null) node.removeAttribute(name);
        else node.setAttribute(name, value);
      }));
    };
    const textWriter = node => {
      if (!node) return () => {};
      // Keep unit labels and SLA badges intact; update only the leading text.
      const text = [...node.childNodes].find(child => child.nodeType === 3);
      if (!text) return () => {};
      const original = text.nodeValue;
      restorers.push(() => { text.nodeValue = original; });
      return value => { const next = String(value); if (text.nodeValue !== next) text.nodeValue = next; };
    };
    const create = (tag, parent, className) => {
      const node = root.ownerDocument.createElement(tag);
      node.className = className;
      parent.appendChild(node);
      restorers.push(() => node.remove());
      return node;
    };
    const svg = (tag, parent, attrs) => {
      const node = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      parent.appendChild(node);
      restorers.push(() => node.remove());
      return node;
    };
    const clamp = x => Math.max(0, Math.min(1, x));
    const ease = x => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
    const ramp = (t, start, duration = 1) => ease((t - start) / duration);
    const envelope = (t, start, end) => ramp(t, start, .45) * (1 - ramp(t, end, .5));
    const metrics = [...root.querySelectorAll('.analytics-kpis > div, .monitor-metrics > div')].map(node => {
      const label = node.querySelector('span')?.textContent.trim();
      const strong = node.querySelector('strong');
      remember(node, ['style']);
      return { node, label, write: textWriter(strong), denominator: textWriter(strong?.querySelector('small')) };
    });
    const queues = [...root.querySelectorAll('.monitor-queue, .analytics-queue-grid > div')];
    const queueValues = queues.map(node => {
      remember(node, ['style']);
      return textWriter(node.querySelector('.monitor-queue-total strong, :scope > strong'));
    });
    const agentText = textWriter(root.querySelector('.monitor-queue-total > span'));
    const channels = queues.slice(0, 2).map(node => {
      const rows = [...node.querySelectorAll('.monitor-channel')];
      return rows.map(row => textWriter(row.querySelector('div')));
    });
    const sourcePlots = [...root.querySelectorAll('.monitor-plot, .analytics-plot')];
    const plots = sourcePlots.map((plot, plotIndex) => {
      const series = [...plot.querySelectorAll('path[stroke]')].map((path, index) => {
        const color = path.getAttribute('stroke');
        const dots = [...plot.querySelectorAll('circle')].filter(dot => dot.getAttribute('fill') === color);
        const referenceDots = plotIndex === 1 && index === 0
          ? [...sourcePlots[0].querySelectorAll('circle')].filter(dot => dot.getAttribute('fill') === '#3aad19')
          : dots;
        const points = referenceDots.map(dot => ({ x: +dot.getAttribute('cx'), y: +dot.getAttribute('cy') }));
        remember(path, ['d', 'stroke-width', 'opacity']);
        dots.forEach(dot => remember(dot, ['cy', 'opacity', 'r']));
        path.setAttribute('stroke-width', '1.8');
        // In the rate chart the first series is incoming, the second outgoing.
        const type = plotIndex === 1 ? (index === 0 ? 'incoming' : 'outgoing')
          : color === '#3aad19' ? 'incoming' : color === '#ff4047' ? 'outgoing' : 'flat';
        return { path, dots, points, type };
      });
      const bars = [...plot.querySelectorAll('rect[height]')].map(node => {
        remember(node, ['y', 'height']);
        return { node, height: +node.getAttribute('height'), y: +node.getAttribute('y') };
      });
      // Two completed tickets add a new SLA bar at the latest time.
      if (bars.length) bars.push({ node: svg('rect', plot, {x:334,y:151,width:7,height:0,rx:1,fill:'#c4ad48'}), height:128, y:23, fresh:true });
      const cursor = svg('line', plot, {x1:26,x2:26,y1:23,y2:151,stroke:'#6879d6','stroke-width':1,'stroke-dasharray':'3 4',opacity:0});
      const pulse = svg('circle', plot, {cx:314,cy:87,r:4,fill:'none',stroke:'#6579db','stroke-width':1.5,opacity:0});
      return { series, bars, cursor, pulse };
    });
    const host = root.querySelector('.desk-monitor') || root;
    remember(host, ['class']);
    host.classList.add('analytics-live-scene');
    const toast = create('div', host, 'analytics-live-notice');
    // Visual demo feedback, not a repeated screen-reader announcement.
    toast.setAttribute('aria-hidden', 'true');
    const icon = create('span', toast, 'analytics-live-notice-icon');
    const copy = create('div', toast, 'analytics-live-notice-copy');
    const eyebrow = create('small', copy, '');
    eyebrow.textContent = 'MONITOREO · DEMO EN VIVO';
    const title = create('strong', copy, '');
    const detail = create('span', copy, '');
    const progress = create('i', toast, 'analytics-live-notice-progress');
    const clock = { seconds: 0 };
    let lastPhase = '';
    const paint = () => {
      const t = clock.seconds;
      const intro = ramp(t, 0, 1.8);
      const arrival = ramp(t, 2.8, 1.1);
      const assigned = ramp(t, 6.5, .9);
      const resolved = ramp(t, 10, 1.1);
      const created = Math.round(8 * intro) + Math.round(2 * arrival);
      const closed = Math.round(6 * intro) + Math.round(2 * resolved);
      const opened = created - closed;
      const waiting = Math.max(0, opened - Math.round(4 * assigned) + Math.round(2 * resolved));
      metrics.forEach(({node,label,write,denominator}, index) => {
        const values = {
          Creados: created, Cerrados: closed, Ignorados: 0,
          'En SLA': Math.round(100 * intro), TMA: 0,
          'Tasa de Entrada': (created / 14).toFixed(2) + ' ',
          'Tasa de Salida': (closed / 14).toFixed(2) + ' ',
          'Tickets en SLA': closed + ' ',
          TMO: Math.round(18 * intro - resolved) + (state.tab ? 'min' : '')
        };
        if (label in values) write(values[label]);
        if (label === 'Tickets en SLA') denominator('/' + closed);
        const active = label === 'Creados' || label === 'Tasa de Entrada'
          ? envelope(t, 2.8, 4.6) : label === 'Cerrados' || label === 'TMO' || label === 'Tickets en SLA' || label === 'Tasa de Salida'
          ? envelope(t, 10, 12) : 0;
        const entrance = 1 - ramp(t, index * .045, .8);
        node.style.transform = 'translateY(' + (entrance * 7 - active * 3).toFixed(2) + 'px)';
        node.style.boxShadow = '0 0 0 3px rgba(101,121,219,' + (active * .13).toFixed(3) + ')';
        node.style.color = active > .1 ? '#5368c5' : '';
      });
      queueValues.forEach((write, index) => write(index === 0 ? opened : index === 1 ? waiting : 0));
      agentText('Agente ' + Math.max(0, opened - waiting) + ' · Bot 0 · Sin asignar ' + waiting);
      channels.forEach((rows, index) => {
        rows[0]?.(Math.round(2 * arrival) - (index === 0 ? Math.round(2 * resolved) : Math.round(2 * assigned)) + ' Tickets');
        rows[1]?.((index === 0 ? 1 : 1 - Math.round(assigned)) + ' Tickets');
      });
      queues.forEach((node, index) => {
        const attention = index === 1 ? envelope(t, 3.2, 9) : index === 0 ? envelope(t, 10, 12.7) : 0;
        const entrance = 1 - ramp(t, .15 + index * .09, .9);
        node.style.transform = 'translateY(' + (entrance * 12 - attention * 7).toFixed(2) + 'px) scale(' + (1 + attention * .018).toFixed(4) + ')';
        node.style.position = 'relative';
        node.style.zIndex = attention > .1 ? '2' : '';
        const color = t < 6.5 && index === 1 ? '207,67,87' : '56,139,113';
        node.style.boxShadow = '0 12px 24px rgba(' + color + ',' + (attention * .16).toFixed(3) + '), 0 0 0 2px rgba(' + color + ',' + (attention * .3).toFixed(3) + ')';
      });
      plots.forEach(({series,bars,cursor,pulse}, plotIndex) => {
        series.forEach(({path,dots,points,type}) => {
          if (!points.length) return;
          const ys = points.map(({x,y}, i) => {
            const draw = ramp(t, i * .07, .85);
            const added = type === 'incoming' && x === 314 ? 2 * arrival : type === 'outgoing' && x === 338 ? 2 * resolved : 0;
            return 151 - (151 - y) * draw - added * 32;
          });
          let d = 'M ' + points[0].x + ' ' + ys[0];
          for (let i=1; i<points.length; i++) {
            const mid = (points[i-1].x + points[i].x) / 2;
            d += ' C ' + mid + ' ' + ys[i-1] + ', ' + mid + ' ' + ys[i] + ', ' + points[i].x + ' ' + ys[i];
          }
          path.setAttribute('d', d);
          dots.forEach((dot,i) => {
            dot.setAttribute('cy', ys[i]);
            dot.setAttribute('opacity', .2 + .8 * ramp(t, i * .07, .6));
            dot.setAttribute('r', (type === 'incoming' && points[i].x === 314 && arrival > 0) || (type === 'outgoing' && points[i].x === 338 && resolved > 0) ? 3 : 1.8);
          });
        });
        bars.forEach(({node,height,y,fresh}, index) => {
          const p = fresh ? resolved : ramp(t, index * .16, 1.2);
          node.setAttribute('height', height * p);
          node.setAttribute('y', y + height * (1 - p));
        });
        const scan = clamp(t / 2.2);
        cursor.setAttribute('x1',26 + scan * 312); cursor.setAttribute('x2',26 + scan * 312);
        cursor.setAttribute('opacity', envelope(t,0,2.1) * .55);
        const beat = t < 6.5 ? envelope(t,3.2,5.5) : envelope(t,10.3,12.4);
        pulse.setAttribute('cx',t < 6.5 ? 314 : 338);
        pulse.setAttribute('cy',plotIndex === 2 ? 23 : 87);
        pulse.setAttribute('r',4 + ((t * 1.2) % 1) * 10);
        pulse.setAttribute('opacity',beat * (1 - ((t * 1.2) % 1)) * .65);
      });
      const phase = t < 6.3 ? 'attention' : t < 9.8 ? 'assigned' : 'resolved';
      if (phase !== lastPhase) {
        lastPhase = phase;
        toast.dataset.tone = phase === 'attention' ? 'warning' : 'success';
        icon.textContent = phase === 'attention' ? '!' : '✓';
        title.textContent = phase === 'attention' ? '4 tickets esperan asignación' : phase === 'assigned' ? '4 tickets asignados a Postventa' : '2 tickets resueltos';
        detail.textContent = phase === 'attention' ? 'Llegaron 2 consultas nuevas. Tu equipo puede actuar.' : phase === 'assigned' ? 'El equipo ya tiene el contexto para responder.' : '100% dentro del SLA · TMO: 17 min';
      }
      const start = phase === 'attention' ? 3.3 : phase === 'assigned' ? 6.8 : 10.4;
      const end = phase === 'attention' ? 5.9 : phase === 'assigned' ? 9.4 : 13.6;
      const amount = envelope(t,start,end);
      toast.style.opacity = amount.toFixed(3);
      toast.style.transform = 'translateY(' + ((1-amount) * -14).toFixed(2) + 'px) scale(' + (.96 + .04*amount).toFixed(4) + ')';
      progress.style.transform = 'scaleX(' + (1-clamp((t-start)/(end-start))).toFixed(4) + ')';
    };
    state.restore = () => restorers.reverse().forEach(restore => restore());
    // One deterministic 16-second story; no independent timers survive offscreen.
    state.timeline = gsap.timeline({ paused:true, repeat:-1 });
    state.timeline.fromTo(clock, { seconds:0 }, {
      seconds:16, duration:16, ease:'none', immediateRender:false, onUpdate:paint
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
