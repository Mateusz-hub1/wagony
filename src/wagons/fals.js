// Wagon Fals (czteroosiowy wagon samowyładowczy z dnem siodłowym) – pudło, ostoja,
// klapy wyładowcze, mechanizm otwierania klap i rozmieszczenie wspólnych podzespołów.
// Układ: x wzdłuż wagonu (0 = środek), y w górę (0 = główka szyny), z w poprzek.
//
// Wymiary ze źródeł (zob. pole "zrodla" w data/fals.json):
//   DB Cargo Romania – katalog wagonów, Fals 175: długość ze zderzakami 11 950 mm,
//   odległość między belkami czołowymi 10 700 mm, rozstaw czopów skrętu 6 400 mm,
//   szerokość wagonu 3 055 mm, szerokość nad pochyłymi ścianami górnymi 3 025 mm,
//   szerokość otworu ładunkowego u góry 1 955 mm, wysokość 3 975 mm, długość górnej krawędzi
//   10 688 mm, wysokość osi zderzaków 1 064 mm.
//   BDŽ Cargo – Fals: pochylenie dna siodłowego 49° do poziomu.
//   Rail Cargo Hungaria – instrukcja obsługi Fals: 2 klapy na stronę, 8 zamków (Klauen).
// Pozostałe wymiary (wysokości pasów, profile, mechanizm) – SZACUNKOWE, do sprawdzenia.
import { THREE, M, paint, part, slot, mesh, box, boxFromTo, merged, boxGeom, cylinder, rod, rodGeom, bolts, rivets, weld, hatV, hatH, plateGeom, beamGeom } from '../lib/geom.js';
import { y25Builders } from '../components/y25/index.js';
import { drawGearBuilders } from '../components/ciegla_zderzaki/index.js';
import { airBrakeBuilders } from '../components/hamulec/index.js';
import { underframeBuilders, buildPlatform } from '../components/ostoja/index.js';
import { buildActuator, buildControlValve, buildControlPipes } from '../components/wyladunek/index.js';

export const PIVOT_X = 3.2;    // pół rozstawu czopów skrętu (6400 / 2)
export const HALF_LEN = 5.35;  // lico belki czołowej (10 700 / 2)
export const BUF_Y = 1.064;    // oś zderzaków nad główką szyny (rysunek Fals 175)
export const BUF_Z = 0.875;    // pół rozstawu osi zderzaków (1750 / 2, UIC 528)
const HALF_W = 3.055 / 2;      // największa szerokość (klapy)
const EAVE_Z = 3.025 / 2;      // szerokość nad ścianami bocznymi (początek pochyłej nadstawy)
const TOP_Z = 1.955 / 2;       // pół szerokości otworu ładunkowego u góry
const RIM_TOP = 3.975;         // najwyższy punkt wagonu (górna krawędź pasa górnego)
const TOP_Y = 3.93;            // górna krawędź blach nadstawy (SZACUNKOWE, pas górny nad nią)
const EAVE_Y = 3.2;            // załamanie ściana boczna / nadstawa (SZACUNKOWE)
const HINGE_Y = 2.64;          // oś zawiasów klap (SZACUNKOWE)
const HINGE_Z = 1.49;          // oś zawiasów klap w poprzek (SZACUNKOWE)
const BAND_Y = 2.66;           // dół stałej części ściany bocznej (nad klapami)
const FLAP_Y = 1.12;           // dolna krawędź klapy (SZACUNKOWE)
const ZI = 1.455;              // wewnętrzna powierzchnia klap i ścian bocznych (SZACUNKOWE)
const ZB = 1.47;               // poszycie stałej części ściany bocznej (SZACUNKOWE)
const FLAP_X = [0.09, 4.35];   // zakres klapy wzdłuż wagonu (SZACUNKOWE)
const FLAP_C = (FLAP_X[0] + FLAP_X[1]) / 2;
const FLAP_L = FLAP_X[1] - FLAP_X[0];

// Dno siodłowe: pochylenie 49° (BDŽ Cargo), dolna krawędź przy ostojnicy
const SLOPE = Math.tan((49 * Math.PI) / 180);
const ZS = 1.38;               // dolna krawędź blachy dna (SZACUNKOWE)
const Y0 = 1.183;              // wysokość dolnej krawędzi dna (SZACUNKOWE)
const YR = Y0 + ZS * SLOPE;    // grzbiet siodła (wynika z kąta 49°)
const saddleY = (z) => Y0 + (ZS - Math.abs(z)) * SLOPE;

// Pochyłe ściany czołowe: dół przy x = 4,55 m, góra przy krawędzi 10 688 / 2 (SZACUNKOWE nachylenie)
const XE0 = 4.55, XE_K = (10.688 / 2 - 0.024 - XE0) / (TOP_Y - Y0);
const XE = (y) => XE0 + (y - Y0) * XE_K;
// pochyła nadstawa (górna część ściany bocznej): od EAVE_Z na wys. EAVE_Y do otworu u góry
const HOOD_K = (EAVE_Z - TOP_Z - 0.03) / (TOP_Y - EAVE_Y);
const hoodZ = (y) => EAVE_Z - (y - EAVE_Y) * HOOD_K;
// pół szerokości wnętrza na danej wysokości (dla ściany czołowej)
const innerHalfW = (y) => (y <= EAVE_Y ? ZI : hoodZ(y));

