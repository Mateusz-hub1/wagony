// Tor jako tło sceny (nie jest częścią wagonu, nie da się go kliknąć).
// Szerokość toru 1435 mm, uproszczony profil szyny (zbliżony do 60E1).
import * as THREE from 'three';

export function buildTrack(length = 40) {
  const g = new THREE.Group();
  g.name = 'tor';

  const railMat = new THREE.MeshStandardMaterial({ color: 0x5b5148, roughness: 0.7, metalness: 0.8 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xb8bbbe, roughness: 0.25, metalness: 1 });
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x9a9893, roughness: 0.95, metalness: 0 });
  const ballastMat = new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 1, metalness: 0 });

  // Profil szyny w płaszczyźnie (z, y), y = 0 to główka szyny. Wymiary przybliżone.
  const s = new THREE.Shape();
  const pts = [
    [-0.075, -0.172], [0.075, -0.172], [0.075, -0.160], [0.010, -0.140], [0.008, -0.050],
    [0.036, -0.035], [0.036, -0.005], [0.030, 0], [-0.030, 0], [-0.036, -0.005],
    [-0.036, -0.035], [-0.008, -0.050], [-0.010, -0.140], [-0.075, -0.160],
  ];
  s.moveTo(...pts[0]);
  pts.slice(1).forEach((p) => s.lineTo(...p));
  const railGeom = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
  railGeom.rotateY(Math.PI / 2);          // wytłoczenie wzdłuż osi X
  railGeom.translate(-length / 2, 0, 0);

  const gaugeHalf = 1.435 / 2 + 0.036;    // oś szyny = połowa szerokości toru + pół główki
  for (const side of [1, -1]) {
    const rail = new THREE.Mesh(railGeom, railMat);
    rail.position.z = side * gaugeHalf;
    rail.castShadow = rail.receiveShadow = true;
    g.add(rail);
    // błyszcząca powierzchnia toczna główki
    const top = new THREE.Mesh(new THREE.BoxGeometry(length, 0.002, 0.05), headMat);
    top.position.set(0, -0.0005, side * gaugeHalf);
    g.add(top);
  }

  // Podkłady co 0,6 m
  const sleeperGeom = new THREE.BoxGeometry(0.26, 0.2, 2.6);
  const n = Math.floor(length / 0.6);
  const sleepers = new THREE.InstancedMesh(sleeperGeom, sleeperMat, n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    m.makeTranslation(-length / 2 + 0.3 + i * 0.6, -0.272, 0);
    sleepers.setMatrixAt(i, m);
  }
  sleepers.castShadow = sleepers.receiveShadow = true;
  g.add(sleepers);

  // Podsypka
  const ballast = new THREE.Mesh(new THREE.BoxGeometry(length, 0.15, 3.6), ballastMat);
  ballast.position.y = -0.33;
  ballast.receiveShadow = true;
  g.add(ballast);

  // tor nie bierze udziału w zaznaczaniu
  g.traverse((o) => { o.raycast = () => {}; });
  return g;
}
