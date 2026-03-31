# Authentifizierungs-Änderungen (v2.2.5 → v2.2.7)

## Zusammenfassung

Ab Version 2.2.6 wurde der gesamte Authentifizierungsmechanismus grundlegend umgebaut. Der alte Ansatz las ein `Authorization`-Cookie aus dem Browser aus. Der neue Ansatz fängt stattdessen den JWT-Token direkt aus der Keycloak-OIDC-Token-Response ab, indem `window.fetch` überschrieben wird.

---

## Was hat sich geändert?

### 1. Token-Erfassung (`entrypoints/auth-cookie.ts`)

| Aspekt | Alt (≤ v2.2.5) | Neu (≥ v2.2.6) |
|---|---|---|
| **Methode** | Liest `document.cookie` nach einem Cookie namens `Authorization=` aus | Überschreibt `window.fetch` und fängt die Antwort des Keycloak-Token-Endpoints ab |
| **Token-Quelle** | Browser-Cookie | JSON-Response von `https://login.autodarts.io/realms/autodarts/protocol/openid-connect/token` → Feld `access_token` |
| **Fallback** | Keiner | Überschreibt zusätzlich `XMLHttpRequest.prototype.setRequestHeader` und extrahiert den Token aus ausgehenden `Authorization: Bearer ...`-Headern |
| **Deduplizierung** | Keine – Event wurde jedes Mal gefeuert | Token wird nur dispatcht, wenn er sich tatsächlich geändert hat (`lastToken`-Vergleich) |
| **Token-Refresh** | Nicht unterstützt – nur einmaliges Auslesen beim Laden | Automatisch – jeder neue Token-Endpoint-Response wird abgefangen, auch Token-Refreshes |
| **Custom Event** | `auth-cookie-available` mit `{ authValue }` | Gleiches Event, gleiche Struktur – abwärtskompatibel |

#### Alter Code (vereinfacht):
```ts
const authCookie = document.cookie
  .split("; ")
  .find(row => row.startsWith("Authorization="));
const authValue = authCookie.split("=")[1];
window.dispatchEvent(new CustomEvent("auth-cookie-available", {
  detail: { authValue },
}));
```

#### Neuer Code (vereinfacht):
```ts
const TOKEN_ENDPOINT = "https://login.autodarts.io/realms/autodarts/protocol/openid-connect/token";

const originalFetch = window.fetch;
window.fetch = function (...args) {
  const promise = originalFetch.apply(this, args);
  const url = args[0] instanceof Request ? args[0].url : String(args[0]);
  if (url.startsWith(TOKEN_ENDPOINT)) {
    return promise.then((response) => {
      response.clone().json().then((body) => {
        if (body.access_token) dispatchToken(body.access_token);
      });
      return response;
    });
  }
  return promise;
};
```

### 2. API-Aufrufe – Authorization-Header (`utils/helpers.ts`)

| Aspekt | Alt (≤ v2.2.5) | Neu (≥ v2.2.6) |
|---|---|---|
| **Header** | `Cookie: Authorization=<token>` | `Authorization: Bearer <token>` |
| **Credentials** | `credentials: "include"` wurde gesetzt | Entfernt – nicht mehr nötig |

#### Alter Code:
```ts
headers.set("Cookie", `Authorization=${token}`);
return fetch(url, { ...options, headers, credentials: "include" });
```

#### Neuer Code:
```ts
headers.set("Authorization", `Bearer ${token}`);
return fetch(url, { ...options, headers });
```

### 3. Quick Correction API-Aufrufe (`entrypoints/match.content/QuickCorrection.vue`)

Alle direkten `fetch`-Aufrufe an die Autodarts-API verwendeten den Token ohne `Bearer`-Prefix:

```ts
// Alt:
"Authorization": await getAuthToken()

// Neu:
"Authorization": `Bearer ${await getAuthToken()}`
```

Dies betrifft **9 Stellen** in der Datei, an denen API-Requests für Wurf-Aktivierung, Wurf-Korrektur und Wurf-Deaktivierung gesendet werden.

### 4. Extension-Manifest (`wxt.config.ts`)

**In v2.2.6 hinzugefügt:**
- `*://login.autodarts.io/*` bei `host_permissions` (um den Token-Endpoint abfangen zu können)
- `cookies` bei `permissions`

