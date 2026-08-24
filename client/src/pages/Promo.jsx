import { useState, useEffect } from 'react';
import { Heart, X, MessageCircle, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Promo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(prev => (prev < 4 ? prev + 1 : 0));
    }, 3500); // Change slide every 3.5 seconds
    return () => clearInterval(timer);
  }, []);

  const slideVariants = {
    hidden: { opacity: 0, transform: 'translateY(20px)' },
    visible: { opacity: 1, transform: 'translateY(0)' }
  };

  return (
    <div style={{ height: '100vh', width: '100%', background: '#000', color: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      
      {/* Dynamic Background Glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(255, 51, 102, 0.15) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(40px)', zIndex: 0
      }}></div>

      <div style={{ zIndex: 1, textAlign: 'center', maxWidth: '600px', width: '90%' }}>
        
        {/* Step 0: Intro */}
        {step === 0 && (
          <div className="promo-slide" style={{ animation: 'fadeInOut 3.5s ease' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', background: 'linear-gradient(90deg, #ff3366, #ff9933)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1rem' }}>
              Campus Crush
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#aaa' }}>The exclusive dating experience for our campus.</p>
          </div>
        )}

        {/* Step 1: Lightning Fast */}
        {step === 1 && (
          <div className="promo-slide" style={{ animation: 'fadeInOut 3.5s ease' }}>
            <div style={{ 
              width: '280px', height: '400px', background: '#111', borderRadius: '24px', 
              margin: '0 auto 2rem', position: 'relative', overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid #333'
            }}>
              {/* Fake Photo */}
              <div style={{ width: '100%', height: '100%', background: 'url("https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80") center/cover', opacity: 0.8 }}></div>
              <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', textAlign: 'left' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Silent Owl, 21</h2>
                <p style={{ margin: 0, color: '#ccc' }}>Computer Science</p>
              </div>
            </div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Lightning Fast.</h2>
            <p style={{ color: '#aaa' }}>Hardware-accelerated profiles load instantly.</p>
          </div>
        )}

        {/* Step 2: Swipe Right */}
        {step === 2 && (
          <div className="promo-slide" style={{ animation: 'fadeInOut 3.5s ease' }}>
            <div style={{ 
              width: '280px', height: '400px', background: '#111', borderRadius: '24px', 
              margin: '0 auto 2rem', position: 'relative', overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid #ff3366',
              animation: 'swipeRight 1s ease forwards 1s'
            }}>
              <div style={{ width: '100%', height: '100%', background: 'url("https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80") center/cover', opacity: 0.8 }}></div>
              {/* Fake Like Stamp */}
              <div style={{ position: 'absolute', top: '40px', left: '40px', border: '4px solid #ff3366', color: '#ff3366', padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '2rem', fontWeight: 'bold', transform: 'rotate(-20deg)', opacity: 0, animation: 'stampIn 0.3s forwards 0.8s' }}>
                LIKE
              </div>
            </div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Frictionless Swiping.</h2>
            <p style={{ color: '#aaa' }}>See someone you like? Just tap.</p>
          </div>
        )}

        {/* Step 3: Match & Chat */}
        {step === 3 && (
          <div className="promo-slide" style={{ animation: 'fadeInOut 3.5s ease' }}>
             <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'url("https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80") center/cover', border: '4px solid #ff3366' }}></div>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'url("https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80") center/cover', border: '4px solid #ff3366' }}></div>
             </div>
             <Shield size={48} color="#ff3366" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Secure & Anonymous.</h2>
            <p style={{ color: '#aaa' }}>Match and chat privately. No phone numbers required.</p>
          </div>
        )}

        {/* Step 4: Call to Action */}
        {step === 4 && (
          <div className="promo-slide" style={{ animation: 'fadeInOut 3.5s ease' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', background: 'linear-gradient(90deg, #ff3366, #ff9933)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1rem' }}>
              Find your crush.
            </h1>
            <Link to="/dating" className="btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem', borderRadius: '30px', display: 'inline-block', marginTop: '2rem', textDecoration: 'none' }}>
              Launch Campus Crush
            </Link>
          </div>
        )}

      </div>

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.95) translateY(20px); }
          15% { opacity: 1; transform: scale(1) translateY(0); }
          85% { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(1.05) translateY(-20px); }
        }
        @keyframes swipeRight {
          to { transform: translateX(150%) rotate(20deg); opacity: 0; }
        }
        @keyframes stampIn {
          from { opacity: 0; transform: rotate(-20deg) scale(3); }
          to { opacity: 1; transform: rotate(-20deg) scale(1); }
        }
        .promo-slide {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
        }
      `}</style>
    </div>
  );
}
