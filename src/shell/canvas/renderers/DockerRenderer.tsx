/**
 * Docker folder renderer.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React from 'react';

import type { CanvasEntity, DockerEntity } from '@sn/types';

import { bus } from '../../../kernel/bus';

import { entityTransformStyle } from './entity-style';
import { WidgetRenderer } from './WidgetRenderer';

const FOLDER_TOGGLE_EVENT = 'canvas.folder.toggled';

export interface DockerRendererProps {
  entity: DockerEntity;
  isSelected: boolean;
  isOpen: boolean;
  /** Children entities to render inside the open folder. */
  childrenEntities?: CanvasEntity[];
  /** Function to render an entity (prevents circular dependency). */
  renderEntity?: (entity: CanvasEntity) => React.ReactNode;
  /** Forwarded for WidgetRenderer support */
  widgetHtml?: string;
  theme?: Record<string, string>;
  interactionMode?: 'edit' | 'preview';
}

export const DockerRenderer: React.FC<DockerRendererProps> = ({
  entity,
  isSelected,
  isOpen,
  childrenEntities = [],
  renderEntity,
  widgetHtml = '',
  theme = {},
  interactionMode = 'edit',
}) => {
  // If the docker specifies a widgetId, use the widget renderer for the entire container
  if (entity.widgetId) {
    return (
      <WidgetRenderer
        entity={{
          ...entity,
          type: 'widget',
          widgetInstanceId: (entity as any).widgetInstanceId || entity.id,
          widgetId: entity.widgetId,
          config: entity.config || {},
        } as any}
        isSelected={isSelected}
        widgetHtml={widgetHtml}
        theme={theme}
        interactionMode={interactionMode}
      />
    );
  }

  const style = entityTransformStyle(entity);

  // Layout-specific rendering
  const isFolderLayout = entity.layout === 'folder';

  if (isOpen || !isFolderLayout) {
    return (
      <div
        data-entity-id={entity.id}
        data-entity-type="docker"
        style={{
          ...style,
          width: Math.max(entity.transform.size.width, isFolderLayout ? 320 : 0),
          height: Math.max(entity.transform.size.height, isFolderLayout ? 240 : 0),
          border: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : '1px solid var(--sn-border, #e5e7eb)',
          borderRadius: 12,
          background: isFolderLayout ? 'var(--sn-bg, #ffffff)' : 'rgba(255,255,255,0.05)',
          boxShadow: isFolderLayout ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: isSelected ? 100 : style.zIndex,
        }}
      >
        {/* Header / Title Bar — only if folder layout */}
        {isFolderLayout && (
          <div
            style={{
              height: 36,
              background: 'var(--sn-bg-soft, #f9fafb)',
              borderBottom: '1px solid var(--sn-border, #e5e7eb)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              userSelect: 'none',
              cursor: 'default',
            }}
          >
            <span style={{ fontSize: 18, marginRight: 8 }}>\uD83D\uDCC2</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--sn-text, #111827)',
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {entity.name ?? 'Folder'}
            </span>
            {/* Window controls */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  bus.emit(FOLDER_TOGGLE_EVENT, { folderId: entity.id });
                }}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#ff5f56',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  color: 'rgba(0,0,0,0.5)',
                }}
              >
                \u2715
              </button>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#ffbd2e' }} />
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#27c93f' }} />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: isFolderLayout ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
            overflow: 'auto',
          }}
        >
          {/* Grid background for content area if folder */}
          {isFolderLayout && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(var(--sn-border, #e5e7eb) 1px, transparent 0)',
                backgroundSize: '20px 20px',
                opacity: 0.5,
              }}
            />
          )}
          
          {/* Render children relative to this container */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {childrenEntities.map((child) => {
              if (!renderEntity) return null;
              
              // Localize child transform to window content area
              const localX = child.transform.position.x - entity.transform.position.x;
              const localY = child.transform.position.y - entity.transform.position.y - (isFolderLayout ? 36 : 0);

              return (
                <div
                  key={child.id}
                  style={{
                    position: 'absolute',
                    left: localX,
                    top: localY,
                  }}
                >
                  {renderEntity(child)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Closed folder (Icon view)
  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="docker"
      style={{
        ...style,
        border: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : '1px solid transparent',
        borderRadius: 8,
        outline: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : undefined,
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
      }}
    >
      <span
        aria-hidden
        style={{
          fontSize: 38,
          lineHeight: 1,
          pointerEvents: 'none',
        }}
      >
        \uD83D\uDCC1
      </span>
      <span
        style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translate(-50%, 2px)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--sn-text, #111827)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {entity.name ?? 'Folder'}
      </span>
    </div>
  );
};
