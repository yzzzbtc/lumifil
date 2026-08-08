/* =====================================================================
   worker.js — pośrednik OAuth dla panelu Decap CMS (lumifil.org/admin).

   Po co to jest:
   GitHub wymaga przy logowaniu OAuth tzw. "client secret". Sekretu nie da
   się trzymać w przeglądarce, bo każdy mógłby go odczytać. Ten worker jest
   jedynym miejscem, gdzie sekret istnieje — przyjmuje kod od GitHuba,
   wymienia go na token i oddaje panelowi.

   Endpointy:
     GET /auth      -> przekierowanie na ekran logowania GitHuba
     GET /callback  -> odbiór kodu, wymiana na token, przekazanie do panelu
     GET /          -> informacja, że worker żyje (do sprawdzenia w przeglądarce)

   Wymagane zmienne środowiskowe (Secrets w Cloudflare):
     GITHUB_CLIENT_ID
     GITHUB_CLIENT_SECRET
   Opcjonalne:
     ALLOWED_ORIGIN  (domyślnie https://lumifil.org)
   ===================================================================== */

const DEFAULT_ORIGIN = 'https://lumifil.org';

/* Panel odbiera wynik przez postMessage z okna popup. Uzgadnianie jest
   narzucone przez Decap CMS i ma dwa kroki:
     1. popup ogłasza "authorizing:github",
     2. panel odpowiada, a dopiero wtedy popup odsyła token.
   Dzięki temu token nie wychodzi, zanim panel zacznie nasłuchiwać.
   Odpowiadamy wyłącznie na wiadomość z dozwolonego origin — inaczej dowolna
   strona mogłaby odezwać się do popupu i przechwycić token. */
function resultPage(status, payload, origin) {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><title>Logowanie…</title></head>
<body>
<p>Trwa logowanie… To okno zamknie się samo.</p>
<script>
  (function () {
    var message = ${JSON.stringify(message)};
    var allowed = ${JSON.stringify(origin)};
    if (!window.opener) { document.body.textContent = 'Otwórz panel ponownie.'; return; }

    function onMessage(e) {
      if (e.origin !== allowed) return;          // nie odsyłaj tokenu obcym
      window.removeEventListener('message', onMessage, false);
      window.opener.postMessage(message, allowed);
      setTimeout(function () { window.close(); }, 800);
    }
    window.addEventListener('message', onMessage, false);

    // Krok 1: przedstaw się. "*" jest tu bezpieczne — to sam komunikat
    // startowy, bez tokenu.
    window.opener.postMessage('authorizing:github', '*');
  })();
</script>
</body>
</html>`;
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN || DEFAULT_ORIGIN;

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      return html('<h1>Brak konfiguracji</h1><p>Ustaw sekrety GITHUB_CLIENT_ID i GITHUB_CLIENT_SECRET.</p>', 500);
    }

    // --- start logowania -------------------------------------------------
    if (url.pathname === '/auth') {
      // state chroni przed CSRF — wracamy do niego w /callback
      const state = crypto.randomUUID();
      const redirect = new URL('https://github.com/login/oauth/authorize');
      redirect.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      redirect.searchParams.set('scope', 'repo,user');
      redirect.searchParams.set('state', state);
      redirect.searchParams.set('redirect_uri', `${url.origin}/callback`);

      return new Response(null, {
        status: 302,
        headers: {
          Location: redirect.toString(),
          'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
        },
      });
    }

    // --- powrót z GitHuba ------------------------------------------------
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const cookie = request.headers.get('Cookie') || '';
      const expected = (cookie.match(/oauth_state=([^;]+)/) || [])[1];

      if (!code) return html(resultPage('error', { message: 'Brak kodu autoryzacji.' }, origin), 400);
      if (!state || !expected || state !== expected) {
        return html(resultPage('error', { message: 'Nieprawidłowy state — spróbuj zalogować się ponownie.' }, origin), 400);
      }

      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${url.origin}/callback`,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error || !data.access_token) {
        return html(resultPage('error', { message: data.error_description || 'Wymiana kodu na token nie powiodła się.' }, origin), 400);
      }

      return html(resultPage('success', { token: data.access_token, provider: 'github' }, origin));
    }

    // --- sprawdzenie, czy worker działa ----------------------------------
    return html(`<h1>OAuth proxy LUMIFIL</h1>
<p>Worker działa. Panel: <a href="${origin}/admin/">${origin}/admin/</a></p>
<p>Endpointy: <code>/auth</code>, <code>/callback</code></p>`);
  },
};
