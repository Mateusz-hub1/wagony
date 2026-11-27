// Wagon Res (czteroosiowa platforma z opuszczanymi burtami, kłonicami i drewnianą podłogą) –
// nadwozie (podłoga, burty boczne i czołowe), ostoja i rozmieszczenie wspólnych podzespołów.
// Układ: x wzdłuż wagonu (0 = środek), y w górę (0 = główka szyny), z w poprzek.
//
// Wymiary ze źródeł (zob. pole "zrodla" w data/res.json):
//   BDŽ Cargo – Res: długość ze zderzakami 19 900 mm, rozstaw czopów skrętu 14 860 mm,
//   długość ładunkowa 18 500 mm, szerokość ładunkowa 2 640 mm, 16 kłonic obrotowych (8 na stronę).
//   Đuro Đaković – Rens: 19 900 mm, rozstaw czopów 14 860 mm, wózki Y25.
//   DB Cargo – Res 675: podłoga z desek grubości 70 mm ułożonych w poprzek wagonu, 2 burty czołowe,
//   hamulec KE-GP z jednym cylindrem 355 mm, hamulec postojowy obsługiwany z ziemi.
//   DB Cargo – Res 677: 18 burt bocznych (9 na stronę), 8 kłonic obrotowych na stronę.
//   Ermewa – instrukcja Res (R90): burty opuszczane o ok. 90° (do rampy) albo pionowo w dół,
//   burty czołowe opuszczane do poziomu; przed opuszczeniem trzeba odchylić kłonice obrotowe
//   i zwolnić zamknięcia.
// Długość między licami belek czołowych: 19 900 − 2 × 620 mm (długość zderzaka BUFFER_LEN
// z src/components/ciegla_zderzaki/buffer.js – tam SZACUNKOWA) = 18 660 mm.
// Pozostałe wymiary (wysokość podłogi i burt, profile, zawiasy, zamknięcia) – SZACUNKOWE.
import { THREE, M, part, slot, mesh, box, boxFromTo, merged, boxGeom, cylinder, rod, rodGeom, bolts, rivets, weld, inheritedParam, ringGeom } from '../lib/geom.js';
import { y25Builders } from '../components/y25/index.js';
import { drawGearBuilders } from '../components/ciegla_zderzaki/index.js';
import { airBrakeBuilders } from '../components/hamulec/index.js';
import { cfg, layout } from '../components/hamulec/config.js';
import { underframeBuilders } from '../components/ostoja/index.js';
import { cargoBuilders } from '../components/ladunek/index.js';

export const PIVOT_X = 7.43;   // pół rozstawu czopów skrętu (14 860 / 2)
export const HALF_LEN = 9.33;  // lico belki czołowej: (19 900 − 2 × 620) / 2 – długość zderzaka SZACUNKOWA
export const BUF_Y = 1.03;     // oś zderzaków i haka nad główką szyny (SZACUNKOWE, jak w Eaos)
export const FLOOR_Y = 1.25;   // góra podłogi nad główką szyny (SZACUNKOWE)
const PLANK_T = 0.07;          // grubość desek podłogi (DB Cargo Res 675: 70 mm)
const UF_TOP = FLOOR_Y - PLANK_T; // góra ostoi (deski leżą na ostoi)
const IN_X = 18.5 / 2;         // pół długości ładunkowej (18 500 mm)
const IN_Z = 2.64 / 2;         // pół szerokości ładunkowej (2 640 mm)
const WALL_H = 0.5;            // wysokość burt nad podłogą (SZACUNKOWE; Res-x 679: wysokość ładunkowa 520 mm)

// Ostoja (SZACUNKOWE): ostojnice rybowe (głębsze w środku), zewnętrzna ściana środnika z = 1,40
const SOLE_Z = 1.4;            // zewnętrzna powierzchnia środnika ostojnicy
const SOLE_T = 0.012;          // grubość środnika
const SOLE_FL = [1.22, 1.4];   // półka górna (szeroka – podpiera końce desek)
const SOLE_END = 0.92;         // spód ostojnicy przy końcach (nad wózkami)
const SOLE_MID = 0.62;         // spód ostojnicy w środku („brzuch rybowy”)
const BELLY_X = [4.0, 5.0];    // początek i koniec skosu ostojnicy (od środka wagonu)
const CROSS_BOT = 0.95;        // spód poprzecznic i belki środkowej (wsporniki hamulca)
const STRINGER_Z = 0.75;       // podłużnice pod deskami (± z)
export const HEAD_X = HALF_LEN - 0.2; // wewnętrzna krawędź belki czołowej
const POCKET_Y = 1.16;         // górna krawędź kieszeni kłonic (SZACUNKOWE)
const RING_Y = 1.1;            // wysokość uchwytów mocujących na ostojnicy (SZACUNKOWE)

// Burty boczne (SZACUNKOWE): 9 na stronę (Res 677), między nimi szczeliny z kłonicami.
// Burta obraca się wokół zawiasów przy dolnej zewnętrznej krawędzi.
const HINGE_Y = 1.215;         // oś zawiasów burt (bocznych i czołowych)
const HINGE_Z = 1.425;         // oś zawiasów burt bocznych w poprzek
const N_SIDE = 9;              // burt na stronę
const GAP = 0.19;              // szczelina między burtami (miejsce na kłonicę)
const PX = IN_X - 0.005;       // skrajny koniec burt bocznych
const PL = (2 * PX - (N_SIDE - 1) * GAP) / N_SIDE; // długość jednej burty
const panelX = (i) => -PX + PL / 2 + i * (PL + GAP); // środek burty i (0..8)
const JOINTS = Array.from({ length: N_SIDE - 1 }, (_, k) => -PX + (k + 1) * (PL + GAP) - GAP / 2);
const HINGE_DX = 0.6;          // zawiasy: środek burty ± 0,6 m
// przekrój burty w układzie zawiasu (lokalnie): z od ZI (wnętrze) do ZO (zewnętrzna krawędź profili)
const ZI = IN_Z + 0.002 - HINGE_Z;  // wewnętrzna powierzchnia blachy
const ZO = -0.04;                   // zewnętrzna krawędź ram (bliżej osi zawiasu – nie zahacza o ucha)
const YB = -0.025;                  // dolna krawędź burty (lokalnie)
const YT = FLOOR_Y + WALL_H - HINGE_Y; // górna krawędź burty (lokalnie)

