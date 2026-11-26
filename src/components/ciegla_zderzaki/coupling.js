// Hak cięgłowy i sprzęg śrubowy – wspólne dla wszystkich wagonów.
// Układ lokalny: początek na licu belki czołowej w osi haka, +x na zewnątrz wagonu.
// Wymiary – SZACUNKOWE (z rysunków poglądowych), do sprawdzenia w EN 15566 / UIC 520.
import { THREE, M, part, slot, mesh, box, boxFromTo, cylinder, rod, merged, boxGeom, cylGeom, springGeom, bolts } from '../../lib/geom.js';

const HOOK_T = 0.05;     // grubość haka (wzdłuż z)
export const PIN_X = 0.1; // sworzeń sprzęgu w haku (od lica belki czołowej)
const SHANK_IN = 0.6;    // jak głęboko trzon haka wchodzi za belkę czołową

// ---------------- Hak cięgłowy (złożenie) ----------------
export function buildDrawHookAssembly() {
  const g = part('hak_ciagowy');
  slot(g, 'hak', { explode: [0.45, 0, 0] });
  slot(g, 'prowadnica_haka', { explode: [0.2, 0, 0] });
  slot(g, 'urzadzenie_sprezyste', { explode: [0, -0.35, 0] });
  return g;
}

// Hak z trzonem: obrys w płaszczyźnie XY, wyciągnięty na grubość HOOK_T
export function buildHook() {
  const g = part('hak');
  const s = new THREE.Shape();
  s.moveTo(-SHANK_IN, -0.045);
  s.lineTo(0.16, -0.045);
  s.quadraticCurveTo(0.18, -0.12, 0.26, -0.125);   // spód głowy haka
  s.lineTo(0.38, -0.12);
  s.quadraticCurveTo(0.45, -0.1, 0.45, -0.03);
  s.lineTo(0.45, 0.07);                              // dziób haka
  s.quadraticCurveTo(0.44, 0.1, 0.4, 0.1);
  s.quadraticCurveTo(0.36, 0.1, 0.355, 0.06);
  s.lineTo(0.35, 0.0);
  s.quadraticCurveTo(0.33, -0.04, 0.29, -0.04);     // gardziel (tu zakłada się kabłąk)
  s.lineTo(0.27, -0.04);
  s.quadraticCurveTo(0.235, -0.04, 0.235, 0.0);
  s.lineTo(0.235, 0.05);
  s.quadraticCurveTo(0.2, 0.09, 0.16, 0.045);
  s.lineTo(-SHANK_IN, 0.045);
  s.closePath();
  // otwór na sworzeń sprzęgu
  const hole = new THREE.Path();
  hole.absarc(PIN_X, 0, 0.022, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: HOOK_T, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 2, curveSegments: 16 });
  geo.translate(0, 0, -HOOK_T / 2);
  mesh(geo, M.steelRaw, { parent: g });
  // gwint i nakrętka na końcu trzonu (za urządzeniem sprężystym)
  cylinder(0.03, 0.12, M.steelMachined, { axis: 'x', pos: [-SHANK_IN - 0.05, 0, 0], seg: 24, parent: g });
  mesh(cylGeom(0.05, 0.05, { seg: 6, axis: 'x' }), M.steelRaw, { pos: [-SHANK_IN + 0.0, 0, 0], parent: g });
  return g;
}

// Prowadnica haka – ramka na belce czołowej, w której przesuwa się trzon
export function buildHookGuide() {
  const g = part('prowadnica_haka');
  const P = M.paintDark;
  const t = 0.03, hy = 0.075, hz = 0.045, w = 0.05;
  merged([
    boxGeom(t, w, 2 * (hz + w), [t / 2, hy + w / 2, 0]),
    boxGeom(t, w, 2 * (hz + w), [t / 2, -hy - w / 2, 0]),
    boxGeom(t, 2 * hy, w, [t / 2, 0, hz + w / 2]),
    boxGeom(t, 2 * hy, w, [t / 2, 0, -hz - w / 2]),
  ], P, { parent: g });
  // nakładki ślizgowe w prowadnicy (ograniczają zużycie trzonu)
  box(0.08, 0.012, 2 * hz, M.steelMachined, { pos: [t + 0.02, -0.051, 0], r: 0.002, parent: g });
  bolts([[hy + w / 2, hz + w / 2], [hy + w / 2, -hz - w / 2], [-hy - w / 2, hz + w / 2], [-hy - w / 2, -hz - w / 2]].map(([y, z]) => ({ pos: [t, y, z], dir: [1, 0, 0] })), 0.016, M.bolt, { parent: g, stick: 0.3 });
  return g;
}

// Urządzenie sprężyste cięgłowe – pakiet sprężysty na trzonie haka, za belką czołową
export function buildDrawSpring() {
  const g = part('urzadzenie_sprezyste_ciegla');
  const x0 = -SHANK_IN + 0.04, x1 = -0.22;
  // płyty oporowe
  for (const x of [x0, x1]) box(0.025, 0.2, 0.2, M.steelRaw, { pos: [x, 0, 0], r: 0.005, parent: g });
  // sprężyna (lub pakiet elastomerowy – zależnie od wykonania)
  const spr = springGeom(0.075, 0.012, x1 - x0 - 0.03, 5.5);
  spr.rotateZ(-Math.PI / 2);
  mesh(spr, M.paintDarkRound, { pos: [x0 + 0.015, 0, 0], parent: g });
  return g;
}

