# ADR 0002: Provider-agnostic LLM access via OpenAI-compatible endpoints

**Status:** accepted · **Date:** 2026-09-16

## Context
v1 depended on `huggingface_hub` and the free serverless Inference API. By 2026 HF routes chat
models through paid Inference Providers with a $0.10/month free credit, so the chat feature
effectively stopped working on a free key.

## Decision
`app/services/ai.py` speaks the OpenAI chat-completions wire format over the shared httpx client
and resolves a provider from settings: Groq (recommended free tier), OpenRouter, the Hugging Face
router, or any custom base URL (Ollama, LM Studio, OpenAI). Streaming uses the standard SSE format.

## Consequences
* No SDK dependency; swapping providers is a config change.
* The UI checks `/api/health` → `providers.ai` and hides AI features when nothing is configured.
* Prompt-injection defences live in one place (system prompt + input sanitisation + bounded context).
