import { useState } from 'react';
import type { TabId } from './types';
import { useAppData } from './hooks/useAppData';
import { Header, Nav } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Schedule } from './components/Schedule';
import { Rankings } from './components/Rankings';
import { News } from './components/News';
import { Settings } from './components/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [settingsVersion, setSettingsVersion] = useState(0);
  const { data, loading, error, lastUpdated, refresh, settings } = useAppData(settingsVersion);

  const handleSettingsSave = () => {
    setSettingsVersion((v) => v + 1);
    refresh();
  };

  const renderContent = () => {
    if (loading && data.games.length === 0 && !error) {
      return (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading Texas Tech football data...</p>
        </div>
      );
    }

    if (error && data.games.length === 0 && data.news.length === 0) {
      return (
        <div className="error-state">
          <p>{error}</p>
          <p className="setup-hint">
            Go to <strong>Settings</strong> to add your free CFBD API key, then refresh.
          </p>
          <button
            className="btn-primary"
            style={{ marginTop: 20 }}
            onClick={() => setActiveTab('settings')}
          >
            Open Settings
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            games={data.games}
            record={data.record}
            rankings={data.rankings}
            news={data.news}
            season={settings.season}
          />
        );
      case 'schedule':
        return <Schedule games={data.games} season={settings.season} />;
      case 'rankings':
        return <Rankings rankings={data.rankings} season={settings.season} />;
      case 'news':
        return <News news={data.news} />;
      case 'settings':
        return <Settings onSave={handleSettingsSave} />;
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <Header
        season={settings.season}
        onRefresh={refresh}
        loading={loading}
      />
      <Nav activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="app-main">
        {error && data.games.length === 0 && activeTab === 'dashboard' && (
          <div className="card" style={{ marginBottom: 20, borderColor: 'var(--ttu-red)' }}>
            <p style={{ color: 'var(--ttu-red-light)', fontSize: '0.9rem' }}>{error}</p>
            <button
              className="btn-primary"
              style={{ marginTop: 12 }}
              onClick={() => setActiveTab('settings')}
            >
              Configure API Key
            </button>
          </div>
        )}
        {renderContent()}
        {lastUpdated && activeTab !== 'settings' && (
          <div className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </main>
    </div>
  );
}
