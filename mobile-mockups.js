// Keep one live hero mockup: on narrow screens move it into a desktop-width
// viewport and scale that viewport, instead of stacking its internal columns.
(() => {
  const product = document.querySelector('.hero-product');
  const host = product?.parentElement;
  if (!host) return;
  const tabs = [...document.querySelectorAll('.value-tab')];
  tabs.forEach(tab => {
    tab.dataset.mockupPanel = tab.getAttribute('aria-controls');
    product.querySelector('#' + tab.dataset.mockupPanel)?.setAttribute('aria-label', tab.textContent.trim());
  });
  const width = 1184;
  const narrow = matchMedia('(max-width: 900px)');
  let shell, frame, surface;
  let scheduled = false;
  const fit = () => {
    scheduled = false;
    if (!narrow.matches || !surface) return;
    const scale = host.clientWidth / width;
    const height = Math.ceil(product.getBoundingClientRect().height);
    frame.style.height = height + 'px';
    frame.style.transform = `scale(${scale})`;
    shell.style.height = height * scale + 'px';
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(fit);
  };
  const mount = () => {
    shell = document.createElement('div');
    shell.id = 'mobile-hero-preview';
    shell.setAttribute('role', 'region');
    shell.setAttribute('aria-label', 'Vista de escritorio de Adereso Desk');
    shell.style.cssText = 'position:relative;z-index:2;width:100%;overflow:hidden;border-radius:12px;background:#eef2f8';
    frame = document.createElement('iframe');
    frame.title = 'Mockup de Adereso Desk en proporción de escritorio';
    frame.style.cssText = `position:absolute;left:0;top:0;display:block;width:${width}px;max-width:none;height:734px;border:0;transform-origin:top left`;
    shell.append(frame);
    host.append(shell);
    const doc = frame.contentDocument;
    doc.open();
    doc.write('<!doctype html><html lang="es"><head></head><body><div class="hero"><div class="desk-mockup-frame"></div></div></body></html>');
    doc.close();
    const base = doc.createElement('base');
    base.href = document.baseURI;
    doc.head.append(base);
    document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
      const copy = node.cloneNode(true);
      copy.addEventListener('load', schedule);
      doc.head.append(copy);
    });
    const reset = doc.createElement('style');
    reset.textContent = `html,body{margin:0!important;padding:0!important;width:${width}px;overflow:hidden;background:transparent!important}body::before,body::after{display:none!important}.hero{margin:0!important;padding:0!important;width:100%;max-width:none;background:none!important}.desk-mockup-frame{width:100%;margin:0}.desk-mockup-frame::before,.desk-mockup-frame::after{display:none!important}.hero-product{margin:0!important;width:100%;box-shadow:none!important}`;
    doc.head.append(reset);
    surface = doc.querySelector('.desk-mockup-frame');
    doc.fonts.ready.then(schedule);
    new ResizeObserver(schedule).observe(product);
  };
  const update = () => {
    if (narrow.matches) {
      if (!surface) mount();
      shell.hidden = false;
      surface.append(product);
      tabs.forEach(tab => tab.setAttribute('aria-controls', shell.id));
      fit();
    } else if (surface) {
      host.insertBefore(product, shell);
      shell.hidden = true;
      tabs.forEach(tab => tab.setAttribute('aria-controls', tab.dataset.mockupPanel));
    }
  };
  new ResizeObserver(schedule).observe(host);
  narrow.addEventListener('change', update);
  update();
})();
