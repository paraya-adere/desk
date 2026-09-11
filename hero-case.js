// Two stages of the same case, reusing the approved inbox's app chrome.
(() => {
  const source = document.querySelector('#mockup-inbox .home-desk');
  if (!source) return;
  const productImage = source.querySelector('img[data-desk-product]');
  const message = (text, time, author = '') => `
    <div class="case-message ${author ? 'case-message--out' : ''}">
      ${author ? `<strong>${author}</strong>` : ''}<p>${text}</p><time>${time}${author ? ' · ✓✓' : ''}</time>
    </div>`;
  const customer = `
    <div class="case-person"><span class="case-avatar">FR</span><div><strong>Fernando Rojas</strong><span>+56 9 7841 2396 · WhatsApp</span></div></div>`;
  const order = `
    <div class="case-order-heading"><strong>Pedido #1086</strong><span class="case-status">En preparación</span></div>
    <div class="case-order-product"><span class="case-product-image"></span><div><strong>Cafetera de Cápsulas Aura</strong><span>1 unidad · $84.990</span></div></div>
    <dl class="case-fields"><div><dt>Pago</dt><dd>Pagado</dd></div><div><dt>Envío</dt><dd>Aún no despachado</dd></div><div><dt>Dirección actual</dt><dd>Av. Providencia 1234, Santiago</dd></div></dl>`;
  const request = message('Ya compré la cafetera. ¿Puedo cambiar la dirección del pedido #1086?', '10:42');
  const messages = request
    + message('Hola, Fernando. Encontré tu pedido; voy a revisar el estado del envío.', '10:42', 'Agente IA');

  for (const [key, handoff] of [['contexto', false], ['ia', true]]) {
    const panel = document.getElementById('mockup-' + key);
    if (!panel) continue;
    const root = source.cloneNode(true);
    root.classList.add('hero-case', handoff ? 'hero-case--handoff' : 'hero-case--context');
    root.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    root.querySelectorAll('[style]').forEach(el => { el.style.zoom = ''; });
    root.querySelector('.helpdesk-mockup > div > div').classList.add('case-view');
    const detail = root.querySelector('.helpdesk-mockup__detail');
    const chat = detail.querySelector('.helpdesk-mockup__chat');
    const list = detail.querySelector('.helpdesk-mockup__ticket-list');
    // This list establishes continuity; the original inbox keeps ticket navigation.
    list.querySelectorAll('button').forEach(button => {
      const card = document.createElement('div');
      card.className = button.className;
      card.classList.toggle('case-selected-ticket', button.getAttribute('aria-pressed') === 'true');
      card.innerHTML = button.innerHTML;
      button.replaceWith(card);
    });
    const selected = list.querySelector('.case-selected-ticket');
    selected.querySelector('.helpdesk-ticket-card__preview').textContent = '¿Puedo cambiar la dirección del pedido #1086?';
    selected.querySelector('.helpdesk-ticket-card__header > span').textContent = 'Ahora';
    chat.querySelector('[data-desk-close]')?.remove();
    chat.querySelector('header > span').textContent = handoff ? 'Con Pedro' : 'Agente IA';
    chat.querySelector('header > div:nth-child(2) > p').textContent = '+56 9 7841 2396 · WhatsApp · seguimiento de compra';
    const conversation = document.createElement('div');
    conversation.className = 'case-conversation';
    conversation.innerHTML = `<div class="case-date">Hoy · Seguimiento del pedido</div>${handoff ? request : messages}`
      + (handoff
        ? message('Aún no se despacha. Te derivo a Postventa con los datos de tu pedido.', '10:43', 'Agente IA')
          + '<div class="case-handoff-event">IA → Postventa · Pedro se unió con el contexto completo</div>'
          + message('¡Hola, Fernando! Ya tengo el pedido #1086 y el contexto. ¿Cuál es la nueva dirección?', '10:43', 'Pedro L. · Postventa')
        : '<div class="case-context-event">Pedido #1086 vinculado a esta conversación · Shopify</div>');
    chat.querySelector('.home-desk-messages').replaceWith(conversation);
    chat.querySelector('footer').innerHTML = `<div class="case-composer-status">${handoff ? 'Pedro L. · Postventa' : 'Agente IA · consultando el pedido'}</div><div class="case-composer">${handoff ? 'Escribe un mensaje…' : 'El agente IA está atendiendo esta conversación'}<span aria-hidden="true">↗</span></div>`;
    const sidebar = document.createElement('aside');
    sidebar.className = 'case-sidebar';
    sidebar.setAttribute('aria-label', handoff ? 'Derivación al equipo con contexto' : 'Contexto del cliente y sus pedidos');
    if (!handoff) {
      sidebar.innerHTML = `${customer}
        <div class="case-side-tabs" role="tablist" aria-label="Contexto de Fernando">
          <button id="case-tab-cliente" type="button" role="tab" aria-controls="case-panel-cliente" aria-selected="false" tabindex="-1">Cliente</button>
          <button id="case-tab-pedidos" type="button" role="tab" aria-controls="case-panel-pedidos" aria-selected="true" tabindex="0">Pedidos <span>6</span></button>
        </div>
        <div id="case-panel-cliente" class="case-side-content" role="tabpanel" aria-labelledby="case-tab-cliente" tabindex="0" hidden>
          <h3>Datos del cliente</h3>
          <dl class="case-fields case-profile-fields"><div><dt>Nombre</dt><dd>Fernando Rojas</dd></div><div><dt>Email</dt><dd>fernando.rojas@gmail.com</dd></div><div><dt>Teléfono</dt><dd>+56 9 7841 2396</dd></div><div><dt>Tipo de cliente</dt><dd>Cliente recurrente</dd></div></dl>
          <div class="case-linked"><strong>Historial conectado</strong><p>Compra de la cafetera por WhatsApp, pedido #1086 y 5 compras anteriores en Aura Store.</p></div>
          <div class="case-source">Shopify · Datos sincronizados</div>
        </div>
        <div id="case-panel-pedidos" class="case-side-content" role="tabpanel" aria-labelledby="case-tab-pedidos" tabindex="0">
          <div class="case-source">Shopify · Aura Store</div>${order}
          <div class="case-linked"><strong>Solicitud actual</strong><p>Cambiar la dirección antes del despacho.</p></div>
          <div class="case-previous"><span>Pedido anterior · #1042</span><strong>Cápsulas Intensidad Fuerte</strong><span>Entregado · $12.990</span></div>
        </div>`;
      const buttons = [...sidebar.querySelectorAll('[role="tab"]')];
      const select = button => {
        buttons.forEach(item => {
          const active = item === button;
          item.setAttribute('aria-selected', String(active));
          item.tabIndex = active ? 0 : -1;
          sidebar.querySelector('#' + item.getAttribute('aria-controls')).hidden = !active;
        });
      };
      buttons.forEach((button, index) => {
        button.addEventListener('click', () => select(button));
        button.addEventListener('keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? buttons[0] : event.key === 'End' ? buttons[1] : buttons[1 - index];
          select(next); next.focus();
        });
      });
    } else {
      sidebar.innerHTML = `${customer}<div class="case-side-content">
        <h3>Derivación con contexto</h3>
        <ol class="case-route"><li><span>1</span><div><strong>Agente IA</strong><p>Identifica el cambio de dirección.</p></div></li><li><span>2</span><div><strong>Equipo de Postventa</strong><p>Recibe el pedido y la solicitud.</p></div></li><li class="case-route-active"><span>PL</span><div><strong>Pedro L.</strong><p>Asignado · listo para continuar.</p></div></li></ol>
        <div class="case-linked"><strong>Resumen para Pedro</strong><p>Fernando compró una Cafetera de Cápsulas Aura. Pide cambiar la dirección del pedido <b>#1086</b>, pagado y aún sin despachar.</p></div>
        <div class="case-retained"><strong>Contexto conservado</strong><span>Cliente · Pedido · Historial del chat</span></div>
      </div>`;
    }
    if (productImage) sidebar.querySelectorAll('.case-product-image').forEach(slot => {
      const img = productImage.cloneNode(true);
      img.removeAttribute('class'); img.removeAttribute('data-desk-product');
      slot.replaceWith(img);
    });
    detail.querySelector('.helpdesk-mockup__profile').replaceWith(sidebar);
    panel.replaceChildren(root);
  }
})();
