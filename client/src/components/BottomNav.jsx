import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Heart, Bell, Settings as SettingsIcon } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: '/feed', label: 'Feed', icon: Home },
    { path: '/explore', label: 'Explore', icon: Compass },
    { path: '/dating', label: 'Dating', icon: Heart, special: true },
    { path: '/notifications', label: 'Alerts', icon: Bell },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = currentPath === item.path || (currentPath === '/' && item.path === '/feed');
        return (
          <Link key={item.path} to={item.path} className={`bottom-nav-item ${isActive ? 'active' : ''} ${item.special ? 'special' : ''}`}>
            <Icon size={item.special ? 32 : 24} className={item.special ? 'special-icon' : ''} />
            {!item.special && <span className="bottom-nav-label">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
