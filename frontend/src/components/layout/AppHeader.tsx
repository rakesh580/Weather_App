import { motion } from 'framer-motion';
import SkyPulseLogo from './SkyPulseLogo';
import s from '../../styles/components/header.module.css';

export type View = 'weather' | 'journey' | 'activity' | 'health' | 'logistics';

interface Props {
  activeView: View;
  onViewChange: (view: View) => void;
}

const tabs: { key: View; label: string; icon: string }[] = [
  { key: 'weather', label: 'Weather', icon: 'fa-solid fa-cloud-sun' },
  { key: 'journey', label: 'Journey', icon: 'fa-solid fa-road' },
  { key: 'activity', label: 'Activity', icon: 'fa-solid fa-person-running' },
  { key: 'health', label: 'Health', icon: 'fa-solid fa-heart-pulse' },
  { key: 'logistics', label: 'Logistics', icon: 'fa-solid fa-truck-fast' },
];

export default function AppHeader({ activeView, onViewChange }: Props) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = tabs.findIndex(t => t.key === activeView);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      onViewChange(next.key);
      document.getElementById(`tab-${next.key}`)?.focus();
    }
  };

  return (
    <header className={s.header}>
      <h1 className={s.title}>
        <SkyPulseLogo size={30} /> SkyPulse
      </h1>
      <p className={s.subtitle}>Weather intelligence, worldwide</p>
      <nav aria-label="Sections">
        <div className={s.navTabs} role="tablist" onKeyDown={onKeyDown}>
          {tabs.map(tab => {
            const active = activeView === tab.key;
            return (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${tab.key}`}
                tabIndex={active ? 0 : -1}
                className={`${s.navTab} ${active ? s.navTabActive : ''}`}
                onClick={() => onViewChange(tab.key)}
              >
                <i className={tab.icon} aria-hidden="true" /> <span>{tab.label}</span>
                {active && (
                  <motion.div
                    className={s.navIndicator}
                    layoutId="nav-indicator"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
