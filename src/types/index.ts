export interface Game {
  id: number;
  season: number;
  week: number;
  seasonType: 'regular' | 'postseason';
  startDate: string;
  startTimeTBD: boolean;
  completed: boolean;
  neutralSite: boolean;
  conferenceGame: boolean;
  attendance: number | null;
  venueId: number | null;
  venue: string | null;
  homeId: number;
  homeTeam: string;
  homeConference: string | null;
  homeClassification: string;
  homePoints: number | null;
  homeLineScores: number[] | null;
  homePostgameWinProbability: number | null;
  homePregameElo: number | null;
  homePostgameElo: number | null;
  awayId: number;
  awayTeam: string;
  awayConference: string | null;
  awayClassification: string;
  awayPoints: number | null;
  awayLineScores: number[] | null;
  awayPostgameWinProbability: number | null;
  awayPregameElo: number | null;
  awayPostgameElo: number | null;
  excitementIndex: number | null;
  highlights: string | null;
  notes: string | null;
}

export interface TeamRecord {
  year: number;
  teamId: number;
  team: string;
  conference: string | null;
  division: string | null;
  expectedWins: number | null;
  total: {
    games: number;
    wins: number;
    losses: number;
    ties: number;
  };
  conferenceGames: {
    games: number;
    wins: number;
    losses: number;
    ties: number;
  };
  homeGames: {
    games: number;
    wins: number;
    losses: number;
    ties: number;
  };
  awayGames: {
    games: number;
    wins: number;
    losses: number;
    ties: number;
  };
}

export interface PollRanking {
  rank: number;
  school: string;
  conference: string | null;
  firstPlaceVotes: number;
  points: number;
}

export interface RankingWeek {
  season: number;
  seasonType: string;
  week: number;
  polls: {
    poll: string;
    ranks: PollRanking[];
  }[];
}

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  publishedAt: string;
  source: string;
  summary: string;
}

export interface AppSettings {
  apiKey: string;
  season: number;
  scoreAlertsEnabled: boolean;
  newsAlertsEnabled: boolean;
  pollIntervalMinutes: number;
  startMinimized: boolean;
}

export interface ScoreboardGame {
  id: number;
  startDate: string;
  homeTeam: string;
  awayTeam: string;
  homePoints: number | null;
  awayPoints: number | null;
  homeConference: string | null;
  awayConference: string | null;
  homeClassification: string;
  awayClassification: string;
  conferenceGame: boolean;
  venue: string | null;
  status: string;
  period: number | null;
  clock: string | null;
  situation: string | null;
  possession: string | null;
  lastPlay: string | null;
  tv: string | null;
  betting: {
    spread: number | null;
    overUnder: number | null;
    homeMoneyline: number | null;
    awayMoneyline: number | null;
  } | null;
}

export type TabId = 'dashboard' | 'schedule' | 'rankings' | 'news' | 'settings';

export const TEAM_NAME = 'Texas Tech';
export const TEAM_SHORT = 'TTU';

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  season: new Date().getFullYear(),
  scoreAlertsEnabled: true,
  newsAlertsEnabled: true,
  pollIntervalMinutes: 2,
  startMinimized: false,
};
