/**
 * GlowButton — Button with bioluminescent glow, 3 variants, 3 states.
 *
 * Matches InnerGlowButton from the UI Swatches gallery:
 * - solid: gradient top-shine + filled background
 * - ghost: transparent with border
 * - subtle: tinted background
 *
 * States: idle → hover (lift -2px, glow) → press (scale 0.96, inset glow)
 *
 * @module lab/components/shared
 * @layer L2
 */

import React, { useState } from 'react';

import { SPRING, HEX, hexToRgb } from './palette';

export type GlowButtonVariant = 'solid' | 'ghost' | 'subtle';
export type GlowButtonColor = 'storm' | 'ember' | 'violet' | 'moss' | 'opal' | 'muted';

export interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: GlowButtonVariant;
  /** Color accent */
  color?: GlowButtonColor;
  /** Compact size (smaller padding) */
  compact?: boolean;
}

const COLOR_HEX: Record<GlowButtonColor, string> = {
  storm: HEX.storm,
  ember: HEX.ember,
  violet: HEX.violet,
  moss: HEX.moss,
  opal: HEX.opal,
  muted: '#6B6878',
};

export const GlowButton: React.FC<GlowButtonProps> = ({
  variant = 'solid',
  color = 'storm',
  compact = false,
  style,
  children,
  disabled,
  ...props
}) => {
  const [state, setState] = useState<'idle' | 'hover' | 'press'>('idle');
  const hex = COLOR_HEX[color];
  const [r, g, b] = hexToRgb(hex);

  const bg =
    variant === 'solid'
      ? `linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 40%), ${hex}`
      : variant === 'ghost'
        ? 'transparent'
        : `rgba(${r},${g},${b},0.08)`;

  const boxShadow =
    state === 'press'
      ? `0 0 3px rgba(${r},${g},${b},0.3), 0 0 8px rgba(${r},${g},${b},0.12), inset 0 0 6px rgba(255,255,255,0.06)`
      : state === 'hover'
        ? `0 0 3px rgba(${r},${g},${b},0.18), 0 0 10px rgba(${r},${g},${b},0.08), 0 4px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)`
        : variant === 'solid'
          ? `0 0 3px rgba(${r},${g},${b},0.08), 0 0 8px rgba(${r},${g},${b},0.04), 0 2px 6px rgba(${r},${g},${b},0.06), inset 0 1px 0 rgba(255,255,255,0.05)`
          : 'none';

  const transform =
    state === 'press'
      ? 'scale(0.96)'
      : state === 'hover'
        ? 'translateY(-2px)'
        : 'none';

  const borderStyle =
    variant === 'ghost'
      ? `1px solid rgba(${r},${g},${b},${state === 'hover' ? 0.5 : 0.15})`
      : 'none';

  return (
    <button
      {...props}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) setState('hover');
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setState('idle');
        props.onMouseLeave?.(e);
      }}
      onMouseDown={(e) => {
        if (!disabled) setState('press');
        props.onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        if (!disabled) setState('hover');
        props.onMouseUp?.(e);
      }}
      onFocus={(e) => {
        if (!disabled) setState('hover');
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setState('idle');
        props.onBlur?.(e);
      }}
      style={{
        padding: compact ? '6px 14px' : '10px 24px',
        fontSize: compact ? 12 : 13,
        fontWeight: 500,
        fontFamily: 'var(--sn-font-family)',
        color: variant === 'solid' ? '#fff' : hex,
        background: bg,
        border: borderStyle,
        borderRadius: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: `all 400ms ${SPRING}`,
        boxShadow,
        transform,
        outline: 'none',
        ...style,
      }}
    >
      {children}
    </button>
  );
};
