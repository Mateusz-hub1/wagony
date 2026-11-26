// Wagon Eaos (węglarka czteroosiowa) – pudło, ostoja i rozmieszczenie wspólnych podzespołów.
// Układ: x wzdłuż wagonu (0 = środek), y w górę (0 = główka szyny), z w poprzek.
//
// Wymiary ze źródeł (karty katalogowe DB Cargo Eaos-x 051, VTG Eaos – zob. data/eaos.json):
//   długość ze zderzakami 14 040 mm, rozstaw czopów skrętu 9 000 mm,
//   długość ładunkowa 12 800 mm, szerokość ładunkowa 2 800 mm,
//   wysokość podłogi nad główką szyny 1 200 mm, wysokość ścian (ładunkowa) 2 000 mm.
// Pozostałe wymiary (profile, drzwi, słupki) – SZACUNKOWE, do sprawdzenia.
import { M, part, slot, box, boxFromTo, merged, boxGeom, cylinder, bolts, rivets, weld } from '../lib/geom.js';
import { y25Builders } from '../components/y25/index.js';

export const PIVOT_X = 4.5;   // pół rozstawu czopów skrętu (9000 / 2)
export const HALF_LEN = 6.4;  // lico belki czołowej: (14 040 − 2 × 620 mm długości zderzaka) / 2 – długość zderzaka SZACUNKOWA
export const FLOOR_Y = 1.2;   // góra podłogi
export const IN_W = 1.4;      // pół szerokości wnętrza (2800 / 2)
export const IN_L = 6.34;     // wewnętrzna powierzchnia ściany czołowej (SZACUNKOWE – ściana cofnięta za lico belki czołowej)
export const TOP_Y = FLOOR_Y + 2.0;   // górna krawędź poszycia
const CHORD = [3.12, 3.25];   // pas górny: dół i góra (SZACUNKOWE)
const DOOR_X = 2.0;           // środek drzwi od środka wagonu (SZACUNKOWE)
const DOOR_W = 1.8;           // szerokość otworu drzwiowego (SZACUNKOWE)
const DOOR_H = CHORD[0] - FLOOR_Y - 0.02; // wysokość skrzydła (do pasa górnego)
const SHEET = 0.004;          // grubość poszycia (SZACUNKOWE)

const sorted = (a, b) => (a < b ? [a, b] : [b, a]);

// Profil kapeluszowy (omega) – typowe użebrowanie ścian wagonów.
// Zwraca geometrie: półka zewnętrzna + dwie ścianki. Wzdłuż osi Y (pionowo).
function hatV(x, y0, y1, z0, w = 0.1, d = 0.06, t = 0.005) {
  const h = y1 - y0, yc = (y0 + y1) / 2;
  return [
    boxGeom(w, h, t, [x, yc, z0 + d - t / 2]),
    boxGeom(t, h, d, [x - w / 2 + t / 2, yc, z0 + d / 2]),
    boxGeom(t, h, d, [x + w / 2 - t / 2, yc, z0 + d / 2]),
  ];
}
// To samo, poziomo (wzdłuż X)
function hatH(x0, x1, y, z0, w = 0.08, d = 0.04, t = 0.005) {
  const l = x1 - x0, xc = (x0 + x1) / 2;
  return [
    boxGeom(l, w, t, [xc, y, z0 + d - t / 2]),
    boxGeom(l, t, d, [xc, y - w / 2 + t / 2, z0 + d / 2]),
    boxGeom(l, t, d, [xc, y + w / 2 - t / 2, z0 + d / 2]),
  ];
}

// ======================= WAGON =======================

export function buildEaos() {
  const g = part('eaos');
  slot(g, 'pudlo', { explode: [0, 1.6, 0] });
  slot(g, 'ostoja', { explode: [0, 0.7, 0] });
  slot(g, 'wozek_1', { pos: [PIVOT_X, 0, 0], explode: [1.8, 0, 0] });
  slot(g, 'wozek_2', { pos: [-PIVOT_X, 0, 0], rot: [0, Math.PI, 0], explode: [-1.8, 0, 0] });
  return g;
}

// ======================= PUDŁO =======================

export function buildBody() {
  const g = part('pudlo');
  slot(g, 'podloga', {});
  slot(g, 'sciana_boczna_1', { explode: [0, 0, 0.9] });
  slot(g, 'sciana_boczna_2', { rot: [0, Math.PI, 0], explode: [0, 0, -0.9] });
  slot(g, 'sciana_czolowa_1', { explode: [0.9, 0, 0] });
  slot(g, 'sciana_czolowa_2', { rot: [0, Math.PI, 0], explode: [-0.9, 0, 0] });
  slot(g, 'pas_gorny_1', { explode: [0, 0.6, 0.5] });
  slot(g, 'pas_gorny_2', { rot: [0, Math.PI, 0], explode: [0, 0.6, -0.5] });
  return g;
}

