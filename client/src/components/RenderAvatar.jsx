import React from 'react';

// Constants
export const HEAD_TYPES = ['Rounded', 'Angular', 'Square'];
export const SKIN_COLORS = ['#FDDBB4','#F1C27D','#E0A370','#C68642','#8D5524','#5C3317'];
export const SKIN_NAMES = ['1','2','3','4','5','6'];
export const HAIR_COLOR_NAMES = ['Black','Brown','Blonde','Red','Gray','Blue','Pink'];
export const HAIR_COLORS = ['#1a1a2e','#6B4226','#E8D44D','#C0392B','#95A5A6','#3498DB','#FF69B4'];
export const EYE_NAMES = ['Round','Narrow','Almond','Happy','Wink','Lashes','Doe','Cool'];
export const MOUTH_NAMES = ['Smile','Grin','Open','Neutral','Smirk','Lipstick'];
export const ACC_NAMES = ['None','Round Glasses','Square Glasses','Sunglasses','Headband','Earrings','Hair Bow'];
export const BG_COLORS = ['#eca2ce','#d4a6ff','#8db2ff','#cfe773','#ffeb7f','#ffa376'];

export const HAIR_NAMES_A = ['Buzz','Crew Cut','Bob','Pixie','Side Part','Long Straight','Long Wavy','Long Curly','Braids','Ponytail','Space Buns','Mohawk','Bald'];
export const HAIR_NAMES_B = ['Buzz','Crew Cut','Bob','Pixie','Side Part','Long Straight','Long Wavy','Long Curly','Braids','Ponytail','Space Buns','Mohawk','Bald'];

export function getHairNames(head) {
  if (head === 0) return HAIR_NAMES_A;
  if (head === 1) return HAIR_NAMES_B;
  return HAIR_NAMES_A; // fallback for Square
}

// SVG Drawing Helpers
function drawHead(type, sc) {
  if (type === 0) { // Rounded
    return `<ellipse cx="100" cy="112" rx="58" ry="60" fill="${sc}"/><ellipse cx="42" cy="110" rx="10" ry="14" fill="${sc}"/><ellipse cx="158" cy="110" rx="10" ry="14" fill="${sc}"/>`;
  } else if (type === 1) { // Angular
    return `<path d="M52 80 Q52 52 75 48 L125 48 Q148 52 148 80 L148 120 Q148 155 125 165 L100 172 L75 165 Q52 155 52 120 Z" fill="${sc}"/><rect x="42" y="98" width="12" height="22" rx="6" fill="${sc}"/><rect x="146" y="98" width="12" height="22" rx="6" fill="${sc}"/>`;
  } else { // Square
    return `<rect x="45" y="60" width="110" height="100" rx="15" fill="${sc}"/><rect x="35" y="100" width="10" height="20" rx="4" fill="${sc}"/><rect x="155" y="100" width="10" height="20" rx="4" fill="${sc}"/>`;
  }
}

