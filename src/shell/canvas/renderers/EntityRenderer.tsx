/**
 * Entity renderer dispatcher — routes to the correct renderer by entity type.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React from 'react';

import type { CanvasEntity } from '@sn/types';

import { AudioRenderer } from './AudioRenderer';
import { DockerRenderer } from './DockerRenderer';
import { DrawingRenderer } from './DrawingRenderer';
import { GroupRenderer } from './GroupRenderer';
import { LottieRenderer } from './LottieRenderer';
import { ShapeRenderer } from './ShapeRenderer';
import { StickerRenderer } from './StickerRenderer';
import { SvgRenderer } from './SvgRenderer';
import { TextRenderer } from './TextRenderer';
import { WidgetRenderer } from './WidgetRenderer';

export interface EntityRendererProps {
  entity: CanvasEntity;
  isSelected: boolean;
  /** Widget HTML source — required when entity.type === 'widget' */
  widgetHtml?: string;
  /** Theme tokens — forwarded to WidgetRenderer */
  theme?: Record<string, string>;
  /** Canvas interaction mode — forwarded to WidgetRenderer */
  interactionMode?: 'edit' | 'preview';
}

/**
 * Dispatches rendering to the correct type-specific renderer.
 * Uses a switch on the discriminated `entity.type` field.
 */
export const EntityRenderer: React.FC<EntityRendererProps> = ({
  entity,
  isSelected,
  widgetHtml,
  theme,
  interactionMode = 'edit',
}) => {
  switch (entity.type) {
    case 'sticker':
      return <StickerRenderer entity={entity} isSelected={isSelected} />;

    case 'lottie':
      return <LottieRenderer entity={entity} isSelected={isSelected} />;

    case 'text':
      return <TextRenderer entity={entity} isSelected={isSelected} />;

    case 'widget':
      return (
        <WidgetRenderer
          entity={entity}
          isSelected={isSelected}
          widgetHtml={widgetHtml ?? ''}
          theme={theme ?? {}}
          interactionMode={interactionMode}
        />
      );

    case 'shape':
      return <ShapeRenderer entity={entity} isSelected={isSelected} />;

    case 'drawing':
      return <DrawingRenderer entity={entity} isSelected={isSelected} />;

    case 'group':
      return <GroupRenderer entity={entity} isSelected={isSelected} />;

    case 'docker':
      return <DockerRenderer entity={entity} isSelected={isSelected} />;

    case 'audio':
      return <AudioRenderer entity={entity} isSelected={isSelected} />;

    case 'svg':
      return <SvgRenderer entity={entity} isSelected={isSelected} />;

    default: {
      // Exhaustiveness check — TypeScript will error if a case is missed
      const _exhaustive: never = entity;
      return null;
    }
  }
};
