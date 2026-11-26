// Wózek Y25 – złożenie oraz rama, gniazdo skrętu i ślizgi boczne.
// Układ lokalny wózka: początek w środku wózka na wysokości główki szyny (y = 0).
// Rozstaw osi 1800 mm, koło Ø920 mm (źródła w data/components/y25.json).
// Wymiary ramy, wysokości i przekroje belek – SZACUNKOWE (z rysunków poglądowych).
import { M, part, slot, box, boxFromTo, lathe, merged, boxGeom, bolts, boltCircle, weld, mesh, ringGeom } from '../../lib/geom.js';
import { WHEEL_R } from './wheelset.js';

export const AXLE_X = 0.9;         // pół rozstawu osi (1800 / 2)
export const BOX_Z = 1.0;          // środek maźnicy w poprzek toru (szacunkowo)
export const SEAT_Y = WHEEL_R + 0.1975; // góra gniazda sprężyn na maźnicy
export const CROSS_TOP = 0.74;     // góra poprzecznicy (szacunkowo)

export function buildBogie() {
  const g = part('wozek_y25');
  slot(g, 'rama', { explode: [0, 0.6, 0] });
  slot(g, 'gniazdo_skretu', { pos: [0, CROSS_TOP, 0], explode: [0, 1.05, 0] });
  slot(g, 'slizg_1', { pos: [0, CROSS_TOP, 0.82], explode: [0, 0.9, 0.2] });
  slot(g, 'slizg_2', { pos: [0, CROSS_TOP, -0.82], explode: [0, 0.9, -0.2] });
  slot(g, 'zestaw_1', { pos: [AXLE_X, WHEEL_R, 0], explode: [0.65, 0, 0] });
  slot(g, 'zestaw_2', { pos: [-AXLE_X, WHEEL_R, 0], explode: [-0.65, 0, 0] });
  // usprężynowanie nad każdą maźnicą; dla osi „ujemnej” obrócone o 180°,
  // żeby tłumik Lenoira był zawsze od strony środka wózka
  slot(g, 'usprezynowanie_1', { pos: [AXLE_X, SEAT_Y, BOX_Z], explode: [0.65, 0.3, 0] });
  slot(g, 'usprezynowanie_2', { pos: [AXLE_X, SEAT_Y, -BOX_Z], explode: [0.65, 0.3, 0] });
  slot(g, 'usprezynowanie_3', { pos: [-AXLE_X, SEAT_Y, BOX_Z], rot: [0, Math.PI, 0], explode: [-0.65, 0.3, 0] });
  slot(g, 'usprezynowanie_4', { pos: [-AXLE_X, SEAT_Y, -BOX_Z], rot: [0, Math.PI, 0], explode: [-0.65, 0.3, 0] });
  slot(g, 'hamulec_wozka', { explode: [0, -0.15, 0] });
  return g;
}

