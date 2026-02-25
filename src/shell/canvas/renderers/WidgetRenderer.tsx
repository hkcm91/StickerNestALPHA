/**
 * Widget container entity renderer — wraps WidgetFrame from Runtime.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React from 'react';

import type { WidgetContainerEntity } from '@sn/types';

import { WidgetFrame } from '../../../runtime';

import { entityTransformStyle } from './entity-style';

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

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="widget"
      style={{
        ...style,
        outline: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : undefined,
        // In edit mode, overlay captures pointer events so widget doesn't steal focus
        pointerEvents: interactionMode === 'edit' && !entity.locked ? 'auto' : undefined,
      }}
    >
      {/* In edit mode, transparent overlay prevents iframe from capturing clicks */}
      {interactionMode === 'edit' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            cursor: entity.locked ? 'default' : 'grab',
          }}
        />
      )}
      <WidgetFrame
        widgetId={entity.widgetId}
        instanceId={entity.widgetInstanceId}
        widgetHtml={widgetHtml}
        config={entity.config}
        theme={theme}
        visible={entity.visible}
        width={entity.transform.size.width}
        height={entity.transform.size.height}
      />
    </div>
  );
};
