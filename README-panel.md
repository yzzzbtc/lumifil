# Panel treści LUMIFIL — jak to działa i co trzeba dokończyć

## Jak to działa

```
właściciel edytuje w panelu (lumifil.org/admin)
        ↓  zapis = commit do repozytorium
GitHub Actions: tłumaczy PL → DE/EN/FR (DeepL)
                generuje strony (oferta, blog, strona główna, sitemap)
                commituje wynik na main
        ↓
GitHub Pages publikuje lumifil.org   (~1-2 minuty od zapisu)
```

Kluczowa różnica względem poprzedniego panelu: **treść trafia do statycznego
HTML**, więc Google widzi wpisy bloga i realizacje. Poprzedni panel dorysowywał
je JavaScriptem po stronie przeglądarki — dla wyszukiwarki były praktycznie
niewidoczne.

## Struktura

| Ścieżka | Rola |
|---|---|
| `content/blog/*.json` | wpisy bloga, jeden plik = jeden wpis, 4 języki |
| `content/projects/*.json` | realizacje |
| `content/testimonials.json` | opinie klientów |
| `content/company.json` | telefon, e-mail, godziny, punkty handlowe |
| `admin/` | panel (Decap CMS) — `config.yml` opisuje pola |
| `tools/build-all.js` | pełny build; uruchamia poniższe po kolei |
| `tools/translate.js` | PL → DE/EN/FR przez DeepL |
| `tools/build-offer.js` | 29 podstron oferty |
| `tools/build-home.js` | realizacje, opinie, punkty na stronie głównej |
| `tools/build-blog.js` | strony wpisów + kafelki bloga |
| `tools/build-sitemap.js` | `sitemap.xml` |
| `tools/.translate-cache.json` | skróty źródeł PL — żeby nie tłumaczyć dwa razy |

Build lokalnie: `node tools/build-all.js` (bez klucza DeepL krok tłumaczenia
jest pomijany — reszta działa normalnie).

## DO DOKOŃCZENIA — 3 rzeczy

### 1. Klucz DeepL (tłumaczenia)

1. Załóż konto na <https://www.deepl.com/pro-api> — plan **Free** daje
   500 000 znaków miesięcznie, co przy 1-3 wpisach wystarcza z zapasem.
2. Skopiuj klucz API (kończy się na `:fx` dla planu Free).
3. W repozytorium: **Settings → Secrets and variables → Actions → New secret**
   - nazwa: `DEEPL_API_KEY`
   - wartość: skopiowany klucz

Bez tego wszystko działa, tylko wersje DE/EN/FR zostają puste — a wtedy strona
pokazuje w tych językach tekst polski (świadomy fallback, nie pustka).

### 2. Logowanie do panelu (OAuth)

Decap CMS zapisuje przez API GitHuba, a to wymaga logowania OAuth. GitHub
wymaga przy tym *client secret*, którego nie da się trzymać w przeglądarce —
potrzebny jest maleńki pośrednik.

Kroki:

1. **Zarejestruj OAuth App na GitHubie**
   Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL: `https://lumifil.org`
   - Authorization callback URL: adres pośrednika + `/callback`
   - zapisz **Client ID** i **Client Secret**

2. **Postaw pośrednika.** Najprościej gotowy worker na Cloudflare (darmowy)
   albo funkcja na Vercelu. Wystarczy jeden endpoint `/auth` + `/callback`,
   który wymienia kod na token.

3. **Wpisz jego adres** w `admin/config.yml` w polu `base_url`
   (teraz jest tam `https://USTAW-ADRES-SERWERA-OAUTH`).

4. Właściciel musi mieć konto GitHub z dostępem do repozytorium — to ono jest
   zabezpieczeniem panelu. Żadnych haseł w kodzie.

> Poprzedni panel miał hasło wpisane wprost w `js/admin.js`, publicznie
> dostępne pod `lumifil.org/js/admin.js`. Tak się tego nie robi — stąd OAuth.

### 3. Uprawnienie `workflow` dla push

Plik `.github/workflows/build.yml` wymaga tokena z zakresem `workflow`.
Jeśli push jest odrzucany:

```
gh auth refresh -h github.com -s workflow
```

## Dla właściciela — krótka instrukcja

1. Wejdź na `lumifil.org/admin` i zaloguj się przez GitHub.
2. Wybierz **Blog** → *New wpis*.
3. Wypełnij **tylko część polską** (🇵🇱). Niemiecki, angielski i francuski
   uzupełnią się same.
4. **Adres URL wpisu** — małe litery i myślniki, bez polskich znaków,
   np. `okna-do-poddasza`. To będzie adres strony.
5. Dopóki **Szkic** jest włączony, wpis nie pojawia się na stronie.
   Wyłącz go, gdy wpis jest gotowy.
6. Zapisz. Strona zaktualizuje się w ciągu 1-2 minut.

Uwaga: jeśli poprawisz ręcznie tłumaczenie (np. niemieckie), zostanie ono
zachowane — chyba że zmienisz później polski oryginał, wtedy tłumaczenie
wygeneruje się od nowa.

## Stan treści

6 wpisów bloga przeniesionych ze starej wersji strony to same tytuły
i zajawki — nie miały treści. Leżą jako **szkice** w `content/blog/`;
właściciel może je uzupełnić albo skasować. Jeden wpis
(`jak-wybrac-okna-energooszczedne`) jest napisany w całości i opublikowany,
żeby pokazać, jak wygląda gotowa strona wpisu.
