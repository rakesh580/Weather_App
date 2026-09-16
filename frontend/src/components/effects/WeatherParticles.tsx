import { useMemo } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import s from '../../styles/components/particles.module.css';

type ParticleLayer = { count: number; type: string };

const PARTICLE_CONFIG: Record<string, ParticleLayer[]> = {
  rain:          [{ count: 22, type: 'rain' }],
  drizzle:       [{ count: 16, type: 'drizzle' }],
  snow:          [{ count: 18, type: 'snow' }],
  thunderstorm:  [{ count: 14, type: 'thunderstorm' }],
  clear:         [{ count: 8,  type: 'clear' }, { count: 3, type: 'leaf' }],
  'night-clear': [{ count: 12, type: 'star' }, { count: 4, type: 'firefly' }],
  clouds:        [{ count: 6,  type: 'cloud' }],
  'night-clouds':[{ count: 6,  type: 'cloud' }, { count: 3, type: 'firefly' }],
  mist:          [{ count: 10, type: 'mist' }],
};

/** Deterministic pseudo-random in [0, 1) so render stays pure (no Math.random during render). */
function prand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export default function WeatherParticles() {
  const { weatherBgClass } = useTheme();
  const reducedMotion = useReducedMotion();

  const particles = useMemo(() => {
    const layers = PARTICLE_CONFIG[weatherBgClass] || [{ count: 5, type: 'cloud' }];
    const result: { key: string; className: string; style: React.CSSProperties }[] = [];
    let seed = weatherBgClass.length * 17;

    layers.forEach(layer => {
      for (let i = 0; i < layer.count; i++) {
        const type = layer.type;
        const r = (k: number) => prand(seed + i * 7 + k);
        const isSnowOrStar = type === 'snow' || type === 'star';
        const isFirefly = type === 'firefly';
        const size = isSnowOrStar ? 2 + r(1) * 4 : isFirefly ? 3 + r(1) * 4 : undefined;
        result.push({
          key: `${weatherBgClass}-${type}-${i}`,
          className: `${s.particle} ${s[type] || ''}`,
          style: {
            left: `${r(2) * 100}%`,
            top: isFirefly ? `${20 + r(3) * 60}%` : undefined,
            animationDelay: `${r(4) * 5}s`,
            animationDuration: `${3 + r(5) * 4}s`,
            ...(size ? { width: `${size}px`, height: `${size}px` } : {}),
            ...(type === 'rain' ? { height: `${10 + r(6) * 15}px` } : {}),
          },
        });
      }
      seed += 1000;
    });
    return result;
  }, [weatherBgClass]);

  if (reducedMotion || !weatherBgClass) return null;

  return (
    <div className={s.canvas} aria-hidden="true">
      {particles.map(p => (
        <div key={p.key} className={p.className} style={p.style} />
      ))}
    </div>
  );
}