// Ostoja (SZACUNKOWE): ostojnica – zewnętrzna ściana z = 1,40, góra 1,16, dół 0,92
const SOLE_Z = 1.4;
const UF_TOP = 1.16;
const UF_BOT = 0.92;
export const HEAD_X = HALF_LEN - 0.2; // wewnętrzna krawędź belki czołowej
const CROSS_BOT = 0.95;        // spód wiązarów pod dnem (nad wózkami, pod hamulcem)

// Mechanizm (SZACUNKOWE): wał wzdłuż ostojnicy pod dolną krawędzią klap
const SHAFT = { y: 1.03, z: 1.47, r: 0.03, x: 4.2 };
const CLAWS = [FLAP_C - 1.12, FLAP_C + 1.12];     // zamki – 2 na klapę (razem 8, RCH)
const LINKS = [FLAP_C - 1.92, FLAP_C + 1.92];     // cięgła na końcach klapy (EP 0118068)
const BEARINGS = [1.6, 2.9, 4.0];
const CYL = { x0: -1.7, x1: -1.15, y: 0.78, z: 1.34, r: 0.075 }; // siłownik pneumatyczny
const DRIVE_X = -0.85;         // dźwignia napędowa wału
const VALVE = [-4.3, 1.03, 1.47]; // zawór sterujący (koniec 2, strona 1)

const sorted = (a, b) => (a < b ? [a, b] : [b, a]);
const sym = (xs) => [...xs, ...xs.map((x) => -x)];
// farba na pochyłych blachach (bez rdzy „na krawędziach” – normalne nie są równoległe do osi)
const P_SLOPE = paint(0x6a3a28, { edges: false, rust: 0.55 });

// ---------- Pomocnicze bryły ----------

// plateGeom (blacha o dowolnym obrysie) i beamGeom (belka między punktami) – w src/lib/geom.js

// ======================= WAGON =======================

export function buildFals() {
  const g = part('fals');
  slot(g, 'pudlo', { explode: [0, 1.8, 0] });
  slot(g, 'ostoja', { explode: [0, 0.6, 0] });
  slot(g, 'mechanizm_klap', { explode: [0, -0.25, 0] });
  slot(g, 'wozek_1', { pos: [PIVOT_X, 0, 0], explode: [1.6, 0, 0] });
  slot(g, 'wozek_2', { pos: [-PIVOT_X, 0, 0], rot: [0, Math.PI, 0], explode: [-1.6, 0, 0] });
  slot(g, 'ciegla_zderzaki_1', { pos: [HALF_LEN, BUF_Y, 0], explode: [2.4, 0, 0] });
  slot(g, 'ciegla_zderzaki_2', { pos: [-HALF_LEN, BUF_Y, 0], rot: [0, Math.PI, 0], explode: [-2.4, 0, 0] });
  // hamulec zespolony – układ elementów przesunięty przez "uklad" w data/fals.json
  slot(g, 'hamulec', { explode: [0, -0.1, 0] });
  return g;
}

// ======================= PUDŁO =======================

export function buildBody() {
  const g = part('pudlo');
  slot(g, 'dno_siodlowe', { explode: [0, -0.5, 0] });
  slot(g, 'sciana_boczna_1', { explode: [0, 0, 0.9] });
  slot(g, 'sciana_boczna_2', { rot: [0, Math.PI, 0], explode: [0, 0, -0.9] });
  slot(g, 'sciana_czolowa_1', { explode: [0.9, 0.1, 0] });
  slot(g, 'sciana_czolowa_2', { rot: [0, Math.PI, 0], explode: [-0.9, 0.1, 0] });
  slot(g, 'nadstawa_1', { explode: [0, 0.6, 0.6] });
  slot(g, 'nadstawa_2', { rot: [0, Math.PI, 0], explode: [0, 0.6, -0.6] });
  slot(g, 'pas_gorny_1', { explode: [0, 1.0, 0.3] });
  slot(g, 'pas_gorny_2', { rot: [0, Math.PI, 0], explode: [0, 1.0, -0.3] });
  return g;
}

// Dno siodłowe (ściana grzbietowa): dwie blachy pochylone pod kątem 49° od grzbietu w dół
// do klap, nakładka grzbietowa i listwy uszczelniające, na których opierają się klapy.
export function buildSaddle() {
  const g = part('dno_siodlowe');
  for (const s of [1, -1]) {
    const outline = [[-XE(Y0), ZS], [XE(Y0), ZS], [XE(YR), 0], [-XE(YR), 0]];
    mesh(plateGeom(outline, 0, 0.01, (u, v, w) => [u, saddleY(v) - w, s * v]), P_SLOPE, { parent: g });
    // listwa uszczelniająca (próg otworu wyładowczego) na ostojnicy
    const zr = sorted(s * (ZS - 0.01), s * (ZI - 0.004));
    boxFromTo([-FLAP_X[1], FLAP_X[1]], [UF_TOP + 0.005, Y0], zr, M.paintBody, { r: 0.004, parent: g });
    // spoina blacha dna – listwa
    weld([-FLAP_X[1], Y0 + 0.004, s * (ZS - 0.005)], [FLAP_X[1], Y0 + 0.004, s * (ZS - 0.005)], 0.005, { parent: g });
  }
  // nakładka grzbietowa (zaokrąglona) na styku blach
  cylinder(0.035, 2 * XE(YR) - 0.02, P_SLOPE, { axis: 'x', pos: [0, YR - 0.01, 0], seg: 20, parent: g });
  return g;
}

