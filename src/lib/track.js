// Tor jako tło sceny (nie jest częścią wagonu, nie da się go kliknąć).
// Szyna 60E1 (EN 13674-1): wysokość 172 mm, szerokość stopki 150 mm, szerokość główki 72 mm,
// grubość szyjki 16,5 mm. Pozostałe wymiary profilu (promienie, pochylenia) – przybliżone.
// Szerokość toru 1435 mm, pochylenie szyn 1:40 do osi toru.
// Podkłady strunobetonowe dł. 2,6 m co 0,6 m – wymiary przekroju przybliżone.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { grunge } from './materials.js';

const RAIL = { h: 0.172, foot: 0.150, head: 0.072, web: 0.0165, footEdge: 0.0115 };
const GAUGE = 1.435;
const INCLINE = Math.atan(1 / 40);
const PAD = 0.007;          // przekładka podszynowa (guma)
const SLEEPER_STEP = 0.6;

export function buildTrack(length = 40) {
  const g = new THREE.Group();
  g.name = 'tor';

  const tex = (o) => (grunge.map ? { map: grunge.map, roughnessMap: grunge.rough, ...o } : o);
  // szyna: szyjka i stopka z nalotem rdzy, główka błyszcząca od kół
  const railMat = new THREE.MeshStandardMaterial(tex({ color: 0x6a4a36, roughness: 0.85, metalness: 0.55 }));
  const headMat = new THREE.MeshStandardMaterial(tex({ color: 0x8a8580, roughness: 0.45, metalness: 0.9 }));
  const bandMat = new THREE.MeshStandardMaterial({ color: 0xd4d7da, roughness: 0.12, metalness: 1 });
  const concreteMat = new THREE.MeshStandardMaterial(tex({ color: 0x9e9b94, roughness: 0.95, metalness: 0 }));
  const padMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0 });
  const clipMat = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.6, metalness: 0.8 });
  const ballastMat = new THREE.MeshStandardMaterial(tex({ color: 0x7d7872, roughness: 1, metalness: 0 }));

  // --- Szyny ---
  const extrude = (shape) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, curveSegments: 6 });
    geo.rotateY(Math.PI / 2);          // wytłoczenie wzdłuż osi X
    geo.translate(-length / 2, 0, 0);
    return geo;
  };
  const headGeo = extrude(railHeadShape());
  const bodyGeo = extrude(railBodyShape());
  const bandGeo = extrude(runningBandShape());

  const railZ = GAUGE / 2 + RAIL.head / 2; // oś szyny (szerokość toru mierzona między wewn. krawędziami główek)
  for (const side of [1, -1]) {
    const rail = new THREE.Group();
    rail.position.z = side * railZ;
    rail.rotation.x = -side * INCLINE;      // główka pochylona do środka toru
    for (const [geo, mat] of [[bodyGeo, railMat], [headGeo, headMat], [bandGeo, bandMat]]) {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = m.receiveShadow = true;
      rail.add(m);
    }
    g.add(rail);
  }

  // --- Podkłady, przekładki i łapki sprężyste ---
  const n = Math.floor(length / SLEEPER_STEP);
  const sleeperTop = -RAIL.h - PAD;
  const sleepers = new THREE.InstancedMesh(sleeperGeom(), concreteMat, n);
  const pads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, PAD, RAIL.foot + 0.01), padMat, n * 2);
  const clips = new THREE.InstancedMesh(clipGeom(), clipMat, n * 4);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  let ip = 0, ic = 0;
  for (let i = 0; i < n; i++) {
    const x = -length / 2 + SLEEPER_STEP / 2 + i * SLEEPER_STEP;
    sleepers.setMatrixAt(i, m.makeTranslation(x, sleeperTop, 0));
    for (const side of [1, -1]) {
      const z = side * railZ;
      pads.setMatrixAt(ip++, m.makeTranslation(x, sleeperTop + PAD / 2, z));
      // łapki po obu stronach stopki, dociskają ją do podkładu
      for (const s of [1, -1]) {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s > 0 ? 0 : Math.PI);
        m.compose(new THREE.Vector3(x, sleeperTop, z + s * (RAIL.foot / 2)), q, one);
        clips.setMatrixAt(ic++, m);
      }
    }
  }
  for (const im of [sleepers, pads, clips]) { im.castShadow = im.receiveShadow = true; g.add(im); }

  // --- Podsypka (tłuczeń) ---
  const ballastShape = new THREE.Shape();
  ballastShape.moveTo(-2.4, -0.45); ballastShape.lineTo(2.4, -0.45);
  ballastShape.lineTo(1.75, sleeperTop - 0.17); ballastShape.lineTo(-1.75, sleeperTop - 0.17);
  const ballastGeo = new THREE.ExtrudeGeometry(ballastShape, { depth: length, bevelEnabled: false });
  ballastGeo.rotateY(Math.PI / 2);
  ballastGeo.translate(-length / 2, 0, 0);
  const ballast = new THREE.Mesh(ballastGeo, ballastMat);
  ballast.receiveShadow = true;
  g.add(ballast);

  // tor nie bierze udziału w zaznaczaniu
  g.traverse((o) => { o.raycast = () => {}; });
  return g;
}

// ---------- Profil szyny (płaszczyzna z–y, y = 0 to wierzch główki) ----------
// Połowa profilu od osi na zewnątrz; druga połowa to odbicie lustrzane.
const HW = RAIL.head / 2;             // 36 mm
const HEAD_LOW = -0.051;              // spód główki przy szyjce (przybliżone)
const HEAD_SIDE = -0.038;             // dolna krawędź boku główki (przybliżone)

