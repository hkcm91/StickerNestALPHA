/**
 * BreathingDomeMaterial -- custom shader for Rothko-style color field dome
 *
 * Four color bands blended with smoothstep, driven by sine-wave offsets
 * at different frequencies for organic breathing movement.
 *
 * @module spatial/components/breathing-dome-material
 * @layer L4B
 */

import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import { Color } from 'three';
import type { ShaderMaterial } from 'three';

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vY;

  void main() {
    vUv = uv;
    // Normalize direction on unit sphere, then map Y from [-1,1] to [0,1]
    vY = normalize(position).y * 0.5 + 0.5;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor1; // ground (bottom)
  uniform vec3 uColor2; // storm (lower-mid)
  uniform vec3 uColor3; // opal (upper-mid)
  uniform vec3 uColor4; // ember (top accent)
  uniform float uBreathingSpeed;
  uniform float uBreathingAmplitude;

  varying float vY;

  void main() {
    // Three overlapping sine waves at different frequencies create organic drift
    float wave1 = sin(uTime * uBreathingSpeed * 0.8 + 0.0) * uBreathingAmplitude;
    float wave2 = sin(uTime * uBreathingSpeed * 1.0 + 2.094) * uBreathingAmplitude;
    float wave3 = sin(uTime * uBreathingSpeed * 1.3 + 4.189) * uBreathingAmplitude;

    // Band boundaries shift with the breathing waves
    float band1 = 0.25 + wave1;
    float band2 = 0.50 + wave2;
    float band3 = 0.75 + wave3;

    // Smoothstep blending for Rothko-style soft edges
    float t1 = smoothstep(band1 - 0.12, band1 + 0.12, vY);
    float t2 = smoothstep(band2 - 0.12, band2 + 0.12, vY);
    float t3 = smoothstep(band3 - 0.12, band3 + 0.12, vY);

    // Layer the four colors
    vec3 color = mix(uColor1, uColor2, t1);
    color = mix(color, uColor3, t2);
    color = mix(color, uColor4, t3);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Material
// ---------------------------------------------------------------------------

/**
 * Custom shader material created via drei's shaderMaterial utility.
 * Uniforms are exposed as typed props when used in JSX.
 */
export const BreathingDomeMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor1: new Color('#110E14'),
    uColor2: new Color('#6BA4B8'),
    uColor3: new Color('#B8D4DE'),
    uColor4: new Color('#ECA080'),
    uBreathingSpeed: 1.0,
    uBreathingAmplitude: 0.08,
  },
  vertexShader,
  fragmentShader,
);

// Register with R3F's reconciler so <breathingDomeMaterial> works in JSX
extend({ BreathingDomeMaterial });

// Re-export ShaderMaterial type for consumers
export type { ShaderMaterial };
