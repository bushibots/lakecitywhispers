import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Feed from './pages/Feed';
import Explore from './pages/Explore';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Guide from './pages/Guide';
import AdminDashboard from './pages/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import Dating from './pages/Dating';
import Settings from './pages/Settings';
import AuthModal from './components/AuthModal';
import { Heart } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import EasterEggs from './components/EasterEggs';
import { socket, joinSocketRoom } from './socket';
import { fetchMe, fetchPublicConfig } from './api';
import './index.css';

function App() {
  const location = useLocation();

  useEffect(() => {
    let pageName = 'Home';
    const path = location.pathname;
    if (path === '/feed' || path === '/') pageName = 'Feed';
    else if (path.startsWith('/explore')) pageName = 'Explore';
    else if (path.startsWith('/notifications')) pageName = 'Notifications';
    else if (path.startsWith('/messages')) pageName = 'Messages';
    else if (path.startsWith('/profile')) pageName = 'Profile';
    else if (path.startsWith('/guide')) pageName = 'Guide';
    else if (path.startsWith('/admin')) pageName = 'Admin';
    else if (path.startsWith('/settings')) pageName = 'Settings';

    document.title = `${pageName} | JLU Whisper`;
  }, [location.pathname]);

  useEffect(() => {
    // 1. Fetch user ID to join socket room securely
    fetchMe().then(user => {
      if (user && user.id) {
        joinSocketRoom(user.id);
      }
    });

    // 1b. Fetch global configuration for theme
    fetchPublicConfig().then(cfg => {
      if (cfg && cfg.global_theme) {
        document.body.className = cfg.global_theme;
      } else {
        document.body.className = 't-default';
      }
    });

    // 2. Global listener for real-time notifications
    socket.on('new_notification', (data) => {
      // data: { type, message, post_id, etc. }
      toast(data.message, {
        icon: data.type === 'upvote' ? '🔥' : data.type === 'reply' ? '💬' : '✉️',
        style: {
          borderRadius: '10px',
          background: 'var(--bg-elevated)',
          color: 'var(--text-main)',
          border: '1px solid var(--border-color)',
        }
      });
      // A custom event could be dispatched here to update badge counts in other components if needed
      window.dispatchEvent(new CustomEvent('live_notification'));
    });

    return () => {
      socket.off('new_notification');
    };
  }, []);

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <EasterEggs />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/feed" replace />} />
          <Route path="feed" element={<Feed />} />

          <Route path="explore" element={<Explore />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="messages" element={<Messages />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:username" element={<Profile />} />
          <Route path="guide" element={<Guide />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="manager" element={<ManagerDashboard />} />
          <Route path="login" element={
            <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
              <AuthModal isOpen={true} initialMode="login" onClose={() => window.location.href = '/feed'} onSuccess={() => window.location.href = '/feed'} />
            </div>
          } />
          <Route path="register" element={
            <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
              <AuthModal isOpen={true} initialMode="register" onClose={() => window.location.href = '/feed'} onSuccess={() => window.location.href = '/feed'} />
            </div>
          } />
          <Route path="dating" element={<Dating />} />
          {/* Placeholders for others */}
          <Route path="*" element={<div className="page-content"><h2>Coming Soon</h2><p>This page is under construction.</p></div>} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