// Wierzch główki: łagodna korona + zaokrąglenie naroża R13
const R_CORNER = 0.013;
const CROWN_W = HW - R_CORNER;        // do tego miejsca sięga korona
const CROWN_DROP = 0.003;             // spadek korony od osi do naroża (przybliżone)
const crownY = (z) => -CROWN_DROP * (Math.abs(z) / CROWN_W) ** 2;

function crown(pts) {
  for (let i = 0; i <= 8; i++) {
    const z = (i / 8) * CROWN_W;
    pts.push([z, crownY(z)]);
  }
  const cy = -CROWN_DROP - R_CORNER;  // środek łuku naroża
  for (let i = 1; i <= 6; i++) {
    const a = (i / 6) * Math.PI / 2;
    pts.push([CROWN_W + R_CORNER * Math.sin(a), cy + R_CORNER * Math.cos(a)]);
  }
}

function mirror(half) {
  const back = half.slice().reverse().map(([z, y]) => [-z, y]);
  const s = new THREE.Shape();
  const all = [...back, ...half];
  s.moveTo(all[0][0], all[0][1]);
  for (const p of all.slice(1)) s.lineTo(p[0], p[1]);
  return s;
}

// Główka (bez pasma tocznego)
function railHeadShape() {
  const half = [];
  crown(half);
  half.push([HW - 0.0005, HEAD_SIDE]);                    // bok główki
  half.push([RAIL.web / 2 + 0.012, HEAD_LOW + 0.004]);     // podtorze (powierzchnia przylgowa)
  half.push([RAIL.web / 2 + 0.004, HEAD_LOW]);             // zaokrąglenie przejścia do szyjki
  half.push([0, HEAD_LOW]);
  return mirror(half);
}

// Szyjka i stopka
function railBodyShape() {
  const w = RAIL.web / 2, F = RAIL.foot / 2, H = -RAIL.h;
  const half = [
    [0, HEAD_LOW + 0.001], [w + 0.004, HEAD_LOW + 0.001], [w + 0.001, HEAD_LOW - 0.006], [w, HEAD_LOW - 0.012],
    [w, -0.128],                                  // szyjka
    [w + 0.003, -0.137], [w + 0.010, -0.143],    // zaokrąglenie szyjka–stopka
    [F - 0.004, H + RAIL.footEdge + 0.0015],      // górna, pochyła powierzchnia stopki
    [F, H + RAIL.footEdge - 0.002], [F, H + 0.001], [F - 0.001, H],
    [0, H],
  ];
  return mirror(half);
}

// Błyszczące pasmo toczne na środku główki (cienka warstwa nad koroną)
function runningBandShape() {
  const top = [], bot = [];
  const W = 0.02;  // połowa szerokości pasma
  for (let i = 0; i <= 8; i++) {
    const z = -W + (i / 8) * 2 * W;
    const y = crownY(z);
    top.push([z, y + 0.0004]);
    bot.push([z, y - 0.0006]);
  }
  const s = new THREE.Shape();
  const all = [...top, ...bot.reverse()];
  s.moveTo(all[0][0], all[0][1]);
  for (const p of all.slice(1)) s.lineTo(p[0], p[1]);
  return s;
}

// ---------- Podkład strunobetonowy ----------
// Przekrój trapezowy (spód szerszy), w środku niższy niż pod szynami. Wymiary przybliżone.
function sleeperGeom() {
  const L = 2.6, H = 0.21, bot = 0.30, top = 0.19, DIP = 0.04;
  const s = new THREE.Shape();
  s.moveTo(-bot / 2, -H); s.lineTo(bot / 2, -H);
  s.lineTo(top / 2 + 0.01, -0.012); s.lineTo(top / 2, 0);
  s.lineTo(-top / 2, 0); s.lineTo(-top / 2 - 0.01, -0.012);
  const geo = new THREE.ExtrudeGeometry(s, { depth: L, steps: 26, bevelEnabled: false });
  geo.translate(0, 0, -L / 2);
  // obniżenie w środkowej części podkładu
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), z = Math.abs(p.getZ(i));
    if (y < -H / 2) continue;
    const t = THREE.MathUtils.smoothstep(z, 0.42, 0.62); // 0 w środku, 1 pod szyną
    p.setY(i, y - DIP * (1 - t));
  }
  geo.computeVertexNormals();
  return geo;
}

// Łapka sprężysta (uproszczona) z kotwą w podkładzie. Ustawiona przy krawędzi stopki, +z na zewnątrz.
function clipGeom() {
  const parts = [];
  // kotwa / prowadnica (wystaje z betonu)
  const anchor = new THREE.BoxGeometry(0.06, 0.03, 0.04);
  anchor.translate(0, 0.015, 0.045);
  parts.push(anchor);
  // dwa ramiona łapki (pręt sprężysty) – łuki od kotwy na stopkę
  for (const x of [-0.035, 0.035]) {
    const arm = new THREE.TorusGeometry(0.03, 0.0065, 6, 12, Math.PI);
    arm.rotateY(Math.PI / 2);
    arm.translate(x, 0.012, 0.025);
    parts.push(arm);
  }
  const back = new THREE.TorusGeometry(0.035, 0.0065, 6, 12, Math.PI);
  back.rotateX(-Math.PI / 2);
  back.translate(0, 0.012, 0.055);
  parts.push(back);
  return mergeGeometries(parts.map((p) => p.toNonIndexed()));
}
