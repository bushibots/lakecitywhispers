import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Compass, MessageSquare, Bell, Settings, Bookmark, TrendingUp, Shield, LogIn, Flame, Moon, Sun } from 'lucide-react';
import AuthModal from './AuthModal';
import { fetchPublicConfig } from '../api';

export default function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const location = useLocation();
  const isRegistered = localStorage.getItem('jluwhisper_registered') === 'true';

  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' || !localStorage.getItem('theme')
  );

  const toggleTheme = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setIsDarkMode(isDark);
    setIsOpen(false);
  };

  // Close drawer when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const [siteLogo, setSiteLogo] = useState('');
  const [siteName, setSiteName] = useState('JLU Whisper');
  useEffect(() => {
    fetchPublicConfig().then(cfg => {
      if (cfg && cfg.site_logo) setSiteLogo(cfg.site_logo);
      if (cfg && cfg.site_name) setSiteName(cfg.site_name);
    });
  }, []);

  const navLinks = [
    { path: '/feed', label: 'Feed', icon: Home },
    { path: '/explore', label: 'Explore', icon: Compass },
    { path: '/messages', label: 'Messages', icon: MessageSquare },
    { path: '/notifications', label: 'Notifications', icon: Bell },
    { path: '/guide', label: 'Guide', icon: Bookmark },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isAdmin = localStorage.getItem('jluwhisper_admin') === 'true';

  return (
    <>
      {/* Top Header Bar */}
      <header className="global-mobile-header">
        <button className="icon-btn-minimal" onClick={() => setIsOpen(true)}>
          <Menu size={24} color="var(--text-main)" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '8px' }}>
          {siteLogo ? (
            <img src={siteLogo} alt="Logo" style={{ height: '28px', objectFit: 'contain' }} />
          ) : (
            <div className="logo-flame" style={{ fontSize: '1.5rem' }}><Flame size={22}/></div>
          )}
          <h2 style={{ fontSize: '1.3rem', margin: 0, whiteSpace: 'nowrap', fontWeight: 800 }}>{siteName}</h2>
        </div>
        <button 
          className="icon-btn-minimal" 
          onClick={toggleTheme}
          style={{ padding: '0.4rem' }}
        >
          {isDarkMode ? <Sun size={22} color="var(--text-main)" /> : <Moon size={22} color="var(--text-main)" />}
        </button>
      </header>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="drawer-overlay" onClick={() => setIsOpen(false)}></div>
      )}

      {/* Drawer Content */}
      <div className={`mobile-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h2>Menu</h2>
          <button className="icon-btn-minimal" onClick={() => setIsOpen(false)}>
            <X size={24} color="var(--text-main)" />
          </button>
        </div>

        <div className="drawer-links">
          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path || (location.pathname === '/' && link.path === '/feed');
            return (
              <Link key={link.path} to={link.path} className={`drawer-link ${isActive ? 'active' : ''}`}>
                <Icon size={20} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <Link to="/admin" className={`drawer-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}>
              <Shield size={20} />
              <span>Admin Panel</span>
            </Link>
          )}

          {!isRegistered && (
            <button 
              onClick={() => { setIsOpen(false); setIsAuthOpen(true); }}
              className="drawer-link"
              style={{
                width: '100%',
                marginTop: '1rem',
                backgroundColor: 'rgba(var(--accent-rgb), 0.15)',
                color: 'var(--accent-color)',
                border: '1px solid var(--accent-color)',
                borderRadius: '10px',
                padding: '0.8rem',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}
            >
              <LogIn size={20} /> Log In / Register
            </button>
          )}
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onSuccess={() => window.location.reload()} 
      />
    </>
  );
}
