import { useState, useEffect } from 'react';
import { Shield, Trash2, Ban, Eye, Settings, Users, Database, Flame, Edit3, Heart, Search } from 'lucide-react';
import { 
    fetchAdminDashboard, adminDeletePost, adminToggleBanUser, adminTogglePermanentBot, adminUpdateStats, 
    fetchAdminUsers, fetchAdminSettings, updateAdminSettings, fetchAdminAllPosts, fetchPostAuthor, regenerateDailyPrompt,
    sendAdminBroadcast, fetchAdminConversations, adminForgePost, adminSpawnBots, adminWipeUser,
    fetchAdminDatingProfiles, adminDeleteDatingProfile, fetchAdminSwipes, fetchAdminMedia, forceAdminMatch
} from '../api';
import IPLookupWidget from '../components/IPLookupWidget';

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
  const [datingProfiles, setDatingProfiles] = useState([]);
  const [swipeHistory, setSwipeHistory] = useState([]);
  const [allMedia, setAllMedia] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminMsgPage, setAdminMsgPage] = useState(1);
  const [adminMsgTotal, setAdminMsgTotal] = useState(0);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [lookupIp, setLookupIp] = useState('');
  
  // Force Match State
  const [matchUser1, setMatchUser1] = useState('');
  const [matchUser2, setMatchUser2] = useState('');
  const [matchStatus, setMatchStatus] = useState('');
  
  const [blockedWords, setBlockedWords] = useState([]);
  const [newWord, setNewWord] = useState('');
  
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
        if (Array.isArray(data)) setAllUsers(data);
    } else if (activeTab === 'all_posts') {
        const data = await fetchAdminAllPosts();
        if (Array.isArray(data)) setAllPosts(data);
    } else if (activeTab === 'settings') {
        const data = await fetchAdminSettings();
        if (data && !data.error) setSysSettings(data);
    } else if (activeTab === 'all_chats') {
        const data = await fetchAdminConversations();
        if (Array.isArray(data)) setAdminChats(data);
    } else if (activeTab === 'filters') {
        const data = await fetch((import.meta.env.VITE_API_URL || 'https://lakecity-whispers-backend.onrender.com/api') + '/admin/blocked_words', {
            headers: { 'Authorization': localStorage.getItem('jluwhisper_session') }
        }).then(r => r.json());
        if (!data.error) setBlockedWords(data);
    } else if (activeTab === 'dating') {
        const data = await fetchAdminDatingProfiles();
        if (Array.isArray(data)) {
            setDatingProfiles(data);
        } else {
            setDatingProfiles([]);
        }
    } else if (activeTab === 'swipes') {
        const data = await fetchAdminSwipes();
        if (Array.isArray(data)) {
            setSwipeHistory(data);
        } else {
            setSwipeHistory([]);
        }
    } else if (activeTab === 'media') {
        const data = await fetchAdminMedia();
        if (Array.isArray(data)) {
            setAllMedia(data);
        } else {
            setAllMedia([]);
        }
    } else if (activeTab === 'admin_messages') {
        const API = import.meta.env.VITE_API_URL || 'https://lakecity-whispers-backend.onrender.com/api';
        const data = await fetch(`${API}/admin/messages?page=${adminMsgPage}`, {
            headers: { 'Authorization': localStorage.getItem('jluwhisper_session') }
        }).then(r => r.json());
        if (data && data.messages) {
            setAdminMessages(data.messages);
            setAdminMsgTotal(data.total);
        }
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

  const handleAddBlockedWord = async () => {
    if (!newWord.trim()) return;
    const res = await fetch((import.meta.env.VITE_API_URL || 'https://lakecity-whispers-backend.onrender.com/api') + '/admin/blocked_words', {
        method: 'POST',
        headers: { 
            'Authorization': localStorage.getItem('jluwhisper_session'),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ word: newWord })
    }).then(r => r.json());
    if (res.error) alert(res.error);
    else {
        setNewWord('');
        loadData();
    }
  };

  const handleDeleteBlockedWord = async (id) => {
    await fetch((import.meta.env.VITE_API_URL || 'https://lakecity-whispers-backend.onrender.com/api') + '/admin/blocked_words/' + id, {
        method: 'DELETE',
        headers: { 'Authorization': localStorage.getItem('jluwhisper_session') }
    });
    loadData();
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

  const handleForceMatch = async () => {
      if (!matchUser1.trim() || !matchUser2.trim()) {
          setMatchStatus('Please enter both usernames.');
          return;
      }
      setMatchStatus('Forcing match...');
      const res = await forceAdminMatch(matchUser1.trim(), matchUser2.trim());
      if (res && res.success) {
          setMatchStatus('Match successfully forced!');
          setMatchUser1('');
          setMatchUser2('');
          fetchAdminSwipes().then(data => setSwipeHistory(data));
      } else {
          setMatchStatus(res.error || 'Failed to force match.');
      }
      setTimeout(() => setMatchStatus(''), 4000);
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
        <button className={`pill-tab ${activeTab === 'filters' ? 'active' : ''}`} onClick={() => setActiveTab('filters')} style={{ backgroundColor: activeTab === 'filters' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'filters' ? 'white' : 'var(--text-color)' }}>
            <Ban size={16} style={{ marginRight: '8px' }}/> Filters
        </button>
        <button className={`pill-tab ${activeTab === 'dating' ? 'active' : ''}`} onClick={() => setActiveTab('dating')} style={{ backgroundColor: activeTab === 'dating' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'dating' ? 'white' : 'var(--text-color)' }}>
            <Flame size={16} style={{ marginRight: '8px' }}/> Dating
        </button>
        <button className={`pill-tab ${activeTab === 'swipes' ? 'active' : ''}`} onClick={() => setActiveTab('swipes')} style={{ backgroundColor: activeTab === 'swipes' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'swipes' ? 'white' : 'var(--text-color)' }}>
            <Heart size={16} style={{ marginRight: '8px' }}/> Swipes
        </button>
        <button className={`pill-tab ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')} style={{ backgroundColor: activeTab === 'media' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'media' ? 'white' : 'var(--text-color)' }}>
            <Eye size={16} style={{ marginRight: '8px' }}/> Media Gallery
        </button>
        <button className={`pill-tab ${activeTab === 'admin_messages' ? 'active' : ''}`} onClick={() => setActiveTab('admin_messages')} style={{ backgroundColor: activeTab === 'admin_messages' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'admin_messages' ? 'white' : 'var(--text-color)' }}>
            <Eye size={16} style={{ marginRight: '8px' }}/> Message Logs
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
                              {u.ip_address && (
                                  <button 
                                      style={{ padding: '4px 8px', backgroundColor: 'rgba(53, 214, 231, 0.15)', color: 'var(--accent-color)', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                                      onClick={() => { setLookupIp(u.ip_address); setActiveTab('settings'); }}
                                      title="Lookup IP"
                                  >
                                      <Search size={12}/> {u.ip_address}
                                  </button>
                              )}
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
                              
                              <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', marginBottom: '0.5rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <span>Display Identity: {post.author_display}</span>
                                  {post.ip_address && (
                                      <button 
                                          style={{ padding: '2px 6px', backgroundColor: 'rgba(53, 214, 231, 0.15)', color: 'var(--accent-color)', borderRadius: '4px', border: '1px solid rgba(53, 214, 231, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                                          onClick={() => { setLookupIp(post.ip_address); setActiveTab('settings'); }}
                                      >
                                          <Search size={10}/> IP: {post.ip_address}
                                      </button>
                                  )}
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

      {activeTab === 'filters' && (
          <div className="feed-card" style={{ padding: '1.5rem', marginTop: '2rem' }}>
              <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Ban size={24} color="var(--accent-color)" /> Text Filter
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Words added here will be completely blocked. Any post, reply, or message containing these words will be rejected.
              </p>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                  <input 
                      type="text" 
                      className="composer-textarea border-input"
                      placeholder="Add a new blocked word..."
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      style={{ padding: '0.8rem', flex: 1, borderRadius: '12px' }}
                  />
                  <button className="btn-glow" onClick={handleAddBlockedWord}>Add Word</button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                  {blockedWords.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No blocked words yet.</p>
                  ) : (
                      blockedWords.map(w => (
                          <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.2)', borderRadius: '20px', color: '#ff7675' }}>
                              <span>{w.word}</span>
                              <button className="icon-btn" onClick={() => handleDeleteBlockedWord(w.id)} style={{ color: '#ff7675', padding: '2px' }}>
                                  <Trash2 size={14} />
                              </button>
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}
      
      {activeTab === 'dating' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {datingProfiles.map(dp => {
                const imgs = (() => { try { return dp.images ? JSON.parse(dp.images) : []; } catch { return []; } })();
                const displayImg = imgs[0] || dp.image_url;
                return (
                  <div key={dp.user_id} className="feed-card" style={{ padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
                      {displayImg ? (
                        <img src={displayImg} alt="Profile" style={{ width: '100%', height: '220px', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
                      ) : (
                        <div style={{ height: '220px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Heart size={48} color="rgba(255,255,255,0.2)" />
                        </div>
                      )}
                      <div style={{ padding: '1rem' }}>
                          <h3 style={{ margin: '0 0 0.5rem 0' }}>{dp.display_name || dp.username} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(@{dp.username})</span></h3>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{dp.bio || 'No bio'}</p>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                              {dp.gender && <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,94,91,0.2)', fontSize: '0.75rem', color: '#FF5E5B' }}>{dp.gender}</span>}
                              {dp.age && <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', fontSize: '0.75rem' }}>{dp.age} yrs</span>}
                              {dp.block && <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', fontSize: '0.75rem' }}>Block {dp.block}</span>}
                              {imgs.length > 0 && <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(53,214,231,0.15)', fontSize: '0.75rem', color: '#35D6E7' }}>{imgs.length} photo{imgs.length > 1 ? 's' : ''}</span>}
                          </div>
                          <button 
                              onClick={async () => {
                                  if (window.confirm("Delete this dating profile?")) {
                                      await adminDeleteDatingProfile(dp.user_id);
                                      setDatingProfiles(prev => prev.filter(p => p.user_id !== dp.user_id));
                                  }
                              }} 
                              style={{ width: '100%', padding: '0.6rem', background: '#FF4757', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.875rem' }}>
                              <Trash2 size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }}/> Delete Profile
                          </button>
                      </div>
                  </div>
                );
              })}
              {datingProfiles.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No dating profiles found.
                  </div>
              )}
          </div>
      )}

      {activeTab === 'swipes' && (
          <div className="feed-card" style={{ padding: '1rem', overflowX: 'auto' }}>
              
              {/* God Mode: Force Match */}
              <div style={{ padding: '1.5rem', background: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', borderRadius: '12px', marginBottom: '2rem' }}>
                  <h3 style={{ color: '#e74c3c', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Flame size={20} /> God Mode: Force a Match
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      Force a mutual right-swipe between two users. They will instantly be matched and a chat will be created.
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input 
                          type="text" 
                          placeholder="Username 1" 
                          value={matchUser1}
                          onChange={e => setMatchUser1(e.target.value)}
                          style={{ flex: 1, minWidth: '150px', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}
                      />
                      <Heart size={20} color="#e74c3c" />
                      <input 
                          type="text" 
                          placeholder="Username 2" 
                          value={matchUser2}
                          onChange={e => setMatchUser2(e.target.value)}
                          style={{ flex: 1, minWidth: '150px', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}
                      />
                      <button onClick={handleForceMatch} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                          Force Match
                      </button>
                  </div>
                  {matchStatus && <div style={{ marginTop: '1rem', color: matchStatus.includes('success') ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>{matchStatus}</div>}
              </div>

              <h3>Recent Swipe History</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '1rem' }}>
                  <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '1rem' }}>Time</th>
                          <th style={{ padding: '1rem' }}>Swiper</th>
                          <th style={{ padding: '1rem' }}>Action</th>
                          <th style={{ padding: '1rem' }}>Target</th>
                      </tr>
                  </thead>
                  <tbody>
                      {swipeHistory.map(s => (
                          <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleString()}</td>
                              <td style={{ padding: '1rem', fontWeight: 'bold' }}>{s.swiper}</td>
                              <td style={{ padding: '1rem' }}>
                                  <span style={{ 
                                      color: s.action === 'like' ? '#2ecc71' : '#e74c3c',
                                      background: s.action === 'like' ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)',
                                      padding: '4px 8px', borderRadius: '12px', fontSize: '0.9rem'
                                  }}>
                                      {s.action.toUpperCase()}
                                  </span>
                              </td>
                              <td style={{ padding: '1rem', fontWeight: 'bold' }}>{s.target}</td>
                          </tr>
                      ))}
                      {swipeHistory.length === 0 && (
                          <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No swipes recorded yet.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === 'media' && (
          <div className="feed-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Global Media Gallery</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Viewing all media uploaded to posts and dating profiles.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {allMedia.map(m => (
                      <div key={m.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          {m.type === 'image' ? (
                              <div style={{ height: '200px', width: '100%', backgroundColor: '#000' }}>
                                  <img src={m.url} alt="Uploaded Media" style={{ width: '100%', height: '100%', objectFit: 'contain' }} loading="lazy" />
                              </div>
                          ) : (
                              <div style={{ height: '200px', width: '100%', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                                  <audio src={m.url} controls style={{ width: '100%' }} />
                              </div>
                          )}
                          <div style={{ padding: '1rem' }}>
                              <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 'bold' }}>{m.source}</div>
                              {m.created_at && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px' }}>{new Date(m.created_at).toLocaleString()}</div>}
                              <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '10px', fontSize: '0.85rem', color: 'white', backgroundColor: 'var(--bg-card)', padding: '4px 12px', borderRadius: '4px', textDecoration: 'none' }}>Open Original</a>
                          </div>
                      </div>
                  ))}
                  {allMedia.length === 0 && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No media found on the server.</div>
                  )}
              </div>
          </div>
      )}
      {activeTab === 'admin_messages' && (
          <div className="feed-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: 0 }}>Message Logs</h2>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{adminMsgTotal} total messages</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Time</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>From</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>To</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Message</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Conv #</th>
                      </tr>
                  </thead>
                  <tbody>
                      {adminMessages.map(msg => (
                          <tr key={msg.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                              <td style={{ padding: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{new Date(msg.created_at).toLocaleString()}</td>
                              <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                                  {msg.sender}
                                  {msg.sender_username && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.75rem' }}> (@{msg.sender_username})</span>}
                              </td>
                              <td style={{ padding: '0.75rem', color: 'var(--text-main)' }}>{msg.recipient}</td>
                              <td style={{ padding: '0.75rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: msg.content.startsWith('[IMAGE]') ? '#35D6E7' : 'var(--text-main)' }}>
                                  {msg.content.startsWith('[IMAGE]') ? '📷 Image' : msg.content}
                              </td>
                              <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>#{msg.conversation_id}</td>
                          </tr>
                      ))}
                      {adminMessages.length === 0 && (
                          <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No messages found.</td></tr>
                      )}
                  </tbody>
              </table>
              {adminMsgTotal > 50 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                      <button disabled={adminMsgPage === 1} onClick={() => { setAdminMsgPage(p => p - 1); }} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: adminMsgPage === 1 ? 'not-allowed' : 'pointer', opacity: adminMsgPage === 1 ? 0.4 : 1 }}>← Prev</button>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}>Page {adminMsgPage} of {Math.ceil(adminMsgTotal / 50)}</span>
                      <button disabled={adminMsgPage >= Math.ceil(adminMsgTotal / 50)} onClick={() => { setAdminMsgPage(p => p + 1); }} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: adminMsgPage >= Math.ceil(adminMsgTotal / 50) ? 'not-allowed' : 'pointer', opacity: adminMsgPage >= Math.ceil(adminMsgTotal / 50) ? 0.4 : 1 }}>Next →</button>
                  </div>
              )}
          </div>
      )}

    </div>
  );
}
