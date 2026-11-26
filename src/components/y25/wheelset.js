// Zestaw kołowy: oś + 2 koła + 2 maźnice.
// Układ lokalny zestawu: początek w środku osi, oś wzdłuż Z.
// Wymiary: koło Ø920 mm (nowe), rozstaw wewnętrznych powierzchni kół 1360 mm,
// tor 1435 mm. Wymiary osi – szacunkowe (z rysunków poglądowych), do sprawdzenia.
import { THREE, M, part, slot, lathe, mesh } from '../../lib/geom.js';

export const WHEEL_R = 0.46;          // promień koła na okręgu tocznym (Ø920)
export const BACK_TO_BACK = 1.36;     // odległość wewnętrznych powierzchni kół
export const JOURNAL_Z = 1.0;         // środek czopa / łożyska (szacunkowo)

export function buildWheelset() {
  const g = part('zestaw_kolowy');
  const zIn = BACK_TO_BACK / 2;
  slot(g, 'os', { pos: [0, 0, 0] });
  slot(g, 'kolo_1', { pos: [0, 0, zIn], explode: [0, 0, 0.35] });
  slot(g, 'kolo_2', { pos: [0, 0, -zIn], rot: [0, Math.PI, 0], explode: [0, 0, -0.35] });
  slot(g, 'maznica_1', { pos: [0, 0, JOURNAL_Z], explode: [0, 0, 0.75] });
  slot(g, 'maznica_2', { pos: [0, 0, -JOURNAL_Z], rot: [0, Math.PI, 0], explode: [0, 0, -0.75] });
  return g;
}

// Oś zestawu kołowego: profil toczony [promień, z] (pół osi, potem odbicie lustrzane)
export function buildAxle() {
  const g = part('os');
  const half = [
    [0.092, 0.0],    // trzon osi (szacunkowo Ø184)
    [0.092, 0.60],
    [0.100, 0.635],  // przejście do podstopia
    [0.105, 0.650],
    [0.105, 0.860],  // podstopie koła (szacunkowo Ø210)
    [0.090, 0.870],
    [0.085, 0.875],  // czop podpiaściowy (pod uszczelnienie)
    [0.085, 0.915],
    [0.070, 0.920],
    [0.065, 0.925],  // czop łożyskowy Ø130 (szacunkowo)
    [0.065, 1.080],
    [0.060, 1.085],
    [0.000, 1.085],  // czoło osi
  ];
  const profile = [...half.slice().reverse().map(([r, z]) => [r, -z]), ...half.slice(1)];
  lathe(profile, M.steelRaw, { seg: 64, parent: g });
  // otwory gwintowane w czołach osi (pod śruby płytki czołowej) – tylko jako ciemne krążki
  for (const s of [1, -1]) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      const hole = new THREE.CylinderGeometry(0.008, 0.008, 0.002, 12);
      hole.rotateX(Math.PI / 2);
      mesh(hole, M.rubber, { pos: [Math.cos(a) * 0.04, Math.sin(a) * 0.04, s * 1.0855], parent: g });
    }
  }
  return g;
}

// Koło: początek na wewnętrznej powierzchni wieńca (od strony obrzeża), koło rośnie w +Z.
// Profil toczny zbliżony do S1002 (EN 13715): obrzeże ~28 mm, okrąg toczny 70 mm
// od wewnętrznej powierzchni, szerokość wieńca 135 mm. Punkty przybliżone.
export function buildWheel() {
  const g = part('kolo');
  const R = WHEEL_R;
  // Powierzchnia toczna + obrzeże (błyszcząca)
  const tread = [
    [R - 0.010, 0.135],  // fazka zewnętrzna
    [R - 0.006, 0.130],
    [R - 0.0025, 0.125],
    [R - 0.001, 0.115],
    [R - 0.0007, 0.100], // stożek ok. 1:40
    [R, 0.070],          // okrąg toczny
    [R + 0.0003, 0.060],
    [R + 0.0015, 0.048], // przejście w obrzeże
    [R + 0.006, 0.038],
    [R + 0.015, 0.032],
    [R + 0.024, 0.026],
    [R + 0.028, 0.018],  // wierzchołek obrzeża
    [R + 0.025, 0.008],
    [R + 0.018, 0.003],
    [R + 0.008, 0.0],
  ];
  lathe(tread, M.steelTread, { seg: 128, sharpDeg: 50, parent: g });

  // Reszta koła: czoło wewnętrzne, tarcza (lekko falista), piasta, czoło zewnętrzne
  const body = [
    [R + 0.008, 0.0],     // czoło wewnętrzne wieńca
    [0.400, 0.0],
    [0.392, 0.018],
    [0.385, 0.035],       // tarcza – strona wewnętrzna
    [0.330, 0.057],
    [0.250, 0.072],
    [0.165, 0.097],
    [0.150, 0.060],       // piasta – strona wewnętrzna
    [0.145, 0.000],
    [0.140, -0.015],
    [0.130, -0.020],
    [0.105, -0.020],      // otwór piasty (na podstopiu osi)
    [0.105, 0.180],
    [0.132, 0.180],
    [0.142, 0.172],
    [0.150, 0.150],
    [0.165, 0.125],       // tarcza – strona zewnętrzna
    [0.250, 0.100],
    [0.330, 0.085],
    [0.385, 0.090],
    [0.398, 0.110],
    [0.400, 0.135],       // czoło zewnętrzne wieńca
    [R - 0.010, 0.135],
  ];
  lathe(body, M.steelWheel, { seg: 128, sharpDeg: 40, parent: g });
  return g;
}

export const wheelsetBuilders = {
  zestaw_kolowy: buildWheelset,
  os: buildAxle,
  kolo: buildWheel,
};
