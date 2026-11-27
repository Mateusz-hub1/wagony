// Wagon Falns (czteroosiowy wagon samowyładowczy z dnem siodłowym, ładowność ponad 60 t) –
// pudło z dwiema komorami (lejami), klapy wyładowcze, hydrauliczny mechanizm otwierania klap
// i rozmieszczenie wspólnych podzespołów.
// Układ: x wzdłuż wagonu (0 = środek), y w górę (0 = główka szyny), z w poprzek.
//
// Wymiary ze źródeł (zob. pole "zrodla" w data/falns.json):
//   Rail Cargo Group – karta Falns-x (typ 6636), rysunek wymiarowy: długość ze zderzakami 12 540 mm,
//   rozstaw czopów skrętu 7 500 mm, od lica zderzaka do czopa 2 520 mm (zderzak 620 mm → lico
//   belki czołowej 1 900 mm od czopa), wysokość 4 000 mm, szerokość 3 055 mm, otwór ładunkowy
//   u góry 1 950 mm, długość górnej krawędzi 10 960 mm, dwie komory po 5 485 mm, oś zderzaków
//   1 060 mm, rozstaw osi wózka 1 800 mm, koła 920 mm (wózki Y25), pomost 1 369 mm nad główką
//   szyny i barierka 2 369 mm (odczyt z rysunku – patrz do_sprawdzenia), stopień 340 mm.
//   DB Cargo – Güterwagenkatalog, Falns 181/183/184: dno siodłowe pochylone 49°, cztery klapy
//   boczne, dwie komory rozdzielone siodłem poprzecznym i ścianą działową (Falns 183), największe
//   wychylenie klap 4 300 mm, przerwa między otworami wyładowczymi (10 508 − 2 × 4 950 mm ≈ 0,6 m),
//   napęd hydrauliczny: pompa od zestawu kołowego, akumulator, cylinder nastawczy i cylinder
//   ryglujący, wały z zamkami krzywkowymi – 5 zamków na klapę (Falns 181), wskaźnik zamknięcia.
// Pozostałe wymiary (wysokości pasów, długość klap, profile, mechanizm) – SZACUNKOWE, do sprawdzenia.
import { THREE, M, paint, part, slot, mesh, box, boxFromTo, merged, boxGeom, cylinder, rod, rodGeom, bolts, weld, hatV, hatH, plateGeom, beamGeom, inheritedParam } from '../lib/geom.js';
import { y25Builders } from '../components/y25/index.js';
import { drawGearBuilders } from '../components/ciegla_zderzaki/index.js';
import { airBrakeBuilders } from '../components/hamulec/index.js';
import { underframeBuilders, buildPlatform } from '../components/ostoja/index.js';
import { buildActuator, buildControlValve, buildControlPipes } from '../components/wyladunek/index.js';

export const PIVOT_X = 3.75;   // pół rozstawu czopów skrętu (7 500 / 2, RCG 6636)
export const HALF_LEN = 5.65;  // lico belki czołowej: 3 750 + 1 900 (RCG 6636)
export const BUF_Y = 1.06;     // oś zderzaków nad główką szyny (RCG 6636)
export const BUF_Z = 0.875;    // pół rozstawu osi zderzaków (1750 / 2, rysunek RCG 6636)
const HALF_W = 3.055 / 2;      // największa szerokość (RCG 6636)
const EAVE_Z = 1.5125;         // początek pochyłej nadstawy (SZACUNKOWE)
const TOP_Z = 1.95 / 2;        // pół szerokości otworu ładunkowego u góry (RCG 6636)
const RIM_TOP = 4.0;           // najwyższy punkt wagonu (RCG 6636)
const TOP_Y = 3.955;           // górna krawędź blach nadstawy (SZACUNKOWE, pas górny nad nią)
const EAVE_Y = 3.2;            // załamanie ściana boczna / nadstawa (SZACUNKOWE)
const HINGE_Y = 2.64;          // oś zawiasów klap (SZACUNKOWE)
const HINGE_Z = 1.49;          // oś zawiasów klap w poprzek (SZACUNKOWE)
const BAND_Y = 2.66;           // dół stałej części ściany bocznej (nad klapami, SZACUNKOWE)
const FLAP_Y = 1.12;           // dolna krawędź klapy (SZACUNKOWE)
const ZI = 1.455;              // wewnętrzna powierzchnia klap i ścian bocznych (SZACUNKOWE)
const ZB = 1.47;               // poszycie stałej części ściany bocznej (SZACUNKOWE)
// Klapa: przerwa między klapami ok. 0,6 m (DB Falns 183), długość klapy SZACUNKOWA
// (DB Falns 183 podaje otwór 4 950 mm, ale to inna odmiana niż RCG 6636)
const FLAP_X = [0.3, 4.6];
const FLAP_C = (FLAP_X[0] + FLAP_X[1]) / 2;
const FLAP_L = FLAP_X[1] - FLAP_X[0];
const LOCKS = [-1.72, -0.86, 0, 0.86, 1.72];  // 5 zamków na klapę (DB Falns 181), rozstaw SZACUNKOWY
const LINKS = [-2.06, 2.06];                  // cięgła na końcach klapy (SZACUNKOWE)
const HINGES = [-1.8, 0, 1.8];                // zawiasy klapy (SZACUNKOWE)
// Otwarcie klapy: dolna krawędź (1,52 m pod osią zawiasu) wychyla się do 4 300 / 2 mm od osi
// wagonu (DB: największe wychylenie klap 4 300 mm) → kąt ok. 0,45 rad
const FLAP_OPEN = Math.asin((4.3 / 2 - HINGE_Z) / (HINGE_Y - FLAP_Y));

