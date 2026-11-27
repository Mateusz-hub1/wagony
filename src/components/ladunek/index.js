// Wspólne urządzenia do zabezpieczania ładunku na platformach i wagonach do kontenerów:
// zaczepy kontenerowe (stałe i składane), kłonice (zdejmowane i obrotowe), uchwyty mocujące.
// Klucz = "typ" części w data/components/ladunek.json.
//
// Wagon wstawia je przez "ref": "components/ladunek.json#<szablon>" i ustawia w swoim
// gnieździe (slot) – położenie i obrót podaje wagon. Układ lokalny każdej części:
//   zaczep kontenerowy – początek: środek czopu na wysokości płyty oporowej (tu opiera się
//     naroże kontenera); +z = na zewnątrz wagonu (w tę stronę składa się zaczep składany).
//     Dla drugiej strony wagonu wystarczy gniazdo z obrotem [0, Math.PI, 0].
//   kłonica – początek: górna krawędź kieszeni, na zewnętrznej ścianie ostojnicy; +z na zewnątrz.
//     param.wysokosc – wysokość słupka nad kieszenią [m], param.obrotowa – true: kłonica
//     obrotowa (odchyla się na zewnątrz i zwisa), false: zdejmowana (wyjmowana do góry).
//   uchwyt mocujący – początek: punkt przyspawania na ścianie; +z na zewnątrz, pierścień zwisa w dół.
// Wymiary – SZACUNKOWE (brak publicznych rysunków). Kształt czopu dopasowany do otworu
// w dolnym narożu kontenera (ISO 1161) – do sprawdzenia.
import { THREE, M, part, slot, mesh, box, cylinder, lathe, merged, boxGeom, weld, inheritedParam } from '../../lib/geom.js';

const HINGE = [0, -0.08, 0.15]; // oś zawiasu zaczepu składanego (wzdłuż x) – SZACUNKOWE

// Czop zaczepu (spigot): stożek ścięty, spłaszczony w poprzek – wchodzi w otwór naroża kontenera.
// Początek: podstawa czopu (= górna powierzchnia płyty oporowej).
export function buildSpigot() {
  const g = part('czop_zaczepu');
  // profil obrotowy, potem spłaszczenie w z (podłużny otwór naroża) – SZACUNKOWE
  // lathe() obraca profil wokół osi z – obrót [-90°, 0, 0] stawia go pionowo (oś y)
  const m = lathe([[0, 0], [0.056, 0], [0.056, 0.012], [0.05, 0.04], [0.038, 0.062], [0.02, 0.07], [0, 0.071]], M.steelRaw, { seg: 32, rot: [-Math.PI / 2, 0, 0], parent: g });
  m.scale.set(1, 0.52, 1); // lokalne y siatki = z wagonu (po obrocie)
  weld([-0.056, 0.002, 0], [0.056, 0.002, 0], 0.005, { parent: g });
  return g;
}

// Płyta oporowa z czopem na wsporniku – zaczep STAŁY
export function buildFixedSpigot() {
  const g = part('zaczep_kontenerowy_staly');
  slot(g, 'wspornik_zaczepu', { explode: [0, -0.25, 0] });
  slot(g, 'czop_zaczepu', { explode: [0, 0.2, 0] });
  return g;
}

// Zaczep SKŁADANY: głowica z czopem obraca się na zawiasie i kładzie na zewnątrz
export function buildFoldingSpigot() {
  const g = part('zaczep_kontenerowy_skladany');
  slot(g, 'wspornik_zaczepu', { explode: [0, -0.25, 0] });
  // obrót o 180° wokół osi zawiasu: głowica przechodzi na zewnątrz i w dół (zaczep złożony)
  slot(g, 'glowica_zaczepu', { pos: HINGE, explode: [0, 0.2, 0.2], removeRot: [Math.PI, 0, 0] });
  return g;
}

