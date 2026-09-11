// The stage stays 700px (640px on mobile). Only overflowing pane contents
// are fitted, so every ticket and message stays visible without nested scroll.
(() => {
  const root = document.querySelector('.home-desk');
  const view = document.getElementById('home-desk-view');
  if (!root || !view) return;
  const selector = '.home-desk-messages, .helpdesk-mockup__ticket-list > div:last-child, .helpdesk-mockup__profile > div:last-child, [role="region"] > div > div:last-child';
  let scheduled = false;
  const fit = () => {
    scheduled = false;
    if (!root.getClientRects().length) return;
    for (const pane of view.querySelectorAll(selector)) {
      if (!pane.clientHeight) continue;
      const children = [...pane.children];
      children.forEach(child => { child.style.zoom = ''; });
      let scale = 1;
      const css = getComputedStyle(pane);
      const padding = parseFloat(css.paddingTop) + parseFloat(css.paddingBottom);
      for (let pass = 0; pass < 5 && pane.scrollHeight > pane.clientHeight + 1; pass++) {
        scale *= (pane.clientHeight - padding) / (pane.scrollHeight - padding) * 0.985;
        children.forEach(child => { child.style.zoom = String(scale); });
      }
      pane.dataset.fitScale = scale.toFixed(3);
    }
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(fit);
  };
  new ResizeObserver(schedule).observe(root);
  new MutationObserver(schedule).observe(view, { childList: true });
  root.addEventListener('load', schedule, true);
  document.fonts?.ready.then(schedule);
  schedule();
})();