// Burta czołowa: oś zawiasów nad licem belki czołowej
const END_HX = HALF_LEN - 0.005;
const EZ = 1.39;               // pół szerokości burty czołowej (zachodzi za końce burt bocznych)
const EXI = IN_X + 0.002 - END_HX; // wewnętrzna powierzchnia blachy (lokalnie)
const END_HINGE_Z = 0.45;      // zawiasy burty czołowej ± z (między hakiem a zderzakami)

// Poprzecznice pod złączami burt (bez tych nad wózkami)
const CROSS_X = [0, ...JOINTS.filter((x) => Math.abs(x) < PIVOT_X - 1.5)].sort((a, b) => a - b);

const sorted = (a, b) => (a < b ? [a, b] : [b, a]);
const sym = (xs) => [...xs, ...xs.map((x) => -x)];
// spód ostojnicy w danym miejscu (profil rybowy)
const soleBot = (x) => {
  const a = Math.abs(x);
  if (a <= BELLY_X[0]) return SOLE_MID;
  if (a >= BELLY_X[1]) return SOLE_END;
  return SOLE_MID + ((a - BELLY_X[0]) / (BELLY_X[1] - BELLY_X[0])) * (SOLE_END - SOLE_MID);
};

// ---------- Pomocnicze bryły ----------

// Płaska blacha o obrysie [[x, y], ...] w płaszczyźnie xy, grubość od z0 do z1
function plateXY(outline, z0, z1) {
  const sh = new THREE.Shape(outline.map(([u, v]) => new THREE.Vector2(u, v)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0, bevelEnabled: false });
  g.translate(0, 0, z0);
  return g;
}

// Belka prostokątna między punktami a i b (przekrój w × d), np. skośna półka ostojnicy
function beamGeom(a, b, w, d) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const g = new THREE.BoxGeometry(w, A.distanceTo(B), d);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
  const m = A.add(B).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g;
}

// Tuleja (kolanko zawiasu) wzdłuż osi x lub z – z otworem na sworzeń
function knuckleGeom(len, axis = 'x', r1 = 0.0125, r2 = 0.024) {
  const g = ringGeom(r1, r2, -len / 2, len / 2, 24);
  if (axis === 'x') g.rotateY(Math.PI / 2);
  return g;
}

// ======================= WAGON =======================

export function buildRes() {
  const g = part('res');
  slot(g, 'nadwozie', { explode: [0, 1.3, 0] });
  slot(g, 'ostoja', { explode: [0, 0.5, 0] });
  slot(g, 'wozek_1', { pos: [PIVOT_X, 0, 0], explode: [1.8, 0, 0] });
  slot(g, 'wozek_2', { pos: [-PIVOT_X, 0, 0], rot: [0, Math.PI, 0], explode: [-1.8, 0, 0] });
  slot(g, 'ciegla_zderzaki_1', { pos: [HALF_LEN, BUF_Y, 0], explode: [2.6, 0, 0] });
  slot(g, 'ciegla_zderzaki_2', { pos: [-HALF_LEN, BUF_Y, 0], rot: [0, Math.PI, 0], explode: [-2.6, 0, 0] });
  // hamulec zespolony – układ elementów dopasowany przez "uklad" w data/res.json
  slot(g, 'hamulec', { explode: [0, -0.15, 0] });
  return g;
}

// ======================= NADWOZIE =======================

export function buildBody() {
  const g = part('nadwozie');
  slot(g, 'podloga', { explode: [0, 0.35, 0] });
  slot(g, 'burty_1', { explode: [0, 0.25, 0.9] });
  slot(g, 'burty_2', { rot: [0, Math.PI, 0], explode: [0, 0.25, -0.9] });
  // burty czołowe opuszczane do poziomu (obrót o 90° wokół zawiasu nad belką czołową)
  slot(g, 'burta_czolowa_1', { pos: [END_HX, HINGE_Y, 0], explode: [0.9, 0.3, 0], removeRot: [0, 0, -Math.PI / 2] });
  slot(g, 'burta_czolowa_2', { pos: [-END_HX, HINGE_Y, 0], rot: [0, Math.PI, 0], explode: [-0.9, 0.3, 0], removeRot: [0, 0, -Math.PI / 2] });
  return g;
}

// Podłoga: deski ułożone w poprzek wagonu (DB Cargo Res 675), przykręcone śrubami
// z łbami grzybkowymi do podłużnic i półek ostojnic. 1 deska = 1 bryła (słoje wzdłuż deski).
export function buildFloor() {
  const g = part('podloga');
  const n = 124;                        // liczba desek (SZACUNKOWE – szerokość deski ok. 150 mm)
  const pitch = (2 * IN_X) / n;
  const w = pitch - 0.004;              // szczelina między deskami 4 mm
  const len = 2 * IN_Z;
  const light = [], dark = [], heads = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < n; i++) {
    const x = -IN_X + pitch / 2 + i * pitch;
    // deska: długość wzdłuż z; geometria budowana wzdłuż x i obracana, żeby słoje szły wzdłuż deski
    const pg = boxGeom(len, PLANK_T - rnd() * 0.002, w, [0, 0, 0], 0.004);
    pg.rotateY(Math.PI / 2);
    pg.translate(x, UF_TOP + PLANK_T / 2 - 0.001, 0);
    (i % 9 === 4 || rnd() < 0.08 ? dark : light).push(pg);
    for (const z of [-1.28, -STRINGER_Z, STRINGER_Z, 1.28]) heads.push({ pos: [x, FLOOR_Y - 0.001, z], dir: [0, 1, 0] });
  }
  merged(light, M.wood, { parent: g });
  merged(dark, M.woodWorn, { parent: g });
  // łby śrub mocujących deski (grzybkowe, prawie płaskie)
  rivets(heads, 0.014, M.bolt, { parent: g });
  return g;
}

// Zespół burt jednej strony (strona +z; druga obrócona o 180°)
export function buildSideGroup(node) {
  const g = part('burty_boczne');
  for (const ch of node.children) {
    const i = Number(ch.id.split('_').pop()) - 1; // burta_1 przy końcu +x
    const x = panelX(N_SIDE - 1 - i);
    slot(g, ch.id, { pos: [x, HINGE_Y, HINGE_Z], explode: [0, 0.15, 0.35], removeRot: [Math.PI / 2, 0, 0] });
  }
  return g;
}

