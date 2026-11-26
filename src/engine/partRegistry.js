// Buduje model 3D na podstawie drzewa części z JSON-a.
// Każdy węzeł drzewa dostaje swój obiekt 3D (node.object), a każda siatka
// wie, do której części należy (mesh.userData.owner).
import * as THREE from 'three';
import { createPartObject } from './modelSource.js';
import { walk } from './dataLoader.js';

export async function buildModel(root, builders) {
  const obj = await buildNode(root, builders);
  prepareMeshes(root);
  return obj;
}

async function buildNode(node, builders) {
  const obj = await createPartObject(node, builders);
  obj.name = node.path;
  obj.userData.node = node;
  node.object = obj;

  const slots = obj.userData.slots ?? {};
  const used = new Set();
  for (const child of node.children) {
    const childObj = await buildNode(child, builders);
    let s = slots[child.id];
    if (!s) {
      // gniazdo z pliku .glb (pusty obiekt o nazwie id dziecka)
      const empty = obj.getObjectByName(child.id);
      if (empty && !empty.userData.node) {
        s = { pos: empty.position.toArray(), rot: [empty.rotation.x, empty.rotation.y, empty.rotation.z], explode: [0, 0, 0] };
      } else {
        console.warn(`[model] Część "${node.typ}" nie ma gniazda dla "${child.id}" (${child.path})`);
        s = { pos: [0, 0, 0], rot: [0, 0, 0], explode: [0, 0, 0] };
      }
    }
    used.add(child.id);
    childObj.position.set(...s.pos);
    childObj.rotation.set(...(s.rot ?? [0, 0, 0]));
    // dane do animacji rozkładania i zdejmowania
    childObj.userData.basePos = childObj.position.clone();
    childObj.userData.explode = new THREE.Vector3(...(s.explode ?? [0, 0, 0]));
    childObj.userData.remove = s.remove ? new THREE.Vector3(...s.remove)
      : childObj.userData.explode.clone().multiplyScalar(1.5);
    if (childObj.userData.remove.lengthSq() === 0) childObj.userData.remove.set(0, 0.5, 0);
    childObj.userData.curE = 0; // 0 = złożone, 1 = rozłożone
    childObj.userData.curR = 0; // 0 = założone, 1 = zdjęte
    obj.add(childObj);
  }
  for (const id of Object.keys(slots)) {
    if (!used.has(id)) console.warn(`[model] Gniazdo "${id}" w "${node.typ}" nie ma części w JSON (${node.path})`);
  }
  obj.userData.basePos ??= obj.position.clone();
  return obj;
}

// Każda siatka: właściciel (najbliższa część), własny materiał (do podświetleń)
function prepareMeshes(root) {
  for (const node of walk(root)) {
    node.meshes = [];
    node.object.traverse((o) => {
      if (!o.isMesh) return;
      // właściciel = najbliższy przodek, który jest częścią
      let p = o;
      while (p && !p.userData.node) p = p.parent;
      if (p.userData.node !== node) return;
      o.userData.owner = node;
      // zabezpieczenie: materiał z kolorami wierzchołków wymaga atrybutu "color"
      if (o.material.vertexColors && !o.geometry.attributes.color) {
        const n = o.geometry.attributes.position.count;
        o.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
      }
      o.material = o.material.clone();
      o.userData.baseOpacity = o.material.opacity;
      o.userData.baseTransparent = o.material.transparent;
      o.userData.baseDepthWrite = o.material.depthWrite;
      node.meshes.push(o);
    });
  }
}