// Dno siodłowe: pochylenie 49° (DB Falns 181/183/184), dolna krawędź przy ostojnicy
const SLOPE = Math.tan((49 * Math.PI) / 180);
const ZS = 1.38;               // dolna krawędź blachy dna (SZACUNKOWE)
const Y0 = 1.183;              // wysokość dolnej krawędzi dna (SZACUNKOWE)
const YR = Y0 + ZS * SLOPE;    // grzbiet siodła (wynika z kąta 49°)
const saddleY = (z) => Y0 + (ZS - Math.abs(z)) * SLOPE;

// Pochyłe ściany czołowe: dół przy x = 4,75 m (SZACUNKOWE), góra przy krawędzi 10 960 / 2 (RCG)
const XE0 = 4.75, XE_K = (10.96 / 2 - 0.024 - XE0) / (TOP_Y - Y0);
const XE = (y) => XE0 + (y - Y0) * XE_K;
// pochyła nadstawa (górna część ściany bocznej): od EAVE_Z na wys. EAVE_Y do otworu u góry
const HOOD_K = (EAVE_Z - TOP_Z - 0.03) / (TOP_Y - EAVE_Y);
const hoodZ = (y) => EAVE_Z - (y - EAVE_Y) * HOOD_K;
// pół szerokości wnętrza na danej wysokości (dla ściany czołowej i działowej)
const innerHalfW = (y) => (y <= EAVE_Y ? ZI : hoodZ(y));

// Siodło poprzeczne i ściana działowa w środku wagonu (SZACUNKOWE)
const TS_FOOT = 0.29;          // stopa siodła poprzecznego (koniec otworu wyładowczego)
const TS_Y = 3.1;              // grzbiet siodła poprzecznego
const WALL_Y = 3.5;            // górna krawędź ściany działowej

// Ostoja (SZACUNKOWE): ostojnica – zewnętrzna ściana z = 1,40, góra 1,16, dół 0,92
const SOLE_Z = 1.4;
const UF_TOP = 1.16;
const UF_BOT = 0.92;
export const HEAD_X = HALF_LEN - 0.2; // wewnętrzna krawędź belki czołowej
const CROSS_BOT = 0.95;        // spód wiązarów pod dnem
const CROSS_X = [0, 0.9, 1.75, 2.6, 4.4]; // wiązary dna (SZACUNKOWE; ±)

// Pomost (RCG 6636: wierzch pomostu 1 369 mm, barierka 2 369 mm; reszta SZACUNKOWA)
const PLAT_Y = 1.369 - 0.025;  // spód blachy pomostu
const PLAT_X = 4.85;           // początek pomostu (za dołem ściany czołowej)

// Mechanizm (SZACUNKOWE): wał zamków wzdłuż ostojnicy pod dolną krawędzią klap
const SHAFT = { y: 1.03, z: 1.47, r: 0.03, x: 4.55 };
const BEARINGS = [1.18, 2.03, 2.88, 3.73, 4.33];
const XD = -1.75;              // wał poprzeczny (przekładnia) – przy wiązarze
const XS = { y: 0.86, z: 1.3, r: 0.03 };
const LEVER_PIN = { y: 0.92, z: 1.42 };        // sworzeń dźwigni wału zamków (strona +z)
const CYL = { x0: -2.3, x1: -1.95, y: 0.76, z: 0.7, r: 0.075 };    // cylinder nastawczy
const LCYL = { x0: -2.15, x1: -1.95, y: 0.76, z: -0.8, r: 0.045 }; // cylinder ryglujący
const IND_X = 0.2;             // wskaźnik zamknięcia (w słupku środkowym)
// zespół hydrauliczny na pomoście końca 1 (zbiornik, akumulator, pompa ręczna, zawór)
const VALVE = [5.08, 1.95, 0.6];

const sorted = (a, b) => (a < b ? [a, b] : [b, a]);
const sym = (xs) => [...new Set([...xs, ...xs.map((x) => -x)])];
// farba na pochyłych blachach (bez rdzy „na krawędziach” – normalne nie są równoległe do osi)
const P_SLOPE = paint(0x6a3a28, { edges: false, rust: 0.55 });
const P_YELLOW = paint(0xd9a614, { edges: false, rust: 0.25 });

// ======================= WAGON =======================

export function buildFalns() {
  const g = part('falns');
  slot(g, 'pudlo', { explode: [0, 1.8, 0] });
  slot(g, 'ostoja', { explode: [0, 0.6, 0] });
  slot(g, 'mechanizm_klap', { explode: [0, -0.25, 0] });
  slot(g, 'wozek_1', { pos: [PIVOT_X, 0, 0], explode: [1.6, 0, 0] });
  slot(g, 'wozek_2', { pos: [-PIVOT_X, 0, 0], rot: [0, Math.PI, 0], explode: [-1.6, 0, 0] });
  slot(g, 'ciegla_zderzaki_1', { pos: [HALF_LEN, BUF_Y, 0], explode: [2.4, 0, 0] });
  slot(g, 'ciegla_zderzaki_2', { pos: [-HALF_LEN, BUF_Y, 0], rot: [0, Math.PI, 0], explode: [-2.4, 0, 0] });
  // hamulec zespolony – układ elementów przesunięty przez "uklad" w data/falns.json
  slot(g, 'hamulec', { explode: [0, -0.1, 0] });
  return g;
}

// ======================= PUDŁO =======================

