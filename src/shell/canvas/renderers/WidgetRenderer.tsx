/**
 * Widget container entity renderer — wraps WidgetFrame from Runtime.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React, { useEffect, useState } from 'react';

import type { WidgetContainerEntity } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { WidgetFrame, InlineWidgetFrame } from '../../../runtime';
import { BUILT_IN_WIDGET_COMPONENTS } from '../../../runtime/widgets';

import { entityTransformStyle, RENDER_SIZE_MULTIPLIER } from './entity-style';

export interface WidgetRendererProps {
  entity: WidgetContainerEntity;
  isSelected: boolean;
  widgetHtml: string;
  theme: Record<string, string>;
  interactionMode: 'edit' | 'preview';
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  entity,
  isSelected,
  widgetHtml,
  theme,
  interactionMode,
}) => {
  const style = entityTransformStyle(entity);
  const BuiltInComponent = BUILT_IN_WIDGET_COMPONENTS[entity.widgetId];

  // Track cross-canvas connection status for this widget instance
  const [xcChannels, setXcChannels] = useState<string[]>([]);
  useEffect(() => {
    const unsub = bus.subscribe('crossCanvas.widget.status', (event: unknown) => {
      const e = event as { payload: { instanceId: string; channels: string[]; active: boolean } };
      if (e.payload.instanceId === entity.widgetInstanceId) {
        setXcChannels(e.payload.channels);
      }
    });
    return unsub;
  }, [entity.widgetInstanceId]);

  // In edit mode, we show a drag handle at the top.
  // The rest of the widget is interactive.
  const isEditMode = interactionMode === 'edit';
  const showHandle = isEditMode && !entity.locked;
  const handleHeight = 28;

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="widget"
      style={{
        ...style,
        outline: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : undefined,
        // In edit mode, we want pointer events to pass through to sub-elements
        pointerEvents: isEditMode ? 'auto' : undefined,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Drag Handle Bar — only in edit mode */}
      {showHandle && (
        <div
          data-widget-drag-handle="true"
          style={{
            height: `${handleHeight}px`,
            width: '100%',
            background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0, 0, 0, 0.03)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          {/* Cross-canvas connection indicator */}
          {xcChannels.length > 0 && (
            <div
              title={`Cross-canvas: ${xcChannels.join(', ')}`}
              style={{
                position: 'absolute',
                left: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 6px rgba(34, 197, 94, 0.5)',
              }}
            />
          )}
          {/* Drag indicator dots */}
          <div style={{ display: 'flex', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  width: '3px',
                  height: '3px',
                  borderRadius: '50%',
                  background: isSelected ? 'var(--sn-accent, #3b82f6)' : '#94a3b8',
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div 
        style={{ 
          flex: 1, 
          position: 'relative', 
          width: '100%',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${100 * RENDER_SIZE_MULTIPLIER}%`,
            height: `${100 * RENDER_SIZE_MULTIPLIER}%`,
            transform: `scale(${1 / RENDER_SIZE_MULTIPLIER})`,
            transformOrigin: 'top left',
          }}
        >
          {BuiltInComponent ? (
            <InlineWidgetFrame
              widgetId={entity.widgetId}
              instanceId={entity.widgetInstanceId}
              Component={BuiltInComponent}
              config={entity.config}
              theme={theme as any}
              visible={entity.visible}
              width={entity.transform.size.width * RENDER_SIZE_MULTIPLIER}
              height={(entity.transform.size.height - (showHandle ? handleHeight : 0)) * RENDER_SIZE_MULTIPLIER}
            />
          ) : (
            <WidgetFrame
              widgetId={entity.widgetId}
              instanceId={entity.widgetInstanceId}
              widgetHtml={widgetHtml}
              config={entity.config}
              theme={theme as any}
              visible={entity.visible}
              width={entity.transform.size.width * RENDER_SIZE_MULTIPLIER}
              height={(entity.transform.size.height - (showHandle ? handleHeight : 0)) * RENDER_SIZE_MULTIPLIER}
            />
          )}
        </div>
      </div>
    </div>
  );
};
