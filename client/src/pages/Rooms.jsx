import { useState } from 'react';
import { CAMPUS_STRUCTURE } from '../campus_structure';
import Feed from './Feed';

export default function Rooms() {
  const [activeRoom, setActiveRoom] = useState(localStorage.getItem('jluwhisper_active_room')); // e.g. "Block A|BCA"
  
  // Lobby State
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

  if (!activeRoom) {
    return (
      <div className="page-content" style={{ padding: '2rem 1rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', background: 'linear-gradient(135deg, #35D6E7, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Campus Rooms
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Join a dedicated, distraction-free room for your class. Select your block and subject below.
        </p>

        <div className="feed-card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Select Block</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
            {blockNames.map(b => (
              <button 
                key={b} 
                onClick={() => setSelectedBlock(b)}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '20px',
                  background: selectedBlock === b ? 'rgba(53, 214, 231, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: selectedBlock === b ? '1px solid var(--primary)' : '1px solid transparent',
                  color: selectedBlock === b ? 'var(--primary)' : 'var(--text-main)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: '0.2s'
                }}
              >
                {b}
              </button>
            ))}
          </div>

          <h3 style={{ marginBottom: '1rem' }}>Select Subject</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {CAMPUS_STRUCTURE[selectedBlock].map(subject => (
              <button 
                key={subject}
                onClick={() => joinRoom(selectedBlock, subject)}
                className="btn-glow"
                style={{ width: '100%', padding: '1rem', textAlign: 'left', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>{subject}</span>
                <span style={{ fontSize: '1.2rem' }}>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const [block, subject] = activeRoom.split('|');

  return (
    <Feed 
      forcedHandle={block} 
      forcedTopic={subject} 
      onLeaveRoom={leaveRoom} 
    />
  );
}