// Burta boczna. Początek: oś zawiasów (środek długości burty). Burta stoi nad osią (+y),
// blacha od strony ładunku (−z), ramy i użebrowanie na zewnątrz (do z = ZO).
// param.skrajna = +1 / −1: burta przy końcu wagonu – ma czop zaczepu burty czołowej.
export function buildSidePanel(node) {
  const g = part('burta_boczna');
  const P = M.paintBody;
  const hl = PL / 2;
  const t = 0.004;
  // gniazda: zawiasy i zamknięcia (zamknięcie przy końcu sx·hl)
  const ids = new Set(node.children.map((c) => c.id));
  if (ids.has('zawias_1')) slot(g, 'zawias_1', { pos: [-HINGE_DX, 0, 0], explode: [0, -0.15, 0.2] });
  if (ids.has('zawias_2')) slot(g, 'zawias_2', { pos: [HINGE_DX, 0, 0], explode: [0, -0.15, 0.2] });
  for (const ch of node.children) {
    if (!ch.id.startsWith('zamkniecie')) continue;
    const sx = ch.param?.sx ?? 1;
    slot(g, ch.id, { pos: [sx * hl, 0, 0], explode: [sx * 0.15, 0.12, 0.25] });
  }

  // blacha poszycia
  boxFromTo([-hl, hl], [YB + 0.01, YT - 0.01], [ZI, ZI + t], P, { r: 0.002, parent: g });
  const frame = [
    // rama górna – rura prostokątna 60 × 60 (SZACUNKOWE)
    boxGeom(2 * hl, 0.06, ZO - ZI, [0, YT - 0.03, (ZI + ZO) / 2], 0.006),
    // słupki końcowe – ceowniki zamknięte blachą
    boxGeom(0.05, YT - YB, ZO - ZI, [-hl + 0.025, (YB + YT) / 2, (ZI + ZO) / 2], 0.005),
    boxGeom(0.05, YT - YB, ZO - ZI, [hl - 0.025, (YB + YT) / 2, (ZI + ZO) / 2], 0.005),
  ];
  // rama dolna (kątownik) – przerwana przy zawiasach, żeby po otwarciu nie zahaczała o ucha
  const cuts = [-hl + 0.05, -HINGE_DX - 0.08, -HINGE_DX + 0.08, HINGE_DX - 0.08, HINGE_DX + 0.08, hl - 0.05];
  for (let k = 0; k < cuts.length; k += 2) {
    const [a, b] = [cuts[k], cuts[k + 1]];
    frame.push(boxGeom(b - a, 0.05, ZO - ZI, [(a + b) / 2, YB + 0.025, (ZI + ZO) / 2], 0.005));
  }
  merged(frame, P, { parent: g });
  // użebrowanie: przetłoczenia pionowe (profile kapeluszowe) między zawiasami a końcami
  const ribs = [];
  for (const x of [-0.9, -0.3, 0.3, 0.9].filter((v) => Math.abs(v) < hl - 0.1)) {
    const y0 = YB + 0.05, y1 = YT - 0.06, zc = ZI + t;
    ribs.push(boxGeom(0.06, y1 - y0, 0.004, [x, (y0 + y1) / 2, ZO - 0.004]));
    ribs.push(boxGeom(0.004, y1 - y0, ZO - 0.004 - zc, [x - 0.03, (y0 + y1) / 2, (zc + ZO - 0.004) / 2]));
    ribs.push(boxGeom(0.004, y1 - y0, ZO - 0.004 - zc, [x + 0.03, (y0 + y1) / 2, (zc + ZO - 0.004) / 2]));
  }
  // listwa pozioma w połowie wysokości
  ribs.push(boxGeom(2 * hl - 0.1, 0.04, 0.03, [0, (YB + YT) / 2, ZO - 0.015], 0.004));
  merged(ribs, P, { parent: g });
  // spoiny ram z blachą
  weld([-hl + 0.05, YT - 0.062, ZO - 0.003], [hl - 0.05, YT - 0.062, ZO - 0.003], 0.004, { parent: g });
  weld([-hl + 0.05, YB + 0.052, ZO - 0.003], [hl - 0.05, YB + 0.052, ZO - 0.003], 0.004, { parent: g });
  // zaczep zamknięcia (podcięcie na rękojeść rygla) przy końcach z zamknięciem
  for (const ch of node.children) {
    if (!ch.id.startsWith('zamkniecie')) continue;
    const sx = ch.param?.sx ?? 1;
    box(0.04, 0.02, 0.025, M.paintDark, { pos: [sx * (hl - 0.1), 0.335, ZO + 0.0125], r: 0.004, parent: g });
  }
  // czop, za który zaczepia hak burty czołowej (tylko burta skrajna)
  const sk = node.param?.skrajna;
  if (sk) {
    cylinder(0.006, 0.07, M.steelMachined, { pos: [sk * (hl - 0.023), 0.445, ZO + 0.004], seg: 10, parent: g });
    box(0.03, 0.012, 0.02, M.paintDark, { pos: [sk * (hl - 0.023), 0.405, ZO + 0.01], r: 0.003, parent: g });
    box(0.03, 0.012, 0.02, M.paintDark, { pos: [sk * (hl - 0.023), 0.485, ZO + 0.01], r: 0.003, parent: g });
  }
  // oznaczenie (biała tabliczka z numerem burty)
  box(0.12, 0.08, 0.003, M.paintWhite, { pos: [0, (YB + YT) / 2 + 0.1, ZO - 0.003], r: 0.001, parent: g });
  return g;
}

// Zawias burty: kolanko (tuleja) na osi zawiasu i okucie przykręcone do burty.
// Sworzeń i ucha zawiasu są na ostojnicy. Początek: oś zawiasu.
export function buildSideHinge() {
  const g = part('zawias_burty');
  mesh(knuckleGeom(0.11, 'x'), M.paintDarkRound, { parent: g });
  merged([
    boxGeom(0.1, 0.03, 0.045, [0, 0.012, -0.022], 0.005),          // ramię od tulei do burty
    boxGeom(0.1, 0.24, 0.01, [0, 0.14, ZO + 0.005], 0.003),        // okucie na ramie burty
  ], M.paintDark, { parent: g });
  bolts([[-0.03, 0.09], [0.03, 0.09], [-0.03, 0.2], [0.03, 0.2]].map(([x, y]) => ({ pos: [x, y, ZO + 0.01], dir: [0, 0, 1] })), 0.012, M.bolt, { parent: g, stick: 0 });
  return g;
}

