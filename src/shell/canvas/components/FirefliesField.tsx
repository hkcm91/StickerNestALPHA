/**
 * FirefliesField — Warm autumn dusk with floating firefly particles and branching structures.
 *
 * Dark warm brown/amber base with organic tree-branch-like golden structures
 * and tiny glowing amber/yellow dots (fireflies) that drift gently.
 * Some falling leaf particles float down from the top.
 *
 * Uses HTML5 Canvas for firefly and leaf particles, CSS for the base gradient
 * and branch-like organic shapes.
 *
 * @module shell/canvas/components
 * @layer L6
 */

import React, { useEffect, useRef, useState } from "react";

/* ── Inject keyframes once ───────────────────────────── */
let keyframesInjected = false;
function injectKeyframes() {
  if (keyframesInjected) return;
  keyframesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes sn-branch-sway-1 {
      0%   { transform: translate(var(--px, 0px), var(--py, 0px)) rotate(0deg); }
      50%  { transform: translate(var(--px, 0px), var(--py, 0px)) rotate(2deg); }
      100% { transform: translate(var(--px, 0px), var(--py, 0px)) rotate(0deg); }
    }
    @keyframes sn-branch-sway-2 {
      0%   { transform: translate(var(--px, 0px), var(--py, 0px)) rotate(0deg) scale(1); }
      33%  { transform: translate(var(--px, 0px), var(--py, 0px)) rotate(-1.5deg) scale(1.02); }
      66%  { transform: translate(var(--px, 0px), var(--py, 0px)) rotate(1deg) scale(0.99); }
      100% { transform: translate(var(--px, 0px), var(--py, 0px)) rotate(0deg) scale(1); }
    }
    @keyframes sn-ember-glow {
      0%   { opacity: 0.2; }
      50%  { opacity: 0.5; }
      100% { opacity: 0.2; }
    }
  `;
  document.head.appendChild(style);
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
  brightness: number;
  maxBrightness: number;
  r: number;
  glowR: number;
  hue: number; // 30-50 range (amber to gold)
}

interface Leaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  size: number;
  opacity: number;
  hue: number; // 20-45 (orange to gold)
}

function createFirefly(width: number, height: number): Firefly {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.2,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.03 + 0.01,
    brightness: 0,
    maxBrightness: Math.random() * 0.7 + 0.3,
    r: Math.random() * 2 + 1,
    glowR: Math.random() * 15 + 8,
    hue: Math.random() * 20 + 30,
  };
}

function createLeaf(width: number, _height: number): Leaf {
  return {
    x: Math.random() * width,
    y: -20 - Math.random() * 100,
    vx: (Math.random() - 0.5) * 0.4,
    vy: Math.random() * 0.4 + 0.15,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.03,
    size: Math.random() * 8 + 4,
    opacity: Math.random() * 0.4 + 0.2,
    hue: Math.random() * 25 + 20,
  };
}

function drawLeaf(ctx: CanvasRenderingContext2D, leaf: Leaf) {
  ctx.save();
  ctx.translate(leaf.x, leaf.y);
  ctx.rotate(leaf.rotation);
  ctx.globalAlpha = leaf.opacity;

  // Simple leaf shape — elongated oval
  const s = leaf.size;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.4, s, 0, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${leaf.hue}, 70%, 40%)`;
  ctx.fill();

  // Stem
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(0, s * 0.3);
  ctx.strokeStyle = `hsl(${leaf.hue}, 50%, 30%)`;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.restore();
}

export interface FirefliesFieldProps {
  enabled?: boolean;
  mouse?: { x: number; y: number };
}

