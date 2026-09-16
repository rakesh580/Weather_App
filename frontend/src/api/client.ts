/**
 * Thin fetch wrapper shared by every API module.
 * - Throws ApiError with the backend's `detail` message (never a 200 `{error}` body)
 * - Supports AbortSignal (TanStack Query passes one) and a default timeout
 * - Sends X-API-Key when VITE_SKYPULSE_API_KEY is configured
 * - apiStream consumes Server-Sent Events from POST endpoints
 */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const API_KEY = import.meta.env.VITE_SKYPULSE_API_KEY as string | undefined;
const DEFAULT_TIMEOUT_MS = 20_000;

function baseHeaders(extra?: Record<string, string>): Record<string, string> {
  return { ...(API_KEY ? { 'X-API-Key': API_KEY } : {}), ...(extra ?? {}) };
}

function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), ms);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  return controller.signal;
}

async function parseError(res: Response): Promise<ApiError> {
  let detail = `Request failed (${res.status})`;
  try {
    const data = await res.json();
    if (typeof data?.detail === 'string') detail = data.detail;
    else if (Array.isArray(data?.detail)) detail = data.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join('; ') || detail;
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(res.status, detail);
}

async function parseJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new ApiError(res.status, `Unexpected response type: ${ct || 'unknown'}`);
  const data = await res.json();
  if (data && typeof data === 'object' && 'error' in data && Object.keys(data).length === 1) {
    throw new ApiError(res.status, String((data as { error: unknown }).error));
  }
  return data as T;
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function apiGet<T>(path: string, params?: Record<string, string>, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: baseHeaders(),
    signal: withTimeout(opts.signal, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });
  if (!res.ok) throw await parseError(res);
  return parseJson<T>(res);
}

export async function apiPost<T>(path: string, body: unknown, opts: RequestOptions = {}): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: baseHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
    signal: withTimeout(opts.signal, opts.timeoutMs ?? 45_000),
  });
  if (!res.ok) throw await parseError(res);
  return parseJson<T>(res);
}

export interface StreamEvent {
  delta?: string;
  done?: boolean;
  error?: string;
  context_city?: string | null;
}

/** POST and read a text/event-stream response, invoking onEvent per `data:` line. */
export async function apiStream(path: string, body: unknown, onEvent: (ev: StreamEvent) => void, signal?: AbortSignal): Promise<void> {
  const res = await fetch(path, {
    method: 'POST',
    headers: baseHeaders({ 'Content-Type': 'application/json', Accept: 'text/event-stream' }),
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw await parseError(res);
  if (!res.body) throw new ApiError(res.status, 'Streaming not supported');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue;
        try {
          onEvent(JSON.parse(line.slice(5).trim()) as StreamEvent);
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  }
}

export function errorMessage(e: unknown, fallback = 'Something went wrong'): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof DOMException && e.name === 'TimeoutError') return 'The request timed out. Please try again.';
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}
