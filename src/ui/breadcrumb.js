// Ścieżka nawigacji: Eaos › Wózek Y25 › Zestaw kołowy › Maźnica
import { displayName } from '../engine/dataLoader.js';
import { Navigator } from '../engine/navigator.js';
import { esc } from './tree.js';
import { isNarrow } from '../engine/device.js';

// Na wąskim ekranie (telefon) skrócona: „… › rodzic › bieżąca”, gdzie „…” wraca do całego wagonu.
export function renderBreadcrumb(el, nav) {
  const chain = Navigator.chain(nav.focus);
  const short = isNarrow() && chain.length > 2;
  const from = short ? chain.length - 2 : 0; // od którego elementu pokazujemy nazwy
  el.innerHTML = (short ? `<a data-i="0" title="${esc(displayName(chain[0]))}">…</a><span class="sep">›</span>` : '')
    + chain.slice(from).map((n, j) => {
      const i = from + j;
      return i === chain.length - 1
        ? `<span class="current">${esc(displayName(n))}</span>`
        : `<a data-i="${i}">${esc(displayName(n))}</a><span class="sep">›</span>`;
    }).join('');
  el.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      const target = chain[+a.dataset.i];
      const from = chain[+a.dataset.i + 1];
      nav.focusTo(target, { explode: target === nav.root ? nav.root.exploded : true, select: from });
    });
  });
}

export function clearBreadcrumb(el) { el.innerHTML = ''; }
