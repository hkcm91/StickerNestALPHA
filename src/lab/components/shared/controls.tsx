/**
 * Lab form controls — adapted from UI Swatches gallery for L2.
 *
 * LiquidToggle, GlowCheckbox, GlowRadio, GlowInput, GlowSelect, GlowSlider.
 * Each control glows from within. No L6 imports.
 *
 * @module lab/components/shared
 * @layer L2
 */

import React, { useState } from 'react';

import { labPalette, SPRING } from './palette';

// ═══════════════════════════════════════════════════════════════════
// Liquid Toggle
// ═══════════════════════════════════════════════════════════════════

export const LiquidToggle: React.FC<{
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  defaultOn?: boolean;
}> = ({ label, checked: controlledChecked, onChange, defaultOn = false }) => {
  const [internalOn, setInternalOn] = useState(defaultOn);
  const on = controlledChecked ?? internalOn;

  const handleToggle = () => {
    const next = !on;
    setInternalOn(next);
    onChange?.(next);
  };

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <div
        onClick={handleToggle}
        role="switch"
        aria-checked={on}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(); } }}
        style={{
          width: 44, height: 24, borderRadius: 12,
          background: on ? labPalette.storm : 'rgba(255,255,255,0.06)',
          border: `1px solid ${on ? 'rgba(78,123,142,0.4)' : 'rgba(255,255,255,0.08)'}`,
          position: 'relative',
          transition: `all 400ms ${SPRING}`,
          boxShadow: on
            ? '0 0 3px rgba(78,123,142,0.18), 0 0 8px rgba(78,123,142,0.08), 0 0 14px rgba(78,123,142,0.03), inset 0 0 4px rgba(78,123,142,0.08)'
            : 'inset 0 1px 3px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          outline: 'none',
        }}
      >
        {/* Liquid fill */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 12,
          background: 'linear-gradient(90deg, rgba(78,123,142,0.3), rgba(78,123,142,0.1))',
          transform: on ? 'translateX(0)' : 'translateX(-100%)',
          transition: `transform 500ms ${SPRING}`,
        }} />
        {/* Thumb */}
        <div style={{
          position: 'absolute', top: 2, left: on ? 22 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: on ? '#fff' : 'rgba(255,255,255,0.5)',
          boxShadow: on
            ? '0 0 8px rgba(78,123,142,0.4), 0 2px 4px rgba(0,0,0,0.2)'
            : '0 1px 3px rgba(0,0,0,0.3)',
          transition: `all 400ms ${SPRING}`,
        }} />
      </div>
      <span style={{ fontSize: 12, color: labPalette.text, fontFamily: 'var(--sn-font-family)' }}>{label}</span>
    </label>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Glow Checkbox
// ═══════════════════════════════════════════════════════════════════

