// Wagon Eanos (węglarka czteroosiowa, większa od Eaos) – pudło, ostoja i rozmieszczenie wspólnych podzespołów.
// Układ: x wzdłuż wagonu (0 = środek), y w górę (0 = główka szyny), z w poprzek.
//
// Wymiary ze źródeł (Rail Cargo Group – karta Eanos 5376/5377/5380, DB Cargo Eanos-x 052 / 056 – zob. data/eanos.json):
//   długość ze zderzakami 15 740 mm, rozstaw czopów skrętu 10 700 mm,
//   długość ładunkowa 14 490 mm, szerokość ładunkowa 2 720 mm, wysokość ładunkowa 2 100 mm,
//   wysokość podłogi nad główką szyny 1 240 mm, wysokość całkowita 3 340 mm,
//   otwór drzwiowy 1 800 × 1 800 mm (dwie pary drzwi dwuskrzydłowych na stronę),
//   blacha podłogi 6 mm, blacha ścian czołowych 4 mm, ściany czołowe stałe (brak informacji o uchylnych).
// Pozostałe wymiary (profile, położenie drzwi, słupki, wysięg użebrowania) – SZACUNKOWE, do sprawdzenia.
import { THREE, M, part, slot, mesh, box, boxFromTo, merged, boxGeom, cylinder, bolts, rivets, weld, hatV, hatH } from '../lib/geom.js';
import { y25Builders } from '../components/y25/index.js';
import { drawGearBuilders } from '../components/ciegla_zderzaki/index.js';
import { BUFFER_LEN } from '../components/ciegla_zderzaki/buffer.js';
import { airBrakeBuilders } from '../components/hamulec/index.js';
import { underframeBuilders } from '../components/ostoja/index.js';

export const PIVOT_X = 5.35;                 // pół rozstawu czopów skrętu (10 700 / 2)
export const HALF_LEN = 15.74 / 2 - BUFFER_LEN; // lico belki czołowej: pół długości ze zderzakami − długość zderzaka (ta SZACUNKOWA) = 7,25
export const FLOOR_Y = 1.24;                 // góra podłogi (1 240 mm)
export const IN_W = 1.36;                    // pół szerokości wnętrza (2 720 / 2)
export const IN_L = 14.49 / 2;               // wewnętrzna powierzchnia ściany czołowej (długość ładunkowa / 2)
export const TOP_Y = FLOOR_Y + 2.1;          // górna krawędź pudła = 3,34 m (wysokość całkowita)
const CHORD = [3.2, TOP_Y];                  // pas górny: dół (SZACUNKOWE) i góra
const DOOR_X = 2.35;                         // środek drzwi od środka wagonu (SZACUNKOWE)
const DOOR_W = 1.8;                          // szerokość otworu drzwiowego (1 800 mm)
const DOOR_OPEN_H = 1.8;                     // wysokość otworu drzwiowego (1 800 mm)
const DOOR_TOP = FLOOR_Y + DOOR_OPEN_H;      // górna krawędź otworu = spód nadproża
const DOOR_H = DOOR_OPEN_H - 0.02;           // wysokość skrzydła
const SHEET = 0.004;                         // grubość poszycia (ściany czołowe 4 mm; boczne SZACUNKOWE – przyjęte tak samo)
const FLOOR_T = 0.006;                       // blacha podłogi 6 mm
const END_RIB = 0.08;                        // wysięg użebrowania ściany czołowej na zewnątrz (SZACUNKOWE)
export const END_XO = IN_L + SHEET + END_RIB; // zewnętrzna płaszczyzna użebrowania ściany czołowej

const sorted = (a, b) => (a < b ? [a, b] : [b, a]);