function drawEyes(i) {
  const brows = `<line x1="68" y1="92" x2="88" y2="90" stroke="#1a1a2e" stroke-width="2.5" stroke-linecap="round"/><line x1="112" y1="90" x2="132" y2="92" stroke="#1a1a2e" stroke-width="2.5" stroke-linecap="round"/>`;
  const pairs = [
    `<circle cx="78" cy="105" r="7" fill="white"/><circle cx="78" cy="105" r="4" fill="#1a1a2e"/><circle cx="122" cy="105" r="7" fill="white"/><circle cx="122" cy="105" r="4" fill="#1a1a2e"/>`,
    `<ellipse cx="78" cy="105" rx="8" ry="4" fill="white"/><circle cx="78" cy="105" r="3" fill="#1a1a2e"/><ellipse cx="122" cy="105" rx="8" ry="4" fill="white"/><circle cx="122" cy="105" r="3" fill="#1a1a2e"/>`,
    `<path d="M70 105 Q78 96 86 105 Q78 110 70 105Z" fill="white"/><circle cx="78" cy="104" r="3.5" fill="#1a1a2e"/><path d="M114 105 Q122 96 130 105 Q122 110 114 105Z" fill="white"/><circle cx="122" cy="104" r="3.5" fill="#1a1a2e"/>`,
    `<path d="M71 105 Q78 98 85 105" stroke="#1a1a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M115 105 Q122 98 129 105" stroke="#1a1a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    `<circle cx="78" cy="105" r="7" fill="white"/><circle cx="78" cy="105" r="4" fill="#1a1a2e"/><path d="M115 105 Q122 99 129 105" stroke="#1a1a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    `<circle cx="78" cy="105" r="7" fill="white"/><circle cx="78" cy="105" r="4" fill="#1a1a2e"/><circle cx="122" cy="105" r="7" fill="white"/><circle cx="122" cy="105" r="4" fill="#1a1a2e"/><line x1="72" y1="99" x2="69" y2="94" stroke="#1a1a2e" stroke-width="1.5" stroke-linecap="round"/><line x1="78" y1="98" x2="78" y2="93" stroke="#1a1a2e" stroke-width="1.5" stroke-linecap="round"/><line x1="84" y1="99" x2="87" y2="94" stroke="#1a1a2e" stroke-width="1.5" stroke-linecap="round"/><line x1="116" y1="99" x2="113" y2="94" stroke="#1a1a2e" stroke-width="1.5" stroke-linecap="round"/><line x1="122" y1="98" x2="122" y2="93" stroke="#1a1a2e" stroke-width="1.5" stroke-linecap="round"/><line x1="128" y1="99" x2="131" y2="94" stroke="#1a1a2e" stroke-width="1.5" stroke-linecap="round"/>`,
    `<circle cx="78" cy="105" r="9" fill="white"/><circle cx="80" cy="105" r="5" fill="#1a1a2e"/><circle cx="82" cy="102" r="1.5" fill="white"/><circle cx="122" cy="105" r="9" fill="white"/><circle cx="124" cy="105" r="5" fill="#1a1a2e"/><circle cx="126" cy="102" r="1.5" fill="white"/>`,
    `<circle cx="78" cy="105" r="3" fill="#1a1a2e"/><circle cx="122" cy="105" r="3" fill="#1a1a2e"/>`
  ];
  return brows + (pairs[i] || pairs[0]);
}

function drawMouth(i) {
  const m = [
    `<path d="M85 132 Q100 146 115 132" stroke="#1a1a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    `<path d="M82 130 Q100 150 118 130" fill="white" stroke="#1a1a2e" stroke-width="2"/>`,
    `<ellipse cx="100" cy="135" rx="10" ry="8" fill="#1a1a2e"/><ellipse cx="100" cy="133" rx="8" ry="4" fill="white"/>`,
    `<line x1="87" y1="134" x2="113" y2="134" stroke="#1a1a2e" stroke-width="2.5" stroke-linecap="round"/>`,
    `<path d="M85 132 Q100 140 115 128" stroke="#1a1a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    `<path d="M84 130 Q100 144 116 130" fill="#e74c3c" stroke="#c0392b" stroke-width="1.5"/>`
  ];
  return m[i] || m[0];
}

