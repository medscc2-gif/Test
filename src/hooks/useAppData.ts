import { useState, useEffect, useCallback, useRef } from 'react';
import type { Game, RankingWeek, TeamRecord, NewsItem, AppSettings } from '../types';
import {
  fetchSchedule,
  fetchRecord,
  fetchRankings,
  fetchScoreboard,
} from '../services/cfbd';
import { fetchNews, isSignificantNews } from '../services/news';
import { scoreAlertTracker } from '../services/alerts';
import { loadSettings } from '../services/storage';

interface AppData {
  games: Game[];
  record: TeamRecord | null;
  rankings: RankingWeek[];
  news: NewsItem[];
  liveGames: Game[];
}

interface UseAppDataResult {
  data: AppData;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  settings: AppSettings;
}

export function useAppData(settingsVersion = 0): UseAppDataResult {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [data, setData] = useState<AppData>({
    games: [],
    record: null,
    rankings: [],
    news: [],
    liveGames: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isFetching = useRef(false);

  const refresh = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    const currentSettings = loadSettings();
    setSettings(currentSettings);

    try {
      const hasApiKey = Boolean(currentSettings.apiKey);

      const gamesPromise = hasApiKey
        ? fetchSchedule(currentSettings.apiKey, currentSettings.season)
        : Promise.resolve([] as Game[]);

      const recordPromise = hasApiKey
        ? fetchRecord(currentSettings.apiKey, currentSettings.season).catch(() => null)
        : Promise.resolve(null);

      const rankingsPromise = hasApiKey
        ? fetchRankings(currentSettings.apiKey, currentSettings.season).catch(() => [])
        : Promise.resolve([] as RankingWeek[]);

      const [games, record, rankings, news] = await Promise.all([
        gamesPromise,
        recordPromise,
        rankingsPromise,
        fetchNews().catch(() => []),
      ]);

      if (!hasApiKey) {
        setData({
          games: [],
          record: null,
          rankings: [],
          news,
          liveGames: [],
        });
        setError('API key is required. Add your free CFBD API key in Settings.');
        setLastUpdated(new Date());
        setLoading(false);
        isFetching.current = false;
        return;
      }

      let liveGames: Game[] = [];
      if (currentSettings.apiKey) {
        try {
          const scoreboard = await fetchScoreboard(currentSettings.apiKey);
          const ttuLive = scoreboard.filter(
            (g) =>
              (g.homeTeam === 'Texas Tech' || g.awayTeam === 'Texas Tech') &&
              g.status === 'in_progress'
          );
          liveGames = ttuLive.map((g) => ({
            id: g.id,
            season: currentSettings.season,
            week: 0,
            seasonType: 'regular' as const,
            startDate: g.startDate,
            startTimeTBD: false,
            completed: false,
            neutralSite: false,
            conferenceGame: g.conferenceGame,
            attendance: null,
            venueId: null,
            venue: g.venue,
            homeId: 0,
            homeTeam: g.homeTeam,
            homeConference: g.homeConference,
            homeClassification: g.homeClassification,
            homePoints: g.homePoints,
            homeLineScores: null,
            homePostgameWinProbability: null,
            homePregameElo: null,
            homePostgameElo: null,
            awayId: 0,
            awayTeam: g.awayTeam,
            awayConference: g.awayConference,
            awayClassification: g.awayClassification,
            awayPoints: g.awayPoints,
            awayLineScores: null,
            awayPostgameWinProbability: null,
            awayPregameElo: null,
            awayPostgameElo: null,
            excitementIndex: null,
            highlights: null,
            notes: null,
          }));
        } catch {
          // Scoreboard may not be available off-season
        }
      }

      // Merge live scores into schedule
      const mergedGames = games.map((game) => {
        const live = liveGames.find((lg) => lg.id === game.id);
        if (live && live.homePoints !== null) {
          return { ...game, homePoints: live.homePoints, awayPoints: live.awayPoints, completed: false };
        }
        return game;
      });

      setData({
        games: mergedGames,
        record,
        rankings,
        news,
        liveGames,
      });
      setError(null);
      setLastUpdated(new Date());

      // Handle alerts
      if (currentSettings.scoreAlertsEnabled) {
        const alerts = scoreAlertTracker.checkGames([...mergedGames, ...liveGames]);
        for (const alert of alerts) {
          if (window.electronAPI) {
            await window.electronAPI.showNotification(alert.title, alert.body);
          } else if (Notification.permission === 'granted') {
            new Notification(alert.title, { body: alert.body });
          }
        }
      }

      if (currentSettings.newsAlertsEnabled) {
        for (const item of news.slice(0, 5)) {
          if (
            isSignificantNews(item.title) &&
            !scoreAlertTracker.hasSeenNews(item.id)
          ) {
            scoreAlertTracker.markNewsSeen(item.id);
            if (window.electronAPI) {
              await window.electronAPI.showNotification(
                '📰 Texas Tech Football News',
                item.title
              );
            } else if (Notification.permission === 'granted') {
              new Notification('📰 Texas Tech Football News', { body: item.title });
            }
          }
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();

    const currentSettings = loadSettings();
    const intervalMs = currentSettings.pollIntervalMinutes * 60 * 1000;
    const interval = setInterval(refresh, intervalMs);

    return () => clearInterval(interval);
  }, [refresh, settingsVersion]);

  useEffect(() => {
    if (window.electronAPI) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return { data, loading, error, lastUpdated, refresh, settings };
}
