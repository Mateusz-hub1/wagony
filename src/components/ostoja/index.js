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
//   porecz_pionowa – gdzie jest poręcz pionowa: "sciana" (na ścianie czołowej, domyślnie),
//                    "belka" (na licu belki czołowej – wagony bez ściany czołowej, np. platformy)
//                    albo false (brak poręczy pionowej)
//   y_poreczy_belka – [od, do] poręczy pionowej na belce czołowej [m] (gdy "belka")
//   pomost         – wymiary pomostu na końcu wagonu (patrz buildPlatform, domyślnie = Fals)
// Domyślne wartości = Eaos. Wymiary SZACUNKOWE, chyba że wagon poda inne ze źródła.
import { M, part, rod, rodGeom, lathe, boltCircle, box, boxFromTo, boxGeom, merged, bolts, inheritedParam } from '../../lib/geom.js';

const DEF = {
  pol_dlugosci: 6.4, z_ostojnicy: 1.4, pol_szerokosci: 1.4,
  y_ostojnicy: 0.92, y_poreczy: 1.12, y_poreczy_pion: [1.35, 2.15],
  y_stopnia: 0.45, // wysokość stopnia nad główką szyny – SZACUNKOWE, sprawdzić w UIC 535-2 / EN 16116-2
  sx: 1, sz: 1,
  porecz_pionowa: 'sciana',
  y_poreczy_belka: null, // domyślnie: od spodu ostojnicy w górę o 0,4 m – SZACUNKOWE
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
  if (p.porecz_pionowa === 'sciana') {
    // pionowa – na licu ściany czołowej przy narożniku (SZACUNKOWE)
    const xo = sx * (L + 0.06), zv = sz * (p.pol_szerokosci - 0.08);
    rod([xo, yv0, zv], [xo, yv1, zv], R, M.paintDark, { seg: 12, parent: g });
    for (const y of [yv0, yv1]) rod([xo, y, zv], [sx * (L - 0.01), y, zv], R, M.paintDark, { seg: 12, parent: g });
  } else if (p.porecz_pionowa === 'belka') {
    // pionowa – na licu belki czołowej przy narożniku (wagon bez ściany czołowej, SZACUNKOWE)
    const [yb0, yb1] = p.y_poreczy_belka ?? [p.y_ostojnicy, p.y_ostojnicy + 0.4];
    const xo = sx * (L + 0.07), zv = sz * (p.z_ostojnicy - 0.12);
    rod([xo, yb0, zv], [xo, yb1, zv], R, M.paintDark, { seg: 12, parent: g });
    for (const y of [yb0 + 0.03, yb1 - 0.03]) rod([xo, y, zv], [sx * (L - 0.005), y, zv], R, M.paintDark, { seg: 12, parent: g });
  }
  // pozioma – na ostojnicy nad stopniem
  const zs = sz * (p.z_ostojnicy + 0.07), x0 = sx * (L - 0.7), x1 = sx * (L - 0.15), y = p.y_poreczy;
  rod([x0, y, zs], [x1, y, zs], R, M.paintDark, { seg: 12, parent: g });
  for (const x of [x0, x1]) rod([x, y, zs], [x, y, sz * p.z_ostojnicy], R, M.paintDark, { seg: 12, parent: g });
  return g;
}

// Pomost na końcu wagonu: blacha ryflowana nad belką czołową i barierka; opcjonalnie słupek
// koła hamulca ręcznego (param.slupek_hamulca = położenie z słupka). Budowany w układzie wagonu
// dla końca 1 (+x); koniec 2 – gniazdo z obrotem [0, Math.PI, 0].
// param.pomost: x_od – początek pomostu od środka wagonu, y – wierzch ostoi pod blachą,
//   z_barierki – barierka w poprzek, x_barierki – [słupki wewnętrzne, zewnętrzne],
//   y_barierki – [poręcz środkowa, górna], x_slupka – słupek koła hamulca.
// Koniec pomostu = lico belki czołowej (pol_dlugosci), szerokość = z_ostojnicy.
// Domyślne wartości = Fals (SZACUNKOWE).
const PLATFORM = { x_od: 4.6, y: 1.16, z_barierki: 1.34, x_barierki: [4.95, 5.3], y_barierki: [1.65, 2.15], x_slupka: 4.86 };
export function buildPlatform(node) {
  const g = part('pomost');
  const p = inheritedParam(node, DEF);
  const q = { ...PLATFORM, ...(p.pomost ?? {}) };
  const P = M.paintDark;
  const x0 = q.x_od, x1 = p.pol_dlugosci - 0.01, y0 = q.y, y1 = q.y + 0.025, W = p.z_ostojnicy;
  boxFromTo([x0, x1], [y0, y1], [-W, W], M.paintBody, { r: 0.004, parent: g });
  // ryflowanie (wypukłe paski)
  const ribs = [];
  for (let x = x0 + 0.06; x < x1 - 0.03; x += 0.08) for (let z = -(W - 0.1); z < W - 0.1; z += 0.16) ribs.push(boxGeom(0.03, 0.004, 0.008, [x, y1 + 0.002, z]));
  merged(ribs, M.paintBody, { parent: g });
  // barierka: słupki, poręcze górne i środkowe
  const R = 0.017, zs = q.z_barierki, [xs, xe] = q.x_barierki, [ym, yt] = q.y_barierki;
  const rails = [];
  for (const s of [1, -1]) {
    rails.push(rodGeom([xe, y1, s * zs], [xe, yt, s * zs], R, 12));
    rails.push(rodGeom([xs, y1, s * zs], [xs, yt, s * zs], R, 12));
    for (const y of [ym, yt]) rails.push(rodGeom([xs, y, s * zs], [xe, y, s * zs], R, 12));
  }
  for (const y of [ym, yt]) rails.push(rodGeom([xe, y, -zs], [xe, y, zs], R, 12));
  merged(rails, P, { parent: g });
  // stopy słupków
  bolts([xe, xs].flatMap((x) => [1, -1].map((s) => ({ pos: [x + 0.03, y1, s * zs], dir: [0, 1, 0] }))), 0.012, M.bolt, { parent: g });
  if (node?.param?.slupek_hamulca) {
    // słupek koła hamulca ręcznego (koło – część hamulca zespolonego)
    const z = node.param.slupek_hamulca, xc = q.x_slupka;
    boxFromTo([xc - 0.025, xc + 0.025], [y1, 1.89 + (q.y - PLATFORM.y)], [z - 0.03, z + 0.03], P, { r: 0.006, parent: g });
    box(0.12, 0.012, 0.12, P, { pos: [xc, y1 + 0.006, z], r: 0.003, parent: g });
  }
  return g;
}

export const underframeBuilders = {
  pomost: buildPlatform,
  czop_skretu: buildPivot,
  stopien_manewrowy: buildStep,
  porecz_manewrowa: buildHandrail,
};
