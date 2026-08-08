# Pośrednik OAuth — wdrożenie

Panel `lumifil.org/admin` loguje się przez GitHuba. GitHub wymaga przy tym
*client secret*, którego nie wolno trzymać w przeglądarce. Ten worker jest
jedynym miejscem, w którym sekret istnieje.

Koszt: **0 zł** — mieści się w darmowym planie Cloudflare Workers
(100 000 żądań dziennie; logowanie do panelu to kilka żądań miesięcznie).

---

## Krok 1 — zarejestruj OAuth App na GitHubie

<https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**

| Pole | Wartość |
|---|---|
| Application name | `LUMIFIL panel` |
| Homepage URL | `https://lumifil.org` |
| Authorization callback URL | `https://lumifil-oauth.<twoj-subdomain>.workers.dev/callback` |

Adres workera poznasz dopiero po kroku 2 — na razie wpisz cokolwiek
poprawnego (np. `https://example.com/callback`) i popraw po wdrożeniu.

Po utworzeniu zapisz **Client ID**, a potem wygeneruj **Client Secret**
(pokazuje się tylko raz).

---

## Krok 2 — wdróż workera

Z katalogu `oauth-proxy/`:

```bash
npx wrangler login          # otworzy przeglądarkę, zaloguj się do Cloudflare
npx wrangler deploy         # wypisze adres, np. https://lumifil-oauth.xyz.workers.dev
```

Następnie ustaw sekrety (wartości z kroku 1):

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

---

## Krok 3 — połącz wszystko

1. Wróć do ustawień OAuth App na GitHubie i wpisz **prawdziwy** callback:
   `https://<adres-workera>/callback`
2. W pliku `admin/config.yml` ustaw:

   ```yaml
   backend:
     name: github
     repo: yzzzbtc/lumifil
     branch: main
     base_url: https://<adres-workera>
   ```

3. Zacommituj zmianę i wejdź na `https://lumifil.org/admin/`.

---

## Sprawdzenie

- Otwórz sam adres workera w przeglądarce — powinien pokazać stronę
  „OAuth proxy LUMIFIL / Worker działa”.
- Jeśli panel pokazuje błąd `Nieprawidłowy state`, to zwykle znaczy,
  że callback URL w OAuth App nie zgadza się z adresem workera.
- Jeśli logowanie kończy się pustym oknem — sprawdź, czy `ALLOWED_ORIGIN`
  w `wrangler.toml` to dokładnie `https://lumifil.org` (bez ukośnika na końcu).

## Kto ma dostęp

Dostęp do panelu = dostęp do repozytorium `yzzzbtc/lumifil` na GitHubie.
Żeby dać właścicielowi dostęp, dodaj jego konto GitHub jako współpracownika
(Settings → Collaborators). Odebranie dostępu = usunięcie go z repozytorium.
Nie ma żadnych haseł do zmieniania ani do wycieku.