// Zamknięcie burty (rygiel). Początek: koniec burty, w układzie zawiasu; param.sx = ±1 – który koniec.
export function buildSideLock() {
  const g = part('zamkniecie_burty');
  slot(g, 'prowadnice', { explode: [0, 0, 0.06] });
  slot(g, 'rygiel', { explode: [0, 0.12, 0.12] });
  slot(g, 'zawleczka', { explode: [0, 0.18, 0.2] });
  return g;
}

const LOCK = { y: 0.44, z: ZO + 0.016, r: 0.011 }; // oś rygla (SZACUNKOWE)

// Prowadnice rygla: dwa przyspawane skoble
export function buildLockGuides(node) {
  const g = part('prowadnice');
  const { sx } = inheritedParam(node, { sx: 1 });
  const geoms = [];
  for (const d of [0.04, 0.16]) {
    const x = -sx * d;
    geoms.push(boxGeom(0.03, 0.008, 0.032, [x, LOCK.y + 0.016, ZO + 0.016]));
    geoms.push(boxGeom(0.03, 0.008, 0.032, [x, LOCK.y - 0.016, ZO + 0.016]));
    geoms.push(boxGeom(0.03, 0.04, 0.006, [x, LOCK.y, ZO + 0.032]));
  }
  merged(geoms, M.paintDark, { parent: g });
  for (const d of [0.04, 0.16]) weld([-sx * d - 0.015, LOCK.y - 0.02, ZO + 0.002], [-sx * d + 0.015, LOCK.y - 0.02, ZO + 0.002], 0.004, { parent: g });
  return g;
}

// Rygiel: pręt przesuwany w prowadnicach, wysunięty za koniec burty; rękojeść opuszczona w zaczep
export function buildLockBolt(node) {
  const g = part('rygiel');
  const { sx } = inheritedParam(node, { sx: 1 });
  rod([-sx * 0.2, LOCK.y, LOCK.z], [sx * 0.025, LOCK.y, LOCK.z], LOCK.r, M.steelRaw, { seg: 14, parent: g });
  // rękojeść
  const hx = -sx * 0.1;
  rod([hx, LOCK.y, LOCK.z], [hx, 0.345, LOCK.z], 0.009, M.steelRaw, { seg: 10, parent: g });
  rod([hx, 0.345, LOCK.z], [hx, 0.345, LOCK.z + 0.03], 0.009, M.steelRaw, { seg: 10, parent: g });
  mesh(new THREE.SphereGeometry(0.014, 12, 8), M.paintRed, { pos: [hx, 0.345, LOCK.z + 0.035], parent: g });
  return g;
}

// Zawleczka zabezpieczająca rygiel, na łańcuszku przyspawanym do burty
export function buildCotter(node) {
  const g = part('zawleczka');
  const { sx } = inheritedParam(node, { sx: 1 });
  const x = -sx * 0.06;
  cylinder(0.004, 0.06, M.steelMachined, { pos: [x, LOCK.y, LOCK.z], seg: 8, parent: g });
  mesh(new THREE.TorusGeometry(0.009, 0.0025, 6, 14), M.steelMachined, { pos: [x, LOCK.y + 0.038, LOCK.z], parent: g });
  // łańcuszek (3 ogniwa) do ucha na burcie
  for (let k = 0; k < 3; k++) {
    mesh(new THREE.TorusGeometry(0.008, 0.002, 6, 12), M.steelRaw, {
      pos: [x - sx * 0.012 * (k + 1), LOCK.y + 0.04 - 0.012 * k, LOCK.z + 0.004], rot: [0, k % 2 ? Math.PI / 2 : 0, 0.6], parent: g,
    });
  }
  box(0.012, 0.012, 0.01, M.paintDark, { pos: [x - sx * 0.05, LOCK.y + 0.005, ZO + 0.005], r: 0.002, parent: g });
  return g;
}

// Burta czołowa (koniec +x; druga obrócona o 180°). Początek: oś zawiasów nad belką czołową.
// Blacha od strony ładunku (−x), ramy na zewnątrz do x = −0,03.
export function buildEndPanel(node) {
  const g = part('burta_czolowa');
  const P = M.paintBody;
  const xo = -0.03, t = 0.004;
  const ids = new Set(node.children.map((c) => c.id));
  for (const [id, z] of [['zawias_1', END_HINGE_Z], ['zawias_2', -END_HINGE_Z]]) {
    if (ids.has(id)) slot(g, id, { pos: [0, 0, z], explode: [0.2, -0.15, 0] });
  }
  for (const ch of node.children) {
    if (!ch.id.startsWith('zamkniecie')) continue;
    const sz = ch.param?.sz ?? 1;
    slot(g, ch.id, { explode: [0.25, 0.12, sz * 0.2] });
  }
  boxFromTo([EXI, EXI + t], [YB + 0.01, YT - 0.01], [-EZ, EZ], P, { r: 0.002, parent: g });
  const frame = [
    boxGeom(xo - EXI, 0.06, 2 * EZ, [(EXI + xo) / 2, YT - 0.03, 0], 0.006),
    boxGeom(xo - EXI, YT - YB, 0.05, [(EXI + xo) / 2, (YB + YT) / 2, EZ - 0.025], 0.005),
    boxGeom(xo - EXI, YT - YB, 0.05, [(EXI + xo) / 2, (YB + YT) / 2, -EZ + 0.025], 0.005),
  ];
  // rama dolna – przerwana przy zawiasach
  const cuts = [-EZ + 0.05, -END_HINGE_Z - 0.08, -END_HINGE_Z + 0.08, END_HINGE_Z - 0.08, END_HINGE_Z + 0.08, EZ - 0.05];
  for (let k = 0; k < cuts.length; k += 2) {
    const [a, b] = [cuts[k], cuts[k + 1]];
    frame.push(boxGeom(xo - EXI, 0.05, b - a, [(EXI + xo) / 2, YB + 0.025, (a + b) / 2], 0.005));
  }
  merged(frame, P, { parent: g });
  const ribs = [];
  for (const z of [-1.0, -0.2, 0.2, 1.0]) {
    const y0 = YB + 0.05, y1 = YT - 0.06, xc = EXI + t;
    ribs.push(boxGeom(0.004, y1 - y0, 0.06, [xo - 0.004, (y0 + y1) / 2, z]));
    ribs.push(boxGeom(xo - 0.004 - xc, y1 - y0, 0.004, [(xc + xo - 0.004) / 2, (y0 + y1) / 2, z - 0.03]));
    ribs.push(boxGeom(xo - 0.004 - xc, y1 - y0, 0.004, [(xc + xo - 0.004) / 2, (y0 + y1) / 2, z + 0.03]));
  }
  ribs.push(boxGeom(0.03, 0.04, 2 * EZ - 0.1, [xo - 0.015, (YB + YT) / 2, 0], 0.004));
  merged(ribs, P, { parent: g });
  weld([xo - 0.003, YT - 0.062, -EZ + 0.05], [xo - 0.003, YT - 0.062, EZ - 0.05], 0.004, { parent: g });
  // ucha sworzni haków zamknięć w narożnikach
  for (const sz of [1, -1]) {
    box(0.02, 0.012, 0.04, M.paintDark, { pos: [xo + 0.008, 0.415, sz * 1.35], r: 0.003, parent: g });
    box(0.02, 0.012, 0.04, M.paintDark, { pos: [xo + 0.008, 0.475, sz * 1.35], r: 0.003, parent: g });
  }
  return g;
}

