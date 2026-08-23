import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { socket } from '../socket';
import { getSessionToken, uploadFile } from '../api';
import { Flame, Image, Mic, Square, Send, ThumbsUp, Trash2, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://lakecity-whispers-backend.onrender.com/api';

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString();
}

async function apiFetch(endpoint, options = {}) {
  const token = await getSessionToken();
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { 'Authorization': token, 'Content-Type': 'application/json', ...options.headers }
  });
  return res.json();
}

// Recursive threaded comment component
function RoomComment({ comment, onReply, onDelete, myIdentity, depth = 0 }) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const isAuthor = comment.author_username === myIdentity;

  const handleSend = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim());
    setReplyText('');
    setShowReplyInput(false);
  };

  return (
    <div style={{
      marginLeft: depth > 0 ? '1rem' : '0',
      borderLeft: depth > 0 ? '2px solid rgba(255,255,255,0.08)' : 'none',
      paddingLeft: depth > 0 ? '0.75rem' : '0',
      marginTop: '0.6rem',
    }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)'
        }}>
          {comment.is_oracle_post ? '🌟' : (comment.is_admin_post ? '👑' : (comment.author_username || 'A').charAt(0).toUpperCase())}
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '0.5rem 0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
              {comment.is_oracle_post ? '🌟 JLU Oracle' : (comment.is_admin_post ? '👑 Admin' : comment.author_username)}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatTime(comment.created_at)}</span>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', margin: 0 }}>{comment.content}</p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowReplyInput(v => !v)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Reply
            </button>
            {isAuthor && (
              <button
                onClick={() => onDelete(comment.id)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,94,91,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem' }}
              >
                <Trash2 size={10} /> Delete
              </button>
            )}
          </div>
          {showReplyInput && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '0.3rem 0.6rem' }}>
              <input
                autoFocus
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Reply..."
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', fontSize: '0.83rem' }}
              />
              <button onClick={handleSend} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                <Send size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map(r => (
            <RoomComment key={r.id} comment={r} onReply={onReply} onDelete={onDelete} myIdentity={myIdentity} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// Single post card
function RoomPostCard({ post, onReply, onDelete, onUpvote, myIdentity }) {
  const [replyText, setReplyText] = useState('');
  const [upvoted, setUpvoted] = useState(false);
  const isAuthor = post.author_username === myIdentity;

  const handleSend = () => {
    if (!replyText.trim()) return;
    onReply(post.id, replyText.trim());
    setReplyText('');
  };

  const handleUpvote = () => {
    if (upvoted) return;
    setUpvoted(true);
    onUpvote(post.id);
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '1rem',
      marginBottom: '0.75rem',
    }}>
      {/* Author pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.2rem 0.75rem 0.2rem 0.25rem' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
            {post.is_oracle_post ? '🌟' : (post.is_admin_post ? '👑' : post.author_username.charAt(0).toUpperCase())}
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: '600', color: post.is_oracle_post ? '#35D6E7' : (post.is_admin_post ? '#ffd700' : 'var(--text-main)') }}>
            {post.is_oracle_post ? '🌟 JLU Oracle' : (post.is_admin_post ? '👑 Admin' : post.author_username)}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatTime(post.created_at)}</span>
        </div>
        {isAuthor && (
          <button onClick={() => onDelete(post.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,94,91,0.5)', cursor: 'pointer' }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      {post.content && <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.75rem', lineHeight: 1.5 }}>{post.content}</p>}

      {/* Image */}
      {post.image_url && (
        <div style={{ marginBottom: '0.75rem', borderRadius: '12px', overflow: 'hidden' }}>
          <img src={post.image_url.startsWith('http') ? post.image_url : `${API_URL.replace('/api', '')}${post.image_url}`} alt="Attachment" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} />
        </div>
      )}

      {/* Audio */}
      {post.audio_url && (
        <div style={{ marginBottom: '0.75rem' }}>
          <audio controls src={post.audio_url.startsWith('http') ? post.audio_url : `${API_URL.replace('/api', '')}${post.audio_url}`} style={{ width: '100%', height: '36px' }} />
        </div>
      )}

      {/* Reactions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <button onClick={handleUpvote} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: upvoted ? 'default' : 'pointer', color: upvoted ? 'var(--primary)' : 'var(--text-muted)', transition: 'color 0.2s' }}>
          <ThumbsUp size={14} fill={upvoted ? 'currentColor' : 'none'} /> {post.upvotes + (upvoted ? 1 : 0)}
        </button>
        <span style={{ color: 'var(--text-muted)' }}>
          {post.replies && post.replies.length > 0 ? `${post.replies.length} comment${post.replies.length !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {/* Threaded comments */}
      {post.replies && post.replies.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginBottom: '0.75rem' }}>
          {post.replies.map(r => (
            <RoomComment key={r.id} comment={r} onReply={onReply} onDelete={onDelete} myIdentity={myIdentity} depth={0} />
          ))}
        </div>
      )}

      {/* Inline reply input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.4rem 0.75rem' }}>
        <input
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Comment..."
          style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', fontSize: '0.87rem' }}
        />
        <button onClick={handleSend} disabled={!replyText.trim()} style={{ background: 'none', border: 'none', color: replyText.trim() ? 'var(--primary)' : 'var(--text-muted)', cursor: replyText.trim() ? 'pointer' : 'default', transition: 'color 0.2s' }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// Main RoomFeed component
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
  const myIdentity = localStorage.getItem('jluwhisper_identity') || 'Anonymous';

  // Load posts
  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/rooms/posts?block=${encodeURIComponent(block)}&subject=${encodeURIComponent(subject)}`);
      setPosts(data.posts || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [block, subject]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Join socket room channel
  useEffect(() => {
    socket.emit('join_room_channel', { block, subject });

    const handleNewPost = (post) => {
      setPosts(prev => {
        if (prev.find(p => p.id === post.id)) return prev;
        return [post, ...prev];
      });
    };

    const insertReplyDeep = (nodes, targetId, reply) => {
      return nodes.map(node => {
        if (node.id === targetId) {
          return { ...node, replies: [...(node.replies || []), reply] };
        }
        if (node.replies && node.replies.length > 0) {
          return { ...node, replies: insertReplyDeep(node.replies, targetId, reply) };
        }
        return node;
      });
    };

    const handleNewReply = (reply) => {
      setPosts(prev => {
        // First check if reply is a direct reply to a root post
        const rootPost = prev.find(p => p.id === reply.parent_id);
        if (rootPost) {
          return prev.map(p =>
            p.id === reply.parent_id
              ? { ...p, replies: [...(p.replies || []), reply] }
              : p
          );
        }
        // Else insert deep in thread
        return insertReplyDeep(prev, reply.parent_id, reply);
      });
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

  const handleUpvote = async (postId) => {
    try {
      await apiFetch(`/rooms/posts/${postId}/upvote`, { method: 'POST' });
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
    <div className="page-content">
      {/* Room header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🏫</span>
            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-main)' }}>{subject}</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{block} · Private Room</span>
        </div>
        <button onClick={onLeave} style={{ background: 'rgba(255,94,91,0.1)', border: '1px solid rgba(255,94,91,0.3)', color: '#FF5E5B', borderRadius: '20px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.82rem' }}>
          Leave
        </button>
      </div>

      {/* Composer card */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1rem', marginBottom: '1rem' }}>
        <textarea
          rows={3}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Share your thoughts, add a poll, or a photo..."
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', resize: 'none', fontSize: '0.95rem', fontFamily: 'inherit' }}
        />

        {/* Attachment previews */}
        {(imageFile || audioBlob) && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {imageFile && (
              <div style={{ position: 'relative' }}>
                <img src={URL.createObjectURL(imageFile)} alt="preview" style={{ height: 60, borderRadius: 8, objectFit: 'cover' }} />
                <button onClick={() => setImageFile(null)} style={{ position: 'absolute', top: -6, right: -6, background: 'var(--bg-elevated)', borderRadius: '50%', border: '1px solid var(--border-color)', cursor: 'pointer', padding: 2, color: 'var(--text-muted)' }}><X size={12} /></button>
              </div>
            )}
            {audioBlob && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', borderRadius: 20, padding: '0.4rem 0.8rem', border: '1px solid var(--border-color)' }}>
                <audio controls src={URL.createObjectURL(audioBlob)} style={{ height: 28 }} />
                <button onClick={() => setAudioBlob(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} /></button>
              </div>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={e => e.target.files?.[0] && setImageFile(e.target.files[0])} />
          <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.83rem' }}>
            <Image size={16} /> Pic
          </button>
          {isRecording ? (
            <button onClick={stopRecording} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: '0.83rem', animation: 'pulse 1.5s infinite' }}>
              <Square size={16} fill="red" /> Stop
            </button>
          ) : (
            <button onClick={startRecording} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.83rem' }}>
              <Mic size={16} /> Audio
            </button>
          )}
          <button
            onClick={handlePost}
            disabled={isPosting || (!content.trim() && !imageFile && !audioBlob)}
            className="btn-glow"
            style={{ marginLeft: 'auto', padding: '0.4rem 1.2rem', fontSize: '0.85rem' }}
          >
            {isPosting ? '...' : 'Whisper'}
          </button>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading room...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤫</div>
          <p>No whispers yet in this room. Be the first!</p>
        </div>
      ) : (
        posts.map(post => (
          <RoomPostCard
            key={post.id}
            post={post}
            onReply={handleReply}
            onDelete={handleDelete}
            onUpvote={handleUpvote}
            myIdentity={myIdentity}
          />
        ))
      )}
    </div>
  );
}
