Interaktywny atlas budowy wagonów towarowych
Cel projektu

Strona internetowa do nauki i sprawdzania budowy wagonów towarowych (węglarki, platformy, bez cystern). Użytkownik wybiera typ wagonu, a potem klika jego elementy w widoku 3D i rozkłada je coraz głębiej, aż do pojedynczych części. Przy każdej części widać jej opis.

Przykład zagłębiania: wagon → wózek Y25 → zestaw kołowy → maźnica → zdjęcie pokrywy → łożysko, smar.

Użytkownicy
Pracownicy biurowi serwisu naprawy wagonów towarowych (nie mechanicy).
Komputery biurowe, przeglądarka (Chrome/Edge), myszka. Widok mobilny nie jest priorytetem.
Właściciel projektu (Mateusz) uczy się programowania. Na razie ma po prostu działać, kod tłumaczymy później. Pisz czytelny kod z krótkimi komentarzami po polsku.
Zakres
Wagony w wersji „typowej” (bez wariantów producentów), na wózkach Y25.
Serie w kolejności:
Eaos (start)
Eanos, Fals, Falns
Res, Sgs, Sggrss (wagon przegubowy)
inne
Najpierw jeden zespół rozłożony do samego końca (wózek Y25 → zestaw kołowy → maźnica). Dopiero potem reszta wagonu.
Biblioteka wspólnych podzespołów (KLUCZOWE)

Większość części powtarza się we wszystkich wagonach. Buduj je RAZ jako osobne moduły w src/components/ i tylko używaj ponownie:

wózek Y25 (z zestawami kołowymi, maźnicami, usprężynowaniem, hamulcem wózka)
urządzenia cięgłowo-zderzakowe (sprzęg śrubowy, hak, zderzaki)
hamulec zespolony (zawór rozrządczy, cylinder, nastawiacz, przewody, kurki, zbiornik) Każdy wagon (src/wagons/<seria>.js + data/<seria>.json) dokłada tylko swoje pudło i ostoję oraz rozmieszcza wspólne podzespoły. Opisy wspólnych części są w data/components/*.json, a wagony się do nich odwołują.
Język i nazewnictwo
Cały interfejs po polsku.
Nazwa każdej części: polska nazwa (English name), np. maźnica (axle box).
Opis każdej części (pola danych)
nazwa_pl, nazwa_en
funkcja: do czego służy
budowa: z czego się składa
typowe_uszkodzenia
wymiary_graniczne: wymiary graniczne i zużycia
przepisy: odniesienia do przepisów i norm (np. GCU, VPI, karty UIC, normy EN)
zdjecia: lista zdjęć, na razie pusta (zdjęcia z hali dodamy później)
status: "do weryfikacji" albo "zweryfikowane"
do_sprawdzenia: ukryta lista notatek do weryfikacji (opcjonalna)

NIE dodawaj numerów katalogowych.

Zasada rzetelności: treści opieraj na publicznie dostępnych źródłach. Nie zmyślaj liczb. Jeśli nie masz pewnego źródła, pomiń pole (nie wpisuj "[uzupełnić]"); panel opisu ukrywa puste pola. Liczby bez źródła w kodzie 3D oznaczaj komentarzem SZACUNKOWE. Notatki o tym, co trzeba sprawdzić, wpisuj w ukryte pole do_sprawdzenia (lista tekstów, panel go nie pokazuje). Wszystkie nowe opisy dostają status "do weryfikacji", bo sprawdza je Mateusz na podstawie doświadczenia z pracy. Źródła zapisuj w polu zrodla.

Technologia
Statyczna strona bez etapu budowania: index.html + JavaScript (moduły ES) + Three.js ładowany przez importmap z CDN. Ma działać na GitHub Pages bez żadnej konfiguracji.
Dane wagonów są w osobnych plikach JSON (data/eaos.json itd.), zapisanych jako drzewo części z polem children. Kod 3D i treść trzymaj osobno, żeby dało się poprawiać opisy bez ruszania kodu.
Modele 3D budujemy proceduralnie w kodzie, jak najrealistyczniej:
prawdziwe wymiary z publicznych źródeł (skala 1 jednostka = 1 m)
materiały PBR: stal, farba z lekkim zużyciem, rdza na krawędziach, guma, smar
fazowane krawędzie, śruby, nity, użebrowania, spoiny tam, gdzie są widoczne
oświetlenie HDRI (RoomEnvironment), miękkie cienie, tone mapping ACES Każda część to osobny obiekt z id zgodnym z JSON-em.
Architekturę zaprojektuj tak, żeby dowolną część dało się później podmienić na gotowy model .glb.
Funkcje widoku 3D (priorytety)
Obrót, przybliżanie i przesuwanie myszką (OrbitControls).
Podświetlanie części po najechaniu, kliknięcie zaznacza część i otwiera panel opisu.
Rozkładanie (exploded view) z płynną animacją. Dwuklik albo przycisk „Rozłóż” wchodzi poziom głębiej.
Ścieżka nawigacji (breadcrumb), np. Eaos › Wózek Y25 › Zestaw kołowy › Maźnica, z możliwością cofania się.
Ukrywanie i izolowanie części (pokaż tylko tę część / ukryj).
Drzewo części w bocznym panelu, zsynchronizowane z widokiem 3D.
Zdejmowanie elementów, np. pokrywy maźnicy, żeby było widać wnętrze (łożysko, smar).
Przekrój: niski priorytet, na później.
Wstępna struktura Eaos (do sprawdzenia i rozbudowy)
Pudło (body): ściany boczne, drzwi dwuskrzydłowe, ściany czołowe, podłoga stalowa, pas górny (top chord)
Ostoja (underframe): ostojnice, belki czołowe, belki skrętowe, gniazdo skrętu
Wózki ×2, typ Y25 (bogie): rama wózka, zestawy kołowe, maźnice, usprężynowanie z tłumieniem ciernym, ślizgi boczne, układ hamulcowy wózka (klocki, wstawki hamulcowe, belki hamulcowe)
Zestaw kołowy (wheelset): oś, koła, maźnice
Maźnica (axle box): korpus, pokrywa, łożysko, smar, uszczelnienie
Urządzenia cięgłowo-zderzakowe (draw and buffing gear): sprzęg śrubowy, hak cięgłowy, zderzaki
Hamulec zespolony (air brake): zawór rozrządczy, cylinder hamulcowy, nastawiacz skoku tłoka, przewód główny, kurki końcowe, sprzęgi hamulcowe, zbiornik pomocniczy, hamulec ręczny (jeśli występuje)
Etapy
Szkielet strony: wybór wagonu, scena 3D, panel opisu, breadcrumb, wczytywanie JSON.
Biblioteka wspólna: wózek Y25 (rozłożony do końca, łącznie z maźnicą), urządzenia cięgłowo-zderzakowe, hamulec, z opisami.
Eaos kompletny jako wzorzec dla pozostałych wagonów.
Publikacja na GitHub Pages (repo publiczne, Pages z gałęzi main).
Pozostałe serie: można je robić równolegle, każdą w osobnym worktree lub gałęzi. Agent od danej serii zmienia tylko src/wagons/<seria>.js i data/<seria>.json. Zmiany w src/components/ i w silniku robi tylko jedna sesja, żeby uniknąć konfliktów.
Środowisko
macOS, przeglądarka Chrome/Safari. Podgląd lokalny: python3 -m http.server 8000.
Zasady pracy
Po każdym etapie uruchom stronę lokalnie (np. npx serve albo python -m http.server) i sprawdź, czy działa.
Rób małe commity z opisami po polsku.
Strona będzie publiczna (link), więc nie umieszczaj żadnych danych wewnętrznych firmy.