// Pola poszycia ściany bocznej (między otworami drzwiowymi) i słupki pośrednie – wspólne dla ściany i pasa górnego
const D0 = DOOR_X - DOOR_W / 2, D1 = DOOR_X + DOOR_W / 2;
const PANELS = [[-IN_L, -D1], [-D0, D0], [D1, IN_L]];
function panelPosts([a, b]) {
  const n = Math.max(1, Math.round((b - a) / 0.95) - 1); // co ok. 0,95–1,0 m (SZACUNKOWE)
  const out = [];
  for (let i = 1; i <= n; i++) out.push(a + ((b - a) * i) / (n + 1));
  return out;
}
// Haki pod pasem górnym: w połowie między słupkami, 10 na stronę (DB Cargo: 20 haków na pasie górnym)
function hookXs() {
  const xs = [];
  PANELS.forEach((pn, i) => {
    const pts = [pn[0], ...panelPosts(pn), pn[1]];
    for (let k = 0; k < pts.length - 1; k++) {
      const x = (pts[k] + pts[k + 1]) / 2;
      if (i === 1 && Math.abs(x) < 0.1) continue; // środek wagonu bez haka (10 na stronę)
      xs.push(x);
    }
  });
  return xs;
}

// ======================= WAGON =======================

export function buildEanos() {
  const g = part('eanos');
  slot(g, 'pudlo', { explode: [0, 1.7, 0] });
  slot(g, 'ostoja', { explode: [0, 0.75, 0] });
  slot(g, 'wozek_1', { pos: [PIVOT_X, 0, 0], explode: [1.9, 0, 0] });
  slot(g, 'wozek_2', { pos: [-PIVOT_X, 0, 0], rot: [0, Math.PI, 0], explode: [-1.9, 0, 0] });
  // urządzenia cięgłowo-zderzakowe na obu końcach (na licu belki czołowej, w osi zderzaków)
  slot(g, 'ciegla_zderzaki_1', { pos: [HALF_LEN, BUF_Y, 0], explode: [2.7, 0, 0] });
  slot(g, 'ciegla_zderzaki_2', { pos: [-HALF_LEN, BUF_Y, 0], rot: [0, Math.PI, 0], explode: [-2.7, 0, 0] });
  // hamulec zespolony – budowany w układzie wagonu (parametry w data/eanos.json)
  slot(g, 'hamulec', { explode: [0, 0.1, 0] });
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

// Podłoga stalowa (blacha 6 mm): poprzeczne spoiny styków arkuszy + podłużnice pod spodem
export function buildFloor() {
  const g = part('podloga');
  boxFromTo([-IN_L, IN_L], [FLOOR_Y - FLOOR_T, FLOOR_Y], [-IN_W, IN_W], M.paintBody, { r: 0.003, parent: g });
  // spoiny styków arkuszy blachy (co ok. 2,4 m – SZACUNKOWE)
  for (const x of [-4.8, -2.4, 0, 2.4, 4.8]) {
    weld([x, FLOOR_Y + 0.001, -IN_W + 0.01], [x, FLOOR_Y + 0.001, IN_W - 0.01], 0.004, { parent: g });
  }
  // spoiny pachwinowe podłoga – ściany boczne i czołowe
  for (const s of [1, -1]) {
    weld([-IN_L + 0.01, FLOOR_Y + 0.003, s * (IN_W - 0.004)], [IN_L - 0.01, FLOOR_Y + 0.003, s * (IN_W - 0.004)], 0.005, { parent: g });
    weld([s * (IN_L - 0.004), FLOOR_Y + 0.003, -IN_W + 0.01], [s * (IN_L - 0.004), FLOOR_Y + 0.003, IN_W - 0.01], 0.005, { parent: g });
  }
  // podłużnice usztywniające pod blachą (między poprzecznicami)
  merged([-0.7, 0.7].map((z) => boxGeom(2 * IN_L - 0.1, 0.05, 0.06, [0, FLOOR_Y - FLOOR_T - 0.025, z])), M.paintBody, { parent: g });
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

  // poszycie: trzy pola na pełną wysokość + nadproża nad otworami drzwiowymi
  const sheets = PANELS.map(([a, b]) => boxGeom(b - a, yt - yb, SHEET, [(a + b) / 2, (yb + yt) / 2, (z0 + z1) / 2], 0.0015));
  for (const s of [1, -1]) sheets.push(boxGeom(DOOR_W, yt - DOOR_TOP, SHEET, [s * DOOR_X, (DOOR_TOP + yt) / 2, (z0 + z1) / 2], 0.0015));
  merged(sheets, P, { parent: g });

  // słupki pośrednie (profil kapeluszowy, na zewnątrz poszycia)
  const posts = PANELS.flatMap(panelPosts);
  merged(posts.flatMap((x) => hatV(x, yb, yt, z1)), P, { parent: g });
  for (const x of posts) weld([x - 0.05, yb + 0.005, z1 + 0.004], [x + 0.05, yb + 0.005, z1 + 0.004], 0.004, { parent: g });

  // słupki drzwiowe (cięższe, zamknięte) po obu stronach każdego otworu
  const doorPosts = [-D1 - 0.06, -D0 + 0.06, D0 - 0.06, D1 + 0.06];
  merged(doorPosts.map((x) => boxGeom(0.12, yt - yb, 0.09, [x, (yb + yt) / 2, z1 + 0.045], 0.008)), P, { parent: g });
  for (const x of doorPosts) for (const sx of [-1, 1]) {
    weld([x + sx * 0.062, yb + 0.02, z1 + 0.004], [x + sx * 0.062, yt - 0.02, z1 + 0.004], 0.004, { parent: g });
  }
  // nadproże: poziomy profil kapeluszowy nad każdym otworem (między słupkami drzwiowymi)
  merged([1, -1].flatMap((s) => hatH(s * DOOR_X - DOOR_W / 2, s * DOOR_X + DOOR_W / 2, DOOR_TOP + 0.05, z1, 0.08, 0.05)), P, { parent: g });
  // listwa dolna (kątownik wzdłuż dolnej krawędzi pól ściany)
  merged(PANELS.map(([a, b]) => boxGeom(b - a, 0.07, 0.03, [(a + b) / 2, yb + 0.035, z1 + 0.015], 0.004)), P, { parent: g });
  // pierścienie do mocowania ładunku: zewnętrzne na listwie dolnej, wewnętrzne ok. 200 mm nad podłogą (DB Cargo Eanos-x 056)
  const rings = [-6.2, -4.7, -0.7, 0.7, 4.7, 6.2]; // położenie wzdłuż – SZACUNKOWE
  for (const x of rings) {
    box(0.05, 0.04, 0.05, M.steelRaw, { pos: [x, yb + 0.02, z1 + 0.055], r: 0.006, parent: g });
    const ring = new THREE.TorusGeometry(0.035, 0.007, 8, 20);
    mesh(ring, M.steelRaw, { pos: [x, FLOOR_Y + 0.2, z0 - 0.042], rot: [0, Math.PI / 2, 0], parent: g });
    box(0.05, 0.03, 0.012, M.steelRaw, { pos: [x, FLOOR_Y + 0.235, z0 - 0.006], r: 0.004, parent: g });
  }
  return g;
}

// Drzwi dwuskrzydłowe (para). Początek: środek otworu na wysokości podłogi, na licu poszycia.
export function buildDoors() {
  const g = part('drzwi');
  const q = DOOR_W / 4;
  slot(g, 'skrzydlo_1', { pos: [q, 0, 0], explode: [0.25, 0, 0.25], remove: [0.35, 0, 1.1] });
  slot(g, 'skrzydlo_2', { pos: [-q, 0, 0], explode: [-0.25, 0, 0.25], remove: [-0.35, 0, 1.1] });
  // zaczepy rygli w podłodze i w nadprożu (wspólne dla pary)
  for (const y of [0.012, DOOR_H + 0.03]) box(0.08, 0.025, 0.06, M.steelRaw, { pos: [0, y, 0.07], r: 0.005, parent: g });
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
    ...[0.08, 0.65, 1.2, h - 0.08].flatMap((y) => hatH(-w / 2 + 0.08, w / 2 - 0.08, y0 + y, t)),
  ], P, { parent: g });
  // zawiasy: 3 okucia na krawędzi zewnętrznej + sworznie
  const xh = s * (w / 2 + 0.03);
  for (const y of [0.25, 0.95, h - 0.25]) {
    box(0.22, 0.07, 0.014, M.steelRaw, { pos: [s * (w / 2 - 0.08), y0 + y, t + 0.052], r: 0.004, parent: g });
    cylinder(0.022, 0.1, M.steelRaw, { pos: [xh, y0 + y, t + 0.05], parent: g });
    cylinder(0.012, 0.13, M.steelMachined, { pos: [xh, y0 + y, t + 0.05], parent: g });
    bolts([-0.06, 0.02].map((dx) => ({ pos: [s * (w / 2 - 0.08) + s * dx, y0 + y, t + 0.059], dir: [0, 0, 1] })), 0.014, M.bolt, { parent: g });
  }
  // zamknięcie: pionowy rygiel przy krawędzi wewnętrznej z dźwignią
  const xl = -s * (w / 2 - 0.1);
  cylinder(0.016, h + 0.02, M.steelRaw, { pos: [xl, y0 + h / 2, t + 0.07], seg: 12, parent: g });
  for (const y of [0.15, 0.9, h - 0.15]) box(0.06, 0.05, 0.04, M.steelRaw, { pos: [xl, y0 + y, t + 0.05], r: 0.005, parent: g });
  box(0.04, 0.35, 0.025, M.steelRaw, { pos: [xl - s * 0.04, y0 + 1.0, t + 0.095], rot: [0, 0, s * 0.35], r: 0.006, parent: g });
  rivets([0.15, 0.9, h - 0.15].flatMap((y) => [[xl - 0.02, y0 + y - 0.035, t], [xl + 0.02, y0 + y - 0.035, t]]).map((pos) => ({ pos, dir: [0, 0, 1] })), 0.008, M.bolt, { parent: g });
  return g;
}

