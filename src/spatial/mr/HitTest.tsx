/**
 * HitTest -- hit test component for MR surface detection
 *
 * Creates a hit test target from viewer space and renders a reticle
 * indicator at the detected hit point. Emits `spatial.hitTest.result`
 * bus events each frame when a valid hit result is found.
 *
 * Must be rendered as a child of `<RATKProvider>`.
 *
 * @module spatial/mr/HitTest
 * @layer L4B
 */

import { useFrame } from '@react-three/fiber';
import type { HitTestTarget } from 'ratk';
import React, { useEffect, useRef, useState } from 'react';
import { DoubleSide, Matrix4 } from 'three';
import type { Group as ThreeGroup } from 'three';


import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

import { useRATK } from './RATKProvider';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Inner radius of the reticle ring in meters. */
const RETICLE_INNER_RADIUS = 0.02;

/** Outer radius of the reticle ring in meters. */
const RETICLE_OUTER_RADIUS = 0.03;

/** Number of segments for the reticle ring geometry. */
const RETICLE_SEGMENTS = 32;

/** Reticle color. */
const RETICLE_COLOR = '#ffffff';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the HitTest component.
 */
export interface HitTestProps {
  /** Whether to show the reticle indicator. Defaults to true. */
  showReticle?: boolean;
  /** Reticle color. Defaults to '#ffffff'. */
  reticleColor?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * HitTest -- performs viewer-space hit testing for MR placement.
 *
 * On mount (when RATK is available), creates a hit test target from
 * the viewer's reference space. Each frame, checks for valid hit test
 * results and:
 * - Emits `spatial.hitTest.result` bus event with position, rotation, and normal
 * - Renders a reticle ring at the hit point
 */
export function HitTest({
  showReticle = true,
  reticleColor = RETICLE_COLOR,
}: HitTestProps = {}): React.JSX.Element | null {
  const ratk = useRATK();
  const reticleRef = useRef<ThreeGroup>(null);
  const hitTestTargetRef = useRef<HitTestTarget | null>(null);
  const [hasHit, setHasHit] = useState(false);

  // Create hit test target when RATK becomes available
  useEffect(() => {
    if (!ratk) {
      hitTestTargetRef.current = null;
      setHasHit(false);
      return;
    }

    let cancelled = false;

    ratk
      .createHitTestTargetFromViewerSpace()
      .then((target) => {
        if (!cancelled) {
          hitTestTargetRef.current = target;
        }
      })
      .catch((err) => {
        console.error('[HitTest] Failed to create hit test target:', err);
      });

    return () => {
      cancelled = true;
      if (hitTestTargetRef.current && ratk) {
        ratk.deleteHitTestTarget(hitTestTargetRef.current);
        hitTestTargetRef.current = null;
      }
      setHasHit(false);
    };
  }, [ratk]);

  // Check hit test results each frame
  useFrame(() => {
    const target = hitTestTargetRef.current;
    if (!target) {
      if (hasHit) setHasHit(false);
      return;
    }

    if (target.hitTestResultValid && target.hitTestResults.length > 0) {
      if (!hasHit) setHasHit(true);

      // Use the first (closest) hit test result
      const result = target.hitTestResults[0];
      const pose = result.getPose?.(
        (target as unknown as { _referenceSpace?: XRReferenceSpace })._referenceSpace!,
      );

      // Position the reticle at the hit test target's world position
      // (RATK updates the HitTestTarget group's transform automatically)
      const position = {
        x: target.position.x,
        y: target.position.y,
        z: target.position.z,
      };
      const rotation = {
        x: target.quaternion.x,
        y: target.quaternion.y,
        z: target.quaternion.z,
        w: target.quaternion.w,
      };

      // Compute normal from the hit target's up direction (Y axis in local space)
      // The hit test target aligns with the surface, so local Y is the surface normal
      const mat = new Matrix4().makeRotationFromQuaternion(target.quaternion);
      const normal = {
        x: mat.elements[4],
        y: mat.elements[5],
        z: mat.elements[6],
      };

      bus.emit(SpatialEvents.HIT_TEST_RESULT, {
        position,
        rotation,
        normal,
      });

      // Update reticle transform
      if (reticleRef.current) {
        reticleRef.current.position.set(position.x, position.y, position.z);
        reticleRef.current.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      }
    } else {
      if (hasHit) setHasHit(false);
    }
  });

  if (!ratk) return null;

  if (!showReticle || !hasHit) return null;

  return (
    <group ref={reticleRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[RETICLE_INNER_RADIUS, RETICLE_OUTER_RADIUS, RETICLE_SEGMENTS]} />
        <meshBasicMaterial
          color={reticleColor}
          transparent
          opacity={0.8}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
