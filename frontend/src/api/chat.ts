import { apiPost } from './client';
import type { ChatRequest, ChatResponse } from '../types/chat';

export function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  return apiPost<ChatResponse>('/api/chat', req);
}
