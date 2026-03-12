/**
 * Unlisted script injected into the page's main world to capture the JWT.
 *
 * The site authenticates via Keycloak OIDC. The access_token is obtained by
 * intercepting the response from the token endpoint before it is consumed by
 * the page, and dispatching a custom event so the content script can store it.
 *
 * A secondary fallback intercepts outgoing Authorization request headers in
 * case the page ever attaches the token directly to API calls.
 */

const TOKEN_ENDPOINT = "https://login.autodarts.io/realms/autodarts/protocol/openid-connect/token";

export default defineUnlistedScript(() => {
  console.log("[Auth] Starting token capture");

  let lastToken = "";

  function dispatchToken(token: string) {
    if (token === lastToken) return;
    lastToken = token;
    console.log("[Auth] access_token captured / refreshed");
    window.dispatchEvent(new CustomEvent("auth-cookie-available", {
      detail: { authValue: token },
    }));
  }

  // ── Primary: intercept token endpoint response ───────────────────────────
  const originalFetch = window.fetch;
  window.fetch = function (...args: Parameters<typeof window.fetch>) {
    const promise = originalFetch.apply(this, args) as Promise<Response>;

    try {
      const url = args[0] instanceof Request ? args[0].url : String(args[0]);
      if (url.startsWith(TOKEN_ENDPOINT)) {
        return promise.then((response) => {
          // Clone so the page can still consume the original body
          response.clone().json().then((body: { access_token?: string }) => {
            if (body.access_token) {
              dispatchToken(body.access_token);
            }
          }).catch(() => {});
          return response;
        });
      }
    } catch (_) {
      // never block the real request
    }

    return promise;
  };

  // ── Fallback: outgoing Authorization header (e.g. direct API calls) ──────
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string) {
    try {
      if (name.toLowerCase() === "authorization" && value.startsWith("Bearer ")) {
        dispatchToken(value.slice(7));
      }
    } catch (_) {
      // never block the real call
    }
    return originalSetRequestHeader.call(this, name, value);
  };
});
