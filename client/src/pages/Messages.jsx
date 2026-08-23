import { useState, useEffect, useRef, useCallback } from 'react';
import { getConversations, getMessages, sendMessage, acceptRequest, rejectRequest, blockUser, deleteConversation, unsendMessage } from '../api';
import { socket } from '../socket';
import { Send, Check, X as RejectIcon, Search, MailPlus, MoreVertical, Trash2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { formatTime } from '../utils';

export default function Messages() {
  const [conversations, setConversations] = useState({ active: [], requests: [] });
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'requests'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeConvId, setActiveConvId] = useState(null);
  const [activeConvData, setActiveConvData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Ref for active conversation ID so the socket handler can see it without re-binding
  const activeConvIdRef = useRef(activeConvId);
  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);

  // Optimized conversation loading
  const loadConversations = useCallback(async () => {
    const data = await getConversations();
    if (data && data.active !== undefined) {
      setConversations(data);
    }
  }, []);

  useEffect(() => {
    // Instant deep linking: Don't wait for sidebar to load!
    const searchParams = new URLSearchParams(window.location.search);
    const convParam = searchParams.get('conv');
    if (convParam) {
        setActiveConvId(parseInt(convParam));
        window.history.replaceState({}, '', '/messages');
    }
  
    loadConversations();

    const handleNewMessage = (msg) => {
      // 1. Update active chat window if we're looking at it
      if (activeConvIdRef.current === msg.conversation_id) {
        setChatMessages(prev => {
          if (!prev.find(m => m.id === msg.id)) return [...prev, msg];
          return prev;
        });
      }
      
      // 2. Optimistically update the sidebar conversation snippet without hitting API
      setConversations(prev => {
        const updateList = (list) => {
            const index = list.findIndex(c => c.id === msg.conversation_id);
            if (index === -1) return list; // If not found, we might need a full reload, handled below
            const updatedConv = { ...list[index], last_message: msg.content };
            const newList = [...list];
            newList.splice(index, 1);
            newList.unshift(updatedConv); // Move to top
            return newList;
        };
        const newActive = updateList(prev.active);
        const newRequests = updateList(prev.requests);
        
        // If it's a completely new chat not in our lists, trigger a background API reload
        if (prev.active.length === newActive.length && prev.active[0]?.id === newActive[0]?.id &&
            prev.requests.length === newRequests.length && prev.requests[0]?.id === newRequests[0]?.id) {
            loadConversations();
        }
        return { active: newActive, requests: newRequests };
      });
    };

    const handleNotification = (data) => {
      if (data.type === 'message_request') loadConversations();
    };

    socket.on('new_message', handleNewMessage);
    socket.on('new_notification', handleNotification);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('new_notification', handleNotification);
    };
  }, [loadConversations]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loadMessages = async (convId) => {
    const data = await getMessages(convId);
    if (data && !data.error) {
      setActiveConvData({
        status: data.status,
        is_requester: data.is_requester,
        other_user: data.other_user
      });
      setChatMessages(data.messages);
    } else {
      setActiveConvId(null);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConvId) return;
    const textToSend = newMessage.trim();
    setNewMessage('');
    
    // Create optimistic message
    const tempId = 'temp-' + Date.now();
    const optimisticMsg = {
        id: tempId,
        content: textToSend,
        created_at: new Date().toISOString(),
        is_mine: true,
        conversation_id: activeConvId
    };
    
    // Instantly show in chat
    setChatMessages(prev => [...prev, optimisticMsg]);
    
    // Optimistic UI update for the sidebar
    setConversations(prev => {
        const updateList = (list) => {
            const index = list.findIndex(c => c.id === activeConvId);
            if (index === -1) return list;
            const updatedConv = { ...list[index], last_message: textToSend };
            const newList = [...list];
            newList.splice(index, 1);
            newList.unshift(updatedConv);
            return newList;
        };
        return { active: updateList(prev.active), requests: updateList(prev.requests) };
    });

    const msg = await sendMessage(activeConvId, textToSend);
    if (msg && !msg.error) {
      // Replace temp message with real one
      setChatMessages(prev => prev.map(m => m.id === tempId ? msg : m));
    } else if (msg && msg.error) {
        alert(msg.error);
        loadConversations(); // Revert on failure
        setChatMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleAccept = async () => {
    if (!activeConvId) return;
    await acceptRequest(activeConvId);
    setActiveConvData(prev => ({ ...prev, status: 'accepted' }));
    loadConversations();
  };

  const handleReject = async () => {
    if (!activeConvId) return;
    await rejectRequest(activeConvId);
    setActiveConvId(null);
    loadConversations();
  };

  const handleBlock = async () => {
    if (!activeConvId) return;
    const confirm = window.confirm(`Are you sure you want to block ${activeConvData.other_user}? This conversation will be deleted.`);
    if (confirm) {
      await blockUser(activeConvId);
      setActiveConvId(null);
      setShowMenu(false);
      loadConversations();
    }
  };

  const handleRemoveChat = async () => {
    if (!activeConvId) return;
    const confirm = window.confirm(`Are you sure you want to delete this chat with ${activeConvData.other_user}?`);
    if (confirm) {
      await deleteConversation(activeConvId);
      setActiveConvId(null);
      setShowMenu(false);
      loadConversations();
    }
  };

  const handleUnsend = async (msgId) => {
    if (window.confirm("Unsend this message?")) {
      await unsendMessage(msgId);
      setChatMessages(prev => prev.filter(m => m.id !== msgId));
    }
  };

  const filteredConversations = conversations[activeTab].filter(c => 
      c.other_user.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`page-content messages-layout ${activeConvId ? 'chat-active' : ''}`} style={{ padding: '0', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
      <div className="messages-sliding-container">
        
        {/* LEFT PANE - INBOX */}
        <div className="inbox-pane" style={{ background: 'var(--bg-color)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ marginBottom: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Messages</h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: '12px' }}>
            <button 
                className="pill-tab" 
                style={{ flex: 1, padding: '0.6rem', textAlign: 'center', backgroundColor: activeTab === 'active' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'active' ? 'white' : 'var(--text-muted)', borderRadius: '8px', transition: '0.3s', fontWeight: 600, border: 'none' }}
                onClick={() => setActiveTab('active')}
            >
              Active
            </button>
            <button 
                className="pill-tab" 
                style={{ flex: 1, padding: '0.6rem', textAlign: 'center', backgroundColor: activeTab === 'requests' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'requests' ? 'white' : 'var(--text-muted)', position: 'relative', borderRadius: '8px', transition: '0.3s', fontWeight: 600, border: 'none' }}
                onClick={() => setActiveTab('requests')}
            >
              Requests
              {conversations.requests.length > 0 && (
                  <span style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#FF4757', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                      {conversations.requests.length}
                  </span>
              )}
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search identities..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.3s' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {filteredConversations.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <MailPlus size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p style={{ fontSize: '0.9rem' }}>No conversations found.</p>
                </div>
            ) : (
                filteredConversations.map(conv => (
                    <div 
                        key={conv.id} 
                        onClick={() => setActiveConvId(conv.id)}
                        className="conversation-item"
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '1rem', 
                            cursor: 'pointer',
                            borderRadius: '12px',
                            backgroundColor: activeConvId === conv.id ? 'rgba(53, 214, 231, 0.1)' : 'transparent',
                            transition: 'all 0.2s ease',
                            marginBottom: '4px'
                        }}
                        onMouseEnter={(e) => { if(activeConvId !== conv.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)' }}
                        onMouseLeave={(e) => { if(activeConvId !== conv.id) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                        <div className="avatar-flame" style={{ width: 44, height: 44, marginRight: '1rem', flexShrink: 0, boxShadow: activeConvId === conv.id ? '0 0 15px rgba(53, 214, 231, 0.3)' : 'none' }}>
                            {conv.other_user.charAt(0)}
                        </div>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '0.95rem', color: activeConvId === conv.id ? 'var(--accent-glow)' : 'var(--text-main)' }}>
                                {conv.other_user}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: activeConvId === conv.id ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {conv.status === 'pending' && conv.is_requester ? 'Request Sent: ' : ''}
                                {conv.last_message || 'No messages yet'}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* RIGHT PANE - CHAT */}
      <div className="chat-pane" style={{ position: 'relative', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        {/* Subtle background pattern */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.03, pointerEvents: 'none', backgroundImage: 'radial-gradient(var(--text-main) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        
        {activeConvId && activeConvData ? (
            <>
                {/* Chat Header */}
                <div className="chat-header" style={{ padding: '1.2rem 1.5rem', background: 'rgba(11, 15, 20, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button className="icon-btn-minimal back-btn mobile-only" onClick={() => setActiveConvId(null)} style={{ marginRight: '15px' }}>
                            <ArrowLeft size={22} />
                        </button>
                        <div className="avatar-flame" style={{ width: 40, height: 40, marginRight: '1rem', border: '2px solid rgba(255,255,255,0.1)' }}>{activeConvData.other_user.charAt(0)}</div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{activeConvData.other_user}</h3>
                            {activeConvData.status === 'pending' && !activeConvData.is_requester && (
                                <span style={{ backgroundColor: '#FF4757', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', display: 'inline-block', marginTop: '4px', fontWeight: 'bold' }}>Pending Request</span>
                            )}
                        </div>
                    </div>
                    
                    <div style={{ position: 'relative' }}>
                        <button className="icon-btn-minimal" onClick={() => setShowMenu(!showMenu)} style={{ padding: '8px', background: showMenu ? 'rgba(255,255,255,0.05)' : 'transparent', borderRadius: '50%' }}>
                            <MoreVertical size={20} />
                        </button>
                        {showMenu && (
                            <div className="chat-dropdown" style={{ position: 'absolute', right: 0, top: '100%', marginTop: '10px', backgroundColor: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.5rem', zIndex: 100, minWidth: '180px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                <button className="dropdown-item" onClick={handleRemoveChat} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '0.8rem', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '8px', textAlign: 'left', fontSize: '0.9rem', transition: '0.2s' }} onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                                    <Trash2 size={16} /> Remove Chat
                                </button>
                                <button className="dropdown-item" onClick={handleBlock} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '0.8rem', background: 'transparent', border: 'none', color: '#FF4757', cursor: 'pointer', borderRadius: '8px', textAlign: 'left', marginTop: '4px', fontSize: '0.9rem', transition: '0.2s' }} onMouseEnter={e => e.target.style.background = 'rgba(255, 71, 87, 0.1)'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                                    <ShieldAlert size={16} /> Block User
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Messages Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }} onClick={() => setShowMenu(false)}>
                    {chatMessages.map(msg => (
                        <div key={msg.id} className="message-wrapper" style={{ alignSelf: msg.is_mine ? 'flex-end' : 'flex-start', maxWidth: '75%', position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            
                            {msg.is_mine && (
                                <button className="unsend-btn" onClick={() => handleUnsend(msg.id)} title="Unsend Message" style={{ flexShrink: 0 }}>
                                    <Trash2 size={14} />
                                </button>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.is_mine ? 'flex-end' : 'flex-start' }}>
                                <div style={{ 
                                    background: msg.is_mine ? 'linear-gradient(135deg, var(--primary), var(--accent-glow))' : '#262626', 
                                    color: msg.is_mine ? 'white' : 'var(--text-main)',
                                    padding: '0.7rem 1.1rem', 
                                    borderRadius: msg.is_mine ? '22px 22px 4px 22px' : '22px 22px 22px 4px',
                                    fontSize: '0.95rem',
                                    lineHeight: '1.4',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                    border: 'none',
                                    animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                                }}>
                                    {msg.content}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '6px', padding: '0 4px', fontWeight: 500 }}>
                                    {formatTime(msg.created_at)}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {activeConvData.status === 'pending' && !activeConvData.is_requester ? (
                    <div style={{ padding: '1.5rem', background: 'var(--bg-color)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem', justifyContent: 'center', zIndex: 10 }}>
                        <button className="btn-glow" style={{ backgroundColor: 'var(--accent-color)', flex: 1, padding: '0.8rem', borderRadius: '12px', fontWeight: 'bold' }} onClick={handleAccept}>
                            <Check size={18} style={{ marginRight: '8px' }}/> Accept Request
                        </button>
                        <button className="btn-glow" style={{ backgroundColor: '#FF4757', flex: 1, padding: '0.8rem', borderRadius: '12px', fontWeight: 'bold' }} onClick={handleReject}>
                            <RejectIcon size={18} style={{ marginRight: '8px' }}/> Decline
                        </button>
                    </div>
                ) : (activeConvData.status === 'pending' && activeConvData.is_requester) ? (
                    <div style={{ padding: '1.5rem', background: 'var(--bg-color)', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: 'var(--text-muted)', zIndex: 10, fontSize: '0.9rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            Waiting for <strong>{activeConvData.other_user}</strong> to accept your request.
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-color)', borderTop: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'flex-end', 
                            background: 'var(--bg-elevated)', 
                            border: '1px solid rgba(255,255,255,0.05)', 
                            borderRadius: '24px', 
                            padding: '4px 12px 4px 16px',
                            transition: 'all 0.3s ease'
                        }}>
                            <textarea 
                                className="composer-textarea"
                                style={{ 
                                    flex: 1, 
                                    minHeight: '40px', 
                                    maxHeight: '120px',
                                    padding: '10px 0', 
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-main)',
                                    fontSize: '0.95rem',
                                    resize: 'none',
                                    overflowY: 'auto',
                                    outline: 'none',
                                    lineHeight: '1.4'
                                }}
                                placeholder="Message..."
                                value={newMessage}
                                onChange={(e) => {
                                    setNewMessage(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = (e.target.scrollHeight < 120 ? e.target.scrollHeight : 120) + 'px';
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                        e.target.style.height = 'auto';
                                    }
                                }}
                            />
                            {newMessage.trim() && (
                                <button 
                                    onClick={() => { handleSend(); }} 
                                    disabled={loading}
                                    style={{ 
                                        background: 'transparent', 
                                        color: 'var(--primary)', 
                                        border: 'none',
                                        padding: '10px 8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        animation: 'fadeIn 0.2s ease',
                                        marginBottom: '2px'
                                    }} 
                                >
                                    Send
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <div style={{ textAlign: 'center' }}>
                <MailPlus size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
