import React, { useState, useEffect } from 'react';
import { Heart, X, MessageCircle, Filter, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch } from '../api';
import DatingProfileModal from '../components/DatingProfileModal';
import DatingFilterModal from '../components/DatingFilterModal';
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
  const [glimpse, setGlimpse] = useState(false);
  const [glimpseCount, setGlimpseCount] = useState(0);
  const [activeBtn, setActiveBtn] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterBlock, setFilterBlock] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [waitlist, setWaitlist] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
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
      setGlimpseCount(0);
      
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
    const target = profiles[currentIndex];
    
    setActiveBtn(action);
    setPhotoIndex(0);
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }

    setTimeout(() => {
        setCurrentIndex(prev => {
            const next = prev + 1;
            datingCache.currentIndex = next;
            return next;
        });
        setActiveBtn(null);
        setGlimpseCount(0);
    }, 300);

    const targetId = profiles[currentIndex].user_id;
    
    // Start backend request in the background
    const fetchPromise = apiFetch('/dating/swipe', {
        method: 'POST',
        body: JSON.stringify({ target_id: targetId, action })
    });
    
    // Wait for the animation to finish (300ms)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Handle the background response
    fetchPromise.then(res => res.json()).then(data => {
        if (data && data.match) {
            if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
            
            // Get the image of the person we just swiped on before the index advances
            const matchImg = optimizeImage((target.images?.length > 0 ? target.images : [target.image_url])[0] || target.image_url);
            
            setMatchPopup({ 
                name: "Your Match", 
                conversation_id: data.conversation_id,
                image: matchImg
            });
        }
    }).catch(err => {
        console.error("Swipe API failed", err);
    });
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
                {matchPopup.image && (
                    <img 
                        src={matchPopup.image} 
                        alt="Match background" 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(15px) brightness(0.4)', opacity: 0.8 }} 
                    />
                )}
                
                <div className="feed-card" style={{ position: 'relative', zIndex: 10001, padding: '3rem', textAlign: 'center', width: '100%', maxWidth: '400px', border: '2px solid #FF5E5B', background: 'rgba(20, 20, 20, 0.85)', backdropFilter: 'blur(10px)', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                    <div className="pulsing-heart-main" style={{ margin: '0 auto 2rem auto', width: '80px', height: '80px', background: 'linear-gradient(135deg, #FF5E5B, #FF2A55)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(255, 94, 91, 0.4)' }}>
                        <Heart size={40} fill="#fff" color="#fff" />
                    </div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem', color: '#fff' }}>It's a Match!</h2>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: '1rem 0 2rem 0', fontSize: '1.1rem' }}>You and <strong>{matchPopup.name}</strong> have liked each other.</p>
                    
                    <button className="btn-glow" onClick={() => navigate(`/messages${matchPopup.conversation_id ? `?conv=${matchPopup.conversation_id}` : ''}`)} style={{ width: '100%', marginBottom: '1rem', background: 'linear-gradient(135deg, #FF5E5B, #FF2A55)', color: '#fff', borderRadius: '30px', padding: '1rem', border: 'none', fontWeight: '700', fontSize: '1.1rem' }}>
                        Send a Message
                    </button>
                    <button className="btn-secondary" onClick={() => setMatchPopup(null)} style={{ width: '100%', padding: '1rem', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', background: 'transparent' }}>
                        Keep Swiping
                    </button>
                </div>
            </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', marginBottom: '1rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: '#FF5E5B', fontWeight: '800', letterSpacing: '-0.5px' }}>
                <Heart fill="#FF5E5B" color="#FF5E5B" /> Campus Crush
            </h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                <div key={currentProfile.user_id} className="feed-card dating-card-anim" style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', borderRadius: '32px', backgroundColor: '#111', marginBottom: 0 }}>
                    
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
                                    filter: glimpse ? 'blur(2px)' : 'blur(10px)',
                                    transition: 'filter 0.3s ease',
                                    transform: 'scale(1.05) translateZ(0)',
                                    willChange: 'filter, transform',
                                    backfaceVisibility: 'hidden',
                                    pointerEvents: 'none'
                                }} 
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Heart size={64} color="rgba(255,255,255,0.2)" />
                            </div>
                        )}
                        
                        {/* Tall Gradient Overlay for Text & Buttons */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 100%)', pointerEvents: 'none' }}></div>
                    </div>

                    {/* Tap Controls & Indicators */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2, display: 'flex', flexDirection: 'column' }}>
                        {/* Bumble-style Progress Bars */}
                        <div style={{ display: 'flex', gap: '4px', padding: '12px 16px', zIndex: 3 }}>
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
                        <div style={{ display: 'flex', flex: 1 }}>
                            <div style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '10px' }} onClick={(e) => {
                                e.stopPropagation();
                                const imgs = currentProfile.images?.length > 0 ? currentProfile.images : (currentProfile.image_url ? [currentProfile.image_url] : []);
                                if (photoIndex > 0) setPhotoIndex(photoIndex - 1);
                            }}>
                                {photoIndex > 0 && <ChevronLeft size={32} color="rgba(255,255,255,0.7)" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />}
                            </div>
                            
                            {/* Center hold for glimpse */}
                            <div 
                                style={{ flex: 2, cursor: 'pointer' }} 
                                onMouseDown={() => { 
                                    const imgs = currentProfile.images?.length > 0 ? currentProfile.images : (currentProfile.image_url ? [currentProfile.image_url] : []);
                                    const maxGlimpses = Math.max(1, imgs.length - 1);
                                    if (glimpseCount < maxGlimpses) { 
                                        setGlimpse(true); 
                                        setGlimpseCount(prev => prev + 1); 
                                    } 
                                }}
                                onMouseUp={() => setGlimpse(false)}
                                onMouseLeave={() => setGlimpse(false)}
                                onTouchStart={() => { 
                                    const imgs = currentProfile.images?.length > 0 ? currentProfile.images : (currentProfile.image_url ? [currentProfile.image_url] : []);
                                    const maxGlimpses = Math.max(1, imgs.length - 1);
                                    if (glimpseCount < maxGlimpses) { 
                                        setGlimpse(true); 
                                        setGlimpseCount(prev => prev + 1); 
                                    } 
                                }}
                                onTouchEnd={() => setGlimpse(false)}
                            />

                            <div style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '10px' }} onClick={(e) => {
                                e.stopPropagation();
                                const imgs = currentProfile.images?.length > 0 ? currentProfile.images : (currentProfile.image_url ? [currentProfile.image_url] : []);
                                if (photoIndex < imgs.length - 1) setPhotoIndex(photoIndex + 1);
                            }}>
                                {photoIndex < (currentProfile.images?.length > 0 ? currentProfile.images : (currentProfile.image_url ? [currentProfile.image_url] : [])).length - 1 && <ChevronRight size={32} color="rgba(255,255,255,0.7)" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />}
                            </div>
                        </div>
                    </div>

                    {/* Content Overlay (Text + Buttons) */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2.5rem 1.5rem', zIndex: 3, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
                        
                        {/* Profile Info */}
                        <div style={{ pointerEvents: 'auto', marginBottom: '2rem' }}>
                            <p style={{ fontSize: '0.9rem', color: hasGlimpsed ? 'rgba(255,255,255,0.4)' : '#FF5E5B', marginBottom: '0.5rem', fontWeight: '600', transition: 'color 0.3s', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                {hasGlimpsed ? 'Glimpse used' : 'Hold photo for a one-time glimpse'}
                            </p>
                            <h2 style={{ fontSize: '2.6rem', marginBottom: '0.3rem', fontWeight: '800', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.6)', lineHeight: 1.1 }}>
                                Anonymous {currentProfile.age ? `, ${currentProfile.age}` : ''}
                            </h2>
                            
                            {currentProfile.block && (
                                <div style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.9)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FF5E5B', boxShadow: '0 0 8px rgba(255,94,91,0.6)' }}></span>
                                    Block {currentProfile.block}
                                </div>
                            )}
                            
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                {currentProfile.gender && currentProfile.gender !== 'not_specified' && (
                                    <span style={{ padding: '6px 16px', background: 'rgba(255, 94, 91, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '24px', fontSize: '0.9rem', color: '#fff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {currentProfile.gender}
                                    </span>
                                )}
                            </div>

                            <p style={{ fontSize: '1.1rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 4px rgba(0,0,0,0.6)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {currentProfile.bio || "No bio provided. Mystery is intriguing."}
                            </p>
                        </div>

                        {/* Action Buttons Container */}
                        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', pointerEvents: 'auto' }}>
                            <button 
                                onClick={() => handleSwipe('pass')}
                                className={activeBtn === 'pass' ? 'btn-pass-anim' : ''}
                                style={{ 
                                    width: '76px', height: '76px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', 
                                    backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s, background-color 0.2s, border-color 0.2s'
                                }}
                                onMouseOver={(e) => { if (!activeBtn) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.transform = 'scale(1.05)'; } }}
                                onMouseOut={(e) => { if (!activeBtn) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1)'; } }}
                                onMouseDown={(e) => { if (!activeBtn) e.currentTarget.style.transform = 'scale(0.95)'; }}
                                onMouseUp={(e) => { if (!activeBtn) e.currentTarget.style.transform = 'scale(1.05)'; }}
                            >
                                <X size={36} strokeWidth={2.5} />
                            </button>

                            <button 
                                onClick={() => handleSwipe('like')}
                                className={activeBtn === 'like' ? 'btn-like-anim' : ''}
                                style={{ 
                                    width: '76px', height: '76px', borderRadius: '50%', border: 'none', 
                                    background: 'linear-gradient(135deg, #FF5E5B, #FF2A55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s, filter 0.2s',
                                    boxShadow: '0 10px 30px rgba(255, 94, 91, 0.5)'
                                }}
                                onMouseOver={(e) => { if (!activeBtn) { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'scale(1.05)'; } }}
                                onMouseOut={(e) => { if (!activeBtn) { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'scale(1)'; } }}
                                onMouseDown={(e) => { if (!activeBtn) e.currentTarget.style.transform = 'scale(0.95)'; }}
                                onMouseUp={(e) => { if (!activeBtn) e.currentTarget.style.transform = 'scale(1.05)'; }}
                            >
                                <Heart size={36} fill="#fff" strokeWidth={0} />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="pulsing-heart-main" style={{ margin: '0 auto 1.5rem auto', opacity: 0.5 }}>
                        <Heart size={64} fill="var(--text-muted)" color="var(--text-muted)" />
                    </div>
                    <h3>You're all caught up!</h3>
                    <p style={{ color: 'var(--text-muted)' }}>There are no more profiles to view right now. Check back later!</p>
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
