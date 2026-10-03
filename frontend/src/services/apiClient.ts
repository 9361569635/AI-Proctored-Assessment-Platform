const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
 
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}
 
interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown; // plain object → JSON; FormData → sent as-is (file uploads)
  /** Internal — prevents infinite refresh loops. */
  _isRetry?: boolean;
}
 
async function rawRequest(path: string, opts: RequestOptions): Promise<Response> {
  const isFormData = opts.body instanceof FormData;
  return fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    credentials: "include", // send/receive the httpOnly auth cookies
    headers: isFormData ? undefined : { "content-type": "application/json" },
    body: opts.body === undefined ? undefined : isFormData ? (opts.body as FormData) : JSON.stringify(opts.body),
  });
}
 
async function requestWithRefresh(path: string, opts: RequestOptions): Promise<Response> {
  let response = await rawRequest(path, opts);
 
  // A single silent-refresh-and-retry: an expired 15-minute access token
  // shouldn't force a full re-login while the 7-day refresh token is still
  // valid. Never retries the refresh call itself or an already-retried call.
  if (response.status === 401 && !opts._isRetry && path !== "/auth/refresh") {
    const refreshed = await rawRequest("/auth/refresh", { method: "POST" });
    if (refreshed.ok) {
      response = await rawRequest(path, opts);
    }
  }
 
  return response;
}
 
async function throwForError(response: Response): Promise<never> {
  let message = `Request failed (${response.status})`;
  let details: unknown;
  try {
    const body = await response.json();
    message = body?.error?.message ?? message;
    details = body?.error?.details;
  } catch {
    // non-JSON error body — keep the generic message
  }
  throw new ApiClientError(message, response.status, details);
}
 
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const response = await requestWithRefresh(path, opts);
 
  if (!response.ok) {
    await throwForError(response);
  }
 
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
 
/**
 * Same auth/cookie/refresh handling as apiFetch, but for binary responses
 * (e.g. audio prompt playback) instead of JSON. Used with
 * `URL.createObjectURL` on the caller's side to play/display the content
 * without ever routing it through JSON parsing.
 */
export async function apiFetchBlob(path: string, opts: RequestOptions = {}): Promise<Blob> {
  const response = await requestWithRefresh(path, opts);
 
  if (!response.ok) {
    await throwForError(response);
  }
 
  return response.blob();
}
 