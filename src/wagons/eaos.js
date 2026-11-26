// Wagon Eaos (węglarka) – na etapie 2 model UPROSZCZONY.
// Pełne pudło i ostoja powstaną w etapie 3. Tu tylko rozmieszczamy wspólne
// podzespoły (2 × wózek Y25) i dokładamy bryły pudła i ostoi.
// Wymiary – SZACUNKOWE, do sprawdzenia: długość ze zderzakami ok. 14,04 m,
// rozstaw czopów skrętu ok. 9 m.
import { M, part, slot, box, boxFromTo, merged, boxGeom, cylinder } from '../lib/geom.js';
import { y25Builders } from '../components/y25/index.js';

const PIVOT_X = 4.5;      // pół rozstawu czopów skrętu
const HALF_LEN = 6.4;     // pół długości ostoi (między belkami czołowymi)
const FLOOR_Y = 1.25;     // góra ostoi / podłoga
const SIDE_Z = 1.45;      // pół szerokości pudła

export function buildEaos() {
  const g = part('eaos');
  slot(g, 'pudlo', { explode: [0, 1.6, 0] });
  slot(g, 'ostoja', { explode: [0, 0.7, 0] });
  slot(g, 'wozek_1', { pos: [PIVOT_X, 0, 0], explode: [1.8, 0, 0] });
  slot(g, 'wozek_2', { pos: [-PIVOT_X, 0, 0], rot: [0, Math.PI, 0], explode: [-1.8, 0, 0] });
  return g;
}

// Ostoja (uproszczona): ostojnice, belki czołowe, belki skrętowe z czopami
export function buildUnderframe() {
  const g = part('ostoja');
  const P = M.paintBody;
  for (const s of [1, -1]) {
    // ostojnice
    boxFromTo([-HALF_LEN, HALF_LEN], [0.95, FLOOR_Y], [s * 1.38 - 0.06, s * 1.38 + 0.06].sort((a, b) => a - b), P, { r: 0.01, parent: g });
    // belki czołowe
    boxFromTo([s * HALF_LEN - 0.1, s * HALF_LEN + 0.1], [0.88, FLOOR_Y], [-SIDE_Z, SIDE_Z], P, { r: 0.012, parent: g });
    // belki skrętowe
    boxFromTo([s * PIVOT_X - 0.2, s * PIVOT_X + 0.2], [0.95, FLOOR_Y], [-1.38, 1.38], P, { r: 0.012, parent: g });
    // czop skrętu (wchodzi w gniazdo wózka)
    cylinder(0.15, 0.17, M.paintDarkRound, { pos: [s * PIVOT_X, 0.865, 0], seg: 48, parent: g });
    // przeciwślizgi nad ślizgami wózka
    for (const z of [0.82, -0.82]) box(0.2, 0.13, 0.12, P, { pos: [s * PIVOT_X, 0.88, z], parent: g });
  }
  // belka środkowa i poprzecznice
  boxFromTo([-HALF_LEN, HALF_LEN], [1.0, FLOOR_Y], [-0.15, 0.15], P, { r: 0.01, parent: g });
  merged([-3, -1.5, 0, 1.5, 3].map((x) => boxGeom(0.12, 0.2, 2.64, [x, 1.15, 0])), P, { parent: g });
  return g;
}

// Pudło (uproszczone): podłoga, ściany boczne ze słupkami, ściany czołowe, pas górny
export function buildBody() {
  const g = part('pudlo');
  const P = M.paintBody;
  const top = FLOOR_Y + 2.0;
  boxFromTo([-HALF_LEN + 0.05, HALF_LEN - 0.05], [FLOOR_Y, FLOOR_Y + 0.02], [-SIDE_Z, SIDE_Z], P, { r: 0.004, parent: g });
  for (const s of [1, -1]) {
    // poszycie ściany bocznej
    boxFromTo([-HALF_LEN + 0.05, HALF_LEN - 0.05], [FLOOR_Y, top], [s * SIDE_Z - 0.004, s * SIDE_Z + 0.004].sort((a, b) => a - b), P, { r: 0.002, parent: g });
    // słupki
    const xs = [];
    for (let x = -HALF_LEN + 0.1; x <= HALF_LEN - 0.05; x += 1.06) xs.push(x);
    merged(xs.map((x) => boxGeom(0.08, 2.0, 0.06, [x, FLOOR_Y + 1.0, s * (SIDE_Z + 0.03)])), P, { parent: g });
    // pas górny
    boxFromTo([-HALF_LEN + 0.05, HALF_LEN - 0.05], [top - 0.1, top + 0.02], [s * SIDE_Z - 0.06, s * SIDE_Z + 0.06].sort((a, b) => a - b), P, { r: 0.02, parent: g });
    // ściany czołowe
    boxFromTo([s * (HALF_LEN - 0.05) - 0.005, s * (HALF_LEN - 0.05) + 0.005].sort((a, b) => a - b), [FLOOR_Y, top - 0.15], [-SIDE_Z, SIDE_Z], P, { r: 0.002, parent: g });
  }
  return g;
}

// Wszystkie buildery, których potrzebuje Eaos (wagon + wspólne podzespoły)
export const builders = {
  ...y25Builders,
  eaos: buildEaos,
  ostoja_eaos: buildUnderframe,
  pudlo_eaos: buildBody,
};
