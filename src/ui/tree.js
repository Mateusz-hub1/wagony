// Drzewo części w lewym panelu, zsynchronizowane z widokiem 3D.
import { displayName, walk } from '../engine/dataLoader.js';

export class TreeView {
  constructor(container, nav) {
    this.el = container;
    this.nav = nav;
    this.items = new Map(); // węzeł → <li>
    this.el.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'tree';
    ul.appendChild(this.makeItem(nav.root, 0));
    this.el.appendChild(ul);
    this.update();
  }

  makeItem(node, depth) {
    const li = document.createElement('li');
    if (depth >= 1 && node.children.length) li.classList.add('collapsed');
    const row = document.createElement('div');
    row.className = 'row';

    const caret = document.createElement('span');
    caret.className = 'caret';
    caret.textContent = node.children.length ? '▸' : '';
    caret.addEventListener('click', (e) => {
      e.stopPropagation();
      li.classList.toggle('collapsed');
      this.updateCaret(li, node);
    });

    const label = document.createElement('span');
    label.className = 'label';
    label.innerHTML = `${esc(displayName(node))} <span class="en">${esc(node.opis.nazwa_en ? `(${node.opis.nazwa_en})` : '')}</span>`;

    const eye = document.createElement('button');
    eye.className = 'eye';
    eye.title = 'Ukryj / pokaż';
    eye.textContent = '👁';
    eye.addEventListener('click', (e) => { e.stopPropagation(); this.nav.toggleHidden(node); });

    // dymek z pełną nazwą (gdy nazwa jest ucięta w wąskim panelu)
    row.title = node.opis.nazwa_en ? `${displayName(node)} (${node.opis.nazwa_en})` : displayName(node);

    row.append(caret, label, eye);
    row.addEventListener('click', () => this.nav.select(node));
    row.addEventListener('dblclick', () => this.nav.enter(node));
    li.appendChild(row);

    if (node.children.length) {
      const ul = document.createElement('ul');
      for (const c of node.children) ul.appendChild(this.makeItem(c, depth + 1));
      li.appendChild(ul);
    }
    this.items.set(node, li);
    this.updateCaret(li, node);
    return li;
  }

  updateCaret(li, node) {
    if (!node.children.length) return;
    li.querySelector(':scope > .row > .caret').textContent = li.classList.contains('collapsed') ? '▸' : '▾';
  }

  // Odświeża klasy (zaznaczenie, poziom, ukrycie) i rozwija gałąź z zaznaczeniem
  update() {
    const { focus, selected } = this.nav;
    for (const n of walk(this.nav.root)) {
      const li = this.items.get(n);
      li.classList.toggle('is-focus', n === focus);
      li.classList.toggle('is-selected', n === selected);
      li.classList.toggle('is-hidden', n.hidden);
      li.classList.toggle('is-removed', n.removed && !n.object?.userData.opens);
    }
    for (const target of [focus, selected]) {
      for (let n = target; n; n = n.parent) {
        const li = this.items.get(n);
        if (n !== target || n === focus) { li.classList.remove('collapsed'); this.updateCaret(li, n); }
      }
    }
    const sel = selected && this.items.get(selected);
    if (sel) sel.querySelector(':scope > .row').scrollIntoView({ block: 'nearest' });
  }
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