// Ściana boczna (strona +z; druga obrócona o 180°): stała część nad klapami z zawiasami,
// słupek środkowy z drabinką, narożniki przy ścianach czołowych. Klapy są osobnymi częściami.
export function buildSideWall() {
  const g = part('sciana_boczna');
  const P = M.paintBody;
  // klapy: początek układu klapy w osi zawiasów; otwierają się obrotem dolną krawędzią na zewnątrz
  slot(g, 'klapa_1', { pos: [FLAP_C, HINGE_Y, HINGE_Z], explode: [0.3, -0.2, 0.6], removeRot: [-0.85, 0, 0] });
  slot(g, 'klapa_2', { pos: [-FLAP_C, HINGE_Y, HINGE_Z], explode: [-0.3, -0.2, 0.6], removeRot: [-0.85, 0, 0] });

  // poszycie stałej części (pas nad klapami) – sięga do pochyłych ścian czołowych
  const band = [[-XE(BAND_Y), BAND_Y], [XE(BAND_Y), BAND_Y], [XE(EAVE_Y), EAVE_Y], [-XE(EAVE_Y), EAVE_Y]];
  mesh(plateGeom(band, 0, 0.008, (u, v, w) => [u, v, ZB + w]), P, { parent: g });
  // belka okapowa (profil zamknięty) na załamaniu ściany i nadstawy
  boxFromTo([-XE(EAVE_Y) + 0.01, XE(EAVE_Y) - 0.01], [EAVE_Y - 0.07, EAVE_Y + 0.01], [ZB, EAVE_Z], P, { r: 0.01, parent: g });
  // belka zawiasowa nad klapami
  boxFromTo([-XE(BAND_Y) + 0.01, XE(BAND_Y) - 0.01], [BAND_Y, BAND_Y + 0.07], [ZB, ZB + 0.035], P, { r: 0.008, parent: g });
  // użebrowanie pionowe pasa (profile kapeluszowe)
  const ribs = [];
  for (let x = -4.4; x <= 4.41; x += 0.88) ribs.push(...hatV(x, BAND_Y + 0.07, EAVE_Y - 0.07, ZB + 0.008, 0.08, 0.03));
  merged(ribs, P, { parent: g });
  // wsporniki zawiasów klap (po 3 na klapę)
  const hinges = [];
  for (const c of [FLAP_C, -FLAP_C]) for (const dx of [-1.7, 0, 1.7]) {
    for (const sx of [-1, 1]) hinges.push(boxGeom(0.012, 0.09, 0.05, [c + dx + sx * 0.075, BAND_Y + 0.02, HINGE_Z]));
  }
  merged(hinges, M.paintDark, { parent: g });
  for (const c of [FLAP_C, -FLAP_C]) for (const dx of [-1.7, 0, 1.7]) {
    cylinder(0.011, 0.17, M.steelMachined, { axis: 'x', pos: [c + dx, HINGE_Y, HINGE_Z], seg: 12, parent: g });
  }

  // słupek środkowy (ceownik) z drabinką – między klapami
  const yb = FLAP_Y, yt = BAND_Y;
  merged([
    boxGeom(0.16, yt - yb, 0.01, [0, (yb + yt) / 2, ZI + 0.005]),
    boxGeom(0.012, yt - yb, HALF_W - ZI - 0.002, [-0.074, (yb + yt) / 2, (ZI + HALF_W) / 2]),
    boxGeom(0.012, yt - yb, HALF_W - ZI - 0.002, [0.074, (yb + yt) / 2, (ZI + HALF_W) / 2]),
  ], P, { parent: g });
  // szczeble drabinki
  const rungs = [];
  for (let y = 1.3; y < yt - 0.1; y += 0.3) rungs.push(rodGeom([-0.068, y, 1.505], [0.068, y, 1.505], 0.011, 10));
  merged(rungs, M.paintDark, { parent: g });

  // narożniki: blacha między klapą a ścianą czołową + pochyły słupek narożny
  for (const sx of [1, -1]) {
    const x0 = FLAP_X[1] + 0.02;
    const outline = [[x0, FLAP_Y], [XE(FLAP_Y), FLAP_Y], [XE(BAND_Y), BAND_Y], [x0, BAND_Y]].map(([u, v]) => [sx * u, v]);
    if (sx < 0) outline.reverse();
    mesh(plateGeom(outline, 0, 0.008, (u, v, w) => [u, v, ZI + w]), P, { parent: g });
    merged([
      beamGeom([sx * (XE(FLAP_Y) - 0.03), FLAP_Y, 1.49], [sx * (XE(EAVE_Y) - 0.03), EAVE_Y - 0.06, 1.49], 0.07, 0.07),
      boxGeom(0.05, BAND_Y - FLAP_Y, 0.06, [sx * (x0 + 0.03), (FLAP_Y + BAND_Y) / 2, ZI + 0.035]),
    ], P, { parent: g });
  }
  // spoiny pasa z belką zawiasową
  weld([-4.3, BAND_Y + 0.072, ZB + 0.012], [4.3, BAND_Y + 0.072, ZB + 0.012], 0.004, { parent: g });
  return g;
}

