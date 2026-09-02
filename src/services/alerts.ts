import type { Game, ScoreboardGame } from '../types';
import { isTexasTechGame } from './cfbd';

export interface ScoreAlert {
  gameId: number;
  title: string;
  body: string;
  type: 'game_start' | 'score_update' | 'game_final';
}

interface TrackedGame {
  homePoints: number | null;
  awayPoints: number | null;
  completed: boolean;
  status: string;
}

export class ScoreAlertTracker {
  private tracked = new Map<number, TrackedGame>();
  private seenNewsIds = new Set<string>();

  reset(): void {
    this.tracked.clear();
  }

  hasSeenNews(id: string): boolean {
    return this.seenNewsIds.has(id);
  }

  markNewsSeen(id: string): void {
    this.seenNewsIds.add(id);
    // Keep set bounded
    if (this.seenNewsIds.size > 200) {
      const first = this.seenNewsIds.values().next().value;
      if (first) this.seenNewsIds.delete(first);
    }
  }

  checkGames(games: (Game | ScoreboardGame)[]): ScoreAlert[] {
    const alerts: ScoreAlert[] = [];
    const ttuGames = games.filter(isTexasTechGame);

    for (const game of ttuGames) {
      const prev = this.tracked.get(game.id);
      const homePoints = game.homePoints;
      const awayPoints = game.awayPoints;
      const completed = 'completed' in game ? game.completed : game.status === 'completed';
      const status = 'status' in game ? game.status : completed ? 'completed' : 'scheduled';

      if (!prev) {
        if (status === 'in_progress' || (homePoints !== null && awayPoints !== null && !completed)) {
          alerts.push({
            gameId: game.id,
            title: '🏈 Game Started!',
            body: `${game.awayTeam} @ ${game.homeTeam}`,
            type: 'game_start',
          });
        }
      } else if (!prev.completed && completed) {
        alerts.push({
          gameId: game.id,
          title: '🏁 Final Score',
          body: `${game.awayTeam} ${awayPoints} - ${homePoints} ${game.homeTeam}`,
          type: 'game_final',
        });
      } else if (
        (homePoints !== prev.homePoints || awayPoints !== prev.awayPoints) &&
        homePoints !== null &&
        awayPoints !== null
      ) {
        alerts.push({
          gameId: game.id,
          title: '📊 Score Update',
          body: `${game.awayTeam} ${awayPoints} - ${homePoints} ${game.homeTeam}`,
          type: 'score_update',
        });
      }

      this.tracked.set(game.id, {
        homePoints,
        awayPoints,
        completed,
        status,
      });
    }

    return alerts;
  }
}

export const scoreAlertTracker = new ScoreAlertTracker();
