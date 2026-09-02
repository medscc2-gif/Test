import type { TabId } from '../types';

interface HeaderProps {
  season: number;
  onRefresh: () => void;
  loading: boolean;
}

export function Header({ season, onRefresh, loading }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <div className="app-logo">TTU</div>
        <div className="app-title">
          <h1>Texas Tech Football Tracker</h1>
          <p>Schedule · Scores · Rankings · News</p>
        </div>
      </div>
      <div className="app-header-right">
        <span className="season-badge">{season} Season</span>
        <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>
    </header>
  );
}

interface NavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'rankings', label: 'Rankings' },
  { id: 'news', label: 'News' },
  { id: 'settings', label: 'Settings' },
];

export function Nav({ activeTab, onTabChange }: NavProps) {
  return (
    <nav className="app-nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
