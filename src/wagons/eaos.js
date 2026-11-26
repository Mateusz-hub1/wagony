// Wagon Eaos (węglarka czteroosiowa) – pudło, ostoja i rozmieszczenie wspólnych podzespołów.
// Układ: x wzdłuż wagonu (0 = środek), y w górę (0 = główka szyny), z w poprzek.
//
// Wymiary ze źródeł (karty katalogowe DB Cargo Eaos-x 051, VTG Eaos – zob. data/eaos.json):
//   długość ze zderzakami 14 040 mm, rozstaw czopów skrętu 9 000 mm,
//   długość ładunkowa 12 800 mm, szerokość ładunkowa 2 800 mm,
//   wysokość podłogi nad główką szyny 1 200 mm, wysokość ścian (ładunkowa) 2 000 mm.
// Pozostałe wymiary (profile, drzwi, słupki) – SZACUNKOWE, do sprawdzenia.
import { THREE, M, part, slot, mesh, box, boxFromTo, merged, boxGeom, cylinder, rod, lathe, bolts, boltCircle, rivets, weld } from '../lib/geom.js';
import { y25Builders } from '../components/y25/index.js';
import { drawGearBuilders } from '../components/ciegla_zderzaki/index.js';

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
  // urządzenia cięgłowo-zderzakowe na obu końcach (na licu belki czołowej, w osi zderzaków)
  slot(g, 'ciegla_zderzaki_1', { pos: [HALF_LEN, BUF_Y, 0], explode: [2.6, 0, 0] });
  slot(g, 'ciegla_zderzaki_2', { pos: [-HALF_LEN, BUF_Y, 0], rot: [0, Math.PI, 0], explode: [-2.6, 0, 0] });
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

// ======================= OSTOJA =======================
// Wysokości ostoi (SZACUNKOWE): spód ostojnicy 0,90 m, góra = spód blachy podłogi.
const UF_TOP = FLOOR_Y - 0.008;
const SOLE_Z = IN_W;          // zewnętrzna ściana ostojnicy pod poszyciem ściany bocznej
export const HEAD_X = HALF_LEN - 0.2; // wewnętrzna krawędź belki czołowej
export const BUF_Y = 1.03;    // oś zderzaków i haka nad główką szyny (SZACUNKOWE; UIC 528: maks. 1065 mm wagon próżny)
export const BUF_Z = 0.875;   // pół rozstawu osi zderzaków (1750 / 2, UIC 528)
const CORNERS = { 1: [1, 1], 2: [1, -1], 3: [-1, 1], 4: [-1, -1] }; // nr narożnika → [sx, sz]

export function buildUnderframe() {
  const g = part('ostoja');
  slot(g, 'ostojnica_1', { explode: [0, 0, 0.6] });
  slot(g, 'ostojnica_2', { rot: [0, Math.PI, 0], explode: [0, 0, -0.6] });
  slot(g, 'belka_czolowa_1', { explode: [0.7, 0, 0] });
  slot(g, 'belka_czolowa_2', { rot: [0, Math.PI, 0], explode: [-0.7, 0, 0] });
  slot(g, 'belka_skretowa_1', { pos: [PIVOT_X, 0, 0], explode: [0, -0.45, 0] });
  slot(g, 'belka_skretowa_2', { pos: [-PIVOT_X, 0, 0], rot: [0, Math.PI, 0], explode: [0, -0.45, 0] });
  slot(g, 'belka_srodkowa', { explode: [0, -0.25, 0] });
  slot(g, 'poprzecznice', { explode: [0, 0.3, 0] });
  for (const [n, [sx, sz]] of Object.entries(CORNERS)) {
    slot(g, `stopien_manewrowy_${n}`, { explode: [sx * 0.3, -0.25, sz * 0.5] });
    slot(g, `porecz_manewrowa_${n}`, { explode: [sx * 0.5, 0.2, sz * 0.4] });
  }
  return g;
}

