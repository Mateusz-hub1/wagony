// Ścieżka nawigacji: Eaos › Wózek Y25 › Zestaw kołowy › Maźnica
import { displayName } from '../engine/dataLoader.js';
import { Navigator } from '../engine/navigator.js';
import { esc } from './tree.js';

export function renderBreadcrumb(el, nav) {
  const chain = Navigator.chain(nav.focus);
  el.innerHTML = chain.map((n, i) => (i === chain.length - 1
    ? `<span class="current">${esc(displayName(n))}</span>`
    : `<a data-i="${i}">${esc(displayName(n))}</a><span class="sep">›</span>`)).join('');
  el.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      const target = chain[+a.dataset.i];
      const from = chain[+a.dataset.i + 1];
      nav.focusTo(target, { explode: target === nav.root ? nav.root.exploded : true, select: from });
    });
  });
}

export function clearBreadcrumb(el) { el.innerHTML = ''; }
