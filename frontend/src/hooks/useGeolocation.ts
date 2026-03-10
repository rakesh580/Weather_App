import { useState, useCallback } from 'react';

export function useGeolocation() {
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback((): Promise<{ lat: number; lon: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        (err) => {
          setLoading(false);
          reject(err);
        },
        { timeout: 10000 }
      );
    });
  }, []);

  return { getLocation, loading };
}
