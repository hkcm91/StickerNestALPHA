/**
 * Hooks and color utilities for the UI Swatches gallery.
 *
 * @module shell/dev/swatches
 * @layer L6
 */

import { useState, useEffect, useCallback, useRef, type RefObject } from 'react';

import { STORAGE_KEY, STAGGER_MS, NAMED_COLORS } from './constants';

// ═══════════════════════════════════════════════════════════════════
// Color Utilities
// ═══════════════════════════════════════════════════════════════════

export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

// ═══════════════════════════════════════════════════════════════════
// Favorites System
// ═══════════════════════════════════════════════════════════════════

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveFavorites(favs: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...favs]));
}

export function useFavorites() {
  const [favs, setFavs] = useState<Set<string>>(() => loadFavorites());
  const toggle = useCallback((id: string) => {
    setFavs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveFavorites(next);
      return next;
    });
  }, []);
  return { favs, toggle, isFav: (id: string) => favs.has(id) };
}

export type FavoritesHook = ReturnType<typeof useFavorites>;

// ═══════════════════════════════════════════════════════════════════
// Stagger Reveal Hook
// ═══════════════════════════════════════════════════════════════════

export function useStaggerReveal(count: number, key?: string): boolean[] {
  const [revealed, setRevealed] = useState<boolean[]>(() => Array(count).fill(false));
  useEffect(() => {
    setRevealed(Array(count).fill(false));
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < count; i++) {
      timers.push(setTimeout(() => {
        setRevealed(prev => { const next = [...prev]; next[i] = true; return next; });
      }, i * STAGGER_MS + 50));
    }
    return () => timers.forEach(clearTimeout);
  }, [count, key]);
  return revealed;
}

// ═══════════════════════════════════════════════════════════════════
// Color Playground Hook
// ═══════════════════════════════════════════════════════════════════

export function useColorPlayground() {
  const [overrides, setOverrides] = useState<Record<string, [number, number, number]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const setHsl = useCallback((id: string, hsl: [number, number, number]) => {
    const def = NAMED_COLORS.find(c => c.id === id);
    if (!def) return;
    document.documentElement.style.setProperty(def.cssVar, hslToHex(hsl[0], hsl[1], hsl[2]));
    setOverrides(prev => ({ ...prev, [id]: hsl }));
  }, []);

  const reset = useCallback((id: string) => {
    const def = NAMED_COLORS.find(c => c.id === id);
    if (!def) return;
    document.documentElement.style.setProperty(def.cssVar, def.hex);
    setOverrides(prev => { const next = { ...prev }; delete next[id]; return next; });
  }, []);

  const getHsl = useCallback((id: string): [number, number, number] => {
    if (overrides[id]) return overrides[id];
    const def = NAMED_COLORS.find(c => c.id === id);
    return def ? hexToHsl(def.hex) : [0, 0, 50];
  }, [overrides]);

  const isModified = useCallback((id: string) => id in overrides, [overrides]);
  const toggleExpanded = useCallback((id: string) => setExpandedId(p => p === id ? null : id), []);

  return { setHsl, reset, getHsl, isModified, expandedId, toggleExpanded };
}

export type ColorPlaygroundHook = ReturnType<typeof useColorPlayground>;

// ═══════════════════════════════════════════════════════════════════
// Relative Mouse Position (throttled 30fps)
// ═══════════════════════════════════════════════════════════════════

export function useRelativeMouse(ref: RefObject<HTMLElement | null>): { x: number; y: number; isInside: boolean } {
  const [pos, setPos] = useState({ x: 0, y: 0, isInside: false });
  const lastUpdate = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastUpdate.current < 33) return;
      lastUpdate.current = now;
      const rect = el.getBoundingClientRect();
      setPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        isInside: true,
      });
    };
    const onLeave = () => setPos(p => ({ ...p, isInside: false }));
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, [ref]);

  return pos;
}

// ═══════════════════════════════════════════════════════════════════
// Bioluminescent Button Ripple
// ═══════════════════════════════════════════════════════════════════

interface Ripple { x: number; y: number; id: number }

export function useRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);

  const trigger = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ripple: Ripple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: nextId.current++ };
    setRipples(prev => [...prev, ripple]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== ripple.id)), 600);
  }, []);

  return { ripples, trigger };
}
