import { apiPost, apiStream, type StreamEvent } from './client';
import type { ChatRequest, ChatResponse } from '../types/chat';

export function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  return apiPost<ChatResponse>('/api/chat', req);
}

export function streamChatMessage(req: ChatRequest, onEvent: (ev: StreamEvent) => void, signal?: AbortSignal): Promise<void> {
  return apiStream('/api/chat/stream', req, onEvent, signal);
}
