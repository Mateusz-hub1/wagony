// Przyciski nad widokiem 3D i skróty klawiszowe.
export class Toolbar {
  // extra.back – dodatkowy przycisk „‹ Wstecz” w pasku górnym (telefon), działa jak „Poziom wyżej”
  constructor(el, nav, actions, extra = {}) {
    this.el = el;
    this.nav = nav;
    this.btn = {};
    this.abort = new AbortController(); // pozwala odpiąć wszystkie zdarzenia przy zmianie wagonu
    const signal = this.abort.signal;
    el.querySelectorAll('[data-act]').forEach((b) => {
      this.btn[b.dataset.act] = b;
      b.addEventListener('click', () => actions[b.dataset.act]?.(), { signal });
    });
    this.back = extra.back ?? null;
    this.back?.addEventListener('click', () => actions.up(), { signal });
    // Esc = poziom wyżej (gdy nie piszemy w polu tekstowym)
    this.onKey = (e) => {
      if (e.key === 'Escape' && !e.target.closest?.('input, textarea')) actions.up();
    };
    window.addEventListener('keydown', this.onKey, { signal });
  }

  destroy() { this.abort.abort(); }

  // Włącza / wyłącza przyciski zależnie od stanu
  update() {
    const { focus, selected, root, isolated } = this.nav;
    const sel = selected && selected !== focus ? selected : null;
    this.btn.explode.disabled = !((sel && sel.children.length) || (!focus.exploded && focus.children.length));
    this.btn.collapse.disabled = !focus.exploded;
    this.btn.up.disabled = focus === root && !focus.exploded && !selected;
    if (this.back) this.back.disabled = this.btn.up.disabled;
    this.btn.hide.disabled = !sel;
    this.btn.isolate.disabled = !selected;
    let anyHidden = !!isolated;
    (function scan(n) { if (n.hidden) anyHidden = true; n.children.forEach(scan); })(root);
    this.btn.showall.disabled = !anyHidden;
    this.btn.remove.disabled = !selected?.zdejmowalny;
    // części otwierane obrotem (klapy) mają przycisk „Otwórz / Zamknij”
    const opens = selected?.object?.userData.opens;
    this.btn.remove.textContent = opens ? (selected.removed ? 'Zamknij' : 'Otwórz')
      : (selected?.removed ? 'Załóż' : 'Zdejmij');
  }
}