function drawHairA(i, c) {
  const h = [
    `<path d="M58 92 Q56 60 100 48 Q144 60 142 92 L142 85 Q140 62 100 52 Q60 62 58 85 Z" fill="${c}" opacity="0.65"/>`,
    `<path d="M52 90 Q50 55 100 48 Q150 55 148 90 L145 82 Q140 62 100 54 Q60 62 55 82 Z" fill="${c}"/>`,
    `<path d="M48 85 Q46 52 100 44 Q154 52 152 85 L155 130 Q150 140 140 138 L140 90 Q138 62 100 54 Q62 62 60 90 L60 138 Q50 140 45 130 Z" fill="${c}"/>`,
    `<path d="M56 90 Q54 56 100 46 Q146 56 144 90 L140 78 Q135 62 100 54 Q70 62 65 78 Z" fill="${c}"/><path d="M55 80 Q40 65 38 55 Q50 60 60 70 Z" fill="${c}"/>`,
    `<path d="M50 88 Q48 52 100 44 Q152 52 150 88" fill="${c}"/><path d="M48 88 Q45 105 48 120 Q52 108 54 88 Z" fill="${c}"/><path d="M85 40 L88 42" stroke="${c}" stroke-width="2"/>`,
    `<path d="M50 88 Q48 52 100 44 Q152 52 150 88" fill="${c}"/><path d="M50 88 Q46 100 44 140 Q48 160 56 175 Q58 160 56 88 Z" fill="${c}"/><path d="M150 88 Q154 100 156 140 Q152 160 144 175 Q142 160 144 88 Z" fill="${c}"/>`,
    `<path d="M50 88 Q48 52 100 44 Q152 52 150 88" fill="${c}"/><path d="M50 88 Q46 110 48 135 Q54 150 48 175 Q54 160 58 135 Q62 110 56 88 Z" fill="${c}"/><path d="M150 88 Q154 110 152 135 Q146 150 152 175 Q146 160 142 135 Q138 110 144 88 Z" fill="${c}"/>`,
    `<circle cx="60" cy="68" r="16" fill="${c}"/><circle cx="85" cy="55" r="16" fill="${c}"/><circle cx="115" cy="55" r="16" fill="${c}"/><circle cx="140" cy="68" r="16" fill="${c}"/><circle cx="44" cy="85" r="15" fill="${c}"/><circle cx="156" cy="85" r="15" fill="${c}"/><circle cx="44" cy="112" r="13" fill="${c}"/><circle cx="156" cy="112" r="13" fill="${c}"/><circle cx="46" cy="138" r="12" fill="${c}"/><circle cx="154" cy="138" r="12" fill="${c}"/>`,
    `<path d="M50 88 Q48 52 100 44 Q152 52 150 88" fill="${c}"/><path d="M50 82 Q48 120 50 150 Q52 160 56 150 Q58 120 56 82 Z" fill="${c}"/><circle cx="53" cy="158" r="5" fill="${c}"/><path d="M150 82 Q152 120 150 150 Q148 160 144 150 Q142 120 144 82 Z" fill="${c}"/><circle cx="147" cy="158" r="5" fill="${c}"/>`,
    `<path d="M50 88 Q48 52 100 44 Q152 52 150 88" fill="${c}"/><ellipse cx="100" cy="38" rx="10" ry="8" fill="${c}"/><path d="M100 38 Q108 20 103 5 Q100 13 97 5 Q92 20 100 38" fill="${c}"/>`,
    `<path d="M50 88 Q48 52 100 44 Q152 52 150 88" fill="${c}"/><circle cx="58" cy="65" r="18" fill="${c}"/><circle cx="142" cy="65" r="18" fill="${c}"/>`,
    `<path d="M88 52 Q92 10 100 5 Q108 10 112 52" fill="${c}"/><path d="M90 60 Q95 30 100 25 Q105 30 110 60" fill="${c}"/>`,
    ``
  ];
  return h[i] || h[0];
}

