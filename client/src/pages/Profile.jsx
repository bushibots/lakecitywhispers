import { Award, Shield, Settings, Bookmark, LogOut, HelpCircle, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AuthModal from '../components/AuthModal';
import { requestSupportMessage, fetchMe, fetchUserProfile } from '../api';
import { formatTime } from '../utils';

export default function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isMyProfile = !username;

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    const data = username ? await fetchUserProfile(username) : await fetchMe();
    if (data && !data.error) {
      setProfile(data);
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('jluwhisper_session');
    localStorage.removeItem('jluwhisper_identity');
    localStorage.removeItem('jluwhisper_registered');
    window.location.reload();
  };

  const handleSupport = async () => {
    const msg = prompt("What do you need help with?");
    if (msg && msg.trim()) {
      const res = await requestSupportMessage(msg.trim());
      if (res && res.message) {
        alert("Support request sent! Check your Messages tab for a reply from the admin team.");
      } else {
        alert("Failed to send support request.");
      }
    }
  };

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <div style={{ width: '40px', height: '40px', border: '4px solid rgba(53, 214, 231, 0.2)', borderTop: '4px solid #35D6E7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );
  if (!profile) return <div className="page-content"><h2>Error loading profile. Try logging in again.</h2></div>;

  return (
    <div className="page-content">
      {!isMyProfile && (
          <Link to="/feed" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem' }}>
              <ArrowLeft size={16} /> Back to Feed
          </Link>
      )}
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={() => {
          loadProfile();
          window.location.reload();
        }}
      />

      <div className="profile-header">
        <div className="avatar-flame large">
          {profile.avatar && profile.avatar.startsWith('http') ? (
            <img src={profile.avatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            (profile.avatar || profile.display_name).charAt(0)
          )}
        </div>
        <h2>{profile.display_name}</h2>
        <span className="status-badge">
          <Shield size={14} /> {profile.is_registered ? 'Verified Account' : 'Guest Account'}
        </span>
        <p className="bio">"Just here for the tea."</p>
        
        {isMyProfile && !profile.is_registered && (
          <div className="guest-warning mt-4">
            <p>You are currently a Guest. Your account will expire in 7 days if inactive.</p>
            <button className="btn-glow mt-2" onClick={() => setIsAuthModalOpen(true)}>Secure Your Account</button>
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <h3>{profile.stats ? profile.stats.whispers : '0'}</h3>
          <p>Whispers</p>
        </div>
        <div className="stat-box">
          <h3>{profile.stats ? profile.stats.reactions : '0'}</h3>
          <p>Reactions</p>
        </div>
        <div className="stat-box">
          <h3>{profile.is_registered ? '∞' : '7'}</h3>
          <p>Days Left</p>
        </div>
      </div>

      <div className="profile-section">
        <h3><Award className="icon-teal" /> Badges</h3>
        <div className="badges-list">
          <div className="badge-item">
            <div className="badge-icon gold">🔥</div>
            <span>Top Whisperor</span>
          </div>
          <div className="badge-item">
            <div className="badge-icon silver">👻</div>
            <span>Ghost Mode</span>
          </div>
        </div>
      </div>

      {isMyProfile && (
        <div className="profile-section">
          <h3>Options</h3>
          <ul className="settings-list">
            <li><Bookmark size={18} /> Saved Whispers</li>
            <Link to="/settings" style={{ color: 'inherit', textDecoration: 'none' }}><li><Settings size={18} /> Account Settings</li></Link>
            <li onClick={handleSupport}><HelpCircle size={18} /> Get Help from Admin Forum</li>
            <li className="text-danger" onClick={handleLogout}><LogOut size={18} /> Log Out (Reset Identity)</li>
          </ul>
        </div>
      )}

      {profile.posts && profile.posts.length > 0 && (
          <div className="profile-section">
              <h3>Recent Whispers</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  {profile.posts.map(post => (
                      <div key={post.id} className="feed-card" style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{post.topic}</span>
                              <span>{formatTime(post.created_at)}</span>
                          </div>
                          <p>{post.content}</p>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
}