// ---------------- Sprzęg śrubowy ----------------
// Układ lokalny: początek w osi sworznia w haku, sprzęg ułożony wzdłuż +x
// (w wagonie obrócony w dół – zwisa z haka).
const NUT1 = 0.24, NUT2 = 0.5, BOW = 0.85;

export function buildScrewCoupling() {
  const g = part('sprzeg_srubowy');
  slot(g, 'ogniwa', { explode: [-0.1, 0, 0.2] });
  slot(g, 'nakretki', { explode: [0, 0.18, 0] });
  slot(g, 'sruba', { explode: [0, -0.2, 0] });
  slot(g, 'kablak', { explode: [0.3, 0, 0] });
  return g;
}

// Ogniwa (płaskowniki boczne) + sworzeń przez hak
export function buildCouplingLinks() {
  const g = part('ogniwa_sprzegu');
  for (const z of [0.045, -0.045]) {
    boxFromTo([0, NUT1], [-0.03, 0.03], [z - 0.01, z + 0.01], M.steelRaw, { r: 0.006, parent: g });
    for (const x of [0, NUT1]) cylinder(0.04, 0.022, M.steelRaw, { axis: 'z', pos: [x, 0, z], seg: 24, parent: g });
  }
  // sworzeń z łbem i zawleczką
  cylinder(0.02, 0.14, M.steelMachined, { axis: 'z', pos: [0, 0, 0], seg: 20, parent: g });
  cylinder(0.032, 0.012, M.steelRaw, { axis: 'z', pos: [0, 0, 0.066], seg: 20, parent: g });
  return g;
}

// Nakrętki czopowe (z czopami osadzonymi w ogniwach i w kabłąku)
export function buildCouplingNuts() {
  const g = part('nakretki_sprzegu');
  for (const x of [NUT1, NUT2]) {
    box(0.07, 0.075, 0.07, M.steelRaw, { pos: [x, 0, 0], r: 0.01, parent: g });
    cylinder(0.02, 0.13, M.steelRaw, { axis: 'z', pos: [x, 0, 0], seg: 16, parent: g });
  }
  return g;
}

// Śruba z gwintem prawym i lewym oraz rękojeść z ciężarkiem
export function buildCouplingScrew() {
  const g = part('sruba_sprzegu');
  const a = NUT1 - 0.06, b = NUT2 + 0.06;
  cylinder(0.02, b - a, M.steelMachined, { axis: 'x', pos: [(a + b) / 2, 0, 0], seg: 20, parent: g });
  // zwoje gwintu (dwa odcinki – prawy i lewy)
  for (const [x0, x1] of [[a, (a + b) / 2 - 0.04], [(a + b) / 2 + 0.04, b]]) {
    const th = springGeom(0.021, 0.0035, x1 - x0, Math.round((x1 - x0) / 0.012));
    th.rotateZ(-Math.PI / 2);
    mesh(th, M.steelMachined, { pos: [x0, 0, 0], parent: g });
  }
  // piasta i rękojeść z kulą
  const xm = (a + b) / 2;
  cylinder(0.035, 0.07, M.steelRaw, { axis: 'x', pos: [xm, 0, 0], seg: 20, parent: g });
  rod([xm, 0, 0], [xm, 0.02, 0.26], 0.012, M.steelRaw, { seg: 10, parent: g });
  mesh(new THREE.SphereGeometry(0.035, 20, 14), M.steelRaw, { pos: [xm, 0.02, 0.27], parent: g });
  return g;
}

// Kabłąk – pałąk zakładany na hak sąsiedniego wagonu
export function buildCouplingShackle() {
  const g = part('kablak_sprzegu');
  const zr = 0.06, r = 0.017;
  for (const z of [zr, -zr]) rod([NUT2, 0, z], [BOW - zr, 0, z], r, M.steelRaw, { seg: 12, parent: g });
  const bow = new THREE.TorusGeometry(zr, r, 12, 24, Math.PI);
  bow.rotateX(Math.PI / 2);
  bow.rotateY(Math.PI / 2); // łuk w płaszczyźnie XZ, wypukły w stronę +x
  mesh(bow, M.steelRaw, { pos: [BOW - zr, 0, 0], parent: g });
  return g;
}

export const couplingBuilders = {
  hak_ciagowy: buildDrawHookAssembly,
  hak: buildHook,
  prowadnica_haka: buildHookGuide,
  urzadzenie_sprezyste_ciegla: buildDrawSpring,
  sprzeg_srubowy: buildScrewCoupling,
  ogniwa_sprzegu: buildCouplingLinks,
  nakretki_sprzegu: buildCouplingNuts,
  sruba_sprzegu: buildCouplingScrew,
  kablak_sprzegu: buildCouplingShackle,
};
