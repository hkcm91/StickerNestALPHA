/**
 * SpatialCanvasPanel — 3D perspective viewport with widget emitter objects
 *
 * Renders a Three.js scene with floating shapes that emit spatial.* bus events
 * on click (raycasting) and on a periodic timer.
 *
 * @module shell/dev
 * @layer L6
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  WebGLRenderer,
  Raycaster,
  Vector2,
  Mesh,
  BoxGeometry,
  SphereGeometry,
  TorusGeometry,
  MeshStandardMaterial,
  AmbientLight,
  DirectionalLight,
  Color,
} from 'three';

import type { SpatialContext } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { createSpatialScene } from '../../../spatial';
import type { SpatialScene } from '../../../spatial';

type EmitterType = 'cube' | 'sphere' | 'torus';

interface EmitterConfig {
  mesh: Mesh;
  type: EmitterType;
  color: string;
  lastEmit: number;
  pulseCount: number;
  /** Scale animation progress: 0 = idle, >0 = animating (ms remaining) */
  pulseAnim: number;
  /** Flash animation progress */
  flashAnim: number;
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomHue(): string {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h}, 70%, 55%)`;
}

function colorToHex(hsl: string): number {
  const c = new Color(hsl);
  return c.getHex();
}

function createEmitterMesh(type: EmitterType, color: string): Mesh {
  const hex = colorToHex(color);
  const material = new MeshStandardMaterial({ color: hex, roughness: 0.4, metalness: 0.3 });

  let geometry;
  switch (type) {
    case 'sphere':
      geometry = new SphereGeometry(0.4, 24, 24);
      break;
    case 'torus':
      geometry = new TorusGeometry(0.35, 0.12, 16, 32);
      break;
    case 'cube':
    default:
      geometry = new BoxGeometry(0.7, 0.7, 0.7);
      break;
  }

  const mesh = new Mesh(geometry, material);
  mesh.position.set(
    randomInRange(-2.5, 2.5),
    randomInRange(0.3, 2.5),
    randomInRange(-2, 2),
  );
  return mesh;
}

function getSpatialContext(mesh: Mesh, normal?: { x: number; y: number; z: number }): SpatialContext {
  const q = mesh.quaternion;
  return {
    position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
    rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
    normal: normal ?? { x: 0, y: 1, z: 0 },
  };
}

export const SpatialCanvasPanel: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const sceneRef = useRef<SpatialScene | null>(null);
  const emittersRef = useRef(new Map<string, EmitterConfig>());
  const animFrameRef = useRef<number>(0);
  const raycasterRef = useRef(new Raycaster());
  const mouseRef = useRef(new Vector2());
  const autoRotateRef = useRef(true);
  const intervalRef = useRef(2000);
  const angleRef = useRef(0);
  const idCounterRef = useRef(0);

  const [emitterCount, setEmitterCount] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [pulseTotal, setPulseTotal] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pulseInterval, setPulseInterval] = useState(2000);

  // Keep refs in sync with state
  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);
  useEffect(() => { intervalRef.current = pulseInterval; }, [pulseInterval]);

  // Init Three.js
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const spatialScene = createSpatialScene();
    sceneRef.current = spatialScene;
    const scene = spatialScene.getScene();
    const camera = spatialScene.getCamera();

    // Setup camera
    camera.position.set(0, 2, 6);
    camera.lookAt(0, 0.8, 0);
    camera.fov = 60;

    // Lighting
    const ambient = new AmbientLight(0x404040, 1.5);
    const directional = new DirectionalLight(0xffffff, 1.2);
    directional.position.set(3, 5, 4);
    scene.add(ambient);
    scene.add(directional);

    // Renderer
    const w = container.clientWidth;
    const h = 320;
    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x111827, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // Render loop
    let lastTime = performance.now();
    const emitters = emittersRef.current;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;

      // Auto-rotate camera
      if (autoRotateRef.current) {
        angleRef.current += 0.003;
        const radius = 6;
        camera.position.x = Math.sin(angleRef.current) * radius;
        camera.position.z = Math.cos(angleRef.current) * radius;
        camera.position.y = 2;
        camera.lookAt(0, 0.8, 0);
      }

      // Animate emitters
      for (const [id, config] of emitters) {
        // Spin
        config.mesh.rotation.y += 0.01;
        config.mesh.rotation.x += 0.003;

        // Pulse animation
        if (config.pulseAnim > 0) {
          config.pulseAnim = Math.max(0, config.pulseAnim - dt);
          const t = config.pulseAnim / 200;
          const scale = 1 + 0.2 * Math.sin(t * Math.PI);
          config.mesh.scale.setScalar(scale);
        } else {
          config.mesh.scale.setScalar(1);
        }

        // Flash animation
        if (config.flashAnim > 0) {
          config.flashAnim = Math.max(0, config.flashAnim - dt);
          const mat = config.mesh.material as MeshStandardMaterial;
          if (config.flashAnim > 0) {
            mat.emissive.setHex(0xffffff);
            mat.emissiveIntensity = config.flashAnim / 200;
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }

        // Periodic emission
        if (now - config.lastEmit > intervalRef.current) {
          config.lastEmit = now;
          config.pulseCount++;
          config.pulseAnim = 200;

          const spatial = getSpatialContext(config.mesh);
          bus.emit('spatial.object.pulse', {
            emitterId: id,
            objectType: config.type,
            pulseCount: config.pulseCount,
          }, spatial);

          setPulseTotal(prev => prev + 1);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize
    const onResize = () => {
      const newW = container.clientWidth;
      renderer.setSize(newW, h);
      camera.aspect = newW / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      observer.disconnect();
      // Dispose emitters
      for (const [, config] of emitters) {
        config.mesh.geometry.dispose();
        (config.mesh.material as MeshStandardMaterial).dispose();
      }
      emitters.clear();
      // Dispose lights & scene
      scene.remove(ambient);
      scene.remove(directional);
      spatialScene.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // Canvas click handler for raycasting
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const renderer = rendererRef.current;
    const spatialScene = sceneRef.current;
    if (!renderer || !spatialScene) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const camera = spatialScene.getCamera();
    raycasterRef.current.setFromCamera(mouseRef.current, camera);

    const meshes = Array.from(emittersRef.current.values()).map(c => c.mesh);
    const intersections = raycasterRef.current.intersectObjects(meshes);

    if (intersections.length > 0) {
      const hit = intersections[0];
      const hitMesh = hit.object as Mesh;

      // Find the emitter config
      for (const [id, config] of emittersRef.current) {
        if (config.mesh === hitMesh) {
          // Flash effect
          config.flashAnim = 200;

          const faceNormal = hit.face
            ? { x: hit.face.normal.x, y: hit.face.normal.y, z: hit.face.normal.z }
            : { x: 0, y: 1, z: 0 };

          const spatial = getSpatialContext(hitMesh, faceNormal);
          bus.emit('spatial.object.clicked', {
            emitterId: id,
            objectType: config.type,
            hitPoint: { x: hit.point.x, y: hit.point.y, z: hit.point.z },
          }, spatial);

          setClickCount(prev => prev + 1);
          break;
        }
      }
    }
  }, []);

  const addEmitter = useCallback((type: EmitterType) => {
    const spatialScene = sceneRef.current;
    if (!spatialScene) return;

    const id = `emitter-${++idCounterRef.current}`;
    const color = randomHue();
    const mesh = createEmitterMesh(type, color);
    mesh.userData.entityId = id;
    spatialScene.getScene().add(mesh);

    emittersRef.current.set(id, {
      mesh,
      type,
      color,
      lastEmit: performance.now(),
      pulseCount: 0,
      pulseAnim: 0,
      flashAnim: 0,
    });

    setEmitterCount(emittersRef.current.size);
    bus.emit('spatial.object.added', { emitterId: id, objectType: type });
  }, []);

  const clearAll = useCallback(() => {
    const spatialScene = sceneRef.current;
    if (!spatialScene) return;
    const scene = spatialScene.getScene();

    for (const [id, config] of emittersRef.current) {
      scene.remove(config.mesh);
      config.mesh.geometry.dispose();
      (config.mesh.material as MeshStandardMaterial).dispose();
      bus.emit('spatial.object.removed', { emitterId: id });
    }
    emittersRef.current.clear();
    setEmitterCount(0);
    setClickCount(0);
    setPulseTotal(0);
  }, []);

  return (
    <section style={{ flex: '1 1 500px', minWidth: 0, maxWidth: '100%', border: '1px solid var(--sn-border, #374151)', padding: 10 }}>
      <h2>Spatial Canvas (3D)</h2>

      <div style={{ marginBottom: 8, display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => addEmitter('cube')}>+ Cube</button>
        <button onClick={() => addEmitter('sphere')}>+ Sphere</button>
        <button onClick={() => addEmitter('torus')}>+ Torus</button>
        <button onClick={clearAll}>Clear All</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 10 }}>
          <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} />
          <span style={{ fontSize: 10 }}>Orbit</span>
        </label>
      </div>

      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', fontSize: 10 }}>
        <span>Pulse:</span>
        <input
          type="range"
          min={500}
          max={5000}
          step={100}
          value={pulseInterval}
          onChange={(e) => setPulseInterval(Number(e.target.value))}
          style={{ width: 120 }}
        />
        <span>{(pulseInterval / 1000).toFixed(1)}s</span>
        <span style={{ marginLeft: 10, color: '#888' }}>
          Emitters: {emitterCount} | Clicks: {clickCount} | Pulses: {pulseTotal}
        </span>
      </div>

      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ width: '100%', height: 320, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--sn-border, #374151)', cursor: 'pointer' }}
      />

      <p style={{ color: '#666', fontSize: 10, marginTop: 6 }}>
        Click objects to emit spatial.object.clicked. Objects pulse on interval emitting spatial.object.pulse. Watch EventBus panel for events with spatial context.
      </p>
    </section>
  );
};
