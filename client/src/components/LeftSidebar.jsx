import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, MessageSquare, Bell, User, Settings as SettingsIcon, Bookmark, TrendingUp, Shield, LogIn } from 'lucide-react';
import { useState } from 'react';
import AuthModal from './AuthModal';

export default function LeftSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const isRegistered = localStorage.getItem('jluwhisper_registered') === 'true';

  const navItems = [
    { path: '/feed', label: 'Feed', icon: Home },
    { path: '/explore', label: 'Explore', icon: Compass },
    { path: '/messages', label: 'Messages', icon: MessageSquare },
    { path: '/notifications', label: 'Notifications', icon: Bell },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/guide', label: 'Guide', icon: Bookmark },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  if (localStorage.getItem('jluwhisper_admin') === 'true') {
    navItems.push({ path: '/admin', label: 'Admin', icon: Shield });
  }

  return (
    <aside className="left-sidebar">
      <div className="sidebar-header">
        <div className="logo-flame">🔥</div>
        <h2>JLU Whisper</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (currentPath === '/' && item.path === '/feed');
          return (
            <Link key={item.path} to={item.path} className={`nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={24} />
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button className="btn-glow sidebar-fab">
        <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>+</span> Whisper
      </button>

      {!isRegistered && (
        <button 
          onClick={() => setIsAuthOpen(true)}
          style={{
            marginTop: '1rem',
            width: '100%',
            padding: '0.75rem',
            borderRadius: '12px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--accent-color)',
            color: 'var(--accent-color)',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <LogIn size={18} /> Log In / Register
        </button>
      )}

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onSuccess={() => window.location.reload()} 
      />
    </aside>
  );
}
