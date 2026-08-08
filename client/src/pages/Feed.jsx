import { useState, useEffect, useRef } from 'react';
import { Image, Smile, Mic, BarChart2, MessageCircle, Flame, Eye, Share, X, Square, Mail } from 'lucide-react';
import { getSessionToken, fetchPosts, createPost, votePost, fetchReplies, createReply, votePoll, recordView, uploadFile, requestMessage, fetchDailyPrompt } from '../api';
import { socket } from '../socket';

const CATEGORIES = ['Confessions', 'Crushes', 'Academics', 'Funny', 'Campus', 'Advice', 'Events'];
const IDENTITIES = ['Silent Owl', 'Midnight Fox', 'Quiet Wolf', 'Ghost Panda', 'Hidden Leaf', 'Shadow Cat'];

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('Confessions');
  const [filterTopic, setFilterTopic] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showPollInputs, setShowPollInputs] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [votedPolls, setVotedPolls] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replies, setReplies] = useState({});
  const [replyContent, setReplyContent] = useState('');
  const [myIdentity, setMyIdentity] = useState('?');
  
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
      if (filterTopic && post.topic !== filterTopic) return;
      
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
    const data = await fetchPosts(t);
    setPosts(data);
  };

  const handlePost = async () => {
    if (!content.trim() && !imageFile && !audioBlob) return;
    setIsPosting(true);
    
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
    const res = await createPost(content.trim() || " ", topic, validPollOptions, imageUrl, audioUrl);
    if (res && res.message) {
      setContent('');
      setImageFile(null);
      setAudioBlob(null);
      setShowPollInputs(false);
      setPollOptions(['', '']);
      await loadPosts(filterTopic);
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
    setPosts(currentPosts => 
      currentPosts.map(p => p.id === postId ? {
        ...p,
        upvotes: type === 'up' ? p.upvotes + 1 : p.upvotes,
        downvotes: type === 'down' ? p.downvotes + 1 : p.downvotes
      } : p)
    );
    await votePost(postId, type);
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

  const submitReply = async (postId) => {
    if (!replyContent.trim()) return;
    await createReply(postId, replyContent.trim());
    setReplyContent('');
    const data = await fetchReplies(postId);
    setReplies(prev => ({ ...prev, [postId]: data }));
    setPosts(currentPosts => currentPosts.map(p => 
      p.id === postId ? { ...p, replies_count: p.replies_count + 1 } : p
    ));
  };

  const renderPost = (post, isDailyPrompt = false) => {
    if (!post) return null;
    const identity = post.author_username || 'Anonymous';
    return (
      <div key={post.id} className="feed-card" style={isDailyPrompt ? { border: '2px solid var(--accent-color)', boxShadow: '0 4px 12px rgba(108, 92, 231, 0.15)', position: 'relative' } : {}}>
        {isDailyPrompt && <div style={{ position: 'absolute', top: '-12px', left: '1.5rem', backgroundColor: 'var(--accent-color)', color: 'white', padding: '0.2rem 0.8rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={12}/> Prompt of the Day</div>}
        <div className="card-header">
          <div className="avatar-flame">{identity.charAt(0)}</div>
          <div className="card-meta">
            <span className="name">{identity}</span>
            <span className="time">{new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <span className="category-badge">{post.topic}</span>
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
              const isSelected = selectedOptions[post.id] === opt.id;
              
              return (
                <div 
                  key={opt.id} 
                  className={`poll-option ${isSelected ? 'selected' : ''}`}
                  style={{
                    position: 'relative',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: `1px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    cursor: hasVoted ? 'default' : 'pointer',
                    overflow: 'hidden',
                    backgroundColor: isSelected && !hasVoted ? 'rgba(var(--accent-rgb), 0.1)' : 'var(--bg-card)'
                  }}
                  onClick={() => !hasVoted && setSelectedOptions(prev => ({ ...prev, [post.id]: opt.id }))}
                >
                  {hasVoted && (
                    <div 
                      style={{
                        position: 'absolute', top: 0, left: 0, bottom: 0,
                        width: `${percent}%`,
                        backgroundColor: 'var(--accent-color)',
                        opacity: 0.2,
                        transition: 'width 0.5s ease-out'
                      }}
                    />
                  )}
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {!hasVoted && (
                        <input 
                          type="radio" 
                          checked={isSelected}
                          onChange={() => !hasVoted && setSelectedOptions(prev => ({ ...prev, [post.id]: opt.id }))}
                          style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                        />
                      )}
                      <span>{opt.text}</span>
                    </div>
                    {hasVoted && <span style={{ fontWeight: 'bold' }}>{percent}%</span>}
                  </div>
                </div>
              );
            })}
            
            {/* Submit Vote Button */}
            {!(votedPolls[post.id] || post.poll.has_voted) && selectedOptions[post.id] && (
              <button 
                className="btn-glow" 
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePollVote(post.id, selectedOptions[post.id]);
                }}
              >
                Submit Vote
              </button>
            )}
          </div>
        )}
        
        <div className="reactions-bar">
          <button className="reaction-btn" onClick={(e) => { e.stopPropagation(); handleVote(post.id, 'up'); }}>
            <Flame size={16} /> <span>{post.upvotes > 0 ? post.upvotes : 'Relatable'}</span>
          </button>
          
          <button className="reaction-btn" onClick={(e) => toggleReplies(post.id, e)}>
            <MessageCircle size={16} /> <span>{post.replies_count || 'Reply'}</span>
          </button>
          
          <div className="reaction-stats">
            <span className="stat-item"><Eye size={16} /> {post.views || 0}</span>
            <button className="icon-btn-minimal" onClick={(e) => { e.stopPropagation(); handleMessageRequest(post.id, identity); }} title="Send Message">
                <Mail size={16} />
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
                onKeyDown={e => e.key === 'Enter' && submitReply(post.id)}
              />
              <button className="btn-glow small" onClick={() => submitReply(post.id)} disabled={!replyContent.trim()}>Reply</button>
            </div>
            
            {replies[post.id]?.map(r => (
              <div key={r.id} className="reply-item">
                <div className="avatar-flame small">{(r.author_username || 'A').charAt(0)}</div>
                <div className="reply-content">
                  <span className="name">{r.author_username || 'Anonymous'}</span>
                  <p>{r.content}</p>
                </div>
              </div>
            ))}
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