// Podłoga stalowa: blacha z poprzecznymi spoinami łączącymi arkusze + podłużnice pod spodem
export function buildFloor() {
  const g = part('podloga');
  boxFromTo([-IN_L, IN_L], [FLOOR_Y - 0.008, FLOOR_Y], [-IN_W, IN_W], M.paintBody, { r: 0.003, parent: g });
  // spoiny styków arkuszy blachy (co ok. 2,1 m – SZACUNKOWE)
  for (const x of [-4.2, -2.1, 0, 2.1, 4.2]) {
    weld([x, FLOOR_Y + 0.001, -IN_W + 0.01], [x, FLOOR_Y + 0.001, IN_W - 0.01], 0.004, { parent: g });
  }
  // spoiny pachwinowe podłoga – ściany (wzdłuż ścian bocznych)
  for (const s of [1, -1]) {
    weld([-IN_L + 0.01, FLOOR_Y + 0.003, s * (IN_W - 0.004)], [IN_L - 0.01, FLOOR_Y + 0.003, s * (IN_W - 0.004)], 0.005, { parent: g });
  }
  // podłużnice usztywniające pod blachą
  merged([-0.7, 0.7].map((z) => boxGeom(2 * IN_L - 0.1, 0.05, 0.06, [0, FLOOR_Y - 0.033, z])), M.paintBody, { parent: g });
  return g;
}

// Ściana boczna (dla strony +z; druga jest obrócona o 180°)
export function buildSideWall() {
  const g = part('sciana_boczna');
  const P = M.paintBody;
  const z0 = IN_W, z1 = IN_W + SHEET;
  const yb = FLOOR_Y - 0.01, yt = CHORD[0];
  slot(g, 'drzwi_1', { pos: [DOOR_X, FLOOR_Y, IN_W], explode: [0, 0, 0.6] });
  slot(g, 'drzwi_2', { pos: [-DOOR_X, FLOOR_Y, IN_W], explode: [0, 0, 0.6] });

  // poszycie: trzy pola między otworami drzwiowymi
  const d0 = DOOR_X - DOOR_W / 2, d1 = DOOR_X + DOOR_W / 2;
  const panels = [[-IN_L, -d1], [-d0, d0], [d1, IN_L]];
  merged(panels.map(([a, b]) => boxGeom(b - a, yt - yb, SHEET, [(a + b) / 2, (yb + yt) / 2, (z0 + z1) / 2], 0.0015)), P, { parent: g });

  // słupki pośrednie (profil kapeluszowy, na zewnątrz poszycia)
  const posts = [];
  for (const [a, b] of panels) {
    const n = Math.max(1, Math.round((b - a) / 0.95) - 1); // co ok. 0,95 m (SZACUNKOWE)
    for (let i = 1; i <= n; i++) posts.push(a + ((b - a) * i) / (n + 1));
  }
  merged(posts.flatMap((x) => hatV(x, yb, yt, z1)), P, { parent: g });
  // spoiny u podstawy słupków
  for (const x of posts) weld([x - 0.05, yb + 0.005, z1 + 0.004], [x + 0.05, yb + 0.005, z1 + 0.004], 0.004, { parent: g });

  // słupki drzwiowe (cięższe, zamknięte) po obu stronach każdego otworu
  const doorPosts = [-d1 - 0.06, -d0 + 0.06, d0 - 0.06, d1 + 0.06];
  merged(doorPosts.map((x) => boxGeom(0.12, yt - yb, 0.09, [x, (yb + yt) / 2, z1 + 0.045], 0.008)), P, { parent: g });
  for (const x of doorPosts) for (const sx of [-1, 1]) {
    weld([x + sx * 0.062, yb + 0.02, z1 + 0.004], [x + sx * 0.062, yt - 0.02, z1 + 0.004], 0.004, { parent: g });
  }
  // listwa dolna (kątownik wzdłuż dolnej krawędzi pól ściany)
  merged(panels.map(([a, b]) => boxGeom(b - a, 0.07, 0.03, [(a + b) / 2, yb + 0.035, z1 + 0.015], 0.004)), P, { parent: g });
  // zaczepy do mocowania plandeki / lin na listwie dolnej (SZACUNKOWE)
  const hooks = [-5.6, -4.2, -0.6, 0.6, 4.2, 5.6];
  merged(hooks.map((x) => boxGeom(0.05, 0.04, 0.05, [x, yb + 0.02, z1 + 0.055], 0.006)), M.steelRaw, { parent: g });
  return g;
}

