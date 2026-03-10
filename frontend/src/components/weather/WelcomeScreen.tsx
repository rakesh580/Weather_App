import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import SkyPulseLogo from '../layout/SkyPulseLogo';
import { useWeather } from '../../context/WeatherContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useToast } from '../ui/Toast';
import s from '../../styles/components/welcome.module.css';

const POPULAR_CITIES = [
  { name: 'New York', lat: 40.7128, lon: -74.006, country: 'US', icon: 'fa-city' },
  { name: 'London', lat: 51.5074, lon: -0.1278, country: 'GB', icon: 'fa-tower-observation' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'JP', icon: 'fa-torii-gate' },
  { name: 'Paris', lat: 48.8566, lon: 2.3522, country: 'FR', icon: 'fa-monument' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, country: 'AU', icon: 'fa-water' },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708, country: 'AE', icon: 'fa-sun' },
];

const FEATURES = [
  { icon: 'fa-heart-pulse', title: 'Comfort Score', desc: 'AI-rated outdoor comfort with clothing tips' },
  { icon: 'fa-road', title: 'Journey Planner', desc: 'Weather along your driving route' },
  { icon: 'fa-robot', title: 'AI Chat', desc: 'Ask anything about the weather' },
  { icon: 'fa-chart-line', title: 'Forecasts & Charts', desc: '5-day outlook with interactive graphs' },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

function getGreeting(): { text: string; icon: string } {
  const h = new Date().getHours();
  if (h < 6) return { text: 'Good night', icon: 'fa-moon' };
  if (h < 12) return { text: 'Good morning', icon: 'fa-sun' };
  if (h < 18) return { text: 'Good afternoon', icon: 'fa-cloud-sun' };
  return { text: 'Good evening', icon: 'fa-cloud-moon' };
}

export default function WelcomeScreen() {
  const { loadWeather } = useWeather();
  const { getLocation, loading: geoLoading } = useGeolocation();
  const { showToast } = useToast();
  const [locating, setLocating] = useState(false);

  const greeting = useMemo(getGreeting, []);

  const handleLocation = async () => {
    setLocating(true);
    try {
      const { lat, lon } = await getLocation();
      loadWeather(lat, lon);
    } catch {
      showToast('Could not get your location. Please allow location access.', 'error');
    } finally {
      setLocating(false);
    }
  };

  const isLocating = locating || geoLoading;

  return (
    <motion.div
      className={s.welcome}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Hero section */}
      <motion.div className={s.hero} variants={itemVariants}>
        <div className={s.logoWrap}>
          <SkyPulseLogo size={72} />
        </div>
        <h1 className={s.heading}>
          <i className={`fa-solid ${greeting.icon} ${s.greetingIcon}`} />
          {' '}{greeting.text}
        </h1>
        <p className={s.tagline}>
          Your personal weather companion — search any city or use your location to get started.
        </p>
      </motion.div>

      {/* Location CTA */}
      <motion.div className={s.ctaSection} variants={itemVariants}>
        <button className={s.locationCta} onClick={handleLocation} disabled={isLocating}>
          <i className={`fa-solid ${isLocating ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'}`} />
          {isLocating ? 'Detecting location...' : 'Use my location'}
        </button>
        <span className={s.ctaDivider}>or pick a city below</span>
      </motion.div>

      {/* Popular cities grid */}
      <motion.div className={s.citiesGrid} variants={itemVariants}>
        <h3 className={s.sectionLabel}>
          <i className="fa-solid fa-earth-americas" /> Popular Cities
        </h3>
        <div className={s.cities}>
          {POPULAR_CITIES.map(city => (
            <button
              key={city.name}
              className={s.cityCard}
              onClick={() => loadWeather(city.lat, city.lon, city.name)}
            >
              <i className={`fa-solid ${city.icon} ${s.cityIcon}`} />
              <span className={s.cityName}>{city.name}</span>
              <span className={s.cityCountry}>{city.country}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Feature cards */}
      <motion.div className={s.featuresSection} variants={itemVariants}>
        <h3 className={s.sectionLabel}>
          <i className="fa-solid fa-sparkles" /> What SkyPulse Offers
        </h3>
        <div className={s.features}>
          {FEATURES.map(f => (
            <div key={f.title} className={s.featureCard}>
              <i className={`fa-solid ${f.icon} ${s.featureIcon}`} />
              <div className={s.featureTitle}>{f.title}</div>
              <div className={s.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