function drawHairB(i, c) {
  const h = [
    `<path d="M56 80 Q56 52 100 42 Q144 52 144 80 L142 74 Q140 58 100 48 Q60 58 58 74 Z" fill="${c}" opacity="0.65"/>`,
    `<path d="M52 80 Q52 48 100 38 Q148 48 148 80 L145 72 Q142 56 100 46 Q58 56 55 72 Z" fill="${c}"/>`,
    `<path d="M48 76 Q48 44 100 34 Q152 44 152 76 L152 125 Q148 135 138 132 L138 82 Q136 56 100 46 Q64 56 62 82 L62 132 Q52 135 48 125 Z" fill="${c}"/>`,
    `<path d="M55 78 Q55 46 100 37 Q145 46 145 78 L142 70 Q138 54 100 46 Q68 54 62 70 Z" fill="${c}"/><path d="M55 72 Q40 58 36 48 Q50 52 60 64 Z" fill="${c}"/>`,
    `<path d="M50 78 Q50 44 100 34 Q150 44 150 78" fill="${c}"/><path d="M50 78 Q47 98 50 115 Q54 100 54 78 Z" fill="${c}"/>`,
    `<path d="M50 78 Q50 44 100 34 Q150 44 150 78" fill="${c}"/><path d="M50 78 Q46 90 44 130 Q48 150 56 172 Q56 150 56 78 Z" fill="${c}"/><path d="M150 78 Q154 90 156 130 Q152 150 144 172 Q144 150 144 78 Z" fill="${c}"/>`,
    `<path d="M50 78 Q50 44 100 34 Q150 44 150 78" fill="${c}"/><path d="M50 78 Q46 100 48 130 Q54 145 48 172 Q54 150 60 130 Q64 100 56 78 Z" fill="${c}"/><path d="M150 78 Q154 100 152 130 Q146 145 152 172 Q146 150 140 130 Q136 100 144 78 Z" fill="${c}"/>`,
    `<circle cx="62" cy="60" r="16" fill="${c}"/><circle cx="85" cy="48" r="16" fill="${c}"/><circle cx="115" cy="48" r="16" fill="${c}"/><circle cx="138" cy="60" r="16" fill="${c}"/><circle cx="44" cy="75" r="15" fill="${c}"/><circle cx="156" cy="75" r="15" fill="${c}"/><circle cx="44" cy="102" r="13" fill="${c}"/><circle cx="156" cy="102" r="13" fill="${c}"/><circle cx="46" cy="128" r="12" fill="${c}"/><circle cx="154" cy="128" r="12" fill="${c}"/>`,
    `<path d="M50 78 Q50 44 100 34 Q150 44 150 78" fill="${c}"/><path d="M50 72 Q48 112 50 145 Q52 155 56 145 Q58 112 56 72 Z" fill="${c}"/><circle cx="53" cy="152" r="5" fill="${c}"/><path d="M150 72 Q152 112 150 145 Q148 155 144 145 Q142 112 144 72 Z" fill="${c}"/><circle cx="147" cy="152" r="5" fill="${c}"/>`,
    `<path d="M50 78 Q50 44 100 34 Q150 44 150 78" fill="${c}"/><ellipse cx="100" cy="32" rx="10" ry="8" fill="${c}"/><path d="M100 32 Q108 14 103 2 Q100 10 97 2 Q92 14 100 32" fill="${c}"/>`,
    `<path d="M50 78 Q50 44 100 34 Q150 44 150 78" fill="${c}"/><circle cx="58" cy="56" r="18" fill="${c}"/><circle cx="142" cy="56" r="18" fill="${c}"/>`,
    `<path d="M88 48 Q92 8 100 2 Q108 8 112 48" fill="${c}"/><path d="M90 55 Q95 25 100 20 Q105 25 110 55" fill="${c}"/>`,
    ``
  ];
  return h[i] || h[0];
}

