import React, { useState } from 'react';
import { Heart, X, Camera } from 'lucide-react';
import { apiFetch, uploadFile, fetchInstagramProfile } from '../api';
import { CAMPUS_STRUCTURE } from '../campus_structure';

export default function DatingProfileModal({ isOpen, onClose, onSaved, initialProfile }) {
  const [bio, setBio] = useState(initialProfile?.bio || '');
  const [gender, setGender] = useState(initialProfile?.gender || 'not_specified');
  const [lookingFor, setLookingFor] = useState(initialProfile?.looking_for || 'everyone');
  const [age, setAge] = useState(initialProfile?.age || '');
  const [block, setBlock] = useState(initialProfile?.block || 'A');
  const [course, setCourse] = useState(initialProfile?.course || (CAMPUS_STRUCTURE['Block A'] ? CAMPUS_STRUCTURE['Block A'][0] : ''));
  const [images, setImages] = useState(initialProfile?.images?.length ? initialProfile.images : (initialProfile?.image_url ? [initialProfile.image_url] : []));
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); // store index being uploaded, or false
  const [errorMsg, setErrorMsg] = useState('');
  const [instaUsername, setInstaUsername] = useState('');
  const [instaLoading, setInstaLoading] = useState(false);

  if (!isOpen) return null;

  const handleUrlAdd = async () => {
      if (!instaUsername.trim() || images.length >= 5) return;
      setInstaLoading(true);
      setErrorMsg('');
      try {
          // Just add the URL directly if it's a valid image link
          const url = instaUsername.trim();
          setImages([...images, url]);
          setInstaUsername('');
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
          image_url: images.length > 0 ? images[0] : '',
          images,
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
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content feed-card" style={{ maxWidth: '400px', width: '90%', padding: '2rem', position: 'relative' }}>
        {onClose && (
          <button 
            onClick={onClose} 
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        )}
        
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Heart size={48} color="#FF5E5B" fill="#FF5E5B" style={{ marginBottom: '1rem' }} />
          <h2>Join Campus Dating</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Set up your blind dating profile to find your campus crush anonymously.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '50vh', paddingRight: '0.5rem' }}>
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
                         value={instaUsername}
                         onChange={(e) => setInstaUsername(e.target.value)}
                         style={{ width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.9rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                         onKeyDown={(e) => { if (e.key === 'Enter') handleUrlAdd(); }}
                       />
                     </div>
                     <button onClick={handleUrlAdd} disabled={instaLoading || !instaUsername.trim()} className="btn-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
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
              className="composer-textarea border-input"
              style={{ width: '100%', padding: '0.8rem' }}
              placeholder="e.g. 21"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>University Block</label>
            <select 
              className="composer-textarea border-input"
              style={{ width: '100%', padding: '0.8rem', backgroundColor: 'var(--bg-input)' }}
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
              className="composer-textarea border-input"
              style={{ width: '100%', padding: '0.8rem', backgroundColor: 'var(--bg-input)' }}
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
              className="composer-textarea border-input"
              style={{ width: '100%', padding: '0.8rem', backgroundColor: 'var(--bg-input)' }}
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
              className="composer-textarea border-input"
              style={{ width: '100%', padding: '0.8rem', backgroundColor: 'var(--bg-input)' }}
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
              className="composer-textarea border-input"
              style={{ width: '100%', padding: '0.8rem', minHeight: '80px' }}
              placeholder="What makes you interesting?"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          {errorMsg && (
            <div style={{ color: '#FF5E5B', textAlign: 'center', fontSize: '0.9rem' }}>
                {errorMsg === 'Unauthorized' ? 'You must be logged in to create a dating profile!' : errorMsg}
            </div>
          )}

        </div>
        
        {/* Sticky Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            className="btn-glow" 
            style={{ width: '100%', padding: '1rem', backgroundColor: '#FF5E5B', fontSize: '1.1rem' }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Start Swiping'}
          </button>
          
          {initialProfile && (
              <button 
                  style={{ width: '100%', padding: '1rem', fontSize: '0.9rem', color: '#FF5E5B', border: '1px solid rgba(255, 94, 91, 0.3)', background: 'transparent', borderRadius: '24px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={async () => {
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
                  disabled={loading}
              >
                  Withdraw Profile
              </button>
          )}
        </div>
      </div>
    </div>
  );
}