// Drzwi dwuskrzydłowe (para). Początek: środek otworu na wysokości podłogi, na licu poszycia.
export function buildDoors() {
  const g = part('drzwi');
  const q = DOOR_W / 4;
  slot(g, 'skrzydlo_1', { pos: [q, 0, 0], explode: [0.25, 0, 0.25], remove: [0.35, 0, 1.1] });
  slot(g, 'skrzydlo_2', { pos: [-q, 0, 0], explode: [-0.25, 0, 0.25], remove: [-0.35, 0, 1.1] });
  // zaczepy rygli w podłodze i w pasie górnym (wspólne dla pary)
  for (const y of [0.012, DOOR_H + 0.012]) box(0.08, 0.025, 0.06, M.steelRaw, { pos: [0, y, 0.07], r: 0.005, parent: g });
  return g;
}

// Skrzydło drzwi. param.strona = +1: zawiasy po stronie +x, −1: po stronie −x.
// Początek: środek dolnej krawędzi skrzydła na licu poszycia.
export function buildDoorLeaf(node) {
  const g = part('skrzydlo_drzwi');
  const s = node?.param?.strona ?? 1;
  const P = M.paintBody;
  const w = DOOR_W / 2 - 0.01, h = DOOR_H, t = 0.005;
  const y0 = 0.02;
  // blacha skrzydła
  boxFromTo([-w / 2, w / 2], [y0, y0 + h], [0, t], P, { r: 0.002, parent: g });
  // rama obwodowa i użebrowanie poziome (profile kapeluszowe)
  merged([
    ...hatV(-w / 2 + 0.04, y0, y0 + h, t, 0.08, 0.045),
    ...hatV(w / 2 - 0.04, y0, y0 + h, t, 0.08, 0.045),
    ...[0.08, 0.7, 1.3, h - 0.08].flatMap((y) => hatH(-w / 2 + 0.08, w / 2 - 0.08, y0 + y, t)),
  ], P, { parent: g });
  // zawiasy: 3 okucia na krawędzi zewnętrznej + sworznie
  const xh = s * (w / 2 + 0.03);
  for (const y of [0.25, 1.0, h - 0.25]) {
    box(0.22, 0.07, 0.014, M.steelRaw, { pos: [s * (w / 2 - 0.08), y0 + y, t + 0.052], r: 0.004, parent: g });
    cylinder(0.022, 0.1, M.steelRaw, { pos: [xh, y0 + y, t + 0.05], parent: g });
    cylinder(0.012, 0.13, M.steelMachined, { pos: [xh, y0 + y, t + 0.05], parent: g });
    bolts([-0.06, 0.02].map((dx) => ({ pos: [s * (w / 2 - 0.08) + s * dx, y0 + y, t + 0.059], dir: [0, 0, 1] })), 0.014, M.bolt, { parent: g });
  }
  // zamknięcie: pionowy rygiel przy krawędzi wewnętrznej z dźwignią
  const xl = -s * (w / 2 - 0.1);
  cylinder(0.016, h + 0.02, M.steelRaw, { pos: [xl, y0 + h / 2, t + 0.07], seg: 12, parent: g });
  for (const y of [0.15, 0.9, h - 0.15]) box(0.06, 0.05, 0.04, M.steelRaw, { pos: [xl, y0 + y, t + 0.05], r: 0.005, parent: g });
  box(0.04, 0.35, 0.025, M.steelRaw, { pos: [xl - s * 0.04, y0 + 1.05, t + 0.095], rot: [0, 0, s * 0.35], r: 0.006, parent: g });
  // nity mocowania okuć rygla
  rivets([0.15, 0.9, h - 0.15].flatMap((y) => [[xl - 0.02, y0 + y - 0.035, t], [xl + 0.02, y0 + y - 0.035, t]]).map((pos) => ({ pos, dir: [0, 0, 1] })), 0.008, M.bolt, { parent: g });
  return g;
}

