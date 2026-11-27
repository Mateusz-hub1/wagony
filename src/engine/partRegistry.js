// Buduje model 3D na podstawie drzewa części z JSON-a.
// Każdy węzeł drzewa dostaje swój obiekt 3D (node.object), a każda siatka
// wie, do której części należy (mesh.userData.owner).
//
// Leniwe szczegóły (na telefonie): części z listy LAZY_TYPES (wnętrze maźnicy, niewidoczne
// spod korpusu i pokrywy) dostają na początku puste obiekty-zastępniki. Prawdziwy model
// powstaje dopiero przy wejściu w część (materialize), żeby cały wagon był lżejszy.
import * as THREE from 'three';
import { createPartObject } from './modelSource.js';
import { walk } from './dataLoader.js';
import { perf } from './device.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Typy części budowane dopiero przy wejściu w rodzica
export const LAZY_TYPES = new Set(['lozysko', 'smar', 'uszczelnienie', 'plytka_czolowa']);

// Gniazdo „w miejscu” – dla dzieci zastępnika (prawdziwe gniazda zna dopiero builder)
const ZERO_SLOT = { pos: [0, 0, 0], rot: [0, 0, 0], explode: [0, 0, 0] };

// Klucze userData z danymi gniazda (przenoszone z zastępnika na prawdziwy model)
const SLOT_KEYS = ['basePos', 'explode', 'baseRot', 'removeRot', 'opens', 'remove', 'curE', 'curR'];

export async function buildModel(root, builders, { lazy = perf.lazyDetails } = {}) {
  const obj = await buildNode(root, builders, lazy);
  prepareMeshes(root);
  return obj;
}

async function buildNode(node, builders, lazy) {
  if (lazy && LAZY_TYPES.has(node.typ)) return placeholder(node);
  const obj = await createPartObject(node, builders);
  obj.name = node.path;
  obj.userData.node = node;
  node.object = obj;

  const slots = obj.userData.slots ?? {};
  const used = new Set();
  for (const child of node.children) {
    const childObj = await buildNode(child, builders, lazy);
    let s = slots[child.id];
    if (!s) {
      // gniazdo z pliku .glb (pusty obiekt o nazwie id dziecka)
      const empty = obj.getObjectByName(child.id);
      if (empty && !empty.userData.node) {
        s = { pos: empty.position.toArray(), rot: [empty.rotation.x, empty.rotation.y, empty.rotation.z], explode: [0, 0, 0] };
      } else {
        console.warn(`[model] Część "${node.typ}" nie ma gniazda dla "${child.id}" (${child.path})`);
        s = ZERO_SLOT;
      }
    }
    used.add(child.id);
    applySlot(childObj, s);
    obj.add(childObj);
  }
  for (const id of Object.keys(slots)) {
    if (!used.has(id)) console.warn(`[model] Gniazdo "${id}" w "${node.typ}" nie ma części w JSON (${node.path})`);
  }
  obj.userData.basePos ??= obj.position.clone();
  return obj;
}

// Ustawia część w gnieździe rodzica i zapisuje dane do animacji rozkładania i zdejmowania
function applySlot(childObj, s) {
  childObj.position.set(...s.pos);
  childObj.rotation.set(...(s.rot ?? [0, 0, 0]));
  childObj.userData.basePos = childObj.position.clone();
  childObj.userData.explode = new THREE.Vector3(...(s.explode ?? [0, 0, 0]));
  childObj.userData.baseRot = childObj.rotation.clone();
  // otwieranie przez obrót (np. klapa w dnie): bez przesunięcia, część zostaje widoczna
  childObj.userData.removeRot = s.removeRot ? new THREE.Vector3(...s.removeRot) : null;
  childObj.userData.opens = !!s.removeRot && !s.remove;
  childObj.userData.remove = s.remove ? new THREE.Vector3(...s.remove)
    : s.removeRot ? new THREE.Vector3()
    : childObj.userData.explode.clone().multiplyScalar(1.5);
  if (childObj.userData.remove.lengthSq() === 0 && !s.removeRot) childObj.userData.remove.set(0, 0.5, 0);
  childObj.userData.curE = 0; // 0 = złożone, 1 = rozłożone
  childObj.userData.curR = 0; // 0 = założone, 1 = zdjęte
}

