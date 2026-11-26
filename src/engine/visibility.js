// Przenosi stan z Navigatora na siatki 3D:
// widoczność (ukryte / izolowane / zdjęte), „duchy” (części poza bieżącym poziomem)
// oraz podświetlenie (najechanie, zaznaczenie).
import * as THREE from 'three';
import { walk } from './dataLoader.js';
import { Navigator } from './navigator.js';

const HOVER = new THREE.Color(0x2f7bff);
const SELECT = new THREE.Color(0xff8a00);
const GHOST_OPACITY = 0.1;      // części poza bieżącym poziomem
const GHOST_DEEP_OPACITY = 0.05; // to samo, gdy jesteśmy głęboko (np. w zestawie kołowym)

// Lista siatek, które można kliknąć (aktualizowana razem z widocznością)
export const pickables = [];

export function applyVisibility(nav) {
  pickables.length = 0;
  // Najbliższa część (bieżąca lub wyżej) z flagą "ukryj_otoczenie", np. zestaw kołowy.
  // Wszystko poza nią znika, a reszta wewnątrz niej jest prawie przezroczysta.
  let scope = null;
  for (let n = nav.focus; n; n = n.parent) if (n.ukryjOtoczenie) { scope = n; break; }
  const ghostOpacity = scope ? GHOST_DEEP_OPACITY : GHOST_OPACITY;

  for (const node of walk(nav.root)) {
    let visible = isNodeVisible(node, nav);
    if (scope && !Navigator.isInside(node, scope)) visible = false;
    const ghost = !Navigator.isInside(node, nav.focus);
    const removing = anyUp(node, (n) => n.removed && !n.object.userData.opens);
    for (const m of node.meshes) {
      m.visible = visible;
      setGhost(m, ghost, ghostOpacity);
      if (visible && !ghost && !removing) pickables.push(m);
    }
  }
  applyHighlight(nav);
}

function isNodeVisible(node, nav) {
  if (anyUp(node, (n) => n.hidden)) return false;
  // zdjęta część znika dopiero po zakończeniu animacji zdejmowania
  // (część otwierana obrotem, np. klapa, zostaje widoczna)
  if (anyUp(node, (n) => n.removed && !n.object.userData.opens && n.object.userData.curR > 0.97)) return false;
  if (nav.isolated && !Navigator.isInside(node, nav.isolated)) return false;
  return true;
}

function anyUp(node, fn) {
  for (let n = node; n; n = n.parent) if (fn(n)) return true;
  return false;
}

function setGhost(m, ghost, opacity) {
  const key = ghost ? opacity : false;
  if (m.userData.ghost === key) return;
  m.userData.ghost = key;
  const mat = m.material;
  mat.transparent = ghost ? true : m.userData.baseTransparent;
  mat.opacity = ghost ? opacity * (m.userData.baseOpacity ?? 1) : m.userData.baseOpacity;
  mat.depthWrite = ghost ? false : m.userData.baseDepthWrite;
  m.castShadow = !ghost;
  mat.needsUpdate = true;
}

// Podświetlenie: niebieskie przy najechaniu, pomarańczowe dla zaznaczenia
export function applyHighlight(nav) {
  for (const node of walk(nav.root)) {
    for (const m of node.meshes) {
      if (!m.material.emissive) continue;
      m.material.emissive.setRGB(0, 0, 0);
      m.material.emissiveIntensity = 1;
    }
  }
  paint(nav.selected, SELECT, 0.35);
  if (nav.hovered && nav.hovered !== nav.selected) paint(nav.hovered, HOVER, 0.3);
}

function paint(node, color, intensity) {
  if (!node) return;
  for (const n of walk(node)) {
    for (const m of n.meshes) {
      if (!m.material.emissive || m.userData.ghost) continue;
      m.material.emissive.copy(color).multiplyScalar(intensity);
    }
  }
}
