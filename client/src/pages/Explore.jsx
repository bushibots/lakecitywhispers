import { useState, useEffect } from 'react';
import { Search, TrendingUp, Flame, MessageSquare, ArrowRight } from 'lucide-react';
import { fetchTrending, searchPosts, fetchDailyPrompt } from '../api';

export default function Explore() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [trending, setTrending] = useState([]);
  const [dailyPrompt, setDailyPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrending().then(data => setTrending(data));
    fetchDailyPrompt().then(p => setDailyPrompt(p));
  }, []);

  const handleSearch = async (e) => {
    if (e.key === 'Enter' && query.trim()) {
      setLoading(true);
      const data = await searchPosts(query.trim());
      setResults(data);
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
  };

  return (
    <div className="page-content">

      <div className="search-bar-large">
        <Search className="search-icon" />
        <input 
          type="text" 
          placeholder="Search whispers, topics, or identities... (Press Enter)" 
          className="composer-textarea" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearch}
        />
        {results !== null && (
          <button className="icon-btn-minimal" onClick={clearSearch} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>&times;</span>
          </button>
        )}
      </div>

      {loading && <p style={{ textAlign: 'center', marginTop: '2rem' }}>Searching...</p>}

      {results !== null && !loading && (
        <section className="explore-section">
          <h2>Search Results</h2>
          {results.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No whispers found for "{query}".</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {results.map(post => (
                <div key={post.id} className="feed-card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent-glow)' }}>{post.author}</span>
                    <span className="category-tag">{post.topic}</span>
                  </div>
                  <p>{post.content}</p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <span><Flame size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> {post.upvotes}</span>
                    <span><MessageSquare size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> {post.reply_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {results === null && !loading && (
        <>
          <section className="explore-section">
            <h2><TrendingUp className="icon-teal" /> Trending Topics</h2>
            <div className="trending-grid">
              {trending.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No trending topics yet.</p>
              ) : (
                trending.map(t => (
                  <div key={t.rank} className="trending-card" onClick={() => { setQuery(t.topic); handleSearch({ key: 'Enter' }); }}>
                    <span className="rank">#{t.rank}</span>
                    <div>
                      <h4>{t.topic}</h4>
                      <p>{t.count} Whispers</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="explore-section mt-4">
            <h2><Flame className="icon-teal" /> Daily Prompt</h2>
            <div className="prompt-card">
              <h3>"{dailyPrompt ? dailyPrompt.content : "Loading..."}"</h3>
              <p className="mt-2 text-muted">Join the conversation on the Feed page!</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
