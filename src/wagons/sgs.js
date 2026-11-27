// Wagon Sgs (czteroosiowa platforma do przewozu kontenerów) – podłoga, ostoja, zaczepy kontenerowe
// i rozmieszczenie wspólnych podzespołów.
// Układ: x wzdłuż wagonu (0 = środek), y w górę (0 = główka szyny), z w poprzek.
//
// Wymiary ze źródeł (zob. pole "zrodla" w data/sgs.json):
//   PKP Cargo – katalog wagonów, Sgs typ 412Z: długość ze zderzakami 19 900 mm, rozstaw czopów
//   skrętu 14 600 mm, długość ładunkowa 18 660 mm, szerokość ładunkowa 2 740 mm, maks. szerokość
//   wagonu 2 940 mm, wysokość podłogi (= wysokość wagonu) 1 251 mm nad główką szyny,
//   24 trzpienie (zaczepy) do kontenerów, podłoga drewniana, bez kłonic.
//   Lica belek czołowych: 19 900 − 2 × 620 mm (długość zderzaka jak w Eaos, SZACUNKOWA) = 18 660 mm,
//   czyli tyle samo, ile długość ładunkowa z katalogu – podłoga sięga do lic belek czołowych.
//   William Cook Intermodal – broszura (tabela wymiarów kontenerów ISO): rozstaw naroży wzdłuż
//   (środki otworów) 20' – 5 853 mm, 30' – 8 918 mm, 40' – 11 985 mm; długości 6 058 / 9 125 /
//   12 192 mm (stąd odstęp 76 mm między dwoma 20' w miejscu jednego 40').
// Rozmieszczenie zaczepów (ZACZEPY_X) wyliczone z tych wymiarów dla układów 3 × 20', 2 × 30',
// 1 × 40' (45'), 2 × 20' w środku oraz 40' + 20' – katalog nie podaje rozmieszczenia (SZACUNKOWE).
// Pozostałe wymiary (profile ostoi, wysokości, rozstaw poprzecznic) – SZACUNKOWE, do sprawdzenia.
import { THREE, M, part, slot, mesh, box, boxFromTo, merged, boxGeom, cylinder, rod, rodGeom, bolts, rivets, weld } from '../lib/geom.js';
import { y25Builders } from '../components/y25/index.js';
import { drawGearBuilders } from '../components/ciegla_zderzaki/index.js';
import { airBrakeBuilders } from '../components/hamulec/index.js';
import { underframeBuilders } from '../components/ostoja/index.js';
import { cargoBuilders } from '../components/ladunek/index.js';
import { cfg as brakeCfg, layout as brakeLayout } from '../components/hamulec/config.js';

export const PIVOT_X = 7.3;     // pół rozstawu czopów skrętu (14 600 / 2, PKP Cargo)
export const HALF_LEN = 9.33;   // lico belki czołowej (18 660 / 2 – patrz nagłówek)
export const FLOOR_Y = 1.251;   // góra podłogi (PKP Cargo: 1 251 mm)
const DECK_Z = 1.37;            // pół szerokości ładunkowej (2 740 / 2, PKP Cargo)
export const BUF_Y = 1.03;      // oś zderzaków (SZACUNKOWE, jak Eaos; UIC 528: maks. 1065 mm wagon próżny)
const UF_TOP = 1.19;            // góra ostoi = spód desek podłogi (deski 61 mm – SZACUNKOWE)
const SOLE_Z = 1.29;            // zewnętrzna ściana środnika ostojnicy (SZACUNKOWE)
const SOLE_T = 0.012;           // grubość środnika ostojnicy (SZACUNKOWE)
const FLANGE_IN = 1.18;         // wewnętrzna krawędź półek ostojnicy (SZACUNKOWE)
export const HEAD_X = HALF_LEN - 0.16; // wewnętrzna ściana belki czołowej (SZACUNKOWE)
const STRINGER_Z = 0.62;        // podłużnice pod podłogą (SZACUNKOWE)
const MOUNT_Y = 1.05;           // spód poprzecznic i podłużnic (tu wiszą elementy hamulca)
const CROSS_X = [-4.5, -1.5, 1.5, 4.5]; // poprzecznice zwykłe (SZACUNKOWE)