**In v2.2.7 wieder entfernt:**
- Beide Einträge wurden wieder entfernt, da sie für den fetch-Intercept-Ansatz nicht benötigt werden (das Script läuft in der Main World der Seite selbst)

---

## Warum wurde das geändert?

1. **Cookie war unzuverlässig** – Autodarts hat offenbar aufgehört, den Token als `Authorization`-Cookie zu setzen, oder die Cookie-Verfügbarkeit war je nach Browser/Plattform inkonsistent.
2. **Korrekte HTTP-Authentifizierung** – Der `Authorization: Bearer <token>`-Header ist der OAuth2/OIDC-Standard. Das alte Setzen eines `Cookie`-Headers in einem `fetch`-Aufruf war ein Workaround, der in manchen Browsern durch CORS-Restrictions blockiert werden konnte.
3. **Automatischer Token-Refresh** – Da jetzt der Token-Endpoint abgefangen wird, bekommt die Extension automatisch jeden neuen Token mit, auch nach einem Token-Refresh durch Keycloak.

---

## Anpassungsanleitung für andere Projekte

Wenn du ein eigenes Projekt hast, das auf den Autodarts-Auth-Token zugreift, musst du folgende Änderungen vornehmen:

### Schritt 1: Token-Erfassung umstellen

Statt Cookies auszulesen, fange den Keycloak-Token-Endpoint ab:

```ts
const TOKEN_ENDPOINT = "https://login.autodarts.io/realms/autodarts/protocol/openid-connect/token";

const originalFetch = window.fetch;
window.fetch = function (...args) {
  const promise = originalFetch.apply(this, args);
  try {
    const url = args[0] instanceof Request ? args[0].url : String(args[0]);
    if (url.startsWith(TOKEN_ENDPOINT)) {
      return promise.then((response) => {
        response.clone().json().then((body) => {
          if (body.access_token) {
            // Hier deinen Token speichern
            myTokenStorage = body.access_token;
          }
        }).catch(() => {});
        return response;
      });
    }
  } catch (_) {}
  return promise;
};
```

**Wichtig:** Das Script muss in der **Main World** der Seite laufen (nicht in der isolierten Content-Script-Welt), damit es `window.fetch` der Seite überschreiben kann. In WXT/Chrome-Extensions geschieht das über ein `unlisted script`, das per `<script>`-Tag injiziert wird.

### Schritt 2: API-Aufrufe anpassen

Ersetze alle API-Aufrufe, die den Token verwenden:

```ts
// Alt – NICHT MEHR VERWENDEN:
headers.set("Cookie", `Authorization=${token}`);
fetch(url, { credentials: "include", headers });

// Neu – korrekter OAuth2-Standard:
headers.set("Authorization", `Bearer ${token}`);
fetch(url, { headers });
```

### Schritt 3: Bestehende Token-Nutzung prüfen

Falls du den Token direkt (ohne `Bearer`-Prefix) im `Authorization`-Header sendest, füge das Prefix hinzu:

```ts
// Alt:
"Authorization": token

// Neu:
"Authorization": `Bearer ${token}`
```

### Schritt 4: Cookie-Permissions entfernen (falls vorhanden)

Die `cookies`-Permission und `*://login.autodarts.io/*` Host-Permission werden nicht mehr benötigt und können aus dem Manifest entfernt werden.

### Optional: XHR-Fallback

Als zusätzliche Absicherung kann man auch ausgehende XHR-Requests abfangen:

```ts
const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
  if (name.toLowerCase() === "authorization" && value.startsWith("Bearer ")) {
    myTokenStorage = value.slice(7); // "Bearer " entfernen
  }
  return originalSetRequestHeader.call(this, name, value);
};
```

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `entrypoints/auth-cookie.ts` | Komplett neu geschrieben – fetch-Intercept statt Cookie-Auslesen |
| `utils/helpers.ts` | `fetchWithAuth` nutzt jetzt `Authorization: Bearer` statt `Cookie`-Header |
| `entrypoints/match.content/QuickCorrection.vue` | `Bearer`-Prefix an 9 Stellen hinzugefügt |
| `wxt.config.ts` | v2.2.6: Permissions hinzugefügt → v2.2.7: wieder entfernt |
