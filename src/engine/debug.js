// Tryb sprawdzania (tylko gdy w adresie jest ?debug). Nie jest potrzebny zwykłym użytkownikom.
// W konsoli przeglądarki dostępny jest obiekt "atlas":
//   atlas.overlaps()        – pary części z różnych zespołów, które na siebie zachodzą
//   atlas.find('wozek_1')   – węzeł po ścieżce (bez nazwy wagonu na początku)
//   atlas.nav, atlas.root   – stan przeglądarki i drzewo części
// Parametry w adresie (np. do zrzutów z Chrome bez okna):
//   ?debug&overlaps                 – wypisz kolizje do konsoli po wczytaniu
//   ?debug&focus=wozek_1/zestaw_1   – wejdź w część
//   ?debug&open=a/b,c/d             – zdejmij / otwórz części
//   ?debug&explode                  – rozłóż bieżący poziom
//   ?debug&cam=x,y,z,tx,ty,tz       – ustaw kamerę (pozycja i punkt, na który patrzy)
import * as THREE from 'three';
import { walk } from './dataLoader.js';

export function installDebug({ root, nav, animator }, viewer, params) {
  const find = (path) => {
    for (const n of walk(root)) if (n.path === `${root.id}/${path}` || n.path === path) return n;
    console.warn(`[debug] Brak części ${path}`);
    return null;
  };
  window.atlas = { root, nav, viewer, find, overlaps: (o) => overlaps(root, o) };

  if (params.has('focus')) { const n = find(params.get('focus')); if (n) nav.enter(n) || nav.select(n); }
  if (params.has('explode')) nav.explodeCurrent();
  for (const p of (params.get('open') ?? '').split(',').filter(Boolean)) {
    const n = find(p);
    if (n) nav.toggleRemoved(n);
  }
  // Chrome bez okna rysuje mało klatek – kończymy animacje od razu, żeby zrzut pokazał stan końcowy
  settle(nav, animator, viewer);
  if (params.has('cam')) {
    const [x, y, z, tx, ty, tz] = params.get('cam').split(',').map(Number);
    // po animacji kamery z flyToBox
    viewer.fly = null;
    viewer.camera.position.set(x, y, z); viewer.controls.target.set(tx, ty, tz); viewer.controls.update();
  }
  if (params.has('overlaps')) {
    const list = overlaps(root, { log: false });
    console.log(`[debug] kolizje: ${list.length}`);
    for (const o of list.slice(0, 60)) console.log(`[debug] ${o.a} <> ${o.b}: ${o.size}`);
  }
}

// Natychmiastowe zakończenie rozkładania / zdejmowania i przelotu kamery
function settle(nav, animator, viewer) {
  for (let i = 0; i < 300; i++) animator.update(0.05);
  nav.emit('visibility');
  if (viewer.fly) viewer.fly.duration = 1e-4;
}

// Kolizje: dla każdej pary siatek z RÓŻNYCH zespołów (dzieci korzenia na głębokości "depth")
// 1) szukamy par, których prostopadłościany obejmujące zachodzą na siebie o więcej niż "tol",
// 2) sprawdzamy, czy wierzchołki jednej siatki leżą naprawdę WEWNĄTRZ drugiej
//    (promień w dwóch kierunkach przecina powierzchnię nieparzystą liczbę razy).
// Zgłaszamy pary z co najmniej "minInside" wierzchołkami w środku. Styk powierzchni nie jest zgłaszany.
// To nadal przybliżenie (np. siatki niedomknięte), wynik warto obejrzeć z bliska.
export function overlaps(root, { depth = 1, tol = 0.01, log = true, ignore = [], minInside = 2 } = {}) {
  root.object.updateMatrixWorld(true);
  const items = [];
  for (const n of walk(root)) {
    const chain = [];
    for (let p = n; p; p = p.parent) chain.unshift(p);
    if (chain.length <= depth) continue;
    const group = chain[depth].id;
    for (const m of n.meshes ?? []) {
      if (!m.visible) continue;
      items.push({ group, mesh: m, part: n.path.split('/').slice(1).join('/'), box: new THREE.Box3().setFromObject(m) });
    }
  }
  const found = new Map();
  const inter = new THREE.Box3(), size = new THREE.Vector3();
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.group === b.group) continue;
      if (!a.box.intersectsBox(b.box)) continue;
      inter.copy(a.box).intersect(b.box).getSize(size);
      if (Math.min(size.x, size.y, size.z) <= tol) continue;
      const [pa, pb] = a.part < b.part ? [a.part, b.part] : [b.part, a.part];
      if (ignore.some((s) => pa.includes(s) || pb.includes(s))) continue;
      const key = `${pa}|${pb}`;
      const box = inter.clone().expandByScalar(-tol / 2);
      const inside = countInside(a.mesh, b.mesh, box) + countInside(b.mesh, a.mesh, box);
      if (inside < minInside) continue;
      if (!found.has(key) || found.get(key).inside < inside) {
        found.set(key, { a: pa, b: pb, inside, size: size.toArray().map((v) => v.toFixed(3)).join(' × ') + ' m' });
      }
    }
  }
  const list = [...found.values()].sort((x, y) => y.inside - x.inside);
  if (log) console.table(list);
  return list;
}

// Ile wierzchołków siatki "a" (z obszaru "box") leży wewnątrz siatki "b"
const ray = new THREE.Raycaster();
const DIRS = [new THREE.Vector3(1, 0.31, 0.17).normalize(), new THREE.Vector3(-0.23, -1, 0.41).normalize()];
const MAX_SAMPLES = 40; // ile wierzchołków sprawdzamy na parę (więcej = dokładniej, ale wolniej)
function countInside(a, b, box) {
  const pos = a.geometry.attributes.position, v = new THREE.Vector3();
  const cand = [];
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(a.matrixWorld);
    if (box.containsPoint(v)) cand.push(v.clone());
  }
  const step = Math.max(1, Math.floor(cand.length / MAX_SAMPLES));
  let n = 0;
  for (let i = 0; i < cand.length; i += step) {
    let all = true;
    for (const d of DIRS) {
      ray.set(cand[i], d);
      const hits = ray.intersectObject(b, false).filter((h) => h.distance > 1e-4);
      if (hits.length % 2 === 0) { all = false; break; }
    }
    if (all && ++n >= 10) break; // wystarczy, żeby zgłosić
  }
  return n;
}
