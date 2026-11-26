// Stan przeglądania: na jakim poziomie jesteśmy (focus), co jest zaznaczone,
// co ukryte, izolowane, zdjęte. Każda zmiana wysyła zdarzenie "change".
import { walk } from './dataLoader.js';

export class Navigator extends EventTarget {
  constructor(root) {
    super();
    this.root = root;
    this.focus = root;      // część, w którą „weszliśmy”
    this.selected = null;   // zaznaczona część
    this.hovered = null;    // część pod kursorem
    this.isolated = null;   // „pokaż tylko tę”
  }

  emit(kind) { this.dispatchEvent(new CustomEvent('change', { detail: { kind } })); }

  // Lista od korzenia do węzła (włącznie)
  static chain(node) {
    const out = [];
    for (let n = node; n; n = n.parent) out.unshift(n);
    return out;
  }
  static isInside(node, ancestor) {
    for (let n = node; n; n = n.parent) if (n === ancestor) return true;
    return false;
  }

  // Przejście na poziom "target". Części na ścieżce są rozłożone, reszta złożona.
  focusTo(target, { explode = true, select = null } = {}) {
    const chain = new Set(Navigator.chain(target));
    for (const n of walk(this.root)) {
      if (n === target) n.exploded = explode && n.children.length > 0;
      else if (n === this.root) { /* korzeń zachowuje swój stan */ }
      else n.exploded = chain.has(n);
    }
    this.focus = target;
    this.selected = select;
    this.emit('focus');
  }

  // Wejście poziom głębiej (dwuklik / „Rozłóż”)
  enter(node) {
    if (!node || node.children.length === 0) return false;
    this.focusTo(node);
    return true;
  }

  // Poziom wyżej (Esc). Zwraca false, gdy już jesteśmy na górze.
  up() {
    const f = this.focus;
    if (!f.parent) {
      if (f.exploded) { this.collapse(); return true; }
      if (this.selected) { this.select(null); return true; }
      return false;
    }
    this.focusTo(f.parent, { explode: f.parent === this.root ? this.root.exploded : true, select: f });
    return true;
  }

  explodeCurrent() { this.focus.exploded = true; this.emit('explode'); }
  collapse() {
    for (const n of walk(this.focus)) n.exploded = false;
    this.emit('explode');
  }

  // Zaznaczenie z widoku 3D lub z drzewa
  select(node) {
    if (node && node !== this.focus && !Navigator.isInside(node, this.focus)) {
      // część spoza bieżącego poziomu: przechodzimy do jej rodzica
      this.focusTo(node.parent ?? this.root, { select: node });
      return;
    }
    if (node && node !== this.focus && node.parent !== this.focus) {
      // część głębiej niż jeden poziom: też przechodzimy do jej rodzica
      this.focusTo(node.parent, { select: node });
      return;
    }
    this.selected = node;
    this.emit('select');
  }

  hover(node) {
    if (node === this.hovered) return;
    this.hovered = node;
    this.emit('hover');
  }

  // --- Ukrywanie i izolowanie ---
  toggleHidden(node) {
    node.hidden = !node.hidden;
    if (node.hidden && this.selected && Navigator.isInside(this.selected, node)) this.selected = null;
    this.emit('visibility');
  }
  isolate(node) {
    this.isolated = node;
    this.emit('visibility');
  }
  showAll() {
    for (const n of walk(this.root)) n.hidden = false;
    this.isolated = null;
    this.emit('visibility');
  }

  // --- Zdejmowanie (np. pokrywy maźnicy) ---
  toggleRemoved(node) {
    if (!node?.zdejmowalny) return;
    node.removed = !node.removed;
    this.emit('visibility');
  }

  // Wszystko jak na początku
  reset() {
    for (const n of walk(this.root)) { n.exploded = false; n.hidden = false; n.removed = false; }
    this.isolated = null;
    this.focus = this.root;
    this.selected = null;
    this.emit('reset');
  }
}
