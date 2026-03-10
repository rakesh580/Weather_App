import { motion } from 'framer-motion';
import SkyPulseLogo from './SkyPulseLogo';
import s from '../../styles/components/header.module.css';

interface Props {
  activeView: 'weather' | 'journey' | 'activity' | 'health' | 'logistics';
  onViewChange: (view: 'weather' | 'journey' | 'activity' | 'health' | 'logistics') => void;
}

const tabs = [
  { key: 'weather' as const, label: 'Weather', icon: 'fa-solid fa-cloud-sun' },
  { key: 'journey' as const, label: 'Journey', icon: 'fa-solid fa-road' },
  { key: 'activity' as const, label: 'Activity', icon: 'fa-solid fa-person-running' },
  { key: 'health' as const, label: 'Health', icon: 'fa-solid fa-heart-pulse' },
  { key: 'logistics' as const, label: 'Logistics', icon: 'fa-solid fa-truck-fast' },
];

export default function AppHeader({ activeView, onViewChange }: Props) {
  return (
    <header className={s.header}>
      <h1 className={s.title}>
        <SkyPulseLogo size={30} /> SkyPulse
      </h1>
      <p className={s.subtitle}>Real-time weather, worldwide</p>
      <nav className={s.navTabs}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`${s.navTab} ${activeView === tab.key ? s.navTabActive : ''}`}
            onClick={() => onViewChange(tab.key)}
          >
            <i className={tab.icon} /> {tab.label}
            {activeView === tab.key && (
              <motion.div
                className={s.navIndicator}
                layoutId="nav-indicator"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </nav>
    </header>
  );
}
