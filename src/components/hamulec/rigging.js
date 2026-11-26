// Cięgła i dźwignie hamulca wagonu oraz nastawiacz skoku tłoka.
// Dźwignia cylindrowa (przy tłoczysku) i dźwignia stała (za cylindrem) są połączone cięgłem;
// od każdej dźwigni cięgło biegnie do dźwigni hamulca jednego wózka.
// Układ i przekroje – SZACUNKOWE.
import { THREE, M, part, mesh, box, cylinder, rod } from '../../lib/geom.js';
import { cfg, layout, atX } from './config.js';

// Punkty cięgien (wspólne dla cięgien i nastawiacza)
export function rigPoints(lay) {
  const y = lay.leverY, [z0, z1] = lay.leverZ;
  return {
    lever1: [[lay.lever1X, y, z0], [lay.lever1X, y, z1]],
    lever2: [[lay.lever2X, y, z0], [lay.lever2X, y, z1]],
    rod1a: [lay.lever1X, y, lay.rodZ],   // początek cięgła do wózka 1 (na dźwigni cylindrowej)
    rod2a: [lay.lever2X, y, lay.rodZ],   // początek cięgła do wózka 2 (na dźwigni stałej)
  };
}

export function buildRigging(node) {
  const g = part('ciegla_hamulcowe');
  const lay = layout(cfg(node));
  const p = rigPoints(lay);
  const S = M.steelRaw;
  // dźwignie poziome (dwa płaskowniki) ze sworzniami
  for (const [a, b] of [p.lever1, p.lever2]) {
    for (const dy of [0.022, -0.022]) box(0.06, 0.014, b[2] - a[2], S, { pos: [a[0], a[1] + dy, (a[2] + b[2]) / 2], r: 0.004, parent: g });
    for (const z of [a[2] + 0.02, lay.cyl[2], lay.rodZ, (a[2] + lay.cyl[2]) / 2]) cylinder(0.011, 0.07, M.steelMachined, { pos: [a[0], a[1], z], parent: g });
  }
  // punkt stały dźwigni stałej (wspornik do ostoi)
  box(0.08, lay.mountY - lay.leverY, 0.03, M.paintDark, { pos: [lay.lever2X, (lay.leverY + lay.mountY) / 2, lay.cyl[2]], r: 0.005, parent: g });
  // cięgło łączące dźwignie
  rod([lay.lever2X, lay.leverY, p.lever2[0][2] + 0.02], [lay.lever1X, lay.leverY, p.lever1[0][2] + 0.02], 0.015, S, { seg: 10, parent: g });
  // cięgło do wózka 1: od nastawiacza przez punkt pośredni do dźwigni wózka
  const n1 = atX(p.rod1a, lay.via1, lay.slackX[1]);
  rod(n1, lay.via1, 0.015, S, { seg: 10, parent: g });
  rod(lay.via1, lay.bogie1, 0.015, S, { seg: 10, parent: g });
  // cięgło do wózka 2
  rod(p.rod2a, lay.via2, 0.015, S, { seg: 10, parent: g });
  rod(lay.via2, lay.bogie2, 0.015, S, { seg: 10, parent: g });
  // przeguby (widełki) w punktach załamania
  for (const q of [lay.via1, lay.via2]) mesh(new THREE.SphereGeometry(0.024, 12, 8), S, { pos: q, parent: g });
  return g;
}

// Nastawiacz skoku tłoka: utrzymuje stały skok tłoka mimo zużycia wstawek hamulcowych.
// Leży na linii cięgła do wózka 1.
export function buildSlackAdjuster(node) {
  const g = part('nastawiacz');
  const lay = layout(cfg(node));
  const p = rigPoints(lay);
  const a = p.rod1a, b = lay.via1;
  const s0 = atX(a, b, lay.slackX[0] + 0.15), s1 = atX(a, b, lay.slackX[1] - 0.25);
  // korpus (rura z gwintowanym wrzecionem w środku)
  rod(s0, s1, 0.055, M.paintDarkRound, { seg: 24, parent: g });
  // głowica regulacyjna
  const h = atX(a, b, lay.slackX[0] + 0.1);
  rod(h, s0, 0.065, M.paintDarkRound, { seg: 24, parent: g });
  // wrzeciono wychodzące z tyłu
  rod(s1, atX(a, b, lay.slackX[1]), 0.022, M.steelMachined, { seg: 14, parent: g });
  // cięgło od dźwigni cylindrowej do nastawiacza
  rod(a, h, 0.015, M.steelRaw, { seg: 10, parent: g });
  // dźwignia sterująca nastawiacza z ogranicznikiem (uproszczone)
  rod(h, [h[0] + 0.05, h[1] + 0.16, h[2]], 0.01, M.steelRaw, { seg: 8, parent: g });
  return g;
}

export const riggingBuilders = {
  ciegla_hamulcowe: buildRigging,
  nastawiacz: buildSlackAdjuster,
};

