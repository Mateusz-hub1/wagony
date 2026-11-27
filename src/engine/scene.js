// Scena 3D: renderer, kamera, światło (HDRI), cienie, sterowanie myszką.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildTrack } from '../lib/track.js';
import { perf } from './device.js';

// Domyślny kierunek patrzenia kamery (skos z góry, z boku wagonu)
const DEFAULT_DIR = new THREE.Vector3(0.75, 0.45, 1).normalize();

export class Viewer {
  constructor(canvas) {
    this.canvas = canvas;

    // --- Renderer z tone mappingiem ACES i miękkimi cieniami ---
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(perf.pixelRatio); // na telefonie niższa (patrz device.js)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = perf.shadowType;
    // Na telefonie mapa cieni liczona tylko po zmianie sceny (nie przy każdym obrocie kamery)
    this.renderer.shadowMap.autoUpdate = !perf.staticShadows;

    // --- Scena i oświetlenie HDRI (RoomEnvironment) ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdfe3e7);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.9;

    // Światło kierunkowe tylko do rzucania cieni
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sun.position.set(6, 14, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(perf.shadowMapSize, perf.shadowMapSize);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = perf.shadowRadius;
    this.scene.add(this.sun, this.sun.target);
    this.setShadowArea(new THREE.Vector3(), 9);

    // Podłoże (łapie cienie) i tor
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0xcfd3d6, roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.45; // pod spodem podsypki toru
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.scene.add(buildTrack());

    // --- Kamera i sterowanie myszką ---
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 400);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.15;
    this.controls.maxDistance = 80;
    this.controls.maxPolarAngle = Math.PI * 0.495; // nie schodzimy pod podłogę
    // dotyk: jeden palec obraca, dwa palce przybliżają i przesuwają
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    this.fly = null;          // trwający przelot kamery
    this.frameCallbacks = [];
    // Rysowanie na żądanie: klatka jest rysowana tylko wtedy, gdy coś się zmieniło
    // (ruch kamery, animacja, podświetlenie...). Zmiany zgłasza się przez invalidate().
    this.dirty = true;
    this.clock = new THREE.Clock();

    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  resize() {
    const el = this.canvas.parentElement;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  // Zgłoszenie, że obraz trzeba narysować od nowa (razem z cieniami)
  invalidate() {
    this.dirty = true;
    this.renderer.shadowMap.needsUpdate = true;
  }

  // Ustawia obszar, w którym liczone są cienie (mniejszy = ostrzejsze cienie)
  setShadowArea(center, radius) {
    const r = Math.max(radius, 0.5);
    const cam = this.sun.shadow.camera;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
    cam.near = 0.1; cam.far = 60;
    cam.updateProjectionMatrix();
    this.sun.target.position.copy(center);
    this.sun.position.copy(center).add(new THREE.Vector3(6, 14, 8).setLength(25));
    this.invalidate();
  }

  // Płynny przelot kamery, tak żeby cały obszar (box) był widoczny
  flyToBox(box, { dir = null, duration = 0.9 } = {}) {
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const fitFov = this.camera.aspect < 1 ? 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect) : fov;
    const dist = (sphere.radius / Math.sin(fitFov / 2)) * 1.05;
    const viewDir = dir ? dir.clone().normalize()
      : this.camera.position.clone().sub(this.controls.target).normalize();
    this.fly = {
      t: 0, duration,
      fromPos: this.camera.position.clone(), fromTarget: this.controls.target.clone(),
      toPos: sphere.center.clone().addScaledVector(viewDir, dist), toTarget: sphere.center.clone(),
    };
    this.setShadowArea(sphere.center, sphere.radius * 1.3);
  }

  resetCamera(box, duration = 0.9) { this.flyToBox(box, { dir: DEFAULT_DIR, duration }); }

  // Pętla animacji: przelot kamery + funkcje dopięte przez resztę programu
  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const flying = !!this.fly;
    if (this.fly) {
      const f = this.fly;
      f.t = Math.min(1, f.t + dt / f.duration);
      const k = f.t < 0.5 ? 4 * f.t ** 3 : 1 - (-2 * f.t + 2) ** 3 / 2; // easeInOutCubic
      this.camera.position.lerpVectors(f.fromPos, f.toPos, k);
      this.controls.target.lerpVectors(f.fromTarget, f.toTarget, k);
      if (f.t >= 1) this.fly = null;
    }
    for (const cb of this.frameCallbacks) cb(dt);
    // update() zwraca true, gdy kamera się ruszyła (obrót, przybliżanie, wygaszanie ruchu)
    const moved = this.controls.update();
    if (!(this.dirty || flying || moved)) return; // nic się nie zmieniło – nie rysujemy
    this.dirty = false;
    this.renderer.render(this.scene, this.camera);
  }
}

export { DEFAULT_DIR };
