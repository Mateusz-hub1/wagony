// Cylinder hamulcowy z tłokiem i pokrywą przednią.
// Układ lokalny: początek w środku tylnej pokrywy, oś cylindra wzdłuż +x.
// Średnica i długość – SZACUNKOWE (typowy cylinder wagonu towarowego, do sprawdzenia).
import { M, part, slot, mesh, box, lathe, latheGeom, cylinder, merged, boxGeom, boltCircle, springGeom } from '../../lib/geom.js';
import { cfg, layout } from './config.js';

const ALONG_X = [0, Math.PI / 2, 0]; // bryła toczona: oś Z → oś X

export function buildBrakeCylinder(node) {
  const g = part('cylinder_hamulcowy');
  const lay = layout(cfg(node));
  const R = lay.cylR, len = lay.cylLen;
  slot(g, 'pokrywa_cylindra', { pos: [len, 0, 0], explode: [0.35, 0, 0], remove: [0.7, 0, 0] });
  slot(g, 'tlok_cylindra', { explode: [0.9, 0, 0] });
  // korpus: rura z tylną pokrywą (tył zamknięty) i kołnierzem przednim
  lathe([
    [0.03, 0], [R - 0.03, 0], [R, 0.03], [R, len - 0.03], [R + 0.025, len - 0.03], [R + 0.025, len],
    [R - 0.008, len], [R - 0.008, 0.02], [0.03, 0.02], [0.03, 0],
  ], M.paintDarkRound, { rot: ALONG_X, seg: 64, parent: g });
  // przyłącze rury od zaworu rozrządczego (z tyłu)
  cylinder(0.02, 0.05, M.steelRaw, { axis: 'x', pos: [-0.02, 0, 0], parent: g });
  // łapy mocujące do ostoi i żebra
  merged([
    boxGeom(0.06, 0.04, 2 * R + 0.06, [0.08, R + 0.02, 0]),
    boxGeom(0.06, 0.04, 2 * R + 0.06, [len - 0.08, R + 0.02, 0]),
    boxGeom(len - 0.1, 0.012, 0.04, [len / 2, R + 0.03, R * 0.6]),
    boxGeom(len - 0.1, 0.012, 0.04, [len / 2, R + 0.03, -R * 0.6]),
  ], M.paintDark, { parent: g });
  return g;
}

// Pokrywa przednia z prowadnicą tłoczyska. Początek: płaszczyzna kołnierza.
export function buildCylinderCover(node) {
  const g = part('pokrywa_cylindra');
  const R = layout(cfg(node)).cylR;
  lathe([
    [0.045, 0.09], [0.06, 0.09], [0.07, 0.06], [R - 0.05, 0.035], [R + 0.025, 0.02], [R + 0.025, 0],
    [R - 0.01, 0], [R - 0.06, 0.02], [0.045, 0.06], [0.045, 0.09],
  ], M.paintDarkRound, { rot: ALONG_X, seg: 64, parent: g });
  // śruby kołnierza
  boltCircle(10, R + 0.012, 0.02, 0.012, { parent: g, rot: ALONG_X, start: 0 });
  // otwór odpowietrzający z sitkiem
  cylinder(0.012, 0.02, M.steelMachined, { axis: 'x', pos: [0.04, R * 0.6, 0], parent: g });
  return g;
}

// Tłok z tłoczyskiem (wypychaczem) i sprężyną powrotną
export function buildCylinderPiston(node) {
  const g = part('tlok_cylindra');
  const lay = layout(cfg(node));
  const R = lay.cylR, len = lay.cylLen;
  const rodEnd = lay.lever1X - lay.cyl[0]; // do dźwigni cylindrowej
  // tłok z uszczelnieniem (mankietem)
  mesh(latheGeom([[0, 0.06], [R - 0.014, 0.06], [R - 0.012, 0.075], [R - 0.014, 0.09], [0, 0.09]], { seg: 64 }), M.steelRaw, { rot: ALONG_X, parent: g });
  mesh(latheGeom([[R - 0.03, 0.04], [R - 0.01, 0.04], [R - 0.009, 0.06], [R - 0.03, 0.06]], { seg: 64 }), M.rubber, { rot: ALONG_X, parent: g });
  // tłoczysko (rura) do dźwigni
  cylinder(0.035, rodEnd - 0.09, M.steelMachined, { axis: 'x', pos: [0.09 + (rodEnd - 0.09) / 2, 0, 0], seg: 24, parent: g });
  // widełki na końcu tłoczyska
  for (const z of [0.025, -0.025]) box(0.08, 0.06, 0.012, M.steelRaw, { pos: [rodEnd - 0.03, 0, z], r: 0.004, parent: g });
  // sprężyna powrotna (między tłokiem a pokrywą)
  const spr = springGeom(R * 0.62, 0.008, len - 0.11, 4.5);
  spr.rotateZ(-Math.PI / 2);
  mesh(spr, M.paintDarkRound, { pos: [0.09, 0, 0], parent: g });
  return g;
}

export const cylinderBuilders = {
  cylinder_hamulcowy: buildBrakeCylinder,
  pokrywa_cylindra: buildCylinderCover,
  tlok_cylindra: buildCylinderPiston,
};

