import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import s from '../../styles/components/journey.module.css';

interface Props {
  visible: boolean;
  onClick: () => void;
}

export default function JourneyFAB({ visible, onClick }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          className={s.fab}
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          initial={{ opacity: 0, scale: 0, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0, y: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <i className="fa-solid fa-road" />
          <AnimatePresence>
            {hovered && (
              <motion.span
                className={s.fabTooltip}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
              >
                Plan a Trip
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