// Ostojnica (dla strony +z): ceownik – środnik pionowy + półki skierowane do środka
export function buildSoleBar() {
  const g = part('ostojnica');
  const P = M.paintBody;
  const y0 = 0.9, t = 0.012, fl = 0.1;
  const zw = [SOLE_Z - t, SOLE_Z];
  boxFromTo([-HEAD_X, HEAD_X], [y0, UF_TOP], zw, P, { r: 0.004, parent: g });
  boxFromTo([-HEAD_X, HEAD_X], [y0, y0 + t], [SOLE_Z - fl, SOLE_Z], P, { r: 0.004, parent: g });
  boxFromTo([-HEAD_X, HEAD_X], [UF_TOP - t, UF_TOP], [SOLE_Z - fl, SOLE_Z], P, { r: 0.004, parent: g });
  // żebra (przepony) wewnątrz ceownika przy słupkach ścian – co ok. 1 m
  const ribs = [];
  for (let x = -HEAD_X + 0.5; x < HEAD_X - 0.3; x += 1.0) ribs.push(boxGeom(0.01, UF_TOP - y0 - 2 * t, fl - t, [x, (y0 + UF_TOP) / 2, SOLE_Z - t - (fl - t) / 2]));
  merged(ribs, P, { parent: g });
  // spoina ostojnica – blacha podłogi (od wewnątrz)
  weld([-HEAD_X, UF_TOP - 0.004, SOLE_Z - fl - 0.003], [HEAD_X, UF_TOP - 0.004, SOLE_Z - fl - 0.003], 0.005, { parent: g });
  // tabliczki / uchwyty do podnoszenia wagonu nad belkami skrętowymi (SZACUNKOWE)
  for (const sx of [1, -1]) box(0.3, 0.06, 0.04, M.paintDark, { pos: [sx * (PIVOT_X + 0.3), y0 + 0.03, SOLE_Z + 0.02], r: 0.006, parent: g });
  return g;
}

// Belka czołowa (dla końca +x): blacha czołowa z półkami, nakładki pod zderzaki, otwór haka
export function buildHeadstock() {
  const g = part('belka_czolowa');
  const P = M.paintBody;
  const y0 = 0.84, t = 0.012, xf = HALF_LEN - 0.012; // lico blachy (nakładki dochodzą do HALF_LEN)
  const zr = [-(SOLE_Z + 0.04), SOLE_Z + 0.04];
  boxFromTo([xf - t, xf], [y0, UF_TOP], zr, P, { r: 0.004, parent: g });            // blacha czołowa
  boxFromTo([HEAD_X, xf - t], [UF_TOP - t, UF_TOP], zr, P, { r: 0.004, parent: g }); // półka górna
  boxFromTo([HEAD_X, xf - t], [y0, y0 + t], zr, P, { r: 0.004, parent: g });         // półka dolna
  boxFromTo([HEAD_X, HEAD_X + t], [y0, UF_TOP], zr, P, { r: 0.004, parent: g });     // ścianka tylna
  // nakładki wzmacniające pod zderzaki
  for (const s of [1, -1]) {
    boxFromTo([xf, HALF_LEN], [BUF_Y - 0.19, Math.min(BUF_Y + 0.19, UF_TOP)], [s * BUF_Z - 0.2, s * BUF_Z + 0.2], P, { r: 0.004, parent: g });
    // żebra wewnętrzne za zderzakiem
    merged([-0.12, 0.12].map((dz) => boxGeom(0.18, UF_TOP - y0 - 2 * t, 0.01, [(HEAD_X + xf) / 2, (y0 + UF_TOP) / 2, s * BUF_Z + dz])), P, { parent: g });
  }
  // rama otworu haka cięgłowego
  const hy = [BUF_Y - 0.1, BUF_Y + 0.1], hz = 0.08;
  merged([
    boxGeom(0.02, 0.03, 2 * hz + 0.06, [xf + 0.006, hy[1] + 0.015, 0]),
    boxGeom(0.02, 0.03, 2 * hz + 0.06, [xf + 0.006, hy[0] - 0.015, 0]),
    boxGeom(0.02, hy[1] - hy[0], 0.03, [xf + 0.006, BUF_Y, hz + 0.015]),
    boxGeom(0.02, hy[1] - hy[0], 0.03, [xf + 0.006, BUF_Y, -hz - 0.015]),
  ], P, { parent: g });
  // otwór (ciemne wnętrze)
  box(0.006, hy[1] - hy[0], 2 * hz, M.rubber, { pos: [xf + 0.001, BUF_Y, 0], r: 0.002, parent: g });
  // spoiny belka czołowa – ostojnice
  for (const s of [1, -1]) weld([HEAD_X, y0 + 0.01, s * (SOLE_Z - 0.006)], [HEAD_X, UF_TOP - 0.01, s * (SOLE_Z - 0.006)], 0.006, { parent: g });
  return g;
}

