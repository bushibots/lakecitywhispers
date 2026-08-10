import { useState, useEffect } from 'react';
import { Shield, Trash2, Ban, Eye, Settings, Users, Database, Flame, Edit3 } from 'lucide-react';
import { 
    fetchAdminDashboard, adminDeletePost, adminToggleBanUser, adminTogglePermanentBot, adminUpdateStats, 
    fetchAdminUsers, fetchAdminSettings, updateAdminSettings, fetchAdminAllPosts, fetchPostAuthor, regenerateDailyPrompt,
    sendAdminBroadcast, fetchAdminConversations, adminForgePost, adminSpawnBots, adminWipeUser
} from '../api';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('moderation');
  
  const [stats, setStats] = useState({ users: 0, posts: 0, active_polls: 0 });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [allUsers, setAllUsers] = useState([]);
  const [userTab, setUserTab] = useState('real'); // 'real' or 'bots'
  const [allPosts, setAllPosts] = useState([]);
  const [adminChats, setAdminChats] = useState([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  
  // Bot spawning state
  const [botSpawnCount, setBotSpawnCount] = useState(1);
  const [botSpawnTopic, setBotSpawnTopic] = useState('');
  const [isSpawning, setIsSpawning] = useState(false);
  const [sysSettings, setSysSettings] = useState({ 
    lockdown: false, maintenance: false, bots_enabled: false, media_enabled: true,
    bot_active_start: 9, bot_active_end: 23, daily_prompt: '' 
  });
  
  const [forgeContent, setForgeContent] = useState('');
  const [forgeTopic, setForgeTopic] = useState('General');
  const [forgeAuthor, setForgeAuthor] = useState('');
  const [forgeLoading, setForgeLoading] = useState(false);
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
    } else if (activeTab === 'all_chats') {
        const data = await fetchAdminConversations();
        setAdminChats(data);
    }
    setLoading(false);
  };

  const handleDeletePost = async (postId) => {
    await adminDeletePost(postId);
    await loadData();
  };

  const handleToggleBan = async (userId, displayName) => {
    const confirmBan = window.confirm(`Toggle ban status for ${displayName}?`);
    if (confirmBan) {
      await adminToggleBanUser(userId);
      await loadData();
    }
  };

  const handleTogglePermanent = async (userId, displayName, isPermanent) => {
    const confirmPerm = window.confirm(`Make ${displayName} a ${isPermanent ? 'normal (auto-deleting)' : 'permanent'} bot?`);
    if (confirmPerm) {
      await adminTogglePermanentBot(userId);
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

  const handleForgePost = async (e) => {
    e.preventDefault();
    if (!forgeContent.trim()) return alert("Content cannot be empty.");
    setForgeLoading(true);
    const res = await adminForgePost(forgeContent, forgeTopic, forgeAuthor);
    setForgeLoading(false);
    if (res && !res.error) {
      alert("Post successfully forged!");
      setForgeContent('');
      setForgeAuthor('');
      await loadData();
    } else {
      alert(res.error || "Failed to forge post.");
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    await sendAdminBroadcast(broadcastMsg);
    setBroadcastMsg('');
    alert('Broadcast sent!');
  };

  const handleSpawnBots = async () => {
    setIsSpawning(true);
    const res = await adminSpawnBots(botSpawnCount, botSpawnTopic);
    setIsSpawning(false);
    if (res && !res.error) {
      alert(`Bots successfully generated: ${res.message}`);
      await loadData();
    } else {
      alert(res?.error || "Failed to spawn bots.");
    }
  };
  
  const handleWipeUser = async (username) => {
    const confirm1 = window.confirm(`Are you absolutely sure you want to WIPE user ${username}? This cannot be undone and will delete all their content forever.`);
    if (confirm1) {
        const confirm2 = window.prompt("Type 'WIPE' to confirm.");
        if (confirm2 === 'WIPE') {
            const res = await adminWipeUser(username);
            if (res && res.message) {
                alert(res.message);
                await loadData();
            } else {
                alert(res?.error || "Failed to wipe user.");
            }
        }
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Compress client-side
    const compressImage = (f, maxSizeKB) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width, height = img.height;
            const MAX = 400; // Smaller for logo
            if (width > height && width > MAX) { height *= MAX / width; width = MAX; }
            else if (height > MAX) { width *= MAX / height; height = MAX; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            let quality = 0.9;
            const step = () => {
              canvas.toBlob((blob) => {
                if (blob.size / 1024 > maxSizeKB && quality > 0.2) {
                  quality -= 0.1;
                  step();
                } else {
                  resolve(new File([blob], f.name, { type: 'image/jpeg' }));
                }
              }, 'image/jpeg', quality);
            };
            step();
          };
        };
      });
    };

    alert("Uploading and compressing logo...");
    const compressed = await compressImage(file, 500); // 500kb for logo

    const formData = new FormData();
    formData.append('file', compressed);
    const token = localStorage.getItem('jluwhisper_session');
    
    try {
      const upRes = await fetch((import.meta.env.VITE_API_URL || 'https://lakecity-whispers-backend.onrender.com/api') + '/upload', {
        method: 'POST', headers: { "Authorization": token }, body: formData
      });
      const upData = await upRes.json();
      if (upData.url) {
        setSysSettings(prev => ({ ...prev, site_logo: upData.url }));
        await updateAdminSettings({ site_logo: upData.url });
        alert("Logo updated globally! Please refresh the page to see changes.");
      }
    } catch(err) {
      alert("Upload failed.");
    }
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
        <button className={`pill-tab ${activeTab === 'all_chats' ? 'active' : ''}`} onClick={() => setActiveTab('all_chats')} style={{ backgroundColor: activeTab === 'all_chats' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'all_chats' ? 'white' : 'var(--text-color)' }}>
            <Eye size={16} style={{ marginRight: '8px' }}/> All Chats
        </button>
        <button className={`pill-tab ${activeTab === 'broadcast' ? 'active' : ''}`} onClick={() => setActiveTab('broadcast')} style={{ backgroundColor: activeTab === 'broadcast' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'broadcast' ? 'white' : 'var(--text-color)' }}>
            <Flame size={16} style={{ marginRight: '8px' }}/> Broadcast
        </button>
        <button className={`pill-tab ${activeTab === 'ai_bots' ? 'active' : ''}`} onClick={() => setActiveTab('ai_bots')} style={{ backgroundColor: activeTab === 'ai_bots' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'ai_bots' ? 'white' : 'var(--text-color)' }}>
            <Flame size={16} style={{ marginRight: '8px' }}/> AI Bots
        </button>
        <button className={`pill-tab ${activeTab === 'forge' ? 'active' : ''}`} onClick={() => setActiveTab('forge')} style={{ backgroundColor: activeTab === 'forge' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'forge' ? 'white' : 'var(--text-color)' }}>
            <Edit3 size={16} style={{ marginRight: '8px' }}/> Forge Whisper
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

      {activeTab === 'users' && userTab === 'bots' && (
          <div className="feed-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Manual Bot Controller</h2>
              <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                      Automatically generate AI users, posts, and replies instantly.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Number of Actions (Max 10)</label>
                          <input 
                              type="number" 
                              className="composer-textarea border-input" 
                              style={{ width: '100%', height: '40px', padding: '0.5rem' }} 
                              value={botSpawnCount} 
                              onChange={(e) => setBotSpawnCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} 
                              min="1" max="10" 
                          />
                      </div>
                      <div style={{ flex: 2 }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Topic / Context (Optional)</label>
                          <input 
                              type="text" 
                              className="composer-textarea border-input" 
                              style={{ width: '100%', height: '40px', padding: '0.5rem' }} 
                              value={botSpawnTopic} 
                              onChange={(e) => setBotSpawnTopic(e.target.value)} 
                              placeholder="e.g. exams, pizza, dating..." 
                          />
                      </div>
                  </div>

                  <button className="btn-glow" onClick={handleSpawnBots} disabled={isSpawning} style={{ backgroundColor: 'var(--accent-color)' }}>
                      {isSpawning ? 'Spawning AI Activity...' : 'Spawn AI Activity Now'}
                  </button>
              </div>
          </div>
      )}

      {activeTab === 'users' && (
          <div className="feed-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>User Management</h2>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <button 
                  style={{ background: 'none', border: 'none', color: userTab === 'real' ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: userTab === 'real' ? 'bold' : 'normal', cursor: 'pointer' }}
                  onClick={() => setUserTab('real')}
                >
                  Real Users
                </button>
                <button 
                  style={{ background: 'none', border: 'none', color: userTab === 'bots' ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: userTab === 'bots' ? 'bold' : 'normal', cursor: 'pointer' }}
                  onClick={() => setUserTab('bots')}
                >
                  AI Bots
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                  {allUsers.filter(u => userTab === 'bots' ? u.is_bot : !u.is_bot).map(u => (
                      <div key={u.id} className="feed-card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: u.is_banned ? 'rgba(231, 76, 60, 0.05)' : 'var(--bg-elevated)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1.2rem' }}>
                                      {u.display_name} {u.is_bot && '🤖'} {u.is_permanent && '🛡️'}
                                  </h3>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>@{u.username}</div>
                              </div>
                              <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: u.role === 'admin' ? 'rgba(var(--accent-rgb), 0.2)' : 'var(--bg-card)', color: u.role === 'admin' ? 'var(--accent-color)' : 'var(--text-muted)' }}>
                                  {u.role.toUpperCase()}
                              </span>
                          </div>
                          
                          <div style={{ fontSize: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                              {u.is_registered && <span style={{ padding: '4px 8px', backgroundColor: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', borderRadius: '4px', fontWeight: 'bold' }}>✓ Registered</span>}
                              {u.is_banned ? <span style={{ padding: '4px 8px', backgroundColor: 'rgba(231, 76, 60, 0.15)', color: 'var(--danger-color, red)', borderRadius: '4px', fontWeight: 'bold' }}>Banned</span> : <span style={{ padding: '4px 8px', backgroundColor: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', borderRadius: '4px', fontWeight: 'bold' }}>Active</span>}
                              <span style={{ padding: '4px 8px', backgroundColor: 'var(--bg-card)', borderRadius: '4px', color: 'var(--text-muted)' }}>{u.post_count} Posts</span>
                              <span style={{ padding: '4px 8px', backgroundColor: 'var(--bg-card)', borderRadius: '4px', color: 'var(--text-muted)' }}>{u.created_at !== "Unknown" ? new Date(u.created_at).toLocaleDateString() : 'Unknown'}</span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                              {u.role !== 'admin' && (
                                  <>
                                      <button 
                                          className="btn-glow" 
                                          style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', backgroundColor: u.is_banned ? '#2ecc71' : 'var(--danger-color, red)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}
                                          onClick={() => handleToggleBan(u.id, u.display_name)}
                                      >
                                          <Ban size={14} /> {u.is_banned ? 'Unban User' : 'Ban User'}
                                      </button>
                                      {u.is_bot && (
                                          <button 
                                              className="btn-glow" 
                                              style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', backgroundColor: u.is_permanent ? 'var(--accent-color)' : 'var(--bg-card)', color: u.is_permanent ? 'black' : 'var(--text-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}
                                              onClick={() => handleTogglePermanent(u.id, u.display_name, u.is_permanent)}
                                              title={u.is_permanent ? "Remove Permanent Status" : "Make Permanent"}
                                          >
                                              <Shield size={14} /> {u.is_permanent ? 'Perm Bot' : 'Make Perm'}
                                          </button>
                                      )}
                                      <button 
                                          className="btn-glow" 
                                          style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', backgroundColor: 'var(--danger-color, red)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}
                                          onClick={() => handleWipeUser(u.username)}
                                          title="Completely Wipe User & All Posts"
                                      >
                                          <Trash2 size={14} /> Wipe
                                      </button>
                                  </>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'all_posts' && (
          <div className="feed-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Unrestricted Content Search</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                  {allPosts.map(post => (
                      <div key={post.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', backgroundColor: post.is_deleted ? 'rgba(231, 76, 60, 0.05)' : 'var(--bg-elevated)', borderRadius: '8px', border: post.is_deleted ? '1px solid var(--danger-color, red)' : '1px solid var(--border-color)' }}>
                          <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                      Post ID: {post.id} &bull; Upvotes: {post.upvotes}
                                      {post.is_deleted && <strong style={{ color: 'var(--danger-color, red)', marginLeft: '10px' }}>(DELETED)</strong>}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      {new Date(post.created_at).toLocaleDateString()}
                                  </div>
                              </div>
                              <p style={{ margin: '0.5rem 0', wordBreak: 'break-word', fontSize: '0.95rem' }}>{post.content}</p>
                              
                              <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>
                                  Display Identity: {post.author_display}
                              </div>

                              {revealedAuthors[post.id] && (
                                  <div style={{ padding: '0.5rem', backgroundColor: 'rgba(231, 76, 60, 0.1)', border: '1px solid var(--danger-color, red)', borderRadius: '8px', marginBottom: '0.5rem', display: 'inline-block' }}>
                                      <strong style={{ color: 'var(--danger-color, red)' }}>REAL AUTHOR:</strong> {revealedAuthors[post.id].username} 
                                      {revealedAuthors[post.id].is_registered ? ' (Registered)' : ' (Guest)'}
                                  </div>
                              )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                              <button 
                                  className="btn-glow" 
                                  style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', backgroundColor: 'var(--bg-card)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}
                                  onClick={() => handleRevealAuthor(post.id)}
                              >
                                  <Eye size={14} /> Reveal Author
                              </button>
                              <button 
                                  className="btn-glow" 
                                  style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', backgroundColor: post.is_deleted ? 'var(--bg-card)' : 'var(--danger-color, red)', color: post.is_deleted ? 'var(--text-muted)' : 'white', opacity: post.is_deleted ? 0.5 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}
                                  onClick={() => handleDeletePost(post.id)}
                                  disabled={post.is_deleted}
                              >
                                  <Trash2 size={14} /> {post.is_deleted ? 'Deleted' : 'Delete'}
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'ai_bots' && (
          <div className="feed-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>AI Bot Network & Automation</h2>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div>
                      <h3 style={{ marginBottom: '0.5rem' }}>Enable AI Bots</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Bots will randomly post, reply, and upvote content every 15 minutes.</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
                      <input type="checkbox" checked={sysSettings.bots_enabled} onChange={() => handleToggleSetting('bots_enabled')} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: sysSettings.bots_enabled ? 'var(--primary)' : 'var(--border-strong)', transition: '.4s', borderRadius: '34px' }}>
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
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ flex: 1, marginRight: '1rem' }}>
                      <h3 style={{ marginBottom: '0.5rem' }}>Global Site Name</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Change the display text for the site across the header/sidebar.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" className="composer-textarea border-input" style={{ width: '200px', height: '40px', padding: '0.5rem' }} value={sysSettings.site_name || ''} onChange={(e) => setSysSettings(prev => ({ ...prev, site_name: e.target.value }))} placeholder="JLU Whisper" />
                      <button className="btn-glow" onClick={() => handleSettingChange('site_name', sysSettings.site_name || 'JLU Whisper')}>Save</button>
                  </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ flex: 1, marginRight: '1rem' }}>
                      <h3 style={{ marginBottom: '0.5rem' }}>Global Theme</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Change the visual theme of the site for all users instantly.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select 
                          className="composer-textarea border-input" 
                          style={{ width: '200px', height: '40px', padding: '0.5rem' }} 
                          value={sysSettings.global_theme || 't-default'} 
                          onChange={(e) => {
                              handleSettingChange('global_theme', e.target.value);
                              document.body.className = e.target.value; // Optimistic local update
                          }}
                      >
                          <option value="t-default">Default (Dark)</option>
                          <option value="t-aurora">Aurora (Premium Glassmorphism)</option>
                          <option value="t-cyber">Cyberpunk (Neon)</option>
                          <option value="t-space">Space (Deep Nebula)</option>
                          <option value="t-inverted">Inverted (Light Mode)</option>
                          <option value="t-retro">Retro (Arcade Style)</option>
                          <option value="t-india">Independence Day 🇮🇳</option>
                      </select>
                  </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div>
                      <h3 style={{ marginBottom: '0.5rem' }}>Global Site Logo</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Upload a custom logo to replace the default JLU Whisper text globally. (Max 500KB)</p>
                      {sysSettings.site_logo && (
                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <img src={sysSettings.site_logo} alt="Site Logo" style={{ height: '40px', objectFit: 'contain' }} />
                          <button className="btn-glow" style={{ backgroundColor: 'var(--danger-color, red)', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => { setSysSettings(prev => ({ ...prev, site_logo: '' })); updateAdminSettings({ site_logo: '' }); }}>
                            <Trash2 size={14}/> Remove Logo
                          </button>
                        </div>
                      )}
                  </div>
                  <div>
                      <label className="btn-glow" style={{ cursor: 'pointer', display: 'inline-block' }}>
                          Upload Logo
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                      </label>
                  </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div>
                      <h3 style={{ marginBottom: '0.5rem' }}>Lockdown Mode</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>When enabled, non-admin users cannot create new posts or replies. Existing posts remain visible.</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
                      <input type="checkbox" checked={sysSettings.lockdown} onChange={() => handleToggleSetting('lockdown')} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: sysSettings.lockdown ? 'var(--danger-color, #ff4757)' : 'var(--border-strong)', transition: '.4s', borderRadius: '34px' }}>
                          <span style={{ position: 'absolute', content: '""', height: '26px', width: '26px', left: sysSettings.lockdown ? '30px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }} />
                      </span>
                  </label>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div>
                      <h3 style={{ marginBottom: '0.5rem' }}>Maintenance Mode</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>When enabled, the entire feed API is disabled and returns a 503 error for all non-admin users.</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
                      <input type="checkbox" checked={sysSettings.maintenance} onChange={() => handleToggleSetting('maintenance')} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: sysSettings.maintenance ? 'var(--danger-color, #ff4757)' : 'var(--border-strong)', transition: '.4s', borderRadius: '34px' }}>
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
                      <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: sysSettings.media_enabled !== false ? 'var(--primary)' : 'var(--border-strong)', transition: '.4s', borderRadius: '34px' }}>
                          <span style={{ position: 'absolute', content: '""', height: '26px', width: '26px', left: sysSettings.media_enabled !== false ? '30px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }} />
                      </span>
                  </label>
              </div>
          </div>
      )}

      {activeTab === 'broadcast' && (
          <div className="feed-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Global Broadcast</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Send a real-time notification to all connected users.</p>
              <textarea 
                  className="composer-textarea"
                  style={{ width: '100%', minHeight: '100px', padding: '1rem', marginBottom: '1rem' }}
                  placeholder="Enter broadcast message..."
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
              />
              <button className="btn-glow" style={{ backgroundColor: 'var(--accent-color)' }} onClick={handleSendBroadcast}>
                  Send Broadcast
              </button>
          </div>
      )}

      {activeTab === 'forge' && (
          <div className="feed-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Forge Fake Whisper 🤫</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Seed the platform with posts by masquerading as existing bots or creating new ones.
              </p>
              
              <form onSubmit={handleForgePost} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Author Display Name (Optional)</label>
                          <input 
                              type="text" 
                              className="composer-textarea border-input" 
                              style={{ width: '100%', height: '40px', padding: '0.5rem' }} 
                              value={forgeAuthor} 
                              onChange={(e) => setForgeAuthor(e.target.value)} 
                              placeholder="e.g. Feral Canteen Tea (Leave blank to pick a random AI bot)" 
                          />
                      </div>
                      <div style={{ width: '200px' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Topic</label>
                          <select 
                              value={forgeTopic} 
                              onChange={(e) => setForgeTopic(e.target.value)}
                              style={{ width: '100%', height: '40px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-strong)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }}
                          >
                              <option value="General">General</option>
                              <option value="Confessions">Confessions</option>
                              <option value="Academic">Academic</option>
                              <option value="Rants">Rants</option>
                              <option value="Events">Events</option>
                          </select>
                      </div>
                  </div>
                  
                  <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Whisper Content</label>
                      <textarea 
                          className="composer-textarea"
                          style={{ width: '100%', minHeight: '120px', padding: '1rem' }}
                          placeholder="What would you like this fake user to whisper?"
                          value={forgeContent}
                          onChange={(e) => setForgeContent(e.target.value)}
                          required
                      />
                  </div>
                  
                  <button type="submit" className="btn-glow" style={{ width: '200px', backgroundColor: 'var(--accent-color)', alignSelf: 'flex-start' }} disabled={forgeLoading}>
                      {forgeLoading ? 'Forging...' : 'Forge & Publish'}
                  </button>
              </form>
          </div>
      )}

      {activeTab === 'all_chats' && (
          <div className="feed-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>All Platform Conversations</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                  {adminChats.map(chat => (
                      <div key={chat.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <strong style={{ fontSize: '1rem' }}>Chat #{chat.id}</strong>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(chat.updated_at).toLocaleDateString()}</span>
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)' }}>
                                  Users: {chat.user1.id} &amp; {chat.user2.id}
                              </div>
                          </div>
                          
                          <div style={{ padding: '1rem', maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                              {chat.messages.map((m, idx) => {
                                  const isUser1 = m.sender_id === chat.user1.id;
                                  return (
                                      <div key={idx} style={{ 
                                          alignSelf: isUser1 ? 'flex-start' : 'flex-end',
                                          maxWidth: '85%',
                                          padding: '0.6rem 0.8rem',
                                          borderRadius: '12px',
                                          backgroundColor: isUser1 ? 'var(--bg-card)' : 'rgba(var(--accent-rgb), 0.15)',
                                          border: isUser1 ? '1px solid var(--border-color)' : '1px solid rgba(var(--accent-rgb), 0.3)',
                                          color: 'var(--text-color)'
                                      }}>
                                          <div style={{ fontSize: '0.7rem', color: isUser1 ? 'var(--text-muted)' : 'var(--accent-color)', marginBottom: '2px', fontWeight: 'bold' }}>
                                              User {m.sender_id}
                                          </div>
                                          <div style={{ fontSize: '0.9rem', wordBreak: 'break-word' }}>
                                              {m.content}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
      
    </div>
  );
}
