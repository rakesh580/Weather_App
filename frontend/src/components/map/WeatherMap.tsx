import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useWeather } from '../../context/WeatherContext';
import s from '../../styles/components/map.module.css';

function MapUpdater({ lat, lon, city }: { lat: number; lon: number; city: string }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], 10, { animate: true });
    setTimeout(() => map.invalidateSize(), 300);
  }, [map, lat, lon]);
  return <Marker position={[lat, lon]}><Popup>{city}</Popup></Marker>;
}

export default function WeatherMap() {
  const { weather } = useWeather();
  if (!weather) return null;

  return (
    <div className={s.section}>
      <MapContainer
        center={[weather.lat, weather.lon]}
        zoom={10}
        className={s.map}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater lat={weather.lat} lon={weather.lon} city={weather.city} />
      </MapContainer>
    </div>
  );
}
