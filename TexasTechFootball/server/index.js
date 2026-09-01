/**
 * Texas Tech Football Push Notification Server
 *
 * Polls ESPN for score/news changes and sends HTTP-based push alerts
 * to registered devices. For production APNs delivery, set APNS_* env vars
 * or integrate with a service like OneSignal/Firebase.
 *
 * Environment variables:
 *   PORT                  - Server port (default 3000)
 *   POLL_INTERVAL_MS      - ESPN poll interval (default 60000)
 *   APNS_KEY_ID           - Apple APNs key ID (optional)
 *   APNS_TEAM_ID          - Apple Developer Team ID (optional)
 *   APNS_KEY_PATH         - Path to .p8 auth key (optional)
 *   APNS_BUNDLE_ID        - App bundle ID (default com.example.TexasTechFootball)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 60000);
const ESPN_TEAM_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/2641';
const ESPN_SCHEDULE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/2641/schedule';
const ESPN_NEWS_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/news?team=2641';

const RIVAL_ABBRS = new Set(['TCU', 'BAY', 'TEX', 'UT', 'OKST', 'TA&M', 'TAMU']);

const devices = new Map();
const stateFile = path.join(__dirname, 'state.json');
let state = loadState();

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return { lastNewsIds: [], lastGameStatuses: {}, lastScores: {} };
  }
}

function saveState() {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`ESPN error ${response.status}`);
  return response.json();
}

function parseGame(event) {
  const competition = event.competitions?.[0];
  if (!competition) return null;
  const tech = competition.competitors?.find((c) => c.team?.id === '2641');
  const opp = competition.competitors?.find((c) => c.team?.id !== '2641');
  if (!tech || !opp) return null;
  return {
    id: String(event.id),
    status: competition.status?.type?.name || 'STATUS_SCHEDULED',
    techScore: tech.score,
    oppScore: opp.score,
    opponent: opp.team?.abbreviation || opp.team?.displayName,
    isRival: RIVAL_ABBRS.has(opp.team?.abbreviation),
    name: event.name,
  };
}

async function pollESPN() {
  try {
    const [scheduleData, newsData] = await Promise.all([
      fetchJSON(ESPN_SCHEDULE_URL),
      fetchJSON(ESPN_NEWS_URL),
    ]);

    const games = (scheduleData.events || []).map(parseGame).filter(Boolean);
    const articles = newsData.articles || [];

    for (const game of games) {
      const prevStatus = state.lastGameStatuses[game.id];
      const prevScore = state.lastScores[game.id];

      if (prevStatus && prevStatus !== 'STATUS_FINAL' && game.status === 'STATUS_FINAL') {
        const prefix = game.isRival ? '🔥 Rivalry Final' : 'Final Score';
        await broadcast({
          title: `${prefix}: Texas Tech`,
          body: `${game.name} — ${game.techScore}-${game.oppScore}`,
          type: game.isRival ? 'rivalry' : 'score',
        });
      }

      if (game.status === 'STATUS_IN_PROGRESS') {
        const scoreKey = `${game.techScore}-${game.oppScore}`;
        if (prevScore && prevScore !== scoreKey) {
          await broadcast({
            title: 'Live: Texas Tech',
            body: `${game.opponent} ${game.oppScore} - ${game.techScore} TTU`,
            type: 'live',
          });
        }
        state.lastScores[game.id] = scoreKey;
      }

      state.lastGameStatuses[game.id] = game.status;
    }

    const newsIds = articles.map((a) => String(a.id));
    const newArticles = newsIds.filter((id) => !state.lastNewsIds.includes(id));
    if (state.lastNewsIds.length > 0 && newArticles.length > 0) {
      const article = articles.find((a) => String(a.id) === newArticles[0]);
      await broadcast({
        title: 'Texas Tech Football News',
        body: article?.headline || 'New article published',
        type: 'news',
      });
    }
    state.lastNewsIds = newsIds.slice(0, 50);
    saveState();
  } catch (error) {
    console.error('Poll failed:', error.message);
  }
}

async function broadcast(payload) {
  console.log(`[PUSH] ${payload.title}: ${payload.body}`);
  for (const [token, device] of devices) {
    await sendPush(token, payload, device);
  }
}

async function sendPush(token, payload, device) {
  // Production: integrate @parse/node-apn or HTTP/2 APNs here using env vars.
  // This stub logs delivery and stores pending notifications for debugging.
  const entry = {
    token: token.slice(0, 8) + '…',
    platform: device.platform,
    payload,
    sentAt: new Date().toISOString(),
  };
  console.log('  →', JSON.stringify(entry));

  if (process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_KEY_PATH) {
    // APNs HTTP/2 integration point — add apn provider when keys are configured.
    console.log('  (APNs keys detected — wire up apn provider for real delivery)');
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, devices: devices.size }));
  }

  if (req.url === '/register' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      if (!body.token) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'token required' }));
      }
      devices.set(body.token, {
        platform: body.platform || 'ios',
        team: body.team || 'texas-tech',
        registeredAt: new Date().toISOString(),
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, deviceCount: devices.size }));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'invalid JSON' }));
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  console.log(`Texas Tech push server running on port ${PORT}`);
  pollESPN();
  setInterval(pollESPN, POLL_INTERVAL_MS);
});
