import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Heart, MapPin, Flag, Zap } from 'lucide-react';

export default function NewFeatures() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      id: 'vibe',
      title: "VIBE MATCH SCORING",
      icon: <Flame size={40} color="#000" />,
      color: "#ffcc00",
      description: "We do the math. See your exact compatibility percentage based on shared traits before you even swipe."
    },
    {
      id: 'flags',
      title: "DEALBREAKERS UP FRONT",
      icon: <Flag size={40} color="#000" />,
      color: "#ff3366",
      description: "No more wasting time. See their habits, quirks, and absolute red flags instantly."
    },
    {
      id: 'love',
      title: "LOVE LANGUAGES",
      icon: <Heart size={40} color="#000" />,
      color: "#35D6E7",
      description: "Connect on a deeper, intimate level. Find out if they prefer 'Quality Time' or 'Physical Touch'."
    },
    {
      id: 'spot',
      title: "LIVE CAMPUS SPOTS",
      icon: <MapPin size={40} color="#000" />,
      color: "#2ecc71",
      description: "Want to meet up right now? Drop your current location to spark spontaneous IRL meetups."
    },
    {
      id: 'design',
      title: "NEO-BRUTALIST PROFILES",
      icon: <Zap size={40} color="#000" />,
      color: "#9b59b6",
      description: "A gorgeous, high-contrast, ultra-modern design that puts personality first."
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f4f0',
      color: '#000',
      fontFamily: '"Space Grotesk", sans-serif',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Background Grid Pattern */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'linear-gradient(#000 2px, transparent 2px), linear-gradient(90deg, #000 2px, transparent 2px)',
        backgroundSize: '40px 40px',
        opacity: 0.05,
        zIndex: 0,
        pointerEvents: 'none'
      }}></div>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem 1rem 8rem 1rem',
        position: 'relative',
        zIndex: 1
      }}>
        
        {/* Header Section */}
        <header style={{
          textAlign: 'center',
          marginBottom: '4rem',
          animation: 'slideDown 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
        }}>
          <div style={{
            display: 'inline-block',
            background: '#ff3366',
            color: '#fff',
            padding: '0.5rem 1rem',
            border: '4px solid #000',
            boxShadow: '6px 6px 0 #000',
            fontWeight: 900,
            fontSize: '1.2rem',
            marginBottom: '1rem',
            transform: 'rotate(-2deg)'
          }}>
            MASSIVE UPDATE
          </div>
          <h1 style={{
            fontSize: 'clamp(3rem, 8vw, 5rem)',
            fontWeight: 900,
            textTransform: 'uppercase',
            lineHeight: 1,
            margin: '0 0 1.5rem 0',
            color: '#fff',
            WebkitTextStroke: '3px #000',
            textShadow: '6px 6px 0 #000'
          }}>
            DATING JUST GOT BETTER
          </h1>
          <p style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            background: '#000',
            color: '#fff',
            display: 'inline-block',
            padding: '1rem',
            border: '3px solid #000',
            boxShadow: '4px 4px 0 #ffcc00'
          }}>
            Skip the small talk. Match on vibes.
          </p>
        </header>

        {/* Features List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {features.map((feat, index) => {
            // Calculate a slight parallax/reveal effect
            const offset = Math.max(0, 100 - scrollY * 0.2);
            return (
              <div 
                key={feat.id}
                className="feature-card"
                style={{
                  background: '#fff',
                  border: '4px solid #000',
                  boxShadow: `12px 12px 0 ${feat.color}`,
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative',
                  transform: `translateY(${Math.min(offset, 50)}px)`,
                  opacity: 1,
                  animation: `popIn 0.5s ease forwards ${index * 0.15}s`
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '-20px',
                  background: feat.color,
                  border: '4px solid #000',
                  borderRadius: '50%',
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '4px 4px 0 #000'
                }}>
                  {feat.icon}
                </div>
                
                <h2 style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  margin: '1rem 0 0 0',
                  textTransform: 'uppercase',
                  borderBottom: '4px solid #000',
                  paddingBottom: '0.5rem',
                  display: 'inline-block'
                }}>
                  {feat.title}
                </h2>
                
                <p style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  margin: 0,
                  lineHeight: 1.5
                }}>
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>

      {/* Sticky CTA Bottom Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#000',
        padding: '1rem',
        borderTop: '4px solid #fff',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Link 
          to="/dating" 
          className="cta-btn"
          style={{
            background: '#ffcc00',
            color: '#000',
            fontSize: '1.5rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            textDecoration: 'none',
            padding: '1rem 2rem',
            border: '4px solid #fff',
            boxShadow: '0 -4px 0 #ff3366',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.1s ease',
            width: '100%',
            maxWidth: '400px',
            justifyContent: 'center'
          }}
        >
          DIVE INTO NEW FEATURE <ArrowRight size={28} />
        </Link>
      </div>

      <style>{`
        @keyframes slideDown {
          0% { transform: translateY(-50px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        @keyframes popIn {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .cta-btn:active {
          transform: translateY(4px) !important;
          box-shadow: 0 0 0 #ff3366 !important;
        }

        @media (hover: hover) {
          .feature-card {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .feature-card:hover {
            transform: translate(-4px, -4px) !important;
            box-shadow: 16px 16px 0 #000 !important;
          }
          .cta-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 -8px 0 #ff3366 !important;
          }
        }
      `}</style>
    </div>
  );
}
