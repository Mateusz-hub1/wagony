// Wspólne elementy ostoi, takie same w każdym wagonie: czop skrętu, stopnie i poręcze manewrowe.
// Klucz = "typ" części w data/components/ostoja.json.
// Wagon wstawia je przez "ref": "components/ostoja.json#<szablon>" i podaje wymiary
// w "param" (zwykle raz, w węźle "ostoja" – części odczytują je przez inheritedParam):
//   pol_dlugosci   – odległość lica belki czołowej od środka wagonu [m]
//   z_ostojnicy    – zewnętrzna ściana ostojnicy od osi wagonu [m]
//   pol_szerokosci – pół szerokości pudła przy ścianie czołowej (poręcz pionowa) [m]
//   y_ostojnicy    – spód ostojnicy nad główką szyny (mocowanie stopnia) [m]
//   y_poreczy      – wysokość poręczy poziomej na ostojnicy [m]
//   y_poreczy_pion – [od, do] poręczy pionowej na ścianie czołowej [m]
//   sx, sz         – który narożnik (±1) – podawane w węźle stopnia / poręczy
// Domyślne wartości = Eaos. Wymiary SZACUNKOWE, chyba że wagon poda inne ze źródła.
import { M, part, rod, lathe, boltCircle, boxGeom, merged, inheritedParam } from '../../lib/geom.js';

const DEF = {
  pol_dlugosci: 6.4, z_ostojnicy: 1.4, pol_szerokosci: 1.4,
  y_ostojnicy: 0.92, y_poreczy: 1.12, y_poreczy_pion: [1.35, 2.15],
  y_stopnia: 0.45, // wysokość stopnia nad główką szyny – SZACUNKOWE, sprawdzić w UIC 535-2 / EN 16116-2
  sx: 1, sz: 1,
};

// Czop skrętu (od strony pudła) – wchodzi w gniazdo skrętu wózka. Początek: środek walca.
export function buildPivot() {
  const g = part('czop_skretu');
  lathe([[0, -0.085], [0.142, -0.085], [0.15, -0.077], [0.15, 0.06], [0.21, 0.06], [0.21, 0.085], [0, 0.085]], M.paintDarkRound, { seg: 64, rot: [-Math.PI / 2, 0, 0], parent: g });
  boltCircle(6, 0.185, 0.06, 0.018, { parent: g, rot: [-Math.PI / 2, 0, 0], flip: true, start: 0 });
  return g;
}

// Stopień manewrowy w narożniku. Budowany od razu w układzie wagonu (gniazdo bez przesunięcia).
export function buildStep(node) {
  const g = part('stopien_manewrowy');
  const p = inheritedParam(node, DEF);
  const { sx, sz } = p;
  const x = sx * (p.pol_dlugosci - 0.4), z = sz * p.z_ostojnicy;
  const yTread = p.y_stopnia;
  // dwa wsporniki z płaskownika
  for (const dx of [-0.2, 0.2]) {
    rod([x + dx, p.y_ostojnicy, z + sz * 0.01], [x + dx, yTread, z + sz * 0.06], 0.012, M.paintDark, { seg: 8, parent: g });
  }
  // stopień kratowy (płaskowniki na krawędź)
  const bars = [];
  for (let i = 0; i < 5; i++) bars.push(boxGeom(0.44, 0.03, 0.008, [x, yTread, z + sz * (0.0 + i * 0.045)]));
  bars.push(boxGeom(0.012, 0.03, 0.2, [x - 0.21, yTread, z + sz * 0.09]));
  bars.push(boxGeom(0.012, 0.03, 0.2, [x + 0.21, yTread, z + sz * 0.09]));
  merged(bars, M.paintDark, { parent: g });
  return g;
}

// Poręcze manewrowe w narożniku: pionowa na ścianie czołowej i pozioma na boku.
export function buildHandrail(node) {
  const g = part('porecz_manewrowa');
  const p = inheritedParam(node, DEF);
  const { sx, sz } = p;
  const R = 0.014, L = p.pol_dlugosci, [yv0, yv1] = p.y_poreczy_pion;
  // pionowa – na licu ściany czołowej przy narożniku (SZACUNKOWE)
  const xo = sx * (L + 0.06), zv = sz * (p.pol_szerokosci - 0.08);
  rod([xo, yv0, zv], [xo, yv1, zv], R, M.paintDark, { seg: 12, parent: g });
  for (const y of [yv0, yv1]) rod([xo, y, zv], [sx * (L - 0.01), y, zv], R, M.paintDark, { seg: 12, parent: g });
  // pozioma – na ostojnicy nad stopniem
  const zs = sz * (p.z_ostojnicy + 0.07), x0 = sx * (L - 0.7), x1 = sx * (L - 0.15), y = p.y_poreczy;
  rod([x0, y, zs], [x1, y, zs], R, M.paintDark, { seg: 12, parent: g });
  for (const x of [x0, x1]) rod([x, y, zs], [x, y, sz * p.z_ostojnicy], R, M.paintDark, { seg: 12, parent: g });
  return g;
}

export const underframeBuilders = {
  czop_skretu: buildPivot,
  stopien_manewrowy: buildStep,
  porecz_manewrowa: buildHandrail,
};
