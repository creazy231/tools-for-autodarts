/**
 * Unlisted script injected into the page's main world to capture the JWT.
 *
 * The extension does not perform its own login — it piggybacks on the
 * autodarts.com page, capturing the access_token the page itself obtains so the
 * extension can make authenticated API calls (e.g. match corrections).
 *
 * As of the June 2026 auth migration, Autodarts moved off Keycloak to a new
 * OAuth 2.0 server (https://api.autodarts.com) using the Authorization Code +
 * PKCE flow. The page exchanges the auth code at `/auth/v1/exchange` and
 * refreshes at `/auth/v1/refresh`; access tokens now live only ~15 minutes.
 *
 * Two complementary capture mechanisms keep us resilient to that change:
 *
 *  1. Token-endpoint response capture — read `access_token` from the response
 *     of the known token-issuing endpoints. Gives us the token the moment it
 *     is issued.
 *
 *  2. Outgoing `Authorization: Bearer` capture — read the bearer token from any
 *     outgoing request the page makes (both fetch and XHR). This is
 *     endpoint-agnostic, so it keeps working regardless of which auth server is
 *     in use, and naturally tracks refreshes given the short 15-minute lifetime.
 */

// Token-issuing endpoints whose JSON response contains an `access_token`.
const TOKEN_ENDPOINTS = [
  // OAuth 2.0 server (Authorization Code + PKCE)
  "https://api.autodarts.com/auth/v1/exchange",
  "https://api.autodarts.com/auth/v1/refresh",
  "https://api.autodarts.com/auth/v1/token",
  "https://api.autodarts.com/auth/v1/device/token",
];

function isTokenEndpoint(url: string): boolean {
  return TOKEN_ENDPOINTS.some(endpoint => url.startsWith(endpoint));
}

export default defineUnlistedScript(() => {
  console.log("[Auth] Starting token capture");

  let lastToken = "";

  function dispatchToken(token: string) {
    if (!token || token === lastToken) return;
    lastToken = token;
    console.log("[Auth] access_token captured / refreshed");
    window.dispatchEvent(new CustomEvent("auth-cookie-available", {
      detail: { authValue: token },
    }));
  }

  // Pull a "Bearer <token>" value out of whatever headers shape a request uses.
  function bearerFromHeaders(headers: HeadersInit | undefined): string | null {
    if (!headers) return null;
    let value: string | null = null;
    try {
      if (headers instanceof Headers) {
        value = headers.get("authorization");
      } else if (Array.isArray(headers)) {
        const entry = headers.find(([ name ]) => name.toLowerCase() === "authorization");
        value = entry ? entry[1] : null;
      } else {
        const key = Object.keys(headers).find(name => name.toLowerCase() === "authorization");
        value = key ? (headers as Record<string, string>)[key] : null;
      }
    } catch (_) {
      return null;
    }
    // The auth scheme is case-insensitive per RFC 7235
    return value && /^Bearer /i.test(value) ? value.slice(7) : null;
  }

  // ── fetch: capture token-endpoint responses + outgoing Authorization ──────
  const originalFetch = window.fetch;
  window.fetch = function (...args: Parameters<typeof window.fetch>) {
    try {
      // Outgoing Authorization header on any request (endpoint-agnostic).
      const request = args[0];
      if (request instanceof Request) {
        const token = bearerFromHeaders(request.headers);
        if (token) dispatchToken(token);
      } else {
        const token = bearerFromHeaders(args[1]?.headers);
        if (token) dispatchToken(token);
      }
    } catch (_) {
      // never block the real request
    }

    const promise = originalFetch.apply(this, args) as Promise<Response>;

    try {
      const url = args[0] instanceof Request ? args[0].url : String(args[0]);
      if (isTokenEndpoint(url)) {
        return promise.then((response) => {
          try {
            // Clone so the page can still consume the original body
            response.clone().json().then((body: { access_token?: string }) => {
              if (body.access_token) {
                dispatchToken(body.access_token);
              }
            }).catch(() => {});
          } catch (_) {
            // never let token capture affect the response the page observes
          }
          return response;
        });
      }
    } catch (_) {
      // never block the real request
    }

    return promise;
  };

  // ── XHR: capture outgoing Authorization header (fallback) ─────────────────
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string) {
    try {
      if (name.toLowerCase() === "authorization" && /^Bearer /i.test(value)) {
        dispatchToken(value.slice(7));
      }
    } catch (_) {
      // never block the real call
    }
    return originalSetRequestHeader.call(this, name, value);
  };
});