// Belka skrętowa: belka skrzynkowa w poprzek wagonu, nad wózkiem. Początek: oś czopa skrętu.
// Spód płaski w środku (czop, przeciwślizgi), przy ostojnicach podniesiony.
export function buildBolster() {
  const g = part('belka_skretowa');
  const P = M.paintBody;
  slot(g, 'czop_skretu', { pos: [0, 0.865, 0], explode: [0, -0.35, 0] });
  const sh = new THREE.Shape();
  const zc = 0.95, ze = SOLE_Z - 0.012, yb = 0.95, ye = 1.06;
  sh.moveTo(-ze, UF_TOP); sh.lineTo(ze, UF_TOP); sh.lineTo(ze, ye); sh.lineTo(zc, yb);
  sh.lineTo(-zc, yb); sh.lineTo(-ze, ye); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1 });
  geo.translate(0, 0, -0.18);
  geo.rotateY(Math.PI / 2); // kształt w płaszczyźnie ZY, grubość wzdłuż X
  mesh(geo, P, { parent: g });
  // przeciwślizgi nad ślizgami bocznymi wózka
  for (const z of [0.82, -0.82]) {
    box(0.2, 0.13, 0.12, M.paintBody, { pos: [0, 0.88, z], r: 0.008, parent: g });
    box(0.18, 0.012, 0.1, M.steelMachined, { pos: [0, 0.809, z], r: 0.002, parent: g });
  }
  // spoiny belka skrętowa – ostojnice
  for (const s of [1, -1]) for (const dx of [-0.186, 0.186]) weld([dx, ye, s * (ze - 0.004)], [dx, UF_TOP - 0.01, s * (ze - 0.004)], 0.006, { parent: g });
  return g;
}

// Czop skrętu (od strony pudła) – wchodzi w gniazdo skrętu wózka. Początek: środek walca.
export function buildPivot() {
  const g = part('czop_skretu');
  lathe([[0, -0.085], [0.142, -0.085], [0.15, -0.077], [0.15, 0.06], [0.21, 0.06], [0.21, 0.085], [0, 0.085]], M.paintDarkRound, { seg: 64, rot: [-Math.PI / 2, 0, 0], parent: g });
  boltCircle(6, 0.185, 0.06, 0.018, { parent: g, rot: [-Math.PI / 2, 0, 0], flip: true, start: 0 });
  return g;
}

// Belka środkowa: dwa ceowniki wzdłuż osi wagonu (wewnątrz – urządzenie cięgłowe)
export function buildCenterSill() {
  const g = part('belka_srodkowa');
  const P = M.paintBody;
  const y0 = 0.96, t = 0.01, fl = 0.08;
  for (const s of [1, -1]) {
    const zw = sorted(s * 0.13, s * (0.13 + t));
    boxFromTo([-HEAD_X, HEAD_X], [y0, UF_TOP], zw, P, { r: 0.003, parent: g });
    boxFromTo([-HEAD_X, HEAD_X], [y0, y0 + t], sorted(s * 0.13, s * (0.13 + fl)), P, { r: 0.003, parent: g });
  }
  // przewiązki dolne (co ok. 1,5 m)
  const ties = [];
  for (let x = -HEAD_X + 0.9; x < HEAD_X - 0.5; x += 1.5) ties.push(boxGeom(0.08, 0.01, 0.26, [x, y0 - 0.005, 0]));
  merged(ties, P, { parent: g });
  return g;
}

