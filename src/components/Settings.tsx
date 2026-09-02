import { useState, useEffect } from 'react';
import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { loadSettings, saveSettings } from '../services/storage';
import { getAvailableSeasons } from '../services/cfbd';

interface SettingsProps {
  onSave: () => void;
}

export function Settings({ onSave }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const seasons = getAvailableSeasons();

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    onSave();
    setTimeout(() => setSaved(false), 2000);
  };

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Settings</h2>
      </div>

      <div className="settings-form">
        <div className="form-group">
          <label htmlFor="apiKey">CFBD API Key</label>
          <span className="hint">
            Required for schedule, scores, records, and rankings. Get a free key at{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                const url = 'https://collegefootballdata.com/key';
                if (window.electronAPI) {
                  window.electronAPI.openExternal(url);
                } else {
                  window.open(url, '_blank');
                }
              }}
            >
              collegefootballdata.com/key
            </a>
          </span>
          <input
            id="apiKey"
            type="password"
            className="form-input"
            value={settings.apiKey}
            onChange={(e) => update('apiKey', e.target.value)}
            placeholder="Enter your API key"
          />
        </div>

        <div className="form-group">
          <label htmlFor="season">Season</label>
          <span className="hint">
            Select any season from 2000 through two years in the future
          </span>
          <select
            id="season"
            className="form-select"
            value={settings.season}
            onChange={(e) => update('season', Number(e.target.value))}
          >
            {seasons.map((year) => (
              <option key={year} value={year}>
                {year}
                {year > new Date().getFullYear() ? ' (Future)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Notifications</label>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={settings.scoreAlertsEnabled}
              onChange={(e) => update('scoreAlertsEnabled', e.target.checked)}
            />
            Score alerts (game start, score updates, final scores)
          </label>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={settings.newsAlertsEnabled}
              onChange={(e) => update('newsAlertsEnabled', e.target.checked)}
            />
            Significant news alerts
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="pollInterval">Refresh Interval (minutes)</label>
          <span className="hint">
            How often to check for score updates and news (1-30 minutes)
          </span>
          <input
            id="pollInterval"
            type="number"
            className="form-input"
            min={1}
            max={30}
            value={settings.pollIntervalMinutes}
            onChange={(e) =>
              update('pollIntervalMinutes', Math.min(30, Math.max(1, Number(e.target.value))))
            }
          />
        </div>

        <button className="btn-primary" onClick={handleSave}>
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
