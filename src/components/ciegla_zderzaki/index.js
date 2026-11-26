// Urządzenia cięgłowo-zderzakowe (draw and buffing gear) – złożenie dla JEDNEGO końca wagonu.
// Klucz = "typ" części w data/components/ciegla_zderzaki.json.
// Układ lokalny: początek na licu belki czołowej, na wysokości osi zderzaków i haka,
// w osi wagonu; +x na zewnątrz. Wagon umieszcza dwa takie złożenia (drugie obrócone o 180°).
// param.rozstaw_zderzakow – rozstaw osi zderzaków [m], domyślnie 1,75 (UIC 528).
import { part, slot } from '../../lib/geom.js';
import { bufferBuilders } from './buffer.js';
import { couplingBuilders, PIN_X } from './coupling.js';

export function buildDrawBuffingGear(node) {
  const g = part('urzadzenia_ciaglowo_zderzakowe');
  const bz = (node?.param?.rozstaw_zderzakow ?? 1.75) / 2;
  slot(g, 'zderzak_1', { pos: [0, 0, bz], explode: [0.5, 0, 0.45] });
  slot(g, 'zderzak_2', { pos: [0, 0, -bz], explode: [0.5, 0, -0.45] });
  slot(g, 'hak_ciagowy', { explode: [0.35, 0.45, 0] });
  // sprzęg zwisa z haka: obrócony wokół sworznia w dół
  slot(g, 'sprzeg_srubowy', { pos: [PIN_X, 0, 0], rot: [0, 0, -1.1], explode: [0.9, -0.15, 0] });
  return g;
}

export const drawGearBuilders = {
  urzadzenia_ciaglowo_zderzakowe: buildDrawBuffingGear,
  ...bufferBuilders,
  ...couplingBuilders,
};
