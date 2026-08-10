import { useState, useEffect, useRef } from 'react';
import { Image, Smile, Mic, BarChart2, MessageCircle, Flame, Eye, Share, X, Square, Mail, MoreVertical, Bookmark } from 'lucide-react';
import { getSessionToken, fetchPosts, createPost, votePost, fetchReplies, createReply, votePoll, recordView, uploadFile, requestMessage, fetchDailyPrompt, deletePost, editPost, pinPost } from '../api';
import { socket } from '../socket';
import { formatTime } from '../utils';

const CATEGORIES = ['Confessions', 'Crushes', 'Academics', 'Funny', 'Campus', 'Advice', 'Events'];
const IDENTITIES = ['Silent Owl', 'Midnight Fox', 'Quiet Wolf', 'Ghost Panda', 'Hidden Leaf', 'Shadow Cat'];

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('Confessions');
  const [filterTopic, setFilterTopic] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPollInputs, setShowPollInputs] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [votedPolls, setVotedPolls] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replies, setReplies] = useState({});
  const [replyContent, setReplyContent] = useState('');
  const [myIdentity, setMyIdentity] = useState('?');
  const [activeMenu, setActiveMenu] = useState(null);
  const [votedPosts, setVotedPosts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jluwhisper_voted_posts')) || {}; } catch(e) { return {}; }
  });
  const [savedPosts, setSavedPosts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jluwhisper_saved_posts')) || {}; } catch(e) { return {}; }
  });
  
  // Track which specific comment we are replying to, if any
  const [replyingTo, setReplyingTo] = useState(null);
  
  // Media states
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const chunksRef = useRef([]);

  const [dailyPrompt, setDailyPrompt] = useState('');

  useEffect(() => {
    getSessionToken().then(() => {
      setMyIdentity(localStorage.getItem('jluwhisper_identity') || '?');
      loadPosts(filterTopic);
    });
    fetchDailyPrompt().then(p => setDailyPrompt(p));

    const handleNewPost = (post) => {
      // If we are filtering, only show if it matches
      if (filterTopic && filterTopic !== 'Watchlist' && post.topic !== filterTopic) return;
      if (filterTopic === 'Watchlist' && !savedPosts[post.id]) return;
      
      setPosts(prev => {
        // Avoid duplicates if we created it
        if (prev.find(p => p.id === post.id)) return prev;
        return [post, ...prev];
      });
    };

    socket.on('new_post', handleNewPost);
    return () => socket.off('new_post', handleNewPost);
  }, [filterTopic]);

  const loadPosts = async (t) => {
    // 1. Instant load from local cache if on main feed
    if (!t) {
      const cached = localStorage.getItem('jluwhisper_feed_cache');
      if (cached) {
        try { setPosts(JSON.parse(cached)); } catch (e) {}
      }
    }
    
    // 2. Fetch fresh data
    setIsSyncing(true);
    const backendTopic = t === 'Watchlist' ? '' : t;
    let data = await fetchPosts(backendTopic);
    
    if (t === 'Watchlist') {
      const saved = JSON.parse(localStorage.getItem('jluwhisper_saved_posts')) || {};
      data = data.filter(p => saved[p.id]);
    }
    
    setPosts(data);
    setIsSyncing(false);
    
    // 3. Update cache
    if (!t && data && data.length > 0) {
      localStorage.setItem('jluwhisper_feed_cache', JSON.stringify(data));
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !imageFile && !audioBlob) return;
    setIsPosting(true);
    
    // Independence Day Easter Egg
    const textLower = content.toLowerCase();
    if (textLower.includes('jai hind') || textLower.includes('vande mataram') || textLower.includes('happy independence day')) {
        window.dispatchEvent(new CustomEvent('trigger_confetti', { detail: { colors: ['#FF9933', '#FFFFFF', '#138808'] } }));
    }
    
    let imageUrl = null;
    let audioUrl = null;
    
    if (imageFile) {
        imageUrl = await uploadFile(imageFile);
    }
    
    if (audioBlob) {
        const audioFile = new File([audioBlob], "voice_note.webm", { type: 'audio/webm' });
        audioUrl = await uploadFile(audioFile);
    }
    
    const validPollOptions = showPollInputs ? pollOptions.filter(o => o.trim()) : [];
    
    // OPTIMISTIC UI for createPost
    const tempId = Date.now() + Math.random();
    const tempPost = {
        id: tempId,
        content: content.trim() || " ",
        topic,
        author_username: myIdentity,
        created_at: new Date().toISOString(),
        upvotes: 0, downvotes: 0, views: 0, replies_count: 0,
        is_optimistic: true
    };
    
    setPosts(prev => [tempPost, ...prev]);
    setContent('');
    setImageFile(null);
    setAudioBlob(null);
    setShowPollInputs(false);
    setPollOptions(['', '']);
    
    const res = await createPost(content.trim() || " ", topic, validPollOptions, imageUrl, audioUrl);
    
    if (res && res.message) {
      // Background re-fetch to ensure sync
      await loadPosts(filterTopic);
    } else {
      // Revert if failed
      setPosts(prev => prev.filter(p => p.id !== tempId));
      import('react-hot-toast').then(m => m.toast.error("Failed to post whisper."));
    }
    setIsPosting(false);
  };
  
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            setAudioBlob(blob);
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        setIsRecording(true);
        recordingTimerRef.current = setTimeout(() => {
            import('react-hot-toast').then(m => m.toast.error("Voice note limit (2 min) reached."));
            stopRecording();
        }, 120000);
    } catch (err) {
        console.error("Error accessing microphone", err);
        alert("Microphone access denied or not available.");
    }
  };
  
  const stopRecording = () => {
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handlePollVote = async (postId, optionId) => {
    const res = await votePoll(postId, optionId);
    if (res && res.options) {
      setVotedPolls(prev => ({ ...prev, [postId]: true }));
      setPosts(current => current.map(p => p.id === postId ? { ...p, poll: { ...p.poll, options: res.options } } : p));
    } else if (res && res.error === "Already voted") {
      setVotedPolls(prev => ({ ...prev, [postId]: true }));
    }
  };

  const handleVote = async (postId, type) => {
    // Ponytail: frontend localStorage toggle for single upvote
    const isUpvoting = type === 'up';
    if (!isUpvoting) return; // Only support upvote toggle for now
    
    const hasVoted = votedPosts[postId];
    const newType = hasVoted ? 'remove_up' : 'up';
    
    setPosts(currentPosts => 
      currentPosts.map(p => p.id === postId ? {
        ...p,
        upvotes: hasVoted ? Math.max(0, p.upvotes - 1) : p.upvotes + 1
      } : p)
    );
    
    const newVotedPosts = { ...votedPosts };
    if (hasVoted) delete newVotedPosts[postId];
    else newVotedPosts[postId] = true;
    
    setVotedPosts(newVotedPosts);
    localStorage.setItem('jluwhisper_voted_posts', JSON.stringify(newVotedPosts));
    
    await votePost(postId, newType);
  };

  const toggleReplies = async (postId, e) => {
    e.stopPropagation();
    if (activeReplyId === postId) {
      setActiveReplyId(null);
      return;
    }
    setActiveReplyId(postId);
    
    if (!replies[postId]) {
      recordView(postId).then(() => {
        setPosts(currentPosts => currentPosts.map(p => p.id === postId ? { ...p, views: (p.views || 0) + 1 } : p));
      });
    }

    const data = await fetchReplies(postId);
    setReplies(prev => ({ ...prev, [postId]: data }));
  };

  const handleMessageRequest = async (postId, authorName) => {
    const content = prompt(`Send an anonymous message request to ${authorName}? Type your first message:`);
    if (content !== null && content.trim()) {
      const res = await requestMessage(postId, content.trim());
      if (res && res.message) {
        alert("Message request sent successfully!");
      } else if (res && res.error) {
        alert(res.error);
      }
    }
  };

  const handleSavePost = (postId, e) => {
    e.stopPropagation();
    const newSaved = { ...savedPosts };
    if (newSaved[postId]) delete newSaved[postId];
    else newSaved[postId] = true;
    setSavedPosts(newSaved);
    localStorage.setItem('jluwhisper_saved_posts', JSON.stringify(newSaved));
  };

  const submitReply = async (rootPostId, targetId) => {
    if (!replyContent.trim()) return;
    
    // OPTIMISTIC UI for Reply
    const tempReply = {
      id: Date.now() + Math.random(),
      content: replyContent.trim(),
      author_username: myIdentity,
      created_at: new Date().toISOString(),
      upvotes: 0, downvotes: 0,
      replies: [],
      is_optimistic: true
    };
    
    // Helper to recursively insert reply
    const insertReply = (nodes, targetId, newReply) => {
      if (rootPostId === targetId) return [newReply, ...nodes];
      return nodes.map(node => {
        if (node.id === targetId) {
          return { ...node, replies: [newReply, ...(node.replies || [])] };
        }
        if (node.replies) {
          return { ...node, replies: insertReply(node.replies, targetId, newReply) };
        }
        return node;
      });
    };
    
    setReplies(prev => ({
      ...prev,
      [rootPostId]: insertReply(prev[rootPostId] || [], targetId, tempReply)
    }));
    setPosts(currentPosts => currentPosts.map(p => 
      p.id === rootPostId ? { ...p, replies_count: p.replies_count + 1 } : p
    ));
    
    const contentToPost = replyContent.trim();
    setReplyContent('');
    setReplyingTo(null);
    
    // Background POST
    await createReply(targetId, contentToPost);
    
    // Sync true state
    const data = await fetchReplies(rootPostId);
    setReplies(prev => ({ ...prev, [rootPostId]: data }));
  };

  const handleDelete = async (postId) => {
    if (confirm("Are you sure you want to delete this whisper?")) {
      await deletePost(postId);
      setPosts(posts.filter(p => p.id !== postId));
    }
  };

  const handleEdit = async (postId, oldContent) => {
    const newContent = prompt("Edit your whisper:", oldContent.replace(" (edited)", ""));
    if (newContent !== null && newContent.trim()) {
      const res = await editPost(postId, newContent.trim());
      if (res && res.post) {
        setPosts(posts.map(p => p.id === postId ? res.post : p));
      }
    }
  };

  const handlePin = async (postId) => {
    const res = await pinPost(postId);
    if (res) {
      setPosts(posts.map(p => p.id === postId ? { ...p, is_pinned: res.is_pinned } : p));
    }
  };

  const Comment = ({ comment, rootPostId, depth = 0 }) => (
    <div style={{ 
      marginLeft: depth > 0 ? '1rem' : '0', 
      paddingLeft: depth > 0 ? '1rem' : '0',
      borderLeft: depth > 0 ? '2px solid var(--border-strong)' : 'none',
      marginTop: '1rem',
      opacity: comment.is_optimistic ? 0.6 : 1
    }}>
      <div className="reply-item" style={{ borderBottom: 'none', padding: 0 }}>
        <div className="avatar-flame small" style={comment.is_admin_post ? {background: 'linear-gradient(135deg, #ffd700, #ff8c00)'} : {}}>
            {comment.author_avatar && comment.author_avatar.startsWith('http') ? (
              <img src={comment.author_avatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              (comment.author_avatar || comment.author_username || 'A').charAt(0)
            )}
        </div>
        <div className="reply-content" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="name" style={{ fontSize: '0.85rem', ...(comment.is_admin_post ? {color: '#ffd700', fontWeight: 'bold'} : {}) }}>
              {comment.is_admin_post ? '👑 Admin' : (comment.author_username || 'Anonymous')}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {formatTime(comment.created_at)}
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>{comment.content}</p>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
            <button className="icon-btn-minimal" style={{ fontSize: '0.75rem', padding: 0 }} onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>
              <MessageCircle size={12} style={{ marginRight: '4px' }} /> Reply
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <Flame size={12} style={{ marginRight: '4px' }} /> {comment.upvotes}
            </span>
          </div>
          
          {replyingTo === comment.id && (
            <div className="reply-composer" style={{ marginTop: '0.5rem', background: 'transparent' }}>
              <input 
                className="composer-textarea reply-input" 
                style={{ fontSize: '0.85rem', padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '8px' }}
                placeholder={`Reply to ${comment.author_username}...`}
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitReply(rootPostId, comment.id)}
                autoFocus
              />
              <button className="btn-glow small" onClick={() => submitReply(rootPostId, comment.id)} disabled={!replyContent.trim()}>Send</button>
            </div>
          )}
        </div>
      </div>
      
      {/* Recursive Replies Render */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="nested-replies">
          {comment.replies.map(r => <Comment key={r.id} comment={r} rootPostId={rootPostId} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );

  const renderPost = (post, isDailyPrompt = false) => {
    if (!post) return null;
    const identity = post.author_username || 'Anonymous';
    const isAdminUser = localStorage.getItem('jluwhisper_admin') === 'true';
    const isAuthor = post.author_username === myIdentity;
    const canEdit = isAdminUser || isAuthor;
    
    // Distinctive styling for admin posts and pinned posts
    const cardStyle = { ... (isDailyPrompt ? { border: '2px solid var(--accent-color)', boxShadow: '0 4px 12px rgba(108, 92, 231, 0.15)', position: 'relative' } : {}) };
    if (post.is_admin_post) {
        cardStyle.border = '1px solid #ffd700';
        cardStyle.background = 'linear-gradient(145deg, rgba(255, 215, 0, 0.05) 0%, rgba(0,0,0,0) 100%)';
    }
    if (post.is_pinned) {
        cardStyle.borderLeft = '4px solid var(--accent-color)';
    }

    return (
      <div key={post.id} className="feed-card" style={cardStyle}>
        {post.is_pinned && <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>📌 PINNED</div>}
        {isDailyPrompt && <div style={{ position: 'absolute', top: '-12px', left: '1.5rem', backgroundColor: 'var(--accent-color)', color: 'white', padding: '0.2rem 0.8rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={12}/> Prompt of the Day</div>}
        <div className="card-header">
          <div className="avatar-flame" style={post.is_admin_post ? {background: 'linear-gradient(135deg, #ffd700, #ff8c00)'} : {}}>
            {post.author_avatar && post.author_avatar.startsWith('http') ? (
              <img src={post.author_avatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              (post.author_avatar || identity).charAt(0)
            )}
          </div>
          <div className="card-meta">
            <span className="name" style={post.is_admin_post ? {color: '#ffd700', fontWeight: 'bold'} : {}}>{post.is_admin_post ? '👑 Admin' : identity}</span>
            <span className="time">{formatTime(post.created_at)}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="category-badge">{post.topic}</span>
            {isAdminUser && (
                <button className="icon-btn-minimal" onClick={() => handlePin(post.id)} title={post.is_pinned ? "Unpin Post" : "Pin Post"}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={post.is_pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                </button>
            )}
            {canEdit && (
                <div style={{ position: 'relative' }}>
                    <button className="icon-btn-minimal" onClick={() => setActiveMenu(activeMenu === post.id ? null : post.id)}>
                        <MoreVertical size={16} />
                    </button>
                    {activeMenu === post.id && (
                        <div style={{ position: 'absolute', right: 0, top: '24px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px', zIndex: 10, minWidth: '120px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'transparent', border: 'none', color: 'var(--text-color)', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }} onClick={() => { setActiveMenu(null); handleEdit(post.id, post.content); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit
                            </button>
                            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'transparent', border: 'none', color: 'var(--danger-color, #ff4757)', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }} onClick={() => { setActiveMenu(null); handleDelete(post.id); }}>
                                <X size={14} /> Delete
                            </button>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
        
        <div className="card-text">{post.content.trim() && post.content.trim() !== " " ? post.content : ""}</div>
        
        {post.image_url && (
            <div style={{ marginTop: '1rem', borderRadius: '12px', overflow: 'hidden' }}>
                <img src={post.image_url.startsWith('http') ? post.image_url : (import.meta.env.VITE_API_URL || 'https://lakecity-whispers-backend.onrender.com').replace('/api', '') + post.image_url} alt="Attached" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', display: 'block' }} />
            </div>
        )}
        
        {post.audio_url && (
            <div style={{ marginTop: '1rem' }}>
                <audio controls src={post.audio_url.startsWith('http') ? post.audio_url : (import.meta.env.VITE_API_URL || 'https://lakecity-whispers-backend.onrender.com').replace('/api', '') + post.audio_url} style={{ width: '100%', height: '40px', outline: 'none' }} />
            </div>
        )}
        
        {post.poll && (
          <div className="poll-widget" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {post.poll.options.map(opt => {
              const totalVotes = post.poll.options.reduce((sum, o) => sum + o.votes, 0);
              const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
              const hasVoted = votedPolls[post.id] || post.poll.has_voted;
              const isSelected = (votedPolls[post.id] === opt.id) || (post.poll.voted_option_id === opt.id);
              
              return (
                <div 
                  key={opt.id} 
                  style={{
                    position: 'relative',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    cursor: hasVoted ? 'default' : 'pointer',
                    overflow: 'hidden',
                    backgroundColor: isSelected && !hasVoted ? 'rgba(29, 155, 240, 0.1)' : 'var(--bg-secondary)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { if(!hasVoted) e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseLeave={(e) => { if(!hasVoted) e.currentTarget.style.transform = 'scale(1)'; }}
                  onClick={() => {
                      if(!hasVoted) handlePollVote(post.id, opt.id);
                  }}
                >
                  {hasVoted && (
                    <div 
                      style={{
                        position: 'absolute', top: 0, left: 0, bottom: 0,
                        width: `${percent}%`,
                        backgroundColor: 'var(--primary)',
                        opacity: 0.15,
                        transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    />
                  )}
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>{opt.text}</span>
                      {isSelected && hasVoted && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </div>
                    {hasVoted && <span style={{ fontWeight: 'bold' }}>{percent}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="reactions-bar">
          <button className="reaction-btn" onClick={(e) => { e.stopPropagation(); handleVote(post.id, 'up'); }} style={votedPosts[post.id] ? { color: 'var(--accent-color)' } : {}}>
            <Flame size={16} fill={votedPosts[post.id] ? 'var(--accent-color)' : 'none'} /> <span>{post.upvotes > 0 ? post.upvotes : 'Relatable'}</span>
          </button>
          
          <button className="reaction-btn" onClick={(e) => toggleReplies(post.id, e)}>
            <MessageCircle size={16} /> <span>{post.replies_count || 'Reply'}</span>
          </button>
          
          <div className="reaction-stats">
            <span className="stat-item"><Eye size={16} /> {post.views || 0}</span>
            <button className="icon-btn-minimal" onClick={(e) => { e.stopPropagation(); handleMessageRequest(post.id, identity); }} title="Send Message">
                <Mail size={16} />
            </button>
            <button className="icon-btn-minimal" onClick={(e) => handleSavePost(post.id, e)} style={{ color: savedPosts[post.id] ? 'var(--accent-color)' : 'inherit' }} title={savedPosts[post.id] ? "Remove from Watchlist" : "Add to Watchlist"}>
                <Bookmark size={16} fill={savedPosts[post.id] ? 'var(--accent-color)' : 'none'} />
            </button>
            <button className="icon-btn-minimal"><Share size={16} /></button>
          </div>
        </div>

        {/* Inline Replies */}
        {activeReplyId === post.id && (
          <div className="replies-section">
            <div className="reply-composer">
              <input 
                className="composer-textarea reply-input" 
                placeholder="Drop an anonymous reply..." 
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitReply(post.id, post.id)}
              />
              <button className="btn-glow small" onClick={() => submitReply(post.id, post.id)} disabled={!replyContent.trim()}>Reply</button>
            </div>
            
            <div className="comments-tree">
              {(replies[post.id] || []).map(r => (
                <Comment key={r.id} comment={r} rootPostId={post.id} depth={0} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-content">

      {/* Categories */}
      <div className="pill-menu">
        <div 
          className={`pill-tab ${filterTopic === '' ? 'active' : ''}`}
          onClick={() => setFilterTopic('')}
        >
          Trending
        </div>
        <div 
          className={`pill-tab ${filterTopic === 'Watchlist' ? 'active' : ''}`}
          onClick={() => setFilterTopic('Watchlist')}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Bookmark size={14} /> Watchlist
        </div>
        {CATEGORIES.map(t => (
          <div 
            key={t}
            className={`pill-tab ${filterTopic === t ? 'active' : ''}`}
            onClick={() => setFilterTopic(t)}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Advanced Composer */}
      <div className="composer-box">
        <div className="composer-inner">
          <div className="avatar-flame" style={{ width: 40, height: 40, flexShrink: 0 }}>{myIdentity.charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <textarea 
              className="composer-textarea" 
              rows="2" 
              placeholder="What's on your mind? Share your whisper anonymously..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            ></textarea>
            
            <div className="composer-toolbar">
              <div className="toolbar-actions">
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                          if (e.target.files[0].size > 9 * 1024 * 1024) {
                              import('react-hot-toast').then(m => m.toast.error("File exceeds 9MB limit."));
                              return;
                          }
                          setImageFile(e.target.files[0]);
                      }
                  }}
                />
                <button className="icon-btn tooltip" data-tip="Add Image" onClick={() => fileInputRef.current?.click()}>
                    <Image size={20} />
                </button>
                <button className="icon-btn tooltip" data-tip="Add Emoji" disabled><Smile size={20} /></button>
                
                {isRecording ? (
                    <button className="icon-btn tooltip" data-tip="Stop Recording" onClick={stopRecording} style={{ color: 'red', animation: 'pulse 1.5s infinite' }}>
                        <Square size={20} fill="currentColor" />
                    </button>
                ) : (
                    <button className="icon-btn tooltip" data-tip="Voice Note" onClick={startRecording}>
                        <Mic size={20} />
                    </button>
                )}
                
                <button className={`icon-btn tooltip ${showPollInputs ? 'active' : ''}`} data-tip="Poll" onClick={() => setShowPollInputs(!showPollInputs)}><BarChart2 size={20} /></button>
              </div>
              
              <div className="toolbar-right">
                <select 
                  className="select-pill"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  style={{ marginRight: '1rem', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                >
                  {CATEGORIES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                
                <span className="char-count" style={{ color: content.length > 250 ? 'red' : 'var(--text-muted)', fontSize: '0.8rem', marginRight: '1rem' }}>
                  {content.length}/300
                </span>
                
                <button 
                  className="btn-glow" 
                  onClick={handlePost} 
                  disabled={isPosting || (!content.trim() && !imageFile && !audioBlob) || content.length > 300 || isRecording}
                >
                  Whisper
                </button>
              </div>
            </div>
            
            {/* Attachments Preview */}
            {(imageFile || audioBlob) && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {imageFile && (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img src={URL.createObjectURL(imageFile)} alt="Preview" style={{ height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                            <button 
                                onClick={() => setImageFile(null)}
                                style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--bg-elevated)', borderRadius: '50%', padding: '2px', cursor: 'pointer', border: '1px solid var(--border-color)', color: 'var(--text-color)' }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    {audioBlob && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                            <audio controls src={URL.createObjectURL(audioBlob)} style={{ height: '30px' }} />
                            <button 
                                onClick={() => setAudioBlob(null)}
                                style={{ marginLeft: '10px', background: 'transparent', cursor: 'pointer', border: 'none', color: 'var(--text-muted)' }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}
                </div>
            )}
            
            {showPollInputs && (
              <div className="poll-inputs" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pollOptions.map((opt, i) => (
                  <input
                    key={i}
                    className="composer-textarea"
                    style={{ minHeight: '30px', padding: '0.5rem' }}
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[i] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                  />
                ))}
                {pollOptions.length < 4 && (
                  <button 
                    className="icon-btn-minimal" 
                    style={{ alignSelf: 'flex-start', fontSize: '0.8rem', color: 'var(--accent-color)' }}
                    onClick={() => setPollOptions([...pollOptions, ''])}
                  >
                    + Add Option
                  </button>
                )}
              </div>
            )}
            
          </div>
        </div>
      </div>

      {dailyPrompt && filterTopic === '' && (
        <div className="daily-prompt-section" style={{ marginBottom: '2rem' }}>
          {renderPost(dailyPrompt, true)}
        </div>
      )}

      {/* Syncing Indicator */}
      {isSyncing && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '10px 0', marginBottom: '1.5rem'
        }}>
          <span style={{ 
            fontSize: '0.75rem', color: 'var(--text-muted)', 
            marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '2px',
            animation: 'pulse 1.5s infinite'
          }}>
            Syncing
          </span>
          <div style={{
            width: '120px', height: '2px', background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '2px', overflow: 'hidden', position: 'relative'
          }}>
             <div style={{
               position: 'absolute', top: 0, left: 0, bottom: 0,
               width: '50%', background: 'linear-gradient(90deg, transparent, var(--accent-glow), transparent)',
               animation: 'shimmerLine 1.5s infinite linear'
             }}></div>
          </div>
        </div>
      )}

      {/* Feed Cards */}
      <div className="feed-list">
        {posts.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-.95.23-1.78.75-2.49 1.32-2.59 2.08-3.61 5.75-2.39 8.9.04.1.08.2.08.33 0 .22-.15.42-.35.5-.22.1-.46.04-.56-.12-.05-.09-.09-.18-.12-.28-1.07-3.75 1.08-7.73 1.08-7.73-3.6 2.05-5.75 6.07-5.11 10.02.04.25.1.51.18.77.89 3.01 3.51 5.29 6.64 5.29 1.48 0 2.87-.47 4.01-1.25 1.57-1.07 2.68-2.73 2.96-4.66.24-1.68-.31-3.26-1.2-4.62z"/>
            </svg>
            <h3>It's quiet here...</h3>
            <p>Someone has to break the silence.</p>
          </div>
        ) : (
          posts.filter(p => !dailyPrompt || p.id !== dailyPrompt.id).map(p => renderPost(p))
        )}
      </div>
    </div>
  );
}
