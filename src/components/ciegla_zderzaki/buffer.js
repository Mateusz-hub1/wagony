// Zderzak (buffer) – wspólny dla wszystkich wagonów.
// Układ lokalny zderzaka: początek na licu belki czołowej w osi zderzaka, oś zderzaka wzdłuż +x (na zewnątrz).
// Skok 105 mm – wg EN 15551 (zderzaki wagonów towarowych). Pozostałe wymiary (długość 620 mm,
// średnice, talerz) – SZACUNKOWE, do sprawdzenia w EN 15551 / UIC 526-1 / UIC 527-1.
import { THREE, M, part, slot, mesh, box, lathe, latheGeom, merged, bolts, cylinder } from '../../lib/geom.js';

export const BUFFER_LEN = 0.62;   // długość zderzaka od belki czołowej do lica talerza (SZACUNKOWE)
export const STROKE = 0.105;      // skok zderzaka (EN 15551)
const FLANGE = 0.37;              // bok kwadratowej płyty podstawy (SZACUNKOWE)
const CASE_R = 0.105;             // promień zewnętrzny tulei (SZACUNKOWE)
const CASE_END = 0.36;            // koniec tulei
const PLUNGER_R = 0.088;          // promień tłoka
const PLATE_R = 0.19;             // promień talerza (SZACUNKOWE)

const ALONG_X = [0, Math.PI / 2, 0]; // obrót bryły toczonej: oś Z → oś X

export function buildBuffer() {
  const g = part('zderzak');
  slot(g, 'tuleja', {});
  slot(g, 'wklad_sprezysty', { explode: [0.5, 0, 0] });
  slot(g, 'tlok', { explode: [1.0, 0, 0], remove: [0.9, 0, 0] });
  return g;
}

// Tuleja (korpus) z płytą podstawy, żebrami i śrubami mocującymi do belki czołowej
export function buildBufferCasing() {
  const g = part('tuleja_zderzaka');
  const P = M.paintDark;
  const t = 0.025;
  // płyta podstawy
  box(t, FLANGE, FLANGE, P, { pos: [t / 2, 0, 0], r: 0.006, parent: g });
  // tuleja: rura z pogrubieniem przy końcu
  lathe([
    [CASE_R - 0.012, CASE_END], [CASE_R + 0.008, CASE_END], [CASE_R + 0.008, CASE_END - 0.03],
    [CASE_R, CASE_END - 0.04], [CASE_R + 0.01, t], [CASE_R - 0.012, t], [CASE_R - 0.012, CASE_END],
  ], P, { rot: ALONG_X, seg: 48, parent: g });
  // żebra między płytą a tuleją (4 sztuki, ukośnie)
  const ribs = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const rib = new THREE.Shape();
    rib.moveTo(0, 0); rib.lineTo(0.16, 0); rib.lineTo(0, 0.1); rib.closePath();
    const rg = new THREE.ExtrudeGeometry(rib, { depth: 0.014, bevelEnabled: false });
    rg.translate(0, 0, -0.007);
    rg.translate(t, CASE_R, 0); // przy płycie, od powierzchni tulei w górę
    rg.rotateX(a);
    ribs.push(rg);
  }
  merged(ribs, P, { parent: g });
  // 4 śruby mocujące w narożach płyty, łby od strony zderzaka
  const c = FLANGE / 2 - 0.04;
  bolts([[c, c], [c, -c], [-c, c], [-c, -c]].map(([y, z]) => ({ pos: [t, y, z], dir: [1, 0, 0] })), 0.024, M.bolt, { parent: g, stick: 0.3 });
  return g;
}

// Tłok zderzaka (wsuwany w tuleję) z talerzem
export function buildBufferPlunger() {
  const g = part('tlok_zderzaka');
  slot(g, 'talerz', { pos: [BUFFER_LEN, 0, 0], explode: [0.25, 0, 0] });
  lathe([[0, 0.25], [PLUNGER_R, 0.25], [PLUNGER_R, BUFFER_LEN - 0.025], [0, BUFFER_LEN - 0.025]], M.steelMachined, { rot: ALONG_X, seg: 48, parent: g });
  // pierścień oporowy tłoka na końcu (widoczny po wysunięciu)
  cylinder(PLUNGER_R + 0.006, 0.02, M.steelRaw, { axis: 'x', pos: [0.26, 0, 0], seg: 48, parent: g });
  return g;
}

// Talerz zderzaka – początek na licu talerza. Lekko wypukły.
export function buildBufferPlate() {
  const g = part('talerz_zderzaka');
  const geo = latheGeom([[0, 0], [PLATE_R * 0.6, -0.004], [PLATE_R - 0.01, -0.012], [PLATE_R, -0.02], [PLATE_R, -0.03], [PLUNGER_R + 0.02, -0.035], [PLUNGER_R + 0.01, -0.05], [0, -0.05]], { seg: 64 });
  mesh(geo, M.steelMachined, { rot: ALONG_X, parent: g });
  // warstwa smaru na licu talerza
  lathe([[0, 0.001], [PLATE_R * 0.55, -0.002], [PLATE_R * 0.55, -0.004], [0, -0.002]], M.grease, { rot: ALONG_X, seg: 48, parent: g });
  return g;
}

// Wkład sprężysty: pakiet elastomerowych krążków przedzielonych płytkami stalowymi
export function buildBufferSpring() {
  const g = part('wklad_sprezysty_zderzaka');
  const rubber = [], steel = [];
  const x0 = 0.04, n = 8, h = 0.04;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (h + 0.008);
    rubber.push(latheGeom([[0.03, x], [0.08, x], [0.085, x + h / 2], [0.08, x + h], [0.03, x + h], [0.03, x]], { seg: 40 }));
    steel.push(latheGeom([[0.025, x + h], [0.083, x + h], [0.083, x + h + 0.008], [0.025, x + h + 0.008], [0.025, x + h]], { seg: 40 }));
  }
  merged(rubber, M.rubber, { rot: ALONG_X, parent: g });
  merged(steel, M.steelRaw, { rot: ALONG_X, parent: g });
  // trzpień prowadzący przez środek pakietu
  cylinder(0.022, n * (h + 0.008) + 0.04, M.steelMachined, { axis: 'x', pos: [x0 + (n * (h + 0.008)) / 2, 0, 0], parent: g });
  return g;
}

export const bufferBuilders = {
  zderzak: buildBuffer,
  tuleja_zderzaka: buildBufferCasing,
  tlok_zderzaka: buildBufferPlunger,
  talerz_zderzaka: buildBufferPlate,
  wklad_sprezysty_zderzaka: buildBufferSpring,
};

