// Materiały PBR używane przez wszystkie modele.
// Zużycie i rdza na krawędziach są liczone jako kolory wierzchołków (patrz weather()),
// a delikatna „ziarnistość” powierzchni pochodzi z proceduralnej tekstury.
import * as THREE from 'three';

const hasDOM = typeof document !== 'undefined' && typeof document.createElement === 'function';

// ---------- Tekstura „brudu” (szum fraktalny, bezszwowy) ----------
function makeGrungeTextures() {
  if (!hasDOM) return { map: null, rough: null };
  const S = 256, P = 16; // rozmiar tekstury i okres szumu
  const rnd = new Float32Array(P * P * 4);
  let seed = 1234;
  for (let i = 0; i < rnd.length; i++) { seed = (seed * 16807) % 2147483647; rnd[i] = seed / 2147483647; }
  // szum wartości z okresem p (bezszwowy)
  const noise = (x, y, p, layer) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const g = (a, b) => rnd[(((a % p) + p) % p + (((b % p) + p) % p) * P) * 4 + layer];
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const top = g(xi, yi) * (1 - sx) + g(xi + 1, yi) * sx;
    const bot = g(xi, yi + 1) * (1 - sx) + g(xi + 1, yi + 1) * sx;
    return top * (1 - sy) + bot * sy;
  };
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0, amp = 0.5, f = 2;
    for (let o = 0; o < 4; o++) { v += noise((x / S) * f, (y / S) * f, f, o) * amp; amp *= 0.5; f *= 2; }
    const val = Math.round(200 + v * 55);
    const i = (y * S + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = val; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const rough = new THREE.CanvasTexture(c);
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  return { map, rough };
}
export const grunge = makeGrungeTextures(); // używane też przez tor

