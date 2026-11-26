// Pomocnicze funkcje do budowania geometrii części.
// Układ współrzędnych całego projektu: 1 jednostka = 1 m,
// x – wzdłuż toru, y – w górę (0 = główka szyny), z – w poprzek toru.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M, weather } from './materials.js';

export { THREE, M };

// ---------- Części i „gniazda” na podczęści ----------

// Tworzy grupę części. Gniazda (slots) mówią silnikowi, gdzie wstawić dzieci z JSON-a.
export function part(name) {
  const g = new THREE.Group();
  g.name = name;
  g.userData.slots = {};
  return g;
}

// Gniazdo dla podczęści o danym id:
//  pos/rot – położenie w układzie rodzica, explode – przesunięcie po rozłożeniu,
//  remove – przesunięcie przy zdejmowaniu (domyślnie 1,5 × explode)
export function slot(group, childId, { pos = [0, 0, 0], rot = [0, 0, 0], explode = [0, 0, 0], remove = null } = {}) {
  group.userData.slots[childId] = { pos, rot, explode, remove };
}

// ---------- Siatki ----------

// Tworzy siatkę z cieniami i kolorami zużycia. o: { pos, rot, scale, parent }
export function mesh(geometry, material, o = {}) {
  if (!geometry.attributes.color) weather(geometry, material);
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  if (o.pos) m.position.set(...o.pos);
  if (o.rot) m.rotation.set(...o.rot);
  if (o.scale) m.scale.set(...o.scale);
  if (o.parent) o.parent.add(m);
  return m;
}

// Prostopadłościan z fazowanymi (zaokrąglonymi) krawędziami
export function box(w, h, d, material, o = {}) {
  const r = o.r ?? Math.min(0.008, Math.min(w, h, d) * 0.3);
  const g = new RoundedBoxGeometry(w, h, d, 2, r);
  return mesh(g, material, o);
}
// To samo, ale podane jako zakres od–do (wygodne przy ramach): [x0,x1],[y0,y1],[z0,z1]
export function boxFromTo([x0, x1], [y0, y1], [z0, z1], material, o = {}) {
  return box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), material,
    { ...o, pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] });
}

// Geometria walca wzdłuż osi 'x' | 'y' | 'z'
export function cylGeom(r, h, { r2 = r, seg = 32, axis = 'y', open = false } = {}) {
  const g = new THREE.CylinderGeometry(r, r2, h, seg, 1, open);
  if (axis === 'x') g.rotateZ(-Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return g;
}
export function cylinder(r, h, material, o = {}) {
  return mesh(cylGeom(r, h, o), material, o);
}

// Pręt (walec) między dwoma punktami
export function rodGeom(a, b, r, seg = 16) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  g.applyQuaternion(q);
  const mid = A.add(B).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}
export function rod(a, b, r, material, o = {}) {
  return mesh(rodGeom(a, b, r, o.seg ?? 16), material, o);
}

// Spoina: cienki, nieregularny wałek wzdłuż odcinka a–b
export function weld(a, b, r = 0.006, o = {}) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const pts = [];
  const n = Math.max(4, Math.round(A.distanceTo(B) / 0.02));
  for (let i = 0; i <= n; i++) pts.push(A.clone().lerp(B, i / n));
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, n * 2, r, 6, false);
  // lekka nieregularność „łusek” spoiny: pierścienie na przemian grubsze i cieńsze
  const p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
  const ringSize = 7; // 6 segmentów + 1 wierzchołek zamykający
  for (let i = 0; i < p.count; i++) {
    const ring = Math.floor(i / ringSize);
    curve.getPointAt(Math.min(ring / (n * 2), 1), c);
    v.fromBufferAttribute(p, i).sub(c).multiplyScalar(ring % 2 ? 1.12 : 0.92).add(c);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return mesh(g, M.weld, o);
}

// ---------- Bryły obrotowe (toczone) ----------

// Profil [[r, z], ...] obracany wokół osi Z. Ostre załamania profilu (> 35°)
// dają ostre krawędzie (profil jest dzielony na gładkie odcinki).
export function latheGeom(profile, { seg = 64, sharpDeg = 35 } = {}) {
  const pts = profile.map(([r, z]) => new THREE.Vector2(Math.max(r, 0), z));
  const runs = [];
  let cur = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    cur.push(pts[i]);
    if (i < pts.length - 1) {
      const d1 = pts[i].clone().sub(pts[i - 1]).normalize();
      const d2 = pts[i + 1].clone().sub(pts[i]).normalize();
      const ang = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(d1.dot(d2), -1, 1)));
      if (ang > sharpDeg) { runs.push(cur); cur = [pts[i]]; }
    }
  }
  runs.push(cur);
  const geoms = runs.filter((r) => r.length >= 2).map((r) => new THREE.LatheGeometry(r, seg));
  const g = geoms.length === 1 ? geoms[0] : mergeGeometries(geoms);
  g.rotateX(Math.PI / 2); // oś obrotu Y → Z
  return g;
}
export function lathe(profile, material, o = {}) {
  return mesh(latheGeom(profile, o), material, o);
}

