import { useSyncExternalStore } from 'react';
import { safeStorage } from './storage';
import type { SavedJourney } from '../types/journey';

const STORAGE_KEY = 'skypulse-journey-history';
const MAX_ITEMS = 10;
const listeners = new Set<() => void>();

function isSaved(j: unknown): j is SavedJourney {
  const x = j as SavedJourney;
  return !!x && typeof x.id === 'string' && !!x.request && !!x.summary && typeof x.summary.distance_miles === 'number';
}

let snapshot: SavedJourney[] = load();

function load(): SavedJourney[] {
  const raw = safeStorage.getJSON<unknown>(STORAGE_KEY, []);
  return Array.isArray(raw) ? raw.filter(isSaved) : [];
}

function write(next: SavedJourney[]) {
  snapshot = next;
  safeStorage.setJSON(STORAGE_KEY, next);
  listeners.forEach(l => l());
}

export const journeyHistory = {
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  getSnapshot: () => snapshot,
  save(journey: SavedJourney) { write([journey, ...snapshot].slice(0, MAX_ITEMS)); },
  remove(id: string) { write(snapshot.filter(j => j.id !== id)); },
  clear() { write([]); },
};

export function useJourneyHistory(): SavedJourney[] {
  return useSyncExternalStore(journeyHistory.subscribe, journeyHistory.getSnapshot, journeyHistory.getSnapshot);
}
