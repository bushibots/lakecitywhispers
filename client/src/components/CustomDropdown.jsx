import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomDropdown({ value, options, onChange, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <div className="dropdown-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span>{value || placeholder}</span>
        <ChevronDown size={16} className={`dropdown-icon ${isOpen ? 'open' : ''}`} />
      </div>

      <div className={`dropdown-menu ${isOpen ? 'show' : ''}`}>
        {options.map((option) => {
          const val = typeof option === 'string' ? option : option.value;
          const label = typeof option === 'string' ? option : option.label;
          return (
            <div 
              key={val} 
              className={`dropdown-item ${value === val ? 'selected' : ''}`}
              onClick={() => {
                onChange(val);
                setIsOpen(false);
              }}
            >
              {label}
            </div>
          );
        })}
      </div>

      <style>{`
        .custom-dropdown {
          position: relative;
          display: inline-block;
          font-family: 'Inter', sans-serif;
        }

        .dropdown-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          cursor: pointer;
          color: var(--text-main);
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s ease;
          min-width: 130px;
        }

        .dropdown-trigger:hover {
          background: rgba(29, 155, 240, 0.1);
          border-color: var(--primary);
          box-shadow: 0 0 15px rgba(29, 155, 240, 0.2);
        }

        .dropdown-icon {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--text-muted);
        }

        .dropdown-icon.open {
          transform: rotate(180deg);
          color: var(--primary);
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          background: var(--bg-elevated, #16181C);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 0.5rem;
          min-width: 100%;
          z-index: 1000;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .dropdown-menu.show {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .dropdown-item {
          padding: 0.6rem 1rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.9rem;
          color: var(--text-muted);
          transition: all 0.2s ease;
          margin-bottom: 2px;
        }

        .dropdown-item:last-child {
          margin-bottom: 0;
        }

        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-main);
          padding-left: 1.2rem;
        }

        .dropdown-item.selected {
          background: linear-gradient(90deg, rgba(29, 155, 240, 0.2) 0%, rgba(29,155,240,0) 100%);
          color: var(--primary);
          font-weight: bold;
          border-left: 3px solid var(--primary);
        }
      `}</style>
    </div>
  );
}