function drawAcc(i, headType) {
  const acc = [
    '',
    `<circle cx="78" cy="105" r="14" fill="none" stroke="#1a1a2e" stroke-width="2.5"/><circle cx="122" cy="105" r="14" fill="none" stroke="#1a1a2e" stroke-width="2.5"/><line x1="92" y1="105" x2="108" y2="105" stroke="#1a1a2e" stroke-width="2"/><line x1="64" y1="103" x2="50" y2="100" stroke="#1a1a2e" stroke-width="2"/><line x1="136" y1="103" x2="150" y2="100" stroke="#1a1a2e" stroke-width="2"/>`,
    `<rect x="64" y="95" width="28" height="20" rx="3" fill="none" stroke="#1a1a2e" stroke-width="2.5"/><rect x="108" y="95" width="28" height="20" rx="3" fill="none" stroke="#1a1a2e" stroke-width="2.5"/><line x1="92" y1="105" x2="108" y2="105" stroke="#1a1a2e" stroke-width="2"/><line x1="64" y1="103" x2="50" y2="100" stroke="#1a1a2e" stroke-width="2"/><line x1="136" y1="103" x2="150" y2="100" stroke="#1a1a2e" stroke-width="2"/>`,
    `<path d="M62 98 Q78 92 92 98 L92 112 Q78 118 62 112 Z" fill="#1a1a2e"/><path d="M108 98 Q122 92 138 98 L138 112 Q122 118 108 112 Z" fill="#1a1a2e"/><line x1="92" y1="105" x2="108" y2="105" stroke="#1a1a2e" stroke-width="2.5"/><line x1="62" y1="103" x2="48" y2="100" stroke="#1a1a2e" stroke-width="2.5"/><line x1="138" y1="103" x2="152" y2="100" stroke="#1a1a2e" stroke-width="2.5"/>`,
    `<path d="M48 82 Q100 68 152 82" stroke="#e74c3c" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    headType === 0 ? 
      `<circle cx="42" cy="128" r="4" fill="#FFD700" stroke="#DAA520" stroke-width="1"/><circle cx="158" cy="128" r="4" fill="#FFD700" stroke="#DAA520" stroke-width="1"/><line x1="42" y1="120" x2="42" y2="124" stroke="#DAA520" stroke-width="1.5"/><line x1="158" y1="120" x2="158" y2="124" stroke="#DAA520" stroke-width="1.5"/>` :
      `<circle cx="45" cy="118" r="4" fill="#FFD700" stroke="#DAA520" stroke-width="1"/><circle cx="155" cy="118" r="4" fill="#FFD700" stroke="#DAA520" stroke-width="1"/><line x1="45" y1="110" x2="45" y2="114" stroke="#DAA520" stroke-width="1.5"/><line x1="155" y1="110" x2="155" y2="114" stroke="#DAA520" stroke-width="1.5"/>`,
    `<path d="M100 42 Q88 32 82 40 Q88 46 100 42Z" fill="#e74c3c"/><path d="M100 42 Q112 32 118 40 Q112 46 100 42Z" fill="#e74c3c"/><circle cx="100" cy="42" r="3" fill="#c0392b"/>`
  ];
  return acc[i] || acc[0];
}

// Render component
export default function RenderAvatar({ state, style = {}, className = "" }) {
  if (!state) return null;
  
  const h = state.h || 0;
  const s = state.s || 0;
  const hr = state.hr || 0;
  const hc = state.hc || 0;
  const e = state.e || 0;
  const m = state.m || 0;
  const a = state.a || 0;
  const b = state.b || 0;

  const sc = SKIN_COLORS[s] || SKIN_COLORS[0];
  const hairC = HAIR_COLORS[hc] || HAIR_COLORS[0];
  const bgC = BG_COLORS[b] || BG_COLORS[0];

  const svgInner = 
    drawHead(h, sc) +
    drawEyes(e) +
    drawMouth(m) +
    (h === 0 || h === 2 ? drawHairA(hr, hairC) : drawHairB(hr, hairC)) +
    drawAcc(a, h);

  return (
    <div 
      className={`rounded-full overflow-hidden flex items-center justify-center ${className}`} 
      style={{ background: bgC, ...style }}
    >
      <svg 
        viewBox="0 0 200 200" 
        width="100%" 
        height="100%" 
        preserveAspectRatio="xMidYMid meet"
        dangerouslySetInnerHTML={{ __html: svgInner }}
      />
    </div>
  );
}

// Helper to render Avatar cleanly handling JSON string
export function Avatar({ avatarString, fallbackChar, style, className }) {
  if (avatarString && avatarString.startsWith('{')) {
    try {
      const state = JSON.parse(avatarString);
      return <RenderAvatar state={state} style={style} className={className} />;
    } catch (e) {
      // ignore
    }
  }
  
  if (avatarString && avatarString.startsWith('http')) {
    return (
      <div className={`avatar-flame ${className || ''}`} style={{ padding: 0, overflow: 'hidden', ...style }}>
        <img src={avatarString} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  
  return (
    <div className={`avatar-flame ${className || ''}`} style={style}>
      {fallbackChar || avatarString || '?'}
    </div>
  );
}
