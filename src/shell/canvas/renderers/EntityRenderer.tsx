/**
 * Entity renderer dispatcher routes to the correct renderer by entity type.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React from "react";

import type { CanvasEntity } from "@sn/types";

import { AudioRenderer } from "./AudioRenderer";
import { DockerRenderer } from "./DockerRenderer";
import { DrawingRenderer } from "./DrawingRenderer";
import { GroupRenderer } from "./GroupRenderer";
import { LottieRenderer } from "./LottieRenderer";
import { Object3DRenderer } from "./Object3DRenderer";
import { PathRenderer } from "./PathRenderer";
import { ShapeRenderer } from "./ShapeRenderer";
import { StickerRenderer } from "./StickerRenderer";
import { SvgRenderer } from "./SvgRenderer";
import { TextRenderer } from "./TextRenderer";
import { WidgetRenderer } from "./WidgetRenderer";

export interface EntityRendererProps {
  entity: CanvasEntity;
  isSelected: boolean;
  /** Docker folder open state, only used when entity.type === 'docker'. */
  folderOpen?: boolean;
  /** Children entities to render inside an open docker folder. */
  childrenEntities?: CanvasEntity[];
  /** Function to render an individual entity (avoids circular dependency). */
  renderChild?: (entity: CanvasEntity) => React.ReactNode;
  /** Widget HTML source, required when entity.type === 'widget'. */
  widgetHtml?: string;
  /** Theme tokens, forwarded to WidgetRenderer. */
  theme?: Record<string, string>;
  /** Canvas interaction mode, forwarded to WidgetRenderer. */
  interactionMode?: "edit" | "preview";
}

/**
 * Dispatches rendering to the correct type-specific renderer.
 */
export const EntityRenderer: React.FC<EntityRendererProps> = ({
  entity,
  isSelected,
  folderOpen = false,
  childrenEntities = [],
  renderChild,
  widgetHtml,
  theme,
  interactionMode = "edit",
}) => {
  const renderWithAutoPointer = (children: React.ReactNode) => (
    <div style={{ pointerEvents: 'auto', display: 'contents' }}>
      {children}
    </div>
  );

  let rendered: React.ReactNode = null;

  switch (entity.type) {
    case "sticker":
      rendered = (
        <StickerRenderer
          entity={entity}
          isSelected={isSelected}
          interactionMode={interactionMode}
        />
      );
      break;

    case "lottie":
      rendered = <LottieRenderer entity={entity} isSelected={isSelected} />;
      break;

    case "text":
      rendered = <TextRenderer entity={entity} isSelected={isSelected} />;
      break;

    case "widget":
      rendered = (
        <WidgetRenderer
          entity={entity}
          isSelected={isSelected}
          widgetHtml={widgetHtml ?? ""}
          theme={theme ?? {}}
          interactionMode={interactionMode}
        />
      );
      break;

    case "shape":
      rendered = <ShapeRenderer entity={entity} isSelected={isSelected} />;
      break;

    case "drawing":
      rendered = <DrawingRenderer entity={entity} isSelected={isSelected} />;
      break;

    case "group":
      rendered = <GroupRenderer entity={entity} isSelected={isSelected} />;
      break;

    case "docker":
      rendered = (
        <DockerRenderer
          entity={entity}
          isSelected={isSelected}
          isOpen={folderOpen}
          childrenEntities={childrenEntities}
          renderEntity={renderChild}
        />
      );
      break;

    case "audio":
      rendered = <AudioRenderer entity={entity} isSelected={isSelected} />;
      break;

    case "svg":
      rendered = <SvgRenderer entity={entity} isSelected={isSelected} />;
      break;

    case "path":
      rendered = <PathRenderer entity={entity} isSelected={isSelected} />;
      break;

    case "object3d":
      rendered = <Object3DRenderer entity={entity} />;
      break;

    default: {
      rendered = null;
    }
  }

  return rendered ? renderWithAutoPointer(rendered) : null;
};