// Rama wózka: dwie ostojnice (belki boczne) + poprzecznica + czołownice, spawana
export function buildFrame() {
  const g = part('rama');
  const P = M.paintDark;
  for (const s of [1, -1]) {
    const z0 = s * BOX_Z - 0.1, z1 = s * BOX_Z + 0.1;
    const zr = [Math.min(z0, z1), Math.max(z0, z1)];
    // część środkowa ostojnicy (przekrój skrzynkowy)
    boxFromTo([-0.68, 0.68], [0.50, 0.80], zr, P, { r: 0.014, parent: g });
    for (const sx of [1, -1]) {
      const ax = sx * AXLE_X;
      // kołpak nad sprężynami (płyta górna + boki w górnej części)
      boxFromTo([ax - 0.235, ax + 0.235], [0.91, 0.945], [zr[0] - 0.015, zr[1] + 0.015], P, { r: 0.008, parent: g });
      boxFromTo([ax - 0.235, ax + 0.235], [0.84, 0.91], [zr[0] - 0.015, zr[0]], P, { r: 0.004, parent: g });
      boxFromTo([ax - 0.235, ax + 0.235], [0.84, 0.91], [zr[1], zr[1] + 0.015], P, { r: 0.004, parent: g });
      // prowadnice maźnicy (dwie pionowe „nogi” po bokach maźnicy)
      for (const side of [-1, 1]) {
        const px = ax + side * 0.215;
        boxFromTo([px - 0.016, px + 0.016], [0.40, 0.945], zr, P, { r: 0.006, parent: g });
        // nakładki ślizgowe na prowadnicach
        boxFromTo([px - side * 0.016 - 0.004, px - side * 0.016 + 0.004].sort((a, b) => a - b), [0.42, 0.66], [zr[0] + 0.03, zr[1] - 0.03], M.steelMachined, { r: 0.002, parent: g });
      }
      // końcówka ostojnicy za osią
      const xe = [ax + sx * 0.235, ax + sx * 0.52].sort((a, b) => a - b);
      boxFromTo(xe, [0.74, 0.92], zr, P, { r: 0.012, parent: g });
      // spoiny pachwinowe: kołpak – prowadnice
      weld([ax - 0.235, 0.91, zr[1] + 0.016], [ax + 0.235, 0.91, zr[1] + 0.016], 0.005, { parent: g });
      weld([ax - 0.235, 0.91, zr[0] - 0.016], [ax + 0.235, 0.91, zr[0] - 0.016], 0.005, { parent: g });
    }
    // żebra usztywniające na zewnętrznej ścianie ostojnicy
    const zo = s * (BOX_Z + 0.103);
    merged([-0.5, -0.25, 0.25, 0.5].map((x) => boxGeom(0.014, 0.28, 0.012, [x, 0.65, zo])), P, { parent: g });
    // wsporniki wieszaków belek hamulcowych (od wewnątrz)
    const zi = s * (BOX_Z - 0.115);
    merged([0.34, -0.34].map((x) => boxGeom(0.08, 0.1, 0.03, [x, 0.53, zi])), P, { parent: g });
  }
  // poprzecznica (belka poprzeczna z gniazdem skrętu)
  boxFromTo([-0.24, 0.24], [0.54, CROSS_TOP], [-0.9, 0.9], P, { r: 0.014, parent: g });
  // czołownice (belki na końcach ramy)
  for (const sx of [1, -1]) {
    boxFromTo([sx * 1.36 - 0.05, sx * 1.36 + 0.05], [0.80, 0.90], [-0.9, 0.9], P, { r: 0.01, parent: g });
  }
  // spoiny poprzecznica – ostojnice
  for (const s of [1, -1]) for (const x of [-0.24, 0.24]) {
    weld([x, 0.54, s * 0.9], [x, CROSS_TOP, s * 0.9], 0.006, { parent: g });
  }
  for (const s of [1, -1]) weld([-0.24, CROSS_TOP, s * 0.9], [0.24, CROSS_TOP, s * 0.9], 0.006, { parent: g });
  return g;
}

// Gniazdo skrętu (panew) – przenosi nacisk pudła na wózek i pozwala mu się obracać
export function buildCenterBowl() {
  const g = part('gniazdo_skretu');
  lathe([[0.0, 0.0], [0.21, 0.0], [0.21, 0.02], [0.185, 0.02], [0.185, 0.055], [0.165, 0.058], [0.16, 0.02], [0, 0.02]]
    .map(([r, y]) => [r, -y]), M.paintDarkRound, { seg: 64, rot: [Math.PI / 2, 0, 0], parent: g });
  // wkładka cierna / ślizgowa na dnie panwi
  mesh(ringGeom(0.035, 0.158, -0.026, -0.02, 64), M.steelMachined, { rot: [Math.PI / 2, 0, 0], parent: g });
  // śruby mocujące do poprzecznicy
  boltCircle(8, 0.197, -0.02, 0.016, { parent: g, rot: [Math.PI / 2, 0, 0], flip: true, start: Math.PI / 8 });
  return g;
}

// Ślizg boczny – ogranicza kołysanie pudła na wózku
export function buildSideBearer() {
  const g = part('slizg_boczny');
  box(0.24, 0.06, 0.13, M.paintDark, { pos: [0, 0.03, 0], r: 0.008, parent: g });
  box(0.16, 0.014, 0.09, M.steelMachined, { pos: [0, 0.067, 0], r: 0.003, parent: g });
  bolts([[-0.1, 0.06, 0.045], [-0.1, 0.06, -0.045], [0.1, 0.06, 0.045], [0.1, 0.06, -0.045]].map((pos) => ({ pos })), 0.014, M.bolt, { parent: g });
  return g;
}

export const bogieBuilders = {
  wozek_y25: buildBogie,
  rama_y25: buildFrame,
  gniazdo_skretu: buildCenterBowl,
  slizg_boczny: buildSideBearer,
};
