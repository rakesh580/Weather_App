import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendChatMessage } from '../../api/chat';
import type { ChatMessage } from '../../types/chat';
import type { JourneyResponse } from '../../types/journey';
import s from '../../styles/components/chat.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  journeyData: JourneyResponse | null;
}

export default function ChatPanel({ open, onClose, journeyData }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages, typing]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setMessages(m => [...m, { text, sender: 'user' }]);
    setInput('');
    setTyping(true);

    try {
      const journeyCtx = journeyData ? {
        from: journeyData.waypoints[0]?.name ?? '',
        to: journeyData.waypoints[journeyData.waypoints.length - 1]?.name ?? '',
        distance_miles: journeyData.total_distance_miles,
        duration_hours: journeyData.total_duration_hours,
        waypoints: journeyData.waypoints.map(w => ({
          name: w.name, severity: w.severity,
          temp: w.weather.temperature, desc: w.weather.description,
        })),
      } : null;

      const res = await sendChatMessage({ message: text, timezone: 'America/New_York', journey_context: journeyCtx });
      setMessages(m => [...m, { text: res.response, sender: 'ai' }]);
    } catch {
      setMessages(m => [...m, { text: "Sorry, I'm having trouble connecting.", sender: 'ai' }]);
    } finally {
      setTyping(false);
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
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className={s.header}>
            <span><i className="fa-solid fa-robot" /> SkyPulse AI</span>
            <button className={s.closeBtn} onClick={onClose}>&times;</button>
          </div>
          <div className={s.messages} ref={msgsRef}>
            {messages.map((m, i) => (
              <div key={i} className={`${s.message} ${m.sender === 'user' ? s.user : s.ai}`}>
                {m.text}
              </div>
            ))}
            {typing && (
              <div className={s.typing}>
                <span className={s.typingCursor}>_</span>
              </div>
            )}
          </div>
          <div className={s.inputArea}>
            <input
              className={s.input}
              placeholder="Ask about weather..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button className={s.sendBtn} onClick={send}>
              <i className="fa-solid fa-paper-plane" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
