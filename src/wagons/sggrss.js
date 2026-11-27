// Wagon Sggrss (sześcioosiowy wagon przegubowy do kontenerów, 80 stóp): dwa człony na trzech
// wózkach Y25, środkowy wózek pod przegubem. Ten plik buduje ostoje członów, zaczepy
// kontenerowe i rozmieszcza wspólne podzespoły (wózki, przegub, hamulec, cięgła i zderzaki).
// Układ wagonu: x wzdłuż (0 = oś przegubu), y w górę (0 = główka szyny), z w poprzek.
// Układ członu: x = 0 w środku członu, koniec 1 (+x) = czoło ze zderzakami, koniec 2 (−x) = przegub.
// Człon 2 jest obrócony o 180°, więc oba człony mają identyczną budowę w swoim układzie.
//
// Wymiary ze źródeł (zob. pole "zrodla" w data/sggrss.json):
//   Ermewa – karta wagonu „Sggrss 80' – 6 axles” (rysunek wymiarowy): długość ze zderzakami
//   26 390 mm, odległość lic belek czołowych 25 150 mm, zderzak 620 mm, od lica belki czołowej
//   do czopa wózka skrajnego 2 180 mm, od czopa skrajnego do osi przegubu 10 395 mm, rozstaw osi
//   wózka 1 800 mm, koło Ø920 mm, wysokość osi zderzaków 1 030 mm, długość ostoi członu 12 220 mm,
//   przerwa między członami (w osi przegubu) 710 mm, zaczepy: 117,5 mm od końców ostoi, odstępy
//   5 853 / 8 919 / 11 985 mm (naroża kontenerów 20' / 30' / 40') i 2 787 mm; 8 zaczepów stałych,
//   12 składanych.
//   DB Cargo – katalog, Sggrss 733: wysokość ładunkowa 1 155 mm nad główką szyny (Ermewa: 1 150 mm),
//   bez hamulca postojowego, na człon 2 × 20', 1 × 30' albo 1 × 40'.
// Pozostałe wymiary (przekroje belek, wysokość ostoi, rozstaw poprzeczny ostojnic,
// położenia poprzecznic) – SZACUNKOWE, do sprawdzenia na wagonie.
import { THREE, M, part, slot, mesh, box, boxFromTo, merged, boxGeom, bolts, weld, beamGeom } from '../lib/geom.js';
import { y25Builders } from '../components/y25/index.js';
import { drawGearBuilders } from '../components/ciegla_zderzaki/index.js';
import { airBrakeBuilders } from '../components/hamulec/index.js';
import { underframeBuilders } from '../components/ostoja/index.js';
import { cargoBuilders } from '../components/ladunek/index.js';
import { articulationBuilders } from '../components/przegub/index.js';
import { cfg as brakeCfg, layout as brakeLayout } from '../components/hamulec/config.js';

// ---------- Wymiary wagonu (Ermewa, rysunek wymiarowy) ----------
const GAP = 0.355;                 // pół przerwy między członami (710 / 2)
export const HALF_LEN = 6.11;      // pół długości ostoi członu (12 220 / 2)
export const U = GAP + HALF_LEN;   // środek członu od osi przegubu: 6,465 m
export const END_X = U + HALF_LEN; // lico belki czołowej od osi przegubu: 12,575 m (25 150 / 2)
export const PIVOT_OUT = 10.395 - U; // czop wózka skrajnego od środka członu: 3,93 m
export const PIVOT_ART = U;        // oś przegubu (czop wózka środkowego) od środka członu
export const BUF_Y = 1.03;         // oś zderzaków (Ermewa: 1 030 mm)
const SPIG_Y = 1.155;              // płyta oporowa zaczepu = wysokość ładunkowa (DB Cargo: 1 155 mm)

