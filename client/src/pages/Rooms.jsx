import { useState } from 'react';
import { CAMPUS_STRUCTURE } from '../campus_structure';
import RoomFeed from './RoomFeed';

export default function Rooms() {
  const saved = localStorage.getItem('jluwhisper_active_room');
  const [activeRoom, setActiveRoom] = useState(saved); // e.g. "Block A|BCA"
  const [selectedBlock, setSelectedBlock] = useState('Block A');
  const blockNames = Object.keys(CAMPUS_STRUCTURE);

  const joinRoom = (block, subject) => {
    const roomStr = `${block}|${subject}`;
    localStorage.setItem('jluwhisper_active_room', roomStr);
    setActiveRoom(roomStr);
  };

  const leaveRoom = () => {
    localStorage.removeItem('jluwhisper_active_room');
    setActiveRoom(null);
  };

  if (activeRoom) {
    const [block, subject] = activeRoom.split('|');
    return <RoomFeed block={block} subject={subject} onLeave={leaveRoom} />;
  }

  return (
    <div className="page-content" style={{ maxWidth: '580px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #35D6E7, #8B5CF6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          🏫 Campus Rooms
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          A private, isolated space for your block & subject. What happens in the Room stays in the Room.
        </p>
      </div>

      <div className="feed-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Select Block</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {blockNames.map(b => (
            <button
              key={b}
              onClick={() => setSelectedBlock(b)}
              style={{
                padding: '0.5rem 1.1rem', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', transition: '0.2s',
                background: selectedBlock === b ? 'rgba(53,214,231,0.15)' : 'rgba(255,255,255,0.05)',
                border: selectedBlock === b ? '1px solid #35D6E7' : '1px solid transparent',
                color: selectedBlock === b ? '#35D6E7' : 'var(--text-main)',
              }}
            >
              {b}
            </button>
          ))}
        </div>

        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Select Subject</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {CAMPUS_STRUCTURE[selectedBlock].map(subject => (
            <button
              key={subject}
              onClick={() => joinRoom(selectedBlock, subject)}
              style={{
                width: '100%', padding: '0.9rem 1rem', textAlign: 'left',
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
                borderRadius: '12px', color: 'var(--text-main)', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: '0.9rem', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(53,214,231,0.07)'; e.currentTarget.style.borderColor = 'rgba(53,214,231,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              <span>{subject}</span>
              <span style={{ color: 'var(--text-muted)' }}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
