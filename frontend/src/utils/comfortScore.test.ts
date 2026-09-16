import { describe, it, expect } from 'vitest';
import { calculateComfort, getClothingChips } from './comfortScore';

describe('calculateComfort', () => {
  it('rates a perfect spring day as excellent', () => {
    const r = calculateComfort(72, 40, 3, 10);
    expect(r.score).toBeGreaterThanOrEqual(95);
    expect(r.status).toBe('Excellent');
  });

  it('penalises extreme heat, humidity and wind', () => {
    const r = calculateComfort(104, 90, 35, 1);
    expect(r.score).toBeLessThan(25);
    expect(['Poor', 'Harsh']).toContain(r.status);
  });

  it('is monotonic in visibility', () => {
    expect(calculateComfort(72, 40, 3, 10).score).toBeGreaterThan(calculateComfort(72, 40, 3, 1).score);
  });
});

describe('getClothingChips', () => {
  it('suggests a heavy coat and a warm hat in snow', () => {
    const chips = getClothingChips(20, 60, 5, 5, 601).map(c => c.text);
    expect(chips).toContain('Heavy Coat');
    expect(chips).toContain('Warm Hat');
  });

  it('suggests an umbrella when rain is likely', () => {
    expect(getClothingChips(65, 40, 5, 10, 500).map(c => c.text)).toContain('Umbrella');
  });
});
