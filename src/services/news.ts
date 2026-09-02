import type { NewsItem } from '../types';

const NEWS_RSS_URL =
  'https://news.google.com/rss/search?q=Texas+Tech+Red+Raiders+football&hl=en-US&gl=US&ceid=US:en';

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function parseRssDate(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function extractSource(title: string): { cleanTitle: string; source: string } {
  const match = title.match(/^(.+?)\s*-\s*(.+)$/);
  if (match) {
    return { cleanTitle: match[1].trim(), source: match[2].trim() };
  }
  return { cleanTitle: title, source: 'News' };
}

export async function fetchNews(): Promise<NewsItem[]> {
  const response = await fetch(NEWS_RSS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch news (${response.status})`);
  }

  const xml = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const items = doc.querySelectorAll('item');

  const news: NewsItem[] = [];
  items.forEach((item, index) => {
    const rawTitle = item.querySelector('title')?.textContent || '';
    const link = item.querySelector('link')?.textContent || '';
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    const description = item.querySelector('description')?.textContent || '';

    const title = decodeHtmlEntities(rawTitle);
    const { cleanTitle, source } = extractSource(title);

    news.push({
      id: `news-${index}-${link}`,
      title: cleanTitle,
      link,
      publishedAt: parseRssDate(pubDate),
      source,
      summary: stripHtml(decodeHtmlEntities(description)).slice(0, 300),
    });
  });

  return news.slice(0, 30);
}

export function isSignificantNews(title: string): boolean {
  const keywords = [
    'injury',
    'injured',
    'transfer',
    'commit',
    'commits',
    'fired',
    'hired',
    'bowl',
    'playoff',
    'cfp',
    'ranked',
    'ranking',
    'upset',
    'championship',
    'conference',
    'big 12',
    'coach',
    'quarterback',
    'qb',
    'recruit',
    'signing',
    'draft',
    'suspension',
    'arrest',
    'scandal',
    'breaking',
    'announces',
    'named',
    'selected',
    'win',
    'loss',
    'defeat',
    'victory',
    'score',
    'touchdown',
    'record',
    'milestone',
    'heisman',
    'all-american',
    'all american',
  ];

  const lower = title.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

export function formatNewsDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffHours < 48) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
