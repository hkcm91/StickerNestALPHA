/**
 * Focus Overlay — cinematic focus mode with carousel navigation.
 *
 * Centers and scales the active widget to ~80% of the viewport.
 * Background gets a Gaussian blur + dark overlay. Supports carousel
 * navigation via arrow keys and horizontal swipe gestures.
 *
 * @module shell/canvas/components
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { CanvasEntity } from '@sn/types';

import { useUIStore } from '../../../kernel/stores/ui/ui.store';
import { EntityRenderer } from '../renderers/EntityRenderer';

export interface FocusOverlayProps {
  /** Ordered entity IDs in the carousel */
  focusedEntityIds: string[];
  /** Index of the currently active entity */
  activeIndex: number;
  /** All entities on the canvas (to look up focused ones) */
  entities: CanvasEntity[];
  /** Widget HTML lookup */
  widgetHtmlMap?: Map<string, string>;
  /** Theme tokens for widget rendering */
  theme?: Record<string, string>;
}

/** Minimum horizontal swipe distance (px) to trigger navigation */
const SWIPE_THRESHOLD = 50;

/**
 * Focus mode overlay — renders above the canvas with blur backdrop.
 */
export const FocusOverlay: React.FC<FocusOverlayProps> = ({
  focusedEntityIds,
  activeIndex,
  entities,
  widgetHtmlMap,
  theme,
}) => {
  const exitFocusMode = useUIStore((s) => s.exitFocusMode);
  const focusNavigate = useUIStore((s) => s.focusNavigate);

  // Resolve the active entity
  const activeEntityId = focusedEntityIds[activeIndex];
  const activeEntity = entities.find((e) => e.id === activeEntityId);

  // Animation state
  const [visible, setVisible] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'none' | 'left' | 'right'>('none');

  // Swipe tracking
  const pointerStartX = useRef<number | null>(null);

  // Trigger entry animation on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Reset slide direction after transition
  useEffect(() => {
    if (slideDirection !== 'none') {
      const timer = setTimeout(() => setSlideDirection('none'), 250);
      return () => clearTimeout(timer);
    }
  }, [slideDirection, activeIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setVisible(false);
        setTimeout(exitFocusMode, 300);
        return;
      }
      if (focusedEntityIds.length > 1) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setSlideDirection('left');
          focusNavigate('next');
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setSlideDirection('right');
          focusNavigate('prev');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [focusedEntityIds.length, exitFocusMode, focusNavigate]);

  // Backdrop click exits
  const handleBackdropClick = useCallback(() => {
    setVisible(false);
    setTimeout(exitFocusMode, 300);
  }, [exitFocusMode]);

  // Swipe gesture handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only track swipes on the overlay area, not on the widget itself
    if ((e.target as HTMLElement).closest('[data-focus-widget]')) return;
    pointerStartX.current = e.clientX;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (pointerStartX.current === null) return;
    const delta = e.clientX - pointerStartX.current;
    pointerStartX.current = null;

    if (focusedEntityIds.length <= 1) return;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      if (delta < 0) {
        setSlideDirection('left');
        focusNavigate('next');
      } else {
        setSlideDirection('right');
        focusNavigate('prev');
      }
    }
  }, [focusedEntityIds.length, focusNavigate]);

  if (!activeEntity) return null;

  // Clone entity with position zeroed to container origin.
  // entityTransformStyle uses center-based positioning:
  //   left = position.x - width/2, top = position.y - height/2
  // Setting position to (width/2, height/2) makes left=0, top=0
  const focusEntity: CanvasEntity = {
    ...activeEntity,
    transform: {
      ...activeEntity.transform,
      position: {
        x: activeEntity.transform.size.width / 2,
        y: activeEntity.transform.size.height / 2,
      },
      rotation: 0,
      scale: 1,
    },
  };

  // Compute scale: fit entity to 80% of viewport
  const entityWidth = activeEntity.transform.size.width;
  const entityHeight = activeEntity.transform.size.height;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scale = Math.min(
    (viewportWidth * 0.8) / Math.max(entityWidth, 1),
    (viewportHeight * 0.8) / Math.max(entityHeight, 1),
    // Don't scale up beyond 3x to avoid pixelation
    3,
  );

  const widgetHtml = activeEntity.type === 'widget' && widgetHtmlMap
    ? widgetHtmlMap.get(activeEntity.widgetInstanceId)
    : undefined;

  // Slide animation transform
  const slideTransform = slideDirection === 'left'
    ? 'translateX(-20px)'
    : slideDirection === 'right'
      ? 'translateX(20px)'
      : 'translateX(0)';

  return (
    <div
      data-testid="focus-overlay"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Entry/exit animation
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease-out',
      }}
    >
      {/* Backdrop: blur + dim */}
      <div
        data-testid="focus-backdrop"
        onClick={handleBackdropClick}
        style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      />

      {/* Focused widget container */}
      <div
        data-testid="focus-widget-container"
        data-focus-widget
        style={{
          position: 'relative',
          zIndex: 1,
          width: entityWidth,
          height: entityHeight,
          overflow: 'visible',
          transform: `scale(${scale}) ${slideTransform}`,
          transition: 'transform 250ms ease-out',
          transformOrigin: 'center center',
          // Entry animation
          ...(visible ? {} : { transform: `scale(${scale * 0.9})` }),
        }}
      >
        <EntityRenderer
          entity={focusEntity}
          isSelected={false}
          widgetHtml={widgetHtml}
          theme={theme}
          interactionMode="preview"
        />
      </div>

      {/* Carousel indicators */}
      {focusedEntityIds.length > 1 && (
        <div
          data-testid="focus-carousel-dots"
          style={{
            position: 'absolute',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 8,
            zIndex: 2,
          }}
        >
          {focusedEntityIds.map((id, i) => (
            <div
              key={id}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: i === activeIndex
                  ? 'rgba(255, 255, 255, 0.9)'
                  : 'rgba(255, 255, 255, 0.3)',
                transition: 'background 200ms ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
