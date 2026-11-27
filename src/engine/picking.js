// Obsługa myszki i dotyku w widoku 3D: najechanie, klik / dotknięcie, dwuklik / podwójne dotknięcie.
import * as THREE from 'three';
import { pickables } from './visibility.js';

export class Picker {
  constructor(viewer, nav, { onDoubleClick }) {
    this.viewer = viewer;
    this.nav = nav;
    this.onDoubleClick = onDoubleClick;
    this.ray = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.mouseMoved = false;
    this.inside = false;
    this.down = null;

    const el = viewer.canvas;
    // Dotyk: liczymy palce na ekranie. Gest dwoma palcami (zoom / przesuwanie) to nie tapnięcie.
    this.touches = 0;
    this.multiTouch = false;
    this.lastTap = null;      // poprzednie tapnięcie palcem (do wykrycia podwójnego)
    this.lastPointer = 'mouse';

    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return; // palec nie „najeżdża” na części
      this.setMouse(e); this.mouseMoved = true; this.inside = true;
    });
    el.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'touch') return;
      this.inside = false; this.nav.hover(null);
    });
    el.addEventListener('pointerdown', (e) => {
      this.lastPointer = e.pointerType;
      if (e.pointerType === 'touch') {
        this.touches++;
        if (this.touches > 1) this.multiTouch = true;
      }
      this.down = { x: e.clientX, y: e.clientY, button: e.button };
    });
    const touchEnd = (e) => {
      if (e.pointerType !== 'touch') return false;
      this.touches = Math.max(0, this.touches - 1);
      const wasMulti = this.multiTouch;
      if (this.touches === 0) this.multiTouch = false;
      return wasMulti;
    };
    el.addEventListener('pointercancel', (e) => { touchEnd(e); this.down = null; });
    el.addEventListener('pointerup', (e) => {
      const wasMulti = touchEnd(e);
      // klik = puszczenie przycisku prawie w tym samym miejscu (inaczej to był obrót kamery)
      if (!this.down || this.down.button !== 0) return;
      const touch = e.pointerType === 'touch';
      const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
      this.down = null;
      if (wasMulti || moved > (touch ? 10 : 4)) return;
      this.setMouse(e);
      const node = this.pick();
      if (touch && this.isDoubleTap(e)) {
        // podwójne dotknięcie = dwuklik (wejście w część)
        if (node) this.onDoubleClick(node);
        return;
      }
      this.nav.select(node);
    });
    el.addEventListener('dblclick', (e) => {
      if (this.lastPointer === 'touch') return; // dotyk obsługujemy sami (isDoubleTap)
      this.setMouse(e);
      const node = this.pick();
      if (node) this.onDoubleClick(node);
    });

    // najechanie sprawdzamy raz na klatkę, nie przy każdym ruchu myszy
    viewer.frameCallbacks.push(() => {
      if (!this.mouseMoved || !this.inside) return;
      this.mouseMoved = false;
      this.nav.hover(this.pick());
    });
  }

  // Czy to drugie dotknięcie w krótkim czasie i blisko pierwszego
  isDoubleTap(e) {
    const now = performance.now(), p = this.lastTap;
    const dbl = !!p && now - p.t < 350 && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 30;
    this.lastTap = dbl ? null : { t: now, x: e.clientX, y: e.clientY };
    return dbl;
  }

  setMouse(e) {
    const r = this.viewer.canvas.getBoundingClientRect();
    this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  // Zwraca część na bieżącym poziomie (bezpośrednie dziecko części "focus") pod kursorem
  pick() {
    this.ray.setFromCamera(this.mouse, this.viewer.camera);
    const hit = this.ray.intersectObjects(pickables, false)[0];
    if (!hit) return null;
    let n = hit.object.userData.owner;
    const focus = this.nav.focus;
    if (n === focus) return focus;
    while (n && n.parent !== focus) n = n.parent;
    return n ?? null;
  }
}
