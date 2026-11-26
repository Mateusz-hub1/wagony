// Przewody hamulca: przewód główny, rury łączące, sprzęgi hamulcowe (węże) i zbiornik pomocniczy.
// Średnice rur – SZACUNKOWE.
import { THREE, M, part, mesh, box, lathe, latheGeom, cylinder, merged, boxGeom } from '../../lib/geom.js';
import { cfg, layout, pipeGeoms } from './config.js';

const ALONG_X = [0, Math.PI / 2, 0];

// Przewód główny: wzdłuż całego wagonu, na końcach opuszczony pod belkę czołową do kurków.
// Po stronie końca 2 przechodzi na drugą stronę osi wagonu (kurki są ułożone symetrycznie względem środka).
export function mainPipePoints(lay) {
  const { L, pipeY: y, pipeZ: z } = lay;
  const [cx, cy] = lay.cock;
  return [
    [cx - 0.06, cy, z], [L - 0.2, cy, z], [L - 0.35, y, z],
    [-(L - 0.9), y, z], [-(L - 0.6), y, -z],
    [-(L - 0.35), y, -z], [-(L - 0.2), cy, -z], [-(cx - 0.06), cy, -z],
  ];
}

export function buildMainPipe(node) {
  const g = part('przewod_glowny');
  const lay = layout(cfg(node));
  const pts = mainPipePoints(lay);
  merged(pipeGeoms(pts, 0.021, 14), M.paintDarkRound, { parent: g });
  // obejmy rury z wieszakami do poprzecznic ostoi (spód poprzecznic ok. 1,05 m – SZACUNKOWE)
  const holders = [];
  for (const x of [-3.3, -2.0, -0.7, 0.7, 2.0, 3.3, 5.45, -5.45]) {
    if (Math.abs(x) > lay.L - 0.9) continue;
    holders.push(boxGeom(0.04, 0.05, 0.06, [x, lay.pipeY, lay.pipeZ]));
    holders.push(boxGeom(0.03, lay.mountY - lay.pipeY, 0.012, [x, (lay.pipeY + lay.mountY) / 2, lay.pipeZ - 0.035]));
  }
  merged(holders, M.paintDark, { parent: g });
  return g;
}

// Rury łączące: przewód główny – zawór rozrządczy – cylinder, zbiornik pomocniczy, przestawiacz
export function buildBranchPipes(node) {
  const g = part('rury_laczace');
  const lay = layout(cfg(node));
  const [vx, vy, vz] = lay.valve;
  const [cx, cy, cz] = lay.cyl;
  const [rx, ry, rz] = lay.reservoir;
  const [lx, ly, lz] = lay.loadValve;
  const r = 0.012;
  const geoms = [
    // trójnik na przewodzie głównym → zawór rozrządczy (z kurkiem odcinającym)
    ...pipeGeoms([[vx, lay.pipeY, lay.pipeZ], [vx, lay.pipeY, vz - 0.2], [vx - 0.1, vy, vz - 0.13]], r),
    // zawór → cylinder hamulcowy
    ...pipeGeoms([[vx + 0.1, vy + 0.02, vz - 0.13], [cx - 0.12, vy + 0.02, cz], [cx - 0.04, cy, cz]], r),
    // zawór → zbiornik pomocniczy (przez luzownik)
    ...pipeGeoms([[vx - 0.1, vy, vz - 0.13], [vx - 0.3, vy, rz], [rx + lay.resLen / 2 + 0.04, ry, rz]], r),
    // przestawiacz próżny/ładowny → zawór
    ...pipeGeoms([[lx - 0.08, ly, lz], [vx + 0.14, vy, lz], [vx + 0.14, vy, vz + 0.1]], 0.01),
  ];
  merged(geoms, M.paintDarkRound, { parent: g });
  // kurek odcinający na odgałęzieniu do zaworu (rękojeść czerwona)
  mesh(new THREE.SphereGeometry(0.025, 14, 10), M.paintDark, { pos: [vx, lay.pipeY, (lay.pipeZ + vz - 0.2) / 2], parent: g });
  box(0.012, 0.012, 0.1, M.paintRed, { pos: [vx, lay.pipeY - 0.035, (lay.pipeZ + vz - 0.2) / 2], r: 0.004, parent: g });
  return g;
}

// Sprzęg hamulcowy: gumowy wąż z głowicą. Układ lokalny: wylot kurka, wąż w stronę +x i w dół.
export function buildHoseCoupling() {
  const g = part('sprzeg_hamulcowy');
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, -0.03, 0),
    new THREE.Vector3(0.2, -0.18, 0.01), new THREE.Vector3(0.22, -0.38, 0.02),
  ]);
  mesh(new THREE.TubeGeometry(curve, 40, 0.022, 14, false), M.rubber, { parent: g });
  // opaski na końcach węża
  cylinder(0.027, 0.03, M.steelRaw, { axis: 'x', pos: [0.015, 0, 0], parent: g });
  // głowica sprzęgu (z uszczelką) na końcu
  const end = curve.getPoint(1);
  box(0.06, 0.1, 0.06, M.steelRaw, { pos: [end.x, end.y - 0.05, end.z], r: 0.01, parent: g });
  box(0.012, 0.09, 0.08, M.steelRaw, { pos: [end.x + 0.035, end.y - 0.06, end.z], r: 0.004, parent: g });
  cylinder(0.022, 0.012, M.rubber, { axis: 'z', pos: [end.x, end.y - 0.07, end.z + 0.036], parent: g });
  return g;
}

// Zbiornik pomocniczy: walec z wypukłymi dennicami, na dwóch opaskach do ostoi
export function buildAuxReservoir(node) {
  const g = part('zbiornik_pomocniczy');
  const lay = layout(cfg(node));
  const [x, y, z] = lay.reservoir;
  const R = lay.resR, h = lay.resLen / 2;
  const prof = [[0, -h - 0.05]];
  for (let i = 1; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; prof.push([R * Math.sin(a), -h - 0.05 * Math.cos(a)]); }
  prof.push([R, h]);
  for (let i = 7; i >= 0; i--) { const a = (i / 8) * Math.PI / 2; prof.push([R * Math.sin(a), h + 0.05 * Math.cos(a)]); }
  lathe(prof, M.paintDarkRound, { rot: ALONG_X, pos: [x, y, z], seg: 48, sharpDeg: 60, parent: g });
  // spoiny obwodowe dennic
  for (const s of [1, -1]) mesh(latheGeom([[R, s * h - 0.005], [R + 0.004, s * h], [R, s * h + 0.005]], { seg: 48 }), M.weld, { rot: ALONG_X, pos: [x, y, z], parent: g });
  // opaski i wsporniki do poprzecznic
  for (const dx of [-h * 0.55, h * 0.55]) {
    mesh(latheGeom([[R + 0.001, -0.02], [R + 0.008, -0.02], [R + 0.008, 0.02], [R + 0.001, 0.02]], { seg: 48 }), M.steelRaw, { rot: ALONG_X, pos: [x + dx, y, z], parent: g });
    box(0.04, lay.mountY - (y + R) + 0.01, 0.04, M.paintDark, { pos: [x + dx, (y + R + lay.mountY) / 2, z], r: 0.004, parent: g });
  }
  // korek spustowy na spodzie
  cylinder(0.015, 0.03, M.steelMachined, { pos: [x, y - R - 0.01, z], parent: g });
  return g;
}

export const pipingBuilders = {
  przewod_glowny: buildMainPipe,
  rury_laczace: buildBranchPipes,
  sprzeg_hamulcowy: buildHoseCoupling,
  zbiornik_pomocniczy: buildAuxReservoir,
};