// ---------- Wymiary SZACUNKOWE ----------
const UF_TOP = 1.135;              // góra ostoi (płyty zaczepów 20 mm wyżej) – SZACUNKOWE
const SOLE_Z = 1.29;               // zewnętrzna ściana środnika ostojnicy – SZACUNKOWE
const SOLE_T = 0.012;              // grubość środnika ostojnicy – SZACUNKOWE
const FLANGE_IN = 1.18;            // wewnętrzna krawędź półek ostojnicy – SZACUNKOWE
export const HEAD_X = HALF_LEN - 0.16; // wewnętrzna ściana belki czołowej / przegubowej – SZACUNKOWE
const MOUNT_Y = 1.05;              // spód poprzecznic (tu wiszą elementy hamulca) – SZACUNKOWE
const CROSS_X = [1.7, -4.4, -5.4]; // poprzecznice zwykłe (x w członie) – SZACUNKOWE
const NOTCH_Z = 0.99;              // belki końcowe obniżone na zewnątrz od tego z (miejsce na wsporniki zaczepów)
const ART_BOTTOM = 0.99;           // spód belki przegubowej (pod nią przechodzi przewód główny) – SZACUNKOWE
export const ART_Y = 1.04;         // środek łożyska przegubu: czop części żeńskiej w gnieździe wózka – SZACUNKOWE

// ---------- Zaczepy kontenerowe (Ermewa) ----------
// Odległości od końca 1 (czoła) członu: 117,5 mm, potem naroża 20' (5 853), drugiego 20',
// 30' (8 919 od skrajnego) i 40' (11 985) – ostatni rząd 117,5 mm od końca przy przegubie.
// Rozstaw poprzeczny 2 259 mm – SZACUNKOWE (wartość z ISO 1161, nie potwierdzona w źródle).
const SPIG_Z = 2.259 / 2;
const D_END = 0.1175;
const D_FROM_END = [D_END, D_END + 5.853, 2 * HALF_LEN - D_END - 5.853, D_END + 8.919, 2 * HALF_LEN - D_END];
// Położenia x w członie (kolejność = kolejność w data/sggrss.json); skrajne – stałe, pozostałe – składane
export const ZACZEPY_X = D_FROM_END.map((d) => HALF_LEN - d);
const isFixed = (x) => Math.abs(x) > HALF_LEN - 0.2;
const FOLD_X = ZACZEPY_X.filter((x) => !isFixed(x));
// ostojnica kończy się przy wsporniku stałego zaczepu (wspornik łączy ją z belką końcową) – SZACUNKOWE
const SOLE_END = ZACZEPY_X[0] - 0.115;

// Ostojnica rybia: spód 0,95 m nad wózkami, 0,72 m między wózkami (SZACUNKOWE, kształt wg rysunku Ermewa)
const BELLY = { yEnd: 0.95, yMid: 0.72, xIn: [-4.0, 1.5], xOut: [-4.8, 2.3] };
function soleBottom(x) {
  const [a0, a1] = BELLY.xIn, [b0, b1] = BELLY.xOut;
  if (x >= b1 || x <= b0) return BELLY.yEnd;
  if (x >= a0 && x <= a1) return BELLY.yMid;
  const t = x > a1 ? (b1 - x) / (b1 - a1) : (x - b0) / (a0 - b0); // 0 = koniec, 1 = środek
  return BELLY.yEnd - (BELLY.yEnd - BELLY.yMid) * (1 - Math.cos(t * Math.PI)) / 2;
}

const sorted = (a, b) => (a < b ? [a, b] : [b, a]);
// Scala przedziały [a, b]
function mergeRanges(list) {
  const r = list.map((p) => [...p]).sort((p, q) => p[0] - q[0]);
  const out = [];
  for (const p of r) {
    if (out.length && p[0] <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], p[1]);
    else out.push(p);
  }
  return out;
}
// Odcinek [a, b] pomniejszony o wycięcia
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

// Płaska blacha o obrysie 2D (z okrągłymi otworami) wyciągnięta na grubość w0..w1
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

// ======================= WAGON =======================

