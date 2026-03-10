import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import s from '../../styles/components/header.module.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className={s.toggle} onClick={toggleTheme} aria-label="Toggle theme">
      <motion.i
        key={theme}
        className={theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </button>
  );
}