// Zaczepy kontenerowe. Rozstaw poprzeczny naroży 2 259 mm – SZACUNKOWE (wartość z ISO 1161,
// nie potwierdzona w dostępnym źródle). Płyta oporowa zaczepu na poziomie podłogi (SZACUNKOWE:
// katalog podaje wysokość wagonu = wysokość podłogi, więc nic poza czopami nie wystaje ponad podłogę).
const SPIG_Z = 2.259 / 2;
const SPIG_Y = FLOOR_Y;
const C20 = (6.058 - 5.853) / 2;  // od końca kontenera 20' do środka otworu naroża
const GAP = 12.192 - 2 * 6.058;   // odstęp dwóch 20' w miejscu 40' (76 mm)
const X_MID20 = 5.853 / 2;                    // 20' w środku (układ 3 × 20')
const X_OUT20 = 6.058 / 2 + GAP + C20;        // wewnętrzne naroża skrajnych 20' (3 × 20')
const X_END = X_OUT20 + 5.853;                // skrajne naroża (3 × 20', 2 × 30', 40' + 20')
const X_CEN = X_END - 8.918;                  // wewnętrzne naroża 2 × 30' (≈ 2 × 20' w środku)
const X_40 = 11.985 / 2;                      // naroża 40' / 45' (= skrajne naroża 2 × 20' w środku)
// Położenia wzdłuż wagonu (od końca 1 do końca 2); zaczepy skrajne – stałe, pozostałe – składane
// (składane są tam, gdzie przy innym układzie stoi kontener). Kolejność musi się zgadzać z data/sgs.json.
const XS = [X_END, X_40, X_OUT20, X_MID20, X_CEN];
export const ZACZEPY_X = [...XS, ...XS.slice().reverse().map((x) => -x)];
const isFixed = (x) => Math.abs(x) > X_END - 0.01;
const FOLD_X = ZACZEPY_X.filter((x) => !isFixed(x));
const HOLE = 0.15;  // pół długości otworu w podłodze wokół zaczepu (SZACUNKOWE)
const STRIP = 0.2;  // pół szerokości stalowej listwy podłogi przy zaczepie (SZACUNKOWE)
const HOLE_Z = 0.9; // otwór w podłodze od z = 0,9 m na zewnątrz (SZACUNKOWE)

// Ostojnica rybia (fish-belly): spód 0,95 m nad wózkami, 0,72 m w środku (SZACUNKOWE, wg rysunku PKP Cargo)
const BELLY = { yEnd: 0.95, yMid: 0.72, x0: 3.8, x1: 5.5 };
function soleBottom(x) {
  const a = Math.abs(x);
  if (a >= BELLY.x1) return BELLY.yEnd;
  if (a <= BELLY.x0) return BELLY.yMid;
  const t = (a - BELLY.x0) / (BELLY.x1 - BELLY.x0);
  return BELLY.yMid + (BELLY.yEnd - BELLY.yMid) * (1 - Math.cos(t * Math.PI)) / 2;
}

const sorted = (a, b) => (a < b ? [a, b] : [b, a]);
// Scala przedziały [a, b] (np. wycięcia przy sąsiednich zaczepach)
function mergeRanges(list) {
  const r = list.map((p) => [...p]).sort((p, q) => p[0] - q[0]);
  const out = [];
  for (const p of r) {
    if (out.length && p[0] <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], p[1]);
    else out.push(p);
  }
  return out;
}
// Odcinki [a, b] pomniejszone o wycięcia
function subtractRanges([a, b], cuts) {
  const out = [];
  let x = a;
  for (const [c0, c1] of mergeRanges(cuts)) {
    if (c1 <= x || c0 >= b) continue;
    if (c0 > x) out.push([x, c0]);
    x = Math.max(x, c1);
  }
  if (x < b) out.push([x, b]);
  return out.filter(([p, q]) => q - p > 0.005);
}
// wycięcia w półkach ostojnicy przy wszystkich zaczepach
const SPIG_CUTS = ZACZEPY_X.map((x) => [x - 0.16, x + 0.16]);

// ---------- Pomocnicze bryły ----------

// Płaska blacha o obrysie 2D (z otworami) wyciągnięta na grubość w0..w1 i przeniesiona do 3D
function plateGeom(outline, w0, w1, map, holes = []) {
  const sh = new THREE.Shape(outline.map(([u, v]) => new THREE.Vector2(u, v)));
  for (const [u, v, r] of holes) {
    const h = new THREE.Path();
    h.absarc(u, v, r, 0, Math.PI * 2, true);
    sh.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth: w1 - w0, bevelEnabled: false, curveSegments: 16 });
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = map(p.getX(i), p.getY(i), p.getZ(i) + w0);
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