// Ściana czołowa (dla końca +x; druga obrócona o 180°). Stała, spawana.
// param.hamulec_reczny = true: wsporniki koła i wałka hamulca ręcznego (na końcu 2, lokalnie z = +0,5).
export function buildEndWall(node) {
  const g = part('sciana_czolowa');
  const P = M.paintBody;
  const x0 = IN_L, x1 = IN_L + SHEET, xo = END_XO;
  const yb = FLOOR_Y - 0.01;
  const hTop = CHORD[1];
  // poszycie
  boxFromTo([x0, x1], [yb, hTop], [-IN_W - SHEET, IN_W + SHEET], P, { r: 0.0015, parent: g });
  // użebrowanie: pionowe profile kapeluszowe (płaszczyzna YZ) i dwa poziome
  const d = xo - x1;
  const ribsZ = [-0.95, -0.35, 0.35, 0.95];
  const yr1 = CHORD[0] - 0.01;
  const vert = ribsZ.map((z) => boxGeom(0.006, yr1 - yb, 0.1, [xo - 0.003, (yb + yr1) / 2, z]));
  const vertSides = ribsZ.flatMap((z) => [-1, 1].map((sz) => boxGeom(d - 0.006, yr1 - yb, 0.005, [x1 + (d - 0.006) / 2, (yb + yr1) / 2, z + sz * 0.048])));
  const horiz = [FLOOR_Y + 0.7, FLOOR_Y + 1.45].flatMap((y) => [
    boxGeom(0.006, 0.08, 2 * IN_W - 0.1, [x1 + d * 0.7, y, 0]),
    boxGeom(d * 0.7, 0.005, 2 * IN_W - 0.1, [x1 + d * 0.35, y + 0.038, 0]),
    boxGeom(d * 0.7, 0.005, 2 * IN_W - 0.1, [x1 + d * 0.35, y - 0.038, 0]),
  ]);
  merged([...vert, ...vertSides, ...horiz], P, { parent: g });
  // kątownik dolny – zamyka użebrowanie od spodu nad belką czołową
  boxFromTo([x1, xo], [yb, yb + 0.008], [-IN_W, IN_W], P, { r: 0.002, parent: g });
  boxFromTo([xo - 0.008, xo], [yb, yb + 0.045], [-IN_W, IN_W], P, { r: 0.002, parent: g });
  // rama górna ściany czołowej (profil zamknięty)
  boxFromTo([x0 - 0.05, xo], [CHORD[0], hTop], [-IN_W - 0.02, IN_W + 0.02], P, { r: 0.012, parent: g });
  // słupki narożne (kątowniki) – łączą ścianę czołową z bocznymi
  for (const s of [1, -1]) {
    const zr = sorted(s * (IN_W + SHEET), s * (IN_W + 0.1));
    boxFromTo([x0 - 0.12, xo], [yb, hTop], zr, P, { r: 0.01, parent: g });
    weld([x0 - 0.12, yb + 0.02, s * (IN_W + 0.1)], [x0 - 0.12, CHORD[0] - 0.02, s * (IN_W + 0.1)], 0.005, { parent: g });
  }
  // spoiny żeber z poszyciem i poszycia z ramą górną
  for (const z of ribsZ) for (const sz of [-1, 1]) weld([x1 + 0.003, yb + 0.02, z + sz * 0.052], [x1 + 0.003, yr1 - 0.02, z + sz * 0.052], 0.003, { parent: g });
  weld([x1 + 0.003, CHORD[0] - 0.003, -IN_W], [x1 + 0.003, CHORD[0] - 0.003, IN_W], 0.004, { parent: g });
  // wsporniki hamulca ręcznego (koło na wysokości ok. 1,75 m – SZACUNKOWE, zob. "uklad.hb" w data/eanos.json)
  if (node?.param?.hamulec_reczny) {
    boxFromTo([x1, xo - 0.025], [1.27, 1.53], [0.47, 0.53], M.paintDark, { r: 0.004, parent: g });
    boxFromTo([x1, xo + 0.006], [1.72, 1.84], [0.44, 0.56], M.paintDark, { r: 0.006, parent: g });
  }
  return g;
}