// Zawias burty czołowej (oś wzdłuż z). Początek: oś zawiasu.
export function buildEndHinge() {
  const g = part('zawias_burty_czolowej');
  mesh(knuckleGeom(0.11, 'z'), M.paintDarkRound, { parent: g });
  merged([
    boxGeom(0.045, 0.03, 0.1, [-0.022, 0.012, 0], 0.005),
    boxGeom(0.01, 0.24, 0.1, [-0.035, 0.14, 0], 0.003),
  ], M.paintDark, { parent: g });
  bolts([[0.09, -0.03], [0.09, 0.03], [0.2, -0.03], [0.2, 0.03]].map(([y, z]) => ({ pos: [-0.03, y, z], dir: [1, 0, 0] })), 0.012, M.bolt, { parent: g, stick: 0 });
  return g;
}

// Zamknięcie burty czołowej: hak obracany na sworzniu, zaczepiany za czop na końcu burty bocznej
export function buildEndLock() {
  const g = part('zamkniecie_burty_czolowej');
  slot(g, 'hak', { explode: [0.1, 0.1, 0.12] });
  slot(g, 'sworzen', { explode: [0.1, 0.25, 0] });
  return g;
}

// Hak zamknięcia (w układzie burty czołowej; param.sz = ±1 – narożnik)
export function buildEndHook(node) {
  const { sz } = inheritedParam(node, { sz: 1 });
  const g = part('hak_zamkniecia');
  const y0 = 0.428, y1 = 0.462;
  // obrys haka w płaszczyźnie (x, z): ramię przy sworzniu, ramię wokół narożnika i pazur
  const pts = [[-0.035, 1.33], [-0.008, 1.33], [-0.008, 1.41], [-0.142, 1.41], [-0.142, 1.384], [-0.124, 1.384], [-0.124, 1.396], [-0.035, 1.396]];
  const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, sz * z)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1 });
  // kształt w płaszczyźnie xy → obrót, żeby leżał w płaszczyźnie xz (grubość wzdłuż y)
  geo.rotateX(Math.PI / 2);
  geo.scale(1, 1, -1);
  geo.translate(0, y1, 0);
  mesh(geo, M.steelRaw, { parent: g });
  // uchwyt do podnoszenia haka
  rod([-0.06, y1, sz * 1.403], [-0.06, y1 + 0.04, sz * 1.403], 0.006, M.paintRed, { seg: 8, parent: g });
  return g;
}

export function buildEndHookPin(node) {
  const { sz } = inheritedParam(node, { sz: 1 });
  const g = part('sworzen_zamkniecia');
  cylinder(0.009, 0.085, M.steelMachined, { pos: [-0.022, 0.445, sz * 1.35], seg: 12, parent: g });
  cylinder(0.014, 0.008, M.steelMachined, { pos: [-0.022, 0.488, sz * 1.35], seg: 12, parent: g });
  // zawleczka pod spodem
  rod([-0.032, 0.408, sz * 1.35], [-0.012, 0.408, sz * 1.35], 0.0025, M.steelRaw, { seg: 6, parent: g });
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
  slot(g, 'poprzecznice', { explode: [0, -0.15, 0] });
  slot(g, 'podluznice', { explode: [0, 0.3, 0] });
  slot(g, 'oslony_przeciwiskrowe', { explode: [0, -0.4, 0] });
  slot(g, 'klonice_1', { explode: [0, 0.2, 1.0] });
  slot(g, 'klonice_2', { rot: [0, Math.PI, 0], explode: [0, 0.2, -1.0] });
  slot(g, 'uchwyty_1', { explode: [0, -0.1, 0.9] });
  slot(g, 'uchwyty_2', { rot: [0, Math.PI, 0], explode: [0, -0.1, -0.9] });
  for (const [n, [sx, sz]] of Object.entries(CORNERS)) {
    slot(g, `stopien_manewrowy_${n}`, { explode: [sx * 0.3, -0.25, sz * 0.5] });
    slot(g, `porecz_manewrowa_${n}`, { explode: [sx * 0.5, 0.2, sz * 0.4] });
  }
  return g;
}