// Belka prostokątna między punktami a i b (przekrój w × d)
function beamGeom(a, b, w, d) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const g = new THREE.BoxGeometry(w, A.distanceTo(B), d);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
  const m = A.add(B).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g;
}

// ======================= WAGON =======================

export function buildSgs() {
  const g = part('sgs');
  slot(g, 'podloga', { explode: [0, 1.3, 0] });
  slot(g, 'ostoja', { explode: [0, 0.5, 0] });
  slot(g, 'zaczepy', { explode: [0, 2.2, 0] });
  slot(g, 'wozek_1', { pos: [PIVOT_X, 0, 0], explode: [1.8, 0, 0] });
  slot(g, 'wozek_2', { pos: [-PIVOT_X, 0, 0], rot: [0, Math.PI, 0], explode: [-1.8, 0, 0] });
  slot(g, 'ciegla_zderzaki_1', { pos: [HALF_LEN, BUF_Y, 0], explode: [2.6, 0, 0] });
  slot(g, 'ciegla_zderzaki_2', { pos: [-HALF_LEN, BUF_Y, 0], rot: [0, Math.PI, 0], explode: [-2.6, 0, 0] });
  // hamulec zespolony – układ elementów przesunięty przez "uklad" w data/sgs.json
  slot(g, 'hamulec', { explode: [0, -0.25, 0] });
  return g;
}

// ======================= PODŁOGA =======================

// Listwy stalowe przy zaczepach: przedziały wzdłuż x (sąsiednie zaczepy dzielą listwę)
function stripRanges() {
  return mergeRanges(ZACZEPY_X.map((x) => [x - STRIP, x + STRIP]))
    // listwa przy skrajnym zaczepie sięga do lica belki czołowej
    .map(([a, b]) => [a < -(HALF_LEN - 0.3) ? -(HALF_LEN - 0.003) : a, b > HALF_LEN - 0.3 ? HALF_LEN - 0.003 : b]);
}

// Podłoga drewniana: deski poprzeczne na ostojnicach, podłużnicach i belce środkowej,
// przy zaczepach stalowe listwy z otworami na głowice zaczepów, na brzegach listwy obrzeża.
export function buildFloor() {
  const g = part('podloga');
  const strips = stripRanges();
  const bays = subtractRanges([-(HALF_LEN - 0.003), HALF_LEN - 0.003], strips);
  const t = FLOOR_Y - UF_TOP;
  const boards = [[], []];
  const heads = [];
  let k = 0;
  for (const [a, b] of bays) {
    const n = Math.max(1, Math.round((b - a) / 0.15));   // deska ok. 150 mm (SZACUNKOWE)
    const p = (b - a) / n;
    for (let i = 0; i < n; i++) {
      const xc = a + (i + 0.5) * p;
      boards[k++ % 3 === 0 ? 1 : 0].push(boxGeom(p - 0.006, t, 2 * DECK_Z, [xc, (UF_TOP + FLOOR_Y) / 2, 0], 0.004));
      // łby śrub zamkowych nad ostojnicami, podłużnicami i belką środkową
      for (const z of [SOLE_Z - 0.06, STRINGER_Z, 0.17]) for (const s of [1, -1]) heads.push({ pos: [xc, FLOOR_Y, s * z], dir: [0, 1, 0] });
    }
    // listwa obrzeża (płaskownik na czołach desek)
    for (const s of [1, -1]) box(b - a, t, 0.006, M.paintDark, { pos: [(a + b) / 2, (UF_TOP + FLOOR_Y) / 2, s * (DECK_Z + 0.003)], r: 0.002, parent: g });
  }
  merged(boards[0], M.wood, { parent: g });
  merged(boards[1], M.woodWorn, { parent: g });
  rivets(heads, 0.011, M.bolt, { parent: g });

  // listwy stalowe przy zaczepach (profil zamknięty na wysokość desek) z otworami na zaczepy
  const steel = [];
  const strHeads = [];
  for (const [a, b] of strips) {
    steel.push(boxGeom(b - a, t, 2 * HOLE_Z, [(a + b) / 2, (UF_TOP + FLOOR_Y) / 2, 0], 0.004));
    const holes = ZACZEPY_X.filter((x) => x > a && x < b).map((x) => [x - HOLE, x + HOLE]);
    for (const [c, d] of subtractRanges([a, b], holes)) {
      for (const s of [1, -1]) steel.push(boxGeom(d - c, t, DECK_Z - HOLE_Z, [(c + d) / 2, (UF_TOP + FLOOR_Y) / 2, s * (HOLE_Z + DECK_Z) / 2], 0.004));
    }
    for (const x of [a + 0.04, b - 0.04]) for (const z of [-0.6, -0.2, 0.2, 0.6]) strHeads.push({ pos: [x, FLOOR_Y, z], dir: [0, 1, 0] });
  }
  merged(steel, M.paintDark, { parent: g });
  rivets(strHeads, 0.012, M.bolt, { parent: g });
  return g;
}

