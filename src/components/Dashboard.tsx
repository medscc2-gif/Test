import type { Game, TeamRecord, RankingWeek, NewsItem } from '../types';
import {
  formatRecord,
  getLatestRankingsByPoll,
  getOpponent,
  isHomeGame,
  getGameResult,
} from '../services/cfbd';
import { formatGameDate, getPollDisplayName, getPollPriority } from '../services/storage';

interface DashboardProps {
  games: Game[];
  record: TeamRecord | null;
  rankings: RankingWeek[];
  news: NewsItem[];
  season: number;
}

export function Dashboard({ games, record, rankings, news, season }: DashboardProps) {
  const latestRankings = getLatestRankingsByPoll(rankings);
  const sortedPolls = [...latestRankings.entries()].sort(
    (a, b) => getPollPriority(a[0]) - getPollPriority(b[0])
  );

  const completedGames = games.filter((g) => g.completed);
  const upcomingGames = games
    .filter((g) => !g.completed)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const nextGame = upcomingGames[0];
  const liveGames = games.filter(
    (g) => !g.completed && g.homePoints !== null && g.awayPoints !== null
  );

  const wins = completedGames.filter((g) => getGameResult(g) === 'W').length;
  const losses = completedGames.filter((g) => getGameResult(g) === 'L').length;

  return (
    <div>
      {liveGames.length > 0 && (
        <div className="upcoming-game-highlight" style={{ borderColor: 'var(--ttu-red)' }}>
          <h3>
            <span className="live-badge">LIVE</span> Game in Progress
          </h3>
          {liveGames.map((game) => (
            <div key={game.id}>
              <div className="upcoming-matchup">
                {game.awayTeam} {game.awayPoints} - {game.homePoints} {game.homeTeam}
              </div>
            </div>
          ))}
        </div>
      )}

      {nextGame && liveGames.length === 0 && (
        <div className="upcoming-game-highlight">
          <h3>Next Game</h3>
          <div className="upcoming-matchup">
            {isHomeGame(nextGame) ? 'vs' : '@'} {getOpponent(nextGame)}
          </div>
          <div className="upcoming-date">{formatGameDate(nextGame.startDate)}</div>
          {nextGame.venue && (
            <div className="upcoming-date">{nextGame.venue}</div>
          )}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="card stat-card">
          <div className="stat-value">{record ? formatRecord(record) : `${wins}-${losses}`}</div>
          <div className="stat-label">{season} Record</div>
          {record && record.conferenceGames.games > 0 && (
            <div className="stat-label" style={{ marginTop: 4 }}>
              Big 12: {record.conferenceGames.wins}-{record.conferenceGames.losses}
            </div>
          )}
        </div>

        <div className="card stat-card">
          <div className="stat-value">{completedGames.length}</div>
          <div className="stat-label">Games Played</div>
        </div>

        <div className="card stat-card">
          <div className="stat-value">{upcomingGames.length}</div>
          <div className="stat-label">Games Remaining</div>
        </div>

        <div className="card">
          <div className="card-title">Current Rankings</div>
          {sortedPolls.length > 0 ? (
            <div className="ranking-pills">
              {sortedPolls.map(([poll, data]) => (
                <div
                  key={poll}
                  className={`ranking-pill ${poll.includes('Playoff') ? 'cfp' : ''}`}
                >
                  <strong>#{data.rank}</strong> {getPollDisplayName(poll)}
                  <span style={{ opacity: 0.6, marginLeft: 6 }}>
                    Wk {data.week}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--ttu-gray-400)', fontSize: '0.875rem' }}>
              Rankings not yet available for this season
            </p>
          )}
        </div>
      </div>

      {news.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="section-header">
            <h2 className="section-title">Latest News</h2>
          </div>
          <div className="news-list">
            {news.slice(0, 3).map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const handleClick = () => {
    if (window.electronAPI) {
      window.electronAPI.openExternal(item.link);
    } else {
      window.open(item.link, '_blank');
    }
  };

  return (
    <div className="news-card" onClick={handleClick}>
      <div className="news-card-header">
        <div className="news-title">{item.title}</div>
      </div>
      <div className="news-source">{item.source}</div>
    </div>
  );
}
