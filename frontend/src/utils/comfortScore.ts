import type { ComfortResult, ClothingChip } from '../types/weather';

export function calculateComfort(
  temp: number,
  humidity: number,
  wind: number,
  visibilityKm: number
): ComfortResult {
  let tempScore: number;
  if (temp >= 68 && temp <= 77) tempScore = 100;
  else if (temp >= 60 && temp < 68) tempScore = 70 + (temp - 60) * 3.75;
  else if (temp > 77 && temp <= 85) tempScore = 100 - (temp - 77) * 3.75;
  else if (temp >= 50 && temp < 60) tempScore = 40 + (temp - 50) * 3;
  else if (temp > 85 && temp <= 95) tempScore = 70 - (temp - 85) * 4;
  else if (temp < 50) tempScore = Math.max(0, 40 - (50 - temp) * 2);
  else tempScore = Math.max(0, 30 - (temp - 95) * 3);

  let humidityScore: number;
  if (humidity >= 30 && humidity <= 50) humidityScore = 100;
  else if (humidity < 30) humidityScore = 60 + humidity * 1.33;
  else if (humidity > 50 && humidity <= 70) humidityScore = 100 - (humidity - 50) * 2;
  else humidityScore = Math.max(0, 60 - (humidity - 70) * 2);

  let windScore: number;
  if (wind <= 5) windScore = 100;
  else if (wind <= 15) windScore = 100 - (wind - 5) * 4;
  else if (wind <= 25) windScore = 60 - (wind - 15) * 3;
  else windScore = Math.max(0, 30 - (wind - 25) * 2);

  const visScore = visibilityKm >= 10 ? 100 : visibilityKm * 10;
  const score = Math.round(tempScore * 0.4 + humidityScore * 0.25 + windScore * 0.2 + visScore * 0.15);

  let color: string, status: string;
  if (score >= 80) { color = '#48bb78'; status = 'Excellent'; }
  else if (score >= 60) { color = '#ecc94b'; status = 'Good'; }
  else if (score >= 40) { color = '#ed8936'; status = 'Fair'; }
  else if (score >= 20) { color = '#fc8181'; status = 'Poor'; }
  else { color = '#f56565'; status = 'Harsh'; }

  return { score, color, status };
}

export function getClothingChips(
  temp: number,
  humidity: number,
  wind: number,
  visibilityKm: number,
  weatherId: number
): ClothingChip[] {
  const chips: ClothingChip[] = [];

  if (temp < 40) chips.push({ icon: 'fa-mitten', text: 'Heavy Coat' });
  else if (temp < 55) chips.push({ icon: 'fa-vest-patches', text: 'Jacket' });
  else if (temp < 68) chips.push({ icon: 'fa-shirt', text: 'Light Layer' });
  else chips.push({ icon: 'fa-shirt', text: 'T-Shirt' });

  if (humidity > 60 || (weatherId >= 300 && weatherId < 600))
    chips.push({ icon: 'fa-umbrella', text: 'Umbrella' });
  if (weatherId === 800 && temp > 75)
    chips.push({ icon: 'fa-glasses', text: 'Sunglasses' });
  if (wind > 15)
    chips.push({ icon: 'fa-wind', text: 'Windbreaker' });
  if (temp > 85)
    chips.push({ icon: 'fa-bottle-water', text: 'Hydrate' });
  if (weatherId >= 600 && weatherId < 700)
    chips.push({ icon: 'fa-hat-wizard', text: 'Warm Hat' });
  if (visibilityKm < 3)
    chips.push({ icon: 'fa-triangle-exclamation', text: 'Low Visibility' });

  return chips;
}
