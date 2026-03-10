import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { WeatherProvider, useWeather } from './context/WeatherContext';
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
import JourneySection from './components/journey/JourneySection';
import ChatToggle from './components/chat/ChatToggle';
import ChatPanel from './components/chat/ChatPanel';
import WeatherParticles from './components/effects/WeatherParticles';
import ScannerSweep from './components/effects/ScannerSweep';
import type { JourneyResponse } from './types/journey';

function AppContent() {
  const { weather, loading, loadWeather } = useWeather();
  const [chatOpen, setChatOpen] = useState(false);
  const [journeyData, setJourneyData] = useState<JourneyResponse | null>(null);

  useEffect(() => {
    loadWeather(40.7128, -74.0060, 'New York');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <WeatherParticles />
      <ScannerSweep />
      <ThemeToggle />

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '20px 16px', position: 'relative', zIndex: 1 }}>
        <AppHeader />
        <SearchBar />
        <FavoritesBar />

        {loading && (
          <div>
            <div className="skeleton" style={{ height: 200, marginBottom: 24, borderRadius: 20 }} />
            <div className="skeleton" style={{ height: 100, marginBottom: 24, borderRadius: 20 }} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {!loading && weather && (
            <motion.div
              key={weather.city}
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <WeatherHero />
              <ComfortScore />
              <WeatherDetails />
              <ForecastSection />
              <WeatherMap />
            </motion.div>
          )}
        </AnimatePresence>

        <JourneySection onJourneyData={setJourneyData} />
        <AppFooter />
      </div>

      <ChatToggle onClick={() => setChatOpen(true)} visible={!chatOpen} />
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} journeyData={journeyData} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <WeatherProvider>
        <AppContent />
      </WeatherProvider>
    </ThemeProvider>
  );
}
