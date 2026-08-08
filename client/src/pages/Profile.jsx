import { Award, Shield, Settings, Bookmark, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import AuthModal from '../components/AuthModal';

export default function Profile() {
  const [identity, setIdentity] = useState('Guest');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    setIdentity(localStorage.getItem('jluwhisper_identity') || 'Anonymous');
    setIsRegistered(localStorage.getItem('jluwhisper_registered') === 'true');
  };

  const handleLogout = () => {
    localStorage.removeItem('jluwhisper_session');
    localStorage.removeItem('jluwhisper_identity');
    localStorage.removeItem('jluwhisper_registered');
    window.location.reload();
  };

  return (
    <div className="page-content">
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
        <div className="avatar-flame large">{identity.charAt(0)}</div>
        <h2>{identity}</h2>
        <span className="status-badge">
          <Shield size={14} /> {isRegistered ? 'Verified Account' : 'Guest Account'}
        </span>
        <p className="bio">"Just here for the tea."</p>
        
        {!isRegistered && (
          <div className="guest-warning mt-4">
            <p>You are currently a Guest. Your account will expire in 7 days if inactive.</p>
            <button className="btn-glow mt-2" onClick={() => setIsAuthModalOpen(true)}>Secure Your Account</button>
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <h3>142</h3>
          <p>Whispers</p>
        </div>
        <div className="stat-box">
          <h3>2.1K</h3>
          <p>Reactions</p>
        </div>
        <div className="stat-box">
          <h3>18</h3>
          <p>Saved</p>
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

      <div className="profile-section">
        <h3>Options</h3>
        <ul className="settings-list">
          <li><Bookmark size={18} /> Saved Whispers</li>
          <li><Settings size={18} /> Account Settings</li>
          <li className="text-danger" onClick={handleLogout}><LogOut size={18} /> Log Out (Reset Identity)</li>
        </ul>
      </div>
    </div>
  );
}