// Klapa wyładowcza. Początek: oś zawiasów (środek długości klapy). Klapa zwisa w dół (−y),
// blacha od strony wnętrza (−z), użebrowanie na zewnątrz (+z).
export function buildFlap() {
  const g = part('klapa');
  const P = M.paintBody;
  const hl = FLAP_L / 2 - 0.005;
  const yb = FLAP_Y - HINGE_Y, yt = BAND_Y - 0.02 - HINGE_Y;   // dół i góra blachy (lokalnie)
  const z0 = ZI - HINGE_Z, t = 0.008;                          // blacha klapy
  boxFromTo([-hl, hl], [yb, yt], [z0, z0 + t], P, { r: 0.003, parent: g });
  // użebrowanie: poziome profile kapeluszowe i pionowe na końcach
  merged([
    ...[yb + 0.08, yb + 0.55, yb + 1.0].flatMap((y) => hatH(-hl + 0.1, hl - 0.1, y, z0 + t, 0.08, 0.05)),
    ...[-hl + 0.05, hl - 0.05].flatMap((x) => hatV(x, yb + 0.02, yt - 0.02, z0 + t, 0.09, 0.05)),
    ...[-0.85, 0.85].flatMap((x) => hatV(x, yb + 0.13, yt - 0.06, z0 + t, 0.07, 0.04)),
  ], P, { parent: g });
  // dolna krawędź: kątownik z listwą uszczelniającą (opiera się o próg dna)
  boxFromTo([-hl, hl], [yb, yb + 0.02], [SOLE_Z + 0.006 - HINGE_Z, z0], P, { r: 0.004, parent: g });
  boxFromTo([-hl + 0.02, hl - 0.02], [yb + 0.02, yb + 0.035], [SOLE_Z + 0.02 - HINGE_Z, z0 - 0.002], M.rubber, { r: 0.004, parent: g });
  // zawiasy: 3 tuleje w osi + okucia na blasze, przykręcone
  for (const x of [-1.7, 0, 1.7]) {
    cylinder(0.028, 0.12, M.paintDark, { axis: 'x', pos: [x, 0, 0], seg: 20, parent: g });
    box(0.1, 0.32, 0.014, M.paintDark, { pos: [x, -0.16, z0 + t + 0.007], r: 0.004, parent: g });
    bolts([[-0.03, -0.12], [0.03, -0.12], [-0.03, -0.26], [0.03, -0.26]].map(([dx, dy]) => ({ pos: [x + dx, dy, z0 + t + 0.014], dir: [0, 0, 1] })), 0.012, M.bolt, { parent: g });
  }
  // ucha zamków (2 na klapę) – trzymane przez zamki mechanizmu pod dolną krawędzią
  for (const dx of [-1.12, 1.12]) {
    boxFromTo([dx - 0.025, dx + 0.025], [1.07 - HINGE_Y, yb + 0.005], [1.468 - HINGE_Z, 1.5 - HINGE_Z], M.steelRaw, { r: 0.004, parent: g });
  }
  // ucha cięgieł na końcach klapy
  for (const dx of [-1.92, 1.92]) {
    boxFromTo([dx - 0.03, dx + 0.03], [1.065 - HINGE_Y, yb + 0.005], [1.495 - HINGE_Z, 1.525 - HINGE_Z], M.steelRaw, { r: 0.004, parent: g });
    cylinder(0.01, 0.07, M.steelMachined, { axis: 'x', pos: [dx, 1.08 - HINGE_Y, 1.51 - HINGE_Z], seg: 10, parent: g });
  }
  // spoiny użebrowania dolnego
  weld([-hl + 0.1, yb + 0.04, z0 + t + 0.003], [hl - 0.1, yb + 0.04, z0 + t + 0.003], 0.004, { parent: g });
  return g;
}

// Pochyła ściana czołowa (koniec +x; druga obrócona o 180°). Dół opiera się na dnie siodłowym.
export function buildEndWall() {
  const g = part('sciana_czolowa');
  const toX = (u, v, w) => [XE(v) + w, v, u];
  // obrys w płaszczyźnie (z, y): od dna siodłowego do górnej krawędzi – trzy wypukłe części
  // (dwie boczne nad spadkami dna i górna pod nadstawami), żeby triangulacja była pewna
  const pieces = [
    [[ZS, Y0], [ZI, Y0], [ZI, EAVE_Y], [0, EAVE_Y], [0, YR]],
    [[-ZS, Y0], [0, YR], [0, EAVE_Y], [-ZI, EAVE_Y], [-ZI, Y0]],
    [[ZI, EAVE_Y], [hoodZ(TOP_Y), TOP_Y], [-hoodZ(TOP_Y), TOP_Y], [-ZI, EAVE_Y]],
  ];
  // blacha zamykająca przestrzeń pod dnem siodłowym (nad belką środkową)
  for (const s of [1, -1]) {
    const c = [s * 0.25, 1.32];
    pieces.push(...[
      [c, [0, 1.32], [0, YR]], [c, [0, YR], [s * ZS, Y0]], [c, [s * ZS, Y0], [s * 0.25, Y0]],
    ]);
  }
  merged(pieces.map((o) => plateGeom(o, 0, 0.008, toX)), P_SLOPE, { parent: g });
  // użebrowanie zewnętrzne: poziome i pionowe płaskowniki na krawędź
  const ribs = [];
  for (const y of [1.9, 2.7, 3.45]) {
    const hw = innerHalfW(y) - 0.04;
    ribs.push(plateGeom([[-hw, y - 0.006], [hw, y - 0.006], [hw, y + 0.006], [-hw, y + 0.006]], 0.008, 0.07, toX));
  }
  for (const z of [-0.45, 0.45]) {
    const y0 = saddleY(z) + 0.04;
    ribs.push(plateGeom([[z - 0.006, y0], [z + 0.006, y0], [z + 0.006, TOP_Y - 0.06], [z - 0.006, TOP_Y - 0.06]], 0.008, 0.07, toX));
  }
  merged(ribs, P_SLOPE, { parent: g });
  // górna krawędź (rura) i spoiny z dnem
  cylinder(0.03, 2 * hoodZ(TOP_Y) + 0.04, M.paintBody, { axis: 'z', pos: [XE(TOP_Y) + 0.015, TOP_Y + 0.015, 0], seg: 16, parent: g });
  for (const s of [1, -1]) weld([XE(Y0) + 0.004, Y0 + 0.004, s * ZS], [XE(YR) + 0.004, YR, 0], 0.005, { parent: g });
  return g;
}

