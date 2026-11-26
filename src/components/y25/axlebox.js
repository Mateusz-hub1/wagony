// Maźnica (axle box) z łożyskiem tocznym kasetowym.
// Układ lokalny maźnicy: początek w środku łożyska na osi czopa, +Z na zewnątrz wagonu.
// Wymiary łożyska przyjęte szacunkowo: 130 × 230 × 160 mm (otwór × średnica zewn. × szerokość).
import { THREE, M, part, slot, mesh, box, boxFromTo, lathe, latheGeom, ringGeom, boltCircle, merged, boxGeom, cylGeom } from '../../lib/geom.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Wymiary łożyska
const B = { rIn: 0.065, rOut: 0.115, halfW: 0.08 };

export function buildAxlebox() {
  const g = part('maznica');
  slot(g, 'korpus', { pos: [0, 0, 0] });
  slot(g, 'uszczelnienie', { pos: [0, 0, 0], explode: [0, 0, -0.22] });
  slot(g, 'lozysko', { pos: [0, 0, 0], explode: [0, 0, 0.30] });
  slot(g, 'smar', { pos: [0, 0, 0], explode: [0, 0, 0.30] }); // smar wyjeżdża razem z łożyskiem
  slot(g, 'plytka_czolowa', { pos: [0, 0, 0], explode: [0, 0, 0.55] });
  slot(g, 'pokrywa', { pos: [0, 0, 0], explode: [0, 0, 0.72], remove: [0, 0, 0.6] });
  return g;
}

// Korpus maźnicy: staliwna obudowa łożyska z gniazdem sprężyn na górze
export function buildAxleboxBody() {
  const g = part('korpus');
  // obudowa cylindryczna (wewnątrz siedzi pierścień zewnętrzny łożyska)
  lathe([
    [B.rOut, -0.095], [0.142, -0.095], [0.148, -0.088], [0.148, 0.085],
    [0.162, 0.088], [0.162, 0.100], [B.rOut + 0.012, 0.100], [B.rOut, 0.092], [B.rOut, -0.095],
  ], M.paintDarkRound, { seg: 64, parent: g });
  // gniazdo sprężyn (płyta na górze) + żebra łączące z obudową
  box(0.34, 0.035, 0.21, M.paintDark, { pos: [0, 0.168, 0], r: 0.008, parent: g });
  merged([
    boxGeom(0.025, 0.07, 0.19, [-0.10, 0.125, 0]),
    boxGeom(0.025, 0.07, 0.19, [0.10, 0.125, 0]),
    boxGeom(0.20, 0.05, 0.025, [0, 0.135, 0.085]),
    boxGeom(0.20, 0.05, 0.025, [0, 0.135, -0.085]),
  ], M.paintDark, { parent: g });
  // pierścienie centrujące sprężyny (zewnętrzna i wewnętrzna)
  mesh(ringGeom(0.112, 0.122, 0, 0.012, 48).rotateX(-Math.PI / 2), M.paintDarkRound, { pos: [0, 0.1855, 0], parent: g });
  mesh(cylGeom(0.04, 0.015), M.paintDarkRound, { pos: [0, 0.192, 0], parent: g });
  // boczne powierzchnie prowadzące (pod nakładki cierne tłumika)
  for (const s of [1, -1]) {
    boxFromTo([s * 0.150, s * 0.172].sort((a, b) => a - b), [-0.05, 0.15], [-0.08, 0.08], M.steelMachined, { r: 0.003, parent: g });
  }
  // dolny występ (zaczep)
  box(0.12, 0.03, 0.14, M.paintDark, { pos: [0, -0.158, 0], parent: g });
  return g;
}

// Pokrywa przednia maźnicy z 4 śrubami (zdejmowalna)
export function buildCover() {
  const g = part('pokrywa');
  lathe([
    [0, 0.152], [0.06, 0.150], [0.10, 0.142], [0.128, 0.128], [0.140, 0.112],
    [0.162, 0.112], [0.162, 0.100], [0.128, 0.100], [0.128, 0.104],
  ], M.paintDarkRound, { seg: 64, parent: g });
  // wewnętrzna strona pokrywy (ciemna, żeby nie prześwitywała)
  lathe([[0.128, 0.104], [0.10, 0.130], [0.06, 0.138], [0, 0.140]], M.paintDarkRound, { seg: 48, parent: g });
  // żebra na pokrywie
  merged([0, 1, 2, 3].map((i) => {
    const gg = boxGeom(0.012, 0.09, 0.02, [0, 0.075, 0.137]);
    gg.rotateZ(i * Math.PI / 2 + Math.PI / 4);
    return gg;
  }), M.paintDark, { parent: g });
  boltCircle(4, 0.150, 0.112, 0.016, { parent: g, start: 0 });
  return g;
}

