import s from '../../styles/components/chat.module.css';

interface Props { onClick: () => void; visible: boolean; }

export default function ChatToggle({ onClick, visible }: Props) {
  if (!visible) return null;
  return (
    <button className={s.toggleBtn} onClick={onClick} aria-label="Open chat">
      <i className="fa-solid fa-comment" />
    </button>
  );
}
