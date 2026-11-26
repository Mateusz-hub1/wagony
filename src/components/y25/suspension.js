// Usprężynowanie Y25 nad jedną maźnicą: sprężyna zewnętrzna, wewnętrzna
// (krótsza – włącza się przy większym obciążeniu, charakterystyka dwustopniowa)
// i tłumik cierny Lenoira.
// Układ lokalny: początek na górze gniazda sprężyn maźnicy, -X = strona środka wózka.
// Wymiary sprężyn – SZACUNKOWE.
import { M, part, slot, mesh, box, rod, springGeom, cylinder, ringGeom } from '../../lib/geom.js';

const H_OUT = 0.25;   // wysokość sprężyny zewnętrznej pod obciążeniem (szacunkowo)
const H_IN = 0.215;   // sprężyna wewnętrzna jest niższa

export function buildSuspension() {
  const g = part('usprezynowanie');
  slot(g, 'sprezyna_zewn', { explode: [0, 0.32, 0] });
  slot(g, 'sprezyna_wewn', { explode: [0, 0.32, 0.32] });
  slot(g, 'tlumik_lenoira', { explode: [-0.32, 0.05, 0] });
  return g;
}

export function buildOuterSpring() {
  const g = part('sprezyna_zewn');
  mesh(springGeom(0.088, 0.018, H_OUT, 5.5), M.paintDarkRound, { parent: g });
  return g;
}

export function buildInnerSpring() {
  const g = part('sprezyna_wewn');
  mesh(springGeom(0.052, 0.013, H_IN, 6.5), M.paintDarkRound, { parent: g });
  return g;
}

// Tłumik Lenoira: pochylony wieszak dociska nakładkę cierną do boku maźnicy.
// Siła docisku rośnie z obciążeniem – tłumienie zależy od ładunku.
export function buildLenoir() {
  const g = part('tlumik_lenoira');
  // górny talerz sprężyn (oparcie pod kołpakiem ramy)
  mesh(ringGeom(0.0, 0.118, 0, 0.012, 48).rotateX(-Math.PI / 2), M.paintDarkRound, { pos: [0, H_OUT + 0.002, 0], parent: g });
  // nakładka cierna przylegająca do bocznej powierzchni maźnicy
  box(0.022, 0.13, 0.13, M.steelRaw, { pos: [-0.184, -0.14, 0], r: 0.004, parent: g });
  // okładzina cierna (od strony maźnicy)
  box(0.006, 0.12, 0.12, M.brakeInsert, { pos: [-0.1715, -0.14, 0], r: 0.002, parent: g });
  // wieszak Lenoira – dwa płaskowniki po bokach, pochylone
  for (const z of [0.045, -0.045]) {
    rod([-0.13, H_OUT - 0.01, z], [-0.2, -0.1, z], 0.011, M.steelRaw, { seg: 10, parent: g });
  }
  // sworznie wieszaka
  cylinder(0.012, 0.12, M.steelMachined, { axis: 'z', pos: [-0.13, H_OUT - 0.01, 0], parent: g });
  cylinder(0.012, 0.12, M.steelMachined, { axis: 'z', pos: [-0.2, -0.1, 0], parent: g });
  return g;
}

export const suspensionBuilders = {
  usprezynowanie: buildSuspension,
  sprezyna_zewn: buildOuterSpring,
  sprezyna_wewn: buildInnerSpring,
  tlumik_lenoira: buildLenoir,
};
