import type { RankingWeek } from '../types';
import { getTexasTechRanking } from '../services/cfbd';
import { getPollDisplayName } from '../services/storage';

interface RankingsProps {
  rankings: RankingWeek[];
  season: number;
}

export function Rankings({ rankings, season }: RankingsProps) {
  const reversedRankings = [...rankings].reverse();

  if (rankings.length === 0) {
    return (
      <div className="empty-state">
        <p>No rankings available for the {season} season yet.</p>
        <p style={{ marginTop: 8, fontSize: '0.875rem' }}>
          AP and Coaches polls typically begin in late August. CFP rankings start in late October.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">{season} Rankings History</h2>
      </div>
      <div className="rankings-timeline">
        {reversedRankings.map((week) => {
          const ttuRankings: { poll: string; rank: number; points: number }[] = [];
          for (const poll of week.polls) {
            const entry = getTexasTechRanking({ ...week, polls: [poll] });
            if (entry) {
              ttuRankings.push(entry);
            }
          }

          if (ttuRankings.length === 0) return null;

          return (
            <div key={`${week.seasonType}-${week.week}`} className="ranking-week-card">
              <div className="ranking-week-header">
                <span className="ranking-week-title">
                  Week {week.week}
                </span>
                <span className="ranking-week-type">
                  {week.seasonType === 'postseason' ? 'Postseason' : 'Regular Season'}
                </span>
              </div>
              <div className="ranking-entries">
                {ttuRankings.map((entry) => (
                  <div
                    key={entry.poll}
                    className={`ranking-entry ${entry.poll.includes('Playoff') ? 'cfp' : ''}`}
                  >
                    <div className="ranking-entry-poll">
                      {getPollDisplayName(entry.poll)}
                    </div>
                    <div className="ranking-entry-rank">#{entry.rank}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ttu-gray-400)' }}>
                      {entry.points} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!rankings.some((w) =>
        w.polls.some((p) => p.poll.includes('Playoff'))
      ) && (
        <div className="ranking-unranked" style={{ marginTop: 20 }}>
          CFP Playoff Committee rankings are released starting in late October when available.
        </div>
      )}
    </div>
  );
}
