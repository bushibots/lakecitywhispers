import React, { useState } from 'react';
import { Ghost, Key, ShieldCheck, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

export default function Guide() {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    if (activeFaq === index) setActiveFaq(null);
    else setActiveFaq(index);
  };

  const faqs = [
    {
      q: "Who can see my real identity?",
      a: "Absolutely no one. Your identity is fully encrypted and hidden. We don't even collect your email, phone number, or IP address."
    },
    {
      q: "What happens if I forget my password?",
      a: "Since we have no email on file, you MUST use your Recovery Key (e.g. JLU-XXXX-XXXX) provided at registration. Without it, your account is permanently lost."
    },
    {
      q: "Are the 'Admin' users really admins?",
      a: "Yes. Admin users have a verified gold badge and a crown. They manage the platform and enforce community guidelines to keep the space safe."
    },
    {
      q: "How does the 'Watchlist' work?",
      a: "Click the bookmark icon on any whisper to add it to your Watchlist. You can filter the feed to easily revisit your saved posts later."
    }
  ];

  return (
    <div className="page-content" style={{ paddingBottom: '100px', animation: 'fadeIn 0.5s ease' }}>
      
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '3rem', padding: '2rem 0' }}>
        <div className="glow-icon-container" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(29, 155, 240, 0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
          <Sparkles size={40} color="#1D9BF0" className="floating-sparkle" />
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Welcome to Whispers</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5' }}>
          Your completely anonymous, safe space to share thoughts, confessions, and campus tea.
        </p>
      </div>

      {/* Animated Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div className="guide-card animated-card" style={{ animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '10px', borderRadius: '12px' }}>
              <Ghost size={24} color="#E7E9EA" />
            </div>
            <h3 style={{ fontSize: '1.3rem', margin: 0 }}>Ghost Identities</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            When you first arrive, you are assigned a temporary alias (like "Silent Owl"). This identity lives only in your browser. 
          </p>
          <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)', borderRadius: '8px', color: '#ff3b30', fontSize: '0.9rem' }}>
            <strong>Heads Up:</strong> Ghost accounts vanish if you clear your browser data or stay inactive for 7 days.
          </div>
        </div>

        <div className="guide-card animated-card" style={{ animationDelay: '0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(29, 155, 240, 0.1)', padding: '10px', borderRadius: '12px' }}>
              <ShieldCheck size={24} color="#1D9BF0" />
            </div>
            <h3 style={{ fontSize: '1.3rem', margin: 0 }}>Registered Accounts</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Lock in your alias forever by securing your account in the Profile tab. Registration requires ZERO personal data—just a username and password.
          </p>
        </div>

        <div className="guide-card animated-card" style={{ animationDelay: '0.3s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(53, 214, 231, 0.1)', padding: '10px', borderRadius: '12px' }}>
              <Key size={24} color="#35D6E7" />
            </div>
            <h3 style={{ fontSize: '1.3rem', margin: 0 }}>Recovery Keys</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Because we don't ask for emails, we generate a unique <strong>Recovery Key</strong> for you upon registration. Store it safely—it's your only lifeline if you forget your password!
          </p>
        </div>

      </div>

      {/* FAQ Section */}
      <h2 style={{ marginTop: '3rem', marginBottom: '1.5rem', fontSize: '1.5rem' }}>Frequently Asked Questions</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {faqs.map((faq, idx) => (
          <div 
            key={idx} 
            className="faq-item" 
            onClick={() => toggleFaq(idx)}
            style={{ 
              background: 'var(--card-bg)', 
              border: '1px solid var(--border)', 
              borderRadius: '16px', 
              padding: '1.2rem', 
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{faq.q}</h4>
              <div style={{ color: 'var(--primary)', transition: 'transform 0.3s ease', transform: activeFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <ChevronDown size={20} />
              </div>
            </div>
            {activeFaq === idx && (
              <p style={{ marginTop: '1rem', color: 'var(--text-muted)', lineHeight: '1.5', animation: 'fadeIn 0.3s ease' }}>
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        
        .floating-sparkle {
          animation: float 3s ease-in-out infinite;
        }

        .animated-card {
          opacity: 0;
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 1.5rem;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }

        .animated-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }

        .faq-item:hover {
          border-color: var(--primary) !important;
          background: rgba(255,255,255,0.03) !important;
        }
      `}</style>
    </div>
  );
}
