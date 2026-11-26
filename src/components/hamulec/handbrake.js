// Hamulec ręczny (postojowy): koło ręczne na ścianie czołowej (koniec 2), przekładnia na belce czołowej,
// cięgło do dźwigni stałej hamulca. Występuje tylko w części wagonów – sterowany przez param.hamulec_reczny.
// Położenia i wymiary – SZACUNKOWE.
import { THREE, M, part, mesh, box, cylinder, rod } from '../../lib/geom.js';
import { cfg, layout } from './config.js';

export function buildHandBrake(node) {
  const g = part('hamulec_reczny');
  const lay = layout(cfg(node));
  const { wheel: [wx, wy, wz], gear: [gx, gy, gz], leverZ } = lay.hb;
  const R = 0.2;
  // koło ręczne: wieniec + 4 szprychy + piasta (oś koła wzdłuż x)
  const rim = new THREE.TorusGeometry(R, 0.014, 10, 48);
  rim.rotateY(Math.PI / 2);
  mesh(rim, M.paintDark, { pos: [wx, wy, wz], parent: g });
  const spokes = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    spokes.push([[wx, wy, wz], [wx, wy + Math.sin(a) * R, wz + Math.cos(a) * R]]);
  }
  for (const [a, b] of spokes) rod(a, b, 0.01, M.paintDark, { seg: 8, parent: g });
  cylinder(0.035, 0.06, M.paintDark, { axis: 'x', pos: [wx, wy, wz], parent: g });
  // wspornik koła i przekładnia kątowa na ścianie czołowej
  box(0.08, 0.12, 0.12, M.paintDark, { pos: [wx + 0.07, wy, wz], r: 0.01, parent: g });
  // wałek pionowy do przekładni na belce czołowej
  rod([gx, wy - 0.05, wz], [gx, gy + 0.09, gz], 0.018, M.steelRaw, { seg: 12, parent: g });
  for (const y of [wy - 0.25, 1.3]) box(0.04, 0.03, 0.06, M.paintDark, { pos: [gx + 0.025, y, wz], r: 0.004, parent: g });
  // przekładnia (skrzynka) na licu belki czołowej
  box(0.12, 0.18, 0.14, M.paintDark, { pos: [gx, gy, gz], r: 0.015, parent: g });
  // cięgło pod belką czołową do dźwigni stałej
  const p0 = [gx + 0.02, gy - 0.1, gz];
  const p1 = [-(lay.L - 0.25), 0.8, gz + 0.05];
  const p2 = [lay.lever2X, lay.leverY, leverZ];
  rod(p0, p1, 0.013, M.steelRaw, { seg: 10, parent: g });
  rod(p1, p2, 0.013, M.steelRaw, { seg: 10, parent: g });
  mesh(new THREE.SphereGeometry(0.02, 10, 8), M.steelRaw, { pos: p1, parent: g });
  return g;
}

export const handBrakeBuilders = { hamulec_reczny: buildHandBrake };
