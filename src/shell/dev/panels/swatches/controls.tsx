/**
 * Form control specimens — buttons, toggles, checkboxes, radios,
 * inputs, selects, sliders. Each glows from within.
 *
 * @module shell/dev/swatches
 * @layer L6
 */

import React, { useState } from 'react';

import { palette } from '../../../theme/theme-vars';

import { SPRING } from './constants';
import { hexToRgb, useRipple } from './hooks';
import { GroupLabel } from './primitives';

// ═══════════════════════════════════════════════════════════════════
// 4-layer bioluminescent glow helper
// ═══════════════════════════════════════════════════════════════════

function bio4(r: number, g: number, b: number): string {
  return [
    `0 0 1px rgba(${r},${g},${b},0.25)`,
    `0 0 8px rgba(${r},${g},${b},0.12)`,
    `0 0 24px rgba(${r},${g},${b},0.06)`,
    `0 0 48px rgba(${r},${g},${b},0.02)`,
  ].join(', ');
}

function focusRing4(r: number, g: number, b: number): string {
  return `, 0 0 0 2px rgba(${r},${g},${b},0.4), 0 0 12px rgba(${r},${g},${b},0.15), 0 0 32px rgba(${r},${g},${b},0.06)`;
}

// ═══════════════════════════════════════════════════════════════════
// Inner Glow Button — with bioluminescent press ripple
// ═══════════════════════════════════════════════════════════════════

