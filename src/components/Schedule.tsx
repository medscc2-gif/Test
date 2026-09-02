import type { Game } from '../types';
import {
  getOpponent,
  isHomeGame,
  getGameResult,
} from '../services/cfbd';
import { formatGameDate, formatGameDateShort } from '../services/storage';

interface ScheduleProps {
  games: Game[];
  season: number;
}

export function Schedule({ games, season }: ScheduleProps) {
  const sortedGames = [...games].sort((a, b) => {
    if (a.week !== b.week) return a.week - b.week;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  if (sortedGames.length === 0) {
    return (
      <div className="empty-state">
        <p>No schedule available for the {season} season yet.</p>
        <p style={{ marginTop: 8, fontSize: '0.875rem' }}>
          Future season schedules are typically released in the spring.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">{season} Schedule</h2>
        <span style={{ color: 'var(--ttu-gray-400)', fontSize: '0.875rem' }}>
          {sortedGames.length} games
        </span>
      </div>
      <div className="schedule-list">
        {sortedGames.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const opponent = getOpponent(game);
  const isHome = isHomeGame(game);
  const result = getGameResult(game);
  const isLive =
    !game.completed && game.homePoints !== null && game.awayPoints !== null;

  const ttuScore = isHome ? game.homePoints : game.awayPoints;
  const oppScore = isHome ? game.awayPoints : game.homePoints;

  const weekLabel =
    game.seasonType === 'postseason'
      ? 'Bowl/Playoff'
      : `Week ${game.week}`;

  return (
    <div
      className={`game-card ${result ? result === 'W' ? 'win' : result === 'L' ? 'loss' : '' : ''} ${isLive ? 'live' : ''}`}
    >
      <div className="game-week">{weekLabel}</div>
      <div className="game-matchup">
        <div className="game-opponent">
          {isHome ? 'vs' : '@'} {opponent}
          {game.conferenceGame && (
            <span style={{ color: 'var(--ttu-gray-400)', fontWeight: 400, marginLeft: 8 }}>
              (Conf)
            </span>
          )}
        </div>
        <div className="game-meta">
          {formatGameDateShort(game.startDate)} · {formatGameDate(game.startDate).split(',').pop()?.trim()}
          {game.venue && ` · ${game.venue}`}
          {game.neutralSite && ' · Neutral Site'}
        </div>
      </div>
      <div className="game-score-section">
        {game.completed || isLive ? (
          <div>
            <span className="game-score">
              {isHome
                ? `${ttuScore} - ${oppScore}`
                : `${oppScore} - ${ttuScore}`}
            </span>
            {result && <span className={`game-result ${result}`}>{result}</span>}
            {isLive && <span className="live-badge" style={{ marginLeft: 8 }}>LIVE</span>}
          </div>
        ) : (
          <span style={{ color: 'var(--ttu-gray-400)', fontSize: '0.875rem' }}>
            {new Date(game.startDate).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
}
