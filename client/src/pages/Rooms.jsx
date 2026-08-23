import { useState, useEffect, useRef } from 'react';
import { LogOut, Send, Image as ImageIcon, Smile } from 'lucide-react';
import { CAMPUS_STRUCTURE } from '../campus_structure';
import { fetchPosts, createPost, uploadFile } from '../api';
import { socket } from '../socket';

export default function Rooms() {
  const [activeRoom, setActiveRoom] = useState(localStorage.getItem('jluwhisper_active_room')); // e.g. "Block A|BCA"
  
  // Lobby State
  const [selectedBlock, setSelectedBlock] = useState('Block A');
  
  // Room State
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const messagesEndRef = useRef(null);

  const blockNames = Object.keys(CAMPUS_STRUCTURE);

  const joinRoom = (block, subject) => {
    const roomStr = `${block}|${subject}`;
    localStorage.setItem('jluwhisper_active_room', roomStr);
    setActiveRoom(roomStr);
  };

  const leaveRoom = () => {
    localStorage.removeItem('jluwhisper_active_room');
    setActiveRoom(null);
    setPosts([]);
  };

  useEffect(() => {
    if (!activeRoom) return;
    const [block, subject] = activeRoom.split('|');
    
    const loadRoomPosts = async () => {
      const data = await fetchPosts(subject, '', block);
      // Posts from fetchPosts are ordered newest first, but for chat we want oldest first (bottom up)
      setPosts(data.reverse());
      scrollToBottom();
    };
    
    loadRoomPosts();

    const handleNewPost = () => {
      loadRoomPosts();
    };

    socket.on('new_post', handleNewPost);
    return () => {
      socket.off('new_post', handleNewPost);
    };
  }, [activeRoom]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async () => {
    if (!content.trim() && !imageFile) return;
    setIsPosting(true);
    const [block, subject] = activeRoom.split('|');
    
    let imageUrl = null;
    if (imageFile) {
        imageUrl = await uploadFile(imageFile);
    }
    
    // Optimistic UI
    const tempPost = {
      id: Date.now(),
      content: content.trim(),
      author_username: localStorage.getItem('jluwhisper_username') || 'Anonymous',
      created_at: new Date().toISOString(),
      is_optimistic: true,
      image_url: imageUrl ? URL.createObjectURL(imageFile) : null
    };
    
    setPosts(prev => [...prev, tempPost]);
    setContent('');
    setImageFile(null);
    scrollToBottom();

    await createPost(tempPost.content || " ", subject, [], imageUrl, null, block, false);
    setIsPosting(false);
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
                  cursor: 'pointer'
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Room Header */}
      <div style={{ 
        padding: '1rem 1.5rem', 
        background: 'rgba(11, 15, 20, 0.95)', 
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{subject}</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{block} Room</span>
        </div>
        <button onClick={leaveRoom} style={{ background: 'transparent', border: 'none', color: '#FF5E5B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
          <LogOut size={18} /> Leave
        </button>
      </div>

      {/* Chat Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '100px' }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
            No messages yet. Be the first to start the discussion!
          </div>
        ) : (
          posts.map(post => {
            const isMe = post.author_username === (localStorage.getItem('jluwhisper_username') || 'Anonymous');
            return (
              <div key={post.id} style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                opacity: post.is_optimistic ? 0.6 : 1
              }}>
                {!isMe && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: '8px' }}>{post.author_username || 'Anonymous'}</div>}
                <div style={{
                  background: isMe ? 'linear-gradient(135deg, var(--primary), #20B2AA)' : 'var(--bg-elevated)',
                  color: isMe ? '#fff' : 'var(--text-main)',
                  padding: '0.8rem 1rem',
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  border: isMe ? 'none' : '1px solid var(--border)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {post.image_url && <img src={post.image_url} alt="attachment" style={{ width: '100%', borderRadius: '10px', marginBottom: '8px' }} />}
                  <div style={{ lineHeight: '1.4', wordBreak: 'break-word' }}>{post.content}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Composer */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: '1rem', 
        background: 'var(--bg-secondary)', 
        borderTop: '1px solid var(--border)',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
        zIndex: 100
      }}>
        <div className="layout-main" style={{ margin: '0 auto', border: 'none', padding: 0 }}>
            {imageFile && (
                <div style={{ padding: '0.5rem', background: 'rgba(53, 214, 231, 0.1)', borderRadius: '10px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Image attached</span>
                    <button onClick={() => setImageFile(null)} style={{ background: 'transparent', border: 'none', color: '#ff4444' }}>X</button>
                </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <label style={{ cursor: 'pointer', padding: '0.8rem', background: 'var(--bg-elevated)', borderRadius: '50%', color: 'var(--text-muted)' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) setImageFile(e.target.files[0]); }} />
                <ImageIcon size={20} />
            </label>
            <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Message the room..."
                style={{
                flex: 1,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '24px',
                padding: '0.8rem 1.2rem',
                color: '#fff',
                resize: 'none',
                minHeight: '20px',
                maxHeight: '100px'
                }}
                rows={1}
            />
            <button 
                onClick={handleSend}
                disabled={isPosting || (!content.trim() && !imageFile)}
                style={{
                background: (content.trim() || imageFile) ? 'var(--primary)' : 'var(--bg-elevated)',
                color: (content.trim() || imageFile) ? '#111' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '50%',
                width: '45px',
                height: '45px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (content.trim() || imageFile) ? 'pointer' : 'default',
                transition: '0.2s'
                }}
            >
                <Send size={20} />
            </button>
            </div>
        </div>
      </div>
    </div>
  );
}
