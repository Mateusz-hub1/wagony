// Układ hamulcowy wózka Y25: belki hamulcowe z klockami i wstawkami + dźwignie.
// Klocki działają jednostronnie, od strony środka wózka (do weryfikacji).
// Wymiary – SZACUNKOWE.
import { THREE, M, part, slot, mesh, box, rod, rodGeom, cylinder, merged, boxGeom } from '../../lib/geom.js';
import { AXLE_X } from './bogie.js';
import { WHEEL_R, BACK_TO_BACK } from './wheelset.js';

const BEAM_X = 0.34;                        // oś belki hamulcowej od środka wózka
const TREAD_Z = BACK_TO_BACK / 2 + 0.07;    // okrąg toczny koła (70 mm od wewn. powierzchni)
const SPAN = 0.33;                          // pół kąta obejmowania klocka [rad]

export function buildBogieBrake() {
  const g = part('hamulec_wozka');
  slot(g, 'belka_1', { pos: [BEAM_X, WHEEL_R, 0], explode: [0.22, -0.12, 0] });
  slot(g, 'belka_2', { pos: [-BEAM_X, WHEEL_R, 0], rot: [0, Math.PI, 0], explode: [-0.22, -0.12, 0] });
  slot(g, 'dzwignie', { explode: [0, -0.3, 0] });
  return g;
}

// Belka hamulcowa kratowa: rura ściskana + cięgno + rozpórka; na końcach klocki
export function buildBrakeBeam() {
  const g = part('belka_hamulcowa');
  const toWheel = AXLE_X - BEAM_X; // klocek ma początek w środku koła
  slot(g, 'klocek_1', { pos: [toWheel, 0, TREAD_Z], explode: [0, 0, 0.25] });
  slot(g, 'klocek_2', { pos: [toWheel, 0, -TREAD_Z], explode: [0, 0, -0.25] });
  // rura ściskana
  cylinder(0.03, 1.4, M.steelRaw, { axis: 'z', parent: g });
  // cięgno (kratownica) i rozpórka środkowa
  merged([
    rodGeom([0, 0, 0.66], [-0.13, 0, 0], 0.016, 10),
    rodGeom([0, 0, -0.66], [-0.13, 0, 0], 0.016, 10),
    boxGeom(0.13, 0.06, 0.05, [-0.065, 0, 0]),
  ], M.steelRaw, { parent: g });
  // głowice belki (łączą rurę z klockami)
  for (const s of [1, -1]) {
    box(0.07, 0.09, 0.06, M.steelRaw, { pos: [0.02, 0, s * 0.70], r: 0.008, parent: g });
    // wieszak belki do wspornika ramy
    rod([0.0, 0.0, s * 0.68], [0.0, 0.07, s * 0.875], 0.012, M.steelRaw, { seg: 10, parent: g });
  }
  return g;
}

// Kształt wycinka pierścienia (łuk klocka) w płaszczyźnie XY wokół środka koła, od strony -X
function arcShape(r1, r2, span) {
  const s = new THREE.Shape();
  const a0 = Math.PI - span, a1 = Math.PI + span;
  s.moveTo(Math.cos(a0) * r2, Math.sin(a0) * r2);
  s.absarc(0, 0, r2, a0, a1, false);
  s.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
  s.absarc(0, 0, r1, a1, a0, true);
  s.closePath();
  return s;
}
function arcGeom(r1, r2, span, width) {
  const g = new THREE.ExtrudeGeometry(arcShape(r1, r2, span), {
    depth: width, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2, curveSegments: 24,
  });
  g.translate(0, 0, -width / 2);
  return g;
}

// Klocek hamulcowy (oprawa wstawki) – początek w środku koła
export function buildBrakeBlock() {
  const g = part('klocek_hamulcowy');
  slot(g, 'wstawka', { explode: [0.12, 0, 0] });
  mesh(arcGeom(WHEEL_R + 0.05, WHEEL_R + 0.072, SPAN * 0.95, 0.07), M.paintDarkRound, { parent: g });
  // ucho klocka (połączenie z głowicą belki)
  box(0.05, 0.1, 0.05, M.paintDark, { pos: [-(WHEEL_R + 0.09), 0, 0], r: 0.008, parent: g });
  // klin mocujący wstawkę
  cylinder(0.008, 0.16, M.steelRaw, { pos: [-(WHEEL_R + 0.078), 0, 0], parent: g });
  return g;
}

// Wstawka hamulcowa – część cierna, która dociskana jest do powierzchni tocznej koła
export function buildBrakeInsert() {
  const g = part('wstawka_hamulcowa');
  mesh(arcGeom(WHEEL_R + 0.003, WHEEL_R + 0.05, SPAN, 0.08), M.brakeInsert, { parent: g });
  return g;
}

// Dźwignie hamulcowe w środku wózka + cięgło łączące
export function buildLevers() {
  const g = part('dzwignie');
  for (const s of [1, -1]) {
    const x = s * 0.2;
    // dźwignia z dwóch płaskowników
    for (const z of [0.022, -0.022]) box(0.05, 0.36, 0.014, M.steelRaw, { pos: [x, 0.34, z], r: 0.004, parent: g });
    // sworznie
    for (const y of [0.2, 0.46, 0.5]) cylinder(0.011, 0.07, M.steelMachined, { axis: 'z', pos: [x, y, 0], parent: g });
  }
  // cięgło między dźwigniami (dół)
  rod([-0.2, 0.2, 0], [0.2, 0.2, 0], 0.014, M.steelRaw, { parent: g });
  // fragment cięgła do hamulca wagonu
  rod([0.2, 0.5, 0], [0.55, 0.5, 0], 0.014, M.steelRaw, { parent: g });
  return g;
}

export const brakeBuilders = {
  hamulec_wozka: buildBogieBrake,
  belka_hamulcowa: buildBrakeBeam,
  klocek_hamulcowy: buildBrakeBlock,
  wstawka_hamulcowa: buildBrakeInsert,
  dzwignie: buildLevers,
};