// ======================= OSTOJA =======================
const CORNERS = { 1: [1, 1], 2: [1, -1], 3: [-1, 1], 4: [-1, -1] }; // nr narożnika → [sx, sz]

export function buildUnderframe() {
  const g = part('ostoja');
  slot(g, 'ostojnica_1', { explode: [0, 0, 0.7] });
  slot(g, 'ostojnica_2', { rot: [0, Math.PI, 0], explode: [0, 0, -0.7] });
  slot(g, 'belka_czolowa_1', { explode: [0.8, 0, 0] });
  slot(g, 'belka_czolowa_2', { rot: [0, Math.PI, 0], explode: [-0.8, 0, 0] });
  slot(g, 'belka_skretowa_1', { pos: [PIVOT_X, 0, 0], explode: [0, -0.45, 0] });
  slot(g, 'belka_skretowa_2', { pos: [-PIVOT_X, 0, 0], rot: [0, Math.PI, 0], explode: [0, -0.45, 0] });
  slot(g, 'belka_srodkowa', { explode: [0, -0.3, 0] });
  slot(g, 'poprzecznice', { explode: [0, 0.35, 0] });
  slot(g, 'poprzecznice_zaczepow', { explode: [0, 0.6, 0] });
  slot(g, 'podluznice', { explode: [0, 0.2, 0] });
  slot(g, 'oslony_przeciwiskrowe', { explode: [0, -0.35, 0] });
  for (const [n, [sx, sz]] of Object.entries(CORNERS)) {
    slot(g, `stopien_manewrowy_${n}`, { explode: [sx * 0.3, -0.25, sz * 0.5] });
    slot(g, `porecz_manewrowa_${n}`, { explode: [sx * 0.5, 0.2, sz * 0.4] });
  }
  return g;
}

// Otwory w środniku ostojnicy na cięgła hamulca wyprowadzone na bok wagonu (dźwignia przestawiacza
// próżny/ładowny, cięgło luzownika). Położenia brane z parametrów hamulca (węzeł "hamulec").
function brakeHoles(node, side) {
  let root = node;
  while (root.parent) root = root.parent;
  const ham = root.children?.find((c) => c.id === 'hamulec');
  if (!ham) return [];
  const lay = brakeLayout(brakeCfg(ham));
  const pts = [[lay.release[0] + 0.06, 0.835]];               // cięgło luzownika – na oba boki
  if (side > 0) pts.push([lay.loadValve[0], lay.loadValve[1]]); // dźwignia przestawiacza – strona 1
  // w układzie ostojnicy strona 2 jest obrócona o 180° (x → −x)
  return pts.map(([x, y]) => [side * x, y, 0.03]).filter(([x, y]) => y > soleBottom(x) + 0.05 && y < UF_TOP - 0.05);
}