// Poprzecznice: dwuteowniki między belką środkową a ostojnicami (rozstaw SZACUNKOWY)
export function buildCrossBearers() {
  const g = part('poprzecznice');
  const xs = [-3.3, -2.0, -0.7, 0.7, 2.0, 3.3, -5.45, 5.45];
  const geoms = [];
  const y0 = 1.05;
  for (const x of xs) for (const s of [1, -1]) {
    const zc = s * (0.14 + SOLE_Z - 0.012) / 2, len = SOLE_Z - 0.012 - 0.14;
    geoms.push(boxGeom(0.008, UF_TOP - y0, len, [x, (y0 + UF_TOP) / 2, zc]));   // środnik
    geoms.push(boxGeom(0.1, 0.01, len, [x, y0 + 0.005, zc]));                   // półka dolna
  }
  merged(geoms, M.paintBody, { parent: g });
  return g;
}

// Stopień manewrowy w narożniku. param: { sx, sz } – który narożnik (±1).
// Budowany od razu w układzie wagonu (stąd gniazdo bez przesunięcia).
export function buildStep(node) {
  const g = part('stopien_manewrowy');
  const { sx = 1, sz = 1 } = node?.param ?? {};
  const x = sx * (HALF_LEN - 0.4), z = sz * SOLE_Z;
  const yTread = 0.45; // wysokość stopnia nad główką szyny – SZACUNKOWE, sprawdzić w UIC 535-2 / EN 16116-2
  // dwa wsporniki z płaskownika
  for (const dx of [-0.2, 0.2]) {
    rod([x + dx, 0.92, z + sz * 0.01], [x + dx, yTread, z + sz * 0.06], 0.012, M.paintDark, { seg: 8, parent: g });
  }
  // stopień kratowy (płaskowniki na krawędź)
  const bars = [];
  for (let i = 0; i < 5; i++) bars.push(boxGeom(0.44, 0.03, 0.008, [x, yTread, z + sz * (0.0 + i * 0.045)]));
  bars.push(boxGeom(0.012, 0.03, 0.2, [x - 0.21, yTread, z + sz * 0.09]));
  bars.push(boxGeom(0.012, 0.03, 0.2, [x + 0.21, yTread, z + sz * 0.09]));
  merged(bars, M.paintDark, { parent: g });
  return g;
}

// Poręcze manewrowe w narożniku: pionowa na ścianie czołowej i pozioma na boku. param: { sx, sz }
export function buildHandrail(node) {
  const g = part('porecz_manewrowa');
  const { sx = 1, sz = 1 } = node?.param ?? {};
  const R = 0.014;
  // pionowa – na licu ściany czołowej przy narożniku (SZACUNKOWE)
  const xo = sx * (HALF_LEN + 0.06), zv = sz * (IN_W - 0.08);
  rod([xo, 1.35, zv], [xo, 2.15, zv], R, M.paintDark, { seg: 12, parent: g });
  for (const y of [1.35, 2.15]) rod([xo, y, zv], [sx * (HALF_LEN - 0.01), y, zv], R, M.paintDark, { seg: 12, parent: g });
  // pozioma – na ostojnicy nad stopniem
  const zs = sz * (SOLE_Z + 0.07), x0 = sx * (HALF_LEN - 0.7), x1 = sx * (HALF_LEN - 0.15);
  rod([x0, 1.12, zs], [x1, 1.12, zs], R, M.paintDark, { seg: 12, parent: g });
  for (const x of [x0, x1]) rod([x, 1.12, zs], [x, 1.12, sz * SOLE_Z], R, M.paintDark, { seg: 12, parent: g });
  return g;
}

// Wszystkie buildery, których potrzebuje Eaos (wagon + wspólne podzespoły)
export const builders = {
  ...y25Builders,
  ...drawGearBuilders,
  eaos: buildEaos,
  ostoja_eaos: buildUnderframe,
  pudlo_eaos: buildBody,
  podloga_eaos: buildFloor,
  sciana_boczna_eaos: buildSideWall,
  drzwi_eaos: buildDoors,
  skrzydlo_drzwi_eaos: buildDoorLeaf,
  sciana_czolowa_eaos: buildEndWall,
  pas_gorny_eaos: buildTopChord,
  ostojnica_eaos: buildSoleBar,
  belka_czolowa_eaos: buildHeadstock,
  belka_skretowa_eaos: buildBolster,
  czop_skretu_eaos: buildPivot,
  belka_srodkowa_eaos: buildCenterSill,
  poprzecznice_eaos: buildCrossBearers,
  stopien_manewrowy_eaos: buildStep,
  porecz_manewrowa_eaos: buildHandrail,
};
