// Panel opisu części (prawa kolumna).
// Puste pola (brak w JSON, pusty tekst, pusta lista) są pomijane razem z nagłówkiem.
// Pole "do_sprawdzenia" (notatki do weryfikacji) celowo nie jest wyświetlane.
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
  // Status „do weryfikacji” zostaje w danych JSON, ale nie jest wyświetlany.
  // Plakietkę pokazujemy tylko dla opisów już sprawdzonych.
  const status = o.status === 'zweryfikowane' ? '<span class="status ok">zweryfikowane</span>' : '';

  const en = o.nazwa_en ? ` <span class="en">(${esc(o.nazwa_en)})</span>` : '';
  let html = `<h2>${esc(displayName(node))}${en}</h2>
    <div class="path">${esc(pathNames(node))}</div>${status}`;

  for (const [key, label] of FIELDS) {
    if (!isEmpty(o[key])) html += `<h3>${label}</h3>${text(o[key])}`;
  }
  if (!isEmpty(o.zrodla)) html += '<h3>Źródła</h3>' + list(o.zrodla);
  if (!isEmpty(o.zdjecia)) html += '<h3>Zdjęcia</h3>' + list(o.zdjecia);

  if (node.children.length) {
    html += '<h3>Składa się z</h3><ul class="children-list">' +
      node.children.map((c, i) => `<li><a data-i="${i}">${esc(displayName(c))}</a></li>`).join('') + '</ul>';
  }
  if (node.zdejmowalny) {
    html += node.object?.userData.opens
      ? '<h3>Uwaga</h3><p>Tę część można otworzyć przyciskiem „Otwórz”.</p>'
      : '<h3>Uwaga</h3><p>Tę część można zdjąć przyciskiem „Zdejmij”.</p>';
  }

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

// Czy pole jest puste (brak, pusty tekst albo pusta lista)
function isEmpty(v) {
  if (Array.isArray(v)) return v.every((x) => !String(x ?? '').trim());
  return !String(v ?? '').trim();
}

function text(v) {
  if (Array.isArray(v)) return list(v);
  return `<p>${esc(String(v).trim())}</p>`;
}

function list(arr) {
  arr = arr.filter((x) => String(x ?? '').trim());
  return '<ul>' + arr.map((x) => `<li>${linkify(x)}</li>`).join('') + '</ul>';
}

// adresy http(s) w źródłach zamieniamy na klikalne linki
function linkify(s) {
  return esc(s).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
}
