import React, { useState, useEffect } from 'react';
import { Ghost, Key, ShieldCheck, Sparkles, ChevronLeft, ChevronRight, MessageSquare, Flame, Coffee } from 'lucide-react';
import JSConfetti from 'js-confetti';

export default function Guide() {
  const [activeCard, setActiveCard] = useState(0);
  const [revealedFaq, setRevealedFaq] = useState(null);
  const [isShaking, setIsShaking] = useState(false);

  // Fallback if js-confetti is not loaded
  const fireConfetti = () => {
    try {
      const jsConfetti = new JSConfetti();
      jsConfetti.addConfetti({ emojis: ['🍵', '☕', '🔥', '✨'] });
    } catch (e) {
      // ignore if not installed
    }
  };

  const storyCards = [
    {
      title: "Ghost Identities",
      icon: <Ghost size={48} color="#000" />,
      color: "#ffcc00", // brutalist yellow
      text: "When you first arrive, you are assigned a temporary alias (like 'Silent Owl'). This identity lives only in your browser.",
      warning: "Ghost accounts vanish if you clear your browser data or stay inactive for 7 days."
    },
    {
      title: "Registered Accounts",
      icon: <ShieldCheck size={48} color="#fff" />,
      color: "#FF5E5B", // brutalist red
      text: "Lock in your alias forever by securing your account in the Profile tab. Registration requires ZERO personal data—just a username and password.",
      warning: null
    },
    {
      title: "Recovery Keys",
      icon: <Key size={48} color="#000" />,
      color: "#35D6E7", // brutalist cyan
      text: "Because we don't ask for emails, we generate a unique Recovery Key for you upon registration.",
      warning: "Store it safely—it's your only lifeline if you forget your password!"
    },
    {
      title: "Avatar & Dating",
      icon: <Flame size={48} color="#000" />,
      color: "#ff8c00", // brutalist orange
      text: "Create a custom Neo-Brutalist Avatar! If you don't upload photos to your Dating profile, we'll blast your Avatar onto the swipe card instead.",
      warning: null
    }
  ];

  const faqs = [
    { q: "Who can see my real identity?", a: "Absolutely no one. Your identity is fully encrypted and hidden. We don't even collect your email, phone number, or IP address." },
    { q: "What happens if I forget my password?", a: "Since we have no email on file, you MUST use your Recovery Key (e.g. JLU-XXXX-XXXX) provided at registration. Without it, your account is permanently lost." },
    { q: "Are the 'Admin' users really admins?", a: "Yes. Admin users have a verified gold badge and a crown. They manage the platform and enforce community guidelines to keep the space safe." },
    { q: "How does the 'Watchlist' work?", a: "Click the bookmark icon on any whisper to add it to your Watchlist. You can filter the feed to easily revisit your saved posts later." },
    { q: "Can I delete my account?", a: "Yes, you can nuke your account from the Settings menu. Everything goes poof." }
  ];

  const nextCard = () => {
    if (activeCard < storyCards.length - 1) setActiveCard(prev => prev + 1);
  };
  const prevCard = () => {
    if (activeCard > 0) setActiveCard(prev => prev - 1);
  };

  const spillTheTea = () => {
    if (isShaking) return;
    setIsShaking(true);
    
    // Pick a random FAQ that is different from current
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * faqs.length);
    } while (revealedFaq && faqs[nextIdx].q === revealedFaq.q && faqs.length > 1);
    
    setTimeout(() => {
      setRevealedFaq(faqs[nextIdx]);
      setIsShaking(false);
      fireConfetti();
    }, 600);
  };

  return (
    <div className="page-content" style={{ paddingBottom: '100px', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Hero Section */}
      <div style={{ textAlign: 'center', paddingTop: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-1px', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: '5px' }}>
          JLU Whisper Guide
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '1rem', fontWeight: 'bold' }}>
          Swipe to survive the campus jungle.
        </p>
      </div>

      {/* Tappable Story Cards */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5', perspective: '1000px', margin: '0 auto' }}>
        {storyCards.map((card, idx) => {
          const isActive = idx === activeCard;
          const isPast = idx < activeCard;
          const isNext = idx > activeCard;
          
          let transform = 'translateZ(0px) translateX(0px)';
          let opacity = 1;
          let zIndex = storyCards.length - idx;

          if (isPast) {
            transform = 'translateZ(-100px) translateX(-120%) rotate(-10deg)';
            opacity = 0;
          } else if (isNext) {
            transform = `translateZ(-${(idx - activeCard) * 50}px) translateX(${(idx - activeCard) * 20}px) rotate(${(idx - activeCard) * 3}deg)`;
            opacity = 1 - (idx - activeCard) * 0.2;
          }

          return (
            <div 
              key={idx}
              className="story-card"
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                background: card.color,
                border: '6px solid var(--text-main)',
                borderRadius: '24px',
                boxShadow: isActive ? '12px 12px 0px var(--text-main)' : 'none',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: (card.color === '#FF5E5B' || card.color === '#1a1a2e') ? '#fff' : '#000',
                transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
                transform,
                opacity,
                zIndex,
                pointerEvents: isActive ? 'auto' : 'none',
                cursor: isActive ? 'pointer' : 'default',
                userSelect: 'none'
              }}
            >
              <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: '50%', border: '4px solid currentColor', display: 'inline-flex' }}>
                {card.icon}
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '1rem', textTransform: 'uppercase' }}>{card.title}</h2>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold', lineHeight: '1.5', marginBottom: '1.5rem' }}>{card.text}</p>
              
              {card.warning && (
                <div style={{ background: '#000', color: '#fff', padding: '1rem', borderRadius: '12px', border: '3px solid currentColor', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  ⚠️ {card.warning}
                </div>
              )}

              {/* Tap Targets */}
              {isActive && (
                <>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', zIndex: 10 }} onClick={(e) => { e.stopPropagation(); prevCard(); }} />
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', zIndex: 10 }} onClick={(e) => { e.stopPropagation(); nextCard(); }} />
                </>
              )}
            </div>
          );
        })}
        
        {/* Story Progress Indicators */}
        <div style={{ position: 'absolute', top: '-25px', left: 0, right: 0, display: 'flex', gap: '8px', zIndex: 100 }}>
          {storyCards.map((_, idx) => (
            <div key={idx} style={{ flex: 1, height: '6px', background: idx <= activeCard ? 'var(--text-main)' : 'rgba(255,255,255,0.2)', borderRadius: '3px', transition: 'background 0.3s ease' }} />
          ))}
        </div>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Tap left/right on cards to navigate</p>

      {/* Gacha FAQ Machine */}
      <div style={{ marginTop: '2rem', border: '6px solid var(--text-main)', borderRadius: '24px', background: 'var(--bg-elevated)', padding: '2rem', boxShadow: '8px 8px 0px var(--text-main)', textAlign: 'center', overflow: 'hidden', position: 'relative' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '1rem' }}>Confused?</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontWeight: 'bold' }}>Hit the button below to randomly dispense some FAQ tea.</p>
        
        <button 
          onClick={spillTheTea}
          className={isShaking ? 'gacha-shake' : ''}
          style={{ 
            background: 'linear-gradient(135deg, #FF5E5B, #FF2A55)', 
            color: '#fff', 
            border: '4px solid var(--text-main)', 
            borderRadius: '50px', 
            padding: '1rem 2.5rem', 
            fontSize: '1.2rem', 
            fontWeight: '900', 
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '4px 4px 0px var(--text-main)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'transform 0.1s ease',
            transform: isShaking ? 'scale(0.95)' : 'scale(1)'
          }}
        >
          <Coffee size={24} /> Spill The Tea!
        </button>

        {revealedFaq && (
          <div className="faq-reveal" style={{ marginTop: '2rem', textAlign: 'left', background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '16px', border: '3px dashed var(--border-strong)', animation: 'slideUpBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-main)' }}>Q: {revealedFaq.q}</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: '1.6', fontWeight: '600' }}>A: {revealedFaq.a}</p>
          </div>
        )}
      </div>

      <style>{`
        .gacha-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        
        @keyframes shake {
          10%, 90% { transform: translate3d(-2px, 0, 0) scale(0.95); }
          20%, 80% { transform: translate3d(4px, 0, 0) scale(0.95); }
          30%, 50%, 70% { transform: translate3d(-8px, 0, 0) scale(0.95); }
          40%, 60% { transform: translate3d(8px, 0, 0) scale(0.95); }
        }

        @keyframes slideUpBounce {
          0% { opacity: 0; transform: translateY(40px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
