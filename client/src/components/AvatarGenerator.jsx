import React from 'react';
import { ChevronLeft, ChevronRight, Dices } from 'lucide-react';
import RenderAvatar, {
  HEAD_TYPES, SKIN_NAMES, getHairNames, HAIR_COLOR_NAMES, EYE_NAMES, MOUTH_NAMES, ACC_NAMES, BG_COLORS
} from './RenderAvatar';

export default function AvatarGenerator({ avatarState, setAvatarState }) {
  
  const getLen = (key) => {
    if (key === 'h') return HEAD_TYPES.length;
    if (key === 's') return SKIN_NAMES.length;
    if (key === 'hr') return getHairNames(avatarState.h).length;
    if (key === 'hc') return HAIR_COLOR_NAMES.length;
    if (key === 'e') return EYE_NAMES.length;
    if (key === 'm') return MOUTH_NAMES.length;
    if (key === 'a') return ACC_NAMES.length;
    if (key === 'b') return BG_COLORS.length;
    return 1;
  };

  const cycle = (key, dir) => {
    setAvatarState(prev => {
      let val = prev[key] || 0;
      const len = getLen(key);
      val = (val + dir + len) % len;
      return { ...prev, [key]: val };
    });
  };

  const randomize = () => {
    setAvatarState({
      h: Math.floor(Math.random() * HEAD_TYPES.length),
      s: Math.floor(Math.random() * SKIN_NAMES.length),
      hr: Math.floor(Math.random() * getHairNames(0).length),
      hc: Math.floor(Math.random() * HAIR_COLOR_NAMES.length),
      e: Math.floor(Math.random() * EYE_NAMES.length),
      m: Math.floor(Math.random() * MOUTH_NAMES.length),
      a: Math.floor(Math.random() * ACC_NAMES.length),
      b: Math.floor(Math.random() * BG_COLORS.length),
    });
  };

  const ControlRow = ({ label, valKey, textVal }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', background: 'var(--bg-color)', padding: '6px 12px', borderRadius: '8px', border: '2px solid var(--border-strong)', boxShadow: '2px 2px 0px var(--border-strong)' }}>
      <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 'bold' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button type="button" onClick={() => cycle(valKey, -1)} className="btn-brutal-small">
          <ChevronLeft size={16}/>
        </button>
        <div style={{ width: '85px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
          {valKey === 'b' ? (
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: BG_COLORS[avatarState.b || 0], margin: '0 auto', border: '2px solid var(--border-strong)' }} />
          ) : textVal}
        </div>
        <button type="button" onClick={() => cycle(valKey, 1)} className="btn-brutal-small">
          <ChevronRight size={16}/>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1.5rem', 
      background: 'var(--bg-elevated)', 
      padding: '1.5rem', 
      borderRadius: '12px', 
      border: '3px solid var(--border-strong)', 
      boxShadow: '4px 4px 0px var(--border-strong)',
      marginTop: '1rem' 
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <RenderAvatar 
          state={avatarState} 
          style={{ width: '120px', height: '120px', border: '4px solid var(--border-strong)', boxShadow: '4px 4px 0px var(--border-strong)' }}
        />
        <button type="button" className="btn-glow" onClick={randomize} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px' }}>
          <Dices size={16}/> Randomize Look
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <ControlRow label="Head Shape" valKey="h" textVal={HEAD_TYPES[avatarState.h || 0]} />
        <ControlRow label="Skin Tone" valKey="s" textVal={SKIN_NAMES[avatarState.s || 0]} />
        <ControlRow label="Hair Style" valKey="hr" textVal={getHairNames(avatarState.h || 0)[avatarState.hr || 0]} />
        <ControlRow label="Hair Color" valKey="hc" textVal={HAIR_COLOR_NAMES[avatarState.hc || 0]} />
        <ControlRow label="Eyes" valKey="e" textVal={EYE_NAMES[avatarState.e || 0]} />
        <ControlRow label="Mouth" valKey="m" textVal={MOUTH_NAMES[avatarState.m || 0]} />
        <ControlRow label="Accessory" valKey="a" textVal={ACC_NAMES[avatarState.a || 0]} />
        <ControlRow label="Background" valKey="b" textVal="" />
      </div>
    </div>
  );
}
