/**
 * DeviceFrame — Phone/tablet/desktop frame wrapper for the preview pane.
 *
 * Renders a visual chrome wrapper (device bezel) around the preview iframe,
 * with a device selector to switch between phone (375x812), tablet (768x1024),
 * and desktop (1280x800) frames. The frame scales down to fit within its
 * container while preserving aspect ratio.
 *
 * @module lab/components
 * @layer L2
 */

import React, { useMemo } from 'react';

import type { DeviceType } from '../hooks/useDeviceFrame';
import { DEVICE_SIZES, DEVICE_LABELS } from '../hooks/useDeviceFrame';

import { labPalette, SPRING } from './shared/palette';

// ═══════════════════════════════════════════════════════════════════
// Device Frame Bezel Styles
// ═══════════════════════════════════════════════════════════════════

const BEZEL_RADIUS: Record<DeviceType, number> = {
  phone: 32,
  tablet: 18,
  desktop: 10,
};

const BEZEL_PADDING: Record<DeviceType, { top: number; bottom: number; sides: number }> = {
  phone: { top: 40, bottom: 40, sides: 8 },
  tablet: { top: 28, bottom: 28, sides: 8 },
  desktop: { top: 32, bottom: 8, sides: 8 },
};

// ═══════════════════════════════════════════════════════════════════
// Device Selector
// ═══════════════════════════════════════════════════════════════════

const DEVICE_ICONS: Record<DeviceType, string> = {
  phone: '\u25AE',   // vertical rectangle
  tablet: '\u25AD',  // horizontal rectangle
  desktop: '\u25A3', // square with inner square
};

interface DeviceSelectorProps {
  device: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({ device, onDeviceChange }) => (
  <div
    role="radiogroup"
    aria-label="Device frame size"
    style={{
      display: 'flex',
      gap: 2,
      background: 'rgba(0,0,0,0.2)',
      borderRadius: 6,
      padding: 2,
    }}
  >
    {(['phone', 'tablet', 'desktop'] as DeviceType[]).map((d) => (
      <button
        key={d}
        role="radio"
        aria-checked={device === d}
        aria-label={DEVICE_LABELS[d]}
        onClick={() => onDeviceChange(d)}
        style={{
          padding: '4px 10px',
          fontSize: 10,
          fontWeight: device === d ? 600 : 400,
          fontFamily: 'var(--sn-font-family)',
          color: device === d ? labPalette.text : labPalette.textMuted,
          background: device === d
            ? 'var(--sn-surface-glass, rgba(20,17,24,0.75))'
            : 'transparent',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          transition: `all 300ms ${SPRING}`,
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 12 }}>{DEVICE_ICONS[d]}</span>
        {DEVICE_LABELS[d]}
      </button>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface DeviceFrameProps {
  /** Currently selected device type */
  device: DeviceType;
  /** Callback when the device type changes */
  onDeviceChange: (device: DeviceType) => void;
  /** Available width of the container (px) */
  containerWidth: number;
  /** Available height of the container (px) */
  containerHeight: number;
  /** Content to render inside the device frame */
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  device,
  onDeviceChange,
  containerWidth,
  containerHeight,
  children,
}) => {
  const deviceSize = DEVICE_SIZES[device];
  const bezelPad = BEZEL_PADDING[device];
  const bezelRadius = BEZEL_RADIUS[device];

  // Total bezel dimensions including padding
  const totalWidth = deviceSize.width + bezelPad.sides * 2;
  const totalHeight = deviceSize.height + bezelPad.top + bezelPad.bottom;

  // Scale to fit container with some margin
  const margin = 24;
  const availW = Math.max(containerWidth - margin * 2, 100);
  const availH = Math.max(containerHeight - margin * 2, 100);
  const scale = useMemo(
    () => Math.min(1, availW / totalWidth, availH / totalHeight),
    [availW, availH, totalWidth, totalHeight],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%',
        gap: 12,
      }}
    >
      {/* Device selector toolbar */}
      <DeviceSelector device={device} onDeviceChange={onDeviceChange} />

      {/* Frame container — centers and scales the device bezel */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
        }}
      >
        <div
          data-testid="device-bezel"
          style={{
            width: totalWidth,
            height: totalHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            transition: `transform 300ms ${SPRING}`,
            borderRadius: bezelRadius,
            background: 'linear-gradient(145deg, rgba(40,38,46,0.95) 0%, rgba(24,22,28,0.98) 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: [
              '0 4px 24px rgba(0,0,0,0.4)',
              '0 1px 4px rgba(0,0,0,0.2)',
              'inset 0 1px 0 rgba(255,255,255,0.04)',
            ].join(', '),
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Top notch / camera area (phone/tablet) */}
          {device === 'phone' && (
            <div
              data-testid="device-notch"
              style={{
                height: bezelPad.top,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 6,
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.06)',
                }}
              />
            </div>
          )}

          {/* Desktop title bar */}
          {device === 'desktop' && (
            <div
              data-testid="device-titlebar"
              style={{
                height: bezelPad.top,
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                gap: 6,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(200,88,88,0.6)' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(212,160,76,0.6)' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(90,168,120,0.6)' }} />
            </div>
          )}

          {/* Tablet top bar (minimal) */}
          {device === 'tablet' && (
            <div
              style={{
                height: bezelPad.top,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.04)',
                }}
              />
            </div>
          )}

          {/* Content area (the iframe goes here) */}
          <div
            data-testid="device-content"
            style={{
              flex: 1,
              width: deviceSize.width,
              margin: `0 ${bezelPad.sides}px`,
              borderRadius: device === 'phone' ? 4 : 2,
              overflow: 'hidden',
              background: '#ffffff',
              position: 'relative',
            }}
          >
            {children}
          </div>

          {/* Bottom bezel */}
          {device === 'phone' && (
            <div
              data-testid="device-home-indicator"
              style={{
                height: bezelPad.bottom,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 100,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.08)',
                }}
              />
            </div>
          )}

          {device !== 'phone' && (
            <div style={{ height: bezelPad.bottom }} />
          )}
        </div>
      </div>

      {/* Size label */}
      <div
        data-testid="device-size-label"
        style={{
          fontSize: 10,
          fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
          color: labPalette.textFaint,
        }}
      >
        {deviceSize.width} x {deviceSize.height}
      </div>
    </div>
  );
};
