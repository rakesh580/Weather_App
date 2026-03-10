import { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import s from '../../styles/components/particles.module.css';

type ParticleLayer = { count: number; type: string };

const PARTICLE_CONFIG: Record<string, ParticleLayer[]> = {
  rain:          [{ count: 25, type: 'rain' }],
  drizzle:       [{ count: 18, type: 'drizzle' }],
  snow:          [{ count: 20, type: 'snow' }],
  thunderstorm:  [{ count: 15, type: 'thunderstorm' }, { count: 2, type: 'energyWisp' }],
  clear:         [{ count: 8,  type: 'clear' }, { count: 4, type: 'energyWisp' }],
  'night-clear': [{ count: 12, type: 'star' }, { count: 3, type: 'glowOrb' }],
  clouds:        [{ count: 6,  type: 'cloud' }],
  'night-clouds':[{ count: 6,  type: 'cloud' }, { count: 2, type: 'glowOrb' }],
  mist:          [{ count: 10, type: 'mist' }],
};

export default function WeatherParticles() {
  const { weatherBgClass } = useTheme();

  const particles = useMemo(() => {
    const layers = PARTICLE_CONFIG[weatherBgClass] || [{ count: 5, type: 'cloud' }];
    const result: { key: string; className: string; style: React.CSSProperties }[] = [];

    layers.forEach((layer) => {
      for (let i = 0; i < layer.count; i++) {
        const type = layer.type;
        const isSnowOrStar = type === 'snow' || type === 'star';
        const isGlowOrb = type === 'glowOrb';
        const size = isSnowOrStar ? 2 + Math.random() * 4
          : isGlowOrb ? 6 + Math.random() * 6
          : undefined;

        result.push({
          key: `${weatherBgClass}-${type}-${i}`,
          className: `${s.particle} ${s[type] || ''}`,
          style: {
            left: `${Math.random() * 100}%`,
            top: type === 'glowOrb' ? `${20 + Math.random() * 60}%` : undefined,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            ...(size ? { width: `${size}px`, height: `${size}px` } : {}),
            ...(type === 'rain' ? { height: `${10 + Math.random() * 15}px` } : {}),
          },
        });
      }
    });

    return result;
  }, [weatherBgClass]);

  if (!weatherBgClass) return null;

  return (
    <div className={s.canvas}>
      {particles.map(p => (
        <div key={p.key} className={p.className} style={p.style} />
      ))}
    </div>
  );
}
