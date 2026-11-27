// Hamulec zespolony (air brake) – złożenie i wszystkie buildery.
// Klucz = "typ" części w data/components/hamulec.json.
// Złożenie jest w układzie wagonu (gniazdo w wagonie bez przesunięcia); rozmieszczenie
// zależy od parametrów wagonu – patrz config.js.
import { part, slot } from '../../lib/geom.js';
import { cfg, layout } from './config.js';
import { valveBuilders } from './valves.js';
import { cylinderBuilders } from './cylinder.js';
import { pipingBuilders } from './piping.js';
import { riggingBuilders } from './rigging.js';
import { handBrakeBuilders } from './handbrake.js';

export function buildAirBrake(node) {
  const g = part('hamulec');
  const c = cfg(node);
  const lay = layout(c);
  const [cx, cy, cz] = lay.cock;
  slot(g, 'zawor_rozrzadczy', { explode: [0, -0.45, 0.35] });
  slot(g, 'cylinder_hamulcowy', { pos: lay.cyl, explode: [0, -0.6, 0.25] });
  slot(g, 'nastawiacz', { explode: [0, -0.5, 0.2] });
  slot(g, 'przestawiacz_prozny_ladowny', { explode: [0, -0.35, 0.55] });
  slot(g, 'luzownik', { explode: [0, -0.4, 0] });
  slot(g, 'zbiornik_pomocniczy', { explode: [0, -0.55, 0.5] });
  slot(g, 'przewod_glowny', { explode: [0, -0.15, 0] });
  slot(g, 'rury_laczace', { explode: [0, -0.3, 0.1] });
  slot(g, 'ciegla_hamulcowe', { explode: [0, -0.25, -0.2] });
  slot(g, 'kurek_koncowy_1', { pos: [cx, cy, cz], explode: [0.4, -0.15, 0] });
  slot(g, 'sprzeg_hamulcowy_1', { pos: [cx + 0.1, cy, cz], explode: [0.8, -0.25, 0] });
  // koniec 2: przy belce czołowej kurek i sprzęg; przy przegubie – brak (wagon dodaje "bez")
  if (!lay.przegub2) {
    const cx2 = lay.L2 + cx - lay.L; // kurek tak samo daleko od lica belki jak na końcu 1
    slot(g, 'kurek_koncowy_2', { pos: [-cx2, cy, -cz], rot: [0, Math.PI, 0], explode: [-0.4, -0.15, 0] });
    slot(g, 'sprzeg_hamulcowy_2', { pos: [-(cx2 + 0.1), cy, -cz], rot: [0, Math.PI, 0], explode: [-0.8, -0.25, 0] });
  }
  if (c.hamulec_reczny) slot(g, 'hamulec_reczny', { explode: [-0.6, 0.2, 0] });
  return g;
}

export const airBrakeBuilders = {
  hamulec: buildAirBrake,
  ...valveBuilders,
  ...cylinderBuilders,
  ...pipingBuilders,
  ...riggingBuilders,
  ...handBrakeBuilders,
};
