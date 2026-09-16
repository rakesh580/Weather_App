import { useContext } from 'react';
import { WeatherContext } from '../context/weather';

export const useWeather = () => useContext(WeatherContext);