// Ostojnica (strona +z): rybia blachownica – środnik o zmiennej wysokości, półka dolna wzdłuż
// krzywizny, półka górna wysunięta na zewnątrz pod brzeg podłogi (z kątownikiem obrzeża).
// Przy zaczepach składanych wycięcie w środniku na ucha zawiasu, przy wszystkich zaczepach
// przerwa w półce górnej i przekładka między wspornikiem zaczepu a środnikiem.
export function buildSoleBar(node) {
  const g = part('ostojnica');
  const P = M.paintBody;
  const side = node.id === 'ostojnica_2' ? -1 : 1;
  const notches = mergeRanges(FOLD_X.map((x) => [x - 0.16, x + 0.16]));
  const NOTCH_Y = 1.12;
  // obrys środnika w płaszczyźnie (x, y)
  const outline = [[-HEAD_X, soleBottom(-HEAD_X)], [-HEAD_X, UF_TOP]];
  for (const [a, b] of notches) outline.push([a, UF_TOP], [a, NOTCH_Y], [b, NOTCH_Y], [b, UF_TOP]);
  outline.push([HEAD_X, UF_TOP]);
  for (let x = HEAD_X; x > -HEAD_X; x -= 0.25) outline.push([x, soleBottom(x)]);
  mesh(plateGeom(outline, SOLE_Z - SOLE_T, SOLE_Z, (u, v, w) => [u, v, w], brakeHoles(node, side)), P, { parent: g });
  // półka dolna wzdłuż spodu (odcinki co 0,25 m)
  const fl = [];
  const xsB = [];
  for (let x = -HEAD_X; x < HEAD_X; x += 0.25) xsB.push(x);
  xsB.push(HEAD_X);
  for (let i = 0; i < xsB.length - 1; i++) {
    const a = xsB[i], b = xsB[i + 1];
    fl.push(beamGeom([a, soleBottom(a) - 0.007, (FLANGE_IN + SOLE_Z) / 2], [b, soleBottom(b) - 0.007, (FLANGE_IN + SOLE_Z) / 2], 0.014, SOLE_Z - FLANGE_IN));
  }
  merged(fl, P, { parent: g });
  // półka górna (do zewnętrznego brzegu podłogi) z kątownikiem obrzeża, przerwana przy zaczepach
  const top = [];
  for (const [a, b] of subtractRanges([-HEAD_X, HEAD_X], SPIG_CUTS)) {
    top.push(boxGeom(b - a, 0.014, DECK_Z - FLANGE_IN, [(a + b) / 2, UF_TOP - 0.007, (FLANGE_IN + DECK_Z) / 2], 0.003));
    top.push(boxGeom(b - a, 0.06, 0.012, [(a + b) / 2, UF_TOP - 0.044, DECK_Z - 0.006], 0.003));
  }
  merged(top, P, { parent: g });
  // żebra (przepony) po wewnętrznej stronie środnika – między poprzecznicami
  const ribs = [];
  for (let x = -HEAD_X + 0.6; x < HEAD_X - 0.4; x += 1.05) {
    if (ZACZEPY_X.some((s) => Math.abs(s - x) < 0.3) || Math.abs(Math.abs(x) - PIVOT_X) < 0.35) continue;
    const yb = soleBottom(x) + 0.014;
    ribs.push(boxGeom(0.01, UF_TOP - 0.014 - yb, SOLE_Z - SOLE_T - FLANGE_IN, [x, (yb + UF_TOP - 0.014) / 2, (FLANGE_IN + SOLE_Z - SOLE_T) / 2]));
  }
  merged(ribs, P, { parent: g });
  // przekładki przy zaczepach (wspornik zaczepu przyspawany do środnika)
  merged(ZACZEPY_X.map((x) => boxGeom(0.2, 0.11, SOLE_Z - SOLE_T - (SPIG_Z + 0.12), [side * x, 1.055, (SPIG_Z + 0.12 + SOLE_Z - SOLE_T) / 2])), M.paintDark, { parent: g });
  // spoiny środnika z półką dolną (od wewnątrz)
  for (const [a, b] of [[-HEAD_X, -BELLY.x1], [-BELLY.x0, BELLY.x0], [BELLY.x1, HEAD_X]]) {
    weld([a, soleBottom(a) + 0.005, SOLE_Z - SOLE_T - 0.004], [b, soleBottom(b) + 0.005, SOLE_Z - SOLE_T - 0.004], 0.005, { parent: g });
  }
  // uchwyty do podnoszenia wagonu przy belkach skrętowych
  for (const sx of [1, -1]) {
    box(0.3, 0.06, 0.04, M.paintDark, { pos: [sx * (PIVOT_X + 0.35), BELLY.yEnd + 0.04, SOLE_Z + 0.02], r: 0.006, parent: g });
    bolts([-0.1, 0.1].map((dx) => ({ pos: [sx * (PIVOT_X + 0.35) + dx, BELLY.yEnd + 0.04, SOLE_Z + 0.04], dir: [0, 0, 1] })), 0.016, M.bolt, { parent: g, stick: 0 });
  }
  return g;
}

