/* Shell do aplicativo, navegação por hash e inicialização. */
(function (O) {
  const U = O.UI, h = U.h;
  const NAV = [
    ['#/', 'Início', 'home'], ['#/painel', 'Painel', 'grid'], ['#/produtos', 'Produtos', 'flask'], ['#/nova', 'Nova homologação', 'plus'], ['#/fds', 'Analisador de FDS', 'file'], '-',
    ['#/locais', 'Locais de armazenamento', 'pin'], ['#/matriz', 'Matriz de segregação', 'grid'], ['#/legal', 'Base técnico-legal', 'scale'], ['#/config', 'Configurações', 'gear'],
  ];
  const root = document.getElementById('app');
  let main, side;

  function shell() {
    root.innerHTML = '';
    side = h('aside', { class: 'side', id: 'side' },
      h('a', { class: 'brand', href: '#/', style: 'text-decoration:none', 'aria-label': 'QUIM 360 | Orbit 360' }, h('span', { html: O.Pic.wordmark(76) }), h('div', {}, h('b', {}, 'QUIM 360'), h('span', {}, 'Produtos químicos'))),
      h('nav', { class: 'nav', 'aria-label': 'Principal' }, NAV.map((n) => (n === '-' ? h('div', { class: 'sep' }) : h('a', { href: n[0], 'data-h': n[0] }, U.icon(n[2]), n[1])))),
      h('p', { class: 'small', style: 'padding:12px 8px' }, 'Os dados ficam neste navegador. Exporte em Configurações para backup.'));
    main = h('main', { class: 'main', id: 'main' });
    root.appendChild(h('div', { class: 'app' }, side, main));
    root.appendChild(h('button', { class: 'btn ghost menu-btn', 'aria-label': 'Abrir menu', onclick: () => side.classList.toggle('open') }, U.icon('menu')));
  }

  function route() {
    if (!main) shell();
    const hash = location.hash || '#/';
    const parts = hash.replace(/^#\//, '').split('/');
    main.innerHTML = '';
    document.querySelector('.app').classList.remove('capa');
    side.classList.remove('open');
    side.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.getAttribute('data-h') === ('#/' + (parts[0] === 'produto' || parts[0] === 'homologar' || parts[0] === 'doc' ? 'produtos' : parts[0]))));
    const V = O.Views;
    try {
      switch (parts[0]) {
        case '': V.capa(main); break;
        case 'painel': V.painel(main); break;
        case 'produtos': V.produtos(main); break;
        case 'produto': V.produto(main, parts[1], parts[2]); break;
        case 'doc': V.doc(main, parts[1], parts[2]); break;
        case 'nova': { const p = O.Engine.novoProduto(); O.Store.salvarProduto(p); location.replace('#/homologar/' + p.id); return; }
        case 'homologar': O.Wizard.render(main, parts[1]); break;
        case 'fds': V.fds(main); break;
        case 'locais': V.locais(main); break;
        case 'matriz': V.matriz(main); break;
        case 'legal': V.legal(main); break;
        case 'config': V.config(main); break;
        default: main.appendChild(h('div', { class: 'empty' }, 'Página não encontrada.'));
      }
    } catch (e) { console.error(e); main.appendChild(U.alert('crit', 'Erro ao exibir a tela', String(e.message))); }
    window.scrollTo(0, 0);
    document.title = 'QUIM 360 | Orbit 360';
  }
  O.route = route;
  window.addEventListener('hashchange', route);
  O.Views.aplicarWatch();
  try { document.querySelector('link[rel=icon]').href = O.LOGO.mark.src; } catch (e) { /* ícone padrão */ }
  route();
})(window.O360 = window.O360 || {});
