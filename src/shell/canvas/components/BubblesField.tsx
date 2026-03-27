/**
 * BubblesField — Floating soap bubbles over a sky gradient.
 *
 * Renders transparent iridescent bubbles drifting upward against a soft
 * blue sky with wispy cloud shapes. Uses HTML5 Canvas for bubble particles
 * and CSS gradients for the sky/cloud backdrop.
 *
 * Performance: Canvas runs at ~30fps. Sky gradient and clouds are static CSS.
 *
 * @module shell/canvas/components
 * @layer L6
 */

import React, { useEffect, useRef, useState } from "react";

interface Bubble {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  wobblePhase: number;
  wobbleSpeed: number;
  shimmerPhase: number;
  opacity: number;
}

function createBubble(width: number, height: number, fromBottom = true): Bubble {
  return {
    x: Math.random() * width,
    y: fromBottom ? height + Math.random() * 100 : Math.random() * height,
    r: Math.random() * 50 + 15,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -(Math.random() * 0.5 + 0.2),
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.02 + 0.008,
    shimmerPhase: Math.random() * Math.PI * 2,
    opacity: Math.random() * 0.3 + 0.15,
  };
}

function drawBubble(ctx: CanvasRenderingContext2D, b: Bubble) {
  const { x, y, r, shimmerPhase, opacity } = b;

  // Main bubble body — very transparent
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(200, 230, 255, ${opacity * 0.15})`;
  ctx.fill();

  // Bubble edge highlight — thin iridescent rim
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(180, 220, 255, ${opacity * 0.6})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner gradient for glass effect
  const grad = ctx.createRadialGradient(
    x - r * 0.3, y - r * 0.3, r * 0.05,
    x, y, r
  );
  grad.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.35})`);
  grad.addColorStop(0.4, `rgba(200, 230, 255, ${opacity * 0.08})`);
  grad.addColorStop(0.7, `rgba(180, 200, 240, ${opacity * 0.04})`);
  grad.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Shimmer highlight — small bright spot that moves
  const shimmerX = x - r * 0.25 + Math.sin(shimmerPhase) * r * 0.15;
  const shimmerY = y - r * 0.25 + Math.cos(shimmerPhase) * r * 0.1;
  const shimmerR = r * 0.18;
  ctx.beginPath();
  ctx.arc(shimmerX, shimmerY, shimmerR, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
  ctx.fill();

  // Secondary shimmer (bottom-right, rainbow tint)
  const rainbow = Math.sin(shimmerPhase * 0.7) * 0.5 + 0.5;
  const rr = Math.floor(180 + rainbow * 75);
  const rg = Math.floor(200 + (1 - rainbow) * 55);
  const rb = 255;
  ctx.beginPath();
  ctx.arc(x + r * 0.2, y + r * 0.15, r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${rr}, ${rg}, ${rb}, ${opacity * 0.25})`;
  ctx.fill();
}

export interface BubblesFieldProps {
  enabled?: boolean;
  mouse?: { x: number; y: number };
}

export const BubblesField: React.FC<BubblesFieldProps> = ({
  enabled = true,
  mouse,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const [size, setSize] = useState({ width: 1920, height: 1080 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Initialize bubbles
  useEffect(() => {
    if (!enabled || !size.width) return;
    const count = Math.min(Math.floor((size.width * size.height) / 25000), 30);
    bubblesRef.current = Array.from({ length: count }, () =>
      createBubble(size.width, size.height, false)
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

      const mx = mouse?.x ?? 0;

      for (let i = bubblesRef.current.length - 1; i >= 0; i--) {
        const b = bubblesRef.current[i];

        // Movement
        b.y += b.vy;
        b.x += b.vx + Math.sin(b.wobblePhase) * 0.3;
        b.wobblePhase += b.wobbleSpeed;
        b.shimmerPhase += 0.015;

        // Gentle wind from mouse
        b.x += mx * 0.15;

        // Recycle if off-screen top
        if (b.y + b.r < -50) {
          bubblesRef.current[i] = createBubble(size.width, size.height, true);
        }

        drawBubble(ctx, b);
      }

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [enabled, size, mouse]);

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      data-testid="bubbles-field"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Sky gradient — soft blue with warm horizon */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg,
            #5BA8D4 0%,
            #7EC8E8 25%,
            #A8DDF0 45%,
            #C8EAF5 60%,
            #E8F4FA 75%,
            #F0F0EC 100%)`,
        }}
      />

      {/* Cloud layer 1 — large soft cloud shapes */}
      <div
        style={{
          position: "absolute",
          left: "5%",
          top: "10%",
          width: "50%",
          height: "25%",
          background: `radial-gradient(ellipse 100% 60% at 50% 50%,
            rgba(255, 255, 255, 0.7) 0%,
            rgba(255, 255, 255, 0.3) 40%,
            transparent 70%)`,
          filter: "blur(25px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "0%",
          top: "5%",
          width: "40%",
          height: "20%",
          background: `radial-gradient(ellipse 100% 70% at 50% 50%,
            rgba(255, 255, 255, 0.6) 0%,
            rgba(255, 255, 255, 0.2) 45%,
            transparent 70%)`,
          filter: "blur(30px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "30%",
          top: "25%",
          width: "35%",
          height: "15%",
          background: `radial-gradient(ellipse 100% 80% at 50% 50%,
            rgba(255, 255, 255, 0.5) 0%,
            rgba(255, 255, 255, 0.15) 50%,
            transparent 70%)`,
          filter: "blur(20px)",
        }}
      />

      {/* Cloud layer 2 — wispy high clouds */}
      <div
        style={{
          position: "absolute",
          left: "60%",
          top: "15%",
          width: "45%",
          height: "12%",
          background: `radial-gradient(ellipse 120% 50% at 50% 50%,
            rgba(255, 255, 255, 0.4) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            transparent 70%)`,
          filter: "blur(20px)",
        }}
      />
    </div>
  );
};