export function buildSggrss() {
  const g = part('sggrss');
  slot(g, 'czlon_1', { pos: [U, 0, 0], explode: [1.6, 1.0, 0] });
  slot(g, 'czlon_2', { pos: [-U, 0, 0], rot: [0, Math.PI, 0], explode: [-1.6, 1.0, 0] });
  // przegub nad czopem wózka środkowego
  slot(g, 'przegub', { pos: [0, ART_Y, 0], explode: [0, 1.6, 0] });
  slot(g, 'wozek_1', { pos: [U + PIVOT_OUT, 0, 0], explode: [2.2, 0, 0] });
  // wózek środkowy obrócony: jego dźwignia hamulca (od strony −x wózka) wskazuje człon 1,
  // który go hamuje (param "ciegla_wozek_2" w data/sggrss.json)
  slot(g, 'wozek_2', { pos: [0, 0, 0], rot: [0, Math.PI, 0], explode: [0, 0, 2.2] });
  slot(g, 'wozek_3', { pos: [-(U + PIVOT_OUT), 0, 0], rot: [0, Math.PI, 0], explode: [-2.2, 0, 0] });
  slot(g, 'ciegla_zderzaki_1', { pos: [END_X, BUF_Y, 0], explode: [3.2, 0, 0] });
  slot(g, 'ciegla_zderzaki_2', { pos: [-END_X, BUF_Y, 0], rot: [0, Math.PI, 0], explode: [-3.2, 0, 0] });
  return g;
}

// Człon: ostoja, zaczepy i hamulec zespolony (hamulec w układzie członu)
export function buildMember() {
  const g = part('czlon');
  slot(g, 'ostoja', { explode: [0, 0.4, 0] });
  slot(g, 'zaczepy', { explode: [0, 1.4, 0] });
  slot(g, 'hamulec', { explode: [0, -0.5, 0] });
  return g;
}

// ======================= OSTOJA CZŁONU =======================
const CORNERS = { 1: [1, 1], 2: [1, -1] }; // narożniki przy czole (koniec 1): nr → [sx, sz]

export function buildUnderframe() {
  const g = part('ostoja');
  slot(g, 'ostojnica_1', { explode: [0, 0, 0.7] });
  slot(g, 'ostojnica_2', { rot: [0, Math.PI, 0], explode: [0, 0, -0.7] });
  slot(g, 'belka_czolowa', { explode: [0.8, 0, 0] });
  slot(g, 'belka_przegubowa', { explode: [-0.8, 0, 0] });
  slot(g, 'belka_skretowa', { pos: [PIVOT_OUT, 0, 0], explode: [0, -0.45, 0] });
  slot(g, 'belka_srodkowa', { explode: [0, -0.3, 0] });
  slot(g, 'poprzecznice', { explode: [0, 0.35, 0] });
  slot(g, 'poprzecznice_zaczepow', { explode: [0, 0.6, 0] });
  slot(g, 'stezenia', { explode: [0, 0.8, 0] });
  for (const [n, [sx, sz]] of Object.entries(CORNERS)) {
    slot(g, `stopien_manewrowy_${n}`, { explode: [sx * 0.3, -0.25, sz * 0.5] });
    slot(g, `porecz_manewrowa_${n}`, { explode: [sx * 0.5, 0.2, sz * 0.4] });
  }
  return g;
}

// Otwory w środniku ostojnicy na cięgła hamulca wyprowadzone na bok (dźwignia przestawiacza
// próżny/ładowny, cięgło luzownika). Parametry hamulca są w węźle członu (data/sggrss.json).
function brakeHoles(node, side) {
  const lay = brakeLayout(brakeCfg(node));
  const pts = [[lay.release[0] + 0.06, 0.835]];               // cięgło luzownika – na oba boki
  if (side > 0) pts.push([lay.loadValve[0], lay.loadValve[1]]); // dźwignia przestawiacza – strona 1
  // w układzie ostojnicy strona 2 jest obrócona o 180° (x → −x)
  return pts.map(([x, y]) => [side * x, y, 0.03]).filter(([x, y]) => y > soleBottom(side * x) + 0.05 && y < UF_TOP - 0.05);
}

