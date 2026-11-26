// Obsługa myszki w widoku 3D: najechanie, klik, dwuklik.
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
    el.addEventListener('pointermove', (e) => { this.setMouse(e); this.mouseMoved = true; this.inside = true; });
    el.addEventListener('pointerleave', () => { this.inside = false; this.nav.hover(null); });
    el.addEventListener('pointerdown', (e) => { this.down = { x: e.clientX, y: e.clientY, button: e.button }; });
    el.addEventListener('pointerup', (e) => {
      // klik = puszczenie przycisku prawie w tym samym miejscu (inaczej to był obrót kamery)
      if (!this.down || this.down.button !== 0) return;
      const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
      this.down = null;
      if (moved > 4) return;
      this.setMouse(e);
      this.nav.select(this.pick());
    });
    el.addEventListener('dblclick', (e) => {
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
