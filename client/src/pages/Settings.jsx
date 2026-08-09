import { useState, useEffect } from 'react';
import { User, Settings as SettingsIcon, Shield, Trash2, Key, RefreshCw } from 'lucide-react';
import { fetchMe, regenerateIdentity, changePassword, deleteAccount } from '../api';

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const data = await fetchMe();
    if (data && !data.error) {
      setProfile(data);
    }
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Compress client-side
    const compressImage = (f, maxSizeKB) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width, height = img.height;
            const MAX = 600;
            if (width > height && width > MAX) { height *= MAX / width; width = MAX; }
            else if (height > MAX) { width *= MAX / height; height = MAX; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            let quality = 0.9;
            const step = () => {
              canvas.toBlob((blob) => {
                if (blob.size / 1024 > maxSizeKB && quality > 0.2) {
                  quality -= 0.1;
                  step();
                } else {
                  resolve(new File([blob], f.name, { type: 'image/jpeg' }));
                }
              }, 'image/jpeg', quality);
            };
            step();
          };
        };
      });
    };

    setPassError(''); setPassSuccess('');
    const compressed = await compressImage(file, 990); // 990kb

    const formData = new FormData();
    formData.append('file', compressed);
    const token = localStorage.getItem('jluwhisper_session');
    
    try {
      const upRes = await fetch((import.meta.env.VITE_API_URL || 'https://lakecity-whispers-backend.onrender.com/api') + '/upload', {
        method: 'POST', headers: { "Authorization": token }, body: formData
      });
      const upData = await upRes.json();
      if (upData.url) {
        // Update avatar in DB
        const avRes = await fetch((import.meta.env.VITE_API_URL || 'https://lakecity-whispers-backend.onrender.com/api') + '/auth/profile/avatar', {
          method: 'PUT', headers: { "Authorization": token, "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: upData.url })
        });
        const avData = await avRes.json();
        if (avData.avatar) {
          setProfile(prev => ({ ...prev, avatar: avData.avatar }));
          setPassSuccess("Profile picture updated!");
        }
      }
    } catch(err) {
      setPassError("Upload failed.");
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    const data = await regenerateIdentity();
    if (data && data.display_name) {
      setProfile(prev => ({ ...prev, display_name: data.display_name, avatar: data.avatar }));
    }
    setIsRegenerating(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    
    if (newPassword !== confirmPassword) {
      setPassError("New passwords do not match.");
      return;
    }
    
    const res = await changePassword(oldPassword, newPassword);
    if (res.error) {
      setPassError(res.error);
    } else {
      setPassSuccess(res.message);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleDelete = async () => {
    const confirm1 = window.confirm("Are you sure you want to delete your account? This action is permanent and will delete all your posts and replies.");
    if (confirm1) {
      const confirm2 = window.prompt("Type 'DELETE' to confirm.");
      if (confirm2 === 'DELETE') {
        const res = await deleteAccount();
        if (res && res.message) {
          localStorage.removeItem('jluwhisper_session');
          localStorage.removeItem('jluwhisper_identity');
          window.location.href = '/';
        }
      }
    }
  };

  if (loading) return <div className="page-content"><h2>Loading Profile...</h2></div>;
  if (!profile) return <div className="page-content"><h2>Error loading profile. Try logging in again.</h2></div>;

  return (
    <div className="page-content">

      <div className="feed-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.1) 0%, var(--bg-card) 100%)' }}>
        <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 1rem auto' }}>
          <div className="avatar-flame" style={{ width: '100%', height: '100%', fontSize: '2rem', boxShadow: '0 0 20px rgba(var(--accent-rgb), 0.4)' }}>
            {profile.avatar && profile.avatar.startsWith('http') ? (
              <img src={profile.avatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              profile.avatar || profile.display_name.charAt(0)
            )}
          </div>
          <label style={{ position: 'absolute', bottom: -5, right: -5, background: 'var(--accent-color)', borderRadius: '50%', padding: '5px', cursor: 'pointer', display: 'flex' }}>
            <SettingsIcon size={14} color="black" />
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
        </div>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{profile.display_name}</h2>
        <div style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          {profile.is_registered ? (
            <span style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', borderRadius: '12px', fontSize: '0.8rem' }}>
              ✓ Registered User (@{profile.username})
            </span>
          ) : (
            <span style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: 'rgba(241, 196, 15, 0.2)', color: '#f1c40f', borderRadius: '12px', fontSize: '0.8rem' }}>
              Anonymous Guest
            </span>
          )}
        </div>

        <button 
          className="btn-glow" 
          onClick={handleRegenerate} 
          disabled={isRegenerating}
          style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
        >
          <RefreshCw size={18} className={isRegenerating ? "spin" : ""} /> 
          {isRegenerating ? 'Generating...' : 'Generate New Identity'}
        </button>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem', maxWidth: '400px', margin: '1rem auto 0 auto' }}>
          Don't like your current alias? The AI will assign you a completely new, creative identity. 
          Your past posts will still show your old identity.
        </p>
      </div>

      {profile.is_registered ? (
        <div className="feed-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key size={20} color="var(--accent-color)" /> Change Password
          </h2>
          
          {passError && <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{passError}</div>}
          {passSuccess && <div style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{passSuccess}</div>}
          
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Current Password</label>
              <input 
                type="password" 
                className="composer-textarea" 
                style={{ minHeight: '40px', padding: '0.8rem' }}
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>New Password</label>
              <input 
                type="password" 
                className="composer-textarea" 
                style={{ minHeight: '40px', padding: '0.8rem' }}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Confirm New Password</label>
              <input 
                type="password" 
                className="composer-textarea" 
                style={{ minHeight: '40px', padding: '0.8rem' }}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-glow" style={{ marginTop: '0.5rem' }}>Update Password</button>
          </form>
        </div>
      ) : (
        <div className="feed-card" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--accent-color)' }}>
          <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={20} color="var(--accent-color)" /> Secure Your Account
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            You are currently an Anonymous Guest. If you clear your browser cookies, you will lose access to your posts and your identity. Register a username and password to secure your account.
          </p>
          <button className="btn-glow" onClick={() => window.location.href = '/login'}>
            Register Account Now
          </button>
        </div>
      )}

      <div className="feed-card" style={{ padding: '2rem', border: '1px solid #e74c3c' }}>
        <h2 style={{ marginBottom: '1rem', color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trash2 size={20} /> Danger Zone
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Once you delete your account, there is no going back. All your posts, replies, and votes will be permanently wiped from the database.
        </p>
        <button 
          className="btn-glow" 
          style={{ backgroundColor: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c' }}
          onClick={handleDelete}
        >
          Delete Account Permanently
        </button>
      </div>
      
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
