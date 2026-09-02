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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', width: '80px' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button type="button" onClick={() => cycle(valKey, -1)} style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
          <ChevronLeft size={14}/>
        </button>
        <div style={{ width: '80px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-main)' }}>
          {valKey === 'b' ? (
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: BG_COLORS[avatarState.b || 0], margin: '0 auto', border: '2px solid white' }} />
          ) : textVal}
        </div>
        <button type="button" onClick={() => cycle(valKey, 1)} style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
          <ChevronRight size={14}/>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
      <div style={{ flex: '0 0 100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <RenderAvatar 
          state={avatarState} 
          style={{ width: '100px', height: '100px', border: '3px solid rgba(255,255,255,0.2)' }}
        />
        <button type="button" onClick={randomize} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
          <Dices size={12}/> Random
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <ControlRow label="Head" valKey="h" textVal={HEAD_TYPES[avatarState.h || 0]} />
        <ControlRow label="Skin" valKey="s" textVal={SKIN_NAMES[avatarState.s || 0]} />
        <ControlRow label="Hair" valKey="hr" textVal={getHairNames(avatarState.h || 0)[avatarState.hr || 0]} />
        <ControlRow label="Hair Color" valKey="hc" textVal={HAIR_COLOR_NAMES[avatarState.hc || 0]} />
        <ControlRow label="Eyes" valKey="e" textVal={EYE_NAMES[avatarState.e || 0]} />
        <ControlRow label="Mouth" valKey="m" textVal={MOUTH_NAMES[avatarState.m || 0]} />
        <ControlRow label="Accessory" valKey="a" textVal={ACC_NAMES[avatarState.a || 0]} />
        <ControlRow label="Background" valKey="b" textVal="" />
      </div>
    </div>
  );
}
