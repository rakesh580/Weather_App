import { useId, useState } from 'react';
import s from '../../styles/components/tooltip.module.css';

interface Props {
  text: string;
  label?: string;
}

/** Keyboard- and touch-accessible tooltip: a button that toggles a described bubble. */
export default function InfoTooltip({ text, label = 'More information' }: Props) {
  const [show, setShow] = useState(false);
  const id = useId();

  return (
    <span className={s.wrapper} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button
        type="button"
        className={s.trigger}
        aria-label={label}
        aria-describedby={show ? id : undefined}
        aria-expanded={show}
        onClick={() => setShow(v => !v)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onKeyDown={e => { if (e.key === 'Escape') setShow(false); }}
      >
        <i className={`fa-solid fa-circle-info ${s.icon}`} aria-hidden="true" />
      </button>
      {show && (
        <span className={s.bubble} role="tooltip" id={id}>
          {text}
          <span className={s.arrow} aria-hidden="true" />
        </span>
      )}
    </span>
  );
}