export const InnerGlowButton: React.FC<{
  label: string; hex: string; variant?: 'solid' | 'ghost' | 'subtle'; onClick?: () => void;
}> = ({ label, hex, variant = 'solid', onClick }) => {
  const [state, setState] = useState<'idle' | 'hover' | 'press'>('idle');
  const [focused, setFocused] = useState(false);
  const [r, g, b] = hexToRgb(hex);
  const { ripples, trigger } = useRipple();

  const bg = variant === 'solid'
    ? `linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 40%), ${hex}`
    : variant === 'ghost'
      ? 'transparent'
      : `rgba(${r},${g},${b},0.08)`;

  const fRing = focused && state === 'idle' ? focusRing4(r, g, b) : '';

  return (
    <button
      onMouseEnter={() => setState('hover')}
      onMouseLeave={() => setState('idle')}
      onMouseDown={e => { setState('press'); trigger(e); }}
      onMouseUp={() => setState('hover')}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        padding: '10px 24px', fontSize: 13, fontWeight: 500,
        fontFamily: 'var(--sn-font-family)',
        color: variant === 'solid' ? '#fff' : hex,
        background: bg,
        border: variant === 'ghost' ? `1px solid rgba(${r},${g},${b},${state === 'hover' ? 0.5 : 0.15})` : 'none',
        borderRadius: 10, cursor: 'pointer',
        transition: `all 400ms ${SPRING}`,
        boxShadow: (state === 'press'
          ? `${bio4(r, g, b)}, inset 0 0 6px rgba(255,255,255,0.06)`
          : state === 'hover'
            ? `0 0 1px rgba(${r},${g},${b},0.25), 0 0 8px rgba(${r},${g},${b},0.12), 0 0 24px rgba(${r},${g},${b},0.06), 0 4px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)`
            : variant === 'solid'
              ? `0 0 3px rgba(${r},${g},${b},0.08), 0 0 8px rgba(${r},${g},${b},0.04), 0 2px 6px rgba(${r},${g},${b},0.06), inset 0 1px 0 rgba(255,255,255,0.05)`
              : '0 0 0 0 transparent') + fRing,
        transform: state === 'press' ? 'scale(0.96)' : state === 'hover' ? 'translateY(-2px)' : 'none',
        outline: 'none',
      }}
      onClick={onClick}
    >
      {/* Bioluminescent press ripples */}
      {ripples.map(rp => (
        <span key={rp.id} style={{
          position: 'absolute', left: rp.x, top: rp.y,
          width: 100, height: 100, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${r},${g},${b},0.25), transparent 60%)`,
          animation: `sn-btn-ripple 600ms ${SPRING} forwards`,
          pointerEvents: 'none',
        }} />
      ))}
      <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Liquid Toggle — 4-layer glow when on
// ═══════════════════════════════════════════════════════════════════

export const LiquidToggle: React.FC<{ label: string; defaultOn?: boolean }> = ({ label, defaultOn = false }) => {
  const [on, setOn] = useState(defaultOn);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const fRing = focused ? focusRing4(78, 123, 142) : '';

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <div
        tabIndex={0}
        role="switch"
        aria-checked={on}
        onClick={() => setOn(!on)}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setOn(!on); } }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: 44, height: 20, borderRadius: 4,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${on ? 'rgba(78,123,142,0.3)' : hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
          position: 'relative',
          transition: `all 500ms ${SPRING}`,
          boxShadow: (on
            ? bio4(78, 123, 142)
            : 'inset 0 1px 3px rgba(0,0,0,0.15)') + fRing,
          overflow: focused ? 'visible' : 'hidden',
          outline: 'none',
        }}
      >
        {/* Liquid fill — charges from left */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 3,
          background: 'linear-gradient(90deg, var(--sn-storm, #4E7B8E) 0%, rgba(106,149,166,0.6) 100%)',
          transform: on ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left center',
          transition: `transform 500ms ${SPRING}`,
        }} />
        {/* Glow edge — the leading boundary that makes it feel alive */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: 3,
          left: on ? 'calc(100% - 3px)' : '0%',
          background: on ? 'rgba(255,255,255,0.7)' : 'transparent',
          borderRadius: 1,
          boxShadow: on
            ? '0 0 6px rgba(176,208,216,0.6), 0 0 12px rgba(78,123,142,0.3)'
            : 'none',
          transition: `all 500ms ${SPRING}`,
          opacity: on ? 1 : 0,
        }} />
      </div>
      <span style={{ fontSize: 12, color: on ? palette.text : palette.textSoft, fontFamily: 'var(--sn-font-family)', transition: `color 300ms ${SPRING}` }}>{label}</span>
    </label>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Glow Checkbox — 4-layer glow when checked
// ═══════════════════════════════════════════════════════════════════

export const GlowCheckbox: React.FC<{ label: string; defaultChecked?: boolean }> = ({ label, defaultChecked = false }) => {
  const [checked, setChecked] = useState(defaultChecked);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const fRing = focused ? focusRing4(78, 123, 142) : '';

  return (
    <label
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
    >
      <div
        tabIndex={0}
        role="checkbox"
        aria-checked={checked}
        onClick={() => setChecked(!checked)}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setChecked(!checked); } }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: 20, height: 20, borderRadius: 6,
          background: checked ? 'var(--sn-storm)' : hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
          border: `1.5px solid ${checked ? 'rgba(78,123,142,0.5)' : hovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: `all 300ms ${SPRING}`,
          boxShadow: (checked ? `${bio4(78, 123, 142)}, inset 0 0 4px rgba(255,255,255,0.1)` : '0 0 0 0 transparent') + fRing,
          outline: 'none',
        }}
      >
        {checked && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: 12, color: palette.text, fontFamily: 'var(--sn-font-family)' }}>{label}</span>
    </label>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Glow Radio — 4-layer glow when selected
// ═══════════════════════════════════════════════════════════════════

export const GlowRadio: React.FC<{ options: string[]; name: string }> = ({ options, name: _name }) => {
  const [selected, setSelected] = useState(options[0]);
  const [hoveredOpt, setHoveredOpt] = useState<string | null>(null);
  const [focusedOpt, setFocusedOpt] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map(opt => {
        const isSelected = selected === opt;
        const isHovered = hoveredOpt === opt;
        const isFocused = focusedOpt === opt;
        const fRing = isFocused ? focusRing4(78, 123, 142) : '';

        return (
          <label key={opt}
            onMouseEnter={() => setHoveredOpt(opt)}
            onMouseLeave={() => setHoveredOpt(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <div
              tabIndex={0}
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(opt)}
              onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setSelected(opt); } }}
              onFocus={() => setFocusedOpt(opt)}
              onBlur={() => setFocusedOpt(null)}
              style={{
                width: 18, height: 18, borderRadius: '50%',
                border: `1.5px solid ${isSelected ? 'rgba(78,123,142,0.6)' : isHovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)'}`,
                background: isSelected ? 'rgba(78,123,142,0.06)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: `all 300ms ${SPRING}`,
                boxShadow: (isSelected ? bio4(78, 123, 142) : '0 0 0 0 transparent') + fRing,
                outline: 'none',
              }}
            >
              {/* Retro indicator dot — glowing phosphor */}
              <div style={{
                width: isSelected ? 8 : 0, height: isSelected ? 8 : 0,
                borderRadius: '50%',
                background: isSelected
                  ? 'radial-gradient(circle, rgba(176,208,216,0.9) 0%, var(--sn-storm, #4E7B8E) 60%, rgba(78,123,142,0.4) 100%)'
                  : 'transparent',
                transition: `all 300ms ${SPRING}`,
                boxShadow: isSelected
                  ? '0 0 4px rgba(176,208,216,0.8), 0 0 10px rgba(78,123,142,0.5), 0 0 16px rgba(78,123,142,0.2)'
                  : 'none',
              }} />
            </div>
            <span style={{ fontSize: 12, color: palette.text, fontFamily: 'var(--sn-font-family)' }}>{opt}</span>
          </label>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Glow Input — 4-layer focus glow
// ═══════════════════════════════════════════════════════════════════

export const GlowInput: React.FC<{ placeholder: string; type?: string }> = ({ placeholder, type = 'text' }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input type={type} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '10px 14px', fontSize: 13,
          fontFamily: 'var(--sn-font-family)', color: palette.text,
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${focused ? 'var(--sn-storm)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: 10, outline: 'none',
          transition: `all 400ms ${SPRING}`,
          boxShadow: focused
            ? `${bio4(78, 123, 142)}, inset 0 0 4px rgba(78,123,142,0.05)`
            : 'inset 0 1px 3px rgba(0,0,0,0.1)',
        }} />
      {/* Glowing underline */}
      <div style={{
        position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 2,
        background: 'var(--sn-storm)', borderRadius: 1,
        transform: focused ? 'scaleX(1)' : 'scaleX(0)',
        transition: `transform 400ms ${SPRING}`,
        boxShadow: focused ? '0 0 8px rgba(78,123,142,0.4), 0 0 20px rgba(78,123,142,0.15)' : 'none',
      }} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Glow Select — 4-layer open glow
// ═══════════════════════════════════════════════════════════════════

export const GlowSelect: React.FC<{ options: string[]; label: string }> = ({ options, label }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(options[0]);
  const [focused, setFocused] = useState(false);

  const fRing = focused && !open ? focusRing4(78, 123, 142) : '';

  return (
    <div style={{ position: 'relative' }}>
      <GroupLabel>{label}</GroupLabel>
      <div
        tabIndex={0}
        role="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setOpen(!open); } }}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); setOpen(false); }}
        style={{
          padding: '10px 14px', fontSize: 13, fontFamily: 'var(--sn-font-family)',
          color: palette.text, background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${open ? 'var(--sn-storm)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: 10, cursor: 'pointer',
          transition: `all 300ms ${SPRING}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: (open ? bio4(78, 123, 142) : '0 0 0 0 transparent') + fRing,
          outline: 'none',
        }}
      >
        <span>{selected}</span>
        <span style={{ fontSize: 10, color: palette.textMuted, transform: open ? 'rotate(180deg)' : 'none', transition: `transform 300ms ${SPRING}` }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--sn-surface-raised, #1A1A1F)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02), ${bio4(78, 123, 142)}`,
          overflow: 'hidden', zIndex: 10,
          animation: `sn-unfold 300ms ${SPRING}`,
        }}>
          {options.map((opt, i) => (
            <div key={opt} onClick={() => { setSelected(opt); setOpen(false); }}
              style={{
                padding: '8px 14px', fontSize: 12, color: selected === opt ? palette.text : palette.textSoft,
                cursor: 'pointer',
                transition: `all 200ms ${SPRING}`,
                background: selected === opt ? 'rgba(78,123,142,0.1)' : 'transparent',
                borderLeft: selected === opt ? '2px solid var(--sn-storm)' : '2px solid transparent',
                animation: `sn-context-stagger 200ms ${SPRING} ${i * 30}ms both`,
              }}
              onMouseEnter={e => { if (selected !== opt) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderLeftColor = 'rgba(78,123,142,0.3)'; } }}
              onMouseLeave={e => { if (selected !== opt) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderLeftColor = 'transparent'; } }}
            >{opt}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Glow Slider — traveling shimmer on fill
// ═══════════════════════════════════════════════════════════════════

export const GlowSlider: React.FC<{ label: string; min?: number; max?: number; initial?: number }> = ({
  label, min = 0, max = 100, initial = 50,
}) => {
  const [val, setVal] = useState(initial);
  const [focused, setFocused] = useState(false);
  const pct = ((val - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <GroupLabel>{label}</GroupLabel>
        <span style={{ fontSize: 10, fontFamily: 'var(--sn-font-mono)', color: palette.textMuted }}>{val}</span>
      </div>
      <div style={{ position: 'relative', height: 8 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 4,
          background: 'rgba(255,255,255,0.04)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
        }} />
        {/* Fill with traveling shimmer */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`, borderRadius: 4,
          background: 'linear-gradient(90deg, var(--sn-storm) 0%, var(--sn-storm-light) 50%, var(--sn-storm) 100%)',
          backgroundSize: '200% 100%',
          animation: 'sn-slider-shimmer 3s ease-in-out infinite',
          boxShadow: '0 0 10px rgba(78,123,142,0.3), 0 0 24px rgba(78,123,142,0.1)',
          transition: `width 100ms ${SPRING}`,
        }} />
        {/* Visible thumb */}
        <div style={{
          position: 'absolute', top: -4, left: `${pct}%`, marginLeft: -8,
          width: 16, height: 16, borderRadius: '50%',
          background: '#fff',
          boxShadow: focused
            ? `0 0 0 2px rgba(78,123,142,0.5), ${bio4(78, 123, 142)}, 0 2px 4px rgba(0,0,0,0.2)`
            : '0 0 4px rgba(78,123,142,0.2), 0 2px 4px rgba(0,0,0,0.2)',
          transition: `all 200ms ${SPRING}`,
          pointerEvents: 'none',
        }} />
        <input type="range" min={min} max={max} value={val}
          onChange={e => setVal(+e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            position: 'absolute', inset: 0, width: '100%',
            opacity: 0, cursor: 'pointer', margin: 0,
          }} />
      </div>
    </div>
  );
};
