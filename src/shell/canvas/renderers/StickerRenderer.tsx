/**
 * Sticker entity renderer — images, GIFs, and videos.
 *
 * @remarks
 * Stickers are centered within their bounding box via flexbox.
 * Hover effects are applied based on the entity's hoverEffect setting.
 * Click actions are handled based on the entity's clickAction configuration:
 * - open-url: Opens a URL in a new tab or current tab
 * - launch-widget: Emits event to place a widget on the canvas
 * - emit-event: Emits a custom bus event
 *
 * In edit mode, a settings icon appears on hover allowing access to sticker settings.
 * Click actions work in both edit and preview modes.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React, { useCallback } from 'react';

import type { StickerEntity } from '@sn/types';

import { bus } from '../../../kernel/bus';

import { entityTransformStyle, RENDER_SIZE_MULTIPLIER } from './entity-style';
import { useAnimationOverlay, getOverlayStyles } from './use-animation-overlay';

/** Event types for sticker click actions */
const StickerActionEvents = {
  WIDGET_LAUNCH_REQUESTED: 'sticker.widget.launch.requested',
  SETTINGS_REQUESTED: 'sticker.settings.requested',
} as const;

export interface StickerRendererProps {
  entity: StickerEntity;
  isSelected: boolean;
  /** Canvas interaction mode — settings icon only shows in edit mode */
  interactionMode?: 'edit' | 'preview';
}

/**
 * Get CSS styles for hover effects.
 */
function getHoverEffectStyle(effect: StickerEntity['hoverEffect']): React.CSSProperties {
  switch (effect) {
    case 'scale':
      return { transition: 'transform 0.15s ease-out' };
    case 'glow':
      return { transition: 'filter 0.15s ease-out' };
    case 'opacity':
      return { transition: 'opacity 0.15s ease-out' };
    default:
      return {};
  }
}

/**
 * Get CSS styles for hover state.
 */
function getHoverStateStyle(effect: StickerEntity['hoverEffect']): React.CSSProperties {
  switch (effect) {
    case 'scale':
      return { transform: 'scale(1.05)' };
    case 'glow':
      return { filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' };
    case 'opacity':
      return { opacity: 0.8 };
    default:
      return {};
  }
}

/**
 * Settings icon component — gear icon for accessing sticker settings.
 */
const SettingsIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

/** Styles for the settings button overlay */
const settingsButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '4px',
  right: '4px',
  width: '28px',
  height: '28px',
  borderRadius: '6px',
  background: 'rgba(0, 0, 0, 0.7)',
  border: 'none',
  color: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0,
  transition: 'opacity 0.15s ease-out',
  zIndex: 10,
};

const settingsButtonHoveredStyle: React.CSSProperties = {
  ...settingsButtonStyle,
  opacity: 1,
};

export const StickerRenderer: React.FC<StickerRendererProps> = ({
  entity,
  isSelected,
  interactionMode = 'edit',
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const animationOverlay = useAnimationOverlay(entity.id);
  const overlayStyles = getOverlayStyles(animationOverlay);
  const style = entityTransformStyle(entity);
  const hoverEffectStyle = getHoverEffectStyle(entity.hoverEffect);
  const hoverStateStyle = isHovered ? getHoverStateStyle(entity.hoverEffect) : {};

  // Show settings icon in edit mode when hovered
  const showSettingsIcon = interactionMode === 'edit' && isHovered && !entity.locked;

  /**
   * Handle settings icon click — opens the sticker settings modal.
   */
  const handleSettingsClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Emit event to request settings modal
      bus.emit(StickerActionEvents.SETTINGS_REQUESTED, {
        entityId: entity.id,
        entity: entity,
      });
    },
    [entity],
  );

  /**
   * Handle click action based on the sticker's clickAction configuration.
   * Works in both edit and preview modes.
   */
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const clickAction = entity.clickAction;
      if (!clickAction || clickAction.type === 'none') {
        return;
      }

      // Prevent default and stop propagation for action clicks
      e.preventDefault();
      e.stopPropagation();

      switch (clickAction.type) {
        case 'open-url':
          if (clickAction.url) {
            if (clickAction.urlNewTab) {
              window.open(clickAction.url, '_blank', 'noopener,noreferrer');
            } else {
              window.location.href = clickAction.url;
            }
          }
          break;

        case 'launch-widget':
          if (clickAction.widgetId) {
            // Emit event to launch widget near the sticker position
            bus.emit(StickerActionEvents.WIDGET_LAUNCH_REQUESTED, {
              widgetId: clickAction.widgetId,
              canvasId: entity.canvasId,
              config: clickAction.widgetConfig ?? {},
              // Position the new widget near the sticker that launched it
              position: {
                x: entity.transform.position.x + entity.transform.size.width / 2 + 20,
                y: entity.transform.position.y,
              },
              sourceStickerId: entity.id,
            });
          }
          break;

        case 'emit-event':
          if (clickAction.eventType) {
            bus.emit(clickAction.eventType, {
              ...clickAction.eventPayload,
              sourceStickerId: entity.id,
              sourceCanvasId: entity.canvasId,
            });
          }
          break;
      }
    },
    [entity],
  );

  // Determine if click is interactive (has a click action)
  const isInteractive = entity.clickAction && entity.clickAction.type !== 'none';

  // Common media styles — centered within the flex container.
  // We render the content at a higher multiplier for sharpness, then scale it down to fit.
  const mediaStyle: React.CSSProperties = {
    width: `${100 * RENDER_SIZE_MULTIPLIER}%`,
    height: `${100 * RENDER_SIZE_MULTIPLIER}%`,
    transform: `scale(${1 / RENDER_SIZE_MULTIPLIER})`,
    transformOrigin: 'center center',
    objectFit: 'contain',
    display: 'block',
    flexShrink: 0,
    ...hoverEffectStyle,
    ...hoverStateStyle,
  };

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="sticker"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...style,
        ...overlayStyles,
        outline: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : undefined,
        cursor: entity.locked ? 'default' : isInteractive ? 'pointer' : 'grab',
      }}
    >
      {/* Settings icon — only visible in edit mode on hover */}
      {interactionMode === 'edit' && (
        <button
          onClick={handleSettingsClick}
          style={showSettingsIcon ? settingsButtonHoveredStyle : settingsButtonStyle}
          title="Sticker settings"
          aria-label="Open sticker settings"
        >
          <SettingsIcon />
        </button>
      )}

      {entity.assetType === 'video' ? (
        <video
          src={entity.assetUrl}
          autoPlay
          loop
          muted
          playsInline
          sty