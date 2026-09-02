import type { Game, RankingWeek, ScoreboardGame, TeamRecord } from '../types';
import { TEAM_NAME } from '../types';

const BASE_URL = 'https://api.collegefootballdata.com';

export class CfbdApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'CfbdApiError';
  }
}

async function cfbdFetch<T>(
  path: string,
  apiKey: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  if (!apiKey) {
    throw new CfbdApiError('API key is required. Add your free CFBD API key in Settings.');
  }

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new CfbdApiError(
      text || `CFBD API error (${response.status})`,
      response.status
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchSchedule(
  apiKey: string,
  season: number
): Promise<Game[]> {
  return cfbdFetch<Game[]>('/games', apiKey, {
    year: season,
    team: TEAM_NAME,
    seasonType: 'both',
  });
}

export async function fetchRecord(
  apiKey: string,
  season: number
): Promise<TeamRecord | null> {
  const records = await cfbdFetch<TeamRecord[]>('/records', apiKey, {
    year: season,
    team: TEAM_NAME,
  });
  return records[0] ?? null;
}

export async function fetchRankings(
  apiKey: string,
  season: number
): Promise<RankingWeek[]> {
  const regular = await cfbdFetch<RankingWeek[]>('/rankings', apiKey, {
    year: season,
    seasonType: 'regular',
  }).catch(() => [] as RankingWeek[]);

  const postseason = await cfbdFetch<RankingWeek[]>('/rankings', apiKey, {
    year: season,
    seasonType: 'postseason',
  }).catch(() => [] as RankingWeek[]);

  return [...regular, ...postseason].sort((a, b) => {
    if (a.seasonType !== b.seasonType) {
      return a.seasonType === 'regular' ? -1 : 1;
    }
    return a.week - b.week;
  });
}

export async function fetchScoreboard(
  apiKey: string
): Promise<ScoreboardGame[]> {
  return cfbdFetch<ScoreboardGame[]>('/scoreboard', apiKey, {
    classification: 'fbs',
  });
}

export function getTexasTechRanking(
  rankingWeek: RankingWeek
): { poll: string; rank: number; points: number } | null {
  for (const poll of rankingWeek.polls) {
    const entry = poll.ranks.find(
      (r) => r.school.toLowerCase() === TEAM_NAME.toLowerCase()
    );
    if (entry) {
      return { poll: poll.poll, rank: entry.rank, points: entry.points };
    }
  }
  return null;
}

export function getLatestRankingsByPoll(
  rankings: RankingWeek[]
): Map<string, { rank: number; points: number; week: number; seasonType: string }> {
  const latest = new Map<
    string,
    { rank: number; points: number; week: number; seasonType: string }
  >();

  for (const week of rankings) {
    for (const poll of week.polls) {
      const entry = poll.ranks.find(
        (r) => r.school.toLowerCase() === TEAM_NAME.toLowerCase()
      );
      if (entry) {
        latest.set(poll.poll, {
          rank: entry.rank,
          points: entry.points,
          week: week.week,
          seasonType: week.seasonType,
        });
      }
    }
  }

  return latest;
}

export function isTexasTechGame(game: Game | ScoreboardGame): boolean {
  return (
    game.homeTeam.toLowerCase() === TEAM_NAME.toLowerCase() ||
    game.awayTeam.toLowerCase() === TEAM_NAME.toLowerCase()
  );
}

export function getOpponent(game: Game): string {
  return game.homeTeam.toLowerCase() === TEAM_NAME.toLowerCase()
    ? game.awayTeam
    : game.homeTeam;
}

export function isHomeGame(game: Game): boolean {
  return game.homeTeam.toLowerCase() === TEAM_NAME.toLowerCase();
}

export function getGameResult(game: Game): 'W' | 'L' | 'T' | null {
  if (!game.completed || game.homePoints === null || game.awayPoints === null) {
    return null;
  }
  const ttuIsHome = isHomeGame(game);
  const ttuScore = ttuIsHome ? game.homePoints : game.awayPoints;
  const oppScore = ttuIsHome ? game.awayPoints : game.homePoints;
  if (ttuScore > oppScore) return 'W';
  if (ttuScore < oppScore) return 'L';
  return 'T';
}

export function formatRecord(record: TeamRecord | null): string {
  if (!record) return '0-0';
  const { wins, losses, ties } = record.total;
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

export function getAvailableSeasons(): number[] {
  const currentYear = new Date().getFullYear();
  const seasons: number[] = [];
  // Historical back to 2000, forward 2 years for future schedules
  for (let y = currentYear + 2; y >= 2000; y--) {
    seasons.push(y);
  }
  return seasons;
}