// Nadstawa – pochyła górna część ściany bocznej (strona +z), zwęża otwór ładunkowy
export function buildHood() {
  const g = part('nadstawa');
  const map = (u, v, w) => [u, v, hoodZ(v) + w];
  const outline = [[-XE(EAVE_Y), EAVE_Y], [XE(EAVE_Y), EAVE_Y], [XE(TOP_Y), TOP_Y], [-XE(TOP_Y), TOP_Y]];
  mesh(plateGeom(outline, 0, 0.006, map), P_SLOPE, { parent: g });
  // żebra (płaskowniki) wzdłuż spadku co ok. 1,3 m
  const ribs = [];
  for (let x = -3.9; x <= 3.91; x += 1.3) {
    ribs.push(plateGeom([[x - 0.006, EAVE_Y + 0.03], [x + 0.006, EAVE_Y + 0.03], [x + 0.006, TOP_Y - 0.06], [x - 0.006, TOP_Y - 0.06]], 0.006, 0.05, map));
  }
  merged(ribs, P_SLOPE, { parent: g });
  weld([-XE(EAVE_Y) + 0.03, EAVE_Y + 0.012, EAVE_Z + 0.004], [XE(EAVE_Y) - 0.03, EAVE_Y + 0.012, EAVE_Z + 0.004], 0.005, { parent: g });
  return g;
}

// Pas górny: rura wzdłuż krawędzi otworu ładunkowego (strona +z)
export function buildTopChord() {
  const g = part('pas_gorny');
  const r = (RIM_TOP - TOP_Y) / 2 + 0.003;
  const len = 2 * XE(TOP_Y);
  cylinder(r, len, M.paintBody, { axis: 'x', pos: [0, RIM_TOP - r, hoodZ(TOP_Y) - 0.01], seg: 20, parent: g });
  weld([-len / 2 + 0.05, TOP_Y - 0.004, hoodZ(TOP_Y) + 0.012], [len / 2 - 0.05, TOP_Y - 0.004, hoodZ(TOP_Y) + 0.012], 0.004, { parent: g });
  return g;
}

// ======================= OSTOJA =======================
const CORNERS = { 1: [1, 1], 2: [1, -1], 3: [-1, 1], 4: [-1, -1] }; // nr narożnika → [sx, sz]

export function buildUnderframe() {
  const g = part('ostoja');
  slot(g, 'ostojnica_1', { explode: [0, 0, 0.6] });
  slot(g, 'ostojnica_2', { rot: [0, Math.PI, 0], explode: [0, 0, -0.6] });
  slot(g, 'belka_czolowa_1', { explode: [0.7, 0, 0] });
  slot(g, 'belka_czolowa_2', { rot: [0, Math.PI, 0], explode: [-0.7, 0, 0] });
  slot(g, 'belka_skretowa_1', { pos: [PIVOT_X, 0, 0], explode: [0, -0.45, 0] });
  slot(g, 'belka_skretowa_2', { pos: [-PIVOT_X, 0, 0], rot: [0, Math.PI, 0], explode: [0, -0.45, 0] });
  slot(g, 'belka_srodkowa', { explode: [0, -0.3, 0] });
  slot(g, 'wiazary_dna', { explode: [0, 0.45, 0] });
  slot(g, 'pomost_1', { explode: [0.8, 0.3, 0] });
  slot(g, 'pomost_2', { rot: [0, Math.PI, 0], explode: [-0.8, 0.3, 0] });
  for (const [n, [sx, sz]] of Object.entries(CORNERS)) {
    slot(g, `stopien_manewrowy_${n}`, { explode: [sx * 0.3, -0.25, sz * 0.5] });
    slot(g, `porecz_manewrowa_${n}`, { explode: [sx * 0.5, 0.2, sz * 0.4] });
  }
  return g;
}

