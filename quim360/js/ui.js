/* Utilitários de interface: criação de elementos, campos ligados ao objeto, avisos e modais. */
(function (O) {
  const U = {};

  U.h = function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    Object.keys(attrs || {}).forEach((k) => {
      const v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'value') e.value = v;
      else if (v === true) e.setAttribute(k, '');
      else e.setAttribute(k, v);
    });
    const add = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else if (c instanceof Node) e.appendChild(c);
      else e.appendChild(document.createTextNode(String(c)));
    };
    kids.forEach(add);
    return e;
  };
  const h = U.h;

  U.get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  U.set = (o, path, v) => {
    const ks = path.split('.'); const last = ks.pop();
    const t = ks.reduce((a, k) => a[k], o); t[last] = v;
  };

  let saveT = null;
  U.salvar = (p) => { clearTimeout(saveT); saveT = setTimeout(() => O.Store.salvarProduto(p), 250); };
  U.salvarJa = (p) => { clearTimeout(saveT); O.Store.salvarProduto(p); };

  U.radio = (p, path, opts, o) => {
    o = o || {};
    const cur = U.get(p, path);
    const box = h('div', { class: 'opts', role: 'radiogroup' });
    opts.forEach((op) => {
      const id = 'r' + Math.random().toString(36).slice(2, 8);
      const inp = h('input', { type: 'radio', name: path + (o.uid || ''), id, ...(cur === op.v ? { checked: true } : {}) });
      const lab = h('label', { class: 'opt' + (cur === op.v ? ' sel' : ''), for: id }, inp, h('span', {}, h('b', {}, op.label), op.hint ? h('small', {}, op.hint) : null));
      inp.addEventListener('change', () => {
        U.set(p, path, op.v); U.salvar(p);
        [...box.children].forEach((c) => c.classList.remove('sel')); lab.classList.add('sel');
        o.onChange && o.onChange(op.v);
      });
      box.appendChild(lab);
    });
    return box;
  };

  U.checks = (p, path, opts, o) => {
    o = o || {};
    const arr = () => U.get(p, path);
    const box = h('div', { class: 'opts' });
    opts.forEach((op) => {
      const id = 'c' + Math.random().toString(36).slice(2, 8);
      const on = arr().includes(op.v);
      const inp = h('input', { type: 'checkbox', id, ...(on ? { checked: true } : {}) });
      const lab = h('label', { class: 'opt' + (on ? ' sel' : ''), for: id }, inp, h('span', {}, h('b', {}, op.label), op.hint ? h('small', {}, op.hint) : null));
      inp.addEventListener('change', () => {
        let a = arr().slice();
        if (inp.checked) { a = o.exclusive && op.v === o.exclusive ? [op.v] : a.filter((x) => x !== o.exclusive).concat(op.v); }
        else a = a.filter((x) => x !== op.v);
        U.set(p, path, a); U.salvar(p);
        o.onChange ? o.onChange(a) : [...box.children].forEach((c, i) => c.classList.toggle('sel', a.includes(opts[i].v)));
      });
      box.appendChild(lab);
    });
    return box;
  };

  U.flag = (p, path, label, hint, onChange) => {
    const id = 'f' + Math.random().toString(36).slice(2, 8);
    const on = !!U.get(p, path);
    const inp = h('input', { type: 'checkbox', id, ...(on ? { checked: true } : {}) });
    const lab = h('label', { class: 'opt' + (on ? ' sel' : ''), for: id }, inp, h('span', {}, h('b', {}, label), hint ? h('small', {}, hint) : null));
    inp.addEventListener('change', () => { U.set(p, path, inp.checked); lab.classList.toggle('sel', inp.checked); U.salvar(p); onChange && onChange(inp.checked); });
    return lab;
  };

  U.input = (p, path, o) => {
    o = o || {};
    const v = U.get(p, path);
    const tag = o.rows ? 'textarea' : 'input';
    const el = h(tag, { type: o.rows ? null : (o.type || 'text'), placeholder: o.ph || '', rows: o.rows || null, ...(o.rows ? {} : { value: v == null ? '' : v }) });
    if (o.rows) el.value = v == null ? '' : v;
    el.addEventListener('input', () => { U.set(p, path, o.type === 'number' && el.value !== '' ? Number(el.value) : el.value); U.salvar(p); o.onInput && o.onInput(el.value); });
    return h('label', { class: 'f' }, o.label ? h('span', {}, o.label) : null, el, o.hint ? h('small', {}, o.hint) : null);
  };

  U.select = (p, path, opts, o) => {
    o = o || {};
    const cur = U.get(p, path);
    const el = h('select', {}, o.empty !== false ? h('option', { value: '' }, o.empty || 'Selecione') : null,
      opts.map((x) => { const v = Array.isArray(x) ? x[0] : x; const l = Array.isArray(x) ? x[1] : x; return h('option', { value: v, ...(String(cur) === String(v) ? { selected: true } : {}) }, l); }));
    el.addEventListener('change', () => { U.set(p, path, el.value); U.salvar(p); o.onChange && o.onChange(el.value); });
    return h('label', { class: 'f' }, o.label ? h('span', {}, o.label) : null, el);
  };

  U.q = (n, text) => h('p', { class: 'q' }, n ? h('span', { class: 'qn' }, n) : null, text);
  U.alert = (tone, title, body) => h('div', { class: 'alert ' + (tone || '') }, title ? h('b', {}, title) : null, Array.isArray(body) ? h('ul', {}, body.map((x) => h('li', {}, x))) : (body ? h('div', {}, body) : null));
  U.disc = (d) => h('span', { class: 'disc ' + d.toLowerCase(), title: { PSM: 'Segurança de processo', GA: 'Gestão ambiental', SST: 'Saúde e segurança do trabalho' }[d] }, d);
  U.badge = (tone, text) => h('span', { class: 'badge ' + tone }, text);
  U.statusBadge = (st) => { const s = O.Docs.STATUS[st] || O.Docs.STATUS.em_analise; return U.badge(s[1], s[0]); };

  U.toast = (msg) => {
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
  };

  U.modal = (title, body, buttons) => new Promise((ok) => {
    const close = (v) => { bg.remove(); ok(v); };
    const bg = h('div', { class: 'modal-bg', onclick: (e) => { if (e.target === bg) close(false); } },
      h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, h('h3', {}, title), body,
        h('div', { class: 'row end', style: 'margin-top:14px' }, (buttons || [['Fechar', false, 'ghost']]).map((b) => h('button', { class: 'btn ' + (b[2] || ''), onclick: () => close(b[1]) }, b[0])))));
    document.body.appendChild(bg);
    const first = bg.querySelector('button'); first && first.focus();
  });
  U.confirm = (title, text, okLabel) => U.modal(title, h('p', {}, text), [['Cancelar', false, 'ghost'], [okLabel || 'Confirmar', true, '']]);

  U.copiar = async (txt) => {
    try { await navigator.clipboard.writeText(txt); U.toast('Texto copiado.'); }
    catch (e) { const ta = h('textarea', {}, ''); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); U.toast('Texto copiado.'); } catch (e2) { U.toast('Não foi possível copiar. Selecione o texto manualmente.'); } ta.remove(); }
  };

  const ICON = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    flask: '<path d="M9 3h6"/><path d="M10 3v6L4 20h16l-6-11V3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pin: '<path d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    grid: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
    file: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>',
    scale: '<path d="M12 3v18M5 21h14"/><path d="M5 7h14"/><path d="M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  };
  U.icon = (n) => h('span', { html: '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + '</svg>', style: 'display:inline-flex' }).firstChild;

  O.UI = U;
})(window.O360 = window.O360 || {});