// Pas górny (dla strony +z; drugi obrócony o 180°): ciągły profil zamknięty z hakami pod spodem
export function buildTopChord() {
  const g = part('pas_gorny');
  const P = M.paintBody;
  const zr = [IN_W - 0.02, IN_W + 0.1];
  boxFromTo([-IN_L + 0.05, IN_L - 0.05], CHORD, zr, P, { r: 0.015, parent: g });
  weld([-IN_L + 0.06, CHORD[0], IN_W + SHEET + 0.003], [IN_L - 0.06, CHORD[0], IN_W + SHEET + 0.003], 0.005, { parent: g });
  for (const s of [1, -1]) box(0.008, CHORD[1] - CHORD[0] - 0.01, zr[1] - zr[0] - 0.01, P, { pos: [s * (IN_L - 0.046), (CHORD[0] + CHORD[1]) / 2, (zr[0] + zr[1]) / 2], parent: g });
  // haki do mocowania plandeki / lin pod pasem górnym (10 na stronę)
  for (const x of hookXs()) {
    box(0.07, 0.012, 0.05, M.steelRaw, { pos: [x, CHORD[0] - 0.006, IN_W + 0.075], r: 0.003, parent: g });
    const hook = new THREE.TorusGeometry(0.022, 0.007, 8, 16, Math.PI * 1.3);
    mesh(hook, M.steelRaw, { pos: [x, CHORD[0] - 0.034, IN_W + 0.085], rot: [0, Math.PI / 2, Math.PI * 0.85], parent: g });
  }
  return g;
}

