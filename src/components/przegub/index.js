// Przegub wagonu dwuczłonowego (np. Sggrss): łączy dwa człony nad wspólnym wózkiem środkowym.
// Klucz = "typ" części w data/components/przegub.json. Wagon wstawia go przez
// "ref": "components/przegub.json" i ustawia w gnieździe nad czopem skrętu wózka środkowego.
//
// Układ lokalny przegubu: początek = środek łożyska przegubu (na pionowej osi skrętu wózka),
// +x w stronę członu 1, -x w stronę członu 2, y w górę.
//   część męska (człon 1) – górne ramię z okiem, w którym siedzi sworzeń; przyspawane do belki
//     czołowej członu 1 (param.ramie_1 – odległość od osi przegubu do tej belki),
//   część żeńska (człon 2) – gniazdo z pierścieniem zewnętrznym łożyska i czopem skrętu od spodu,
//     który wchodzi w gniazdo skrętu wózka (param.ramie_2 – odległość do belki członu 2),
//   łożysko przegubu – łożysko kuliste (przegubowe): kula wewnętrzna + pierścień zewnętrzny,
//     pozwala członom skręcać się i przechylać względem siebie,
//   sworzeń przegubu – pionowy sworzeń przez oko części męskiej i kulę łożyska.
//   przewód hamulcowy przegubu – giętki wąż łączący przewody główne członów;
//     param.waz: { a: [x, y, z], b: [x, y, z] } – końce w układzie przegubu (kołnierze rur).
// Wymiary – SZACUNKOWE (brak publicznych rysunków), do sprawdzenia na wagonie.
import { THREE, M, part, slot, mesh, box, cylinder, lathe, merged, boxGeom, bolts, weld, inheritedParam } from '../../lib/geom.js';

const DEF = { ramie_1: 0.7, ramie_2: 0.7, waz: null };
const UP = [-Math.PI / 2, 0, 0]; // lathe() obraca profil wokół z – ten obrót stawia go pionowo (oś y)

// Wymiary (SZACUNKOWE)
const R_BALL = 0.115;            // promień kuli łożyska
const H_BALL = 0.055;            // pół wysokości kuli (ścięta z góry i z dołu)
const R_RING = [0.118, 0.185];   // pierścień zewnętrzny łożyska
const H_RING = 0.045;
const R_WALL = [0.19, 0.25];     // ścianka gniazda części żeńskiej
const Y_BASE = [-0.13, -0.075];  // dno gniazda
const R_PIN = 0.038;             // sworzeń
const Y_MALE = [0.07, 0.13];     // ramię części męskiej (nad gniazdem)

export function buildArticulation() {
  const g = part('przegub');
  slot(g, 'czesc_meska', { explode: [0.45, 0.45, 0] });
  slot(g, 'czesc_zenska', { explode: [-0.45, -0.25, 0] });
  slot(g, 'lozysko_przegubu', { explode: [0, 0.2, 0.5] });
  // sworzeń zdejmowany do góry – wtedy widać łożysko
  slot(g, 'sworzen_przegubu', { explode: [0, 0.75, 0], remove: [0, 0.6, 0] });
  slot(g, 'przewod_przegubu', { explode: [0, -0.45, 0] });
  return g;
}

// Część męska: płyta ramienia z okiem nad łożyskiem, przyspawana do belki członu 1 (+x)
export function buildMaleHalf(node) {
  const g = part('czesc_meska');
  const p = inheritedParam(node, DEF);
  const [y0, y1] = Y_MALE, x1 = p.ramie_1;
  // oko (pierścień wokół sworznia) – na górze, nad kulą łożyska
  lathe([[R_PIN + 0.004, y0], [0.2, y0], [0.21, y0 + 0.01], [0.21, y1 - 0.01], [0.2, y1], [R_PIN + 0.004, y1]], M.paintDarkRound, { rot: UP, seg: 48, parent: g });
  // tuleja pod okiem – dociska kulę od góry
  lathe([[R_PIN + 0.004, H_BALL + 0.002], [0.07, H_BALL + 0.002], [0.07, y0], [R_PIN + 0.004, y0]], M.steelMachined, { rot: UP, seg: 32, parent: g });
  // ramię: dwie blachy pionowe (środniki) + pas górny i dolny
  merged([
    boxGeom(x1 - 0.15, y1 - y0, 0.26, [(0.15 + x1) / 2, (y0 + y1) / 2, 0]),
    boxGeom(0.02, 0.24, 0.3, [x1 - 0.01, (y0 + y1) / 2 + 0.05, 0]), // płyta czołowa do belki członu
  ], M.paintDark, { parent: g });
  // żebra
  for (const z of [-0.1, 0.1]) box(x1 - 0.25, 0.1, 0.014, M.paintDark, { pos: [(0.25 + x1) / 2 - 0.01, y1 + 0.05, z], r: 0.004, parent: g });
  // spoiny przy płycie czołowej
  weld([x1 - 0.02, y1, -0.13], [x1 - 0.02, y1, 0.13], 0.007, { parent: g });
  weld([x1 - 0.02, y0, -0.13], [x1 - 0.02, y0, 0.13], 0.007, { parent: g });
  return g;
}

