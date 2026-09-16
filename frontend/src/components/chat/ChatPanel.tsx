import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { streamChatMessage, sendChatMessage } from '../../api/chat';
import { errorMessage, ApiError } from '../../api/client';
import { useWeather } from '../../hooks/useWeather';
import type { ChatMessage, ChatJourneyContext } from '../../types/chat';
import type { JourneyResponse } from '../../types/journey';
import s from '../../styles/components/chat.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  journeyData: JourneyResponse | null;
}

const SUGGESTIONS = ['Should I bring an umbrella today?', 'What should I wear this evening?', 'Is it safe to drive tonight?', 'Best time for a run tomorrow?'];

let msgSeq = 0;
const nextId = () => `m${Date.now()}-${msgSeq++}`;

export default function ChatPanel({ open, onClose, journeyData }: Props) {
  const { weather } = useWeather();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); abortRef.current?.abort(); };
  }, [open, onClose]);

  const journeyCtx = useCallback((): ChatJourneyContext | null => {
    if (!journeyData) return null;
    return {
      from: journeyData.waypoints[0]?.name ?? '',
      to: journeyData.waypoints[journeyData.waypoints.length - 1]?.name ?? '',
      distance_miles: journeyData.total_distance_miles,
      duration_hours: journeyData.total_duration_hours,
      waypoints: journeyData.waypoints.slice(0, 20).map(w => ({ name: w.name, severity: w.severity, temp: w.weather.temperature, desc: w.weather.description })),
    };
  }, [journeyData]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setMessages(m => [...m, { id: nextId(), text, sender: 'user' }]);
    setInput('');
    setBusy(true);
    const aiId = nextId();
    setMessages(m => [...m, { id: aiId, text: '', sender: 'ai', streaming: true }]);
    const update = (patch: Partial<ChatMessage>) => setMessages(m => m.map(x => (x.id === aiId ? { ...x, ...patch } : x)));

    const req = {
      message: text,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...(weather ? { lat: weather.lat, lon: weather.lon, city: weather.city } : {}),
      journey_context: journeyCtx(),
    };
    const controller = new AbortController();
    abortRef.current = controller;
    let acc = '';
    try {
      await streamChatMessage(req, ev => {
        if (ev.delta) { acc += ev.delta; update({ text: acc }); }
        if (ev.error) update({ text: ev.error, error: true });
      }, controller.signal);
      if (!acc) {
        // Streaming produced nothing (e.g. proxy buffering) — fall back to the JSON endpoint.
        const res = await sendChatMessage(req);
        acc = res.response;
        update({ text: acc });
      }
      update({ streaming: false });
    } catch (e) {
      if (controller.signal.aborted) return;
      const msg = e instanceof ApiError && e.status === 503
        ? 'AI chat is not configured on this server yet.'
        : errorMessage(e, "Sorry, I'm having trouble connecting.");
      update({ text: msg, streaming: false, error: true });
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={s.container}
          role="dialog"
          aria-modal="false"
          aria-label="SkyPulse AI chat"
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className={s.header}>
            <span><i className="fa-solid fa-robot" aria-hidden="true" /> SkyPulse AI{weather ? <span className={s.headerCity}> · {weather.city}</span> : null}</span>
            <button className={s.closeBtn} onClick={onClose} aria-label="Close chat">&times;</button>
          </div>
          <div className={s.messages} ref={msgsRef} aria-live="polite" aria-relevant="additions text">
            {messages.length === 0 && (
              <div className={s.empty}>
                <p>Ask anything about the weather{weather ? ` in ${weather.city}` : ''}{journeyData ? ' or your planned route' : ''}.</p>
                <div className={s.suggestions}>
                  {SUGGESTIONS.map(q => (
                    <button key={q} className={s.suggestion} onClick={() => send(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} className={`${s.message} ${m.sender === 'user' ? s.user : s.ai} ${m.error ? s.messageError : ''}`}>
                {m.text}
                {m.streaming && <span className={s.typingCursor} aria-hidden="true">▍</span>}
              </div>
            ))}
          </div>
          <div className={s.inputArea}>
            <input
              ref={inputRef}
              className={s.input}
              placeholder="Ask about the weather…"
              aria-label="Message"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={busy}
              maxLength={1000}
            />
            <button className={s.sendBtn} onClick={() => send()} disabled={busy || !input.trim()} aria-label="Send message">
              <i className={`fa-solid ${busy ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
