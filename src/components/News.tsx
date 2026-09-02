import type { NewsItem } from '../types';
import { formatNewsDate } from '../services/news';

interface NewsProps {
  news: NewsItem[];
}

export function News({ news }: NewsProps) {
  if (news.length === 0) {
    return (
      <div className="empty-state">
        <p>No news articles found.</p>
        <p style={{ marginTop: 8, fontSize: '0.875rem' }}>
          Check your internet connection and try refreshing.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Texas Tech Football News</h2>
        <span style={{ color: 'var(--ttu-gray-400)', fontSize: '0.875rem' }}>
          {news.length} articles
        </span>
      </div>
      <div className="news-list">
        {news.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
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
        <span className="news-date">{formatNewsDate(item.publishedAt)}</span>
      </div>
      <div className="news-source">{item.source}</div>
      {item.summary && (
        <div className="news-summary">{item.summary}</div>
      )}
    </div>
  );
}
