import { useState, useEffect } from 'react';
import { Shield, Trash2, Ban, Eye, Settings, Users, Database, Flame } from 'lucide-react';
import { 
    fetchAdminDashboard, adminDeletePost, adminToggleBanUser, adminUpdateStats, 
    fetchAdminUsers, fetchAdminSettings, updateAdminSettings, fetchAdminAllPosts, fetchPostAuthor, regenerateDailyPrompt
} from '../api';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('moderation');
  
  const [stats, setStats] = useState({ users: 0, posts: 0, active_polls: 0 });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [allUsers, setAllUsers] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [sysSettings, setSysSettings] = useState({ 
    lockdown: false, maintenance: false, bots_enabled: false, media_enabled: true,
    bot_active_start: 9, bot_active_end: 23, daily_prompt: '' 
  });
  const [revealedAuthors, setRevealedAuthors] = useState({});

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    if (activeTab === 'moderation') {
        const data = await fetchAdminDashboard();
        if (data && !data.error) {
            setStats(data.stats);
            setQueue(data.queue);
            setError(null);
        } else {
            setError("Unauthorized. Admin privileges required.");
        }
    } else if (activeTab === 'users') {
        const data = await fetchAdminUsers();
        if (data && !data.error) setAllUsers(data);
    } else if (activeTab === 'all_posts') {
        const data = await fetchAdminAllPosts();
        if (data && !data.error) setAllPosts(data);
    } else if (activeTab === 'settings') {
        const data = await fetchAdminSettings();
        if (data && !data.error) setSysSettings(data);
    }
    setLoading(false);
  };

  const handleDeletePost = async (postId) => {
    await adminDeletePost(postId);
    await loadData();
  };

  const handleToggleBan = async (username) => {
    const confirmBan = window.confirm(`Toggle ban status for ${username}?`);
    if (confirmBan) {
      await adminToggleBanUser(username);
      await loadData();
    }
  };

  const handleEditStats = async (postId) => {
    const views = prompt("Enter new views count (leave blank to keep current):");
    const upvotes = prompt("Enter new upvotes count (leave blank to keep current):");
    const newStats = {};
    if (views !== null && views.trim() !== "") newStats.views = parseInt(views);
    if (upvotes !== null && upvotes.trim() !== "") newStats.upvotes = parseInt(upvotes);
    
    if (Object.keys(newStats).length > 0) {
      await adminUpdateStats(postId, newStats);
      alert("Stats updated!");
      await loadData();
    }
  };
  
  const handleRevealAuthor = async (postId) => {
      if (revealedAuthors[postId]) {
          setRevealedAuthors(prev => { const n = {...prev}; delete n[postId]; return n; });
          return;
      }
      const data = await fetchPostAuthor(postId);
      if (data && !data.error) {
          setRevealedAuthors(prev => ({ ...prev, [postId]: data }));
      }
  };
  
  const handleToggleSetting = async (key) => {
      const newVal = !sysSettings[key];
      setSysSettings(prev => ({ ...prev, [key]: newVal }));
      await updateAdminSettings({ [key]: newVal });
  };
  
  const handleSettingChange = async (key, value) => {
      setSysSettings(prev => ({ ...prev, [key]: value }));
      await updateAdminSettings({ [key]: value });
  };
  
  const handleRegeneratePrompt = async () => {
      const p = await regenerateDailyPrompt();
      if(p) setSysSettings(prev => ({ ...prev, daily_prompt: p }));
      alert("Daily prompt regenerated!");
  };

  if (loading && activeTab === 'moderation' && stats.users === 0) return <div className="page-content"><h2>Loading Dashboard...</h2></div>;
  if (error) return <div className="page-content"><h2>Access Denied</h2><p>{error}</p></div>;

  return (
    <div className="page-content">

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button className={`pill-tab ${activeTab === 'moderation' ? 'active' : ''}`} onClick={() => setActiveTab('moderation')} style={{ backgroundColor: activeTab === 'moderation' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'moderation' ? 'white' : 'var(--text-color)' }}>
            <Shield size={16} style={{ marginRight: '8px' }}/> Moderation
        </button>
        <button className={`pill-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')} style={{ backgroundColor: activeTab === 'users' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'users' ? 'white' : 'var(--text-color)' }}>
            <Users size={16} style={{ marginRight: '8px' }}/> Users
        </button>
        <button className={`pill-tab ${activeTab === 'all_posts' ? 'active' : ''}`} onClick={() => setActiveTab('all_posts')} style={{ backgroundColor: activeTab === 'all_posts' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'all_posts' ? 'white' : 'var(--text-color)' }}>
            <Database size={16} style={{ marginRight: '8px' }}/> All Posts
        </button>
        <button className={`pill-tab ${activeTab === 'ai_bots' ? 'active' : ''}`} onClick={() => setActiveTab('ai_bots')} style={{ backgroundColor: activeTab === 'ai_bots' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'ai_bots' ? 'white' : 'var(--text-color)' }}>
            <Flame size={16} style={{ marginRight: '8px' }}/> AI Bots
        </button>
        <button className={`pill-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} style={{ backgroundColor: activeTab === 'settings' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'settings' ? 'white' : 'var(--text-color)' }}>
            <Settings size={16} style={{ marginRight: '8px' }}/> System Controls
        </button>
      </div>

      {activeTab === 'moderation' && (
          <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="feed-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <h3>Total Users</h3>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-color)', marginTop: '1rem' }}>{stats.users}</div>
                </div>
                <div className="feed-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <h3>Total Posts</h3>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-color)', marginTop: '1rem' }}>{stats.posts}</div>
                </div>
                <div className="feed-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <h3>Active Polls</h3>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-color)', marginTop: '1rem' }}>{stats.active_polls}</div>
                </div>
              </div>

              <div className="feed-card" style={{ padding: '1.5rem' }}>
                <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Moderation Queue</h2>
                {queue.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No flagged items in the queue.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {queue.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            Post ID: {item.id} &bull; Display Identity: {item.author} &bull; {new Date(item.created_at).toLocaleString()}
                          </div>
                          <p style={{ marginBottom: '1rem' }}>{item.content}</p>
                          
                          {revealedAuthors[item.id] && (
                              <div style={{ padding: '0.5rem', backgroundColor: 'rgba(231, 76, 60, 0.1)', border: '1px solid var(--danger-color, red)', borderRadius: '8px', marginBottom: '0.5rem', display: 'inline-block' }}>
                                  <strong style={{ color: 'var(--danger-color, red)' }}>REAL AUTHOR:</strong> {revealedAuthors[item.id].username} 
                                  {revealedAuthors[item.id].is_registered ? ' (Registered)' : ' (Guest)'}
                              </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem', flexDirection: 'column' }}>
                          <button className="btn-glow" style={{ backgroundColor: 'var(--accent-color)', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleRevealAuthor(item.id)}>
                            <Eye size={16} /> Reveal Author
                          </button>
                          <button className="btn-glow" style={{ backgroundColor: 'var(--accent-color)', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleEditStats(item.id)}>
                            Edit Stats
                          </button>
                          <button className="btn-glow" style={{ backgroundColor: 'var(--danger-color, #e74c3c)', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleDeletePost(item.id)}>
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
          </>
      )}

      {activeTab === 'users' && (
          <div className="feed-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>User Management</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '0.5rem' }}>Username</th>
                          <th style={{ padding: '0.5rem' }}>Display Identity</th>
                          <th style={{ padding: '0.5rem' }}>Role</th>
                          <th style={{ padding: '0.5rem' }}>Posts</th>
                          <th style={{ padding: '0.5rem' }}>Status</th>
                          <th style={{ padding: '0.5rem' }}>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {allUsers.map(u => (
                          <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.75rem 0.5rem' }}>{u.username}</td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>{u.display_name}</td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                  <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', backgroundColor: u.role === 'admin' ? 'rgba(var(--accent-rgb), 0.2)' : 'var(--bg-elevated)', color: u.role === 'admin' ? 'var(--accent-color)' : 'var(--text-color)' }}>
                                      {u.role}
                                  </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>{u.post_count}</td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                  {u.is_banned ? <span style={{ color: 'var(--danger-color, red)', fontWeight: 'bold' }}>Banned</span> : <span style={{ color: 'green' }}>Active</span>}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                  {u.role !== 'admin' && (
                                      <button 
                                          className="btn-glow" 
                                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', backgroundColor: u.is_banned ? 'green' : 'var(--danger-color, red)' }}
                                          onClick={() => handleToggleBan(u.username)}
                                      >
                                          <Ban size={14} style={{ marginRight: '4px' }}/> {u.is_banned ? 'Unban' : 'Ban'}
                                      </button>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === 'all_posts' && (
          <div className="feed-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Unrestricted Content Search</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {allPosts.map(post => (
                      <div key={post.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: post.is_deleted ? 'rgba(231, 76, 60, 0.1)' : 'var(--bg-elevated)', borderRadius: '8px', border: post.is_deleted ? '1px solid var(--danger-color, red)' : 'none' }}>
                          <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                  Post ID: {post.id} &bull; Display Identity: {post.author_display} &bull; Upvotes: {post.upvotes} &bull; {new Date(post.created_at).toLocaleString()}
                                  {post.is_deleted && <strong style={{ color: 'var(--danger-color, red)', marginLeft: '10px' }}>(DELETED)</strong>}
                              </div>
                              <p style={{ marginBottom: '1rem' }}>{post.content}</p>
                              
                              {revealedAuthors[post.id] && (
                                  <div style={{ padding: '0.5rem', backgroundColor: 'rgba(231, 76, 60, 0.1)', border: '1px solid var(--danger-color, red)', borderRadius: '8px', marginBottom: '0.5rem', display: 'inline-block' }}>
                                      <strong style={{ color: 'var(--danger-color, red)' }}>REAL AUTHOR:</strong> {revealedAuthors[post.id].username} 
                                      {revealedAuthors[post.id].is_registered ? ' (Registered)' : ' (Guest)'}
                                  </div>
                              )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem', flexDirection: 'column' }}>
                              <button className="btn-glow" style={{ backgroundColor: 'var(--accent-color)', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleRevealAuthor(post.id)}>
                                <Eye size={16} /> Reveal Author
                              </button>
                              {!post.is_deleted && (
                                  <button className="btn-glow" style={{ backgroundColor: 'var(--danger-color, #e74c3c)', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleDeletePost(post.id)}>
                                    <Trash2 size={16} /> Delete
                                  </button>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'ai_bots' && (
          <div className="feed-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>AI Bot Network & Automation</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div>
                      <h3 style={{ marginBottom: '0.5rem' }}>Enable AI Bots</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Bots will randomly post, reply, and upvote content every 15 minutes.</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
                      <input type="checkbox" checked={sysSettings.bots_enabled} onChange={() => handleToggleSetting('bots_enabled')} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: sysSettings.bots_enabled ? 'var(--accent-color)' : '#ccc', transition: '.4s', borderRadius: '34px' }}>
                          <span style={{ position: 'absolute', content: '""', height: '26px', width: '26px', left: sysSettings.bots_enabled ? '30px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }} />
                      </span>
                  </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                  <div style={{ flex: 1, padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px' }}>
                      <h3 style={{ marginBottom: '1rem' }}>Active Hours (Start Hour)</h3>
                      <input 
                          type="number" min="0" max="23" 
                          value={sysSettings.bot_active_start || 9} 
                          onChange={(e) => handleSettingChange('bot_active_start', e.target.value)} 
                          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                      />
                  </div>
                  <div style={{ flex: 1, padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px' }}>
                      <h3 style={{ marginBottom: '1rem' }}>Active Hours (End Hour)</h3>
                      <input 
                          type="number" min="0" max="23" 
                          value={sysSettings.bot_active_end || 23} 
                          onChange={(e) => handleSettingChange('bot_active_end', e.target.value)} 
                          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                      />
                  </div>
              </div>

              <h2 style={{ marginBottom: '1.5rem', marginTop: '2rem' }}>Daily Prompt Generation</h2>
              <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Current Prompt of the Day:</p>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>{sysSettings.daily_prompt || 'None'}</div>
                  
                  <button className="btn-glow" onClick={handleRegeneratePrompt} style={{ backgroundColor: 'var(--accent-color)' }}>
                      Regenerate Prompt Now
                  </button>
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="feed-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Global System Toggles (Killswitches)</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div>
                      <h3 style={{ marginBottom: '0.5rem' }}>Lockdown Mode</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>When enabled, non-admin users cannot create new posts or replies. Existing posts remain visible.</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
                      <input type="checkbox" checked={sysSettings.lockdown} onChange={() => handleToggleSetting('lockdown')} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: sysSettings.lockdown ? 'var(--danger-color, red)' : '#ccc', transition: '.4s', borderRadius: '34px' }}>
                          <span style={{ position: 'absolute', content: '""', height: '26px', width: '26px', left: sysSettings.lockdown ? '30px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }} />
                      </span>
                  </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div>
                      <h3 style={{ marginBottom: '0.5rem' }}>Maintenance Mode</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>When enabled, the entire feed API is disabled and returns a 503 error for all non-admin users.</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
                      <input type="checkbox" checked={sysSettings.maintenance} onChange={() => handleToggleSetting('maintenance')} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: sysSettings.maintenance ? 'var(--danger-color, red)' : '#ccc', transition: '.4s', borderRadius: '34px' }}>
                          <span style={{ position: 'absolute', content: '""', height: '26px', width: '26px', left: sysSettings.maintenance ? '30px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }} />
                      </span>
                  </label>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <div>
                      <h3 style={{ marginBottom: '0.5rem' }}>Media Uploads (Images/Audio)</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>When disabled, users cannot upload files or record voice notes (9MB limit strictly enforced globally).</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
                      <input type="checkbox" checked={sysSettings.media_enabled !== false} onChange={() => handleToggleSetting('media_enabled')} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: sysSettings.media_enabled !== false ? 'green' : '#ccc', transition: '.4s', borderRadius: '34px' }}>
                          <span style={{ position: 'absolute', content: '""', height: '26px', width: '26px', left: sysSettings.media_enabled !== false ? '30px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }} />
                      </span>
                  </label>
              </div>
          </div>
      )}

    </div>
  );
}
