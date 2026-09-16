import { describe, it, expect } from 'vitest';
import { wmoInfo } from './wmoCodes';

describe('wmoInfo', () => {
  it('maps clear sky by day/night', () => {
    expect(wmoInfo(0, true).icon).toBe('fa-sun');
    expect(wmoInfo(0, false).icon).toBe('fa-moon');
  });
  it('flags precipitation codes', () => {
    expect(wmoInfo(61).precip).toBe(true);
    expect(wmoInfo(95).description).toBe('Thunderstorm');
    expect(wmoInfo(3).precip).toBe(false);
  });
  it('handles unknown codes', () => {
    expect(wmoInfo(null).description).toBe('Unknown');
  });
});
