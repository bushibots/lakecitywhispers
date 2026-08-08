import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, MessageSquare, Bell, User, Settings as SettingsIcon, Bookmark, TrendingUp, Shield } from 'lucide-react';

export default function LeftSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

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
    </aside>
  );
}
