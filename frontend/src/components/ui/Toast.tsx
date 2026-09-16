import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContext, type ToastType } from '../../context/toast';
import s from '../../styles/components/toast.module.css';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const icons: Record<ToastType, string> = {
  success: 'fa-solid fa-circle-check',
  error: 'fa-solid fa-circle-exclamation',
  info: 'fa-solid fa-circle-info',
};

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setToasts(prev => prev.filter(x => x.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts(prev => [...prev.slice(-3), { id, message, type }]);
    const ttl = type === 'error' ? 6000 : 3500;
    timers.current.set(id, setTimeout(() => dismiss(id), ttl));
  }, [dismiss]);

  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach(clearTimeout); map.clear(); };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className={s.toastContainer} role="status" aria-live="polite" aria-atomic="false">
          <AnimatePresence>
            {toasts.map(t => (
              <motion.div
                key={t.id}
                className={`${s.toast} ${s[`toast${t.type.charAt(0).toUpperCase() + t.type.slice(1)}`]}`}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.25 }}
              >
                <i className={`${icons[t.type]} ${s.toastIcon}`} aria-hidden="true" />
                <span className={s.toastMessage}>{t.message}</span>
                <button className={s.toastClose} onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
                <div className={s.toastProgress} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
