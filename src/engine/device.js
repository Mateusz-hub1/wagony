// Rozpoznanie urządzenia: komputer czy telefon. Ustalane raz, przy starcie strony.
// Na telefonie: niższa rozdzielczość rysowania, lżejsze cienie i budowanie
// szczegółów (np. wnętrza maźnicy) dopiero przy wejściu w część, siatki jednej części łączone.
// Do sprawdzania na komputerze: ?mobile w adresie wymusza profil telefonu, ?desktop – komputera.
import * as THREE from 'three';

// Wąski ekran (telefon pionowo) albo niski (telefon poziomo). To samo zapytanie jest w css/style.css.
export const MOBILE_MQ = '(max-width: 760px), (max-height: 520px)';

const params = new URLSearchParams(location.search);
const coarse = matchMedia('(pointer: coarse)').matches; // palec zamiast myszki
export const isMobile = params.has('mobile') || (!params.has('desktop') && (coarse || matchMedia(MOBILE_MQ).matches));

const dpr = window.devicePixelRatio || 1;

export const perf = isMobile
  ? { pixelRatio: Math.min(dpr, 1.5), shadowMapSize: 1024, shadowType: THREE.PCFShadowMap, shadowRadius: 1, staticShadows: true, lazyDetails: true, mergeMeshes: true }
  : { pixelRatio: Math.min(dpr, 2), shadowMapSize: 2048, shadowType: THREE.PCFSoftShadowMap, shadowRadius: 4, staticShadows: false, lazyDetails: false, mergeMeshes: false };

// Czy teraz układ jest „telefonowy” (zmienia się np. po obróceniu telefonu)
const mq = matchMedia(MOBILE_MQ);
export const isNarrow = () => mq.matches;
export const onNarrowChange = (fn) => mq.addEventListener('change', fn);
