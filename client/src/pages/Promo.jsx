import { useState, useEffect } from 'react';
import { Shield, Zap, Flame, Clock, Users, ArrowRight, X, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Promo() {
  const [step, setStep] = useState(0);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const totalSteps = 6;

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(prev => (prev < totalSteps - 1 ? prev + 1 : 0));
    }, 4500); 
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ height: '100vh', width: '100%', background: '#e0e0e0', color: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', fontFamily: "'Space Grotesk', sans-serif" }}>
      
      {/* Brutalist Background Grid */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(#000 2px, transparent 2px), linear-gradient(90deg, #000 2px, transparent 2px)', backgroundSize: '50px 50px', opacity: 0.05, zIndex: 0 }}></div>

      <button 
        onClick={() => setShowDownloadModal(true)}
        style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 20, background: '#ffcc00', border: '3px solid #000', padding: '10px 15px', fontWeight: 900, fontSize: '1rem', boxShadow: '4px 4px 0 #000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <Download size={18} /> GET STORY KITS
      </button>

      <div style={{ zIndex: 1, textAlign: 'center', maxWidth: '700px', width: '90%', position: 'relative' }}>
        
        {/* Step 0: Intro */}
        {step === 0 && (
          <div className="promo-slide">
            <div className="brutalist-badge" style={{ background: '#ff3366', color: '#fff', transform: 'rotate(-5deg)' }}>VERSION 2.0</div>
            <h1 className="brutalist-title">CAMPUS<br/>CRUSH</h1>
            <p className="brutalist-text">The exclusive dating experience for our campus. Rebuilt. Faster. Better.</p>
          </div>
        )}

        {/* Step 1: Lightning Fast */}
        {step === 1 && (
          <div className="promo-slide">
            <div className="brutalist-card swipe-animation" style={{ background: '#fff', transform: 'rotate(2deg)' }}>
              <div style={{ width: '100%', height: '250px', background: 'url("https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80") center/cover', borderBottom: '4px solid #000' }}></div>
              <div style={{ padding: '1rem', textAlign: 'left' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Silent Owl, 21</h2>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <span className="brutalist-tag" style={{ background: '#35D6E7' }}>CS</span>
                  <span className="brutalist-tag" style={{ background: '#ffcc00' }}>Block B</span>
                </div>
              </div>
            </div>
            <h2 className="brutalist-subtitle"><Zap size={32} style={{ verticalAlign: 'middle', marginRight: '10px' }}/>FRICTIONLESS SWIPING</h2>
            <p className="brutalist-text">Hardware-accelerated profiles load instantly. Just tap.</p>
          </div>
        )}

        {/* Step 2: Vibe Score */}
        {step === 2 && (
          <div className="promo-slide">
             <div className="brutalist-card vibe-animation" style={{ background: '#35D6E7', color: '#000', padding: '3rem 2rem', transform: 'rotate(-3deg)' }}>
                <h1 style={{ fontSize: '4rem', margin: 0, fontWeight: 900, textShadow: '4px 4px 0 #fff' }}>87%</h1>
                <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800 }}>VIBE MATCH</h3>
                <p style={{ marginTop: '1rem', fontWeight: 600 }}>Shared Course + Shared Block</p>
             </div>
            <h2 className="brutalist-subtitle"><Flame size={32} style={{ verticalAlign: 'middle', marginRight: '10px' }}/>VIBE SCORE</h2>
            <p className="brutalist-text">Instantly see your compatibility percentage before you even swipe.</p>
          </div>
        )}

        {/* Step 3: Secret Crush */}
        {step === 3 && (
          <div className="promo-slide">
            <div className="brutalist-card crush-animation" style={{ background: '#ff3366', color: '#fff', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                 <div className="crush-avatar"></div>
                 <div className="crush-avatar"></div>
              </div>
              <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 800, textShadow: '3px 3px 0 #000' }}>IT'S A MATCH!</h2>
            </div>
            <h2 className="brutalist-subtitle"><Shield size={32} style={{ verticalAlign: 'middle', marginRight: '10px' }}/>SECRET CRUSH</h2>
            <p className="brutalist-text">Tag up to 3 friends secretly. If they tag you back, boom! Instant match.</p>
          </div>
        )}

        {/* Step 4: 8 PM Drop & Ghost Prevention */}
        {step === 4 && (
          <div className="promo-slide">
            <div className="brutalist-card" style={{ background: '#ffcc00', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ background: '#000', color: '#0f0', padding: '1rem', border: '4px solid #fff', fontWeight: 900, fontSize: '1.5rem' }}>
                 🟢 ACTIVE TODAY
               </div>
               <div style={{ background: '#000', color: '#ff3366', padding: '1rem', border: '4px solid #fff', fontWeight: 900, fontSize: '1.5rem' }}>
                 ⏰ 8:00 PM DROP
               </div>
            </div>
            <h2 className="brutalist-subtitle"><Clock size={32} style={{ verticalAlign: 'middle', marginRight: '10px' }}/>NO MORE GHOST TOWN</h2>
            <p className="brutalist-text">Profiles show if they were active in the last 24h. Plus, everyone gets new matches at 8 PM daily.</p>
          </div>
        )}

        {/* Step 5: Call to Action */}
        {step === 5 && (
          <div className="promo-slide">
            <h1 className="brutalist-title" style={{ fontSize: '4rem', color: '#ff3366', textShadow: '6px 6px 0px #000', marginBottom: '2rem' }}>
              READY?
            </h1>
            <Link to="/dating" className="brutalist-btn">
              LAUNCH CAMPUS CRUSH <ArrowRight size={24} style={{ verticalAlign: 'middle', marginLeft: '10px' }} />
            </Link>
          </div>
        )}

      </div>

      {/* Progress indicators */}
      <div style={{ position: 'absolute', bottom: '30px', display: 'flex', gap: '10px', zIndex: 10 }}>
        {Array.from({length: totalSteps}).map((_, i) => (
          <div key={i} onClick={() => setStep(i)} style={{ 
            width: '40px', height: '12px', background: step === i ? '#ff3366' : '#000', 
            border: '2px solid #000', cursor: 'pointer', transition: 'background 0.3s' 
          }} />
        ))}
      </div>

      {showDownloadModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', border: '4px solid #000', boxShadow: '12px 12px 0 #000', width: '90%', maxWidth: '800px', padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowDownloadModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: '#ff3366', border: '3px solid #000', color: '#fff', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>
              <X size={24} style={{ margin: 'auto' }} />
            </button>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 1.5rem 0', textTransform: 'uppercase' }}>Story Kits</h2>
            <p style={{ fontWeight: 700, marginBottom: '2rem' }}>Download these high-res Neo-Brutalism backgrounds for your IG/Snap stories.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(kitNum => (
                <div key={kitNum} style={{ border: '3px solid #000', padding: '1rem', background: '#f0f0f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <img src={`/backgrounds/bg${kitNum}.png`} alt={`Promo Kit ${kitNum}`} style={{ width: '100%', height: 'auto', border: '2px solid #000', aspectRatio: '9/16', objectFit: 'cover' }} />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <a href={`/backgrounds/bg${kitNum}.png`} download={`lakecitywhispers-kit${kitNum}.png`} style={{ flex: 1, background: '#35D6E7', color: '#000', border: '2px solid #000', padding: '10px', textAlign: 'center', fontWeight: 800, textDecoration: 'none', boxShadow: '4px 4px 0 #000' }}>PNG</a>
                    <a href={`/backgrounds/bg${kitNum}.png`} download={`lakecitywhispers-kit${kitNum}.jpg`} style={{ flex: 1, background: '#ffcc00', color: '#000', border: '2px solid #000', padding: '10px', textAlign: 'center', fontWeight: 800, textDecoration: 'none', boxShadow: '4px 4px 0 #000' }}>JPG</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .promo-slide {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .brutalist-title {
          font-size: 5rem;
          font-weight: 900;
          color: #fff;
          -webkit-text-stroke: 3px #000;
          text-shadow: 8px 8px 0px #000;
          margin: 0 0 1rem 0;
          line-height: 1;
        }

        .brutalist-subtitle {
          font-size: 2rem;
          font-weight: 900;
          margin: 0 0 1rem 0;
          text-transform: uppercase;
        }

        .brutalist-text {
          font-size: 1.2rem;
          font-weight: 700;
          background: #000;
          color: #fff;
          display: inline-block;
          padding: 0.5rem 1rem;
          border: 3px solid #000;
          box-shadow: 4px 4px 0 #ff3366;
        }

        .brutalist-badge {
          display: inline-block;
          font-weight: 900;
          padding: 0.5rem 1rem;
          border: 4px solid #000;
          box-shadow: 6px 6px 0 #000;
          font-size: 1.5rem;
          margin-bottom: 2rem;
        }

        .brutalist-card {
          width: 320px;
          margin: 0 auto 2rem;
          border: 4px solid #000;
          box-shadow: 12px 12px 0 #000;
          position: relative;
          overflow: hidden;
        }

        .brutalist-tag {
          padding: 4px 8px;
          border: 2px solid #000;
          font-weight: 800;
          font-size: 0.8rem;
          box-shadow: 2px 2px 0 #000;
          color: #000;
        }

        .brutalist-btn {
          display: inline-block;
          background: #ffcc00;
          color: #000;
          font-weight: 900;
          font-size: 1.5rem;
          padding: 1rem 2rem;
          border: 4px solid #000;
          text-decoration: none;
          box-shadow: 8px 8px 0 #000;
          transition: all 0.1s ease;
          text-transform: uppercase;
        }
        
        .brutalist-btn:hover {
          transform: translate(-4px, -4px);
          box-shadow: 12px 12px 0 #000;
        }
        
        .brutalist-btn:active {
          transform: translate(4px, 4px);
          box-shadow: 4px 4px 0 #000;
        }

        .crush-avatar {
          width: 80px; height: 80px; 
          border-radius: 50%; 
          border: 4px solid #000; 
          background: #fff;
          box-shadow: 4px 4px 0 #000;
        }

        @keyframes popIn {
          0% { opacity: 0; transform: translate(-50%, -40%) scale(0.9); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }

        .swipe-animation {
          animation: swipeAnim 4s infinite ease-in-out;
        }
        @keyframes swipeAnim {
          0%, 100% { transform: rotate(2deg) translateX(0); }
          50% { transform: rotate(10deg) translateX(50px); }
        }
        
        .vibe-animation {
          animation: vibePulse 2s infinite alternate cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        @keyframes vibePulse {
          0% { transform: scale(1) rotate(-3deg); }
          100% { transform: scale(1.1) rotate(2deg); box-shadow: 16px 16px 0 #000; }
        }

        .crush-animation {
          animation: crushShake 0.5s infinite;
        }
        @keyframes crushShake {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }

        @media (max-width: 768px) {
          .brutalist-title { font-size: 3.5rem; }
          .brutalist-text { font-size: 1rem; }
          .brutalist-card { width: 280px; }
        }
      `}</style>
    </div>
  );
}
