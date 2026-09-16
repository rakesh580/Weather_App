import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiGet, apiStream, ApiError, errorMessage } from './client';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

afterEach(() => vi.restoreAllMocks());

describe('apiGet', () => {
  it('returns parsed JSON and encodes params', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: 1 }));
    const data = await apiGet<{ ok: number }>('/api/x', { q: 'São Paulo' });
    expect(data.ok).toBe(1);
    expect(String(spy.mock.calls[0][0])).toContain('q=S%C3%A3o+Paulo');
  });

  it('surfaces the backend detail on errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ detail: 'OpenWeatherMap is unavailable' }, 502));
    await expect(apiGet('/api/x')).rejects.toMatchObject({ status: 502, message: 'OpenWeatherMap is unavailable' });
  });

  it('rejects legacy 200 {error} bodies', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: 'boom' }));
    await expect(apiGet('/api/x')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('apiStream', () => {
  it('parses SSE frames', async () => {
    const body = 'data: {"context_city":"Seattle"}\n\ndata: {"delta":"Hel"}\n\ndata: {"delta":"lo"}\n\ndata: {"done":true}\n\n';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }));
    const events: unknown[] = [];
    await apiStream('/api/chat/stream', { message: 'hi' }, ev => events.push(ev));
    expect(events).toEqual([{ context_city: 'Seattle' }, { delta: 'Hel' }, { delta: 'lo' }, { done: true }]);
  });
});

describe('errorMessage', () => {
  it('prefers ApiError messages and falls back sensibly', () => {
    expect(errorMessage(new ApiError(429, 'Rate limit exceeded'))).toBe('Rate limit exceeded');
    expect(errorMessage('nope', 'fallback')).toBe('fallback');
  });
});
