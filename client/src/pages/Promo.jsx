import React from 'react';

export default function Promo() {
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      maxWidth: '1080px', // Standard story width max
      margin: '0 auto',
      backgroundColor: '#f4f4f0',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Space Grotesk', sans-serif"
    }}>
       {/* Background Grid */}
       <div style={{ 
         position: 'absolute', 
         top: 0, left: 0, right: 0, bottom: 0, 
         backgroundImage: 'linear-gradient(#000 2px, transparent 2px), linear-gradient(90deg, #000 2px, transparent 2px)', 
         backgroundSize: '40px 40px', 
         opacity: 0.1, 
         zIndex: 0 
       }}></div>
       
       {/* Neo-brutalist shapes */}
       
       {/* Top Left Circle */}
       <div style={{
         position: 'absolute',
         top: '8%',
         left: '10%',
         width: '120px',
         height: '120px',
         backgroundColor: '#FF5E5B',
         border: '6px solid #000',
         borderRadius: '50%',
         boxShadow: '8px 8px 0 #000',
         zIndex: 1
       }}></div>

       {/* Top Right Star / Polygon */}
       <div style={{
         position: 'absolute',
         top: '15%',
         right: '5%',
         width: '140px',
         height: '140px',
         backgroundColor: '#ffcc00',
         border: '6px solid #000',
         clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
         filter: 'drop-shadow(6px 6px 0px #000)',
         zIndex: 1,
         transform: 'rotate(15deg)'
       }}></div>

       {/* Middle Abstract Block */}
       <div style={{
         position: 'absolute',
         top: '40%',
         left: '-5%',
         width: '250px',
         height: '80px',
         backgroundColor: '#35D6E7',
         border: '6px solid #000',
         transform: 'rotate(-5deg)',
         boxShadow: '10px 10px 0 #000',
         zIndex: 1
       }}></div>

       {/* Middle Right Big Block */}
       <div style={{
         position: 'absolute',
         top: '55%',
         right: '-10%',
         width: '300px',
         height: '300px',
         backgroundColor: '#fff',
         border: '8px solid #000',
         transform: 'rotate(10deg)',
         boxShadow: '16px 16px 0 #FF5E5B',
         zIndex: 1,
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)',
         opacity: 0.8
       }}></div>

       {/* Bottom Left Triangle */}
       <div style={{
         position: 'absolute',
         bottom: '20%',
         left: '15%',
         width: '0',
         height: '0',
         borderLeft: '70px solid transparent',
         borderRight: '70px solid transparent',
         borderBottom: '120px solid #2ecc71',
         filter: 'drop-shadow(8px 8px 0px #000)',
         zIndex: 1,
         transform: 'rotate(-20deg)'
       }}></div>

       {/* Bottom Right Pill */}
       <div style={{
         position: 'absolute',
         bottom: '8%',
         right: '15%',
         width: '180px',
         height: '60px',
         backgroundColor: '#ff3366',
         border: '6px solid #000',
         borderRadius: '30px',
         boxShadow: '8px 8px 0 #000',
         zIndex: 1,
         transform: 'rotate(5deg)'
       }}></div>

       {/* Decorative Lines */}
       <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
         <path d="M -50 200 Q 200 100 500 300 T 1200 150" fill="none" stroke="#000" strokeWidth="6" strokeDasharray="20 10" />
         <path d="M -50 800 Q 300 900 600 700 T 1200 850" fill="none" stroke="#000" strokeWidth="4" />
       </svg>
    </div>
  );
}
