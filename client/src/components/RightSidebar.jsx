import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Users, Activity, BarChart2 } from 'lucide-react';
import { fetchSidebarStats, fetchSidebarPolls, votePoll } from '../api';
import { socket } from '../socket';

export default function RightSidebar() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total_posts_today: 0, online_users: 0, trending_tags: [] });
  const [polls, setPolls] = useState([]);
  const [votedPolls, setVotedPolls] = useState({});
  const [activities, setActivities] = useState(["Waiting for live activity..."]);

  useEffect(() => {
    fetchSidebarStats().then(data => setStats(data));
    fetchSidebarPolls().then(data => setPolls(data));

    const handleNewPost = (post) => {
      addActivity(`"${post.author}" just posted in ${post.topic || 'General'}`);
      setStats(prev => ({ ...prev, total_posts_today: prev.total_posts_today + 1 }));
    };
    
    const handleNotification = (data) => {
      addActivity(`Someone reacted ${data.type === 'upvote' ? '🔥' : '💬'} to a whisper`);
    };

    socket.on('new_post', handleNewPost);
    socket.on('new_notification', handleNotification);

    return () => {
      socket.off('new_post', handleNewPost);
      socket.off('new_notification', handleNotification);
    };
  }, []);

  const addActivity = (msg) => {
    setActivities(prev => {
      const newArr = [msg, ...prev];
      return newArr.slice(0, 3);
    });
  };

  const handleVote = async (pollId, optionId) => {
    if (votedPolls[pollId]) return;
    setVotedPolls(prev => ({ ...prev, [pollId]: optionId }));
    await votePoll(pollId, optionId);
    // Optimistically update poll counts
    setPolls(prev => prev.map(p => {
      if (p.id === pollId) {
        return {
          ...p,
          total_votes: p.total_votes + 1,
          options: p.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o)
        };
      }
      return p;
    }));
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/feed?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <aside className="right-sidebar">
      <div className="widget search-widget">
        <input 
          type="text" 
          placeholder="Search whispers, tags..." 
          className="composer-textarea search-input" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
        />
      </div>

      <div className="widget">
        <h3><Flame size={18} color="var(--primary)" /> Trending Tags</h3>
        <div className="tag-list">
          {stats.trending_tags.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No trending tags yet</span>
          ) : (
            stats.trending_tags.map(tag => (
              <span key={tag} className="trending-tag">{tag}</span>
            ))
          )}
        </div>
      </div>

      <div className="widget">
        <h3><Activity size={18} color="var(--accent-glow)" /> Live Activity</h3>
        <ul className="activity-list">
          {activities.map((act, i) => (
            <li key={i} style={{ animation: 'fadeIn 0.5s ease-in-out' }}>{act}</li>
          ))}
        </ul>
      </div>

      <div className="widget poll-widget" style={{ paddingBottom: '1rem' }}>
        <h3><BarChart2 size={18} color="var(--primary)" /> Campus Polls</h3>
        {polls.length === 0 ? (
          <p className="poll-q">AI is generating new polls...</p>
        ) : (
          <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', gap: '1rem', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: '0.5rem' }}>
            {polls.map((poll, index) => (
              <div key={poll.id} style={{ minWidth: '100%', scrollSnapAlign: 'start', position: 'relative' }}>
                <p className="poll-q">{poll.question}</p>
                <div className="poll-options">
                  {poll.options.map(opt => {
                    const pct = poll.total_votes > 0 ? Math.round((opt.votes / poll.total_votes) * 100) : 0;
                    const isVoted = votedPolls[poll.id] !== undefined;
                    const isMyVote = votedPolls[poll.id] === opt.id;
                    return (
                      <div 
                        key={opt.id} 
                        className="poll-option" 
                        onClick={() => handleVote(poll.id, opt.id)}
                        style={{
                          background: isMyVote ? 'rgba(108, 92, 231, 0.2)' : 'var(--bg-elevated)',
                          borderColor: isMyVote ? 'var(--accent-color)' : 'var(--border-color)',
                          cursor: isVoted ? 'default' : 'pointer',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {isVoted && (
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'rgba(108, 92, 231, 0.1)', zIndex: 0 }}></div>
                        )}
                        <span style={{ position: 'relative', zIndex: 1 }}>{opt.text}</span>
                        {isVoted && <span style={{ position: 'relative', zIndex: 1, float: 'right', fontWeight: 'bold' }}>{pct}%</span>}
                      </div>
                    );
                  })}
                </div>
                {polls.length > 1 && index < polls.length - 1 && (
                  <div style={{ textAlign: 'center', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Swipe left for more ➔
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="widget stats-widget">
        <h3><Users size={18} /> Community</h3>
        <p><strong>{stats.total_posts_today.toLocaleString()}</strong> whispers today</p>
        <p><strong>{stats.online_users.toLocaleString()}</strong> anonymous users online</p>
      </div>
    </aside>
  );
}