// Ostojnica (strona +z): rybia blachownica. Przy zaczepach składanych wycięcie w środniku
// na ucha zawiasu, przy wszystkich zaczepach przerwa w półce górnej i przekładka.
// Ostojnica 2 jest obrócona o 180°, więc kształt liczony jest dla x w układzie członu (side · x).
export function buildSoleBar(node) {
  const g = part('ostojnica');
  const P = M.paintBody;
  const side = node.id === 'ostojnica_2' ? -1 : 1;
  const bot = (x) => soleBottom(side * x);
  const fold = FOLD_X.map((x) => side * x);
  const all = ZACZEPY_X.map((x) => side * x);
  const notches = mergeRanges(fold.map((x) => [x - 0.16, x + 0.16]));
  const NOTCH_Y = SPIG_Y - 0.135; // dno wycięcia pod ucha zawiasu – SZACUNKOWE
  // obrys środnika w płaszczyźnie (x, y)
  const outline = [[-SOLE_END, bot(-SOLE_END)], [-SOLE_END, UF_TOP]];
  for (const [a, b] of notches) outline.push([a, UF_TOP], [a, NOTCH_Y], [b, NOTCH_Y], [b, UF_TOP]);
  outline.push([SOLE_END, UF_TOP]);
  for (let x = SOLE_END; x > -SOLE_END; x -= 0.25) outline.push([x, bot(x)]);
  mesh(plateGeom(outline, SOLE_Z - SOLE_T, SOLE_Z, (u, v, w) => [u, v, w], brakeHoles(node, side)), P, { parent: g });
  // półka dolna wzdłuż spodu (odcinki co 0,25 m)
  const fl = [];
  const xs = [];
  for (let x = -SOLE_END; x < SOLE_END; x += 0.25) xs.push(x);
  xs.push(SOLE_END);
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1];
    fl.push(beamGeom([a, bot(a) - 0.007, (FLANGE_IN + SOLE_Z) / 2], [b, bot(b) - 0.007, (FLANGE_IN + SOLE_Z) / 2], 0.014, SOLE_Z - FLANGE_IN));
  }
  merged(fl, P, { parent: g });
  // półka górna przerwana przy zaczepach
  const top = subtractRanges([-SOLE_END, SOLE_END], all.map((x) => [x - 0.16, x + 0.16]))
    .map(([a, b]) => boxGeom(b - a, 0.014, SOLE_Z - FLANGE_IN, [(a + b) / 2, UF_TOP - 0.007, (FLANGE_IN + SOLE_Z) / 2], 0.003));
  merged(top, P, { parent: g });
  // żebra (przepony) po wewnętrznej stronie środnika
  const ribs = [];
  for (let x = -SOLE_END + 0.55; x < SOLE_END - 0.4; x += 1.05) {
    if (all.some((s) => Math.abs(s - x) < 0.3) || Math.abs(side * x - PIVOT_OUT) < 0.35) continue;
    const yb = bot(x) + 0.014;
    ribs.push(boxGeom(0.01, UF_TOP - 0.014 - yb, SOLE_Z - SOLE_T - FLANGE_IN, [x, (yb + UF_TOP - 0.014) / 2, (FLANGE_IN + SOLE_Z - SOLE_T) / 2]));
  }
  merged(ribs, P, { parent: g });
  // przekładki przy zaczepach (wspornik zaczepu przyspawany do środnika)
  merged(all.map((x) => boxGeom(0.2, 0.09, SOLE_Z - SOLE_T - (SPIG_Z + 0.12), [x, SPIG_Y - 0.17, (SPIG_Z + 0.12 + SOLE_Z - SOLE_T) / 2])), M.paintDark, { parent: g });
  // spoiny środnika z półką dolną (od wewnątrz, na prostych odcinkach)
  const straight = [[-SOLE_END, BELLY.xOut[0]], [BELLY.xIn[0], BELLY.xIn[1]], [BELLY.xOut[1], SOLE_END]]
    .map(([a, b]) => sorted(side * a, side * b));
  for (const [a, b] of straight) {
    weld([a, bot(a) + 0.005, SOLE_Z - SOLE_T - 0.004], [b, bot(b) + 0.005, SOLE_Z - SOLE_T - 0.004], 0.005, { parent: g });
  }
  // uchwyty do podnoszenia wagonu przy belce skrętowej
  const xl = side * (PIVOT_OUT - 0.4);
  box(0.3, 0.06, 0.04, M.paintDark, { pos: [xl, BELLY.yEnd + 0.04, SOLE_Z + 0.02], r: 0.006, parent: g });
  bolts([-0.1, 0.1].map((dx) => ({ pos: [xl + dx, BELLY.yEnd + 0.04, SOLE_Z + 0.04], dir: [0, 0, 1] })), 0.016, M.bolt, { parent: g, stick: 0 });
  return g;
}

