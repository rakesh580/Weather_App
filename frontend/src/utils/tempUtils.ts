export function convertTemp(tempF: number, unit: 'F' | 'C'): number {
  return unit === 'C' ? Math.round((tempF - 32) * 5 / 9) : Math.round(tempF);
}
