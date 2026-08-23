import React, { useState } from 'react';
import { X, Filter } from 'lucide-react';
import { CAMPUS_STRUCTURE } from '../campus_structure';

export default function DatingFilterModal({ isOpen, onClose, onApply, currentBlock, currentCourse }) {
  const [block, setBlock] = useState(currentBlock || '');
  const [course, setCourse] = useState(currentCourse || '');

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="feed-card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-card)', borderRadius: '24px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Filter size={20} /> Match Filters
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Filter by Block</label>
            <select 
              className="composer-textarea border-input"
              style={{ width: '100%', padding: '0.8rem', backgroundColor: 'var(--bg-input)' }}
              value={block}
              onChange={(e) => { setBlock(e.target.value); setCourse(''); }}
            >
              <option value="">Any Block</option>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
              <option value="C">Block C</option>
              <option value="D">Block D</option>
              <option value="E">Block E</option>
            </select>
        </div>

        <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Filter by Course</label>
            <select 
              className="composer-textarea border-input"
              style={{ width: '100%', padding: '0.8rem', backgroundColor: 'var(--bg-input)' }}
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              disabled={!block}
            >
              <option value="">Any Course</option>
              {block && (CAMPUS_STRUCTURE[`Block ${block}`] || []).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '1rem', borderRadius: '30px' }}
                onClick={() => { setBlock(''); setCourse(''); onApply('', ''); }}
            >
                Clear
            </button>
            <button 
                className="btn-glow" 
                style={{ flex: 1, padding: '1rem', borderRadius: '30px' }}
                onClick={() => onApply(block, course)}
            >
                Apply
            </button>
        </div>

      </div>
    </div>
  );
}
