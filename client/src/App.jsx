import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Feed from './pages/Feed';
import Explore from './pages/Explore';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Guide from './pages/Guide';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';
import AuthModal from './components/AuthModal';
import { Heart } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { useEffect } from 'react';
import { socket, joinSocketRoom } from './socket';
import { fetchMe } from './api';
import './index.css';

function App() {
  useEffect(() => {
    // 1. Fetch user ID to join socket room securely
    fetchMe().then(user => {
      if (user && user.id) {
        joinSocketRoom(user.id);
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
      <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/feed" replace />} />
        <Route path="feed" element={<Feed />} />
        <Route path="explore" element={<Explore />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="messages" element={<Messages />} />
        <Route path="profile" element={<Profile />} />
        <Route path="guide" element={<Guide />} />
        <Route path="settings" element={<Settings />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="login" element={
            <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <AuthModal isOpen={true} initialMode="login" onClose={() => window.location.href='/feed'} onSuccess={() => window.location.href='/feed'} />
            </div>
        } />
        <Route path="register" element={
            <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <AuthModal isOpen={true} initialMode="register" onClose={() => window.location.href='/feed'} onSuccess={() => window.location.href='/feed'} />
            </div>
        } />
        <Route path="dating" element={<div className="page-content" style={{textAlign: 'center', marginTop: '20vh'}}><Heart size={64} color="#FF5E5B" style={{margin: '0 auto 1rem'}} /><h2>Dating Coming Soon</h2><p className="text-muted">Find your campus crush. Stay tuned!</p></div>} />
        {/* Placeholders for others */}
        <Route path="*" element={<div className="page-content"><h2>Coming Soon</h2><p>This page is under construction.</p></div>} />
      </Route>
    </Routes>
    </>
  );
}

export default App;
