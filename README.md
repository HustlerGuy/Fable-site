# fiwoj.pl — strona firmowa

Statyczna strona internetowa dla lokalnej firmy **fiwoj.pl** świadczącej usługi **prania tapicerki, wykładzin, dywanów i materacy w Olsztynie i okolicy (do 20 km)**.

> Hasło marki: **„Głębokie czyszczenie. Widoczny efekt.”**

## 🧱 Stack

Czysty **HTML + CSS + JavaScript** (bez frameworków, bez build-stepu). Wystarczy otworzyć `index.html` w przeglądarce lub wrzucić pliki na dowolny hosting.

## 📁 Struktura

```
index.html        – strona główna (hero, usługi, przed/po, proces, obszar, opinie, FAQ)
uslugi.html       – zakres usług
realizacje.html   – galeria efektów przed/po (interaktywny suwak)
cennik.html       – cennik orientacyjny + kalkulacja
o-nas.html        – o firmie, wartości, liczby
kontakt.html      – dane kontaktowe + formularz darmowej wyceny
css/style.css     – system wizualny (kolory, typografia, komponenty)
js/main.js        – interakcje (nawigacja, suwak przed/po, liczniki, FAQ, formularz)
robots.txt        – dyrektywy dla robotów
sitemap.xml       – mapa strony dla wyszukiwarek
```

## 🎨 Identyfikacja wizualna

| Element | Wartość |
|--------|---------|
| Kolor główny (zaufanie) | `#0B6FB8` błękit |
| Kolor akcji / CTA | `#17C3B2` turkus |
| Tekst | `#1B2A38` grafit |
| Tło jasne | `#F5FAFD` lodowa biel |
| Fonty | Poppins (nagłówki) + Inter (treść) |

Sygnaturowe elementy: falowe przejścia sekcji, unoszące się „bąbelki”, interaktywny **suwak przed/po**, glassmorphism, animowane liczniki i mobilny pasek CTA (telefon + wycena).

## ✅ Zanim uruchomisz produkcyjnie — do uzupełnienia

- [ ] **Numer telefonu** — zamień placeholder `+48 000 000 000` (obecny we wszystkich plikach).
- [ ] **E-mail** — `kontakt@fiwoj.pl` (potwierdź lub zmień).
- [ ] **Zdjęcia realizacji** — sekcje przed/po używają placeholderów; wgraj prawdziwe fotografie.
- [ ] **Ceny** — w `cennik.html` podano wartości przykładowe; dostosuj do własnego cennika.
- [ ] **Formularz** — obecnie działa demonstracyjnie (front-end). Podłącz wysyłkę e-mail / backend (np. Formspree, własny endpoint).
- [ ] **Social media** — podmień linki `#` w stopce na realne profile.
- [ ] **Domena w sitemap/robots** — potwierdź `https://fiwoj.pl`.

## 🚀 Uruchomienie lokalne

```bash
# dowolny statyczny serwer, np.:
python3 -m http.server 8000
# następnie otwórz http://localhost:8000
```
