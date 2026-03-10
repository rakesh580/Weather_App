import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { JourneyResponse } from '../../types/journey';
import s from '../../styles/components/journey.module.css';

function FitBounds({ waypoints }: { waypoints: JourneyResponse['waypoints'] }) {
  const map = useMap();
  useEffect(() => {
    if (waypoints.length === 0) return;
    const bounds = waypoints.map(w => [w.lat, w.lon] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40] });
    setTimeout(() => map.invalidateSize(), 300);
  }, [map, waypoints]);
  return null;
}

function isDark(wp: JourneyResponse['waypoints'][0]): boolean {
  if (!wp.sunrise || !wp.sunset) return false;
  const arrival = new Date(wp.estimated_arrival).getTime();
  const sunrise = new Date(wp.sunrise).getTime();
  const sunset = new Date(wp.sunset).getTime();
  return arrival < sunrise || arrival > sunset;
}

interface Props { data: JourneyResponse; }

export default function JourneyMap({ data }: Props) {
  // Build darkness segments between consecutive dark waypoints
  const darkSegments: [number, number][][] = [];
  for (let i = 0; i < data.waypoints.length - 1; i++) {
    const a = data.waypoints[i];
    const b = data.waypoints[i + 1];
    if (isDark(a) && isDark(b)) {
      darkSegments.push([[a.lat, a.lon], [b.lat, b.lon]]);
    }
  }

  return (
    <div className={s.mapContainer}>
      <MapContainer center={[39.8, -98.5]} zoom={4} className={s.journeyMap} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        <FitBounds waypoints={data.waypoints} />

        {data.route_coords.length > 1 && (
          <Polyline positions={data.route_coords} pathOptions={{ color: 'rgba(255,255,255,0.15)', weight: 6 }} />
        )}

        {/* Night driving overlay (rendered behind colored segments) */}
        {darkSegments.map((coords, i) => (
          <Polyline key={`dark-${i}`} positions={coords} pathOptions={{ color: 'rgba(20,20,60,0.5)', weight: 12 }} />
        ))}

        {data.segments.map((seg, i) => (
          <Polyline key={i} positions={seg.coords} pathOptions={{ color: seg.color, weight: 5, opacity: 0.9 }} />
        ))}

        {data.waypoints.map((wp, i) => {
          const isEnd = i === 0 || i === data.waypoints.length - 1;
          const time = new Date(wp.estimated_arrival).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          const nightDriving = isDark(wp);
          return (
            <CircleMarker
              key={i}
              center={[wp.lat, wp.lon]}
              radius={isEnd ? 8 : 5}
              pathOptions={{ fillColor: wp.color, color: nightDriving ? '#1e1e4a' : '#fff', weight: 2, fillOpacity: 1 }}
            >
              <Popup>
                <strong>{wp.name}</strong><br />
                <em>{time}</em>{nightDriving && ' 🌙'}<br />
                {Math.round(wp.weather.temperature)}&deg;F — {wp.weather.description}<br />
                <small>{Math.round(wp.distance_from_origin_miles)} mi from start</small>
                {wp.elevation_ft != null && <><br /><small>Elevation: {wp.elevation_ft.toLocaleString()} ft</small></>}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      {darkSegments.length > 0 && (
        <div className={s.mapLegend}>
          <span className={s.legendItem}><span className={s.legendSwatch} style={{ background: 'rgba(20,20,60,0.7)' }} /> Night driving</span>
          <span className={s.legendItem}><span className={s.legendSwatch} style={{ background: '#22c55e' }} /> Daylight</span>
        </div>
      )}
    </div>
  );
}