// Ostojnica (strona +z): dwuteownik spawany o zmiennej wysokości (rybowy) – środnik, półki,
// żebra, ucha zawiasów burt ze sworzniami, uchwyty do podnoszenia nad belkami skrętowymi.
export function buildSoleBar() {
  const g = part('ostojnica');
  const P = M.paintBody;
  const x0 = BELLY_X[0], x1 = BELLY_X[1], fl = 0.012;
  // środnik: obrys z „brzuchem” w środku
  const web = [[-HEAD_X, UF_TOP - fl], [HEAD_X, UF_TOP - fl], [HEAD_X, SOLE_END + fl], [x1, SOLE_END + fl],
    [x0, SOLE_MID + fl], [-x0, SOLE_MID + fl], [-x1, SOLE_END + fl], [-HEAD_X, SOLE_END + fl]];
  mesh(plateXY(web, SOLE_Z - SOLE_T, SOLE_Z), P, { parent: g });
  // półka górna (szeroka, podpiera końce desek) i dolna (wzdłuż profilu)
  const zb = [SOLE_Z - 0.1, SOLE_Z];
  merged([
    boxGeom(2 * HEAD_X, fl, SOLE_FL[1] - SOLE_FL[0], [0, UF_TOP - fl / 2, (SOLE_FL[0] + SOLE_FL[1]) / 2], 0.003),
    boxGeom(2 * x0, fl, zb[1] - zb[0], [0, SOLE_MID + fl / 2, (zb[0] + zb[1]) / 2], 0.003),
    boxGeom(HEAD_X - x1, fl, zb[1] - zb[0], [(HEAD_X + x1) / 2, SOLE_END + fl / 2, (zb[0] + zb[1]) / 2], 0.003),
    boxGeom(HEAD_X - x1, fl, zb[1] - zb[0], [-(HEAD_X + x1) / 2, SOLE_END + fl / 2, (zb[0] + zb[1]) / 2], 0.003),
    beamGeom([x0, SOLE_MID + fl / 2, (zb[0] + zb[1]) / 2], [x1, SOLE_END + fl / 2, (zb[0] + zb[1]) / 2], fl, zb[1] - zb[0]),
    beamGeom([-x0, SOLE_MID + fl / 2, (zb[0] + zb[1]) / 2], [-x1, SOLE_END + fl / 2, (zb[0] + zb[1]) / 2], fl, zb[1] - zb[0]),
  ], P, { parent: g });
  // żebra po wewnętrznej stronie środnika (przy poprzecznicach i co ok. 1 m)
  const ribs = [];
  const ribX = [...CROSS_X, ...sym([0.5, 1.55, 2.1, 2.6, 3.6, 4.15, 4.65, 5.7, 6.3, 6.85, 8.0, 8.6])];
  for (const x of ribX) {
    const yb = soleBot(x) + fl, yt = UF_TOP - fl;
    ribs.push(boxGeom(0.01, yt - yb, 0.085, [x, (yb + yt) / 2, SOLE_Z - SOLE_T - 0.0425]));
  }
  merged(ribs, P, { parent: g });
  // spoiny półek ze środnikiem
  weld([-HEAD_X, UF_TOP - fl - 0.003, SOLE_Z - SOLE_T - 0.003], [HEAD_X, UF_TOP - fl - 0.003, SOLE_Z - SOLE_T - 0.003], 0.005, { parent: g });
  weld([-x0, SOLE_MID + fl + 0.003, SOLE_Z - SOLE_T - 0.003], [x0, SOLE_MID + fl + 0.003, SOLE_Z - SOLE_T - 0.003], 0.005, { parent: g });
  // ucha zawiasów burt ze sworzniami (2 na burtę, po obu stronach kolanka)
  const lugs = [], pins = [];
  for (let i = 0; i < N_SIDE; i++) for (const dx of [-HINGE_DX, HINGE_DX]) {
    const xh = panelX(i) + dx;
    for (const s of [-1, 1]) lugs.push(boxGeom(0.012, 0.14, 0.052, [xh + s * 0.062, HINGE_Y - 0.045, SOLE_Z + 0.026], 0.003));
    pins.push([xh, HINGE_Y, HINGE_Z]);
  }
  merged(lugs, M.paintDark, { parent: g });
  merged(pins.map(([x, y, z]) => {
    const c = new THREE.CylinderGeometry(0.011, 0.011, 0.15, 12);
    c.rotateZ(Math.PI / 2);
    c.translate(x, y, z);
    return c;
  }), M.steelMachined, { parent: g });
  // podkładki i zawleczki sworzni
  merged(pins.flatMap(([x, y, z]) => [-1, 1].map((s) => {
    const c = new THREE.CylinderGeometry(0.017, 0.017, 0.004, 14);
    c.rotateZ(Math.PI / 2);
    c.translate(x + s * 0.07, y, z);
    return c;
  })), M.steelRaw, { parent: g });
  // uchwyty do podnoszenia wagonu nad belkami skrętowymi
  for (const sx of [1, -1]) box(0.3, 0.05, 0.03, M.paintDark, { pos: [sx * (PIVOT_X + 0.35), SOLE_END + 0.03, SOLE_Z + 0.016], r: 0.006, parent: g });
  // tabliczki z oznaczeniem na środniku (biała ramka napisów)
  box(1.2, 0.2, 0.004, M.paintWhite, { pos: [-2.6, 0.9, SOLE_Z + 0.002], r: 0.002, parent: g });
  return g;
}

// Belka czołowa (koniec +x): skrzynka z blachy czołowej i półek, nakładki pod zderzaki,
// otwór haka, ucha zawiasów burty czołowej na górnej krawędzi.
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
    // nakładka pod płytę zderzaka i żebra za nią
    boxFromTo([xf, HALF_LEN], [BUF_Y - 0.19, Math.min(BUF_Y + 0.19, UF_TOP)], [s * 0.875 - 0.2, s * 0.875 + 0.2], P, { r: 0.004, parent: g });
    merged([-0.12, 0.12].map((dz) => boxGeom(0.18, UF_TOP - y0 - 2 * t, 0.01, [(HEAD_X + xf) / 2, (y0 + UF_TOP) / 2, s * 0.875 + dz])), P, { parent: g });
  }
  // obramowanie otworu haka i gumowa osłona
  const hy = [BUF_Y - 0.1, BUF_Y + 0.08], hz = 0.08;
  merged([
    boxGeom(0.02, 0.03, 2 * hz + 0.06, [xf + 0.006, hy[1] + 0.015, 0]),
    boxGeom(0.02, 0.03, 2 * hz + 0.06, [xf + 0.006, hy[0] - 0.015, 0]),
    boxGeom(0.02, hy[1] - hy[0], 0.03, [xf + 0.006, (hy[0] + hy[1]) / 2, hz + 0.015]),
    boxGeom(0.02, hy[1] - hy[0], 0.03, [xf + 0.006, (hy[0] + hy[1]) / 2, -hz - 0.015]),
  ], P, { parent: g });
  box(0.006, hy[1] - hy[0], 2 * hz, M.rubber, { pos: [xf + 0.001, (hy[0] + hy[1]) / 2, 0], r: 0.002, parent: g });
  // ucha zawiasów burty czołowej ze sworzniami (oś wzdłuż z)
  const lugs = [];
  for (const s of [1, -1]) for (const d of [-0.062, 0.062]) {
    lugs.push(boxGeom(0.05, 0.065, 0.012, [END_HX, UF_TOP + 0.0275, s * END_HINGE_Z + d], 0.003));
  }
  merged(lugs, M.paintDark, { parent: g });
  for (const s of [1, -1]) {
    cylinder(0.011, 0.15, M.steelMachined, { axis: 'z', pos: [END_HX, HINGE_Y, s * END_HINGE_Z], seg: 12, parent: g });
    for (const d of [-0.07, 0.07]) cylinder(0.017, 0.004, M.steelRaw, { axis: 'z', pos: [END_HX, HINGE_Y, s * END_HINGE_Z + d], seg: 14, parent: g });
  }
  for (const s of [1, -1]) weld([HEAD_X, y0 + 0.01, s * (SOLE_Z - 0.02)], [HEAD_X, UF_TOP - 0.01, s * (SOLE_Z - 0.02)], 0.006, { parent: g });
  weld([xf - 0.004, UF_TOP + 0.003, -SOLE_Z], [xf - 0.004, UF_TOP + 0.003, SOLE_Z], 0.005, { parent: g });
  return g;
}