// Skrzynka belki końcowej (wspólna dla belki czołowej i przegubowej), koniec +x, lico w xf.
// Na zewnątrz od z = NOTCH_Z górna część jest obniżona – tam stoją wsporniki stałych zaczepów.
function endBeamBox(g, y0, xf) {
  const P = M.paintBody, t = 0.012, yN = SPIG_Y - 0.225;
  // belka głęboka (czołowa): dół na całą szerokość pod wspornikami zaczepów; płytka (przegubowa): tylko środek
  const low = y0 < yN;
  const zb = low ? SOLE_Z - SOLE_T : NOTCH_Z;
  if (low) boxFromTo([xf - t, xf], [y0, yN], [-SOLE_Z, SOLE_Z], P, { r: 0.004, parent: g }); // blacha czołowa – dół
  boxFromTo([xf - t, xf], [low ? yN : y0, UF_TOP], [-NOTCH_Z, NOTCH_Z], P, { r: 0.004, parent: g }); // blacha czołowa – góra
  boxFromTo([HEAD_X, xf - t], [UF_TOP - t, UF_TOP], [-NOTCH_Z, NOTCH_Z], P, { r: 0.004, parent: g });
  boxFromTo([HEAD_X, xf - t], [y0, y0 + t], [-zb, zb], P, { r: 0.004, parent: g });
  boxFromTo([HEAD_X, HEAD_X + t], [y0, UF_TOP], [-NOTCH_Z, NOTCH_Z], P, { r: 0.004, parent: g });
  // ścianki zamykające przy obniżeniu
  for (const s of [1, -1]) boxFromTo([HEAD_X + t, xf - t], [y0 + t, UF_TOP - t], sorted(s * (NOTCH_Z - t), s * NOTCH_Z), P, { r: 0.003, parent: g });
  for (const s of [1, -1]) weld([HEAD_X, y0 + 0.01, s * (NOTCH_Z - 0.006)], [HEAD_X, UF_TOP - 0.01, s * (NOTCH_Z - 0.006)], 0.006, { parent: g });
}

// Belka czołowa (koniec 1): skrzynka, nakładki pod zderzaki, otwór haka
export function buildHeadstock() {
  const g = part('belka_czolowa');
  const P = M.paintBody;
  const y0 = 0.84, xf = HALF_LEN - 0.012;
  const BUF_Z = 0.875; // pół rozstawu osi zderzaków (1 750 / 2, UIC 528)
  endBeamBox(g, y0, HALF_LEN);
  for (const s of [1, -1]) {
    boxFromTo([xf, HALF_LEN], [BUF_Y - 0.19, Math.min(BUF_Y + 0.19, UF_TOP)], [s * BUF_Z - 0.2, s * BUF_Z + 0.2], P, { r: 0.004, parent: g });
    merged([-0.12, 0.12].map((dz) => boxGeom(0.12, UF_TOP - y0 - 0.024, 0.01, [(HEAD_X + xf) / 2, (y0 + UF_TOP) / 2, s * BUF_Z + dz])), P, { parent: g });
  }
  // otwór haka cięgłowego z ramką
  const hy = [BUF_Y - 0.1, BUF_Y + 0.08], hz = 0.08;
  merged([
    boxGeom(0.02, 0.03, 2 * hz + 0.06, [xf + 0.006, hy[1] + 0.015, 0]),
    boxGeom(0.02, 0.03, 2 * hz + 0.06, [xf + 0.006, hy[0] - 0.015, 0]),
    boxGeom(0.02, hy[1] - hy[0], 0.03, [xf + 0.006, (hy[0] + hy[1]) / 2, hz + 0.015]),
    boxGeom(0.02, hy[1] - hy[0], 0.03, [xf + 0.006, (hy[0] + hy[1]) / 2, -hz - 0.015]),
  ], P, { parent: g });
  box(0.006, hy[1] - hy[0], 2 * hz, M.rubber, { pos: [xf + 0.001, (hy[0] + hy[1]) / 2, 0], r: 0.002, parent: g });
  return g;
}