// Pusty zastępnik części (razem z dziećmi), bez siatek
function placeholder(node) {
  const obj = new THREE.Group();
  obj.name = node.path;
  obj.userData.node = node;
  obj.userData.slots = {};
  node.object = obj;
  node.lazy = true;
  for (const child of node.children) {
    const c = placeholder(child);
    applySlot(c, ZERO_SLOT);
    obj.add(c);
  }
  return obj;
}

// Buduje prawdziwy model w miejsce zastępnika. Zwraca true, gdy coś zbudowano.
export async function materialize(node, builders) {
  if (!node.lazy || node.building) return false;
  node.building = true;
  const old = node.object;
  const obj = await buildNode(node, builders, false);
  // położenie i stan animacji przechodzą z zastępnika
  obj.position.copy(old.position);
  obj.rotation.copy(old.rotation);
  for (const k of SLOT_KEYS) obj.userData[k] = old.userData[k];
  const parent = old.parent;
  parent.remove(old);
  parent.add(obj);
  for (const n of walk(node)) n.lazy = false;
  node.building = false;
  prepareMeshes(node);
  return true;
}

// Każda siatka: właściciel (najbliższa część), własny materiał (do podświetleń)
function prepareMeshes(root) {
  if (perf.mergeMeshes) root.object.updateMatrixWorld(true);
  for (const node of walk(root)) {
    let list = [];
    node.object.traverse((o) => {
      if (!o.isMesh) return;
      // właściciel = najbliższy przodek, który jest częścią
      let p = o;
      while (p && !p.userData.node) p = p.parent;
      if (p.userData.node !== node) return;
      // zabezpieczenie: materiał z kolorami wierzchołków wymaga atrybutu "color"
      if (o.material.vertexColors && !o.geometry.attributes.color) {
        const n = o.geometry.attributes.position.count;
        o.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
      }
      list.push(o);
    });
    if (perf.mergeMeshes) list = mergeSameMaterial(node, list);
    node.meshes = [];
    for (const o of list) {
      o.userData.owner = node;
      o.material = o.material.clone();
      o.userData.baseOpacity = o.material.opacity;
      o.userData.baseTransparent = o.material.transparent;
      o.userData.baseDepthWrite = o.material.depthWrite;
      node.meshes.push(o);
    }
  }
}

// Telefon: siatki jednej części z tym samym materiałem łączymy w jedną siatkę.
// Wygląd się nie zmienia, a karta graficzna dostaje dużo mniej poleceń rysowania.
// Pomijamy siatki „specjalne” (własne klikanie, kolejność rysowania, instancje).
function mergeSameMaterial(node, list) {
  const groups = new Map();
  const keep = [];
  for (const m of list) {
    const g = m.geometry;
    const special = m.isInstancedMesh || m.isSkinnedMesh || Array.isArray(m.material) || m.renderOrder !== 0
      || Object.prototype.hasOwnProperty.call(m, 'raycast') || g.morphAttributes?.position;
    if (special) { keep.push(m); continue; }
    // klucz: ten sam materiał, te same atrybuty, cienie i rodzaj geometrii (z indeksem lub bez)
    const key = [m.material.uuid, Object.keys(g.attributes).sort().join(','), !!g.index, m.castShadow, m.receiveShadow].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }
  const inv = new THREE.Matrix4().copy(node.object.matrixWorld).invert();
  for (const ms of groups.values()) {
    if (ms.length === 1) { keep.push(ms[0]); continue; }
    // geometria każdej siatki przeliczona do układu części
    const geoms = ms.map((m) => m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)));
    const merged = mergeGeometries(geoms, false);
    if (!merged) { keep.push(...ms); continue; } // nie dało się połączyć – zostawiamy osobno
    const one = new THREE.Mesh(merged, ms[0].material);
    one.castShadow = ms[0].castShadow;
    one.receiveShadow = ms[0].receiveShadow;
    for (const m of ms) m.removeFromParent();
    node.object.add(one);
    keep.push(one);
  }
  return keep;
}
