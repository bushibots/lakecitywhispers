import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Flame, Mail, CheckCircle2 } from 'lucide-react';
import { fetchNotifications, markNotificationsRead } from '../api';
import { socket } from '../socket';
import { formatTime } from '../utils';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadNotifications();

    const handleNewNotif = (data) => {
      // Prepend to the list, with local formatting
      const newNotif = {
        id: Date.now(), // temporary id
        type: data.type,
        message: data.message,
        is_read: false,
        created_at: new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev]);
    };

    socket.on('new_notification', handleNewNotif);
    return () => socket.off('new_notification', handleNewNotif);
  }, []);

  const loadNotifications = async () => {
    const data = await fetchNotifications();
    if (Array.isArray(data)) {
      setNotifications(data);
    }
  };

  const handleMarkAsRead = async () => {
    await markNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getIconAndColor = (type) => {
    switch(type) {
      case 'reply': return { icon: MessageCircle, color: '#35D6E7' };
      case 'upvote': return { icon: Flame, color: '#FF5E5B' };
      case 'message': return { icon: Mail, color: '#F2C94C' };
      case 'message_request': return { icon: Heart, color: '#9b59b6' };
      default: return { icon: MessageCircle, color: '#888' };
    }
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Notifications</h2>
        {notifications.some(n => !n.is_read) && (
          <button className="btn-glow small" onClick={handleMarkAsRead}>
            <CheckCircle2 size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Mark as read
          </button>
        )}
      </div>

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No notifications yet.
          </div>
        ) : (
          notifications.map(n => {
            const { icon: Icon, color } = getIconAndColor(n.type);
            return (
              <div key={n.id} className="notification-card" style={{ opacity: n.is_read ? 0.6 : 1, transition: '0.2s' }}>
                <div className="notif-icon-wrapper" style={{ background: `${color}20`, color: color }}>
                  <Icon size={20} />
                </div>
                <div className="notif-content">
                  <p style={{ fontWeight: n.is_read ? 'normal' : 'bold' }}>{n.message}</p>
                  <span className="time">{formatTime(n.created_at)}</span>
                </div>
                {!n.is_read && (
                  <div style={{ width: 8, height: 8, background: 'var(--accent-color)', borderRadius: '50%' }}></div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