// Ostojnica (strona +z): ceownik pod progiem otworów wyładowczych
export function buildSoleBar() {
  const g = part('ostojnica');
  const P = M.paintBody;
  const t = 0.012, fl = 0.1;
  boxFromTo([-HEAD_X, HEAD_X], [UF_BOT, UF_TOP], [SOLE_Z - t, SOLE_Z], P, { r: 0.004, parent: g });
  boxFromTo([-HEAD_X, HEAD_X], [UF_BOT, UF_BOT + t], [SOLE_Z - fl, SOLE_Z], P, { r: 0.004, parent: g });
  boxFromTo([-HEAD_X, HEAD_X], [UF_TOP - t, UF_TOP], [SOLE_Z - fl, SOLE_Z], P, { r: 0.004, parent: g });
  // przepony wewnątrz ceownika (co ok. 0,9 m)
  const ribs = [];
  for (let x = -HEAD_X + 0.4; x < HEAD_X - 0.3; x += 0.9) ribs.push(boxGeom(0.01, UF_TOP - UF_BOT - 2 * t, fl - t, [x, (UF_BOT + UF_TOP) / 2, SOLE_Z - t - (fl - t) / 2]));
  merged(ribs, P, { parent: g });
  weld([-HEAD_X, UF_TOP - 0.004, SOLE_Z - fl - 0.003], [HEAD_X, UF_TOP - 0.004, SOLE_Z - fl - 0.003], 0.005, { parent: g });
  // uchwyty do podnoszenia wagonu nad belkami skrętowymi
  for (const sx of [1, -1]) box(0.3, 0.05, 0.03, M.paintDark, { pos: [sx * (PIVOT_X + 0.35), UF_BOT + 0.03, SOLE_Z + 0.016], r: 0.006, parent: g });
  return g;
}

// Belka czołowa (koniec +x): blacha czołowa z półkami, nakładki pod zderzaki, otwór haka
export function buildHeadstock() {
  const g = part('belka_czolowa');
  const P = M.paintBody;
  const y0 = 0.84, t = 0.012, xf = HALF_LEN - 0.012;
  const zr = [-(SOLE_Z + 0.04), SOLE_Z + 0.04];
  boxFromTo([xf - t, xf], [y0, UF_TOP], zr, P, { r: 0.004, parent: g });
  boxFromTo([HEAD_X, xf - t], [UF_TOP - t, UF_TOP], zr, P, { r: 0.004, parent: g });
  boxFromTo([HEAD_X, xf - t], [y0, y0 + t], zr, P, { r: 0.004, parent: g });
  boxFromTo([HEAD_X, HEAD_X + t], [y0, UF_TOP], zr, P, { r: 0.004, parent: g });
  for (const s of [1, -1]) {
    boxFromTo([xf, HALF_LEN], [BUF_Y - 0.19, Math.min(BUF_Y + 0.19, UF_TOP)], [s * BUF_Z - 0.2, s * BUF_Z + 0.2], P, { r: 0.004, parent: g });
    merged([-0.12, 0.12].map((dz) => boxGeom(0.18, UF_TOP - y0 - 2 * t, 0.01, [(HEAD_X + xf) / 2, (y0 + UF_TOP) / 2, s * BUF_Z + dz])), P, { parent: g });
  }
  const hy = [BUF_Y - 0.1, BUF_Y + 0.08], hz = 0.08;
  merged([
    boxGeom(0.02, 0.03, 2 * hz + 0.06, [xf + 0.006, hy[1] + 0.015, 0]),
    boxGeom(0.02, 0.03, 2 * hz + 0.06, [xf + 0.006, hy[0] - 0.015, 0]),
    boxGeom(0.02, hy[1] - hy[0], 0.03, [xf + 0.006, (hy[0] + hy[1]) / 2, hz + 0.015]),
    boxGeom(0.02, hy[1] - hy[0], 0.03, [xf + 0.006, (hy[0] + hy[1]) / 2, -hz - 0.015]),
  ], P, { parent: g });
  box(0.006, hy[1] - hy[0], 2 * hz, M.rubber, { pos: [xf + 0.001, (hy[0] + hy[1]) / 2, 0], r: 0.002, parent: g });
  for (const s of [1, -1]) weld([HEAD_X, y0 + 0.01, s * (SOLE_Z - 0.006)], [HEAD_X, UF_TOP - 0.01, s * (SOLE_Z - 0.006)], 0.006, { parent: g });
  return g;
}

// Belka skrętowa: belka skrzynkowa w poprzek wagonu, nad wózkiem. Początek: oś czopa skrętu.
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
  geo.rotateY(Math.PI / 2);
  mesh(geo, P, { parent: g });
  for (const z of [0.82, -0.82]) {
    box(0.2, 0.13, 0.12, M.paintBody, { pos: [0, 0.88, z], r: 0.008, parent: g });
    box(0.18, 0.012, 0.1, M.steelMachined, { pos: [0, 0.809, z], r: 0.002, parent: g });
  }
  for (const s of [1, -1]) for (const dx of [-0.186, 0.186]) weld([dx, ye, s * (ze - 0.004)], [dx, UF_TOP - 0.01, s * (ze - 0.004)], 0.006, { parent: g });
  return g;
}

