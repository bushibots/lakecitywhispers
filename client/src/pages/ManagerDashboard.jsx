import React, { useState, useEffect } from 'react';
import { apiFetch, createPost, deletePost } from '../api';
import { Shield, Trash2, Megaphone } from 'lucide-react';

export default function ManagerDashboard() {
  const [managerHandles, setManagerHandles] = useState([]);
  const [activeHandle, setActiveHandle] = useState('');
  const [content, setContent] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    const data = await apiFetch('/managers/me');
    if (data && data.handles) {
      setManagerHandles(data.handles);
      if (data.handles.length > 0) {
        setActiveHandle(data.handles[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeHandle) {
      fetchPosts();
    }
  }, [activeHandle]);

  const fetchPosts = async () => {
    const data = await apiFetch(`/posts?handle=${encodeURIComponent(activeHandle)}`);
    if (data && !data.error) {
      setPosts(data);
    }
  };

  const handlePostAnnouncement = async () => {
    if (!content.trim() || !activeHandle) return;
    setPosting(true);
    
    // createPost(content, topic, pollOptions, imageUrl, audioUrl, handle, isAnnouncement)
    const res = await createPost(content.trim(), 'Campus', [], null, null, activeHandle, true);
    if (res && !res.error) {
      setContent('');
      fetchPosts();
    }
    setPosting(false);
  };

  const handleDelete = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
        const res = await deletePost(postId);
        if (res && !res.error) {
            setPosts(posts.filter(p => p.id !== postId));
        }
    }
  };

  if (loading) return <div className="page-content">Loading dashboard...</div>;

  if (managerHandles.length === 0) {
    return (
        <div className="page-content empty-state">
            <Shield size={48} />
            <h2>Access Denied</h2>
            <p>You do not have manager privileges for any departments.</p>
        </div>
    );
  }

  return (
    <div className="page-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
            <Shield size={32} className="icon-teal" />
            <h1 style={{ margin: 0 }}>Manager Dashboard</h1>
        </div>

        <div className="widget">
            <h3 style={{ marginBottom: '1rem' }}>Select Department</h3>
            <select 
                className="select-pill" 
                value={activeHandle} 
                onChange={(e) => setActiveHandle(e.target.value)}
                style={{ width: '100%', maxWidth: '300px' }}
            >
                {managerHandles.map(h => <option key={h} value={h} style={{ background: '#16181C' }}>@{h}</option>)}
            </select>
        </div>

        <div className="composer-box" style={{ marginTop: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F2C94C', marginBottom: '1rem' }}>
                <Megaphone size={20} /> Post Official Announcement
            </h3>
            <textarea 
              className="composer-textarea border-input" 
              rows="4"
              placeholder={`Write an official announcement for @${activeHandle}...`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}
            ></textarea>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <span className="char-count" style={{ color: content.length > 500 ? 'red' : 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {content.length}/500
                </span>
                <button 
                    className="btn-glow" 
                    onClick={handlePostAnnouncement} 
                    disabled={posting || !content.trim() || content.length > 500}
                    style={{ background: 'linear-gradient(135deg, #F2C94C, #F2994A)', color: '#000' }}
                >
                    {posting ? 'Broadcasting...' : 'Broadcast Announcement'}
                </button>
            </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Recent Activity in @{activeHandle}</h3>
            {posts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No posts found in this department.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {posts.map(post => (
                        <div key={post.id} className="feed-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1rem', marginBottom: 0 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    Posted by <strong>{post.author_username}</strong> {post.is_announcement && <span style={{ color: '#F2C94C' }}>• Announcement</span>}
                                </div>
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.95rem' }}>
                                    {post.content}
                                </p>
                            </div>
                            <button 
                                onClick={() => handleDelete(post.id)}
                                className="icon-btn tooltip" 
                                data-tip="Delete Post"
                                style={{ color: '#FF5E5B', marginLeft: '1rem' }}
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}
