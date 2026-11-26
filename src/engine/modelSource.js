// Skąd bierze się model 3D części.
// To jest JEDYNE miejsce, w którym decydujemy: model z kodu (builder) czy plik .glb.
// Żeby podmienić część na gotowy model, wystarczy w JSON dodać do węzła:
//   "model": "models/maznica.glb"
// W pliku .glb można umieścić puste obiekty nazwane jak id podczęści – posłużą jako gniazda.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { M } from '../lib/materials.js';

let gltfLoader = null;

export async function createPartObject(node, builders) {
  if (node.model) {
    try {
      gltfLoader ??= new GLTFLoader();
      const url = new URL(`./${node.model.replace(/^\.?\//, '')}`, document.baseURI).href;
      const gltf = await gltfLoader.loadAsync(url);
      const g = gltf.scene;
      g.userData.slots = {};
      g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
      return g;
    } catch (e) {
      console.warn(`[model] Nie udało się wczytać ${node.model}, używam modelu z kodu`, e);
    }
  }

  const build = builders[node.typ];
  if (build) {
    const g = build(node);
    g.userData.slots ??= {};
    return g;
  }

  // Brak buildera: mały czerwony klocek, żeby było widać, że czegoś brakuje
  console.warn(`[model] Brak buildera dla typu "${node.typ}" (${node.path})`);
  const g = new THREE.Group();
  g.userData.slots = {};
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), M.placeholder);
  g.add(m);
  return g;
}
