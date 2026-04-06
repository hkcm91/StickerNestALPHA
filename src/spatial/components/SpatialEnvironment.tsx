/**
 * SpatialEnvironment -- Breathing Room VR/3D environment
 *
 * Renders a circular floor, a dome with Rothko-style breathing color fields,
 * and linear fog. Colors are derived from theme tokens and update reactively
 * when the theme changes.
 *
 * Inspired by Severance and Rothko color field paintings: minimal geometry,
 * maximum atmosphere. The room breathes on 3-5s cycles.
 *
 * Must be rendered inside a `<Canvas><XR>` tree.
 *
 * @module spatial/components/SpatialEnvironment
 * @layer L4B
 */

import { useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef } from 'react';
import { BackSide, Color } from 'three';
import type { ShaderMaterial } from 'three';

import { ShellEvents } from '@sn/types';
import type { BusEvent, ThemeName } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useUIStore } from '../../kernel/stores/ui/ui.store';

import './breathing-dome-material';
import { getSpatialThemeColors } from './spatial-theme-map';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_FLOOR_RADIUS = 50;
const DEFAULT_DOME_RADIUS = 60;
const DEFAULT_BREATHING_SPEED = 1.0;
const FOG_NEAR = 20;
const FOG_FAR = 80;
const TIME_WRAP = 1000; // Wrap uTime to prevent float32 precision loss
const FLOOR_SEGMENTS = 64;
const DOME_WIDTH_SEGMENTS = 64;
const DOME_HEIGHT_SEGMENTS = 32;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SpatialEnvironmentProps {
  /** Floor radius in world units (default: 50) */
  floorRadius?: number;
  /** Dome radius in world units (default: 60) */
  domeRadius?: number;
  /** Breathing animation speed multiplier (default: 1.0) */
  breathingSpeed?: number;
  /** Disable environment entirely (e.g., for MR passthrough) */
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SpatialEnvironment({
  floorRadius = DEFAULT_FLOOR_RADIUS,
  domeRadius = DEFAULT_DOME_RADIUS,
  breathingSpeed = DEFAULT_BREATHING_SPEED,
  enabled = true,
}: SpatialEnvironmentProps): React.JSX.Element | null {
  const domeMaterialRef = useRef<ShaderMaterial>(null);
  const timeRef = useRef(0);
  const reducedMotionRef = useRef(false);

  // -------------------------------------------------------------------------
  // Theme colors — read initial + subscribe to changes
  // -------------------------------------------------------------------------

  const themeRef = useRef<ThemeName>(useUIStore.getState().theme);

  const colors = useMemo(() => {
    const tc = getSpatialThemeColors(themeRef.current);
    return {
      ground: new Color(tc.ground),
      storm: new Color(tc.storm),
      opal: new Color(tc.opal),
      ember: new Color(tc.ember),
      groundHex: tc.ground,
    };
  }, [themeRef.current]);

  useEffect(() => {
    const unsubscribe = bus.subscribe(
      ShellEvents.THEME_CHANGED,
      (event: BusEvent) => {
        const payload = event.payload as { theme: ThemeName } | null;
        if (payload?.theme) {
          themeRef.current = payload.theme;
          const tc = getSpatialThemeColors(payload.theme);
          const mat = domeMaterialRef.current;
          if (mat) {
            (mat.uniforms.uColor1.value as Color).set(tc.ground);
            (mat.uniforms.uColor2.value as Color).set(tc.storm);
            (mat.uniforms.uColor3.value as Color).set(tc.opal);
            (mat.uniforms.uColor4.value as Color).set(tc.ember);
          }
        }
      },
    );
    return unsubscribe;
  }, []);

  // -------------------------------------------------------------------------
  // Reduced motion — respect prefers-reduced-motion
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;

    const handler = (e: MediaQueryListEvent): void => {
      reducedMotionRef.current = e.matches;
      const mat = domeMaterialRef.current;
      if (mat) {
        mat.uniforms.uBreathingAmplitude.value = e.matches ? 0 : 0.08;
      }
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // -------------------------------------------------------------------------
  // Animation loop — increment time for breathing shader
  // -------------------------------------------------------------------------

  useFrame((_, delta) => {
    if (!domeMaterialRef.current) return;
    timeRef.current = (timeRef.current + delta) % TIME_WRAP;
    domeMaterialRef.current.uniforms.uTime.value = timeRef.current;
  });

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!enabled) return null;

  return (
    <group>
      {/* Floor — circular, warm, grounded */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <circleGeometry args={[floorRadius, FLOOR_SEGMENTS]} />
        <meshStandardMaterial
          color={colors.ground}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>

      {/* Dome — inverted sphere with breathing color fields */}
      <mesh>
        <sphereGeometry args={[domeRadius, DOME_WIDTH_SEGMENTS, DOME_HEIGHT_SEGMENTS]} />
        {/* @ts-expect-error — breathingDomeMaterial is registered via extend() in breathing-dome-material.ts */}
        <breathingDomeMaterial
          ref={domeMaterialRef}
          side={BackSide}
          uTime={0}
          uColor1={colors.ground}
          uColor2={colors.storm}
          uColor3={colors.opal}
          uColor4={colors.ember}
          uBreathingSpeed={breathingSpeed}
          uBreathingAmplitude={reducedMotionRef.current ? 0 : 0.08}
        />
      </mesh>

      {/* Fog — linear, from ground color */}
      <fog attach="fog" args={[colors.groundHex, FOG_NEAR, FOG_FAR]} />
    </group>
  );
}
