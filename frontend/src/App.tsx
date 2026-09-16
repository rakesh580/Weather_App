import { useState, lazy, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { WeatherProvider } from './context/WeatherContext';
import { locationKey } from './utils/location';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ThemeToggle from './components/layout/ThemeToggle';
import AppHeader, { type View } from './components/layout/AppHeader';
import AppFooter from './components/layout/AppFooter';
import SearchBar from './components/search/SearchBar';
import FavoritesBar from './components/favorites/FavoritesBar';
import WeatherHero from './components/weather/WeatherHero';
import ComfortScore from './components/weather/ComfortScore';
import WeatherDetails from './components/weather/WeatherDetails';
import ForecastSection from './components/forecast/ForecastSection';
import HourlyForecast from './components/hourly/HourlyForecast';
import AlertsBanner from './components/alerts/AlertsBanner';
import DailyBriefing from './components/briefing/DailyBriefing';
import WelcomeScreen from './components/weather/WelcomeScreen';
import JourneyFAB from './components/journey/JourneyFAB';
import ChatToggle from './components/chat/ChatToggle';
import WeatherParticles from './components/effects/WeatherParticles';
import { useWeather } from './hooks/useWeather';
import type { JourneyResponse } from './types/journey';

// Heavy, tab-scoped views are code-split so the weather view stays light.
const WeatherMap = lazy(() => import('./components/map/WeatherMap'));
const JourneySection = lazy(() => import('./components/journey/JourneySection'));
const ActivityOptimizer = lazy(() => import('./components/activity/ActivityOptimizer'));
const HealthJournal = lazy(() => import('./components/health/HealthJournal'));
const LogisticsOptimizer = lazy(() => import('./components/logistics/LogisticsOptimizer'));
const ChatPanel = lazy(() => import('./components/chat/ChatPanel'));

const viewVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  margin: '8px auto 20px',
  width: '60%',
  background: 'linear-gradient(90deg, transparent, var(--section-line-color), transparent)',
};

function ViewFallback() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ height: 160, marginBottom: 16, borderRadius: 20 }} />
      <div className="skeleton" style={{ height: 240, borderRadius: 20 }} />
    </div>
  );
}

function WeatherView() {
  const { weather, location, loading, error, refresh, clearLocation } = useWeather();
  return (
    <>
      <SearchBar />
      <FavoritesBar />

      {!location && <WelcomeScreen />}

      {location && error && !weather && (
        <div role="alert" className="glass-card" style={{ textAlign: 'center', marginBottom: 24 }}>
          <i className="fa-solid fa-cloud-bolt" aria-hidden="true" style={{ fontSize: '2rem', color: 'var(--accent)', marginBottom: 10 }} />
          <h2 style={{ fontSize: '1.1rem', marginBottom: 6 }}>Couldn't load the weather{location.name ? ` for ${location.name}` : ''}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>{error}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={refresh} style={{ padding: '10px 20px', borderRadius: 999, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              <i className="fa-solid fa-arrows-rotate" aria-hidden="true" /> Try again
            </button>
            <button onClick={clearLocation} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
              Choose another city
            </button>
          </div>
        </div>
      )}

      {location && loading && !weather && (
        <div aria-busy="true" aria-label="Loading weather">
          <div className="skeleton" style={{ height: 200, marginBottom: 24, borderRadius: 20 }} />
          <div className="skeleton" style={{ height: 150, marginBottom: 24, borderRadius: 20 }} />
          <div className="skeleton" style={{ height: 100, marginBottom: 24, borderRadius: 20 }} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {weather && (
          <motion.div
            key={locationKey(location)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <AlertsBanner />
            <WeatherHero />
            <ErrorBoundary label="AI briefing"><DailyBriefing /></ErrorBoundary>
            <ErrorBoundary label="hourly forecast"><HourlyForecast /></ErrorBoundary>
            <div style={dividerStyle} />
            <ComfortScore />
            <div style={dividerStyle} />
            <WeatherDetails />
            <div style={dividerStyle} />
            <ForecastSection />
            <div style={dividerStyle} />
            <ErrorBoundary label="map">
              <Suspense fallback={<div className="skeleton" style={{ height: 300, borderRadius: 20 }} />}>
                <WeatherMap />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function AppContent() {
  const [chatOpen, setChatOpen] = useState(false);
  const [journeyData, setJourneyData] = useState<JourneyResponse | null>(null);
  const [activeView, setActiveView] = useState<View>('weather');

  // Keyboard shortcut: "/" focuses the city search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        setActiveView('weather');
        requestAnimationFrame(() => document.getElementById('city-search')?.focus());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const views: Record<View, React.ReactNode> = {
    weather: <WeatherView />,
    journey: <JourneySection onJourneyData={setJourneyData} />,
    activity: <ActivityOptimizer />,
    health: <HealthJournal />,
    logistics: <LogisticsOptimizer />,
  };

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <WeatherParticles />
      <ThemeToggle />

      <main id="main-content" style={{ maxWidth: 920, margin: '0 auto', padding: '20px 16px', position: 'relative', zIndex: 1 }}>
        <AppHeader activeView={activeView} onViewChange={setActiveView} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            id={`panel-${activeView}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeView}`}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <ErrorBoundary label={activeView}>
              <Suspense fallback={<ViewFallback />}>{views[activeView]}</Suspense>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>

        <AppFooter />
      </main>

      <JourneyFAB visible={activeView !== 'journey' && !chatOpen} onClick={() => setActiveView('journey')} />
      <ChatToggle onClick={() => setChatOpen(true)} visible={!chatOpen} />
      <Suspense fallback={null}>
        {chatOpen && <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} journeyData={journeyData} />}
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ThemeProvider>
        <WeatherProvider>
          <ErrorBoundary label="SkyPulse">
            <AppContent />
          </ErrorBoundary>
        </WeatherProvider>
      </ThemeProvider>
    </ToastProvider>
  );
}
