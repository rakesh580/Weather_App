import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useWeather } from '../../context/WeatherContext';
import { convertTemp } from '../../utils/tempUtils';
import { getWeatherIcon } from '../../utils/weatherIcons';
import s from '../../styles/components/map.module.css';

// Fix Leaflet default marker icon paths broken by bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const LAYERS = [
  { key: 'clouds_new', icon: 'fa-cloud', label: 'Clouds' },
  { key: 'precipitation_new', icon: 'fa-cloud-rain', label: 'Rain' },
  { key: 'temp_new', icon: 'fa-temperature-half', label: 'Temp' },
  { key: 'wind_new', icon: 'fa-wind', label: 'Wind' },
  { key: 'pressure_new', icon: 'fa-gauge', label: 'Pressure' },
];

function MapUpdater({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], 10, { animate: true });
    setTimeout(() => map.invalidateSize(), 300);
  }, [map, lat, lon]);
  return null;
}

export default function WeatherMap() {
  const { weather, unit } = useWeather();
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  if (!weather) return null;

  const icon = getWeatherIcon(weather.weather_id, weather.weather_icon);
  const temp = convertTemp(weather.temperature, unit);

  return (
    <div className={s.section}>
      <div className={s.mapWrapper}>
        <div className={s.layerControls}>
          {LAYERS.map(l => (
            <button
              key={l.key}
              className={`${s.layerBtn} ${activeLayer === l.key ? s.layerBtnActive : ''}`}
              onClick={() => setActiveLayer(prev => prev === l.key ? null : l.key)}
              title={l.label}
              aria-label={`Toggle ${l.label} layer`}
            >
              <i className={`fa-solid ${l.icon}`} />
            </button>
          ))}
        </div>
        <MapContainer
          center={[weather.lat, weather.lon]}
          zoom={10}
          className={s.map}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
          {activeLayer && (
            <TileLayer
              url={`/api/map-tile/${activeLayer}/{z}/{x}/{y}`}
              opacity={0.6}
            />
          )}
          <MapUpdater lat={weather.lat} lon={weather.lon} />
          <Marker position={[weather.lat, weather.lon]}>
            <Popup>
              <div style={{ textAlign: 'center', fontFamily: 'inherit' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>
                  <i className={icon.iconClass} />
                </div>
                <strong>{weather.city}</strong>
                <div style={{ fontSize: '0.9rem' }}>
                  {temp}&deg;{unit} &middot; {weather.weather}
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
