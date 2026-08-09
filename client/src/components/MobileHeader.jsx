import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Compass, MessageSquare, Bell, Settings, Bookmark, TrendingUp, Shield, LogIn } from 'lucide-react';
import AuthModal from './AuthModal';

export default function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const location = useLocation();
  const isRegistered = localStorage.getItem('jluwhisper_registered') === 'true';

  // Close drawer when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

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
        <h1>JLU Whisperers</h1>
        <div style={{ width: 24 }}></div> {/* Spacer for flex centering */}
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