// Pierścień (rura krótka) wzdłuż osi Z: r1 – wewn., r2 – zewn., z0..z1
export function ringGeom(r1, r2, z0, z1, seg = 48) {
  return latheGeom([[r1, z0], [r2, z0], [r2, z1], [r1, z1], [r1, z0]], { seg });
}

// ---------- Złączne: śruby, nakrętki, nity ----------

// Śruba z łbem sześciokątnym i podkładką, oś wzdłuż +Y (łeb od y=0 w górę).
// d – średnica gwintu
export function boltGeom(d = 0.02, { stick = 0.6 } = {}) {
  const head = new THREE.CylinderGeometry(d * 0.92, d * 0.92, d * 0.65, 6);
  head.translate(0, d * 0.1 + d * 0.325, 0);
  const washer = new THREE.CylinderGeometry(d * 1.05, d * 1.05, d * 0.1, 20);
  washer.translate(0, d * 0.05, 0);
  const chamfer = new THREE.CylinderGeometry(d * 0.6, d * 0.85, d * 0.12, 6);
  chamfer.translate(0, d * 0.75 + d * 0.06, 0);
  const parts = [head, washer, chamfer];
  if (stick > 0) {
    const end = new THREE.CylinderGeometry(d * 0.5, d * 0.5, d * stick, 12);
    end.translate(0, d * 0.81 + d * stick / 2, 0);
    parts.push(end);
  }
  return mergeGeometries(parts.map(flat));
}

// Wiele śrub naraz (jedna siatka). places: [{pos:[x,y,z], dir:[x,y,z]}]
export function bolts(places, d = 0.02, material = M.bolt, o = {}) {
  const up = new THREE.Vector3(0, 1, 0);
  const geoms = places.map(({ pos, dir = [0, 1, 0], spin = 0 }) => {
    const g = boltGeom(d, o);
    g.rotateY(spin);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(...dir).normalize()));
    g.translate(...pos);
    return g;
  });
  return mesh(mergeGeometries(geoms), material, o);
}

// Śruby rozłożone na okręgu w płaszczyźnie XY (oś Z), łby skierowane w +Z
export function boltCircle(n, R, z, d, o = {}) {
  const places = [];
  for (let i = 0; i < n; i++) {
    const a = (o.start ?? Math.PI / 4) + (i / n) * Math.PI * 2;
    places.push({ pos: [Math.cos(a) * R, Math.sin(a) * R, z], dir: [0, 0, o.flip ? -1 : 1], spin: a });
  }
  return bolts(places, d, o.material ?? M.bolt, o);
}

// Nity (półkuliste łby). places jak w bolts()
export function rivets(places, r = 0.009, material = M.bolt, o = {}) {
  const up = new THREE.Vector3(0, 1, 0);
  const geoms = places.map(({ pos, dir = [0, 1, 0] }) => {
    const g = new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, 0.6, 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(...dir).normalize()));
    g.translate(...pos);
    return g;
  });
  return mesh(mergeGeometries(geoms), material, o);
}

// Geometria bez indeksu (wymagane, żeby dało się łączyć różne geometrie)
export const flat = (g) => (g.index ? g.toNonIndexed() : g);

// Łączy kilka geometrii w jedną siatkę (mniej obiektów = szybciej)
export function merged(geoms, material, o = {}) {
  return mesh(mergeGeometries(geoms.map(flat)), material, o);
}

// Geometria prostopadłościanu fazowanego (do łączenia przez merged)
export function boxGeom(w, h, d, pos = [0, 0, 0], r = null) {
  const g = new RoundedBoxGeometry(w, h, d, 2, r ?? Math.min(0.008, Math.min(w, h, d) * 0.3));
  g.translate(...pos);
  return g;
}

// Sprężyna śrubowa wzdłuż +Y: R – promień zwojów, wire – promień drutu,
// H – wysokość, turns – liczba zwojów (końce dociśnięte i płaskie)
export function springGeom(R, wire, H, turns) {
  const endTurns = 0.85;
  const active = turns - 2 * endTurns;
  const endPitch = wire * 2.05;
  const pitch = (H - 2 * wire - 2 * endTurns * endPitch) / active;
  class Helix extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      const k = t * turns; // liczba zwojów od dołu
      let y;
      if (k < endTurns) y = k * endPitch;
      else if (k < endTurns + active) y = endTurns * endPitch + (k - endTurns) * pitch;
      else y = endTurns * endPitch + active * pitch + (k - endTurns - active) * endPitch;
      const a = k * Math.PI * 2;
      return target.set(Math.cos(a) * R, y + wire, Math.sin(a) * R);
    }
  }
  return new THREE.TubeGeometry(new Helix(), Math.round(turns * 36), wire, 8, false);
}