// Belka przegubowa (koniec 2, od strony przegubu): skrzynka płytsza od dołu (pod nią przechodzi
// przewód główny), na licu nakładka, do której przyspawane jest ramię przegubu.
// Kształt liczony dla końca +x, potem obrócony o 180° na koniec 2 (−x).
export function buildArticulationBeam() {
  const g = part('belka_przegubowa');
  const inner = new THREE.Group();
  endBeamBox(inner, ART_BOTTOM, HALF_LEN);
  // nakładka wzmacniająca na licu (pod płytę ramienia przegubu) – SZACUNKOWE
  box(0.016, UF_TOP - ART_BOTTOM - 0.02, 0.5, M.paintBody, { pos: [HALF_LEN - 0.02, (UF_TOP + ART_BOTTOM) / 2, 0], r: 0.004, parent: inner });
  for (const s of [1, -1]) weld([HALF_LEN - 0.03, ART_BOTTOM + 0.01, s * 0.25], [HALF_LEN - 0.03, UF_TOP - 0.01, s * 0.25], 0.006, { parent: inner });
  inner.rotation.y = Math.PI; // koniec 2 = −x (lustro przez obrót wokół osi pionowej)
  g.add(inner);
  return g;
}

// Belka skrętowa nad wózkiem skrajnym (początek: oś czopa skrętu)
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
  const ribs = [];
  for (const z of [-0.55, -0.3, 0.3, 0.55]) for (const dx of [-0.19, 0.19]) ribs.push(boxGeom(0.02, UF_TOP - yb - 0.02, 0.012, [dx, (yb + UF_TOP) / 2, z]));
  merged(ribs, P, { parent: g });
  for (const s of [1, -1]) for (const dx of [-0.186, 0.186]) weld([dx, ye, s * (ze - 0.004)], [dx, UF_TOP - 0.01, s * (ze - 0.004)], 0.006, { parent: g });
  return g;
}

// Belka środkowa: dwa ceowniki wzdłuż osi członu (przy czole – urządzenie cięgłowe)
export function buildCenterSill() {
  const g = part('belka_srodkowa');
  const P = M.paintBody;
  const y0 = 0.99, y1 = UF_TOP, t = 0.01, fl = 0.08;
  for (const s of [1, -1]) {
    boxFromTo([-HEAD_X, HEAD_X], [y0, y1], sorted(s * 0.13, s * (0.13 + t)), P, { r: 0.003, parent: g });
    boxFromTo([-HEAD_X, HEAD_X], [y0, y0 + t], sorted(s * 0.13, s * (0.13 + fl)), P, { r: 0.003, parent: g });
    boxFromTo([-HEAD_X, HEAD_X], [y1 - t, y1], sorted(s * 0.13, s * (0.13 + fl)), P, { r: 0.003, parent: g });
  }
  const ties = [];
  for (let x = -HEAD_X + 0.7; x < HEAD_X - 0.5; x += 1.5) ties.push(boxGeom(0.08, 0.01, 0.26, [x, y0 - 0.005, 0]));
  merged(ties, P, { parent: g });
  return g;
}

// Poprzecznice zwykłe: dwuteowniki między belką środkową a ostojnicami (szeroka półka dolna
// – do niej mocowane są wsporniki hamulca i wieszaki przewodu głównego)
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

