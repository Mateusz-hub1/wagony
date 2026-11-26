// Wczytywanie danych JSON i rozwijanie odwołań do wspólnych podzespołów.
//
// Plik wagonu (data/<seria>.json) i plik podzespołu (data/components/*.json) mają postać:
//   { "opisy": { "<typ>": { nazwa_pl, nazwa_en, funkcja, ... } },
//     "drzewo": { "id": "...", "typ": "...", "children": [ ... ] } }
// Węzeł drzewa może mieć "ref": "components/y25.json" – wtedy w tym miejscu
// wstawiane jest całe drzewo z tamtego pliku (z opisami z tamtego pliku).
// Węzeł może też mieć "szablon": "maznica" – wtedy jego dzieci są brane z sekcji
// "szablony" tego samego pliku (żeby nie powtarzać 4 razy tej samej maźnicy).

const cache = new Map();

// Ścieżki zawsze względne (./data/...), bo strona działa w podkatalogu na GitHub Pages
export async function loadJSON(relPath) {
  const url = new URL(relPath, document.baseURI).href;
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Nie udało się wczytać ${relPath} (HTTP ${r.status})`);
      return r.json();
    }));
  }
  return structuredClone(await cache.get(url));
}

export async function loadWagonList() {
  return loadJSON('./data/wagons.json');
}

// Wczytuje wagon i zwraca drzewo węzłów gotowe dla silnika
export async function loadWagonData(file) {
  const data = await loadJSON(`./data/${file}`);
  return resolveNode(data.drzewo, ctxOf(data, file), null);
}

const ctxOf = (data, file) => ({ opisy: data.opisy ?? {}, szablony: data.szablony ?? {}, file });

const EMPTY = '[uzupełnić]';

async function resolveNode(raw, ctx, parent) {
  let src = raw;
  if (raw.ref) {
    // Wstawienie wspólnego podzespołu. Pola z wagonu (np. id, dopisek) mają pierwszeństwo.
    const comp = await loadJSON(`./data/${raw.ref}`);
    const { ref, ...over } = raw;
    src = { ...comp.drzewo, ...over };
    ctx = ctxOf(comp, ref);
  }
  if (src.szablon) {
    const t = ctx.szablony[src.szablon];
    if (!t) console.warn(`[dane] Brak szablonu "${src.szablon}" w ${ctx.file}`);
    const { szablon, ...over } = src;
    src = { ...(t ?? {}), ...over };
  }

  const sourceFile = ctx.file;
  const opisTypu = ctx.opisy[src.typ];
  if (!opisTypu) console.warn(`[dane] Brak opisu dla typu "${src.typ}" w ${sourceFile}`);

  const node = {
    id: src.id,
    typ: src.typ,
    dopisek: src.dopisek ?? '',             // np. "lewa", "nr 1"
    model: src.model ?? null,                // opcjonalny plik .glb zamiast modelu z kodu
    zdejmowalny: !!src.zdejmowalny,
    // od tego poziomu w dół reszta wagonu jest ukrywana (żeby nie zasłaniała widoku)
    ukryjOtoczenie: !!src.ukryj_otoczenie,
    opis: {
      nazwa_pl: src.id, nazwa_en: '', funkcja: EMPTY, budowa: EMPTY,
      typowe_uszkodzenia: EMPTY, wymiary_graniczne: EMPTY, przepisy: EMPTY,
      zdjecia: [], zrodla: [], status: 'do weryfikacji',
      ...(opisTypu ?? {}), ...(src.opis ?? {}),
    },
    source: sourceFile,
    parent,
    path: parent ? `${parent.path}/${src.id}` : src.id,
    children: [],
    // stan w widoku 3D (ustawiany przez silnik)
    object: null, exploded: false, hidden: false, removed: false,
  };
  for (const ch of src.children ?? []) {
    node.children.push(await resolveNode(ch, ctx, node));
  }
  return node;
}

// Nazwa do wyświetlenia: „maźnica – lewa”
export function displayName(node) {
  return node.opis.nazwa_pl + (node.dopisek ? ` – ${node.dopisek}` : '');
}

// Wszystkie węzły drzewa po kolei
export function* walk(node) {
  yield node;
  for (const c of node.children) yield* walk(c);
}