// Belka czołowa (koniec +x): blacha czołowa z półkami, nakładki pod zderzaki, otwór haka
export function buildHeadstock() {
  const g = part('belka_czolowa');
  const P = M.paintBody;
  const y0 = 0.84, t = 0.012, xf = HALF_LEN - 0.012;
  const zr = [-DECK_Z, DECK_Z];
  const BUF_Z = 0.875; // pół rozstawu osi zderzaków (1750 / 2, UIC 528)
  boxFromTo([xf - t, xf], [y0, UF_TOP], zr, P, { r: 0.004, parent: g });
  boxFromTo([HEAD_X, xf - t], [UF_TOP - t, UF_TOP], zr, P, { r: 0.004, parent: g });
  boxFromTo([HEAD_X, xf - t], [y0, y0 + t], zr, P, { r: 0.004, parent: g });
  boxFromTo([HEAD_X, HEAD_X + t], [y0, UF_TOP], [-SOLE_Z + SOLE_T, SOLE_Z - SOLE_T], P, { r: 0.004, parent: g });
  for (const s of [1, -1]) {
    boxFromTo([xf, HALF_LEN], [BUF_Y - 0.19, Math.min(BUF_Y + 0.19, UF_TOP)], [s * BUF_Z - 0.2, s * BUF_Z + 0.2], P, { r: 0.004, parent: g });
    merged([-0.12, 0.12].map((dz) => boxGeom(0.12, UF_TOP - y0 - 2 * t, 0.01, [(HEAD_X + xf) / 2, (y0 + UF_TOP) / 2, s * BUF_Z + dz])), P, { parent: g });
  }
  const hy = [BUF_Y - 0.1, BUF_Y + 0.08], hz = 0.08;
  merged([
    boxGeom(0.02, 0.03, 2 * hz + 0.06, [xf + 0.006, hy[1] + 0.015, 0]),
    boxGeom(0.02, 0.03, 2 * hz + 0.06, [xf + 0.006, hy[0] - 0.015, 0]),
    boxGeom(0.02, hy[1] - hy[0], 0.03, [xf + 0.006, (hy[0] + hy[1]) / 2, hz + 0.015]),
    boxGeom(0.02, hy[1] - hy[0], 0.03, [xf + 0.006, (hy[0] + hy[1]) / 2, -hz - 0.015]),
  ], P, { parent: g });
  box(0.006, hy[1] - hy[0], 2 * hz, M.rubber, { pos: [xf + 0.001, (hy[0] + hy[1]) / 2, 0], r: 0.002, parent: g });
  for (const s of [1, -1]) weld([HEAD_X, y0 + 0.01, s * (SOLE_Z - SOLE_T - 0.006)], [HEAD_X, UF_TOP - 0.01, s * (SOLE_Z - SOLE_T - 0.006)], 0.006, { parent: g });
  return g;
}

// Belka skrętowa: belka skrzynkowa w poprzek wagonu, nad wózkiem. Początek: oś czopa skrętu.
export function buildBolster() {
  const g = part('belka_skretowa');
  const P = M.paintBody;
  slot(g, 'czop_skretu', { pos: [0, 0.865, 0], explode: [0, -0.35, 0] });
  const sh = new THREE.Shape();
  const zc = 0.95, ze = SOLE_Z - SOLE_T, yb = 0.95, ye = 1.0;
  sh.moveTo(-ze, UF_TOP); sh.lineTo(ze, UF_TOP); sh.lineTo(ze, ye); sh.lineTo(zc, yb);
  sh.lineTo(-zc, yb); sh.lineTo(-ze, ye); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1 });
  geo.translate(0, 0, -0.18);
  geo.rotateY(Math.PI / 2);
  mesh(geo, P, { parent: g });
  // przeciwślizgi nad ślizgami bocznymi wózka
  for (const z of [0.82, -0.82]) {
    box(0.2, 0.13, 0.12, M.paintBody, { pos: [0, 0.88, z], r: 0.008, parent: g });
    box(0.18, 0.012, 0.1, M.steelMachined, { pos: [0, 0.809, z], r: 0.002, parent: g });
  }
  // żebra pionowe na ścianach belki
  const ribs = [];
  for (const z of [-0.55, -0.3, 0.3, 0.55]) for (const dx of [-0.19, 0.19]) ribs.push(boxGeom(0.02, UF_TOP - yb - 0.02, 0.012, [dx, (yb + UF_TOP) / 2, z]));
  merged(ribs, P, { parent: g });
  for (const s of [1, -1]) for (const dx of [-0.186, 0.186]) weld([dx, ye, s * (ze - 0.004)], [dx, UF_TOP - 0.01, s * (ze - 0.004)], 0.006, { parent: g });
  return g;
}