export const GlowCheckbox: React.FC<{
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  defaultChecked?: boolean;
}> = ({ label, checked: controlledChecked, onChange, defaultChecked = false }) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const checked = controlledChecked ?? internalChecked;

  const handleToggle = () => {
    const next = !checked;
    setInternalChecked(next);
    onChange?.(next);
  };

  return (
    <label
      onClick={handleToggle}
      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
    >
      <div
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(); } }}
        style={{
          width: 20, height: 20, borderRadius: 6,
          background: checked ? labPalette.storm : 'rgba(255,255,255,0.04)',
          border: `1.5px solid ${checked ? 'rgba(78,123,142,0.5)' : 'rgba(255,255,255,0.1)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: `all 300ms ${SPRING}`,
          boxShadow: checked ? '0 0 10px rgba(78,123,142,0.3), inset 0 0 4px rgba(255,255,255,0.1)' : 'none',
          outline: 'none',
          flexShrink: 0,
        }}
      >
        {checked && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: 12, color: labPalette.text, fontFamily: 'var(--sn-font-family)' }}>{label}</span>
    </label>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Glow Radio
// ═══════════════════════════════════════════════════════════════════

export const GlowRadio: React.FC<{
  options: string[];
  name: string;
  value?: string;
  onChange?: (value: string) => void;
}> = ({ options, name: _name, value: controlledValue, onChange }) => {
  const [internalValue, setInternalValue] = useState(options[0]);
  const selected = controlledValue ?? internalValue;

  const handleSelect = (opt: string) => {
    setInternalValue(opt);
    onChange?.(opt);
  };

  return (
    <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((opt) => (
        <label
          key={opt}
          onClick={() => handleSelect(opt)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <div
            role="radio"
            aria-checked={selected === opt}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(opt); } }}
            style={{
              width: 18, height: 18, borderRadius: '50%',
              border: `2px solid ${selected === opt ? labPalette.storm : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: `all 300ms ${SPRING}`,
              boxShadow: selected === opt ? '0 0 10px rgba(78,123,142,0.2)' : 'none',
              outline: 'none',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: selected === opt ? labPalette.storm : 'transparent',
              transition: `all 300ms ${SPRING}`,
              boxShadow: selected === opt ? '0 0 6px rgba(78,123,142,0.5)' : 'none',
            }} />
          </div>
          <span style={{ fontSize: 12, color: labPalette.text, fontFamily: 'var(--sn-font-family)' }}>{opt}</span>
        </label>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Glow Input
// ═══════════════════════════════════════════════════════════════════

export const GlowInput: React.FC<{
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}> = ({ placeholder, type = 'text', value, onChange, style: outerStyle }) => {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ position: 'relative', ...outerStyle }}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={placeholder}
        style={{
          width: '100%', padding: '10px 14px', fontSize: 13,
          fontFamily: 'var(--sn-font-family)', color: labPalette.text,
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${focused ? labPalette.storm : 'rgba(255,255,255,0.06)'}`,
          borderRadius: 10, outline: 'none',
          transition: `all 400ms ${SPRING}`,
          boxShadow: focused
            ? '0 0 20px rgba(78,123,142,0.15), inset 0 0 8px rgba(78,123,142,0.05)'
            : 'inset 0 1px 3px rgba(0,0,0,0.1)',
        }}
      />
      {/* Glowing underline */}
      <div
        aria-hidden
        style={{
          position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 2,
          background: labPalette.storm, borderRadius: 1,
          transform: focused ? 'scaleX(1)' : 'scaleX(0)',
          transition: `transform 400ms ${SPRING}`,
          boxShadow: focused ? '0 0 8px rgba(78,123,142,0.4)' : 'none',
        }}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Glow Select
// ═══════════════════════════════════════════════════════════════════

export const GlowSelect: React.FC<{
  options: string[];
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
}> = ({ options, label, value: controlledValue, onChange }) => {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(options[0]);
  const selected = controlledValue ?? internalValue;

  const handleSelect = (opt: string) => {
    setInternalValue(opt);
    onChange?.(opt);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      {label && (
        <div style={{
          fontSize: 9, fontWeight: 700, color: labPalette.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.14em',
          marginBottom: 8,
        }}>{label}</div>
      )}
      <div
        onClick={() => setOpen(!open)}
        role="combobox"
        aria-expanded={open}
        aria-label={label ?? 'Select option'}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } }}
        style={{
          padding: '10px 14px', fontSize: 13, fontFamily: 'var(--sn-font-family)',
          color: labPalette.text, background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${open ? labPalette.storm : 'rgba(255,255,255,0.06)'}`,
          borderRadius: 10, cursor: 'pointer',
          transition: `all 300ms ${SPRING}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          outline: 'none',
        }}
      >
        <span>{selected}</span>
        <span style={{
          fontSize: 10, color: labPalette.textMuted,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: `transform 300ms ${SPRING}`,
        }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: labPalette.surfaceRaised,
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)',
          overflow: 'hidden', zIndex: 10,
          animation: `sn-unfold 300ms ${SPRING}`,
        }}>
          {options.map((opt) => (
            <div
              key={opt}
              role="option"
              aria-selected={selected === opt}
              onClick={() => handleSelect(opt)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(opt); }}
              tabIndex={0}
              style={{
                padding: '8px 14px', fontSize: 12,
                color: selected === opt ? labPalette.text : labPalette.textSoft,
                cursor: 'pointer', transition: 'background 100ms',
                background: selected === opt ? 'rgba(78,123,142,0.1)' : 'transparent',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                if (selected !== opt) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                if (selected !== opt) e.currentTarget.style.background = 'transparent';
              }}
            >{opt}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Glow Slider
// ═══════════════════════════════════════════════════════════════════

export const GlowSlider: React.FC<{
  label: string;
  min?: number;
  max?: number;
  value?: number;
  onChange?: (value: number) => void;
  initial?: number;
}> = ({ label, min = 0, max = 100, value: controlledValue, onChange, initial = 50 }) => {
  const [internalVal, setInternalVal] = useState(initial);
  const val = controlledValue ?? internalVal;
  const pct = ((val - min) / (max - min)) * 100;

  const handleChange = (newVal: number) => {
    setInternalVal(newVal);
    onChange?.(newVal);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: labPalette.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.14em',
        }}>{label}</div>
        <span style={{ fontSize: 10, fontFamily: 'var(--sn-font-mono)', color: labPalette.textMuted }}>{val}</span>
      </div>
      <div style={{ position: 'relative', height: 8 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 4,
          background: 'rgba(255,255,255,0.04)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
        }} />
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`, borderRadius: 4,
          background: `linear-gradient(90deg, ${labPalette.storm}, ${labPalette.stormLight})`,
          boxShadow: '0 0 10px rgba(78,123,142,0.3)',
          transition: `width 100ms ${SPRING}`,
        }} />
        <input
          type="range"
          min={min}
          max={max}
          value={val}
          onChange={(e) => handleChange(+e.target.value)}
          aria-label={label}
          style={{
            position: 'absolute', inset: 0, width: '100%',
            opacity: 0, cursor: 'pointer', margin: 0,
          }}
        />
      </div>
    </div>
  );
};
