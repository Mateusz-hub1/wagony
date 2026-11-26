// Poszerzanie panelu drzewa części przez przeciąganie jego prawej krawędzi.
// Szerokość zapamiętujemy w przeglądarce (localStorage).
const MIN = 200, MAX = 700, KEY = 'atlas.treeWidth';
const root = document.documentElement;
const handle = document.getElementById('tree-resizer');
const panel = document.getElementById('tree-panel');

function setWidth(px) {
  const w = Math.round(Math.min(MAX, Math.max(MIN, px)));
  root.style.setProperty('--tree-w', `${w}px`);
  return w;
}

// zapamiętana szerokość (jeśli przeglądarka pozwala)
try {
  const saved = Number(localStorage.getItem(KEY));
  if (saved) setWidth(saved);
} catch { /* brak dostępu do localStorage – trudno */ }

handle.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handle.setPointerCapture(e.pointerId);
  document.body.classList.add('resizing');
  const left = panel.getBoundingClientRect().left;
  let last = null;

  const move = (ev) => { last = setWidth(ev.clientX - left); };
  const up = () => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    handle.removeEventListener('pointercancel', up);
    document.body.classList.remove('resizing');
    try { if (last) localStorage.setItem(KEY, String(last)); } catch { /* pomijamy */ }
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
  handle.addEventListener('pointercancel', up);
});

// dwuklik na uchwycie = domyślna szerokość
handle.addEventListener('dblclick', () => {
  root.style.removeProperty('--tree-w');
  try { localStorage.removeItem(KEY); } catch { /* pomijamy */ }
});
