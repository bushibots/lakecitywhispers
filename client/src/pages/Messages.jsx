import { useState, useEffect, useRef, useCallback } from 'react';
import { getConversations, getMessages, sendMessage, acceptRequest, rejectRequest, blockUser, deleteConversation, unsendMessage } from '../api';
import { socket } from '../socket';
import { Send, Check, X as RejectIcon, Search, MailPlus, MoreVertical, Trash2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { formatTime } from '../utils';

export default function Messages() {
  const [conversations, setConversations] = useState(() => {
      const cached = localStorage.getItem('whispers_cached_conversations');
      return cached ? JSON.parse(cached) : { active: [], requests: [] };
  });
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeConvId, setActiveConvId] = useState(null);
  const [activeConvData, setActiveConvData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Cache for instant chat loading
  const chatCache = useRef({});
  
  // Ref for active conversation ID so the socket handler can see it without re-binding
  const activeConvIdRef = useRef(activeConvId);
  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);

  // Optimized conversation loading
  const loadConversations = useCallback(async () => {
    const data = await getConversations();
    if (data && data.active !== undefined) {
      setConversations(data);
      localStorage.setItem('whispers_cached_conversations', JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    // Instant deep linking
    const searchParams = new URLSearchParams(window.location.search);
    const convParam = searchParams.get('conv');
    if (convParam) {
        setActiveConvId(parseInt(convParam));
        window.history.replaceState({}, '', '/messages');
    }
  
    loadConversations();

    const handleNewMessage = (msg) => {
      if (activeConvIdRef.current === msg.conversation_id) {
        setChatMessages(prev => {
          if (!prev.find(m => m.id === msg.id)) {
              const next = [...prev, msg];
              if (chatCache.current[msg.conversation_id]) chatCache.current[msg.conversation_id].messages = next;
              return next;
          }
          return prev;
        });
        // Auto mark as read if we're in this conv
        loadConversations();
      } else {
        if (chatCache.current[msg.conversation_id]) {
            if (!chatCache.current[msg.conversation_id].messages.find(m => m.id === msg.id)) {
                chatCache.current[msg.conversation_id].messages.push(msg);
            }
        }
      }
      
      // Optimistically update the sidebar snippet and bump unread count
      setConversations(prev => {
        const updateList = (list) => {
            const index = list.findIndex(c => c.id === msg.conversation_id);
            if (index === -1) return list;
            const updatedConv = { 
              ...list[index], 
              last_message: msg.content,
              last_message_at: msg.created_at,
              // Increment unread if we're not in this conv
              unread_count: activeConvIdRef.current === msg.conversation_id
                ? 0
                : (list[index].unread_count || 0) + 1
            };
            const newList = [...list];
            newList.splice(index, 1);
            newList.unshift(updatedConv);
            return newList;
        };
        const newActive = updateList(prev.active);
        const newRequests = updateList(prev.requests);
        
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
      // Clear unread count locally when opening a conversation
      setConversations(prev => ({
        active: prev.active.map(c => c.id === activeConvId ? { ...c, unread_count: 0 } : c),
        requests: prev.requests.map(c => c.id === activeConvId ? { ...c, unread_count: 0 } : c),
      }));
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loadMessages = async (convId, before = null) => {
    if (!before && chatCache.current[convId]) {
        setActiveConvData(chatCache.current[convId].data);
        setChatMessages(chatCache.current[convId].messages);
    }
    
    const data = await getMessages(convId, before, 30);
    if (data && !data.error) {
      if (!before) {
          setActiveConvData({
            status: data.status,
            is_requester: data.is_requester,
            other_user: data.other_user
          });
          setChatMessages(data.messages);
          
          chatCache.current[convId] = {
              data: {
                  status: data.status,
                  is_requester: data.is_requester,
                  other_user: data.other_user
              },
              messages: data.messages
          };
      } else {
          setChatMessages(prev => {
              const next = [...data.messages, ...prev];
              if (chatCache.current[convId]) chatCache.current[convId].messages = next;
              return next;
          });
      }
    } else if (!before) {
      setActiveConvId(null);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConvId) return;
    const textToSend = newMessage.trim();
    setNewMessage('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    
    const tempId = 'temp-' + Date.now();
    const optimisticMsg = {
        id: tempId,
        content: textToSend,
        created_at: new Date().toISOString(),
        is_mine: true,
        conversation_id: activeConvId
    };
    
    setChatMessages(prev => {
        const next = [...prev, optimisticMsg];
        if (chatCache.current[activeConvId]) chatCache.current[activeConvId].messages = next;
        return next;
    });
    
    setConversations(prev => {
        const updateList = (list) => {
            const index = list.findIndex(c => c.id === activeConvId);
            if (index === -1) return list;
            const updatedConv = { ...list[index], last_message: textToSend, last_message_at: new Date().toISOString() };
            const newList = [...list];
            newList.splice(index, 1);
            newList.unshift(updatedConv);
            return newList;
        };
        return { active: updateList(prev.active), requests: updateList(prev.requests) };
    });

    const msg = await sendMessage(activeConvId, textToSend);
    if (msg && !msg.error) {
      setChatMessages(prev => prev.map(m => m.id === tempId ? msg : m));
    } else if (msg && msg.error) {
        alert(msg.error);
        loadConversations();
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
    const confirm = window.confirm(`Block ${activeConvData.other_user}? This conversation will be deleted.`);
    if (confirm) {
      await blockUser(activeConvId);
      setActiveConvId(null);
      setShowMenu(false);
      loadConversations();
    }
  };

  const handleRemoveChat = async () => {
    if (!activeConvId) return;
    const confirm = window.confirm(`Delete this chat with ${activeConvData.other_user}?`);
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

  const totalUnread = conversations.active.reduce((s, c) => s + (c.unread_count || 0), 0);

  // Expose total unread to window for LeftSidebar/BottomNav badges
  useEffect(() => {
    window.__messagesUnread = totalUnread;
    window.dispatchEvent(new CustomEvent('unread_changed', { detail: totalUnread }));
  }, [totalUnread]);

  const formatConvTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`page-content messages-layout ${activeConvId ? 'chat-active' : ''}`} style={{ padding: '0', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
      <div className="messages-sliding-container">
        
        {/* LEFT PANE - INBOX */}
        <div className="inbox-pane" style={{ background: 'var(--bg-color)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.5px', fontSize: '1.3rem' }}>Messages</h2>
            {totalUnread > 0 && (
              <span style={{ background: '#FF4757', color: '#fff', borderRadius: '20px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
                {totalUnread} new
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '10px' }}>
            <button 
                className="pill-tab" 
                style={{ flex: 1, padding: '0.5rem', textAlign: 'center', backgroundColor: activeTab === 'active' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'active' ? 'white' : 'var(--text-muted)', borderRadius: '7px', transition: '0.2s', fontWeight: 600, border: 'none', fontSize: '0.9rem' }}
                onClick={() => setActiveTab('active')}
            >
              Chats
            </button>
            <button 
                className="pill-tab" 
                style={{ flex: 1, padding: '0.5rem', textAlign: 'center', backgroundColor: activeTab === 'requests' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'requests' ? 'white' : 'var(--text-muted)', position: 'relative', borderRadius: '7px', transition: '0.2s', fontWeight: 600, border: 'none', fontSize: '0.9rem' }}
                onClick={() => setActiveTab('requests')}
            >
              Requests
              {conversations.requests.length > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#FF4757', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>
                      {conversations.requests.length}
                  </span>
              )}
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 1rem 0.55rem 2.2rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.4rem' }}>
            {filteredConversations.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <MailPlus size={36} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                    <p style={{ fontSize: '0.875rem' }}>No conversations yet.</p>
                </div>
            ) : (
                filteredConversations.map(conv => {
                  const isActive = activeConvId === conv.id;
                  const hasUnread = (conv.unread_count || 0) > 0;
                  return (
                    <div 
                        key={conv.id} 
                        onClick={() => setActiveConvId(conv.id)}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '0.75rem 0.9rem', 
                            cursor: 'pointer',
                            borderRadius: '10px',
                            backgroundColor: isActive ? 'rgba(53, 214, 231, 0.1)' : 'transparent',
                            transition: 'background 0.15s ease',
                            marginBottom: '2px',
                            position: 'relative'
                        }}
                        onMouseEnter={(e) => { if(!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)' }}
                        onMouseLeave={(e) => { if(!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                        {/* Avatar */}
                        <div style={{ position: 'relative', marginRight: '0.75rem', flexShrink: 0 }}>
                          <div className="avatar-flame" style={{ width: 42, height: 42, boxShadow: isActive ? '0 0 12px rgba(53, 214, 231, 0.3)' : 'none' }}>
                              {conv.other_user.charAt(0)}
                          </div>
                          {hasUnread && (
                            <span style={{ position: 'absolute', bottom: 0, right: 0, width: '11px', height: '11px', borderRadius: '50%', background: '#FF4757', border: '2px solid var(--bg-color)' }} />
                          )}
                        </div>

                        {/* Text */}
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                              <span style={{ fontWeight: hasUnread ? '700' : '500', fontSize: '0.9rem', color: isActive ? 'var(--accent-glow)' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                                  {conv.other_user}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: hasUnread ? 'var(--accent-color)' : 'var(--text-muted)', flexShrink: 0, marginLeft: '4px' }}>
                                  {formatConvTime(conv.last_message_at || conv.updated_at)}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: hasUnread ? 'var(--text-main)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: hasUnread ? '600' : '400' }}>
                                {conv.status === 'pending' && conv.is_requester ? '⏳ ' : ''}{conv.last_message || 'No messages yet'}
                            </div>
                        </div>

                        {/* Unread badge */}
                        {hasUnread && (conv.unread_count || 0) > 1 && (
                          <span style={{ marginLeft: '6px', background: '#FF4757', color: '#fff', borderRadius: '20px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                              {conv.unread_count}
                          </span>
                        )}
                    </div>
                  );
                })
            )}
        </div>
      </div>

      {/* RIGHT PANE - CHAT */}
      <div className="chat-pane" style={{ position: 'relative', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.025, pointerEvents: 'none', backgroundImage: 'radial-gradient(var(--text-main) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        {activeConvId && activeConvData ? (
            <>
                {/* Chat Header */}
                <div className="chat-header" style={{ padding: '1rem 1.25rem', background: 'rgba(11, 15, 20, 0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button className="icon-btn-minimal back-btn mobile-only" onClick={() => setActiveConvId(null)} style={{ marginRight: '12px' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <div className="avatar-flame" style={{ width: 38, height: 38, marginRight: '0.75rem', border: '2px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>{activeConvData.other_user.charAt(0)}</div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{activeConvData.other_user}</h3>
                            {activeConvData.status === 'pending' && !activeConvData.is_requester && (
                                <span style={{ backgroundColor: '#FF4757', color: 'white', padding: '1px 7px', borderRadius: '10px', fontSize: '0.65rem', display: 'inline-block', fontWeight: 'bold', marginTop: '2px' }}>Pending</span>
                            )}
                        </div>
                    </div>
                    
                    <div style={{ position: 'relative' }}>
                        <button className="icon-btn-minimal" onClick={() => setShowMenu(!showMenu)} style={{ padding: '7px', background: showMenu ? 'rgba(255,255,255,0.05)' : 'transparent', borderRadius: '50%' }}>
                            <MoreVertical size={18} />
                        </button>
                        {showMenu && (
                            <div className="chat-dropdown" style={{ position: 'absolute', right: 0, top: '110%', backgroundColor: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.4rem', zIndex: 100, minWidth: '170px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                <button onClick={handleRemoveChat} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.7rem 0.9rem', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.875rem' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                                    <Trash2 size={15} /> Delete Chat
                                </button>
                                <button onClick={handleBlock} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.7rem 0.9rem', background: 'transparent', border: 'none', color: '#FF4757', cursor: 'pointer', borderRadius: '8px', fontSize: '0.875rem' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,71,87,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                                    <ShieldAlert size={15} /> Block User
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Messages Area */}
                <div style={{ flex: 1, padding: '1rem 1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }} onClick={() => setShowMenu(false)}>
                {chatMessages.length >= 30 && (
                  <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                    <button 
                      onClick={() => loadMessages(activeConvId, chatMessages[0].created_at)}
                      style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '0.35rem 1rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Load older messages
                    </button>
                  </div>
                )}
                    {chatMessages.map((msg, i) => {
                      const prevMsg = chatMessages[i - 1];
                      const showTime = !prevMsg || (new Date(msg.created_at) - new Date(prevMsg.created_at)) > 5 * 60 * 1000;
                      return (
                        <div key={msg.id}>
                          {showTime && (
                            <div style={{ textAlign: 'center', margin: '0.5rem 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {formatTime(msg.created_at)}
                            </div>
                          )}
                          <div className="message-wrapper" style={{ alignSelf: msg.is_mine ? 'flex-end' : 'flex-start', maxWidth: '72%', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                              {msg.is_mine && (
                                  <button className="unsend-btn" onClick={() => handleUnsend(msg.id)} title="Unsend" style={{ flexShrink: 0, opacity: 0, transition: '0.2s' }}>
                                      <Trash2 size={12} />
                                  </button>
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.is_mine ? 'flex-end' : 'flex-start' }}>
                                  <div style={{ 
                                      background: msg.is_mine ? 'linear-gradient(135deg, var(--primary), var(--accent-glow))' : 'rgba(255,255,255,0.07)', 
                                      color: msg.is_mine ? 'white' : 'var(--text-main)',
                                      padding: '0.6rem 1rem', 
                                      borderRadius: msg.is_mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                      fontSize: '0.9rem',
                                      lineHeight: '1.45',
                                      boxShadow: msg.is_mine ? '0 2px 8px rgba(53,214,231,0.15)' : 'none',
                                      maxWidth: '100%',
                                      wordBreak: 'break-word'
                                  }}>
                                      {msg.content.startsWith('[IMAGE]') ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                              <span style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 'bold' }}>Dating Profile Picture</span>
                                              <img 
                                                  src={msg.content.replace('[IMAGE]', '').trim()} 
                                                  alt="Shared Media" 
                                                  style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '10px', objectFit: 'cover' }} 
                                                  crossOrigin="anonymous"
                                              />
                                          </div>
                                      ) : (
                                          msg.content
                                      )}
                                  </div>
                              </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {activeConvData.status === 'pending' && !activeConvData.is_requester ? (
                    <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-color)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                        <button className="btn-glow" style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', fontWeight: 'bold', background: 'var(--accent-color)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={handleAccept}>
                            <Check size={16} /> Accept
                        </button>
                        <button className="btn-glow" style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', fontWeight: 'bold', background: '#FF4757', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={handleReject}>
                            <RejectIcon size={16} /> Decline
                        </button>
                    </div>
                ) : (activeConvData.status === 'pending' && activeConvData.is_requester) ? (
                    <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-color)', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                            Waiting for <strong>{activeConvData.other_user}</strong> to accept.
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-color)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '22px', padding: '4px 4px 4px 14px', transition: 'border-color 0.2s' }}
                          onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(53,214,231,0.4)'}
                          onBlurCapture={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                        >
                            <textarea 
                                ref={inputRef}
                                className="composer-textarea"
                                style={{ 
                                    flex: 1, 
                                    minHeight: '38px', 
                                    maxHeight: '120px',
                                    padding: '8px 0', 
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-main)',
                                    fontSize: '0.9rem',
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
                                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                            <button 
                                onClick={handleSend}
                                disabled={!newMessage.trim()}
                                style={{ 
                                    width: '36px', height: '36px',
                                    borderRadius: '50%',
                                    background: newMessage.trim() ? 'linear-gradient(135deg, var(--primary), var(--accent-glow))' : 'rgba(255,255,255,0.05)',
                                    border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: newMessage.trim() ? 'pointer' : 'default',
                                    transition: 'all 0.2s ease',
                                    flexShrink: 0,
                                    marginBottom: '1px'
                                }} 
                            >
                                <Send size={16} color={newMessage.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} />
                            </button>
                        </div>
                    </div>
                )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <div style={{ textAlign: 'center' }}>
                <MailPlus size={44} style={{ opacity: 0.15, margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '0.9rem' }}>Select a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