// ---------- Tekstura drewna (słoje wzdłuż osi U tekstury) ----------
// Deski: słoje biegną wzdłuż U. Przy box() z geometrii RoundedBox tekstura jest rozciągana
// na każdą ścianę, więc długie deski warto budować osobno (1 deska = 1 bryła).
function makeWoodTexture() {
  if (!hasDOM) return null;
  const W = 512, H = 128;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  let seed = 4321;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // kilka losowych sęków
  const knots = Array.from({ length: 3 }, () => [rnd() * W, rnd() * H, 6 + rnd() * 8]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // słoje: falujące linie wzdłuż x, zagęszczone wokół sęków
    let v = y / H * 7 + Math.sin(x / W * Math.PI * 2 * 2 + y * 0.04) * 0.9
      + Math.sin(x / W * Math.PI * 2 * 5 + 1.3) * 0.25;
    for (const [kx, ky, kr] of knots) {
      const d = Math.hypot((x - kx) * 0.35, y - ky);
      v += kr * 2 / (d + kr);
    }
    const ring = 0.5 + 0.5 * Math.sin(v * Math.PI * 2);
    // jasne drewno wczesne, ciemniejsze słoje późne, drobne włókna wzdłuż deski
    const fiber = Math.sin(y * 2.7 + Math.sin(x * 0.013) * 3) * 0.03;
    const val = 0.8 - 0.22 * Math.pow(ring, 4) + fiber + (rnd() - 0.5) * 0.05;
    const i = (y * W + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(Math.min(1, val) * 255);
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const woodTex = makeWoodTexture();

// Pomocnik: materiał standardowy + informacja o zużyciu (weather)
function std(params, weatherOpts = null, { physical = false, textured = true } = {}) {
  // DoubleSide: bryły toczone nie zależą od kierunku obiegu profilu
  const P = { vertexColors: true, side: THREE.DoubleSide, ...params };
  if (textured && grunge.map) { P.map = grunge.map; P.roughnessMap = grunge.rough; }
  const m = physical ? new THREE.MeshPhysicalMaterial(P) : new THREE.MeshStandardMaterial(P);
  m.userData.weather = weatherOpts; // { rust: kolor rdzy, edges: rdza na krawędziach, amount: 0..1 }
  return m;
}

const RUST = 0x5b2c14;

// Drewno: tekstura słojów zamiast „brudu”, bez rdzy (zabrudzenie tylko z kolorów wierzchołków)
function woodStd(color, roughness) {
  const m = std({ color, roughness, metalness: 0 }, { rust: 0x3a3128, edges: false, amount: 0.35 }, { textured: false });
  if (woodTex) { m.map = woodTex; m.roughnessMap = grunge.rough; }
  return m;
}

// ---------- Biblioteka materiałów ----------
export const M = {
  // Farba ciemna (wózki, maźnice) – lekkie zużycie, rdza na krawędziach
  paintDark: std({ color: 0x24272b, roughness: 0.62, metalness: 0.25 }, { rust: RUST, edges: true, amount: 0.85 }),
  // Ta sama farba dla brył zaokrąglonych (toczonych, sprężyn) – bez rdzy „na krawędziach”,
  // bo ich normalne nie są równoległe do osi; tylko drobne plamki
  paintDarkRound: std({ color: 0x24272b, roughness: 0.6, metalness: 0.25 }, { rust: RUST, edges: false, amount: 0.6 }),
  // Farba pudła wagonu (brąz)
  paintBody: std({ color: 0x6a3a28, roughness: 0.7, metalness: 0.1 }, { rust: RUST, edges: true, amount: 0.7 }),
  // Stal surowa / kuta (oś, dźwignie) – ciemna, matowa, trochę rdzy
  steelRaw: std({ color: 0x4d4b48, roughness: 0.55, metalness: 0.85 }, { rust: RUST, edges: false, amount: 0.5 }),
  // Stal obrobiona (czopy, śruby po obróbce)
  steelMachined: std({ color: 0xa7abaf, roughness: 0.3, metalness: 1 }, null),
  // Stal łożyskowa – polerowana (pierścienie, wałeczki)
  steelBearing: std({ color: 0xcdd1d5, roughness: 0.14, metalness: 1 }, null, { textured: false }),
  // Powierzchnia toczna koła – błyszcząca od szyny
  steelTread: std({ color: 0xb9bcbf, roughness: 0.22, metalness: 1 }, null),
  // Koło poza powierzchnią toczną – ciemna stal z nalotem rdzy
  steelWheel: std({ color: 0x4a3f38, roughness: 0.7, metalness: 0.7 }, { rust: RUST, edges: false, amount: 0.6 }),
  // Spoiny
  weld: std({ color: 0x2f3134, roughness: 0.8, metalness: 0.5 }, null),
  // Śruby, nakrętki (ocynk / stal)
  bolt: std({ color: 0x7c7f82, roughness: 0.45, metalness: 1 }, { rust: RUST, edges: false, amount: 0.3 }),
  // Guma / elastomer
  rubber: std({ color: 0x141414, roughness: 0.9, metalness: 0 }, null),
  // Smar plastyczny – żółtobrązowy, lekko połyskliwy
  grease: std({ color: 0xa9792a, roughness: 0.35, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3 }, null, { physical: true, textured: false }),
  // Poliamid (koszyk łożyska)
  polyamide: std({ color: 0x2c2622, roughness: 0.45, metalness: 0 }, null, { textured: false }),
  // Wstawka hamulcowa (kompozytowa) – ciemnoszara, bardzo matowa
  brakeInsert: std({ color: 0x2b2b2b, roughness: 0.95, metalness: 0 }, null),
  // Farba czerwona (rękojeści kurków, uchwyty – dla wyróżnienia elementów obsługowych)
  paintRed: std({ color: 0x9e1f1a, roughness: 0.55, metalness: 0.1 }, { rust: RUST, edges: false, amount: 0.3 }),
  // Farba biała / jasna (tabliczki, oznaczenia)
  paintWhite: std({ color: 0xd9d6cf, roughness: 0.6, metalness: 0.05 }, { rust: RUST, edges: false, amount: 0.25 }),
  // Drewno podłogi platformy (deski) – szarobrązowe, zwietrzałe, matowe; słoje wzdłuż deski
  wood: woodStd(0x7a6a55, 0.88),
  // Drewno ciemniejsze, mocniej zabrudzone (np. drewniane burty, przekładki)
  woodWorn: woodStd(0x5e5244, 0.92),
  // Materiał zastępczy, gdy brakuje buildera
  placeholder: std({ color: 0xd0473a, roughness: 0.6, metalness: 0, transparent: true, opacity: 0.6 }, null, { textured: false }),
};

// Farba w dowolnym kolorze, z takim samym zużyciem jak farba pudła (np. inny kolor wagonu).
// Wynik jest zapamiętywany, więc wiele wywołań z tym samym kolorem daje ten sam materiał.
const paintCache = new Map();
export function paint(hex, { rust = 0.7, edges = true } = {}) {
  const key = `${hex}|${rust}|${edges}`;
  if (!paintCache.has(key)) {
    paintCache.set(key, std({ color: hex, roughness: 0.7, metalness: 0.1 }, { rust: RUST, edges, amount: rust }));
  }
  return paintCache.get(key);
}

// ---------- Zużycie: kolory wierzchołków ----------
// Każda geometria dostaje atrybut "color". Kolor 1 = czysta farba,
// w kierunku rdzy tam, gdzie normalna nie jest równoległa do osi (fazowane krawędzie
// prostopadłościanów) oraz w losowych plamkach.
const tmpBase = new THREE.Color(), tmpRust = new THREE.Color();
export function weather(geometry, material) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const n = pos.count;
  const col = new Float32Array(n * 3);
  const w = material?.userData?.weather;
  if (!w || !nor) {
    col.fill(1);
  } else {
    tmpBase.copy(material.color);
    tmpRust.set(w.rust);
    // stosunek rdza/kolor bazowy (kolor wierzchołka mnoży kolor materiału)
    const ratio = [tmpRust.r / Math.max(tmpBase.r, 0.01), tmpRust.g / Math.max(tmpBase.g, 0.01), tmpRust.b / Math.max(tmpBase.b, 0.01)]
      .map((v) => Math.min(v, 4));
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      // pseudolosowa liczba zależna od położenia wierzchołka
      const h = Math.abs(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453) % 1;
      // wolnozmienne zabrudzenie
      const lf = 0.5 + 0.5 * Math.sin(x * 3.1 + z * 1.7) * Math.sin(y * 4.3 + x * 0.7);
      let rust = 0;
      if (w.edges) {
        const e = 1 - Math.max(Math.abs(nor.getX(i)), Math.abs(nor.getY(i)), Math.abs(nor.getZ(i)));
        const t = Math.min(Math.max((e - 0.05) / 0.2, 0), 1);
        rust += t * (0.45 + 0.5 * h);
      }
      if (h > 0.965) rust += 0.5; // drobne plamki
      rust = Math.min(rust, 1) * w.amount;
      const dirt = 0.86 + 0.14 * lf;
      for (let c = 0; c < 3; c++) col[i * 3 + c] = dirt * (1 - rust) + ratio[c] * rust;
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geometry;
}
