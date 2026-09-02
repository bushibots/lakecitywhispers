import React, { useState, useEffect, useRef } from 'react';
import { Heart, X, Filter, ChevronLeft, ChevronRight, Star, RotateCcw, ImagePlus } from 'lucide-react';
import { apiFetch } from '../api';
import DatingProfileModal from '../components/DatingProfileModal';
import DatingFilterModal from '../components/DatingFilterModal';
import { Avatar } from '../components/RenderAvatar';
import { useNavigate } from 'react-router-dom';

let datingCache = {
  profile: null,
  profiles: [],
  currentIndex: 0,
  timestamp: 0,
};

export default function Dating() {
  const [profile, setProfile] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchPopup, setMatchPopup] = useState(null);
  const [activeBtn, setActiveBtn] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterBlock, setFilterBlock] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [likesToday, setLikesToday] = useState(0);
  const [likesLimit] = useState(25);
  const [dailyLimitHit, setDailyLimitHit] = useState(false);
  const [superlikeAnim, setSuperlikeAnim] = useState(false);
  // Drag-to-swipe state
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const cardRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Tab cache hydration: if cache exists and is < 5 minutes old
    if (datingCache.profiles.length > 0 && Date.now() - datingCache.timestamp < 300000) {
      setProfile(datingCache.profile);
      setProfiles(datingCache.profiles);
      setCurrentIndex(datingCache.currentIndex);
      setLoading(false);
      
      // Background replenish if they are almost out of profiles
      if (datingCache.currentIndex >= datingCache.profiles.length - 3) {
          fetchData(true);
      }
    } else {
      fetchData();
    }
  }, []);

  const fetchData = async (background = false) => {
    if (!background) setLoading(true);
    
    // Fire both requests concurrently
    const [profileData, discoverData] = await Promise.all([
      apiFetch('/dating/profile'),
      apiFetch('/dating/discover')
    ]);
    
    if (!profileData || profileData.error || !profileData.is_active) {
      setShowOnboarding(true);
      setLoading(false);
    } else {
      setProfile(profileData);
      
      if (discoverData && !discoverData.error) {
        setProfiles(discoverData);
        setCurrentIndex(0);
        
        // Update cache
        datingCache = {
            profile: profileData,
            profiles: discoverData,
            currentIndex: 0,
            timestamp: Date.now()
        };
      }
      setLoading(false);
    }
  };

  const fetchDiscover = async (b = filterBlock, c = filterCourse) => {
    let url = '/dating/discover?';
    if (b) url += `block=${encodeURIComponent(b)}&`;
    if (c) url += `course=${encodeURIComponent(c)}&`;
    const data = await apiFetch(url);
    if (data && !data.error) {
      setProfiles(data);
      setCurrentIndex(0);
      setPhotoIndex(0);
      
      datingCache.profiles = data;
      datingCache.currentIndex = 0;
      datingCache.timestamp = Date.now();
    }
  };

  const handleProfileSaved = (data) => {
    if (!data.is_active) {
        setProfile(null);
        setShowOnboarding(true);
        return;
    }
    setProfile(data);
    setShowOnboarding(false);
    fetchDiscover();
  };

  const handleSwipe = async (action) => {
    if (currentIndex >= profiles.length) return;
    if (action !== 'pass' && dailyLimitHit) return;
    const target = profiles[currentIndex];
    
    setActiveBtn(action);
    setPhotoIndex(0);
    setDragX(0);
    
    if (action === 'superlike') setSuperlikeAnim(true);
    if (navigator.vibrate) navigator.vibrate(action === 'superlike' ? [50, 30, 100] : 50);

    setTimeout(() => {
        setCurrentIndex(prev => {
            const next = prev + 1;
            datingCache.currentIndex = next;
            return next;
        });
        setActiveBtn(null);
        setSuperlikeAnim(false);
    }, 300);

    const targetId = profiles[currentIndex].user_id;
    
    const fetchPromise = apiFetch('/dating/swipe', {
        method: 'POST',
        body: JSON.stringify({ target_id: targetId, action })
    });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    fetchPromise.then(res => res.json()).then(data => {
        if (data.error === 'daily_limit') {
            setDailyLimitHit(true);
            setLikesToday(data.likes_today || likesLimit);
            return;
        }
        if (data.likes_today !== undefined) setLikesToday(data.likes_today);
        if (data.match) {
            if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
            const matchImg = optimizeImage((target.images?.length > 0 ? target.images : [target.image_url])[0] || target.image_url);
            setMatchPopup({ 
                name: "Your Match", 
                conversation_id: data.conversation_id,
                image: matchImg,
                custom_avatar: target.custom_avatar,
                isSuperlike: data.is_superlike
            });
        }
    }).catch(err => {
        console.error("Swipe API failed", err);
    });
  };

  const handleUndo = () => {
    if (currentIndex <= 0) return;
    setCurrentIndex(prev => {
        const next = prev - 1;
        datingCache.currentIndex = next;
        return next;
    });
    setPhotoIndex(0);
  };

  const handleSecretCrush = () => {
      const crushStr = prompt("Enter up to 3 usernames (comma separated) for your Secret Crush list.\nIf they also crush on you, it's a match!");
      if (crushStr !== null) {
          const crushes = crushStr.split(',').map(s => s.trim().replace('@', '')).filter(Boolean).slice(0, 3);
          apiFetch('/api/dating/secret_crush', { method: 'POST', body: JSON.stringify({ crushes }) })
          .then(res => {
              if (res.message) alert("Secret crushes saved! 🤫");
          });
      }
  };

  // Drag-to-swipe handlers
  const handleDragStart = (clientX) => {
    if (activeBtn) return;
    setIsDragging(true);
    dragStartX.current = clientX;
  };
  const handleDragMove = (clientX) => {
    if (!isDragging) return;
    setDragX(clientX - dragStartX.current);
  };
  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX > 80) handleSwipe('like');
    else if (dragX < -80) handleSwipe('pass');
    else setDragX(0);
  };


  const optimizeImage = (url) => {
      if (!url || !url.includes('res.cloudinary.com')) return url;
      return url.replace('/upload/', '/upload/c_fill,w_800,q_auto,f_auto/');
  };

  if (loading) {
    return (
        <div className="page-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '1rem' }}>
            <div className="pulsing-heart-main" style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #FF5E5B, #FF2A55)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(255, 94, 91, 0.4)', animation: 'pulse 1.5s infinite' }}>
                <Heart size={30} fill="#fff" color="#fff" />
            </div>
            <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Finding matches...</p>
        </div>
    );
  }

  if (showOnboarding) {
    return (
        <div className="page-content">
            <DatingProfileModal 
                isOpen={true} 
                initialProfile={profile} 
                onSaved={handleProfileSaved} 
            />
        </div>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <div className="page-content dating-page-container" style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 100px)', paddingBottom: '0' }}>
        
        {/* Match Popup Overlay */}
        {matchPopup && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: '#000' }}>
                {matchPopup.image ? (
                    <img 
                        src={matchPopup.image} 
                        alt="Match background" 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(15px) brightness(0.4)', opacity: 0.8 }} 
                    />
                ) : matchPopup.custom_avatar && matchPopup.custom_avatar.startsWith('{') ? (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.3, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'blur(8px)' }}>
                        <Avatar avatarString={matchPopup.custom_avatar} style={{ width: '150%', height: '150%' }} />
                    </div>
                ) : null}
                
                <div className="feed-card" style={{ position: 'relative', zIndex: 10001, padding: '3rem', textAlign: 'center', width: '100%', maxWidth: '400px', border: '2px solid #FF5E5B', background: 'rgba(20, 20, 20, 0.85)', backdropFilter: 'blur(10px)', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                    <div style={{ width: '150px', height: '150px', borderRadius: '50%', border: '4px solid #FF5E5B', overflow: 'hidden', margin: '0 auto 1.5rem auto', boxShadow: '0 10px 25px rgba(255, 94, 91, 0.4)', background: 'var(--bg-elevated)', position: 'relative' }}>
                        {matchPopup.image ? (
                            <img src={matchPopup.image} alt="Match" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : matchPopup.custom_avatar && matchPopup.custom_avatar.startsWith('{') ? (
                            <div style={{ position: 'absolute', width: '120%', height: '120%', top: '-10%', left: '-10%' }}>
                                <Avatar avatarString={matchPopup.custom_avatar} style={{ width: '100%', height: '100%' }} />
                            </div>
                        ) : (
                            <div className="pulsing-heart-main" style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #FF5E5B, #FF2A55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Heart size={64} fill="#fff" color="#fff" />
                            </div>
                        )}
                    </div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem', color: '#fff' }}>It's a Match!</h2>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>You and {matchPopup.targetName} have liked each other.</p>
                    
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', margin: '1.5rem 0', textAlign: 'left' }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>🔥 Spill the Tea (Icebreaker)</p>
                        <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.05rem' }}>
                            {(() => {
                                const icebreakers = [
                                    "What's your most controversial opinion about campus food?",
                                    "What's the weirdest thing you've seen in the library?",
                                    "If you could teleport anywhere on campus right now, where would it be?",
                                    "What's your go-to caffeine fix before an 8 AM class?",
                                    "Who is your secret campus crush? (I won't tell 🤫)",
                                    "What's your favorite spot to hide and study?",
                                    "Describe your block in three words.",
                                    "What's the best late-night snack spot?",
                                    "If our campus had a mascot, what would it actually be?",
                                    "What's your most chaotic story from a campus event?"
                                ];
                                // use matchPopup targetId to make it stable per match
                                const idx = (matchPopup.targetId || 1) % icebreakers.length;
                                return icebreakers[idx];
                            })()}
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}> 
                        <button className="btn-glow" onClick={() => navigate(`/messages${matchPopup.conversation_id ? `?conv=${matchPopup.conversation_id}` : ''}`)} style={{ width: '100%', marginBottom: '1rem', background: 'linear-gradient(135deg, #FF5E5B, #FF2A55)', color: '#fff', borderRadius: '30px', padding: '1rem', border: 'none', fontWeight: '700', fontSize: '1.1rem' }}>
                            Send a Message
                        </button>
                        <button className="btn-secondary" onClick={() => setMatchPopup(null)} style={{ width: '100%', padding: '1rem', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', background: 'transparent' }}>
                            Keep Swiping
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', marginBottom: '1rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: '#FF5E5B', fontWeight: '800', letterSpacing: '-0.5px' }}>
                <Heart fill="#FF5E5B" color="#FF5E5B" /> Campus Crush
            </h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button 
                    onClick={handleSecretCrush}
                    style={{ background: 'none', border: 'none', color: '#ff7eb3', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '1.2rem' }}
                    title="Set Secret Crushes"
                >
                    🤫
                </button>
                <button 
                    onClick={() => setShowFilters(true)} 
                    style={{ background: 'none', border: 'none', color: (filterBlock || filterCourse) ? 'var(--accent-color)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    <Filter size={18} />
                </button>
                <button 
                    onClick={() => setShowOnboarding(true)} 
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                    Edit Profile
                </button>
            </div>
        </div>

        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch' }}>
            {profiles.length === 0 || currentIndex >= profiles.length ? (
                <div className="feed-card" style={{ padding: '3rem 2rem', textAlign: 'center', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>No Profiles Found</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Check back later or try removing your filters.</p>
                    <button onClick={() => fetchData()} className="btn-glow" style={{ padding: '0.8rem 2rem', borderRadius: '30px', background: 'linear-gradient(135deg, #FF5E5B, #FF2A55)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                        Refresh Profiles
                    </button>
                </div>
            ) : currentProfile ? (
                <div 
                    ref={cardRef}
                    key={currentProfile.user_id} 
                    className="feed-card dating-card-anim" 
                    style={{ 
                        width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', 
                        padding: 0, overflow: 'hidden', borderRadius: '32px', backgroundColor: '#111', marginBottom: 0,
                        transform: `rotate(${dragX * 0.04}deg) translateX(${dragX}px)`,
                        transition: isDragging ? 'none' : 'transform 0.3s ease',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        userSelect: 'none'
                    }}
                    onMouseDown={(e) => handleDragStart(e.clientX)}
                    onMouseMove={(e) => handleDragMove(e.clientX)}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
                    onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
                    onTouchEnd={handleDragEnd}
                >
                    
                    {/* Like/Pass overlay indicators when dragging */}
                    {Math.abs(dragX) > 30 && (
                        <div style={{ position: 'absolute', top: '2rem', ...(dragX > 0 ? { left: '1.5rem' } : { right: '1.5rem' }), zIndex: 10, padding: '0.4rem 1rem', borderRadius: '12px', border: `3px solid ${dragX > 0 ? '#2ecc71' : '#e74c3c'}`, transform: 'rotate(-10deg)' }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: '900', color: dragX > 0 ? '#2ecc71' : '#e74c3c', textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>{dragX > 0 ? 'LIKE' : 'NOPE'}</span>
                        </div>
                    )}
                    {/* Background Image Carousel */}
                    <div 
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ 
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            zIndex: 1,
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            WebkitTouchCallout: 'none'
                        }}
                    >
                        {(currentProfile.images?.length > 0 ? currentProfile.images : (currentProfile.image_url ? [currentProfile.image_url] : [])).length > 0 ? (
                            <img 
                                src={optimizeImage((currentProfile.images?.length > 0 ? currentProfile.images : [currentProfile.image_url])[photoIndex] || currentProfile.image_url)} 
                                alt="Profile" 
                                draggable={false}
                                style={{ 
                                    width: '100%', height: '100%', objectFit: 'cover',
                                    transform: 'scale(1.05) translateZ(0)',
                                    willChange: 'transform',
                                    backfaceVisibility: 'hidden',
                                    pointerEvents: 'none'
                                }} 
                            />
                        ) : currentProfile.custom_avatar && currentProfile.custom_avatar.startsWith('{') ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)' }}>
                                <Avatar 
                                    avatarString={currentProfile.custom_avatar} 
                                    style={{ width: '80%', height: '80%', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }} 
                                />
                            </div>
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Heart size={64} color="rgba(255,255,255,0.2)" />
                            </div>
                        )}
                        
                        {/* Tall Gradient Overlay for Text & Buttons */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%', background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 45%, rgba(0,0,0,0) 100%)', pointerEvents: 'none' }}></div>
                    </div>

                    {/* Tap Controls & Indicators */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', zIndex: 2, display: 'flex', flexDirection: 'column' }}>
                        {/* Bumble-style Progress Bars */}
                        <div style={{ display: 'flex', gap: '4px', padding: '12px 16px', zIndex: 3, flexShrink: 0 }}>
                            {(()=>{
                                const imgs = currentProfile.images?.length > 0 ? currentProfile.images : (currentProfile.image_url ? [currentProfile.image_url] : []);
                                if (imgs.length <= 1) return null;
                                return imgs.map((_, i) => (
                                    <div key={i} style={{ 
                                        flex: 1, height: '4px', borderRadius: '4px', 
                                        background: i === photoIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                        transition: 'background 0.2s ease'
                                    }} />
                                ));
                            })()}
                        </div>
                        
                        {/* Tap zones for left/right */}
                        <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%' }}>
                            <div style={{ flex: 1, height: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '10px' }} onClick={(e) => {
                                e.stopPropagation();
                                const imgs = currentProfile.images?.length > 0 ? currentProfile.images : (currentProfile.image_url ? [currentProfile.image_url] : []);
                                if (photoIndex > 0) setPhotoIndex(photoIndex - 1);
                            }}>
                                {photoIndex > 0 && <ChevronLeft size={32} color="rgba(255,255,255,0.7)" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />}
                            </div>

                            <div style={{ flex: 1, height: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '10px' }} onClick={(e) => {
                                e.stopPropagation();
                                const imgs = currentProfile.images?.length > 0 ? currentProfile.images : (currentProfile.image_url ? [currentProfile.image_url] : []);
                                if (photoIndex < imgs.length - 1) setPhotoIndex(photoIndex + 1);
                            }}>
                                {photoIndex < (currentProfile.images?.length > 0 ? currentProfile.images : (currentProfile.image_url ? [currentProfile.image_url] : [])).length - 1 && <ChevronRight size={32} color="rgba(255,255,255,0.7)" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />}
                            </div>
                        </div>
                    </div>

                    {/* Content Overlay (Text + Buttons) */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem 1rem 1.5rem 1rem', zIndex: 3, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
                        
                        {/* Profile Info */}
                        <div style={{ pointerEvents: 'auto', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '2.6rem', marginBottom: '0.3rem', fontWeight: '800', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.6)', lineHeight: 1.1, display: 'flex', alignItems: 'center' }}>
                                Anonymous {currentProfile.age ? `, ${currentProfile.age}` : ''}
                                {currentProfile.gender === 'male' && <span style={{fontSize: '1.4rem', marginLeft: '8px', color: '#3498db'}} title="Male">♂</span>}
                                {currentProfile.gender === 'female' && <span style={{fontSize: '1.4rem', marginLeft: '8px', color: '#e74c3c'}} title="Female">♀</span>}
                                {currentProfile.gender === 'non_binary' && <span style={{fontSize: '1.4rem', marginLeft: '8px', color: '#9b59b6'}} title="Non-binary">⚧</span>}
                                {currentProfile.is_active_today && (
                                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#2ecc71', marginLeft: '12px', boxShadow: '0 0 8px #2ecc71', border: '2px solid rgba(0,0,0,0.3)' }} title="Active Today" />
                                )}
                            </h2>
                            
                            {currentProfile.block && (
                                <div style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.9)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FF5E5B', boxShadow: '0 0 8px rgba(255,94,91,0.6)' }}></span>
                                    Block {currentProfile.block}
                                    {currentProfile.badges && currentProfile.badges.map((b, i) => (
                                        <span key={i} title={b.text} style={{ fontSize: '1.1rem', marginLeft: '6px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '12px' }}>{b.icon}</span>
                                    ))}
                                </div>
                            )}
                            
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                {currentProfile.gender && currentProfile.gender !== 'not_specified' && (
                                    <span style={{ padding: '6px 16px', background: 'rgba(255, 94, 91, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '24px', fontSize: '0.9rem', color: '#fff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {currentProfile.gender}
                                    </span>
                                )}
                                {(() => {
                                    let vibeScore = 50;
                                    if (profile && currentProfile) {
                                        if (profile.course === currentProfile.course && profile.course) vibeScore += 15;
                                        if (profile.block === currentProfile.block && profile.block) vibeScore += 10;
                                        if (profile.campus_spot && profile.campus_spot === currentProfile.campus_spot) vibeScore += 25;
                                        
                                        const myInterests = profile.interests || [];
                                        const theirInterests = currentProfile.interests || [];
                                        const sharedInterests = myInterests.filter(i => theirInterests.includes(i)).length;
                                        vibeScore += sharedInterests * 10;

                                        const myLove = profile.love_languages || [];
                                        const theirLove = currentProfile.love_languages || [];
                                        const sharedLove = myLove.filter(i => theirLove.includes(i)).length;
                                        vibeScore += sharedLove * 15;

                                        const myGreen = profile.green_flags || [];
                                        const theirGreen = currentProfile.green_flags || [];
                                        const sharedGreen = myGreen.filter(i => theirGreen.includes(i)).length;
                                        vibeScore += sharedGreen * 10;
                                        
                                        if (vibeScore > 100) vibeScore = 100;
                                        else if (vibeScore < 50 && sharedInterests === 0 && sharedLove === 0) vibeScore = 55 + (currentProfile.user_id % 12);
                                    }
                                    return (
                                        <span style={{ padding: '6px 16px', background: 'rgba(46, 204, 113, 0.3)', backdropFilter: 'blur(10px)', borderRadius: '24px', fontSize: '0.9rem', color: '#fff', fontWeight: '800', border: '1px solid rgba(46, 204, 113, 0.5)' }}>
                                            🔥 {vibeScore}% Vibe Match
                                        </span>
                                    );
                                })()}
                            </div>

                            <p style={{ fontSize: '1.1rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 4px rgba(0,0,0,0.6)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {currentProfile.bio || "No bio provided. Mystery is intriguing."}
                            </p>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem', maxHeight: '85px', overflowY: 'auto', pointerEvents: 'auto', paddingRight: '4px' }} className="custom-scroll">
                                {currentProfile.campus_spot && (
                                    <span style={{ padding: '2px 8px', background: 'rgba(255, 200, 0, 0.2)', color: '#FFD700', borderRadius: '12px', fontSize: '0.75rem', border: '1px solid rgba(255, 200, 0, 0.4)' }}>📍 {currentProfile.campus_spot}</span>
                                )}
                                {(currentProfile.interests || []).map(i => (
                                    <span key={i} style={{ padding: '2px 8px', background: 'rgba(255, 94, 91, 0.2)', color: '#FF5E5B', borderRadius: '12px', fontSize: '0.75rem', border: '1px solid rgba(255, 94, 91, 0.4)' }}>{i}</span>
                                ))}
                                {(currentProfile.green_flags || []).map(i => (
                                    <span key={i} style={{ padding: '2px 8px', background: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', borderRadius: '12px', fontSize: '0.75rem', border: '1px solid rgba(46, 204, 113, 0.4)' }}>✅ {i}</span>
                                ))}
                                {(currentProfile.red_flags || []).map(i => (
                                    <span key={i} style={{ padding: '2px 8px', background: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c', borderRadius: '12px', fontSize: '0.75rem', border: '1px solid rgba(231, 76, 60, 0.4)' }}>🚩 {i}</span>
                                ))}
                                {(currentProfile.love_languages || []).map(i => (
                                    <span key={i} style={{ padding: '2px 8px', background: 'rgba(155, 89, 182, 0.2)', color: '#9b59b6', borderRadius: '12px', fontSize: '0.75rem', border: '1px solid rgba(155, 89, 182, 0.4)' }}>💝 {i}</span>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons Container */}
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', pointerEvents: 'auto' }}>
                            {/* Undo */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleUndo(); }}
                                title="Undo last swipe"
                                style={{ 
                                    width: '56px', height: '56px', borderRadius: '50%', border: '1px solid rgba(255,200,0,0.4)', 
                                    backgroundColor: 'rgba(255,200,0,0.1)', backdropFilter: 'blur(10px)', color: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentIndex > 0 ? 'pointer' : 'not-allowed', opacity: currentIndex > 0 ? 1 : 0.3, transition: 'all 0.2s'
                                }}
                            >
                                <RotateCcw size={22} />
                            </button>

                            {/* Pass */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleSwipe('pass'); }}
                                className={activeBtn === 'pass' ? 'btn-pass-anim' : ''}
                                style={{ 
                                    width: '72px', height: '72px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', 
                                    backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s, background-color 0.2s'
                                }}
                            >
                                <X size={32} strokeWidth={2.5} />
                            </button>

                            {/* Like */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleSwipe('like'); }}
                                className={activeBtn === 'like' ? 'btn-like-anim' : ''}
                                disabled={dailyLimitHit}
                                style={{ 
                                    width: '72px', height: '72px', borderRadius: '50%', border: 'none', 
                                    background: dailyLimitHit ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #FF5E5B, #FF2A55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: dailyLimitHit ? 'not-allowed' : 'pointer', transition: 'transform 0.2s, filter 0.2s',
                                    boxShadow: dailyLimitHit ? 'none' : '0 8px 24px rgba(255, 94, 91, 0.5)'
                                }}
                            >
                                <Heart size={32} fill="#fff" strokeWidth={0} />
                            </button>

                            {/* Super Like */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleSwipe('superlike'); }}
                                title="Super Like"
                                disabled={dailyLimitHit}
                                style={{ 
                                    width: '56px', height: '56px', borderRadius: '50%', border: '1px solid rgba(53,214,231,0.4)', 
                                    backgroundColor: superlikeAnim ? 'rgba(53,214,231,0.4)' : 'rgba(53,214,231,0.15)', backdropFilter: 'blur(10px)', color: '#35D6E7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: dailyLimitHit ? 'not-allowed' : 'pointer', opacity: dailyLimitHit ? 0.3 : 1, transition: 'all 0.2s',
                                    boxShadow: superlikeAnim ? '0 0 20px rgba(53,214,231,0.5)' : 'none'
                                }}
                            >
                                <Star size={22} fill={superlikeAnim ? '#35D6E7' : 'none'} />
                            </button>
                        </div>

                        {/* Daily like counter */}
                        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', pointerEvents: 'none' }}>
                            {dailyLimitHit ? (
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>No more likes today · Come back tomorrow!</span>
                            ) : (
                                <>
                                    <div style={{ height: '3px', borderRadius: '3px', background: 'rgba(255,255,255,0.15)', flex: 1, maxWidth: '120px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #FF5E5B, #FF2A55)', width: `${Math.min((likesToday / likesLimit) * 100, 100)}%`, transition: 'width 0.4s ease' }} />
                                    </div>
                                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>{likesLimit - likesToday} left today</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '3rem', margin: '2rem auto', maxWidth: '400px', background: '#ffcc00', border: '8px solid #000', boxShadow: '12px 12px 0px #ff3366', color: '#000' }}>
                    <div className="pulsing-heart-main" style={{ margin: '0 auto 1.5rem auto' }}>
                        <Heart size={64} fill="#000" color="#000" />
                    </div>
                    <h3 style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '4px solid #000', paddingBottom: '0.5rem' }}>NO PROFILES LEFT</h3>
                    <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        That's everyone for now! Check back later or try clearing your block filters to discover more people.
                    </p>
                </div>
            )}
        </div>

        <DatingFilterModal 
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
            currentBlock={filterBlock}
            currentCourse={filterCourse}
            onApply={(b, c) => {
                setFilterBlock(b);
                setFilterCourse(c);
                setShowFilters(false);
                fetchDiscover(b, c);
            }}
        />

        <style>{`
            .pulsing-heart-main {
                animation: pulseHeart 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
            }
            @keyframes pulseHeart {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            .dating-card-anim {
                animation: datingCardPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                transform-origin: center bottom;
            }
            @keyframes datingCardPop {
                0% { opacity: 0; transform: scale(0.85) translateY(40px); }
                60% { opacity: 1; transform: scale(1.02) translateY(-5px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
        `}</style>
    </div>
  );
}