// Poprzecznice zaczepów składanych: blachownice, część zewnętrzna obniżona – na niej stoi
// wspornik zaczepu. Zaczepy stałe stoją na belkach końcowych (czołowej i przegubowej).
export function buildSpigotCrossBearers() {
  const g = part('poprzecznice_zaczepow');
  const webs = [], fl = [];
  const z0 = 0.21, z1 = SOLE_Z - SOLE_T, zs = 0.9;
  for (const x of FOLD_X) {
    const yt = SPIG_Y - 0.26, yb = yt - 0.11; // góra = spód wspornika zaczepu składanego
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
  merged(webs, M.paintBody, { parent: g });
  merged(fl, M.paintBody, { parent: g });
  return g;
}

// Stężenia ukośne (krzyżulce) w płaszczyźnie ostoi – ostoja szkieletowa bez podłogi
// (na rysunku Ermewa widać ukośne pręty między belką środkową a ostojnicami). Układ SZACUNKOWY.
const BRACE_BAYS = [[1.85, 3.65], [-2.75, -0.35], [-4.25, -3.1]];
export function buildBraces() {
  const g = part('stezenia');
  const y = UF_TOP - 0.035, z0 = 0.22, z1 = FLANGE_IN - 0.01, w = 0.08, t = 0.01;
  const plates = [];
  const strip = (a, b) => {
    // pas o szerokości w między punktami a i b w płaszczyźnie (x, z)
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const nx = (-dz / l) * w / 2, nz = (dx / l) * w / 2;
    const o = [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]];
    return plateGeom(o, y - t / 2, y + t / 2, (u, v, ww) => [u, ww, v]);
  };
  for (const [xa, xb] of BRACE_BAYS) for (const s of [1, -1]) {
    plates.push(strip([xa, s * z0], [xb, s * z1]));
    plates.push(strip([xb, s * z0], [xa, s * z1]));
  }
  merged(plates, M.paintBody, { parent: g });
  // blachy węzłowe w miejscu skrzyżowania
  const gus = [];
  for (const [xa, xb] of BRACE_BAYS) for (const s of [1, -1]) gus.push(boxGeom(0.16, 0.008, 0.16, [(xa + xb) / 2, y + t / 2 + 0.004, s * (z0 + z1) / 2], 0.002));
  merged(gus, M.paintDark, { parent: g });
  return g;
}

// ======================= ZACZEPY KONTENEROWE =======================

// Gniazda dla wspólnych zaczepów (components/ladunek.json). Numeracja w członie: od czoła
// (koniec 1) do przegubu (koniec 2), nieparzyste – strona 1 (+z), parzyste – strona 2 (−z).
export function buildSpigots() {
  const g = part('zaczepy');
  ZACZEPY_X.forEach((x, i) => {
    slot(g, `zaczep_${2 * i + 1}`, { pos: [x, SPIG_Y, SPIG_Z], explode: [0, 0.3, 0.35] });
    slot(g, `zaczep_${2 * i + 2}`, { pos: [x, SPIG_Y, -SPIG_Z], rot: [0, Math.PI, 0], explode: [0, 0.3, -0.35] });
  });
  return g;
}

// Wszystkie buildery, których potrzebuje Sggrss (wagon + wspólne podzespoły)
export const builders = {
  ...y25Builders,
  ...drawGearBuilders,
  ...airBrakeBuilders,
  ...underframeBuilders,
  ...cargoBuilders,
  ...articulationBuilders,
  sggrss: buildSggrss,
  czlon_sggrss: buildMember,
  ostoja_sggrss: buildUnderframe,
  ostojnica_sggrss: buildSoleBar,
  belka_czolowa_sggrss: buildHeadstock,
  belka_przegubowa_sggrss: buildArticulationBeam,
  belka_skretowa_sggrss: buildBolster,
  belka_srodkowa_sggrss: buildCenterSill,
  poprzecznice_sggrss: buildCrossBearers,
  poprzecznice_zaczepow_sggrss: buildSpigotCrossBearers,
  stezenia_sggrss: buildBraces,
  zaczepy_sggrss: buildSpigots,
};