// Ściana czołowa (dla końca +x; druga obrócona o 180°)
export function buildEndWall() {
  const g = part('sciana_czolowa');
  const P = M.paintBody;
  const x0 = IN_L, x1 = IN_L + SHEET, xo = HALF_LEN - 0.005;
  const yb = FLOOR_Y - 0.01;
  // poszycie
  boxFromTo([x0, x1], [yb, CHORD[1]], [-IN_W - SHEET, IN_W + SHEET], P, { r: 0.0015, parent: g });
  // użebrowanie: pionowe profile kapeluszowe (obrócone, płaszczyzna YZ) i poziome
  const d = xo - x1 - 0.002;
  const vert = [-0.95, -0.35, 0.35, 0.95].map((z) => boxGeom(0.006, CHORD[1] - yb - 0.1, 0.1, [x1 + d, (yb + CHORD[1] - 0.1) / 2, z]));
  const vertSides = [-0.95, -0.35, 0.35, 0.95].flatMap((z) => [-1, 1].map((sz) => boxGeom(d, CHORD[1] - yb - 0.1, 0.005, [x1 + d / 2, (yb + CHORD[1] - 0.1) / 2, z + sz * 0.048])));
  const horiz = [FLOOR_Y + 0.65, FLOOR_Y + 1.35].map((y) => boxGeom(0.006, 0.08, 2 * IN_W - 0.1, [x1 + d * 0.7, y, 0]));
  merged([...vert, ...vertSides, ...horiz], P, { parent: g });
  // rama górna ściany czołowej (profil zamknięty)
  boxFromTo([x0 - 0.05, xo], [CHORD[0], CHORD[1]], [-IN_W - 0.02, IN_W + 0.02], P, { r: 0.012, parent: g });
  // słupki narożne (kątowniki) – łączą ścianę czołową z bocznymi
  for (const s of [1, -1]) {
    const zr = sorted(s * (IN_W + SHEET), s * (IN_W + 0.1));
    boxFromTo([x0 - 0.12, xo], [yb, CHORD[1]], zr, P, { r: 0.01, parent: g });
    weld([x0 - 0.12, yb + 0.02, s * (IN_W + 0.1)], [x0 - 0.12, CHORD[0] - 0.02, s * (IN_W + 0.1)], 0.005, { parent: g });
  }
  // spoiny poszycia z ramą górną
  weld([x1 + 0.003, CHORD[0] - 0.003, -IN_W], [x1 + 0.003, CHORD[0] - 0.003, IN_W], 0.004, { parent: g });
  return g;
}

// Pas górny (dla strony +z; drugi obrócony o 180°): ciągły profil zamknięty
export function buildTopChord() {
  const g = part('pas_gorny');
  const P = M.paintBody;
  const zr = [IN_W - 0.02, IN_W + 0.1];
  boxFromTo([-IN_L + 0.05, IN_L - 0.05], CHORD, zr, P, { r: 0.015, parent: g });
  // spoiny pas górny – poszycie
  weld([-IN_L + 0.06, CHORD[0], IN_W + SHEET + 0.003], [IN_L - 0.06, CHORD[0], IN_W + SHEET + 0.003], 0.005, { parent: g });
  // zaślepki końców profilu
  for (const s of [1, -1]) box(0.008, CHORD[1] - CHORD[0] - 0.01, zr[1] - zr[0] - 0.01, M.paintBody, { pos: [s * (IN_L - 0.046), (CHORD[0] + CHORD[1]) / 2, (zr[0] + zr[1]) / 2], parent: g });
  return g;
}

// ======================= OSTOJA (uproszczona – rozbudowa w kroku 2) =======================

export function buildUnderframe() {
  const g = part('ostoja');
  const P = M.paintBody;
  const top = FLOOR_Y - 0.008;
  for (const s of [1, -1]) {
    boxFromTo([-HALF_LEN, HALF_LEN], [0.95, top], sorted(s * 1.38 - 0.06, s * 1.38 + 0.06), P, { r: 0.01, parent: g });
    boxFromTo([s * HALF_LEN - 0.1, s * HALF_LEN + 0.1], [0.88, top], [-1.45, 1.45], P, { r: 0.012, parent: g });
    boxFromTo([s * PIVOT_X - 0.2, s * PIVOT_X + 0.2], [0.95, top], [-1.38, 1.38], P, { r: 0.012, parent: g });
    cylinder(0.15, 0.17, M.paintDarkRound, { pos: [s * PIVOT_X, 0.865, 0], seg: 48, parent: g });
    for (const z of [0.82, -0.82]) box(0.2, 0.13, 0.12, P, { pos: [s * PIVOT_X, 0.88, z], parent: g });
  }
  boxFromTo([-HALF_LEN, HALF_LEN], [1.0, top], [-0.15, 0.15], P, { r: 0.01, parent: g });
  merged([-3, -1.5, 0, 1.5, 3].map((x) => boxGeom(0.12, 0.18, 2.64, [x, 1.1, 0])), P, { parent: g });
  return g;
}

// Wszystkie buildery, których potrzebuje Eaos (wagon + wspólne podzespoły)
export const builders = {
  ...y25Builders,
  eaos: buildEaos,
  ostoja_eaos: buildUnderframe,
  pudlo_eaos: buildBody,
  podloga_eaos: buildFloor,
  sciana_boczna_eaos: buildSideWall,
  drzwi_eaos: buildDoors,
  skrzydlo_drzwi_eaos: buildDoorLeaf,
  sciana_czolowa_eaos: buildEndWall,
  pas_gorny_eaos: buildTopChord,
};
