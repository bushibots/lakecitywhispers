import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, MessageSquare, Bell, User, Settings as SettingsIcon, Bookmark, TrendingUp, Shield, LogIn, Flame, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import AuthModal from './AuthModal';
import { fetchPublicConfig, apiFetch } from '../api';

export default function LeftSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const isRegistered = localStorage.getItem('jluwhisper_registered') === 'true';

  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' || !localStorage.getItem('theme')
  );

  const toggleTheme = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setIsDarkMode(isDark);
  };

  const navItems = [
    { path: '/feed', label: 'Feed', icon: Home },
    { path: '/explore', label: 'Explore', icon: Compass },
    { path: '/messages', label: 'Messages', icon: MessageSquare },
    { path: '/notifications', label: 'Notifications', icon: Bell },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/guide', label: 'Guide', icon: Bookmark },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const isAdmin = localStorage.getItem('jluwhisper_admin') === 'true';
  const [managerHandles, setManagerHandles] = useState([]);

  useEffect(() => {
    if (isRegistered) {
      apiFetch('/managers/me').then(data => {
        if (data && data.handles && data.handles.length > 0) {
          setManagerHandles(data.handles);
        }
      });
    }
  }, [isRegistered]);

  if (managerHandles.length > 0) {
    navItems.push({ path: '/manager', label: 'Dashboard', icon: Shield });
  }

  if (isAdmin) {
    navItems.push({ path: '/admin', label: 'Admin', icon: Shield });
  }

  const [siteLogo, setSiteLogo] = useState('');
  const [siteName, setSiteName] = useState('JLU Whisper');
  const [globalTheme, setGlobalTheme] = useState('');
  const [chakraClicks, setChakraClicks] = useState(0);

  useEffect(() => {
    fetchPublicConfig().then(cfg => {
      if (cfg && cfg.site_logo) setSiteLogo(cfg.site_logo);
      if (cfg && cfg.site_name) setSiteName(cfg.site_name);
      if (cfg && cfg.global_theme) setGlobalTheme(cfg.global_theme);
    });
  }, []);

  const handleChakraClick = () => {
    setChakraClicks(prev => {
        const newCount = prev + 1;
        if (newCount >= 3) {
            window.dispatchEvent(new CustomEvent('trigger_confetti', { detail: { colors: ['#FF9933', '#FFFFFF', '#138808'] } }));
            return 0; // reset
        }
        return newCount;
    });
  };

  return (
    <aside className="left-sidebar">
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center' }}>
        {siteLogo ? (
          <img src={siteLogo} alt="Site Logo" style={{ height: '32px', marginRight: '10px', objectFit: 'contain' }} />
        ) : (
          <div className="logo-flame"><Flame size={24} /></div>
        )}
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {siteName}
            {globalTheme === 't-india' && (
                <span 
                    onClick={handleChakraClick}
                    style={{ 
                        cursor: 'pointer', 
                        display: 'inline-block', 
                        animation: 'spin 10s linear infinite', 
                        color: '#000080',
                        fontSize: '1.2rem',
                        userSelect: 'none'
                    }}
                    title="Jai Hind!"
                >
                    ☸
                </span>
            )}
        </h2>
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

      <button 
        onClick={toggleTheme}
        className="nav-link"
        style={{ marginTop: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: '1rem' }}
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
        <span className="nav-label">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
      </button>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onSuccess={() => window.location.reload()} 
      />
    </aside>
  );
}
