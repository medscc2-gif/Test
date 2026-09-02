import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

const SETTINGS_KEY = 'ttu-football-settings';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function formatGameDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatGameDateShort(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getPollDisplayName(poll: string): string {
  const names: Record<string, string> = {
    'AP Top 25': 'AP Poll',
    'Coaches Poll': 'Coaches Poll',
    'Playoff Committee Rankings': 'CFP Rankings',
    'FCS Coaches Poll': 'FCS Coaches',
    'AFCA Division II Coaches Poll': 'DII Coaches',
  };
  return names[poll] || poll;
}

export function getPollPriority(poll: string): number {
  const priorities: Record<string, number> = {
    'Playoff Committee Rankings': 1,
    'AP Top 25': 2,
    'Coaches Poll': 3,
  };
  return priorities[poll] ?? 99;
}
