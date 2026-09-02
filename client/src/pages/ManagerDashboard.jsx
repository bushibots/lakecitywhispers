import React, { useState, useEffect } from 'react';
import { apiFetch, createPost, deletePost, fetchAdminDatingProfiles, adminToggleDatingProfile, adminDeleteDatingProfile, forceAdminMatch } from '../api';
import { Shield, Trash2, Megaphone, Heart, Power, Zap, User, Search } from 'lucide-react';

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('community'); // 'community' | 'dating'
  
  // Community State
  const [managerHandles, setManagerHandles] = useState([]);
  const [activeHandle, setActiveHandle] = useState('');
  const [content, setContent] = useState('');
  const [posts, setPosts] = useState([]);
  const [posting, setPosting] = useState(false);
  
  // Dating State
  const [datingProfiles, setDatingProfiles] = useState([]);
  const [forceMatch1, setForceMatch1] = useState('');
  const [forceMatch2, setForceMatch2] = useState('');
  const [forcing, setForcing] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManagers();
    fetchDatingData();
  }, []);

  const fetchManagers = async () => {
    const data = await apiFetch('/managers/me');
    if (data && data.handles) {
      setManagerHandles(data.handles);
      if (data.handles.length > 0) setActiveHandle(data.handles[0]);
    }
    setLoading(false);
  };

  const fetchDatingData = async () => {
    const data = await fetchAdminDatingProfiles();
    if (data && !data.error) setDatingProfiles(data);
  };

  useEffect(() => {
    if (activeHandle && activeTab === 'community') fetchPosts();
  }, [activeHandle, activeTab]);

  const fetchPosts = async () => {
    const data = await apiFetch(`/posts?handle=${encodeURIComponent(activeHandle)}`);
    if (data && !data.error) setPosts(data);
  };

  const handlePostAnnouncement = async () => {
    if (!content.trim() || !activeHandle) return;
    setPosting(true);
    const res = await createPost(content.trim(), 'Campus', [], null, null, activeHandle, true);
    if (res && !res.error) {
      setContent('');
      fetchPosts();
    }
    setPosting(false);
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm("Delete this post?")) {
        const res = await deletePost(postId);
        if (res && !res.error) setPosts(posts.filter(p => p.id !== postId));
    }
  };

  const handleToggleDatingProfile = async (userId) => {
      const res = await adminToggleDatingProfile(userId);
      if (res && res.success) {
          setDatingProfiles(datingProfiles.map(p => p.user_id === userId ? { ...p, is_active: res.is_active } : p));
      }
  };

  const handleDeleteDatingProfile = async (userId) => {
      if (window.confirm("Permanently delete this dating profile?")) {
          const res = await adminDeleteDatingProfile(userId);
          if (res && res.success) {
              setDatingProfiles(datingProfiles.filter(p => p.user_id !== userId));
          }
      }
  };

  const handleForceMatch = async () => {
      if (!forceMatch1 || !forceMatch2) return;
      setForcing(true);
      const res = await forceAdminMatch(forceMatch1, forceMatch2);
      if (res && res.success) {
          alert('Force match successful!');
          setForceMatch1('');
          setForceMatch2('');
      } else {
          alert('Force match failed: ' + (res?.error || 'Unknown error'));
      }
      setForcing(false);
  };

  if (loading) return <div className="page-content">Loading dashboard...</div>;

  if (managerHandles.length === 0) {
    return (
        <div className="page-content empty-state">
            <Shield size={48} />
            <h2>Access Denied</h2>
            <p>You do not have manager privileges.</p>
        </div>
    );
  }

  return (
    <div className="page-content" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
            <Shield size={32} className="icon-teal" />
            <h1 style={{ margin: 0 }}>Manager Dashboard</h1>
        </div>

        {/* Tab Navigation */}
        <div className="pill-menu" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
            <button className={`pill-tab ${activeTab === 'community' ? 'active' : ''}`} onClick={() => setActiveTab('community')}>
                <Megaphone size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }}/> Community Posts
            </button>
            <button className={`pill-tab ${activeTab === 'dating' ? 'active' : ''}`} onClick={() => setActiveTab('dating')}>
                <Heart size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }}/> Dating Admin
            </button>
        </div>

        {activeTab === 'community' && (
            <div>
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
                            {posting ? 'Broadcasting...' : 'Broadcast'}
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Recent Activity in @{activeHandle}</h3>
                    {posts.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No posts found.</p>
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
                                        onClick={() => handleDeletePost(post.id)}
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
        )}

        {activeTab === 'dating' && (
            <div>
                {/* Force Match Tool */}
                <div className="widget" style={{ marginBottom: '2rem', border: '2px dashed var(--border-strong)' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#ff3366', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={20} /> Force Match Tool (Admin Only)
                    </h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        Enter two exact usernames to instantly create a mutual match and unlock their chat.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input 
                            type="text" 
                            className="border-input" 
                            placeholder="Username 1" 
                            value={forceMatch1}
                            onChange={e => setForceMatch1(e.target.value)}
                            style={{ flex: 1, minWidth: '200px' }}
                        />
                        <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>+</span>
                        <input 
                            type="text" 
                            className="border-input" 
                            placeholder="Username 2" 
                            value={forceMatch2}
                            onChange={e => setForceMatch2(e.target.value)}
                            style={{ flex: 1, minWidth: '200px' }}
                        />
                        <button 
                            className="btn-glow"
                            onClick={handleForceMatch}
                            disabled={forcing || !forceMatch1 || !forceMatch2}
                        >
                            {forcing ? 'Matching...' : 'Force Match'}
                        </button>
                    </div>
                </div>

                {/* Profiles Grid */}
                <h3 style={{ marginBottom: '1rem' }}>Dating Profiles Directory ({datingProfiles.length})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {datingProfiles.map(profile => (
                        <div key={profile.id} className="feed-card" style={{ padding: '1.25rem', marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: profile.image_url ? `url(${profile.image_url}) center/cover` : '#333', border: '2px solid var(--border)', flexShrink: 0 }}>
                                    {!profile.image_url && <User size={30} style={{ margin: '13px auto', display: 'block', color: '#666' }}/>}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        @{profile.username}
                                    </h4>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        ID: {profile.user_id} • {profile.gender} • {profile.age}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {profile.block} | {profile.course}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold', color: profile.is_active ? '#2ecc71' : '#e74c3c' }}>
                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: profile.is_active ? '#2ecc71' : '#e74c3c' }}></span>
                                    {profile.is_active ? 'ACTIVE' : 'SUSPENDED'}
                                </div>
                                
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        className="icon-btn tooltip"
                                        data-tip={profile.is_active ? "Suspend Profile" : "Activate Profile"}
                                        onClick={() => handleToggleDatingProfile(profile.user_id)}
                                    >
                                        <Power size={18} color={profile.is_active ? "var(--text-main)" : "#2ecc71"} />
                                    </button>
                                    <button 
                                        className="icon-btn tooltip"
                                        data-tip="Delete Profile"
                                        onClick={() => handleDeleteDatingProfile(profile.user_id)}
                                        style={{ color: '#FF5E5B' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {datingProfiles.length === 0 && (
                        <p style={{ color: 'var(--text-muted)' }}>No dating profiles found.</p>
                    )}
                </div>
            </div>
        )}
    </div>
  );
}