// Belka środkowa: dwa ceowniki wzdłuż osi wagonu (wewnątrz – urządzenie cięgłowe)
export function buildCenterSill() {
  const g = part('belka_srodkowa');
  const P = M.paintBody;
  const y0 = 0.96, y1 = 1.3, t = 0.01, fl = 0.08;
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

// Wiązary dna: poprzeczne przepony pod blachami dna siodłowego, oparte na belce środkowej
// i ostojnicach (rozstaw SZACUNKOWY)
export function buildSaddleCrossBearers() {
  const g = part('wiazary_dna');
  const geoms = [];
  const z0 = 0.145, z1 = SOLE_Z - 0.105;
  const top = (z) => saddleY(z) - 0.013;
  for (const x of sym([0.95, 1.9, 4.15]).concat([0])) for (const s of [1, -1]) {
    const outline = [[z0, CROSS_BOT], [z1, CROSS_BOT], [z1, top(z1)], [z0, top(z0)]].map(([z, y]) => [s * z, y]);
    if (s < 0) outline.reverse();
    geoms.push(plateGeom(outline, -0.005, 0.005, (u, v, w) => [x + w, v, u]));
    geoms.push(boxGeom(0.08, 0.01, z1 - z0, [x, CROSS_BOT + 0.005, s * (z0 + z1) / 2]));
  }
  merged(geoms, M.paintBody, { parent: g });
  return g;
}

// Pomost (koniec +x; drugi obrócony o 180°): pomost z blachy ryflowanej nad belką czołową,
// z barierką. param.slupek_hamulca – słupek pod koło hamulca ręcznego.
// ======================= MECHANIZM OTWIERANIA KLAP =======================
// Wg instrukcji RCH: klapy zabezpieczone w czasie jazdy 8 zamkami, wszystkie cztery klapy
// otwierane jednocześnie dźwignią sterującą (położenie 2), zamykane z czoła wagonu (położenie 1),
// sprężone powietrze 8–10 bar, kurek odcinający na czole, zabezpieczenie w środku wagonu.
// Układ dźwigni i siłowników – SZACUNKOWY (uproszczony).

export function buildMechanism() {
  const g = part('mechanizm_klap');
  slot(g, 'naped_1', { explode: [0, 0, 0.7] });
  slot(g, 'naped_2', { rot: [0, Math.PI, 0], explode: [0, 0, -0.7] });
  slot(g, 'zawor_sterujacy', { explode: [-0.5, 0.3, 0.5] });
  slot(g, 'przewody_sterujace', { explode: [0, -0.35, 0] });
  return g;
}

// Napęd klap jednej strony (strona +z) – tylko gniazda
export function buildSideDrive() {
  const g = part('naped_klap');
  slot(g, 'wal', { explode: [0, -0.25, 0.15] });
  slot(g, 'zamki', { explode: [0, 0.15, 0.35] });
  slot(g, 'ciegla_klap', { explode: [0, 0.1, 0.55] });
  slot(g, 'silownik', { explode: [0, -0.45, 0.1] });
  slot(g, 'blokada', { explode: [0, -0.2, 0.45] });
  return g;
}

// Wał sterujący wzdłuż ostojnicy z łożyskami i dźwignią napędową
export function buildShaft() {
  const g = part('wal');
  const { y, z, r, x } = SHAFT;
  cylinder(r, 2 * x, M.steelRaw, { axis: 'x', pos: [0, y, z], seg: 20, parent: g });
  // łożyska (oprawy) przykręcone do ostojnicy
  for (const bx of sym(BEARINGS)) {
    cylinder(r + 0.016, 0.08, M.paintDark, { axis: 'x', pos: [bx, y, z], seg: 20, parent: g });
    boxFromTo([bx - 0.05, bx + 0.05], [y - 0.035, y + 0.035], [SOLE_Z + 0.002, z - r - 0.008], M.paintDark, { r: 0.005, parent: g });
    bolts([[-0.035, 0.022], [0.035, 0.022], [-0.035, -0.022], [0.035, -0.022]].map(([dx, dy]) => ({ pos: [bx + dx, y + dy, SOLE_Z + 0.004], dir: [0, 0, 1] })), 0.01, M.bolt, { parent: g, stick: 0 });
  }
  // dźwignia napędowa (od siłownika) – dwa płaskowniki
  const pin = [DRIVE_X, CYL.y, CYL.z];
  for (const dx of [-0.018, 0.018]) rod([DRIVE_X + dx, y, z], [pin[0] + dx, pin[1], pin[2]], 0.012, M.steelRaw, { seg: 8, parent: g });
  cylinder(r + 0.012, 0.07, M.steelRaw, { axis: 'x', pos: [DRIVE_X, y, z], seg: 16, parent: g });
  cylinder(0.012, 0.06, M.steelMachined, { axis: 'x', pos: pin, seg: 10, parent: g });
  return g;
}

// Zamki (Klauen): 4 na stronę, na wale – w położeniu „zamknięte” przytrzymują ucha klap
export function buildClaws() {
  const g = part('zamki');
  const { y, z } = SHAFT;
  // obrys zamka w płaszczyźnie (z, y): ramię od wału i pionowy pazur za uchem klapy
  const outline = [[1.44, 1.0], [1.5, 1.0], [1.525, 1.04], [1.525, 1.13], [1.505, 1.13], [1.505, 1.066], [1.485, 1.05], [1.44, 1.05]];
  const geoms = [];
  for (const c of [FLAP_C, -FLAP_C]) for (const dx of [-1.12, 1.12]) {
    const x = c + dx;
    geoms.push(plateGeom(outline, -0.015, 0.015, (u, v, w) => [x + w, v, u]));
    geoms.push(cylGeomX(SHAFT.r + 0.005, 0.05, [x, y, z]));
  }
  merged(geoms, M.steelRaw, { parent: g });
  return g;
}
function cylGeomX(r, h, pos) {
  const c = new THREE.CylinderGeometry(r, r, h, 16);
  c.rotateZ(-Math.PI / 2);
  c.translate(...pos);
  return c;
}

// Cięgła klap: korby na wale + cięgła do uch na końcach klap
export function buildFlapLinks() {
  const g = part('ciegla_klap');
  const { y, z } = SHAFT;
  for (const c of [FLAP_C, -FLAP_C]) for (const dx of [-1.92, 1.92]) {
    const x = c + dx;
    const pin = [x, 0.95, 1.51];
    cylinder(SHAFT.r + 0.006, 0.05, M.steelRaw, { axis: 'x', pos: [x, y, z], seg: 16, parent: g });
    rod([x, y, z], pin, 0.016, M.steelRaw, { seg: 10, parent: g });
    cylinder(0.012, 0.05, M.steelMachined, { axis: 'x', pos: pin, seg: 10, parent: g });
    // cięgło z widełkami do ucha klapy
    rod(pin, [x, 1.055, 1.51], 0.012, M.steelRaw, { seg: 10, parent: g });
  }
  return g;
}

// Blokada w środku wagonu – zabezpieczenie wału w położeniu „zamknięte”
export function buildLock() {
  const g = part('blokada');
  const { y, z } = SHAFT;
  cylinder(SHAFT.r + 0.014, 0.06, M.steelRaw, { axis: 'x', pos: [0, y, z], seg: 16, parent: g });
  // zapadka opuszczana w dół, z rękojeścią
  rod([0, y, z], [0, 0.9, 1.515], 0.014, M.paintRed, { seg: 10, parent: g });
  mesh(new THREE.SphereGeometry(0.022, 12, 8), M.paintRed, { pos: [0, 0.9, 1.515], parent: g });
  // gniazdo zapadki na ostojnicy
  boxFromTo([-0.05, 0.05], [0.94, 0.98], [SOLE_Z + 0.002, 1.5], M.paintDark, { r: 0.005, parent: g });
  return g;
}

// Przewody sterujące: od zaworu do siłowników obu stron, z kurkiem odcinającym.
// Bryłę buduje wspólny moduł (src/components/wyladunek), Fals podaje trasy rur.
const PIPES = (() => {
  const [vx, vy, vz] = VALVE;
  const yP = 0.9, zP = 1.3, xR = -4.7;
  const obejmy = [];
  for (const s of [1, -1]) for (const x of [-4.3, -3.2, -2.2, 0, 1.0]) {
    if (s > 0 && x > CYL.x0 - 0.1) continue;
    obejmy.push({ x, z: s * (zP + 0.02), y0: yP - 0.005, y1: UF_BOT + 0.005 });
  }
  return {
    trasy: [
      // strona 1: zawór → wzdłuż ostojnicy → siłownik strony 1
      [[vx, vy - 0.06, vz], [vx - 0.12, 0.93, vz], [xR, yP, 1.45], [xR, yP, zP], [CYL.x0 - 0.06, yP, zP], [CYL.x0 - 0.05, CYL.y, CYL.z]],
      // strona 2: odgałęzienie pod końcem wagonu na drugą stronę, potem wzdłuż ostojnicy
      [[xR, yP, zP], [xR, 0.86, 1.2], [xR, 0.86, -1.2], [xR, yP, -zP], [-CYL.x0 + 0.06, yP, -zP], [-CYL.x0 + 0.05, CYL.y, -CYL.z]],
    ],
    obejmy,
    kurek: [-4.55, 0.916, 1.461],
  };
})();

// Wszystkie buildery, których potrzebuje Fals (wagon + wspólne podzespoły)
export const builders = {
  ...y25Builders,
  ...drawGearBuilders,
  ...airBrakeBuilders,
  ...underframeBuilders,
  fals: buildFals,
  pudlo_fals: buildBody,
  dno_siodlowe_fals: buildSaddle,
  sciana_boczna_fals: buildSideWall,
  klapa_fals: buildFlap,
  sciana_czolowa_fals: buildEndWall,
  nadstawa_fals: buildHood,
  pas_gorny_fals: buildTopChord,
  ostoja_fals: buildUnderframe,
  ostojnica_fals: buildSoleBar,
  belka_czolowa_fals: buildHeadstock,
  belka_skretowa_fals: buildBolster,
  belka_srodkowa_fals: buildCenterSill,
  wiazary_dna_fals: buildSaddleCrossBearers,
  pomost_fals: buildPlatform,
  mechanizm_klap_fals: buildMechanism,
  naped_klap_fals: buildSideDrive,
  wal_fals: buildShaft,
  zamki_fals: buildClaws,
  ciegla_klap_fals: buildFlapLinks,
  silownik_fals: (node) => buildActuator(node, { ...CYL, x_dzwigni: DRIVE_X, y_mocowania: UF_BOT }),
  blokada_fals: buildLock,
  zawor_sterujacy_fals: (node) => buildControlValve(node, { poz: VALVE }),
  przewody_sterujace_fals: (node) => buildControlPipes(node, PIPES),
};
