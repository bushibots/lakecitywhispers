import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../socket';
import { getSessionToken, uploadFile } from '../api';
import { Image, Mic, Square, Send, Trash2, X, CornerDownRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://lakecity-whispers-backend.onrender.com/api';

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  if (now.toDateString() === d.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function apiFetch(endpoint, options = {}) {
  const token = await getSessionToken();
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { 'Authorization': token, 'Content-Type': 'application/json', ...options.headers }
  });
  return res.json();
}

// Flat comment style for nested replies
function ChatReply({ reply, myIdentity, onDelete }) {
  const isAuthor = reply.author_username === myIdentity;
  
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', paddingLeft: '2.5rem', position: 'relative' }}>
      <div style={{ position: 'absolute', left: '1rem', top: '-0.5rem', borderLeft: '2px solid var(--border-strong)', borderBottom: '2px solid var(--border-strong)', width: '1rem', height: '1.5rem', borderBottomLeftRadius: '8px' }}></div>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
        {reply.author_username.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{reply.author_username}</span>
            {reply.author_badges && reply.author_badges.map((b, i) => (
                <span key={i} title={b.text} style={{ fontSize: '0.65rem', marginLeft: '2px' }}>{b.icon}</span>
            ))}
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{formatTime(reply.created_at)}</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '2px' }}>{reply.content}</div>
      </div>
      {isAuthor && (
        <button onClick={() => onDelete(reply.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,94,91,0.5)', cursor: 'pointer', padding: 0 }}>
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

// Main chat message
function ChatMessage({ post, onReply, onDelete, myIdentity }) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const isAuthor = post.author_username === myIdentity;

  const handleSend = () => {
    if (!replyText.trim()) return;
    onReply(post.id, replyText.trim());
    setReplyText('');
    setShowReplyInput(false);
  };

  return (
    <div className="chat-message" style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-color)', marginBottom: '0.5rem', borderRadius: '16px', boxShadow: 'var(--neu-shadow-sm)', margin: '0.5rem' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #35D6E7, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold', color: '#fff', flexShrink: 0 }}>
        {post.is_oracle_post ? '🌟' : (post.is_admin_post ? '👑' : post.author_username.charAt(0).toUpperCase())}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: post.is_oracle_post ? '#35D6E7' : (post.is_admin_post ? '#ffd700' : 'var(--text-main)') }}>
              {post.is_oracle_post ? '🌟 JLU Oracle' : (post.is_admin_post ? '👑 Admin' : post.author_username)}
            </span>
            {post.author_badges && post.author_badges.map((b, i) => (
                <span key={i} title={b.text} style={{ fontSize: '0.8rem', marginLeft: '2px' }}>{b.icon}</span>
            ))}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatTime(post.created_at)}</span>
        </div>
        
        {post.content && <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.content}</div>}
        
        {post.image_url && (
          <img src={post.image_url.startsWith('http') ? post.image_url : `${API_URL.replace('/api', '')}${post.image_url}`} alt="Attachment" style={{ marginTop: '0.5rem', maxWidth: '300px', width: '100%', borderRadius: '8px', objectFit: 'cover' }} />
        )}
        
        {post.audio_url && (
          <audio controls src={post.audio_url.startsWith('http') ? post.audio_url : `${API_URL.replace('/api', '')}${post.audio_url}`} style={{ marginTop: '0.5rem', width: '100%', maxWidth: '300px', height: '36px' }} />
        )}

        {/* Action bar hidden by default, visible on hover conceptually, but we'll show small icons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem' }}>
          <button onClick={() => setShowReplyInput(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CornerDownRight size={12} /> Reply
          </button>
          {isAuthor && (
            <button onClick={() => onDelete(post.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,94,91,0.5)', cursor: 'pointer', fontSize: '0.75rem', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>

        {/* Nested Replies */}
        {post.replies && post.replies.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            {post.replies.map(r => (
              <ChatReply key={r.id} reply={r} myIdentity={myIdentity} onDelete={onDelete} />
            ))}
          </div>
        )}

        {/* Inline Reply Input */}
        {showReplyInput && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', background: 'var(--bg-color)', boxShadow: 'var(--neu-inset-sm)', borderRadius: '8px', padding: '0.4rem 0.6rem' }}>
            <input
              autoFocus
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Reply to thread..."
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', fontSize: '0.85rem' }}
            />
            <button onClick={handleSend} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}>
              <Send size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoomFeed({ block, subject, onLeave }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const mediaRecorderRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const myIdentity = localStorage.getItem('jluwhisper_identity') || 'Anonymous';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/rooms/posts?block=${encodeURIComponent(block)}&subject=${encodeURIComponent(subject)}`);
      // API returns newest first, we want oldest first for chat
      setPosts((data.posts || []).reverse());
    } catch (e) { console.error(e); }
    setLoading(false);
    setTimeout(scrollToBottom, 100);
  }, [block, subject]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    socket.emit('join_room_channel', { block, subject });

    const handleNewPost = (post) => {
      setPosts(prev => {
        if (prev.find(p => p.id === post.id)) return prev;
        return [...prev, post]; // Append at end for chat
      });
      setTimeout(scrollToBottom, 100);
    };

    const handleNewReply = (reply) => {
      setPosts(prev => prev.map(p => {
        if (p.id === reply.parent_id) {
          return { ...p, replies: [...(p.replies || []), reply] };
        }
        return p;
      }));
    };

    socket.on('room_new_post', handleNewPost);
    socket.on('room_new_reply', handleNewReply);
    return () => {
      socket.emit('leave_room_channel', { block, subject });
      socket.off('room_new_post', handleNewPost);
      socket.off('room_new_reply', handleNewReply);
    };
  }, [block, subject]);

  const handlePost = async () => {
    if (!content.trim() && !imageFile && !audioBlob) return;
    setIsPosting(true);
    try {
      let imageUrl = null, audioUrl = null;
      if (imageFile) imageUrl = await uploadFile(imageFile);
      if (audioBlob) {
        const audioFile = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });
        audioUrl = await uploadFile(audioFile);
      }
      await apiFetch('/rooms/posts', {
        method: 'POST',
        body: JSON.stringify({ content, image_url: imageUrl, audio_url: audioUrl, room_block: block, room_subject: subject })
      });
      setContent('');
      setImageFile(null);
      setAudioBlob(null);
    } catch (e) { console.error(e); }
    setIsPosting(false);
  };

  const handleReply = async (postId, text) => {
    try {
      await apiFetch(`/rooms/posts/${postId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content: text })
      });
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (postId) => {
    try {
      await apiFetch(`/rooms/posts/${postId}`, { method: 'DELETE' });
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (e) { console.error(e); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => setAudioBlob(new Blob(chunks, { type: 'audio/webm' }));
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch (e) { console.error(e); }
  };
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', background: 'var(--bg-main)', margin: '-1rem' }}>
      {/* Chat Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-color)', borderBottom: 'none', boxShadow: 'var(--neu-shadow-sm)', zIndex: 10, margin: '0.5rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '8px', background: 'rgba(53, 214, 231, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            🏫
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-main)' }}>{subject}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{block} Room</div>
          </div>
        </div>
        <button onClick={onLeave} style={{ background: 'var(--bg-color)', border: 'none', boxShadow: 'var(--neu-shadow-sm)', color: '#FF5E5B', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
          Leave
        </button>
      </div>

      {/* Message List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>Syncing room...</div>
        ) : posts.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤫</div>
            <p>Welcome to {subject}.<br/>Be the first to say something!</p>
          </div>
        ) : (
          posts.map(post => (
            <ChatMessage key={post.id} post={post} onReply={handleReply} onDelete={handleDelete} myIdentity={myIdentity} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Bottom Composer */}
      <div style={{ padding: '1rem', background: 'var(--bg-color)', borderTop: 'none', boxShadow: '0 -4px 10px rgba(163, 177, 198, 0.4)', borderRadius: '24px 24px 0 0' }}>
        
        {/* Previews */}
        {(imageFile || audioBlob) && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {imageFile && (
              <div style={{ position: 'relative' }}>
                <img src={URL.createObjectURL(imageFile)} alt="preview" style={{ height: 60, borderRadius: 8, objectFit: 'cover' }} />
                <button onClick={() => setImageFile(null)} style={{ position: 'absolute', top: -6, right: -6, background: '#000', borderRadius: '50%', cursor: 'pointer', padding: 2, color: '#fff', border: 'none' }}><X size={12} /></button>
              </div>
            )}
            {audioBlob && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', borderRadius: 20, padding: '0.4rem 0.8rem' }}>
                <audio controls src={URL.createObjectURL(audioBlob)} style={{ height: 28 }} />
                <button onClick={() => setAudioBlob(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} /></button>
              </div>
            )}
          </div>
        )}

        {/* Input Bar */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', background: 'var(--bg-color)', borderRadius: '12px', padding: '0.5rem', border: 'none', boxShadow: 'var(--neu-inset)' }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}>
            <Image size={20} />
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={e => e.target.files?.[0] && setImageFile(e.target.files[0])} />
          
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePost();
              }
            }}
            placeholder={`Message ${subject}...`}
            rows={Math.min(5, content.split('\n').length)}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', resize: 'none', fontSize: '0.95rem', padding: '0.5rem 0', fontFamily: 'inherit', maxHeight: '120px' }}
          />

          {isRecording ? (
            <button onClick={stopRecording} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', padding: '0.5rem', animation: 'pulse 1.5s infinite' }}>
              <Square size={20} fill="red" />
            </button>
          ) : (
            <button onClick={startRecording} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}>
              <Mic size={20} />
            </button>
          )}

          <button
            onClick={handlePost}
            disabled={isPosting || (!content.trim() && !imageFile && !audioBlob)}
            style={{
              background: 'var(--bg-color)',
              color: (content.trim() || imageFile || audioBlob) ? 'var(--primary)' : 'var(--text-muted)',
              border: 'none', borderRadius: '8px', padding: '0.6rem', cursor: (content.trim() || imageFile || audioBlob) ? 'pointer' : 'default', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: (content.trim() || imageFile || audioBlob) ? 'var(--neu-shadow)' : 'var(--neu-inset-sm)'
            }}
          >
            <Send size={18} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}
