// Panel opisu części (prawa kolumna).
import { displayName } from '../engine/dataLoader.js';
import { esc } from './tree.js';

const FIELDS = [
  ['funkcja', 'Funkcja'],
  ['budowa', 'Budowa'],
  ['typowe_uszkodzenia', 'Typowe uszkodzenia'],
  ['wymiary_graniczne', 'Wymiary graniczne i zużycia'],
  ['przepisy', 'Przepisy i normy'],
];

export function renderInfo(el, node, nav) {
  if (!node) { el.innerHTML = ''; return; }
  const o = node.opis;
  const status = o.status === 'zweryfikowane'
    ? '<span class="status ok">zweryfikowane</span>'
    : `<span class="status todo">${esc(o.status || 'do weryfikacji')}</span>`;

  let html = `<h2>${esc(displayName(node))} <span class="en">(${esc(o.nazwa_en)})</span></h2>
    <div class="path">${esc(pathNames(node))}</div>${status}`;

  for (const [key, label] of FIELDS) html += `<h3>${label}</h3>${text(o[key])}`;

  html += '<h3>Źródła</h3>' + list(o.zrodla, 'brak – [uzupełnić]');
  html += '<h3>Zdjęcia</h3>' + (o.zdjecia?.length
    ? list(o.zdjecia)
    : '<p class="missing">Zdjęcia z hali zostaną dodane później.</p>');

  if (node.children.length) {
    html += '<h3>Składa się z</h3><ul class="children-list">' +
      node.children.map((c, i) => `<li><a data-i="${i}">${esc(displayName(c))}</a></li>`).join('') + '</ul>';
  }
  if (node.zdejmowalny) html += '<h3>Uwaga</h3><p>Tę część można zdjąć przyciskiem „Zdejmij”.</p>';

  el.innerHTML = html;
  el.querySelectorAll('.children-list a').forEach((a) => {
    a.addEventListener('click', () => nav.select(node.children[+a.dataset.i]));
  });
}

// Ścieżka polskimi nazwami: „Eaos › wózek Y25 – nr 1 › zestaw kołowy – nr 1”
function pathNames(node) {
  const names = [];
  for (let n = node; n; n = n.parent) names.unshift(displayName(n));
  return names.join(' › ');
}

function text(v) {
  if (Array.isArray(v)) return list(v);
  const s = String(v ?? '').trim() || '[uzupełnić]';
  return `<p class="${s.includes('[uzupełnić]') ? 'missing' : ''}">${esc(s)}</p>`;
}

function list(arr, empty = '') {
  if (!arr?.length) return `<p class="missing">${esc(empty)}</p>`;
  return '<ul>' + arr.map((x) => `<li>${linkify(x)}</li>`).join('') + '</ul>';
}

// adresy http(s) w źródłach zamieniamy na klikalne linki
function linkify(s) {
  return esc(s).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
}
