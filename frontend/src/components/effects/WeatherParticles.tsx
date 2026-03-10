import { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import s from '../../styles/components/particles.module.css';

type ParticleLayer = { count: number; type: string };

const PARTICLE_CONFIG: Record<string, ParticleLayer[]> = {
  rain:          [{ count: 25, type: 'rain' }],
  drizzle:       [{ count: 18, type: 'drizzle' }],
  snow:          [{ count: 20, type: 'snow' }],
  thunderstorm:  [{ count: 15, type: 'thunderstorm' }],
  clear:         [{ count: 8,  type: 'clear' }, { count: 3, type: 'leaf' }],
  'night-clear': [{ count: 12, type: 'star' }, { count: 4, type: 'firefly' }],
  clouds:        [{ count: 6,  type: 'cloud' }],
  'night-clouds':[{ count: 6,  type: 'cloud' }, { count: 3, type: 'firefly' }],
  mist:          [{ count: 10, type: 'mist' }],
};

export default function WeatherParticles() {
  const { weatherBgClass } = useTheme();
  const reducedMotion = useReducedMotion();

  if (reducedMotion) return null;

  const particles = useMemo(() => {
    const layers = PARTICLE_CONFIG[weatherBgClass] || [{ count: 5, type: 'cloud' }];
    const result: { key: string; className: string; style: React.CSSProperties }[] = [];

    layers.forEach((layer) => {
      for (let i = 0; i < layer.count; i++) {
        const type = layer.type;
        const isSnowOrStar = type === 'snow' || type === 'star';
        const isFirefly = type === 'firefly';
        const size = isSnowOrStar ? 2 + Math.random() * 4
          : isFirefly ? 3 + Math.random() * 4
          : undefined;

        result.push({
          key: `${weatherBgClass}-${type}-${i}`,
          className: `${s.particle} ${s[type] || ''}`,
          style: {
            left: `${Math.random() * 100}%`,
            top: isFirefly ? `${20 + Math.random() * 60}%` : undefined,
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
