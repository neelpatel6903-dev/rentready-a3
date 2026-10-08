/**
 * client.js
 * The ONLY way the React app talks to the backend: same-origin fetch() calls
 * under /api. The browser never sees Supabase keys or URLs — it only ever
 * holds this app's own access token, read from sessionStorage and sent as an
 * Authorization: Bearer header.
 *
 * Every non-2xx response becomes an ApiError carrying:
 *  - status: HTTP status (0 when the network request itself failed)
 *  - message: a plain-language string safe to show users
 *  - fields: optional { field: message } map from server-side validation
 */
const TOKEN_KEY = 'rentready_token';

export class ApiError extends Error {
  constructor(status, message, fields = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

/** The signed-in user's access token, if any (sessionStorage = per-tab). */
export function getToken() {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* private mode — the session just won't survive a refresh */
  }
}

export function clearToken() {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Extract message + field errors from a FastAPI error body. */
function toApiError(status, body) {
  const detail = body?.detail ?? body?.message;
  if (detail && typeof detail === 'object') {
    const message = Object.values(detail)[0] || 'Please check the form and try again.';
    return new ApiError(status, String(message), detail);
  }
  if (typeof detail === 'string' && detail) {
    return new ApiError(status, detail);
  }
  return new ApiError(status, 'Something went wrong. Please try again.');
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server — check your connection and try again.');
  }

  // An expired/invalid token on any protected route ends the session; the
  // auth hook listens for this and drops back to the login screen.
  if (response.status === 401 && !path.startsWith('/api/auth/')) {
    clearToken();
    window.dispatchEvent(new Event('rentready:session-expired'));
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) throw toApiError(response.status, parsed);
  return parsed;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};