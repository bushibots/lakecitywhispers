import { useState, useEffect, useRef } from 'react';
import { getConversations, getMessages, sendMessage, acceptRequest, rejectRequest, blockUser, deleteConversation, unsendMessage } from '../api';
import { socket } from '../socket';
import { Send, Check, X as RejectIcon, UserCircle, Search, MailPlus, MoreVertical, Trash2, ArrowLeft, ShieldAlert } from 'lucide-react';
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
  const activeConvIdRef = useRef(activeConvId);

  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  useEffect(() => {
    loadConversations();

    const handleNewMessage = (msg) => {
      // If we are currently viewing the conversation this message belongs to, append it
      if (activeConvIdRef.current === msg.conversation_id) {
        setChatMessages(prev => {
          // Check if it already exists to prevent duplicates from our own emits
          if (!prev.find(m => m.id === msg.id)) {
            return [...prev, msg];
          }
          return prev;
        });
      }
      loadConversations(); // Always refresh conversation list to show latest message snippet
    };

    const handleNotification = (data) => {
      if (data.type === 'message_request') {
        loadConversations();
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('new_notification', handleNotification);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('new_notification', handleNotification);
    };
  }, []);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const loadConversations = async () => {
    const data = await getConversations();
    if (data && data.active !== undefined) {
      setConversations(data);
    }
  };

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConvId) return;
    setLoading(true);
    const msg = await sendMessage(activeConvId, newMessage.trim());
    if (msg && !msg.error) {
      setNewMessage('');
      setChatMessages([...chatMessages, msg]);
      loadConversations();
    } else if (msg && msg.error) {
        alert(msg.error);
    }
    setLoading(false);
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
      setChatMessages(chatMessages.filter(m => m.id !== msgId));
    }
  };

  const filteredConversations = conversations[activeTab].filter(c => 
      c.other_user.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`page-content messages-layout ${activeConvId ? 'chat-active' : ''}`} style={{ padding: '0', overflow: 'hidden' }}>
      
      {/* LEFT PANE - INBOX */}
      <div className="inbox-pane">
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ marginBottom: '1rem' }}>Messages</h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button 
                className="pill-tab" 
                style={{ flex: 1, padding: '0.5rem', textAlign: 'center', backgroundColor: activeTab === 'active' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'active' ? 'white' : 'var(--text-color)' }}
                onClick={() => setActiveTab('active')}
            >
              Active
            </button>
            <button 
                className="pill-tab" 
                style={{ flex: 1, padding: '0.5rem', textAlign: 'center', backgroundColor: activeTab === 'requests' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'requests' ? 'white' : 'var(--text-color)', position: 'relative' }}
                onClick={() => setActiveTab('requests')}
            >
              Requests
              {conversations.requests.length > 0 && (
                  <span style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: 'var(--danger-color, red)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                      {conversations.requests.length}
                  </span>
              )}
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search identities..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-color)' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {filteredConversations.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                    <p>No conversations found.</p>
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
                            borderRadius: '8px',
                            backgroundColor: activeConvId === conv.id ? 'var(--bg-elevated)' : 'transparent',
                            borderBottom: '1px solid var(--border-color)',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        <div className="avatar-flame" style={{ width: 40, height: 40, marginRight: '1rem', flexShrink: 0 }}>{conv.other_user.charAt(0)}</div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{conv.other_user}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
      <div className="chat-pane">
        {!activeConvId || !activeConvData ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <MailPlus size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3>Your Messages</h3>
                <p>Send a message request from a post in the feed to start chatting.</p>
            </div>
        ) : (
            <>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button className="icon-btn-minimal back-btn mobile-only" onClick={() => setActiveConvId(null)} style={{ marginRight: '10px' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <div className="avatar-flame" style={{ width: 35, height: 35, marginRight: '1rem' }}>{activeConvData.other_user.charAt(0)}</div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{activeConvData.other_user}</h3>
                            {activeConvData.status === 'pending' && !activeConvData.is_requester && (
                                <span style={{ backgroundColor: 'var(--danger-color, red)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>Pending Request</span>
                            )}
                        </div>
                    </div>
                    
                    <div style={{ position: 'relative' }}>
                        <button className="icon-btn-minimal" onClick={() => setShowMenu(!showMenu)}>
                            <MoreVertical size={20} />
                        </button>
                        {showMenu && (
                            <div className="chat-dropdown" style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', zIndex: 10, minWidth: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                <button className="dropdown-item" onClick={handleRemoveChat} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '4px', textAlign: 'left' }}>
                                    <Trash2 size={16} /> Remove Chat
                                </button>
                                <button className="dropdown-item" onClick={handleBlock} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem', background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', borderRadius: '4px', textAlign: 'left', marginTop: '4px' }}>
                                    <ShieldAlert size={16} /> Block User
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} onClick={() => setShowMenu(false)}>
                    {chatMessages.map(msg => (
                        <div key={msg.id} className="message-wrapper" style={{ alignSelf: msg.is_mine ? 'flex-end' : 'flex-start', maxWidth: '70%', position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            
                            {msg.is_mine && (
                                <button className="unsend-btn" onClick={() => handleUnsend(msg.id)} title="Unsend Message">
                                    <Trash2 size={14} />
                                </button>
                            )}

                            <div>
                                <div style={{ 
                                    backgroundColor: msg.is_mine ? 'var(--accent-color)' : 'var(--bg-elevated)', 
                                    color: msg.is_mine ? 'white' : 'var(--text-color)',
                                    padding: '0.75rem 1rem', 
                                    borderRadius: msg.is_mine ? '16px 16px 0 16px' : '16px 16px 16px 0'
                                }}>
                                    {msg.content}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: msg.is_mine ? 'right' : 'left' }}>
                                    {formatTime(msg.created_at)}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {activeConvData.status === 'pending' && !activeConvData.is_requester ? (
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="btn-glow" style={{ backgroundColor: 'var(--accent-color)', flex: 1 }} onClick={handleAccept}>
                            <Check size={16} style={{ marginRight: '8px' }}/> Accept
                        </button>
                        <button className="btn-glow" style={{ backgroundColor: 'var(--danger-color, #e74c3c)', flex: 1 }} onClick={handleReject}>
                            <RejectIcon size={16} style={{ marginRight: '8px' }}/> Decline
                        </button>
                    </div>
                ) : (activeConvData.status === 'pending' && activeConvData.is_requester) ? (
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Waiting for {activeConvData.other_user} to accept.
                    </div>
                ) : (
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                        <input 
                            type="text" 
                            className="composer-textarea"
                            style={{ flex: 1, minHeight: '40px', padding: '0.5rem 1rem', borderRadius: '20px' }}
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button className="icon-btn tooltip" style={{ alignSelf: 'flex-end', backgroundColor: 'var(--accent-color)', color: 'white', border: 'none' }} onClick={handleSend} disabled={loading || !newMessage.trim()}>
                            <Send size={20} />
                        </button>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
}