export const FirefliesField: React.FC<FirefliesFieldProps> = ({
  enabled = true,
  mouse,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firefliesRef = useRef<Firefly[]>([]);
  const leavesRef = useRef<Leaf[]>([]);
  const [size, setSize] = useState({ width: 1920, height: 1080 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { injectKeyframes(); }, []);

  // Track size
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({
          width: Math.ceil(entry.contentRect.width),
          height: Math.ceil(entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    const rect = el.getBoundingClientRect();
    setSize({ width: Math.ceil(rect.width), height: Math.ceil(rect.height) });
    return () => observer.disconnect();
  }, [enabled]);

  // Initialize particles
  useEffect(() => {
    if (!enabled || !size.width) return;
    const fireflyCount = Math.min(Math.floor((size.width * size.height) / 12000), 80);
    const leafCount = Math.min(Math.floor((size.width * size.height) / 60000), 15);
    firefliesRef.current = Array.from({ length: fireflyCount }, () =>
      createFirefly(size.width, size.height)
    );
    leavesRef.current = Array.from({ length: leafCount }, () =>
      createLeaf(size.width, size.height)
    );
  }, [enabled, size.width, size.height]);

  // Animation loop
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let lastTime = 0;
    const INTERVAL = 33;

    const animate = (time: number) => {
      if (time - lastTime < INTERVAL) {
        raf = requestAnimationFrame(animate);
        return;
      }
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) { raf = requestAnimationFrame(animate); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { raf = requestAnimationFrame(animate); return; }

      ctx.clearRect(0, 0, size.width, size.height);

      // Draw fireflies
      for (const f of firefliesRef.current) {
        // Organic wandering movement
        f.phase += f.speed;
        f.vx += (Math.random() - 0.5) * 0.02;
        f.vy += (Math.random() - 0.5) * 0.015;
        f.vx *= 0.99; // friction
        f.vy *= 0.99;
        f.x += f.vx;
        f.y += f.vy;

        // Gentle mouse influence
        if (mouse) {
          f.x += mouse.x * 0.08;
          f.y += mouse.y * 0.05;
        }

        // Wrap around edges
        if (f.x < -20) f.x = size.width + 20;
        if (f.x > size.width + 20) f.x = -20;
        if (f.y < -20) f.y = size.height + 20;
        if (f.y > size.height + 20) f.y = -20;

        // Pulsing glow
        f.brightness = f.maxBrightness * (0.3 + 0.7 * Math.max(0, Math.sin(f.phase)));

        if (f.brightness > 0.05) {
          // Outer glow
          const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.glowR);
          grad.addColorStop(0, `hsla(${f.hue}, 90%, 65%, ${f.brightness * 0.6})`);
          grad.addColorStop(0.3, `hsla(${f.hue}, 80%, 55%, ${f.brightness * 0.2})`);
          grad.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.glowR, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // Core dot
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${f.hue}, 95%, 75%, ${f.brightness})`;
          ctx.fill();
        }
      }

      // Draw falling leaves
      for (let i = leavesRef.current.length - 1; i >= 0; i--) {
        const leaf = leavesRef.current[i];
        leaf.y += leaf.vy;
        leaf.x += leaf.vx + Math.sin(leaf.rotation * 2) * 0.2;
        leaf.rotation += leaf.rotSpeed;

        // Mouse wind
        if (mouse) {
          leaf.x += mouse.x * 0.1;
        }

        // Recycle
        if (leaf.y > size.height + 30) {
          leavesRef.current[i] = createLeaf(size.width, size.height);
        }

        drawLeaf(ctx, leaf);
      }

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [enabled, size, mouse]);

  if (!enabled) return null;

  const px = (mouse?.x ?? 0) * 12;
  const py = (mouse?.y ?? 0) * 8;
  const parallaxVars = { "--px": `${px}px`, "--py": `${py}px` } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      data-testid="fireflies-field"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Warm dark base gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 130% 110% at 50% 60%,
            #1A1208 0%, #120C04 40%, #0A0804 100%)`,
        }}
      />

      {/* Warm ambient glow — upper area */}
      <div
        style={{
          ...parallaxVars,
          position: "absolute",
          left: "10%",
          top: "-5%",
          width: "80%",
          height: "50%",
          background: `radial-gradient(ellipse 100% 60% at 50% 50%,
            rgba(200, 140, 60, 0.15) 0%,
            rgba(180, 120, 40, 0.05) 50%,
            transparent 70%)`,
          filter: "blur(40px)",
          animation: "sn-ember-glow 15s ease-in-out infinite",
        }}
      />

      {/* Branch-like organic structure — left side */}
      <div
        style={{
          ...parallaxVars,
          position: "absolute",
          left: "-5%",
          top: "5%",
          width: "35%",
          height: "90%",
          background: `
            radial-gradient(ellipse 30% 80% at 80% 50%,
              rgba(140, 100, 40, 0.2) 0%,
              rgba(100, 70, 30, 0.08) 50%,
              transparent 70%),
            radial-gradient(ellipse 20% 60% at 90% 30%,
              rgba(160, 110, 50, 0.15) 0%,
              transparent 60%),
            radial-gradient(ellipse 25% 50% at 85% 70%,
              rgba(120, 80, 30, 0.12) 0%,
              transparent 55%)
          `,
          filter: "blur(15px)",
          animation: "sn-branch-sway-1 20s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Branch-like organic structure — right side */}
      <div
        style={{
          ...parallaxVars,
          position: "absolute",
          right: "-5%",
          top: "10%",
          width: "30%",
          height: "85%",
          background: `
            radial-gradient(ellipse 35% 70% at 20% 45%,
              rgba(130, 90, 35, 0.18) 0%,
              rgba(90, 60, 25, 0.06) 55%,
              transparent 70%),
            radial-gradient(ellipse 20% 50% at 15% 65%,
              rgba(150, 105, 45, 0.12) 0%,
              transparent 55%)
          `,
          filter: "blur(12px)",
          animation: "sn-branch-sway-2 25s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Warm ember accents — scattered glow spots */}
      <div
        style={{
          ...parallaxVars,
          position: "absolute",
          left: "40%",
          top: "15%",
          width: "25%",
          height: "20%",
          background: `radial-gradient(circle at 50% 50%,
            rgba(220, 160, 60, 0.12) 0%,
            rgba(200, 140, 50, 0.03) 50%,
            transparent 65%)`,
          filter: "blur(25px)",
          animation: "sn-ember-glow 12s ease-in-out 2s infinite",
        }}
      />
      <div
        style={{
          ...parallaxVars,
          position: "absolute",
          right: "20%",
          bottom: "20%",
          width: "20%",
          height: "25%",
          background: `radial-gradient(circle at 50% 50%,
            rgba(200, 120, 40, 0.1) 0%,
            rgba(180, 100, 30, 0.03) 50%,
            transparent 60%)`,
          filter: "blur(30px)",
        }}
      />
    </div>
  );
};