import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeather } from '../../context/WeatherContext';
import { getMicroclimate } from '../../api/microclimate';
import { convertTemp } from '../../utils/tempUtils';
import type { MicroclimateData } from '../../types/microclimate';
import s from '../../styles/components/microclimate.module.css';

const CORRECTION_LABELS: Record<string, { label: string; icon: string }> = {
  elevation: { label: 'Elevation', icon: 'fa-mountain' },
  urban_heat: { label: 'Urban Heat', icon: 'fa-city' },
  water_proximity: { label: 'Water', icon: 'fa-water' },
  terrain_aspect: { label: 'Terrain', icon: 'fa-hill-rockslide' },
};

export default function MicroclimateCard() {
  const { weather, unit } = useWeather();
  const [data, setData] = useState<MicroclimateData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!weather) { setData(null); return; }
    getMicroclimate(weather.lat, weather.lon).then(setData).catch(() => setData(null));
  }, [weather?.lat, weather?.lon]);

  if (!data || Math.abs(data.total_correction) < 0.5) return null;

  const diff = data.total_correction;
  const diffClass = diff > 0 ? s.tempDiffWarm : diff < 0 ? s.tempDiffCool : s.tempDiffNeutral;
  const confClass = data.confidence === 'high' ? s.confidenceHigh : data.confidence === 'medium' ? s.confidenceMedium : s.confidenceLow;

  const corrections = Object.entries(data.corrections);
  const maxAbs = Math.max(1, ...corrections.map(([, c]) => Math.abs(c.correction_f)));

  return (
    <>
      <motion.button
        className={s.inlineBadge}
        onClick={() => setExpanded(!expanded)}
        whileTap={{ scale: 0.95 }}
        title="Microclimate estimate — click for details"
      >
        <i className="fa-solid fa-location-crosshairs" />
        ~{Math.abs(Math.round(unit === 'C' ? diff * 5 / 9 : diff))}&deg;{unit} {diff > 0 ? 'warmer' : 'cooler'} here
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className={s.card}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className={s.cardHeader}>
              <div className={s.cardTitle}>
                <i className={`fa-solid fa-location-crosshairs ${s.cardTitleIcon}`} />
                Microclimate Estimate
              </div>
              <span className={`${s.confidenceBadge} ${confClass}`}>
                {data.confidence} confidence
              </span>
            </div>

            {/* Temperature comparison */}
            <div className={s.tempCompare}>
              <div className={s.tempBox}>
                <div className={s.tempValue}>{convertTemp(data.station_temp, unit)}&deg;</div>
                <div className={s.tempLabel}>Station</div>
              </div>
              <div className={s.tempDiff}>
                <div className={`${s.tempDiffValue} ${diffClass}`}>
                  {diff > 0 ? '+' : ''}{unit === 'C' ? Math.round(diff * 5 / 9) : Math.round(diff)}&deg;
                </div>
                <div className={s.tempDiffLabel}>correction</div>
              </div>
              <div className={s.tempBox}>
                <div className={s.tempValue}>{convertTemp(data.estimated_temp, unit)}&deg;</div>
                <div className={s.tempLabel}>Estimated</div>
              </div>
            </div>

            {/* Correction breakdown */}
            <div className={s.breakdownTitle}>Correction Breakdown</div>
            <div className={s.breakdownList}>
              {corrections.map(([key, corr]) => {
                const info = CORRECTION_LABELS[key] || { label: key, icon: 'fa-circle' };
                const absVal = Math.abs(corr.correction_f);
                const width = (absVal / maxAbs) * 100;
                const displayVal = unit === 'C' ? Math.round(corr.correction_f * 5 / 9 * 10) / 10 : corr.correction_f;
                return (
                  <div key={key} className={s.breakdownItem}>
                    <div className={s.breakdownLabel}>
                      <i className={`fa-solid ${info.icon}`} style={{ marginRight: 6, opacity: 0.6 }} />
                      {info.label}
                    </div>
                    <div className={s.breakdownBarTrack}>
                      <motion.div
                        className={`${s.breakdownBarFill} ${corr.correction_f >= 0 ? s.breakdownBarWarm : s.breakdownBarCool}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(4, width)}%` }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                      />
                    </div>
                    <div className={s.breakdownValue} style={{ color: corr.correction_f >= 0 ? '#ef4444' : '#3b82f6' }}>
                      {displayVal > 0 ? '+' : ''}{displayVal}&deg;
                    </div>
                    <div className={s.breakdownDetail}>{corr.details}</div>
                  </div>
                );
              })}
            </div>

            <div className={s.explanation}>{data.explanation}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