// Belka skrętowa: belka skrzynkowa w poprzek wagonu, nad wózkiem. Początek: oś czopa skrętu.
export function buildBolster() {
  const g = part('belka_skretowa');
  const P = M.paintBody;
  slot(g, 'czop_skretu', { pos: [0, 0.865, 0], explode: [0, -0.35, 0] });
  const sh = new THREE.Shape();
  const zc = 0.95, ze = SOLE_Z - SOLE_T, yb = 0.95, ye = 1.06;
  sh.moveTo(-ze, UF_TOP); sh.lineTo(ze, UF_TOP); sh.lineTo(ze, ye); sh.lineTo(zc, yb);
  sh.lineTo(-zc, yb); sh.lineTo(-ze, ye); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1 });
  geo.translate(0, 0, -0.18);
  geo.rotateY(Math.PI / 2);
  mesh(geo, P, { parent: g });
  // przeciwślizgi (ślizgi boczne od strony pudła)
  for (const z of [0.82, -0.82]) {
    box(0.2, 0.13, 0.12, M.paintBody, { pos: [0, 0.88, z], r: 0.008, parent: g });
    box(0.18, 0.012, 0.1, M.steelMachined, { pos: [0, 0.809, z], r: 0.002, parent: g });
  }
  for (const s of [1, -1]) for (const dx of [-0.186, 0.186]) weld([dx, ye, s * (ze - 0.004)], [dx, UF_TOP - 0.01, s * (ze - 0.004)], 0.006, { parent: g });
  return g;
}

// Belka środkowa: dwa ceowniki wzdłuż osi wagonu (na końcach mieszczą urządzenie cięgłowe)
export function buildCenterSill() {
  const g = part('belka_srodkowa');
  const P = M.paintBody;
  const y0 = CROSS_BOT, y1 = UF_TOP, t = 0.01, fl = 0.08;
  for (const s of [1, -1]) {
    boxFromTo([-HEAD_X, HEAD_X], [y0, y1], sorted(s * 0.13, s * (0.13 + t)), P, { r: 0.003, parent: g });
    boxFromTo([-HEAD_X, HEAD_X], [y0, y0 + t], sorted(s * 0.13, s * (0.13 + fl)), P, { r: 0.003, parent: g });
    boxFromTo([-HEAD_X, HEAD_X], [y1 - t, y1], sorted(s * 0.13, s * (0.13 + fl)), P, { r: 0.003, parent: g });
  }
  // przewiązki pod spodem
  const ties = [];
  for (let x = -HEAD_X + 0.9; x < HEAD_X - 0.5; x += 1.5) ties.push(boxGeom(0.08, 0.01, 0.26, [x, y0 - 0.005, 0]));
  merged(ties, P, { parent: g });
  return g;
}

// Poprzecznice: dwuteowniki między belką środkową a ostojnicami, pod złączami burt
export function buildCrossMembers() {
  const g = part('poprzecznice');
  const P = M.paintBody;
  const z0 = 0.21, z1 = SOLE_Z - SOLE_T, t = 0.012;
  const geoms = [];
  for (const x of CROSS_X) for (const s of [1, -1]) {
    const zc = s * (z0 + z1) / 2, w = z1 - z0;
    geoms.push(boxGeom(0.01, UF_TOP - CROSS_BOT - 2 * t, w, [x, (UF_TOP + CROSS_BOT) / 2, zc], 0.002));
    geoms.push(boxGeom(0.1, t, w, [x, UF_TOP - t / 2, zc], 0.003));
    geoms.push(boxGeom(0.1, t, w, [x, CROSS_BOT + t / 2, zc], 0.003));
  }
  merged(geoms, P, { parent: g });
  for (const x of CROSS_X) for (const s of [1, -1]) {
    weld([x - 0.008, CROSS_BOT + 0.02, s * (z1 - 0.004)], [x - 0.008, UF_TOP - 0.02, s * (z1 - 0.004)], 0.005, { parent: g });
  }
  return g;
}

// Podłużnice: ceowniki pod deskami podłogi (podparcie desek między ostojnicami a belką środkową)
export function buildStringers() {
  const g = part('podluznice');
  const P = M.paintBody;
  const y0 = 1.1, t = 0.008;
  const geoms = [];
  for (const s of [1, -1]) {
    const z = s * STRINGER_Z;
    geoms.push(boxGeom(2 * HEAD_X, UF_TOP - y0, t, [0, (UF_TOP + y0) / 2, z], 0.002));
    geoms.push(boxGeom(2 * HEAD_X, t, 0.06, [0, UF_TOP - t / 2, z], 0.002));
    geoms.push(boxGeom(2 * HEAD_X, t, 0.06, [0, y0 + t / 2, z], 0.002));
  }
  merged(geoms, P, { parent: g });
  return g;
}

