import React from 'react';
import { Heart } from 'lucide-react';

export default function Dating() {
  return (
    <div className="page-content" style={{ 
        textAlign: 'center', 
        height: '80vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
    }}>
      {/* Floating Hearts Background */}
      <div className="floating-hearts-container">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`floating-heart heart-${i + 1}`}>
            <Heart fill="var(--primary)" color="var(--primary)" />
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 10 }}>
        <div className="pulsing-heart-main">
          <Heart size={120} fill="#FF5E5B" color="#FF5E5B" />
        </div>
        
        <h2 style={{ fontSize: '2rem', marginTop: '2rem', fontWeight: 'bold', background: 'linear-gradient(90deg, #FF5E5B, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Romance is in the Air
        </h2>
        <p className="text-muted" style={{ fontSize: '1.2rem', marginTop: '0.5rem', maxWidth: '300px', margin: '1rem auto' }}>
          We're preparing something special to help you find your campus crush. 
        </p>
        <div style={{ marginTop: '2rem', display: 'inline-block', padding: '0.5rem 1.5rem', borderRadius: '30px', background: 'rgba(255, 94, 91, 0.1)', color: '#FF5E5B', fontWeight: 'bold', border: '1px solid rgba(255, 94, 91, 0.3)' }}>
          Coming Soon
        </div>
      </div>

      <style>{`
        .pulsing-heart-main {
          animation: pulseHeart 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
          filter: drop-shadow(0 0 20px rgba(255, 94, 91, 0.6));
        }

        @keyframes pulseHeart {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        .floating-hearts-container {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        .floating-heart {
          position: absolute;
          bottom: -50px;
          opacity: 0;
          animation: floatUp linear infinite;
        }

        .floating-heart svg {
          width: 24px;
          height: 24px;
          opacity: 0.5;
        }

        /* Generate random-looking paths */
        .heart-1 { left: 10%; animation-duration: 6s; animation-delay: 0s; transform: scale(0.8); }
        .heart-2 { left: 20%; animation-duration: 8s; animation-delay: 2s; transform: scale(1.2); }
        .heart-3 { left: 30%; animation-duration: 5s; animation-delay: 4s; transform: scale(0.6); }
        .heart-4 { left: 40%; animation-duration: 7s; animation-delay: 1s; transform: scale(1.5); }
        .heart-5 { left: 50%; animation-duration: 9s; animation-delay: 3s; transform: scale(0.9); }
        .heart-6 { left: 60%; animation-duration: 6s; animation-delay: 5s; transform: scale(1.1); }
        .heart-7 { left: 70%; animation-duration: 8s; animation-delay: 0.5s; transform: scale(0.7); }
        .heart-8 { left: 80%; animation-duration: 5s; animation-delay: 2.5s; transform: scale(1.3); }
        .heart-9 { left: 90%; animation-duration: 7s; animation-delay: 1.5s; transform: scale(0.8); }
        .heart-10 { left: 25%; animation-duration: 6.5s; animation-delay: 3.5s; transform: scale(1.4); }
        .heart-11 { left: 65%; animation-duration: 8.5s; animation-delay: 4.5s; transform: scale(0.6); }
        .heart-12 { left: 85%; animation-duration: 5.5s; animation-delay: 0.2s; transform: scale(1.0); }

        @keyframes floatUp {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 0.8;
          }
          80% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-80vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