// ======================= OSTOJA =======================
// Wysokości ostoi (SZACUNKOWE): spód ostojnicy 0,92 m, góra = spód blachy podłogi.
const UF_TOP = FLOOR_Y - FLOOR_T;
const SOLE_Z = IN_W;          // zewnętrzna ściana ostojnicy pod poszyciem ściany bocznej
const SOLE_Y = 0.92;          // spód ostojnicy (SZACUNKOWE)
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
  const y0 = SOLE_Y, t = 0.012, fl = 0.1;
  const zw = [SOLE_Z - t, SOLE_Z];
  boxFromTo([-HEAD_X, HEAD_X], [y0, UF_TOP], zw, P, { r: 0.004, parent: g });
  boxFromTo([-HEAD_X, HEAD_X], [y0, y0 + t], [SOLE_Z - fl, SOLE_Z], P, { r: 0.004, parent: g });
  boxFromTo([-HEAD_X, HEAD_X], [UF_TOP - t, UF_TOP], [SOLE_Z - fl, SOLE_Z], P, { r: 0.004, parent: g });
  // żebra (przepony) wewnątrz ceownika – co ok. 1 m
  const ribs = [];
  for (let x = -HEAD_X + 0.5; x < HEAD_X - 0.3; x += 1.0) ribs.push(boxGeom(0.01, UF_TOP - y0 - 2 * t, fl - t, [x, (y0 + UF_TOP) / 2, SOLE_Z - t - (fl - t) / 2]));
  merged(ribs, P, { parent: g });
  weld([-HEAD_X, UF_TOP - 0.004, SOLE_Z - fl - 0.003], [HEAD_X, UF_TOP - 0.004, SOLE_Z - fl - 0.003], 0.005, { parent: g });
  // uchwyty do podnoszenia wagonu przy belkach skrętowych (SZACUNKOWE)
  for (const sx of [1, -1]) box(0.3, 0.06, 0.04, M.paintDark, { pos: [sx * (PIVOT_X + 0.35), y0 + 0.03, SOLE_Z + 0.02], r: 0.006, parent: g });
  // tabliczki napisów na ostojnicy (miejsca na oznakowanie – SZACUNKOWE)
  for (const sx of [1, -1]) box(0.9, 0.18, 0.004, M.paintDark, { pos: [sx * 3.3, (y0 + UF_TOP) / 2, SOLE_Z + 0.002], r: 0.001, parent: g });
  return g;
}