// Wspornik: przyspawany do ostojnicy / poprzecznicy. W zaczepie stałym niesie płytę oporową,
// w składanym – ucha zawiasu, na których obraca się głowica.
export function buildSpigotBracket(node) {
  const g = part('wspornik_zaczepu');
  const skladany = node.parent?.typ === 'zaczep_kontenerowy_skladany';
  const P = M.paintDark;
  const topY = skladany ? -0.06 : -0.02;
  // korpus wspornika: dwie ścianki i dno (przekrój ceowy)
  const geoms = [
    boxGeom(0.012, 0.2, 0.24, [-0.1, topY - 0.1, 0]),
    boxGeom(0.012, 0.2, 0.24, [0.1, topY - 0.1, 0]),
    boxGeom(0.212, 0.012, 0.24, [0, topY - 0.194, 0]),
    boxGeom(0.212, 0.012, 0.24, [0, topY - 0.006, 0]),
  ];
  if (!skladany) geoms.push(boxGeom(0.3, 0.02, 0.3, [0, -0.01, 0])); // płyta oporowa
  merged(geoms, P, { parent: g });
  if (skladany) {
    // ucha zawiasu i sworzeń
    for (const x of [-0.125, 0.125]) box(0.02, 0.08, 0.07, P, { pos: [x, HINGE[1], HINGE[2] - 0.01], r: 0.006, parent: g });
    cylinder(0.014, 0.29, M.steelMachined, { axis: 'x', pos: HINGE, parent: g });
    for (const x of [-0.145, 0.145]) cylinder(0.022, 0.01, M.steelRaw, { axis: 'x', pos: [x, HINGE[1], HINGE[2]], parent: g });
    // zatrzask blokujący głowicę w położeniu roboczym (czerwony uchwyt)
    box(0.03, 0.05, 0.03, M.steelRaw, { pos: [0, topY - 0.03, -0.135], r: 0.005, parent: g });
    box(0.012, 0.012, 0.07, M.paintRed, { pos: [0, topY - 0.05, -0.17], r: 0.004, parent: g });
  }
  // spoiny do konstrukcji wagonu (dół wspornika)
  weld([-0.1, topY - 0.2, -0.12], [-0.1, topY - 0.2, 0.12], 0.006, { parent: g });
  weld([0.1, topY - 0.2, -0.12], [0.1, topY - 0.2, 0.12], 0.006, { parent: g });
  return g;
}

// Głowica zaczepu składanego: płyta oporowa z kolankiem zawiasu. Początek = oś zawiasu.
export function buildSpigotHead() {
  const g = part('glowica_zaczepu');
  const [, hy, hz] = HINGE;
  const o = (x, y, z) => [x, y - hy, z - hz]; // z układu zaczepu do układu zawiasu
  const geoms = [
    boxGeom(0.22, 0.025, 0.28, o(0, -0.0125, -0.01)),     // płyta oporowa (góra na y = 0)
    boxGeom(0.012, 0.035, 0.26, o(-0.08, -0.042, -0.01)), // żebra pod płytą
    boxGeom(0.012, 0.035, 0.26, o(0.08, -0.042, -0.01)),
  ];
  merged(geoms, M.paintDark, { parent: g });
  cylinder(0.024, 0.22, M.paintDarkRound, { axis: 'x', pos: [0, 0, 0], parent: g }); // kolanko zawiasu
  slot(g, 'czop_zaczepu', { pos: o(0, 0, 0), explode: [0, 0.15, 0] });
  return g;
}

// ---------- Kłonica ----------

const POCKET = { w: 0.15, d: 0.13, h: 0.3, t: 0.012 }; // kieszeń – SZACUNKOWE

export function buildStake(node) {
  const g = part('klonica');
  const p = inheritedParam(node, { wysokosc: 0.9, obrotowa: false });
  slot(g, 'kieszen_klonicy', { explode: [0, -0.2, 0.15] });
  if (p.obrotowa) {
    // oś obrotu przy górnej zewnętrznej krawędzi kieszeni; słupek odchyla się na zewnątrz i zwisa
    slot(g, 'slupek_klonicy', { pos: [0, 0, POCKET.d + 0.01], explode: [0, 0.3, 0.3], removeRot: [Math.PI * 0.97, 0, 0] });
  } else {
    slot(g, 'slupek_klonicy', { pos: [0, 0, POCKET.d + 0.01], explode: [0, 0.4, 0.3], remove: [0, p.wysokosc + 0.6, 0.4] });
  }
  return g;
}