// Płytka czołowa osi: dociska pierścień wewnętrzny łożyska, mocowana 3 śrubami w czole osi
export function buildEndCap() {
  const g = part('plytka_czolowa');
  lathe([[0, 0.100], [0.072, 0.100], [0.076, 0.096], [0.076, 0.087], [0.07, 0.085], [0, 0.085]], M.steelRaw, { seg: 48, parent: g });
  boltCircle(3, 0.04, 0.100, 0.014, { parent: g, start: Math.PI / 2 });
  // podkładka zabezpieczająca (blacha odginana)
  mesh(ringGeom(0.03, 0.052, 0.100, 0.102, 48), M.steelMachined, { parent: g });
  return g;
}

// Pierścień labiryntowy (uszczelnienie od strony koła)
export function buildSeal() {
  const g = part('uszczelnienie');
  lathe([
    [0.085, -0.125], [0.13, -0.125], [0.13, -0.115], [0.118, -0.115], [0.118, -0.108],
    [0.13, -0.108], [0.13, -0.100], [0.118, -0.100], [0.118, -0.093], [0.112, -0.090],
    [0.085, -0.090], [0.085, -0.125],
  ], M.steelMachined, { seg: 64, sharpDeg: 30, parent: g });
  // gumowa warga uszczelnienia
  const lip = new THREE.TorusGeometry(0.103, 0.006, 10, 64);
  mesh(lip, M.rubber, { pos: [0, 0, -0.088], parent: g });
  return g;
}

// Smar plastyczny – półprzezroczysta masa wypełniająca łożysko (między pierścieniami,
// wokół wałeczków) i przestrzeń maźnicy przed łożyskiem, pod pokrywą.
// Po zdjęciu pokrywy widać smar wokół płytki czołowej, a przez niego wnętrze łożyska.
export function buildGrease() {
  const g = part('smar');
  const mat = M.grease.clone();
  mat.transparent = true;
  mat.depthWrite = false; // żeby elementy wewnątrz (wałeczki, koszyk) były widoczne

  // 1) wypełnienie łożyska: pierścień między bieżniami, przenika przez wałeczki
  const inside = mesh(latheGeom([
    [0.083, -0.074], [0.098, -0.074], [0.098, 0.074], [0.083, 0.074], [0.083, -0.074],
  ], { seg: 64 }), mat, { parent: g });
  inside.material = mat.clone();
  inside.material.opacity = 0.35;
  inside.raycast = () => {}; // klik „przechodzi” do łożyska – smar wybiera się z przodu

  // 2) masa przed łożyskiem: od płytki czołowej do ścianki maźnicy, nierówna powierzchnia
  const front = latheGeom([
    [0.078, 0.080], [0.124, 0.080], [0.126, 0.090], [0.120, 0.099], [0.100, 0.104],
    [0.086, 0.103], [0.078, 0.098], [0.078, 0.080],
  ], { seg: 72, sharpDeg: 60 });
  bumpy(front, 0.080);
  const fm = mesh(front, mat, { parent: g });
  fm.material.opacity = 0.5;

  for (const m of g.children) { m.castShadow = false; m.renderOrder = 1; }
  return g;
}

// Nieregularność „nałożonego” smaru: falowanie powierzchni zależne od kąta
function bumpy(geo, zBase) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (v.z <= zBase + 0.002) continue; // spód (przy łożysku) zostaje płaski
    const a = Math.atan2(v.y, v.x);
    const k = 0.004 * Math.sin(a * 7) + 0.0025 * Math.sin(a * 13 + 1.3) + 0.0015 * Math.sin(a * 23);
    p.setZ(i, v.z + k);
  }
  geo.computeVertexNormals();
}

// ---------- Łożysko toczne kasetowe (dwurzędowe, stożkowe) ----------
const ROW_Z = 0.04;      // środki rzędów elementów tocznych
const PITCH_R = 0.0905;  // promień podziałowy wałeczków
const ROLLERS = 22;      // liczba wałeczków w rzędzie (szacunkowo)
const TILT = THREE.MathUtils.degToRad(9); // pochylenie osi wałeczka (łożysko stożkowe)