// Belka czołowa (dla końca +x): blacha czołowa z półkami, nakładki pod zderzaki, otwór haka.
// param.hamulec_reczny = true: wspornik przekładni hamulca ręcznego (lokalnie z = +0,5).
export function buildHeadstock(node) {
  const g = part('belka_czolowa');
  const P = M.paintBody;
  const y0 = 0.84, t = 0.012, xf = HALF_LEN - 0.012;
  const zr = [-(SOLE_Z + 0.04), SOLE_Z + 0.04];
  boxFromTo([xf - t, xf], [y0, UF_TOP], zr, P, { r: 0.004, parent: g });            // blacha czołowa
  boxFromTo([HEAD_X, xf - t], [UF_TOP - t, UF_TOP], zr, P, { r: 0.004, parent: g }); // półka górna
  boxFromTo([HEAD_X, xf - t], [y0, y0 + t], zr, P, { r: 0.004, parent: g });         // półka dolna
  boxFromTo([HEAD_X, HEAD_X + t], [y0, UF_TOP], zr, P, { r: 0.004, parent: g });     // ścianka tylna
  for (const s of [1, -1]) {
    // nakładki wzmacniające pod zderzaki
    boxFromTo([xf, HALF_LEN], [BUF_Y - 0.19, Math.min(BUF_Y + 0.19, UF_TOP)], [s * BUF_Z - 0.2, s * BUF_Z + 0.2], P, { r: 0.004, parent: g });
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
  box(0.006, hy[1] - hy[0], 2 * hz, M.rubber, { pos: [xf + 0.001, BUF_Y, 0], r: 0.002, parent: g });
  // spoiny belka czołowa – ostojnice
  for (const s of [1, -1]) weld([HEAD_X, y0 + 0.01, s * (SOLE_Z - 0.006)], [HEAD_X, UF_TOP - 0.01, s * (SOLE_Z - 0.006)], 0.006, { parent: g });
  // spoina pozioma blachy czołowej z półką górną
  weld([xf + 0.002, UF_TOP - 0.004, zr[0] + 0.02], [xf + 0.002, UF_TOP - 0.004, zr[1] - 0.02], 0.004, { parent: g });
  if (node?.param?.hamulec_reczny) {
    boxFromTo([HALF_LEN, HALF_LEN + 0.039], [0.92, 1.08], [0.44, 0.56], M.paintDark, { r: 0.004, parent: g });
  }
  return g;
}

// Belka skrętowa: belka skrzynkowa w poprzek wagonu, nad wózkiem. Początek: oś czopa skrętu.
// Spód płaski w środku (czop, przeciwślizgi) – na tej samej wysokości co w Eaos (ten sam wózek Y25),
// przy ostojnicach podniesiony.
export function buildBolster() {
  const g = part('belka_skretowa');
  const P = M.paintBody;
  slot(g, 'czop_skretu', { pos: [0, 0.865, 0], explode: [0, -0.35, 0] });
  // Belka jest skrzynkowa (pusta w środku): dwa środniki z blachy + pas dolny (płaski w środku,
  // skośny przy ostojnicach) + pas górny pod podłogą. Wewnątrz przechodzą wieszaki przewodu głównego.
  const zc = 0.95, ze = SOLE_Z - 0.012, yb = 0.95, ye = 1.06, t = 0.012, hw = 0.18;
  const prism = (pts, depth, x0) => {
    const sh = new THREE.Shape();
    sh.moveTo(...pts[0]);
    for (const q of pts.slice(1)) sh.lineTo(...q);
    sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
    geo.rotateY(Math.PI / 2); // kształt w płaszczyźnie ZY (x kształtu = −z), grubość wzdłuż X
    geo.translate(x0, 0, 0);
    return geo;
  };
  // środniki (pełny obrys belki, grubość t)
  const outline = [[-ze, UF_TOP], [ze, UF_TOP], [ze, ye], [zc, yb], [-zc, yb], [-ze, ye]];
  // pas dolny: płaski środek i dwa skosy
  const bottom = [
    prism([[-zc, yb], [zc, yb], [zc, yb + t], [-zc, yb + t]], 2 * hw, -hw),
    prism([[zc, yb], [ze, ye], [ze, ye + t], [zc, yb + t]], 2 * hw, -hw),
    prism([[-zc, yb + t], [-ze, ye + t], [-ze, ye], [-zc, yb]], 2 * hw, -hw),
  ];
  merged([
    prism(outline, t, -hw), prism(outline, t, hw - t), ...bottom,
    boxGeom(2 * hw, t, 2 * ze, [0, UF_TOP - t / 2, 0]),           // pas górny
  ].map((q) => (q.index ? q.toNonIndexed() : q)), P, { parent: g });
  // przeciwślizgi nad ślizgami bocznymi wózka
  for (const z of [0.82, -0.82]) {
    box(0.2, 0.13, 0.12, M.paintBody, { pos: [0, 0.88, z], r: 0.008, parent: g });
    box(0.18, 0.012, 0.1, M.steelMachined, { pos: [0, 0.809, z], r: 0.002, parent: g });
    bolts([-0.07, 0.07].map((dx) => ({ pos: [dx, 0.946, z + 0.065], dir: [0, 0, 1] })), 0.016, M.bolt, { parent: g });
  }
  // żebra pionowe na ściankach belki (użebrowanie)
  merged([-0.5, 0.5].flatMap((z) => [-1, 1].map((sx) => boxGeom(0.012, UF_TOP - yb - 0.02, 0.08, [sx * 0.192, (yb + UF_TOP) / 2, z]))), P, { parent: g });
  for (const s of [1, -1]) for (const dx of [-0.186, 0.186]) weld([dx, ye, s * (ze - 0.004)], [dx, UF_TOP - 0.01, s * (ze - 0.004)], 0.006, { parent: g });
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
  const xs = [-4.2, -3.3, -2.0, -0.7, 0.7, 2.0, 3.3, 4.2, -6.4, 6.4];
  const geoms = [];
  const y0 = 1.05;
  for (const x of xs) for (const s of [1, -1]) {
    const zc = s * (0.14 + SOLE_Z - 0.012) / 2, len = SOLE_Z - 0.012 - 0.14;
    geoms.push(boxGeom(0.008, UF_TOP - y0, len, [x, (y0 + UF_TOP) / 2, zc]));   // środnik
    geoms.push(boxGeom(0.1, 0.01, len, [x, y0 + 0.005, zc]));                   // półka dolna
    geoms.push(boxGeom(0.1, 0.01, len, [x, UF_TOP - 0.005, zc]));               // półka górna
  }
  merged(geoms, M.paintBody, { parent: g });
  return g;
}

// Wszystkie buildery, których potrzebuje Eanos (wagon + wspólne podzespoły)
export const builders = {
  ...y25Builders,
  ...drawGearBuilders,
  ...airBrakeBuilders,
  ...underframeBuilders,
  eanos: buildEanos,
  ostoja_eanos: buildUnderframe,
  pudlo_eanos: buildBody,
  podloga_eanos: buildFloor,
  sciana_boczna_eanos: buildSideWall,
  drzwi_eanos: buildDoors,
  skrzydlo_drzwi_eanos: buildDoorLeaf,
  sciana_czolowa_eanos: buildEndWall,
  pas_gorny_eanos: buildTopChord,
  ostojnica_eanos: buildSoleBar,
  belka_czolowa_eanos: buildHeadstock,
  belka_skretowa_eanos: buildBolster,
  belka_srodkowa_eanos: buildCenterSill,
  poprzecznice_eanos: buildCrossBearers,
};