export function buildBody() {
  const g = part('pudlo');
  slot(g, 'lej_1', { explode: [0.5, -0.5, 0] });
  slot(g, 'lej_2', { rot: [0, Math.PI, 0], explode: [-0.5, -0.5, 0] });
  slot(g, 'siodlo_poprzeczne', { explode: [0, 1.2, 0] });
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

// Lej (komora) końca +x: dwie blachy dna siodłowego pochylone 49° od grzbietu w dół do klap,
// nakładka grzbietowa i progi otworów wyładowczych. Drugi lej – obrót o 180°.
export function buildHopper() {
  const g = part('lej');
  const x0 = 0.004;            // styk z drugim lejem pod siodłem poprzecznym
  for (const s of [1, -1]) {
    const outline = [[x0, ZS], [XE(Y0), ZS], [XE(YR), 0], [x0, 0]];
    if (s < 0) outline.reverse();
    mesh(plateGeom(outline, 0, 0.01, (u, v, w) => [u, saddleY(v) - w, s * v]), P_SLOPE, { parent: g });
    // próg otworu wyładowczego (listwa uszczelniająca) na ostojnicy – blacha nierdzewna (DB Falns 184)
    const zr = sorted(s * (ZS - 0.01), s * (ZI - 0.004));
    boxFromTo([FLAP_X[0] - 0.02, FLAP_X[1]], [UF_TOP + 0.005, Y0], zr, M.steelMachined, { r: 0.004, parent: g });
    weld([x0 + 0.05, Y0 + 0.004, s * (ZS - 0.005)], [FLAP_X[1], Y0 + 0.004, s * (ZS - 0.005)], 0.005, { parent: g });
  }
  // nakładka grzbietowa (kątownik nierdzewny wg DB Falns 184) na styku blach
  cylinder(0.035, XE(YR) - 0.03, M.steelMachined, { axis: 'x', pos: [(XE(YR) + 0.01) / 2, YR - 0.01, 0], seg: 20, parent: g });
  return g;
}

// Siodło poprzeczne ze ścianą działową: dzieli pudło na dwie komory (DB Falns 183).
// Dwie blachy od grzbietu (x = 0) w dół do końców otworów wyładowczych, nad nimi pionowa ściana.
export function buildCrossSaddle() {
  const g = part('siodlo_poprzeczne');
  const geoms = [];
  for (const s of [1, -1]) for (const h of [1, -1]) {
    // powierzchnia prostokreślna: stopa na dnie siodłowym, grzbiet na stałej wysokości TS_Y
    const outline = h > 0 ? [[0, 0], [ZS, 0], [ZS, 1], [0, 1]] : [[-ZS, 0], [0, 0], [0, 1], [-ZS, 1]];
    geoms.push(plateGeom(outline, 0, 0.008, (u, v, w) => [
      s * (TS_FOOT * (1 - v) + 0.012 * v - w), saddleY(u) + 0.012 + v * (TS_Y - saddleY(u) - 0.012), u,
    ]));
  }
  merged(geoms, P_SLOPE, { parent: g });
  // ściana działowa nad grzbietem
  const wall = [[-ZI + 0.005, TS_Y - 0.02], [ZI - 0.005, TS_Y - 0.02], [ZI - 0.005, EAVE_Y], [innerHalfW(WALL_Y) - 0.005, WALL_Y], [-innerHalfW(WALL_Y) + 0.005, WALL_Y], [-ZI + 0.005, EAVE_Y]];
  mesh(plateGeom(wall, -0.005, 0.005, (u, v, w) => [w, v, u]), M.paintBody, { parent: g });
  // górna krawędź (rura) i żebra pionowe ściany działowej
  cylinder(0.03, 2 * innerHalfW(WALL_Y) - 0.06, M.paintBody, { axis: 'z', pos: [0, WALL_Y + 0.02, 0], seg: 16, parent: g });
  const ribs = [];
  for (const z of [-0.7, 0, 0.7]) for (const s of [1, -1]) ribs.push(boxGeom(0.05, WALL_Y - TS_Y - 0.05, 0.01, [s * 0.03, (TS_Y + WALL_Y) / 2, z]));
  merged(ribs, M.paintBody, { parent: g });
  for (const s of [1, -1]) weld([s * 0.008, TS_Y, -ZI + 0.05], [s * 0.008, TS_Y, ZI - 0.05], 0.005, { parent: g });
  return g;
}

// Ściana boczna (strona +z; druga obrócona o 180°): stała część nad klapami z zawiasami,
// słupek środkowy z drabinką, narożniki przy ścianach czołowych. Klapy są osobnymi częściami.
export function buildSideWall() {
  const g = part('sciana_boczna');
  const P = M.paintBody;
  // klapy: początek układu klapy w osi zawiasów; otwierają się dolną krawędzią na zewnątrz
  slot(g, 'klapa_1', { pos: [FLAP_C, HINGE_Y, HINGE_Z], explode: [0.3, -0.2, 0.6], removeRot: [-FLAP_OPEN, 0, 0] });
  slot(g, 'klapa_2', { pos: [-FLAP_C, HINGE_Y, HINGE_Z], explode: [-0.3, -0.2, 0.6], removeRot: [-FLAP_OPEN, 0, 0] });

  // poszycie stałej części (pas nad klapami) – sięga do pochyłych ścian czołowych
  const band = [[-XE(BAND_Y), BAND_Y], [XE(BAND_Y), BAND_Y], [XE(EAVE_Y), EAVE_Y], [-XE(EAVE_Y), EAVE_Y]];
  mesh(plateGeom(band, 0, 0.008, (u, v, w) => [u, v, ZB + w]), P, { parent: g });
  // belka okapowa na załamaniu ściany i nadstawy
  boxFromTo([-XE(EAVE_Y) + 0.01, XE(EAVE_Y) - 0.01], [EAVE_Y - 0.07, EAVE_Y + 0.01], [ZB, EAVE_Z], P, { r: 0.01, parent: g });
  // belka zawiasowa nad klapami
  boxFromTo([-XE(BAND_Y) + 0.01, XE(BAND_Y) - 0.01], [BAND_Y, BAND_Y + 0.07], [ZB, ZB + 0.035], P, { r: 0.008, parent: g });
  // użebrowanie pionowe pasa (profile kapeluszowe)
  const ribs = [];
  for (let x = -4.5; x <= 4.51; x += 1.0) ribs.push(...hatV(x, BAND_Y + 0.07, EAVE_Y - 0.07, ZB + 0.008, 0.08, 0.03));
  merged(ribs, P, { parent: g });
  // wsporniki zawiasów klap (po 3 na klapę) ze sworzniami
  const hinges = [];
  for (const c of [FLAP_C, -FLAP_C]) for (const dx of HINGES) {
    for (const sx of [-1, 1]) hinges.push(boxGeom(0.012, 0.09, 0.05, [c + dx + sx * 0.075, BAND_Y + 0.02, HINGE_Z]));
  }
  merged(hinges, M.paintDark, { parent: g });
  for (const c of [FLAP_C, -FLAP_C]) for (const dx of HINGES) {
    cylinder(0.011, 0.17, M.steelMachined, { axis: 'x', pos: [c + dx, HINGE_Y, HINGE_Z], seg: 12, parent: g });
  }

  // słupek środkowy (ceownik ok. 0,56 m – przerwa między klapami) z drabinką
  const yb = FLAP_Y, yt = BAND_Y, hw = FLAP_X[0] - 0.02;
  merged([
    boxGeom(2 * hw, yt - yb, 0.01, [0, (yb + yt) / 2, ZI + 0.005]),
    boxGeom(0.012, yt - yb, HALF_W - ZI - 0.002, [-hw + 0.006, (yb + yt) / 2, (ZI + HALF_W) / 2]),
    boxGeom(0.012, yt - yb, HALF_W - ZI - 0.002, [hw - 0.006, (yb + yt) / 2, (ZI + HALF_W) / 2]),
  ], P, { parent: g });
  // szczeble drabinki (nad wskaźnikiem zamknięcia)
  const rungs = [];
  for (let y = 1.6; y < yt - 0.1; y += 0.3) rungs.push(rodGeom([-0.1, y, 1.505], [0.1, y, 1.505], 0.011, 10));
  merged(rungs, M.paintDark, { parent: g });
  // okienko wskaźnika (ramka)
  merged([boxGeom(0.16, 0.012, 0.05, [IND_X, 1.47, (ZI + HALF_W) / 2]), boxGeom(0.16, 0.012, 0.05, [IND_X, 1.17, (ZI + HALF_W) / 2])], M.paintDark, { parent: g });

  // narożniki: blacha między klapą a ścianą czołową + pochyły słupek narożny
  for (const sx of [1, -1]) {
    const x0 = FLAP_X[1] + 0.02;
    const outline = [[x0, FLAP_Y], [XE(FLAP_Y), FLAP_Y], [XE(BAND_Y), BAND_Y], [x0, BAND_Y]].map(([u, v]) => [sx * u, v]);
    if (sx < 0) outline.reverse();
    mesh(plateGeom(outline, 0, 0.008, (u, v, w) => [u, v, ZI + w]), P, { parent: g });
    merged([
      beamGeom([sx * (XE(FLAP_Y) - 0.03), FLAP_Y, 1.49], [sx * (XE(EAVE_Y) - 0.03), EAVE_Y - 0.06], 0.07, 0.07),
      boxGeom(0.05, BAND_Y - FLAP_Y, 0.06, [sx * (x0 + 0.03), (FLAP_Y + BAND_Y) / 2, ZI + 0.035]),
    ], P, { parent: g });
  }
  weld([-5.0, BAND_Y + 0.072, ZB + 0.012], [5.0, BAND_Y + 0.072, ZB + 0.012], 0.004, { parent: g });
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
  // użebrowanie: poziome profile kapeluszowe i pionowe na końcach i w środku
  merged([
    ...[yb + 0.08, yb + 0.55, yb + 1.0].flatMap((y) => hatH(-hl + 0.1, hl - 0.1, y, z0 + t, 0.08, 0.05)),
    ...[-hl + 0.05, hl - 0.05].flatMap((x) => hatV(x, yb + 0.02, yt - 0.02, z0 + t, 0.09, 0.05)),
    ...[-1.29, 1.29].flatMap((x) => hatV(x, yb + 0.13, yt - 0.06, z0 + t, 0.07, 0.04)),
  ], P, { parent: g });
  // dolna krawędź: kątownik z metalową listwą uszczelniającą (Cr-Ni, DB Falns 181)
  boxFromTo([-hl, hl], [yb, yb + 0.02], [SOLE_Z + 0.006 - HINGE_Z, z0], P, { r: 0.004, parent: g });
  boxFromTo([-hl + 0.02, hl - 0.02], [yb + 0.02, yb + 0.035], [SOLE_Z + 0.02 - HINGE_Z, z0 - 0.002], M.steelMachined, { r: 0.004, parent: g });
  // zawiasy: 3 tuleje w osi + okucia na blasze, przykręcone
  for (const x of HINGES) {
    cylinder(0.028, 0.12, M.paintDark, { axis: 'x', pos: [x, 0, 0], seg: 20, parent: g });
    box(0.1, 0.32, 0.014, M.paintDark, { pos: [x, -0.16, z0 + t + 0.007], r: 0.004, parent: g });
    bolts([[-0.03, -0.12], [0.03, -0.12], [-0.03, -0.26], [0.03, -0.26]].map(([dx, dy]) => ({ pos: [x + dx, dy, z0 + t + 0.014], dir: [0, 0, 1] })), 0.012, M.bolt, { parent: g });
  }
  // ucha zamków (5 na klapę) – trzymane przez zamki krzywkowe pod dolną krawędzią
  for (const dx of LOCKS) {
    boxFromTo([dx - 0.025, dx + 0.025], [1.07 - HINGE_Y, yb + 0.005], [1.468 - HINGE_Z, 1.5 - HINGE_Z], M.steelRaw, { r: 0.004, parent: g });
  }
  // ucha cięgieł na końcach klapy
  for (const dx of LINKS) {
    boxFromTo([dx - 0.03, dx + 0.03], [1.065 - HINGE_Y, yb + 0.005], [1.495 - HINGE_Z, 1.525 - HINGE_Z], M.steelRaw, { r: 0.004, parent: g });
    cylinder(0.01, 0.07, M.steelMachined, { axis: 'x', pos: [dx, 1.08 - HINGE_Y, 1.51 - HINGE_Z], seg: 10, parent: g });
  }
  weld([-hl + 0.1, yb + 0.04, z0 + t + 0.003], [hl - 0.1, yb + 0.04, z0 + t + 0.003], 0.004, { parent: g });
  return g;
}

// Pochyła ściana czołowa (koniec +x; druga obrócona o 180°). Dół opiera się na dnie siodłowym.
export function buildEndWall() {
  const g = part('sciana_czolowa');
  const toX = (u, v, w) => [XE(v) + w, v, u];
  // obrys w płaszczyźnie (z, y): trzy wypukłe części (dwie nad spadkami dna i górna pod nadstawami)
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
  for (const y of [2.3, 2.9, 3.5]) {
    const hw = innerHalfW(y) - 0.04;
    ribs.push(plateGeom([[-hw, y - 0.006], [hw, y - 0.006], [hw, y + 0.006], [-hw, y + 0.006]], 0.008, 0.07, toX));
  }
  for (const z of [-0.45, 0.45]) {
    const y0 = saddleY(z) + 0.04;
    ribs.push(plateGeom([[z - 0.006, y0], [z + 0.006, y0], [z + 0.006, TOP_Y - 0.06], [z - 0.006, TOP_Y - 0.06]], 0.008, 0.07, toX));
  }
  merged(ribs, P_SLOPE, { parent: g });
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
  const ribs = [];
  for (let x = -5.2; x <= 5.21; x += 1.3) {
    ribs.push(plateGeom([[x - 0.006, EAVE_Y + 0.03], [x + 0.006, EAVE_Y + 0.03], [x + 0.006, TOP_Y - 0.06], [x - 0.006, TOP_Y - 0.06]], 0.006, 0.05, map));
  }
  merged(ribs, P_SLOPE, { parent: g });
  weld([-XE(EAVE_Y) + 0.03, EAVE_Y + 0.012, EAVE_Z + 0.004], [XE(EAVE_Y) - 0.03, EAVE_Y + 0.012, EAVE_Z + 0.004], 0.005, { parent: g });
  return g;
}

// Pas górny: profil gięty z zaokrągloną górą (DB Falns 184) wzdłuż krawędzi otworu ładunkowego
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
  const ribs = [];
  for (let x = -HEAD_X + 0.4; x < HEAD_X - 0.3; x += 0.9) ribs.push(boxGeom(0.01, UF_TOP - UF_BOT - 2 * t, fl - t, [x, (UF_BOT + UF_TOP) / 2, SOLE_Z - t - (fl - t) / 2]));
  merged(ribs, P, { parent: g });
  weld([-HEAD_X, UF_TOP - 0.004, SOLE_Z - fl - 0.003], [HEAD_X, UF_TOP - 0.004, SOLE_Z - fl - 0.003], 0.005, { parent: g });
  // uchwyty do podnoszenia wagonu przy belkach skrętowych
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

// Wiązary dna: poprzeczne przepony pod blachami dna siodłowego (rozstaw SZACUNKOWY)
export function buildSaddleCrossBearers() {
  const g = part('wiazary_dna');
  const geoms = [];
  const z0 = 0.145, z1 = SOLE_Z - 0.105;
  const top = (z) => saddleY(z) - 0.013;
  for (const x of sym(CROSS_X)) for (const s of [1, -1]) {
    const outline = [[z0, CROSS_BOT], [z1, CROSS_BOT], [z1, top(z1)], [z0, top(z0)]].map(([z, y]) => [s * z, y]);
    if (s < 0) outline.reverse();
    geoms.push(plateGeom(outline, -0.005, 0.005, (u, v, w) => [x + w, v, u]));
    geoms.push(boxGeom(0.08, 0.01, z1 - z0, [x, CROSS_BOT + 0.005, s * (z0 + z1) / 2]));
  }
  merged(geoms, M.paintBody, { parent: g });
  return g;
}

// Pomost (koniec +x; drugi obrócony o 180°): wspólny moduł ostoi + wsporniki, bo pomost
// Falns leży wyżej niż wierzch ostoi (1 369 mm wg RCG 6636).
export function buildPlatformFalns(node) {
  const g = buildPlatform(node);
  const y0 = UF_TOP + 0.002, y1 = PLAT_Y - 0.001;
  const P = M.paintDark;
  // wsporniki nad ostojnicami (wzdłuż) i środkowy nad belką czołową
  merged([
    ...[1, -1].map((s) => boxGeom(HALF_LEN - 0.03 - PLAT_X - 0.02, y1 - y0, 0.06, [(PLAT_X + 0.02 + HALF_LEN - 0.03) / 2, (y0 + y1) / 2, s * 1.35])),
    boxGeom(0.4, y1 - 1.302, 0.3, [5.4, (1.302 + y1) / 2, 0]),
  ], P, { parent: g });
  return g;
}

// ======================= MECHANIZM OTWIERANIA KLAP (hydrauliczny) =======================
// Wg DB Cargo (Falns 181/183/184): wszystkie cztery klapy otwierane i zamykane jednocześnie
// przez wały z zamkami krzywkowymi (5 zamków na klapę), napęd hydrauliczny niezależny od
// zasilania z zewnątrz: pompa napędzana od zestawu kołowego ładuje akumulator tłokowy,
// zawór sterujący kieruje olej do cylindra ryglującego i cylindra nastawczego; obsługa kluczem
// z pomostu obsługi przy zasobniku albo dźwigniami ze ściany czołowej (z pomostu), awaryjnie
// pompą ręczną. Żółty wskaźnik w środku wagonu pokazuje, czy klapy są zamknięte i zaryglowane.
// Układ dźwigni i położenie elementów – SZACUNKOWE (uproszczone).

export function buildMechanism() {
  const g = part('mechanizm_klap');
  slot(g, 'naped_1', { explode: [0, 0, 0.7] });
  slot(g, 'naped_2', { rot: [0, Math.PI, 0], explode: [0, 0, -0.7] });
  slot(g, 'przekladnia', { explode: [0, -0.35, 0] });
  slot(g, 'silownik', { explode: [-0.3, -0.45, 0.2] });
  slot(g, 'silownik_ryglujacy', { explode: [-0.3, -0.45, -0.2] });
  slot(g, 'zespol_hydrauliczny', { explode: [0.6, 0.4, 0] });
  slot(g, 'zawor_sterujacy', { explode: [0.6, 0.3, 0.5] });
  slot(g, 'przewody_sterujace', { explode: [0, -0.6, 0] });
  slot(g, 'wskaznik_zamkniecia_1', { explode: [0, 0.2, 0.5] });
  slot(g, 'wskaznik_zamkniecia_2', { rot: [0, Math.PI, 0], explode: [0, 0.2, -0.5] });
  return g;
}

// Napęd klap jednej strony (strona +z) – tylko gniazda
export function buildSideDrive() {
  const g = part('naped_klap');
  slot(g, 'wal', { explode: [0, -0.25, 0.15] });
  slot(g, 'zamki', { explode: [0, 0.15, 0.35] });
  slot(g, 'ciegla_klap', { explode: [0, 0.1, 0.55] });
  return g;
}

// Wał zamków wzdłuż ostojnicy z łożyskami i dźwignią od przekładni.
// param.x_dzwigni – położenie dźwigni w układzie napędu (strona 2 jest obrócona o 180°)
export function buildShaft(node) {
  const g = part('wal');
  const { y, z, r, x } = SHAFT;
  const xd = inheritedParam(node, { x_dzwigni: XD }).x_dzwigni;
  cylinder(r, 2 * x, M.steelRaw, { axis: 'x', pos: [0, y, z], seg: 20, parent: g });
  // łożyska (oprawy) przykręcone do ostojnicy
  for (const bx of sym(BEARINGS)) {
    cylinder(r + 0.016, 0.08, M.paintDark, { axis: 'x', pos: [bx, y, z], seg: 20, parent: g });
    boxFromTo([bx - 0.05, bx + 0.05], [y - 0.035, y + 0.035], [SOLE_Z + 0.002, z - r - 0.008], M.paintDark, { r: 0.005, parent: g });
    bolts([[-0.035, 0.022], [0.035, 0.022], [-0.035, -0.022], [0.035, -0.022]].map(([dx, dy]) => ({ pos: [bx + dx, y + dy, SOLE_Z + 0.004], dir: [0, 0, 1] })), 0.01, M.bolt, { parent: g, stick: 0 });
  }
  // dźwignia wału (od drążka przekładni) – dwa płaskowniki i sworzeń
  const pin = [xd, LEVER_PIN.y, LEVER_PIN.z];
  for (const dx of [-0.018, 0.018]) rod([xd + dx, y, z], [pin[0] + dx, pin[1], pin[2]], 0.01, M.steelRaw, { seg: 8, parent: g });
  cylinder(r + 0.012, 0.07, M.steelRaw, { axis: 'x', pos: [xd, y, z], seg: 16, parent: g });
  cylinder(0.01, 0.06, M.steelMachined, { axis: 'x', pos: pin, seg: 10, parent: g });
  return g;
}

// Zamki krzywkowe: 5 na klapę (10 na stronę) – w położeniu „zamknięte” przytrzymują ucha klap
export function buildClaws() {
  const g = part('zamki');
  const { y, z } = SHAFT;
  // obrys zamka w płaszczyźnie (z, y): ramię od wału i pazur za uchem klapy
  const outline = [[1.44, 1.0], [1.5, 1.0], [1.525, 1.04], [1.525, 1.13], [1.505, 1.13], [1.505, 1.066], [1.485, 1.05], [1.44, 1.05]];
  const geoms = [];
  for (const c of [FLAP_C, -FLAP_C]) for (const dx of LOCKS) {
    const xx = c + dx;
    geoms.push(plateGeom(outline, -0.015, 0.015, (u, v, w) => [xx + w, v, u]));
    const hub = new THREE.CylinderGeometry(SHAFT.r + 0.005, SHAFT.r + 0.005, 0.05, 16);
    hub.rotateZ(-Math.PI / 2);
    hub.translate(xx, y, z);
    geoms.push(hub);
  }
  merged(geoms, M.steelRaw, { parent: g });
  return g;
}

// Cięgła klap: korby na wale + cięgła do uch na końcach klap
export function buildFlapLinks() {
  const g = part('ciegla_klap');
  const { y, z } = SHAFT;
  for (const c of [FLAP_C, -FLAP_C]) for (const dx of LINKS) {
    const xx = c + dx;
    const pin = [xx, 0.95, 1.51];
    cylinder(SHAFT.r + 0.006, 0.05, M.steelRaw, { axis: 'x', pos: [xx, y, z], seg: 16, parent: g });
    rod([xx, y, z], pin, 0.016, M.steelRaw, { seg: 10, parent: g });
    cylinder(0.012, 0.05, M.steelMachined, { axis: 'x', pos: pin, seg: 10, parent: g });
    rod(pin, [xx, 1.055, 1.51], 0.012, M.steelRaw, { seg: 10, parent: g });
  }
  return g;
}

// Przekładnia: wał poprzeczny pod ostoją, łączący wały zamków obu stron; dźwignie cylindra
// nastawczego i ryglującego, drążki do dźwigni wałów zamków, wieszaki do wiązara dna.
export function buildCrossShaft() {
  const g = part('przekladnia');
  const { y, z, r } = XS;
  cylinder(r, 2 * z, M.steelRaw, { axis: 'z', pos: [XD, y, 0], seg: 20, parent: g });
  // wieszaki z łożyskami do pasa dolnego wiązara
  for (const zz of [-1.12, -0.45, 0.45, 1.12]) {
    cylinder(r + 0.015, 0.06, M.paintDark, { axis: 'z', pos: [XD, y, zz], seg: 16, parent: g });
    boxFromTo([XD - 0.025, XD + 0.025], [y + r + 0.005, CROSS_BOT - 0.001], [zz - 0.03, zz + 0.03], M.paintDark, { r: 0.004, parent: g });
  }
  for (const s of [1, -1]) {
    // korba na końcu wału i drążek do dźwigni wału zamków
    const crank = [XD, y - 0.1, s * z];
    for (const dz of [-0.016, 0.016]) rod([XD, y, s * z + dz], [crank[0], crank[1], crank[2] + dz], 0.01, M.steelRaw, { seg: 8, parent: g });
    cylinder(0.01, 0.06, M.steelMachined, { axis: 'z', pos: crank, seg: 10, parent: g });
    rod(crank, [XD, LEVER_PIN.y - 0.012, s * (LEVER_PIN.z - 0.012)], 0.012, M.steelRaw, { seg: 10, parent: g });
  }
  // dźwignie cylindrów (w dół do sworzni tłoczysk)
  for (const c of [CYL, LCYL]) {
    rod([XD, y, c.z], [XD, c.y, c.z], 0.014, M.steelRaw, { seg: 10, parent: g });
    cylinder(0.012, 0.08, M.steelMachined, { axis: 'z', pos: [XD, c.y, c.z], seg: 10, parent: g });
  }
  return g;
}

// Wskaźnik zamknięcia (strona +z): żółta tarcza w słupku środkowym, przesuwana popychaczem
// od wału zamków (wysunięta = klapy nie są zamknięte i zaryglowane)
export function buildIndicator() {
  const g = part('wskaznik_zamkniecia');
  const { y, z, r } = SHAFT;
  // krzywka na wale i popychacz w górę
  cylinder(r + 0.008, 0.05, M.steelRaw, { axis: 'x', pos: [IND_X, y, z], seg: 16, parent: g });
  rod([IND_X, y + r + 0.006, z + 0.005], [IND_X, 1.24, 1.492], 0.009, M.steelRaw, { seg: 8, parent: g });
  // tarcza (żółte tło) z obramowaniem
  box(0.12, 0.15, 0.008, P_YELLOW, { pos: [IND_X, 1.32, 1.496], r: 0.003, parent: g });
  box(0.04, 0.02, 0.012, M.paintDark, { pos: [IND_X, 1.24, 1.496], r: 0.003, parent: g });
  return g;
}

// Zespół hydrauliczny na pomoście końca 1 – tylko gniazda
export function buildHydraulicUnit() {
  const g = part('zespol_hydrauliczny');
  slot(g, 'zbiornik_oleju', { explode: [0.4, 0.2, -0.3] });
  slot(g, 'akumulator', { explode: [0.4, 0.5, 0] });
  slot(g, 'pompa_reczna', { explode: [0.4, 0.3, 0.2] });
  return g;
}
const onPlate = PLAT_Y + 0.028;                    // stopa na blasze pomostu
const wallGap = (y) => XE(y) + 0.015;              // odstęp od ściany czołowej na wysokości y

// Zbiornik oleju z wziernikiem i zaworami
export function buildOilTank() {
  const g = part('zbiornik_oleju');
  const y1 = 1.75, x0 = wallGap(y1);
  boxFromTo([x0, x0 + 0.18], [onPlate, y1], [-1.05, -0.75], M.paintDark, { r: 0.012, parent: g });
  // wziernik (poziom naładowania) i korek wlewu
  box(0.006, 0.12, 0.04, M.steelMachined, { pos: [x0 + 0.183, 1.58, -0.9], r: 0.002, parent: g });
  cylinder(0.025, 0.03, M.paintRed, { pos: [x0 + 0.09, y1 + 0.015, -0.95], seg: 14, parent: g });
  bolts([[-0.97], [-0.83]].map(([zz]) => ({ pos: [x0 + 0.09, onPlate, zz], dir: [0, 1, 0] })), 0.012, M.bolt, { parent: g });
  return g;
}

// Akumulator tłokowy (pionowy cylinder) w obejmach
export function buildAccumulator() {
  const g = part('akumulator');
  const y1 = 2.0, rr = 0.08, xc = wallGap(y1) + rr + 0.005;
  cylinder(rr, y1 - onPlate, M.paintDarkRound, { pos: [xc, (onPlate + y1) / 2, -0.5], seg: 28, parent: g });
  for (const yy of [onPlate + 0.01, y1 - 0.01]) cylinder(rr + 0.008, 0.02, M.paintDark, { pos: [xc, yy, -0.5], seg: 28, parent: g });
  for (const yy of [1.6, 1.85]) box(0.02, 0.04, 2 * rr + 0.04, M.paintDark, { pos: [xc - rr - 0.008, yy, -0.5], r: 0.004, parent: g });
  // przyłącze manometru (Minimess)
  cylinder(0.012, 0.04, M.steelMachined, { pos: [xc, y1 + 0.02, -0.5], seg: 10, parent: g });
  return g;
}

// Pompa ręczna (awaryjna) z dźwignią
export function buildHandPump() {
  const g = part('pompa_reczna');
  const x0 = wallGap(1.65) + 0.01;
  boxFromTo([x0, x0 + 0.12], [onPlate, 1.45], [-0.26, -0.14], M.paintDark, { r: 0.01, parent: g });
  boxFromTo([x0 + 0.01, x0 + 0.11], [1.45, 1.62], [-0.25, -0.15], M.paintDarkRound, { r: 0.012, parent: g });
  rod([x0 + 0.06, 1.62, -0.2], [x0 + 0.26, 1.9, -0.2], 0.012, M.paintRed, { seg: 10, parent: g });
  mesh(new THREE.SphereGeometry(0.02, 12, 8), M.paintRed, { pos: [x0 + 0.26, 1.9, -0.2], parent: g });
  return g;
}

// Zawór sterujący z dźwignią na ścianie czołowej (wspólny moduł) + wspornik do ściany
export function buildValveFalns(node) {
  const g = buildControlValve(node, { poz: VALVE });
  const [x, y, z] = VALVE;
  boxFromTo([XE(y + 0.05) + 0.015, x - 0.06], [y - 0.04, y + 0.04], [z - 0.03, z + 0.03], M.paintDark, { r: 0.004, parent: g });
  return g;
}

// Przewody hydrauliczne: zawór → cylinder nastawczy i ryglujący (po dwa: otwieranie i zamykanie),
// zbiornik → akumulator → zawór; rury pod dnem przechodzą przez wiązary.
const PIPES = (() => {
  const [, vy] = VALVE;
  const yU = 1.25;
  // każdy przewód schodzi pionowo od spodu zaworu (własne x), pod blachą pomostu przechodzi
  // w poprzek (nad belką środkową) na swoje z, a potem biegnie pod dnem wzdłuż wagonu
  const line = (x, yCross, zEnd, endPts) => [[x, vy - 0.06, 0.565], [x, yCross, 0.565], [x, yCross, zEnd], [x, yU, zEnd], ...endPts];
  const zA = 0.88, zB = 0.915, zL = -0.85, zL2 = -0.885;
  return {
    trasy: [
      // cylinder nastawczy – przyłącze od strony dna
      line(5.03, 1.32, zA, [[-1.6, yU, zA], [CYL.x0 - 0.06, 1.0, zA], [CYL.x0 - 0.06, CYL.y, CYL.z], [CYL.x0 - 0.045, CYL.y, CYL.z]]),
      // cylinder nastawczy – przyłącze od strony tłoczyska
      line(5.055, 1.32, zB, [[-1.6, yU, zB], [CYL.x1, 1.0, zB], [CYL.x1, CYL.y + CYL.r + 0.01, CYL.z]]),
      // cylinder ryglujący (dwa przewody), w poprzek na dwóch wysokościach
      line(5.08, 1.312, zL, [[-1.6, yU, zL], [LCYL.x0 - 0.06, 1.0, zL], [LCYL.x0 - 0.06, LCYL.y, LCYL.z], [LCYL.x0 - 0.045, LCYL.y, LCYL.z]]),
      line(5.105, 1.334, zL2, [[-1.6, yU, zL2], [LCYL.x1, 1.0, zL2], [LCYL.x1, LCYL.y + LCYL.r + 0.01, LCYL.z]]),
    ],
    r: 0.009,
    // obejmy przy wiązarach dna
    obejmy: [0.9, 2.6, -0.9].flatMap((x) => [zA, zL].map((z) => ({ x: x + 0.03, z, y0: yU - 0.01, y1: yU + 0.06 }))),
    // zawór odcinający na przewodzie przy zaworze sterującym
    kurek: [5.03, 1.62, 0.565],
  };
})();
// krótkie przewody na pomoście: zbiornik → pompa ręczna → akumulator → zawór (SZACUNKOWE)
function buildPipesFalns(node) {
  const g = buildControlPipes(node, PIPES);
  const xa = wallGap(2.0) + 0.085, xt = wallGap(1.75) + 0.09;
  const pts = [
    [[xt, 1.5, -0.75], [xt, 1.5, -0.6], [xa, 1.5, -0.58]],
    [[xt + 0.03, 1.42, -0.75], [xt + 0.03, 1.42, -0.26]],
    [[xa, 1.9, -0.42], [xa, 1.9, 0.3], [VALVE[0] - 0.03, 1.9, 0.3], [VALVE[0] - 0.03, 1.9, 0.555]],
  ];
  merged(pts.flatMap((p) => p.slice(1).map((b, i) => rodGeom(p[i], b, 0.009, 10))), M.paintDarkRound, { parent: g });
  return g;
}

// Wszystkie buildery, których potrzebuje Falns (wagon + wspólne podzespoły)
export const builders = {
  ...y25Builders,
  ...drawGearBuilders,
  ...airBrakeBuilders,
  ...underframeBuilders,
  falns: buildFalns,
  pudlo_falns: buildBody,
  lej_falns: buildHopper,
  siodlo_poprzeczne_falns: buildCrossSaddle,
  sciana_boczna_falns: buildSideWall,
  klapa_falns: buildFlap,
  sciana_czolowa_falns: buildEndWall,
  nadstawa_falns: buildHood,
  pas_gorny_falns: buildTopChord,
  ostoja_falns: buildUnderframe,
  ostojnica_falns: buildSoleBar,
  belka_czolowa_falns: buildHeadstock,
  belka_skretowa_falns: buildBolster,
  belka_srodkowa_falns: buildCenterSill,
  wiazary_dna_falns: buildSaddleCrossBearers,
  pomost_falns: buildPlatformFalns,
  mechanizm_klap_falns: buildMechanism,
  naped_klap_falns: buildSideDrive,
  wal_falns: buildShaft,
  zamki_falns: buildClaws,
  ciegla_klap_falns: buildFlapLinks,
  przekladnia_falns: buildCrossShaft,
  silownik_falns: (node) => buildActuator(node, { ...CYL, x_dzwigni: XD, y_mocowania: CROSS_BOT }),
  silownik_ryglujacy_falns: (node) => buildActuator(node, { ...LCYL, x_dzwigni: XD, y_mocowania: CROSS_BOT }),
  wskaznik_falns: buildIndicator,
  zespol_hydrauliczny_falns: buildHydraulicUnit,
  zbiornik_oleju_falns: buildOilTank,
  akumulator_falns: buildAccumulator,
  pompa_reczna_falns: buildHandPump,
  zawor_sterujacy_falns: buildValveFalns,
  przewody_sterujace_falns: buildPipesFalns,
};
