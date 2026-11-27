// Układ na telefonie: wysuwane menu z drzewem części i karta opisu wysuwana od dołu.
// Na komputerze (szeroki ekran) ten kod nic nie zmienia – wygląd ustala css/style.css.
import { isNarrow, onNarrowChange } from '../engine/device.js';

const body = document.body;
const panel = document.getElementById('info-panel');
const handle = document.getElementById('sheet-handle');
const content = document.getElementById('info-content');
const topbar = document.getElementById('topbar');

// ---------- Menu „☰ Części” (drzewo) ----------
const setTree = (open) => body.classList.toggle('tree-open', open);
document.getElementById('btn-tree').addEventListener('click', () => setTree(!body.classList.contains('tree-open')));
document.getElementById('tree-backdrop').addEventListener('click', () => setTree(false));
// dotknięcie wiersza (nie strzałki rozwijania i nie oka) wybiera część i zamyka menu
document.getElementById('tree').addEventListener('click', (e) => {
  if (!isNarrow()) return;
  if (e.target.closest('.caret, .eye')) return;
  if (e.target.closest('.row')) setTree(false);
});

// ---------- Karta opisu: zwinięta / pół ekranu / pełny ekran ----------
const STATES = ['min', 'half', 'full'];
const setSheet = (s) => { panel.dataset.sheet = s; panel.style.height = ''; };

// wysokości stanów w pikselach (muszą odpowiadać css/style.css)
function heights() {
  const h = window.innerHeight;
  return { min: 76, half: Math.round(h * 0.5), full: h - topbar.offsetHeight };
}

let drag = null;
handle.addEventListener('pointerdown', (e) => {
  if (!isNarrow()) return;
  e.preventDefault();
  handle.setPointerCapture(e.pointerId);
  drag = { y: e.clientY, h: panel.getBoundingClientRect().height, moved: false };
  panel.classList.add('dragging'); // bez animacji wysokości podczas przeciągania
});
handle.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dy = drag.y - e.clientY;
  if (Math.abs(dy) > 6) drag.moved = true;
  if (!drag.moved) return;
  const H = heights();
  panel.style.height = `${Math.max(H.min, Math.min(H.full, drag.h + dy))}px`;
});
const endDrag = () => {
  if (!drag) return;
  panel.classList.remove('dragging');
  if (!drag.moved) {
    // dotknięcie uchwytu: następny stan po kolei
    const i = STATES.indexOf(panel.dataset.sheet);
    setSheet(STATES[(i + 1) % STATES.length]);
  } else {
    // puszczenie po przeciągnięciu: najbliższy stan
    const h = panel.getBoundingClientRect().height, H = heights();
    setSheet(STATES.reduce((a, b) => (Math.abs(H[b] - h) < Math.abs(H[a] - h) ? b : a)));
  }
  drag = null;
};
handle.addEventListener('pointerup', endDrag);
handle.addEventListener('pointercancel', endDrag);

// w stanie zwiniętym dotknięcie tytułu rozwija kartę do połowy
content.addEventListener('click', (e) => {
  if (isNarrow() && panel.dataset.sheet === 'min' && !e.target.closest('a')) setSheet('half');
});

// po zmianie układu (obrót telefonu, poszerzenie okna) zamykamy menu i czyścimy wysokość
onNarrowChange(() => { setTree(false); panel.style.height = ''; });

// podpowiedź o gestach znika po pierwszym dotknięciu widoku 3D (na małym ekranie zabiera miejsce)
document.getElementById('c').addEventListener('pointerdown', () => {
  if (isNarrow()) body.classList.add('hint-off');
});
