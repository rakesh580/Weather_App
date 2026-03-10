export interface IconInfo {
  iconClass: string;
  animClass: string;
  weatherClass: string;
}

export function getWeatherIcon(weatherId: number, icon?: string): IconInfo {
  const isNight = icon?.endsWith('n') ?? false;

  if (weatherId >= 200 && weatherId < 300)
    return { iconClass: 'fa-solid fa-cloud-bolt', animClass: 'wi-storm', weatherClass: 'thunderstorm' };
  if (weatherId >= 300 && weatherId < 400)
    return { iconClass: 'fa-solid fa-cloud-rain', animClass: 'wi-rain', weatherClass: 'drizzle' };
  if (weatherId >= 500 && weatherId < 600)
    return { iconClass: 'fa-solid fa-cloud-showers-heavy', animClass: 'wi-rain', weatherClass: 'rain' };
  if (weatherId >= 600 && weatherId < 700)
    return { iconClass: 'fa-solid fa-snowflake', animClass: 'wi-snow', weatherClass: 'snow' };
  if (weatherId >= 700 && weatherId < 800)
    return { iconClass: 'fa-solid fa-smog', animClass: 'wi-cloud', weatherClass: 'mist' };
  if (weatherId === 800) {
    if (isNight) return { iconClass: 'fa-solid fa-moon', animClass: '', weatherClass: 'night-clear' };
    return { iconClass: 'fa-solid fa-sun', animClass: 'wi-sunny', weatherClass: 'clear' };
  }
  if (weatherId > 800) {
    if (isNight) return { iconClass: 'fa-solid fa-cloud-moon', animClass: 'wi-cloud', weatherClass: 'night-clouds' };
    return { iconClass: 'fa-solid fa-cloud', animClass: 'wi-cloud', weatherClass: 'clouds' };
  }
  return { iconClass: 'fa-solid fa-cloud', animClass: 'wi-cloud', weatherClass: 'clouds' };
}