// Kieszeń (gniazdo) kłonicy przyspawana do ostojnicy: trzy ścianki i ramka u góry
export function buildStakePocket() {
  const g = part('kieszen_klonicy');
  const { w, d, h, t } = POCKET, b = 0.025, W = w + 0.02;
  merged([
    boxGeom(w, h, t, [0, -h / 2, d - t / 2]),          // ścianka zewnętrzna
    boxGeom(t, h, d, [-w / 2 + t / 2, -h / 2, d / 2]), // ścianki boczne
    boxGeom(t, h, d, [w / 2 - t / 2, -h / 2, d / 2]),
    // ramka górna (kołnierz z otworem na słupek)
    boxGeom(W, 0.016, b, [0, -0.008, d - b / 2 + 0.005]),
    boxGeom(W, 0.016, b, [0, -0.008, b / 2]),
    boxGeom(b, 0.016, d, [-W / 2 + b / 2, -0.008, d / 2]),
    boxGeom(b, 0.016, d, [W / 2 - b / 2, -0.008, d / 2]),
  ], M.paintDark, { parent: g });
  // spoiny do ostojnicy
  weld([-w / 2, -h, 0.005], [w / 2, -h, 0.005], 0.006, { parent: g });
  weld([-w / 2, -0.02, 0.005], [-w / 2, -h, 0.005], 0.006, { parent: g });
  weld([w / 2, -0.02, 0.005], [w / 2, -h, 0.005], 0.006, { parent: g });
  return g;
}

// Słupek kłonicy (rura prostokątna). Początek: oś obrotu / górna krawędź kieszeni,
// słupek jest przesunięty o pół głębokości kieszeni do środka (wchodzi w kieszeń).
export function buildStakePost(node) {
  const g = part('slupek_klonicy');
  const p = inheritedParam(node, { wysokosc: 0.9 });
  const zc = -(POCKET.d / 2 + 0.01);
  const s = 0.1, t = 0.008, y0 = -POCKET.h + 0.02, y1 = p.wysokosc;
  // rura prostokątna 100 × 90 (SZACUNKOWE) – cztery ścianki
  merged([
    boxGeom(s, y1 - y0, t, [0, (y0 + y1) / 2, zc + 0.045 - t / 2]),
    boxGeom(s, y1 - y0, t, [0, (y0 + y1) / 2, zc - 0.045 + t / 2]),
    boxGeom(t, y1 - y0, 0.09, [-s / 2 + t / 2, (y0 + y1) / 2, zc]),
    boxGeom(t, y1 - y0, 0.09, [s / 2 - t / 2, (y0 + y1) / 2, zc]),
    boxGeom(s + 0.004, 0.01, 0.094, [0, y1 - 0.005, zc]), // zaślepka górna
  ], M.paintDark, { parent: g });
  // ogranicznik (kołnierz) opierający się na kieszeni
  box(0.13, 0.02, 0.12, M.paintDark, { pos: [0, 0.01, zc], r: 0.004, parent: g });
  // zawleczka / sworzeń zabezpieczający pod kieszenią
  cylinder(0.01, 0.2, M.steelMachined, { axis: 'x', pos: [0, y0 + 0.03, zc], parent: g });
  return g;
}

// ---------- Uchwyt mocujący (pierścień do pasów / łańcuchów) ----------
export function buildLashingRing() {
  const g = part('uchwyt_mocujacy');
  // wspornik z otworem (płaskownik zagięty) – SZACUNKOWE
  box(0.08, 0.045, 0.035, M.paintDark, { pos: [0, -0.015, 0.0175], r: 0.006, parent: g });
  weld([-0.04, -0.038, 0.002], [0.04, -0.038, 0.002], 0.005, { parent: g });
  weld([-0.04, 0.008, 0.002], [0.04, 0.008, 0.002], 0.005, { parent: g });
  // pierścień kuty zwisający ze wspornika (płaszczyzna pierścienia prostopadła do ściany)
  mesh(new THREE.TorusGeometry(0.045, 0.009, 10, 28), M.steelRaw, { pos: [0, -0.07, 0.045], rot: [0, Math.PI / 2, 0], parent: g });
  return g;
}

export const cargoBuilders = {
  zaczep_kontenerowy_staly: buildFixedSpigot,
  zaczep_kontenerowy_skladany: buildFoldingSpigot,
  wspornik_zaczepu: buildSpigotBracket,
  glowica_zaczepu: buildSpigotHead,
  czop_zaczepu: buildSpigot,
  klonica: buildStake,
  kieszen_klonicy: buildStakePocket,
  slupek_klonicy: buildStakePost,
  uchwyt_mocujacy: buildLashingRing,
};

