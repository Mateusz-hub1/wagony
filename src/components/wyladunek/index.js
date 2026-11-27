// Wspólne części pneumatycznego układu wyładunku wagonów samowyładowczych (Fals, Falns…):
// siłownik pneumatyczny, zawór sterujący i przewody sterujące. Klucz = "typ" części
// w data/components/wyladunek.json (tam też wspólne opisy lejów, klap, zamków i mechanizmu –
// bryły lejów i klap są różne w każdej serii, więc buduje je plik wagonu).
// Części budowane są od razu w układzie WAGONU (lub napędu jednej strony) – położenie podaje
// wagon w "param" (szukane w górę drzewa, jak w ostoi) albo wprost w kodzie (drugi argument
// funkcji, np. buildActuator(node, { ... })):
//   silownik: { x0, x1 – zakres cylindra wzdłuż x, y, z – oś cylindra, r – promień,
//               x_dzwigni – sworzeń dźwigni napędowej, na którą działa tłoczysko (po stronie x1),
//               y_mocowania – spód konstrukcji, do której przykręcone są wsporniki }
//   zawor:    { poz: [x, y, z] – środek korpusu zaworu sterującego }
//   przewody: { trasy – lista tras rur [[x, y, z], ...], r – promień rury,
//               obejmy – [{ x, z, y0, y1 }] wieszaki rur do spodu ostoi,
//               kurek – [x, y, z] kurek odcinający (opcjonalny) }
// Domyślne wartości siłownika i zaworu = Fals (SZACUNKOWE).
import { THREE, M, part, mesh, box, boxFromTo, boxGeom, cylinder, rod, rodGeom, merged, inheritedParam } from '../../lib/geom.js';

const DEF = {
  silownik: { x0: -1.7, x1: -1.15, y: 0.78, z: 1.34, r: 0.075, x_dzwigni: -0.85, y_mocowania: 0.92 },
  zawor: { poz: [-4.3, 1.03, 1.47] },
};
const params = (node) => {
  const p = inheritedParam(node, {});
  return {
    silownik: { ...DEF.silownik, ...(p.silownik ?? {}) },
    zawor: { ...DEF.zawor, ...(p.zawor ?? {}) },
    przewody: { trasy: [], r: 0.011, obejmy: [], kurek: null, ...(p.przewody ?? {}) },
  };
};

// Siłownik pneumatyczny pod ostojnicą – obraca wał (albo dźwignie) mechanizmu przez dźwignię napędową
export function buildActuator(node, cfg) {
  const g = part('silownik');
  const { x0, x1, y, z, r, x_dzwigni: DRIVE_X, y_mocowania } = { ...params(node).silownik, ...(cfg ?? {}) };
  cylinder(r, x1 - x0, M.paintDarkRound, { axis: 'x', pos: [(x0 + x1) / 2, y, z], seg: 28, parent: g });
  for (const x of [x0, x1]) cylinder(r + 0.012, 0.025, M.paintDark, { axis: 'x', pos: [x, y, z], seg: 28, parent: g });
  // ściągi pokryw
  for (const a of [0.8, 2.4, 3.9, 5.5]) {
    const dy = Math.sin(a) * (r + 0.006), dz = Math.cos(a) * (r + 0.006);
    rod([x0, y + dy, z + dz], [x1, y + dy, z + dz], 0.005, M.steelRaw, { seg: 6, parent: g });
  }
  // tłoczysko z widełkami do dźwigni napędowej
  cylinder(0.02, DRIVE_X - x1 - 0.02, M.steelMachined, { axis: 'x', pos: [(x1 + DRIVE_X - 0.02) / 2, y, z], seg: 14, parent: g });
  for (const dz of [-0.03, 0.03]) box(0.06, 0.04, 0.01, M.steelRaw, { pos: [DRIVE_X - 0.03, y, z + dz], r: 0.003, parent: g });
  // wsporniki do spodu ostojnicy
  for (const x of [x0 + 0.06, x1 - 0.06]) boxFromTo([x - 0.03, x + 0.03], [y + r - 0.01, y_mocowania - 0.002], [z - 0.03, z + 0.03], M.paintDark, { r: 0.004, parent: g });
  // przyłącze powietrza z tyłu
  cylinder(0.014, 0.04, M.steelRaw, { axis: 'x', pos: [x0 - 0.03, y, z], seg: 10, parent: g });
  return g;
}

// Zawór sterujący z dźwignią (położenia: zamykanie / otwieranie), tabliczką położeń
// i przyłączem sprężonego powietrza z zewnętrznej instalacji.
export function buildControlValve(node, cfg) {
  const g = part('zawor_sterujacy');
  const [x, y, z] = (cfg ?? params(node).zawor).poz;
  box(0.12, 0.12, 0.08, M.paintDark, { pos: [x, y, z], r: 0.012, parent: g });
  box(0.16, 0.02, 0.1, M.paintDark, { pos: [x, y + 0.07, z], r: 0.004, parent: g });
  // dźwignia sterująca (skierowana w dół)
  cylinder(0.018, 0.03, M.steelRaw, { axis: 'z', pos: [x, y + 0.03, z + 0.05], seg: 14, parent: g });
  rod([x, y + 0.03, z + 0.055], [x - 0.1, y - 0.15, z + 0.055], 0.011, M.paintRed, { seg: 10, parent: g });
  mesh(new THREE.SphereGeometry(0.02, 12, 8), M.paintRed, { pos: [x - 0.1, y - 0.15, z + 0.055], parent: g });
  // tabliczka położeń
  box(0.12, 0.06, 0.004, M.paintWhite, { pos: [x - 0.02, y - 0.02, z + 0.042], r: 0.002, parent: g });
  // przyłącze powietrza z zewnętrznej instalacji (króciec z głowicą, w dół)
  cylinder(0.014, 0.08, M.steelRaw, { pos: [x + 0.035, y - 0.1, z], seg: 10, parent: g });
  box(0.05, 0.05, 0.05, M.steelRaw, { pos: [x + 0.035, y - 0.16, z], r: 0.008, parent: g });
  return g;
}

// Przewody sterujące: rury od zaworu do siłowników (trasy podaje wagon), obejmy z wieszakami
// do spodu ostoi i kurek odcinający z czerwoną rękojeścią.
export function buildControlPipes(node, cfg) {
  const g = part('przewody_sterujace');
  const { trasy, r, obejmy, kurek } = { ...params(node).przewody, ...(cfg ?? {}) };
  const geoms = [];
  for (const pts of trasy) for (let i = 0; i < pts.length - 1; i++) geoms.push(rodGeom(pts[i], pts[i + 1], r, 10));
  if (geoms.length) merged(geoms, M.paintDarkRound, { parent: g });
  // obejmy przewodów (płaskownik od rury do spodu ostoi)
  const clamps = obejmy.map(({ x, z, y0, y1 }) => boxGeom(0.03, y1 - y0, 0.012, [x, (y0 + y1) / 2, z]));
  if (clamps.length) merged(clamps, M.paintDark, { parent: g });
  if (kurek) {
    mesh(new THREE.SphereGeometry(0.024, 14, 10), M.paintDark, { pos: kurek, parent: g });
    box(0.1, 0.012, 0.012, M.paintRed, { pos: [kurek[0] - 0.03, kurek[1] + 0.03, kurek[2]], r: 0.004, parent: g });
  }
  return g;
}

export const dischargeBuilders = {
  silownik_pneumatyczny: buildActuator,
  zawor_sterujacy: buildControlValve,
  przewody_sterujace: buildControlPipes,
};
