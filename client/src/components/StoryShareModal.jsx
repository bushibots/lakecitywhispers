import React, { useState, useRef, useEffect } from 'react';
import { toBlob } from 'html-to-image';
import { X, Share2 } from 'lucide-react';
import { formatTime } from '../utils';
import { fetchPublicConfig } from '../api';

export default function StoryShareModal({ post, onClose }) {
  const [theme, setTheme] = useState('glass');
  const [isGenerating, setIsGenerating] = useState(false);
  const [siteName, setSiteName] = useState('JLU Whisper');
  const previewRef = useRef(null);

  useEffect(() => {
    fetchPublicConfig().then(cfg => {
      if (cfg && cfg.site_name) setSiteName(cfg.site_name);
    });
  }, []);

  if (!post) return null;

  const themes = {
    glass: {
      background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
      cardBg: 'rgba(255, 255, 255, 0.05)',
      border: '3px solid rgba(255, 255, 255, 0.1)',
      textColor: '#E7E9EA',
      backdropFilter: 'blur(60px)'
    },
    neon: {
      background: '#09090b',
      cardBg: '#09090b',
      border: '6px solid #1D9BF0',
      boxShadow: '0 0 90px rgba(29, 155, 240, 0.3)',
      textColor: '#E7E9EA',
    },
    minimal: {
      background: '#E7E9EA',
      cardBg: '#ffffff',
      border: '3px solid #cfd9de',
      textColor: '#0f1419',
      boxShadow: '0 30px 90px rgba(0,0,0,0.05)',
    }
  };

  const currentStyle = themes[theme];

  const handleShare = async () => {
    if (!previewRef.current) return;
    setIsGenerating(true);
    
    try {
      // By resetting scale to 1 during capture, html-to-image generates exactly 1080x1920
      const blob = await toBlob(previewRef.current, { 
          quality: 0.95,
          pixelRatio: 1, 
          style: { transform: 'scale(1)', transformOrigin: 'top left', margin: 0 }
      });
      
      if (!blob) throw new Error('Failed to generate image');

      const file = new File([blob], `whisper-${post.id}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Share Whisper',
          text: 'Check out this whisper!'
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whisper-${post.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Share failed:', err);
      alert('Failed to share image. Your browser might not support sharing files.');
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      
      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={32} /></button>
      </div>

      {/* Visual Scaler Wrapper */}
      <div style={{ width: '360px', height: '640px', position: 'relative', overflow: 'hidden', borderRadius: '24px' }}>
          
        {/* Actual 1080x1920 Capture Container */}
        <div 
          ref={previewRef}
          style={{
            width: '1080px',
            height: '1920px',
            background: currentStyle.background,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6rem',
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'scale(0.333333)',
            transformOrigin: 'top left',
            fontFamily: "'Inter', sans-serif"
          }}
        >
          <div style={{
            width: '100%',
            background: currentStyle.cardBg,
            border: currentStyle.border,
            boxShadow: currentStyle.boxShadow || '0 24px 96px rgba(0,0,0,0.2)',
            backdropFilter: currentStyle.backdropFilter || 'none',
            WebkitBackdropFilter: currentStyle.backdropFilter || 'none',
            borderRadius: '72px',
            padding: '6rem',
            color: currentStyle.textColor
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '36px', marginBottom: '4.5rem' }}>
              <div style={{ width: '144px', height: '144px', borderRadius: '36px', background: 'linear-gradient(135deg, #1D9BF0, #35D6E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4.5rem', fontWeight: 'bold', color: '#000' }}>
                 {(post.author_avatar || post.author_display || post.author_username || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '3.3rem' }}>{post.is_admin_post ? '👑 Admin' : (post.author_display || post.author_username || 'Anonymous')}</div>
                <div style={{ opacity: 0.6, fontSize: '2.7rem', marginTop: '1rem' }}>{formatTime(post.created_at)}</div>
              </div>
            </div>
            
            <div style={{ 
              fontSize: post.content.length > 300 ? '2.7rem' : (post.content.length > 150 ? '3.15rem' : '3.75rem'), 
              lineHeight: 1.6, 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 14,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {post.content}
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '6rem', opacity: 0.5, color: currentStyle.textColor, fontWeight: '800', letterSpacing: '3px', fontSize: '2.7rem', textAlign: 'center' }}>
            {siteName.toUpperCase()} • {window.location.host}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', width: '100%', maxWidth: '360px', justifyContent: 'center' }}>
        {Object.keys(themes).map(t => (
          <button 
            key={t}
            onClick={() => setTheme(t)}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '24px',
              border: `2px solid ${theme === t ? '#1D9BF0' : 'rgba(255,255,255,0.2)'}`,
              background: theme === t ? '#1D9BF0' : 'transparent',
              color: theme === t ? '#fff' : '#fff',
              textTransform: 'capitalize',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: '0.2s'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <button 
        className="btn-glow" 
        onClick={handleShare}
        disabled={isGenerating}
        style={{ marginTop: '1rem', width: '100%', maxWidth: '360px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '1rem', fontSize: '1.1rem', background: '#1D9BF0' }}
      >
        {isGenerating ? 'Generating...' : <><Share2 size={20}/> Share to IG Story</>}
      </button>

    </div>
  );
}