// Belka środkowa: dwa ceowniki wzdłuż osi wagonu (wewnątrz – urządzenie cięgłowe)
export function buildCenterSill() {
  const g = part('belka_srodkowa');
  const P = M.paintBody;
  const y0 = 0.96, y1 = UF_TOP, t = 0.01, fl = 0.08;
  for (const s of [1, -1]) {
    boxFromTo([-HEAD_X, HEAD_X], [y0, y1], sorted(s * 0.13, s * (0.13 + t)), P, { r: 0.003, parent: g });
    boxFromTo([-HEAD_X, HEAD_X], [y0, y0 + t], sorted(s * 0.13, s * (0.13 + fl)), P, { r: 0.003, parent: g });
    boxFromTo([-HEAD_X, HEAD_X], [y1 - t, y1], sorted(s * 0.13, s * (0.13 + fl)), P, { r: 0.003, parent: g });
  }
  const ties = [];
  for (let x = -HEAD_X + 0.9; x < HEAD_X - 0.5; x += 1.5) ties.push(boxGeom(0.08, 0.01, 0.26, [x, y0 - 0.005, 0]));
  merged(ties, P, { parent: g });
  return g;
}

// Poprzecznice zwykłe: dwuteowniki między belką środkową a ostojnicami; szeroka półka dolna
// – do niej mocowane są wsporniki hamulca i wieszaki przewodu głównego
export function buildCrossBearers() {
  const g = part('poprzecznice');
  const geoms = [];
  const z0 = 0.21, z1 = SOLE_Z - SOLE_T, len = z1 - z0;
  for (const x of CROSS_X) for (const s of [1, -1]) {
    const zc = s * (z0 + z1) / 2;
    geoms.push(boxGeom(0.008, UF_TOP - MOUNT_Y - 0.024, len, [x, (UF_TOP + MOUNT_Y) / 2, zc]));
    geoms.push(boxGeom(0.1, 0.012, len, [x, UF_TOP - 0.006, zc], 0.003));
    geoms.push(boxGeom(0.24, 0.012, len, [x, MOUNT_Y + 0.006, zc], 0.003));
  }
  merged(geoms, M.paintBody, { parent: g });
  return g;
}

// Poprzecznice zaczepów: blachownice pod zaczepami kontenerowymi. Część wewnętrzna pod podłogą,
// część zewnętrzna obniżona – na niej stoi wspornik zaczepu (przyspawany też do ostojnicy).
export function buildSpigotCrossBearers() {
  const g = part('poprzecznice_zaczepow');
  const P = M.paintBody;
  const webs = [], fl = [];
  const z0 = 0.21, z1 = SOLE_Z - SOLE_T, zs = HOLE_Z;
  for (const x of ZACZEPY_X) {
    // góra części zewnętrznej = spód wspornika zaczepu (składany: 0,26 m pod płytą, stały: 0,22 m)
    // nad końcem ramy wózka (do 1,42 m od czopa, góra ok. 0,92 m) część zewnętrzna płytsza
    const overBogie = Math.abs(Math.abs(x) - PIVOT_X) < 1.5;
    const yt = SPIG_Y - (isFixed(x) ? 0.22 : 0.26), yb = overBogie ? 0.95 : yt - 0.11;
    for (const s of [1, -1]) {
      const o = [[z0, MOUNT_Y], [zs - 0.1, MOUNT_Y], [zs, yb], [z1, yb], [z1, yt], [zs, yt], [zs, UF_TOP], [z0, UF_TOP]]
        .map(([z, y]) => [s * z, y]);
      if (s < 0) o.reverse();
      webs.push(plateGeom(o, x - 0.006, x + 0.006, (u, v, w) => [w, v, u]));
      const zz = (a, b) => [(s * a + s * b) / 2, Math.abs(b - a)];
      const [zi, li] = zz(z0, zs), [zo, lo] = zz(zs, z1);
      fl.push(boxGeom(0.1, 0.012, li, [x, UF_TOP - 0.006, zi], 0.003));
      fl.push(boxGeom(0.1, 0.012, lo, [x, yt - 0.006, zo], 0.003));
      fl.push(boxGeom(0.1, 0.012, lo, [x, yb + 0.006, zo], 0.003));
      fl.push(boxGeom(0.1, 0.012, zs - 0.1 - z0, [x, MOUNT_Y + 0.006, s * (z0 + zs - 0.1) / 2], 0.003));
      fl.push(beamGeom([x, MOUNT_Y + 0.006, s * (zs - 0.1)], [x, yb + 0.006, s * zs], 0.012, 0.1));
    }
  }
  merged(webs, P, { parent: g });
  merged(fl, P, { parent: g });
  return g;
}

