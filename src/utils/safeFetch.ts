/**
 * Utility to safely fetch and parse JSON responses.
 * Prevents "Unexpected token '<', "<!DOCTYPE "... is not valid JSON" crashes 
 * when an endpoint or dev proxy returns an HTML page or 502/504 fallback.
 */
export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    const isJsonLikely =
      contentType.includes('application/json') ||
      text.trim().startsWith('{') ||
      text.trim().startsWith('[');

    if (isJsonLikely) {
      try {
        const json = JSON.parse(text);
        return {
          ok: res.ok,
          status: res.status,
          data: json,
          error: !res.ok ? (json.error || `HTTP ${res.status}`) : undefined
        };
      } catch {
        return {
          ok: false,
          status: res.status,
          error: 'Server returned invalid JSON response'
        };
      }
    }

    // Server returned HTML (e.g. 404/500/SPA fallback)
    return {
      ok: false,
      status: res.status,
      error: res.ok ? 'Unexpected response format' : `Server error (HTTP ${res.status})`
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : 'Network error'
    };
  }
}
