import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

export default function EasterEggs() {
    const [showConfetti, setShowConfetti] = useState(false);
    const [confettiColors, setConfettiColors] = useState(['#FF9933', '#FFFFFF', '#138808']);

    useEffect(() => {
        const handleConfetti = (e) => {
            if (e.detail?.colors) {
                setConfettiColors(e.detail.colors);
            } else {
                setConfettiColors(['#FF9933', '#FFFFFF', '#138808']);
            }
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000);
        };
        
        window.addEventListener('trigger_confetti', handleConfetti);
        return () => window.removeEventListener('trigger_confetti', handleConfetti);
    }, []);

    if (!showConfetti) return null;

    return (
        <Confetti 
            width={window.innerWidth} 
            height={window.innerHeight} 
            colors={confettiColors}
            numberOfPieces={400}
            recycle={false}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }}
        />
    );
}