// Podłużnice pod podłogą (dwuteowniki), przerwane na belkach skrętowych
export function buildStringers() {
  const g = part('podluznice');
  const geoms = [];
  const x0 = PIVOT_X - 0.19, x1 = PIVOT_X + 0.19;
  for (const [a, b] of [[-x0, x0], [x1, HEAD_X], [-HEAD_X, -x1]]) for (const s of [1, -1]) {
    const z = s * STRINGER_Z, xc = (a + b) / 2, l = b - a;
    geoms.push(boxGeom(l, UF_TOP - MOUNT_Y - 0.024, 0.008, [xc, (UF_TOP + MOUNT_Y) / 2, z]));
    geoms.push(boxGeom(l, 0.012, 0.1, [xc, UF_TOP - 0.006, z], 0.003));
    geoms.push(boxGeom(l, 0.012, 0.1, [xc, MOUNT_Y + 0.006, z], 0.003));
  }
  merged(geoms, M.paintBody, { parent: g });
  return g;
}

// Osłony przeciwiskrowe nad hamowanymi kołami (wymagane przy podłodze palnej – GCU Zał. 10 pkt 4.6):
// blachy zawieszone pod podłużnicami, nie bezpośrednio pod podłogą. Wymiary SZACUNKOWE.
export function buildSparkGuards() {
  const g = part('oslony_przeciwiskrowe');
  const plates = [], straps = [], heads = [];
  const y = 1.0, zc = 0.75;
  for (const xw of [PIVOT_X - 0.9, PIVOT_X + 0.9]) for (const sx of [1, -1]) for (const s of [1, -1]) {
    const x = sx * xw;
    plates.push(boxGeom(0.66, 0.006, 0.34, [x, y, s * zc], 0.002));
    // zagięte krawędzie (usztywnienie)
    plates.push(boxGeom(0.66, 0.03, 0.006, [x, y - 0.012, s * (zc + 0.167)], 0.002));
    for (const dx of [-0.25, 0.25]) {
      straps.push(boxGeom(0.04, MOUNT_Y - y - 0.003, 0.008, [x + dx, (y + MOUNT_Y) / 2, s * (STRINGER_Z + 0.03)]));
      heads.push({ pos: [x + dx, y + 0.003, s * (STRINGER_Z + 0.05)], dir: [0, 1, 0] });
    }
  }
  merged(plates, M.paintDark, { parent: g });
  merged(straps, M.paintDark, { parent: g });
  bolts(heads, 0.01, M.bolt, { parent: g, stick: 0 });
  return g;
}

// ======================= ZACZEPY KONTENEROWE =======================

// Grupa zaczepów: gniazda dla wspólnych zaczepów (components/ladunek.json).
// Numeracja: od końca 1 do końca 2, nieparzyste – strona 1 (+z), parzyste – strona 2 (−z).
export function buildSpigots() {
  const g = part('zaczepy');
  ZACZEPY_X.forEach((x, i) => {
    slot(g, `zaczep_${2 * i + 1}`, { pos: [x, SPIG_Y, SPIG_Z], explode: [0, 0.3, 0.35] });
    slot(g, `zaczep_${2 * i + 2}`, { pos: [x, SPIG_Y, -SPIG_Z], rot: [0, Math.PI, 0], explode: [0, 0.3, -0.35] });
  });
  return g;
}

// Wszystkie buildery, których potrzebuje Sgs (wagon + wspólne podzespoły)
export const builders = {
  ...y25Builders,
  ...drawGearBuilders,
  ...airBrakeBuilders,
  ...underframeBuilders,
  ...cargoBuilders,
  sgs: buildSgs,
  podloga_sgs: buildFloor,
  ostoja_sgs: buildUnderframe,
  ostojnica_sgs: buildSoleBar,
  belka_czolowa_sgs: buildHeadstock,
  belka_skretowa_sgs: buildBolster,
  belka_srodkowa_sgs: buildCenterSill,
  poprzecznice_sgs: buildCrossBearers,
  poprzecznice_zaczepow_sgs: buildSpigotCrossBearers,
  podluznice_sgs: buildStringers,
  oslony_przeciwiskrowe_sgs: buildSparkGuards,
  zaczepy_sgs: buildSpigots,
};