// Część żeńska: gniazdo z dnem i ścianką, czop skrętu od spodu, ramię do belki członu 2 (-x)
export function buildFemaleHalf(node) {
  const g = part('czesc_zenska');
  const p = inheritedParam(node, DEF);
  const [ri, ro] = R_WALL, [b0, b1] = Y_BASE, top = H_RING + 0.01, x2 = p.ramie_2;
  // gniazdo: dno + ścianka (jeden profil obrotowy)
  lathe([[0, b0], [ro, b0], [ro + 0.01, b0 + 0.01], [ro + 0.01, top - 0.01], [ro, top], [ri, top], [ri, b1], [0.06, b1], [0.06, b0 + 0.01], [0, b0 + 0.01]],
    M.paintDarkRound, { rot: UP, seg: 56, parent: g });
  // czop skrętu od spodu (wchodzi w gniazdo skrętu wózka)
  lathe([[0, b0 - 0.13], [0.135, b0 - 0.13], [0.145, b0 - 0.12], [0.145, b0], [0, b0]], M.steelMachined, { rot: UP, seg: 48, parent: g });
  // ramię do belki członu 2: skrzynka z blach
  merged([
    boxGeom(x2 - ro + 0.03, top - b0, 0.34, [-(ro - 0.03 + x2) / 2, (top + b0) / 2, 0]),
    boxGeom(0.02, 0.3, 0.42, [-(x2 - 0.01), (top + b0) / 2, 0]), // płyta czołowa do belki członu
  ], M.paintDark, { parent: g });
  // śruby pokrywy gniazda i spoina ramienia
  bolts(Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    return { pos: [Math.cos(a) * (ri + 0.03), top, Math.sin(a) * (ri + 0.03)], dir: [0, 1, 0] };
  }), 0.016, M.bolt, { parent: g });
  weld([-(x2 - 0.02), top, -0.17], [-(x2 - 0.02), top, 0.17], 0.007, { parent: g });
  return g;
}

// Łożysko przegubu: kula wewnętrzna (z otworem na sworzeń) w pierścieniu zewnętrznym
export function buildArticulationBearing() {
  const g = part('lozysko_przegubu');
  // kula ścięta z góry i z dołu
  const prof = [[R_PIN + 0.002, -H_BALL]];
  for (let i = 0; i <= 12; i++) {
    const y = -H_BALL + (2 * H_BALL * i) / 12;
    prof.push([Math.sqrt(R_BALL * R_BALL - y * y), y]);
  }
  prof.push([R_PIN + 0.002, H_BALL]);
  lathe(prof, M.steelBearing, { rot: UP, seg: 48, parent: g });
  // pierścień zewnętrzny (wewnątrz kulisty, na zewnątrz walcowy)
  const [r0, r1] = R_RING;
  lathe([[r0 + 0.004, -H_RING], [r1, -H_RING], [r1, H_RING], [r0 + 0.004, H_RING]], M.steelMachined, { rot: UP, seg: 48, parent: g });
  return g;
}

// Sworzeń: trzon przez kulę i oko części męskiej, łeb na górze, podkładka i zawleczka
export function buildArticulationPin() {
  const g = part('sworzen_przegubu');
  const yTop = Y_MALE[1];
  cylinder(R_PIN, yTop - (-H_BALL) + 0.02, M.steelMachined, { pos: [0, (yTop - H_BALL + 0.02) / 2, 0], seg: 28, parent: g });
  lathe([[0, yTop], [0.075, yTop], [0.075, yTop + 0.03], [0.068, yTop + 0.037], [0, yTop + 0.037]], M.steelRaw, { rot: UP, seg: 32, parent: g });
  bolts([{ pos: [0.05, yTop + 0.037, 0], dir: [0, 1, 0] }, { pos: [-0.05, yTop + 0.037, 0], dir: [0, 1, 0] }], 0.014, M.bolt, { parent: g });
  return g;
}

// Przewód hamulcowy przegubu: wąż giętki między kołnierzami przewodów głównych obu członów.
// Przewody członów kończą się po przeciwnych stronach osi wagonu (człon 2 jest obrócony), więc wąż
// przechodzi na drugą stronę przed gniazdem przegubu (od strony członu 1), nieco poniżej końców,
// omijając czop skrętu. param.waz.punkty – własna trasa (punkty pośrednie), jeśli domyślna nie pasuje.
export function buildArticulationHose(node) {
  const g = part('przewod_przegubu');
  const { waz } = inheritedParam(node, DEF);
  // domyślne końce (SZACUNKOWE) – wagon podaje dokładne końce w param.waz.a / .b
  const a = waz?.a ?? [0.75, -0.11, 0.32];
  const b = waz?.b ?? [-0.75, -0.11, -0.32];
  const y = Math.min(a[1], b[1]) - 0.04, xc = R_WALL[1] + 0.12;
  const mid = waz?.punkty ?? [
    [a[0] - 0.2, y, a[2]], [xc, y, a[2] * 0.85], [xc - 0.08, y, 0], [xc, y, b[2] * 0.95],
    [0, y, b[2]], [b[0] + 0.2, y, b[2]],
  ];
  const end = (q) => [q[0] - Math.sign(q[0]) * 0.045, q[1], q[2]]; // od lica kołnierza
  const pts = [end(a), ...mid, end(b)].map((q) => new THREE.Vector3(...q));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  mesh(new THREE.TubeGeometry(curve, 96, 0.022, 12, false), M.rubber, { parent: g });
  // złączki na końcach (przykręcane do kołnierzy rur) – przesunięte o grubość kołnierza w stronę
  // przegubu, żeby nie wchodziły w kołnierz
  for (const q of [a, b]) mesh(new THREE.SphereGeometry(0.03, 14, 10), M.steelRaw, { pos: end(q), parent: g });
  return g;
}

export const articulationBuilders = {
  przegub: buildArticulation,
  czesc_meska: buildMaleHalf,
  czesc_zenska: buildFemaleHalf,
  lozysko_przegubu: buildArticulationBearing,
  sworzen_przegubu: buildArticulationPin,
  przewod_przegubu: buildArticulationHose,
};

