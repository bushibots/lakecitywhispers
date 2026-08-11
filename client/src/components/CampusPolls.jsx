import { useState, useEffect } from 'react';
import { BarChart2 } from 'lucide-react';
import { fetchSidebarPolls, votePoll } from '../api';

export default function CampusPolls({ className = '' }) {
  const [polls, setPolls] = useState([]);
  const [votedPolls, setVotedPolls] = useState({});

  useEffect(() => {
    fetchSidebarPolls().then(data => setPolls(data));
  }, []);

  const handleVote = async (pollId, optionId) => {
    if (votedPolls[pollId]) return;
    setVotedPolls(prev => ({ ...prev, [pollId]: optionId }));
    await votePoll(pollId, optionId);
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

  return (
    <div className={`widget poll-widget ${className}`} style={{ paddingBottom: '1rem' }}>
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
  );
}
