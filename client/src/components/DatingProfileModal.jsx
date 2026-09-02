import React, { useState } from 'react';
import { Heart, X, Camera } from 'lucide-react';
import { apiFetch, uploadFile, fetchInstagramProfile } from '../api';
import { CAMPUS_STRUCTURE } from '../campus_structure';

const INTEREST_OPTIONS = ["Late Night Snacking", "Library Grind", "Gaming", "Photography", "Cafe Hopping", "Anime", "Gym Rat", "Partying", "Music Festivals", "Art & Design", "Sports", "Thrifting"];
const GREEN_FLAG_OPTIONS = ["Replies fast", "Loves animals", "Has a car", "Cooks", "Knows good spots", "Good listener", "Punctual", "Spontaneous"];
const RED_FLAG_OPTIONS = ["8 AM classes", "Uses Instagram Reels too much", "Ghoster", "Never on time", "Picky eater", "Hates coffee", "Dry texter", "Too loud"];
const LOVE_LANGUAGE_OPTIONS = ["Physical Touch", "Quality Time", "Words of Affirmation", "Acts of Service", "Receiving Gifts"];

export default function DatingProfileModal({ isOpen, onClose, onSaved, initialProfile }) {
  const [bio, setBio] = useState(initialProfile?.bio || '');
  const [gender, setGender] = useState(initialProfile?.gender || 'not_specified');
  const [lookingFor, setLookingFor] = useState(initialProfile?.looking_for || 'everyone');
  const [age, setAge] = useState(initialProfile?.age || '');
  const [block, setBlock] = useState(initialProfile?.block || 'A');
  const [course, setCourse] = useState(initialProfile?.course || (CAMPUS_STRUCTURE['Block A'] ? CAMPUS_STRUCTURE['Block A'][0] : ''));
  const [images, setImages] = useState(initialProfile?.images?.length ? initialProfile.images : (initialProfile?.image_url ? [initialProfile.image_url] : []));
  const [interests, setInterests] = useState(initialProfile?.interests || []);
  const [redFlags, setRedFlags] = useState(initialProfile?.red_flags || []);
  const [greenFlags, setGreenFlags] = useState(initialProfile?.green_flags || []);
  const [loveLanguages, setLoveLanguages] = useState(initialProfile?.love_languages || []);
  const [campusSpot, setCampusSpot] = useState(initialProfile?.campus_spot || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); // store index being uploaded, or false
  const [errorMsg, setErrorMsg] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [instaUsername, setInstaUsername] = useState(initialProfile?.insta_username || '');
  const [instaLoading, setInstaLoading] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  if (!isOpen) return null;

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setIsScrolledToBottom(scrollHeight - scrollTop <= clientHeight + 20);
  };

  const handleUrlAdd = async () => {
      if (!imageUrlInput.trim() || images.length >= 5) return;
      setInstaLoading(true);
      setErrorMsg('');
      try {
          // Just add the URL directly if it's a valid image link
          const url = imageUrlInput.trim();
          setImages([...images, url]);
          setImageUrlInput('');
      } catch (err) {
          setErrorMsg('Invalid URL');
      } finally {
          setInstaLoading(false);
      }
  };

  const handleImageUpload = async (e, index = null) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(index !== null ? index : images.length);
      try {
          const url = await uploadFile(file);
          if (url) {
              setImages(prev => {
                  const newImages = [...prev];
                  if (index !== null && index < newImages.length) {
                      newImages[index] = url; // replace
                  } else {
                      newImages.push(url); // append
                  }
                  return newImages;
              });
          }
      } catch (err) {
          console.error("Upload failed", err);
      } finally {
          setUploading(false);
      }
  };

  const handleSave = async () => {
    if (!age || age < 18) {
      setErrorMsg("You must be 18+ and specify your age.");
      return;
    }
    if (gender === 'not_specified') {
      setErrorMsg("Please specify your gender.");
      return;
    }
    if (!bio.trim()) {
      setErrorMsg("Bio cannot be empty.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/dating/profile', {
        method: 'POST',
        body: JSON.stringify({
          bio,
          gender,
          looking_for: lookingFor,
          age,
          block,
          course,
          image_url: images[0] || '',
          images,
          insta_username: instaUsername,
          interests,
          red_flags: redFlags,
          green_flags: greenFlags,
          love_languages: loveLanguages,
          campus_spot: campusSpot,
          is_active: true
        })
      });
      if (response && !response.error) {
        onSaved(response);
      } else {
        setErrorMsg(response?.error || 'Failed to save profile');
      }
    } catch (e) {
      console.error("Error saving profile", e);
      setErrorMsg('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000 }}>
      <div className="modal-content" style={{ 
          maxWidth: '450px', width: '90%', padding: '2rem', 
          position: 'relative', backgroundColor: '#fff', 
          border: '4px solid #000', borderRadius: '12px', 
          boxShadow: '12px 12px 0px #000', color: '#000',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column'
      }}>
        {onClose && (
          <button 
            onClick={onClose} 
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#FF5E5B', border: '3px solid #000', color: '#fff', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '3px 3px 0 #000', zIndex: 10 }}
          >
            <X size={20} strokeWidth={3} />
          </button>
        )}
        
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
          <Heart size={54} color="#000" fill="#FF5E5B" strokeWidth={3} style={{ marginBottom: '0.5rem', filter: 'drop-shadow(3px 3px 0px #000)' }} />
          <h2 style={{ fontWeight: 900, fontSize: '2.2rem', letterSpacing: '-1px', margin: 0, textTransform: 'uppercase' }}>Join Dating</h2>
          <p style={{ color: '#444', fontSize: '1rem', fontWeight: 600, marginTop: '0.5rem' }}>Set up your blind dating profile to find your campus crush.</p>
        </div>

        <div 
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem', paddingBottom: '2rem', position: 'relative' }}
          onScroll={handleScroll}
          className="custom-scroll"
        >
          <div style={{ textAlign: 'center' }}>
             <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                 Mystery Photos (Up to 5) <br/>
                 <small>(Tip: Wear a mask or hide your face to keep it semi-anonymous!)</small>
             </label>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                 {[0, 1, 2, 3, 4].map(index => {
                     const hasImage = !!images[index];
                     return (
                         <div key={index} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', border: hasImage ? '2px solid #FF5E5B' : '2px dashed var(--border-color)', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             {hasImage ? (
                                 <>
                                     <img src={images[index]} alt={`Profile ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                     <button onClick={() => {
                                         const newImages = [...images];
                                         newImages.splice(index, 1);
                                         setImages(newImages);
                                     }} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} /></button>
                                 </>
                             ) : (
                                 <label style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                     {uploading === index || (index === images.length && uploading === images.length) ? <span style={{fontSize: '0.7rem'}}>Wait...</span> : <Camera size={24} opacity={0.5} />}
                                     <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, index)} disabled={uploading !== false} />
                                 </label>
                             )}
                         </div>
                     );
                 })}
             </div>
             
             {images.length < 5 && (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '1rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                   <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'left' }}>Or paste an image link directly:</span>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                     <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                       <input 
                         type="text" 
                         placeholder="https://example.com/image.jpg" 
                         value={imageUrlInput}
                         onChange={(e) => setImageUrlInput(e.target.value)}
                         style={{ width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.9rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                         onKeyDown={(e) => { if (e.key === 'Enter') handleUrlAdd(); }}
                       />
                     </div>
                     <button onClick={handleUrlAdd} disabled={instaLoading || !imageUrlInput.trim()} className="btn-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                       Add Link
                     </button>
                   </div>
                 </div>
             )}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Age</label>
            <input 
              type="number" 
              className="composer-textarea"
              style={{ width: '100%', padding: '0.8rem', border: '3px solid #000', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '8px', boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.05)' }}
              placeholder="e.g. 21"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Instagram Handle (Optional)</label>
            <input 
              type="text" 
              className="composer-textarea"
              style={{ width: '100%', padding: '0.8rem', border: '3px solid #000', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '8px', boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.05)' }}
              placeholder="e.g. jlu_whispers (Shown only on match!)"
              value={instaUsername}
              onChange={(e) => setInstaUsername(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>University Block</label>
            <select 
              className="composer-textarea"
              style={{ width: '100%', padding: '0.8rem', border: '3px solid #000', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '8px' }}
              value={block}
              onChange={(e) => setBlock(e.target.value)}
            >
              <option value="A">Block A</option>
              <option value="B">Block B</option>
              <option value="C">Block C</option>
              <option value="D">Block D</option>
              <option value="E">Block E</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Course</label>
            <select 
              className="composer-textarea"
              style={{ width: '100%', padding: '0.8rem', border: '3px solid #000', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '8px' }}
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              {(CAMPUS_STRUCTURE[`Block ${block}`] || []).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>I identify as</label>
            <select 
              className="composer-textarea"
              style={{ width: '100%', padding: '0.8rem', border: '3px solid #000', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '8px' }}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="not_specified">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non_binary">Non-binary</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>I'm looking for</label>
            <select 
              className="composer-textarea"
              style={{ width: '100%', padding: '0.8rem', border: '3px solid #000', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '8px' }}
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
            >
              <option value="everyone">Everyone</option>
              <option value="male">Men</option>
              <option value="female">Women</option>
              <option value="non_binary">Non-binary</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Bio (Keep it anonymous!)</label>
            <textarea 
              className="composer-textarea"
              style={{ width: '100%', padding: '0.8rem', minHeight: '80px', border: '3px solid #000', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '8px', boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.05)' }}
              placeholder="What makes you interesting?"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Interests (Select up to 5)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {INTEREST_OPTIONS.map(opt => {
                    const selected = interests.includes(opt);
                    return (
                        <button key={opt} onClick={() => {
                            if (selected) setInterests(interests.filter(i => i !== opt));
                            else if (interests.length < 5) setInterests([...interests, opt]);
                        }} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: 'bold', borderRadius: '16px', border: selected ? '3px solid #000' : '2px solid #555', background: selected ? '#FF5E5B' : '#fff', color: selected ? '#fff' : '#000', boxShadow: selected ? '3px 3px 0 #000' : 'none', cursor: 'pointer', transition: 'all 0.1s' }}>
                            {opt}
                        </button>
                    );
                })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Green Flags (Select up to 3)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {GREEN_FLAG_OPTIONS.map(opt => {
                    const selected = greenFlags.includes(opt);
                    return (
                        <button key={opt} onClick={() => {
                            if (selected) setGreenFlags(greenFlags.filter(i => i !== opt));
                            else if (greenFlags.length < 3) setGreenFlags([...greenFlags, opt]);
                        }} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: 'bold', borderRadius: '16px', border: selected ? '3px solid #000' : '2px solid #555', background: selected ? '#2ecc71' : '#fff', color: selected ? '#fff' : '#000', boxShadow: selected ? '3px 3px 0 #000' : 'none', cursor: 'pointer', transition: 'all 0.1s' }}>
                            {opt}
                        </button>
                    );
                })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Love Languages (Select up to 2)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {LOVE_LANGUAGE_OPTIONS.map(opt => {
                    const selected = loveLanguages.includes(opt);
                    return (
                        <button key={opt} onClick={() => {
                            if (selected) setLoveLanguages(loveLanguages.filter(i => i !== opt));
                            else if (loveLanguages.length < 2) setLoveLanguages([...loveLanguages, opt]);
                        }} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: 'bold', borderRadius: '16px', border: selected ? '3px solid #000' : '2px solid #555', background: selected ? '#9b59b6' : '#fff', color: selected ? '#fff' : '#000', boxShadow: selected ? '3px 3px 0 #000' : 'none', cursor: 'pointer', transition: 'all 0.1s' }}>
                            {opt}
                        </button>
                    );
                })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Red Flags (Select up to 3)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {RED_FLAG_OPTIONS.map(opt => {
                    const selected = redFlags.includes(opt);
                    return (
                        <button key={opt} onClick={() => {
                            if (selected) setRedFlags(redFlags.filter(i => i !== opt));
                            else if (redFlags.length < 3) setRedFlags([...redFlags, opt]);
                        }} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: 'bold', borderRadius: '16px', border: selected ? '3px solid #000' : '2px solid #555', background: selected ? '#e74c3c' : '#fff', color: selected ? '#fff' : '#000', boxShadow: selected ? '3px 3px 0 #000' : 'none', cursor: 'pointer', transition: 'all 0.1s' }}>
                            {opt}
                        </button>
                    );
                })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Live Campus Spot (Optional)</label>
            <input 
              type="text" 
              className="composer-textarea"
              style={{ width: '100%', padding: '0.8rem', border: '3px solid #000', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '8px', boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.05)' }}
              placeholder="e.g. Studying at the Library"
              value={campusSpot}
              onChange={(e) => setCampusSpot(e.target.value)}
            />
          </div>

          {errorMsg && (
            <div style={{ color: '#FF5E5B', textAlign: 'center', fontSize: '0.9rem' }}>
                {errorMsg === 'Unauthorized' ? 'You must be logged in to create a dating profile!' : errorMsg}
            </div>
          )}

        </div>
        
        {/* Scroll Indicator */}
        <div style={{ 
            position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)', 
            background: '#ffcc00', border: '2px solid #000', borderRadius: '16px', 
            padding: '2px 8px', fontSize: '0.75rem', fontWeight: 900, color: '#000',
            boxShadow: '2px 2px 0 #000', zIndex: 10, pointerEvents: 'none',
            opacity: isScrolledToBottom ? 0 : 0.8, transition: 'opacity 0.3s ease',
            display: 'flex', alignItems: 'center', gap: '4px'
        }}>
            ↓ SCROLL
        </div>
        
        {/* Sticky Footer */}
        <div style={{ padding: '1rem 0 0 0', marginTop: '1rem', borderTop: '4px solid #000', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0, backgroundColor: '#fff' }}>
          <button 
            style={{ width: '100%', padding: '1rem', backgroundColor: '#FF5E5B', border: '4px solid #000', borderRadius: '8px', color: '#fff', fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', boxShadow: '4px 4px 0 #000', cursor: 'pointer', transition: 'all 0.1s' }}
            onClick={handleSave}
            disabled={loading}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'translate(4px, 4px)'; e.currentTarget.style.boxShadow = '0px 0px 0 #000'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0 #000'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0 #000'; }}
          >
            {loading ? 'SAVING...' : 'START SWIPING'}
          </button>
          
          {initialProfile && (
              <button 
                  style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', fontWeight: 700, color: '#e74c3c', border: '3px solid #000', background: '#fff', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.1s', boxShadow: '3px 3px 0 #000' }}
                  onClick={async (e) => {
                      if (window.confirm("Are you sure you want to withdraw your profile? You will no longer be visible in Dating.")) {
                          setLoading(true);
                          const res = await apiFetch('/dating/profile', {
                              method: 'POST',
                              body: JSON.stringify({ is_active: false })
                          });
                          if (res && !res.error) onSaved(res);
                          setLoading(false);
                      }
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'translate(3px, 3px)'; e.currentTarget.style.boxShadow = '0px 0px 0 #000'; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '3px 3px 0 #000'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '3px 3px 0 #000'; }}
                  disabled={loading}
              >
                  WITHDRAW PROFILE
              </button>
          )}
        </div>
      </div>
    </div>
  );
}