export function buildBearing() {
  const g = part('lozysko');
  slot(g, 'pierscien_zewn', { explode: [0, 0, 0.30] });
  slot(g, 'koszyk', { explode: [0, 0, 0.16] });
  slot(g, 'elementy_toczne', { explode: [0, 0, 0] });
  slot(g, 'pierscien_wewn', { explode: [0, 0, -0.22] });
  return g;
}

// Pierścień zewnętrzny (wspólny dla obu rzędów) – dwie stożkowe bieżnie
export function buildOuterRing() {
  const g = part('pierscien_zewn');
  lathe([
    [0.103, -B.halfW], [B.rOut, -B.halfW], [B.rOut, B.halfW], [0.103, B.halfW],
    [0.1, B.halfW - 0.004], [0.0965, 0.012], [0.0965, -0.012], [0.1, -B.halfW + 0.004], [0.103, -B.halfW],
  ], M.steelBearing, { seg: 96, sharpDeg: 25, parent: g });
  return g;
}

// Pierścienie wewnętrzne (2 szt. + pierścień dystansowy) – osadzone na czopie osi
export function buildInnerRing() {
  const g = part('pierscien_wewn');
  for (const s of [1, -1]) {
    const pr = [
      [B.rIn, 0.003], [0.0805, 0.003], [0.0815, 0.012], [0.085, 0.07], [0.0885, 0.071],
      [0.0885, B.halfW], [B.rIn, B.halfW], [B.rIn, 0.003],
    ].map(([r, z]) => [r, s * z]);
    lathe(s > 0 ? pr : pr.reverse(), M.steelBearing, { seg: 96, sharpDeg: 25, parent: g });
  }
  mesh(ringGeom(B.rIn, 0.074, -0.003, 0.003, 64), M.steelMachined, { parent: g });
  return g;
}

// Wałeczki stożkowe, 2 rzędy
export function buildRollers() {
  const g = part('elementy_toczne');
  const geoms = [];
  for (const s of [1, -1]) {
    for (let i = 0; i < ROLLERS; i++) {
      const a = (i / ROLLERS) * Math.PI * 2 + (s > 0 ? 0 : Math.PI / ROLLERS);
      // wałeczek stożkowy: węższy koniec skierowany do środka łożyska
      const r = s > 0 ? new THREE.CylinderGeometry(0.0078, 0.0068, 0.05, 16)
        : new THREE.CylinderGeometry(0.0068, 0.0078, 0.05, 16);
      r.rotateX(Math.PI / 2); // oś wałeczka wzdłuż Z
      // pochylenie w płaszczyźnie promieniowej (jak stożkowe bieżnie pierścieni)
      r.applyMatrix4(new THREE.Matrix4().makeRotationX(-s * TILT));
      r.translate(0, PITCH_R, s * ROW_Z);
      r.rotateZ(a);
      geoms.push(r);
    }
  }
  mesh(mergeGeometries(geoms), M.steelBearing, { parent: g });
  return g;
}

// Koszyk – utrzymuje odstępy między wałeczkami (poliamid lub mosiądz)
export function buildCage() {
  const g = part('koszyk');
  const geoms = [];
  for (const s of [1, -1]) {
    geoms.push(ringGeom(0.087, 0.098, s * ROW_Z - 0.03, s * ROW_Z - 0.026, 64));
    geoms.push(ringGeom(0.083, 0.094, s * ROW_Z + 0.026, s * ROW_Z + 0.03, 64));
    for (let i = 0; i < ROLLERS; i++) {
      const a = ((i + 0.5) / ROLLERS) * Math.PI * 2 + (s > 0 ? 0 : Math.PI / ROLLERS);
      const bar = new THREE.BoxGeometry(0.006, 0.006, 0.054); // zwykły prostopadłościan – tysiące trójkątów mniej
      bar.applyMatrix4(new THREE.Matrix4().makeRotationX(-s * TILT));
      bar.translate(0, PITCH_R + 0.002, s * ROW_Z);
      bar.rotateZ(a);
      geoms.push(bar);
    }
  }
  merged(geoms, M.polyamide, { parent: g });
  return g;
}

export const axleboxBuilders = {
  maznica: buildAxlebox,
  korpus_maznicy: buildAxleboxBody,
  pokrywa_maznicy: buildCover,
  plytka_czolowa: buildEndCap,
  uszczelnienie: buildSeal,
  smar: buildGrease,
  lozysko: buildBearing,
  pierscien_zewn: buildOuterRing,
  pierscien_wewn: buildInnerRing,
  elementy_toczne: buildRollers,
  koszyk: buildCage,
};
