import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { WeatherProvider, useWeather } from './context/WeatherContext';
import { ToastProvider } from './components/ui/Toast';
import ThemeToggle from './components/layout/ThemeToggle';
import AppHeader from './components/layout/AppHeader';
import AppFooter from './components/layout/AppFooter';
import SearchBar from './components/search/SearchBar';
import FavoritesBar from './components/favorites/FavoritesBar';
import WeatherHero from './components/weather/WeatherHero';
import ComfortScore from './components/weather/ComfortScore';
import WeatherDetails from './components/weather/WeatherDetails';
import ForecastSection from './components/forecast/ForecastSection';
import WeatherMap from './components/map/WeatherMap';
import WelcomeScreen from './components/weather/WelcomeScreen';
import JourneySection from './components/journey/JourneySection';
import ActivityOptimizer from './components/activity/ActivityOptimizer';
import HealthJournal from './components/health/HealthJournal';
import LogisticsOptimizer from './components/logistics/LogisticsOptimizer';
import JourneyFAB from './components/journey/JourneyFAB';
import ChatToggle from './components/chat/ChatToggle';
import ChatPanel from './components/chat/ChatPanel';
import WeatherParticles from './components/effects/WeatherParticles';
import type { JourneyResponse } from './types/journey';

const viewVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -20, filter: 'blur(6px)' },
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  margin: '8px auto 20px',
  width: '60%',
  background: 'linear-gradient(90deg, transparent, var(--section-line-color), transparent)',
};

function AppContent() {
  const { weather, loading } = useWeather();
  const [chatOpen, setChatOpen] = useState(false);
  const [journeyData, setJourneyData] = useState<JourneyResponse | null>(null);
  const [activeView, setActiveView] = useState<'weather' | 'journey' | 'activity' | 'health' | 'logistics'>('weather');

  // No auto-load — always show WelcomeScreen on fresh page load

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <WeatherParticles />
      <ThemeToggle />

      <div id="main-content" style={{ maxWidth: 920, margin: '0 auto', padding: '20px 16px', position: 'relative', zIndex: 1 }}>
        <AppHeader activeView={activeView} onViewChange={setActiveView} />

        <AnimatePresence mode="wait">
          {activeView === 'weather' && (
            <motion.div
              key="weather-view"
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <SearchBar />
              <FavoritesBar />

              {!weather && !loading && <WelcomeScreen />}

              {loading && !weather && (
                <div>
                  <div className="skeleton" style={{ height: 200, marginBottom: 24, borderRadius: 20 }} />
                  <div className="skeleton" style={{ height: 100, marginBottom: 24, borderRadius: 20 }} />
                </div>
              )}

              <AnimatePresence mode="wait">
                {weather && (
                  <motion.div
                    key={weather.city}
                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  >
                    <WeatherHero />
                    <div style={dividerStyle} />
                    <ComfortScore />
                    <div style={dividerStyle} />
                    <WeatherDetails />
                    <div style={dividerStyle} />
                    <ForecastSection />
                    <div style={dividerStyle} />
                    <WeatherMap />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeView === 'journey' && (
            <motion.div
              key="journey-view"
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <JourneySection onJourneyData={setJourneyData} />
            </motion.div>
          )}

          {activeView === 'activity' && (
            <motion.div
              key="activity-view"
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <ActivityOptimizer />
            </motion.div>
          )}

          {activeView === 'health' && (
            <motion.div
              key="health-view"
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <HealthJournal />
            </motion.div>
          )}

          {activeView === 'logistics' && (
            <motion.div
              key="logistics-view"
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <LogisticsOptimizer />
            </motion.div>
          )}
        </AnimatePresence>

        <AppFooter />
      </div>

      <JourneyFAB visible={activeView !== 'journey'} onClick={() => setActiveView('journey')} />
      <ChatToggle onClick={() => setChatOpen(true)} visible={!chatOpen} />
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} journeyData={journeyData} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <WeatherProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </WeatherProvider>
    </ThemeProvider>
  );
}