// Osłony przeciwiskrowe: blachy nad hamowanymi kołami (podłoga palna – GCU Zał. 10 pkt 4.6),
// zawieszone na wieszakach pod podłużnicami (nie bezpośrednio pod podłogą)
export function buildSparkGuards() {
  const g = part('oslony_przeciwiskrowe');
  const plates = [], hangers = [];
  const y = 1.0, t = 0.004;
  for (const px of [PIVOT_X, -PIVOT_X]) for (const ax of [0.9, -0.9]) for (const s of [1, -1]) {
    const x = px + ax, zc = s * 0.72;
    plates.push(boxGeom(0.84, t, 0.38, [x, y, zc], 0.002));
    // zagięte krawędzie (usztywnienie)
    plates.push(boxGeom(0.84, 0.03, t, [x, y - 0.013, zc - 0.19], 0.001));
    plates.push(boxGeom(0.84, 0.03, t, [x, y - 0.013, zc + 0.19], 0.001));
    for (const dx of [-0.32, 0.32]) hangers.push(boxGeom(0.03, 1.1 - y - t / 2, 0.008, [x + dx, (1.1 + y + t / 2) / 2, s * (STRINGER_Z - 0.008)], 0.002));
  }
  merged(plates, M.paintDark, { parent: g });
  merged(hangers, M.paintDark, { parent: g });
  return g;
}

// Kłonice jednej strony (strona +z): w złączach burt, kieszenie na ostojnicy
export function buildStakeGroup(node) {
  const g = part('klonice');
  for (const ch of node.children) {
    const k = Number(ch.id.split('_').pop()) - 1;
    slot(g, ch.id, { pos: [JOINTS[N_SIDE - 2 - k], POCKET_Y, SOLE_Z], explode: [0, 0.1, 0.3] });
  }
  return g;
}

// Uchwyty mocujące jednej strony (strona +z): na środniku ostojnicy, pod środkiem burt
export function buildRingGroup(node) {
  const g = part('uchwyty_mocujace');
  for (const ch of node.children) {
    const k = Number(ch.id.split('_').pop()) - 1;
    slot(g, ch.id, { pos: [panelX(N_SIDE - 1 - k), RING_Y, SOLE_Z], explode: [0, -0.1, 0.25] });
  }
  return g;
}

// ======================= HAMULEC POSTOJOWY =======================
// Res ma hamulec postojowy obsługiwany z ziemi (DB Cargo Res 675) – koło ręczne przy ostojnicy,
// a nie na ścianie czołowej jak we wspólnym module. Ten builder zastępuje wspólny "hamulec_reczny"
// tylko dla wagonu Res (położenia SZACUNKOWE). Cięgło prowadzi do dźwigni stałej hamulca
// z układu wspólnego (layout() z src/components/hamulec/config.js).
const HB = { x: -5.7, y: 0.74, z: 1.56, R: 0.2 };

export function buildHandBrakeRes(node) {
  const g = part('hamulec_reczny');
  const lay = layout(cfg(node));
  const { x, y, z, R } = HB;
  // koło ręczne w płaszczyźnie xy (oś wzdłuż z – do obsługi z ziemi)
  mesh(new THREE.TorusGeometry(R, 0.014, 10, 48), M.paintDark, { pos: [x, y, z], parent: g });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    rod([x, y, z], [x + Math.cos(a) * R, y + Math.sin(a) * R, z], 0.01, M.paintDark, { seg: 8, parent: g });
  }
  cylinder(0.035, 0.06, M.paintDark, { axis: 'z', pos: [x, y, z], parent: g });
  // rękojeść obrotowa na wieńcu
  cylinder(0.012, 0.08, M.paintRed, { axis: 'z', pos: [x + R, y, z + 0.04], seg: 10, parent: g });
  // wałek koła i łożysko na wsporniku
  cylinder(0.018, z - SOLE_Z + 0.05, M.steelRaw, { axis: 'z', pos: [x, y, (z + SOLE_Z - 0.05) / 2], seg: 12, parent: g });
  box(0.09, 0.09, 0.05, M.paintDark, { pos: [x, y, SOLE_Z + 0.045], r: 0.01, parent: g });
  // wspornik przyspawany do środnika ostojnicy
  boxFromTo([x - 0.045, x + 0.045], [y - 0.05, SOLE_END + 0.1], [SOLE_Z + 0.001, SOLE_Z + 0.017], M.paintDark, { r: 0.004, parent: g });
  // przekładnia (skrzynka) za wspornikiem, pod ostojnicą
  box(0.14, 0.12, 0.07, M.paintDark, { pos: [x, y, SOLE_Z - 0.04], r: 0.012, parent: g });
  // cięgło do dźwigni stałej hamulca
  const p0 = [x, y, SOLE_Z - 0.08];
  const p1 = [x + 0.15, 0.78, lay.hb.leverZ];
  const p2 = [lay.lever2X, lay.leverY, lay.hb.leverZ];
  rod(p0, p1, 0.013, M.steelRaw, { seg: 10, parent: g });
  rod(p1, p2, 0.013, M.steelRaw, { seg: 10, parent: g });
  mesh(new THREE.SphereGeometry(0.02, 10, 8), M.steelRaw, { pos: p1, parent: g });
  // tabliczka (biała) nad kołem
  box(0.24, 0.1, 0.004, M.paintWhite, { pos: [x, SOLE_END + 0.1, SOLE_Z + 0.003], r: 0.002, parent: g });
  return g;
}

// Wszystkie buildery, których potrzebuje Res (wagon + wspólne podzespoły)
export const builders = {
  ...y25Builders,
  ...drawGearBuilders,
  ...airBrakeBuilders,
  ...underframeBuilders,
  ...cargoBuilders,
  hamulec_reczny: buildHandBrakeRes, // zastępuje wspólny (koło przy ostojnicy, obsługa z ziemi)
  res: buildRes,
  nadwozie_res: buildBody,
  podloga_res: buildFloor,
  burty_boczne_res: buildSideGroup,
  burta_boczna_res: buildSidePanel,
  zawias_burty_res: buildSideHinge,
  zamkniecie_burty_res: buildSideLock,
  prowadnice_rygla_res: buildLockGuides,
  rygiel_res: buildLockBolt,
  zawleczka_res: buildCotter,
  burta_czolowa_res: buildEndPanel,
  zawias_burty_czolowej_res: buildEndHinge,
  zamkniecie_burty_czolowej_res: buildEndLock,
  hak_zamkniecia_res: buildEndHook,
  sworzen_zamkniecia_res: buildEndHookPin,
  ostoja_res: buildUnderframe,
  ostojnica_res: buildSoleBar,
  belka_czolowa_res: buildHeadstock,
  belka_skretowa_res: buildBolster,
  belka_srodkowa_res: buildCenterSill,
  poprzecznice_res: buildCrossMembers,
  podluznice_res: buildStringers,
  oslony_przeciwiskrowe_res: buildSparkGuards,
  klonice_res: buildStakeGroup,
  uchwyty_res: buildRingGroup,
};
