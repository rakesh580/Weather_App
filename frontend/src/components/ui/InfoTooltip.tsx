import { useState } from 'react';
import s from '../../styles/components/tooltip.module.css';

interface Props {
  text: string;
}

export default function InfoTooltip({ text }: Props) {
  const [show, setShow] = useState(false);

  return (
    <span
      className={s.wrapper}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(v => !v)}
    >
      <i className={`fa-solid fa-circle-info ${s.icon}`} />
      {show && (
        <span className={s.bubble}>
          {text}
          <span className={s.arrow} />
        </span>
      )}
    </span>
  );
}
