// Punkt startowy strony: ekran wyboru wagonu i przeglądarka 3D.
import * as THREE from 'three';
import { Viewer } from './engine/scene.js';
import { loadWagonList, loadWagonData, walk } from './engine/dataLoader.js';
import { buildModel } from './engine/partRegistry.js';
import { Navigator } from './engine/navigator.js';
import { Animator, setOpenRotation } from './engine/explode.js';
import { applyVisibility, applyHighlight } from './engine/visibility.js';
import { Picker } from './engine/picking.js';
import { TreeView } from './ui/tree.js';
import { renderInfo } from './ui/infoPanel.js';
import { renderBreadcrumb, clearBreadcrumb } from './ui/breadcrumb.js';
import { Toolbar } from './ui/toolbar.js';

const $ = (s) => document.querySelector(s);
let viewer = null;   // scena 3D (tworzona raz)
let picker = null;   // obsługa myszki (tworzona raz)
let current = null;  // otwarty wagon: { root, nav, animator, tree, toolbar, model }

// ---------- Routing: #eaos otwiera wagon, pusty adres = wybór wagonu ----------
window.addEventListener('hashchange', route);
$('#btn-home').addEventListener('click', () => { location.hash = ''; });
route();

async function route() {
  let list;
  try {
    list = await loadWagonList();
  } catch (e) {
    showError(e);
    return;
  }
  const id = location.hash.slice(1);
  // w trybie ?debug można otworzyć też wagon jeszcze nieaktywny (do sprawdzania w trakcie budowy)
  const debug = new URLSearchParams(location.search).has('debug');
  const w = list.wagony.find((x) => x.id === id && (x.aktywny || (debug && x.modul)));
  if (w) await openWagon(w);
  else showSelect(list);
}

function showSelect(list) {
  closeWagon();
  $('#screen-viewer').hidden = true;
  $('#screen-select').hidden = false;
  $('#btn-home').hidden = true;
  clearBreadcrumb($('#breadcrumb'));
  const box = $('#wagon-list');
  box.innerHTML = '';
  for (const w of list.wagony) {
    const b = document.createElement('button');
    b.className = 'card';
    b.disabled = !w.aktywny;
    b.innerHTML = `<div class="seria">${w.seria}</div><div class="opis">${w.opis}</div>
      <span class="badge">${w.aktywny ? 'Otwórz' : 'Wkrótce'}</span>`;
    b.addEventListener('click', () => { location.hash = w.id; });
    box.appendChild(b);
  }
}

function showError(e) {
  console.error(e);
  const local = location.protocol === 'file:';
  const msg = local
    ? 'Strony nie da się otworzyć bezpośrednio z pliku. Uruchom w folderze projektu: python3 -m http.server 8000 i wejdź na http://localhost:8000'
    : `Błąd wczytywania: ${e.message}`;
  $('#screen-select').hidden = false;
  $('#wagon-list').innerHTML = `<p class="missing">${msg}</p>`;
  const l = $('#loading');
  l.textContent = msg;
}

// ---------- Otwieranie wagonu ----------
async function openWagon(w) {
  $('#screen-select').hidden = true;
  $('#screen-viewer').hidden = false;
  $('#btn-home').hidden = false;
  const loading = $('#loading');
  loading.hidden = false;
  loading.textContent = 'Wczytywanie…';

  try {
    if (!viewer) {
      viewer = new Viewer($('#c'));
      viewer.frameCallbacks.push(frame);
    }
    viewer.resize();
    closeWagon();

    const root = await loadWagonData(w.plik);
    const mod = await import(new URL(w.modul, document.baseURI).href);
    const model = await buildModel(root, mod.builders);
    viewer.scene.add(model);

    const nav = new Navigator(root);
    const animator = new Animator(root);
    const tree = new TreeView($('#tree'), nav);
    const toolbar = new Toolbar($('#toolbar'), nav, makeActions(nav));
    current = { root, nav, animator, tree, toolbar, model };

    picker ??= new Picker(viewer, nav, { onDoubleClick: (n) => onDoubleClick(n) });
    picker.nav = nav;

    nav.addEventListener('change', (e) => onChange(e.detail.kind));
    onChange('init');
    viewer.resetCamera(targetBox(root), 0.001);
    loading.hidden = true;
    // tryb sprawdzania (?debug w adresie) – patrz src/engine/debug.js
    const params = new URLSearchParams(location.search);
    if (params.has('debug')) (await import('./engine/debug.js')).installDebug(current, viewer, params);
  } catch (e) {
    console.error(e);
    loading.textContent = `Błąd: ${e.message}`;
  }
}

function closeWagon() {
  if (!current) return;
  current.toolbar.destroy();
  viewer.scene.remove(current.model);
  current.model.traverse((o) => {
    if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); }
  });
  current = null;
}

// ---------- Reakcja na zmiany stanu ----------
function onChange(kind) {
  const { nav, tree, toolbar } = current;
  if (kind === 'hover') {
    applyHighlight(nav);
    viewer.canvas.style.cursor = nav.hovered ? 'pointer' : '';
    return;
  }
  applyVisibility(nav);
  tree.update();
  toolbar.update();
  renderInfo($('#info-panel'), nav.selected ?? nav.focus, nav);
  renderBreadcrumb($('#breadcrumb'), nav);
  if (kind === 'focus' || kind === 'explode') viewer.flyToBox(targetBox(nav.focus));
  if (kind === 'reset') viewer.resetCamera(targetBox(nav.root));
}

function makeActions(nav) {
  return {
    explode() {
      const s = nav.selected;
      if (s && s !== nav.focus && s.children.length) nav.enter(s);
      else nav.explodeCurrent();
    },
    collapse: () => nav.collapse(),
    up: () => nav.up(),
    hide: () => nav.selected && nav.toggleHidden(nav.selected),
    isolate() {
      if (!nav.selected) return;
      nav.isolate(nav.selected);
      viewer.flyToBox(targetBox(nav.selected));
    },
    showall: () => nav.showAll(),
    remove: () => nav.toggleRemoved(nav.selected),
    reset: () => nav.reset(),
  };
}

function onDoubleClick(node) {
  const { nav } = current;
  if (node === nav.focus) return;
  if (!nav.enter(node)) toast('To pojedyncza część – nie da się jej dalej rozłożyć.');
}

// Pudełko obejmujące część PO zakończeniu animacji (żeby kamera od razu leciała w dobre miejsce)
function targetBox(node) {
  const { root } = current;
  const saved = [];
  for (const n of walk(root)) {
    if (!n.parent) continue;
    const o = n.object, u = o.userData;
    saved.push([o, o.position.clone(), o.rotation.clone()]);
    o.position.copy(u.basePos)
      .addScaledVector(u.explode, n.parent.exploded ? 1 : 0)
      .addScaledVector(u.remove, n.removed ? 1 : 0);
    if (u.removeRot) setOpenRotation(o, n.removed ? 1 : 0);
  }
  root.object.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const n of walk(node)) {
    if (skip(n)) continue;
    for (const m of n.meshes) box.expandByObject(m);
  }
  for (const [o, p, r] of saved) { o.position.copy(p); o.rotation.copy(r); }
  root.object.updateMatrixWorld(true);
  return box;
}
function skip(n) {
  for (let p = n; p; p = p.parent) if (p.hidden || (p.removed && !p.object.userData.opens)) return true;
  return false;
}

// Animacja rozkładania – co klatkę
function frame(dt) {
  if (!current) return;
  if (current.animator.update(dt)) applyVisibility(current.nav);
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2500);
}
