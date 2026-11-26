// Zawory hamulca: zawór rozrządczy, przestawiacz próżny/ładowny, luzownik, kurek końcowy.
// Kształty uproszczone, wymiary SZACUNKOWE.
import { THREE, M, part, slot, mesh, box, boxFromTo, cylinder, rod, merged, boxGeom, bolts } from '../../lib/geom.js';
import { cfg, layout } from './config.js';

// Zawór rozrządczy na wsporniku pod poprzecznicą, z rękojeścią przestawiacza G/P
export function buildDistributor(node) {
  const g = part('zawor_rozrzadczy');
  const [x, y, z] = layout(cfg(node)).valve;
  // płyta przyłączeniowa (do niej przykręcony zawór, do niej dochodzą rury)
  box(0.32, 0.26, 0.03, M.paintDark, { pos: [x, y, z - 0.115], r: 0.006, parent: g });
  // korpus zaworu
  box(0.28, 0.22, 0.2, M.paintDark, { pos: [x, y, z], r: 0.02, parent: g });
  // pokrywy i śruby
  box(0.2, 0.15, 0.02, M.paintDark, { pos: [x, y, z + 0.11], r: 0.008, parent: g });
  bolts([[-0.08, -0.055], [0.08, -0.055], [-0.08, 0.055], [0.08, 0.055]].map(([dx, dy]) => ({ pos: [x + dx, y + dy, z + 0.12], dir: [0, 0, 1] })), 0.012, M.bolt, { parent: g, stick: 0.2 });
  // przestawiacz G/P (towarowy / osobowy) – rękojeść na boku zaworu
  cylinder(0.02, 0.04, M.steelRaw, { axis: 'x', pos: [x + 0.16, y + 0.05, z], parent: g });
  box(0.02, 0.12, 0.025, M.paintRed, { pos: [x + 0.185, y + 0.0, z], r: 0.006, parent: g });
  // wspornik do poprzecznicy
  merged([-0.12, 0.12].map((dx) => boxGeom(0.02, 0.2, 0.18, [x + dx, y + 0.2, z - 0.05])), M.paintDark, { parent: g });
  return g;
}

// Przestawiacz próżny/ładowny (zmienia siłę hamowania wagonu próżnego i ładownego)
export function buildLoadValve(node) {
  const g = part('przestawiacz_prozny_ladowny');
  const lay = layout(cfg(node));
  const [x, y, z] = lay.loadValve;
  slot(g, 'dzwignia_przestawiacza', { explode: [0, 0, 0.35] });
  box(0.16, 0.15, 0.15, M.paintDark, { pos: [x, y, z], r: 0.015, parent: g });
  cylinder(0.04, 0.03, M.paintDark, { axis: 'z', pos: [x, y, z + 0.085], parent: g });
  // wspornik
  boxFromTo([x - 0.09, x + 0.09], [y + 0.075, 1.05], [z - 0.01, z + 0.01], M.paintDark, { r: 0.004, parent: g });
  return g;
}

// Dźwignia przestawiacza wyprowadzona na bok wagonu + tabliczka położeń
export function buildLoadValveLever(node) {
  const g = part('dzwignia_przestawiacza');
  const [x, y, z] = layout(cfg(node)).loadValve;
  const zs = 1.46; // za ostojnicą (SZACUNKOWE)
  rod([x, y, z + 0.1], [x, y, zs], 0.012, M.steelRaw, { seg: 10, parent: g });
  // rękojeść skierowana w dół z gałką
  rod([x, y, zs], [x + 0.06, y - 0.22, zs], 0.012, M.paintRed, { seg: 10, parent: g });
  mesh(new THREE.SphereGeometry(0.022, 14, 10), M.paintRed, { pos: [x + 0.06, y - 0.23, zs], parent: g });
  // tabliczka z położeniami (próżny / ładowny) na ostojnicy
  box(0.26, 0.07, 0.004, M.paintWhite, { pos: [x, y + 0.08, 1.402], r: 0.002, parent: g });
  return g;
}

// Luzownik – zawór do ręcznego odluźnienia hamulca (wypuszcza powietrze ze zbiornika/cylindra),
// z cięgłem wyprowadzonym na oba boki wagonu
export function buildReleaseValve(node) {
  const g = part('luzownik');
  const [x, y, z] = layout(cfg(node)).release;
  cylinder(0.035, 0.09, M.paintDark, { axis: 'x', pos: [x, y, z], parent: g });
  cylinder(0.02, 0.05, M.steelRaw, { pos: [x, y - 0.05, z], parent: g });
  // dźwigienka zaworu i cięgło w poprzek wagonu (obok zaworu, pod przewodem do zbiornika)
  const xr = x + 0.06, yr = 0.835, zEnd = 1.47;
  rod([x, y - 0.075, z], [xr, yr, z], 0.008, M.steelRaw, { seg: 8, parent: g });
  rod([xr, yr, -zEnd], [xr, yr, zEnd], 0.008, M.steelRaw, { seg: 8, parent: g });
  // uchwyty (pierścienie) na obu końcach – po obu stronach wagonu
  for (const s of [1, -1]) {
    mesh(new THREE.TorusGeometry(0.035, 0.007, 8, 20), M.paintRed, { pos: [xr, yr - 0.042, s * zEnd], parent: g });
  }
  return g;
}

// Kurek końcowy – układ lokalny: środek kurka, przewód główny dochodzi od −x, wylot do węża w +x
export function buildEndCock() {
  const g = part('kurek_koncowy');
  cylinder(0.03, 0.12, M.paintDark, { axis: 'x', pos: [0, 0, 0], seg: 20, parent: g });
  // korpus kulisty zaworu
  mesh(new THREE.SphereGeometry(0.042, 20, 14), M.paintDark, { pos: [0, 0, 0], parent: g });
  // wylot z gwintem do sprzęgu hamulcowego
  cylinder(0.024, 0.04, M.steelMachined, { axis: 'x', pos: [0.08, 0, 0], parent: g });
  // rękojeść (wzdłuż przewodu = kurek otwarty)
  cylinder(0.012, 0.04, M.steelRaw, { pos: [0, 0.05, 0], parent: g });
  box(0.16, 0.018, 0.03, M.paintRed, { pos: [-0.03, 0.075, 0], r: 0.006, parent: g });
  return g;
}

export const valveBuilders = {
  zawor_rozrzadczy: buildDistributor,
  przestawiacz_prozny_ladowny: buildLoadValve,
  dzwignia_przestawiacza: buildLoadValveLever,
  luzownik: buildReleaseValve,
  kurek_koncowy: buildEndCock,
};
