// Scale the complete preview, retaining its authored layout and fixed height.
// Its scaled footprint plus the tabs fits below the site's fixed navigation.
(() => {
  const stage = document.querySelector('.hero .desk-mockup-stage');
  const frame = stage?.querySelector('.desk-mockup-frame');
  const tabs = document.querySelector('#canales .value-row');
  const header = document.querySelector('.site-header');
  if (!stage || !frame || !tabs) return;
  let queued = false;
  const fit = () => {
    queued = false;
    const viewportHeight = window.visualViewport?.height || innerHeight;
    const headerHeight = header?.getBoundingClientRect().height || 0;
    const controlsHeight = tabs.getBoundingClientRect().height;
    const nativeHeight = frame.offsetHeight + 24;
    const availableHeight = Math.max(100, viewportHeight - headerHeight - controlsHeight - 32);
    const scale = Math.min(1, availableHeight / nativeHeight);
    stage.style.setProperty('--hero-preview-scale', String(scale));
    stage.style.setProperty('--hero-preview-height', nativeHeight * scale + 'px');
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(fit);
  };
  const observer = new ResizeObserver(schedule);
  [frame, tabs, header].filter(Boolean).forEach(el => observer.observe(el));
  window.addEventListener('resize', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  document.fonts?.ready.then(schedule);
  schedule();
})();
