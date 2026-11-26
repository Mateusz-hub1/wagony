// Hamulec zespolony – parametry i rozmieszczenie elementów pod ostoją.
// Wszystkie części hamulca (poza tymi z własnym układem lokalnym) są budowane od razu
// w układzie WAGONU: x wzdłuż (0 = środek), y w górę (0 = główka szyny), z w poprzek.
// Parametry przychodzą z JSON wagonu: "param": { "dlugosc": ..., "x_wozka": ..., "hamulec_reczny": true, "uklad": { ... } }.
// Położenia elementów – SZACUNKOWE (układ typowy, do sprawdzenia na wagonie).
// "uklad" (opcjonalny) nadpisuje wybrane położenia z layout(), np. gdy pod środkiem wagonu
// są leje (Fals): { "cyl": [x, y, z], "valve": [...], "reservoir": [...], "hb": { "wheel": [...] } }.
// Klucze jak w layout() poniżej; "hb" jest łączony pole po polu.
import { THREE, rodGeom } from '../../lib/geom.js';
import { LEVER_ROD_END } from '../y25/brake.js';

export const DEFAULTS = {
  dlugosc: 12.8,          // odległość między licami belek czołowych [m]
  x_wozka: 4.5,           // pół rozstawu czopów skrętu [m]
  hamulec_reczny: true,   // czy wagon ma hamulec ręczny
};

// Parametry hamulca: szukamy w górę drzewa węzła z param.dlugosc (to węzeł "hamulec" w wagonie)
export function cfg(node) {
  for (let n = node; n; n = n.parent) if (n.param?.dlugosc) return { ...DEFAULTS, ...n.param };
  return { ...DEFAULTS };
}

// Rozmieszczenie elementów (wszystko w metrach, w układzie wagonu)
export function layout(c) {
  const L = c.dlugosc / 2;
  const base = {
    L,
    pipeY: 0.93, pipeZ: 0.32,                // przewód główny
    cock: [L + 0.03, 0.8, 0.32],             // kurek końcowy (koniec 1; koniec 2 symetrycznie względem środka)
    valve: [-0.7, 0.86, 0.6],                // zawór rozrządczy
    reservoir: [-1.9, 0.82, 0.72], resR: 0.2, resLen: 0.9, // zbiornik pomocniczy (oś wzdłuż x)
    cyl: [0.3, 0.82, 0.62], cylR: 0.203, cylLen: 0.45,     // cylinder hamulcowy: środek tylnej pokrywy, oś +x
    loadValve: [-0.25, 0.86, 1.0],           // przestawiacz próżny/ładowny
    release: [-1.25, 0.86, 0.72],            // luzownik (na przewodzie do zbiornika)
    leverY: 0.82,
    lever1X: 1.3,                            // dźwignia cylindrowa
    lever2X: 0.05,                           // dźwignia stała (za cylindrem)
    leverZ: [0.3, 1.0],                      // zakres dźwigni w poprzek
    rodZ: 0.95,                              // punkt cięgien do wózków na dźwigniach
    slackX: [1.55, 2.65],                    // nastawiacz skoku tłoka (od–do po x)
    via1: [c.x_wozka - 1.2, 0.66, 0.1],      // punkt pośredni cięgła nad osią zestawu kołowego
    via2: [-(c.x_wozka - 1.2), 0.66, 0.1],
    bogie1: [c.x_wozka + LEVER_ROD_END[0], LEVER_ROD_END[1], LEVER_ROD_END[2]],
    bogie2: [-(c.x_wozka + LEVER_ROD_END[0]), LEVER_ROD_END[1], -LEVER_ROD_END[2]],
    hb: { wheel: [-(L + 0.12), 1.65, -0.5], gear: [-(L + 0.07), 1.0, -0.5], leverZ: 0.45, rodY: 0.8 }, // hamulec ręczny na końcu 2
    mountY: 1.05,                            // wysokość mocowania wsporników do ostoi (spód poprzecznic)
    sideZ: 1.46,                             // dźwignia przestawiacza wyprowadzona za ostojnicę
  };
  // nadpisania z wagonu (param.uklad)
  const u = c.uklad ?? {};
  return { ...base, ...u, hb: { ...base.hb, ...(u.hb ?? {}) } };
}

// Rura po łamanej: odcinki + kulki w załamaniach (do połączenia przez merged)
export function pipeGeoms(points, r, seg = 12) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) out.push(rodGeom(points[i], points[i + 1], r, seg));
  for (let i = 1; i < points.length - 1; i++) {
    const s = new THREE.SphereGeometry(r, seg, 8);
    s.translate(...points[i]);
    out.push(s);
  }
  return out;
}

// Punkt na odcinku a–b dla danego x (do ustawiania nastawiacza na linii cięgła)
export function atX(a, b, x) {
  const t = (x - a[0]) / (b[0] - a[0]);
  return a.map((v, i) => v + (b[i] - v) * t);
}
