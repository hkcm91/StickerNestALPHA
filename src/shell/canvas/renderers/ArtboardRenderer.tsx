/**
 * Artboard renderer — renders a linked canvas document inside an artboard entity.
 * 
 * @module shell/canvas/renderers
 * @layer L6
 */

import React, { useEffect, useState, useMemo } from "react";

import type { ArtboardEntity, CanvasDocument, CanvasEntity } from "@sn/types";

import { themeVar } from "../../theme/theme-vars";
import { readStoredDocument } from "../hooks/usePersistence";

import { entityTransformStyle } from "./entity-style";

export interface ArtboardRendererProps {
  entity: ArtboardEntity;
  isSelected: boolean;
  /** Function to render an individual entity (passed from EntityRenderer to avoid circularity). */
  renderEntity?: (entity: CanvasEntity) => React.ReactNode;
}

export const ArtboardRenderer: React.FC<ArtboardRendererProps> = ({
  entity,
  isSelected,
  renderEntity,
}) => {
  const [childDoc, setChildDoc] = useState<CanvasDocument | null>(null);

  useEffect(() => {
    if (entity.childCanvasSlug) {
      const doc = readStoredDocument(entity.childCanvasSlug);
      setChildDoc(doc);
    }
  }, [entity.childCanvasSlug]);

  const style = useMemo(() => ({
    ...entityTransformStyle(entity),
    background: entity.childCanvasId ? themeVar("--sn-surface") : "rgba(0,0,0,0.05)",
    border: isSelected
      ? `2px solid ${themeVar("--sn-accent")}`
      : `1px solid ${themeVar("--sn-border")}`,
    borderRadius: entity.borderRadius ?? 4,
    overflow: "hidden" as const,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column" as const,
  }), [entity, isSelected]);

  const headerStyle: React.CSSProperties = {
    padding: "4px 8px",
    background: themeVar("--sn-surface-alt"),
    borderBottom: `1px solid ${themeVar("--sn-border")}`,
    fontSize: "11px",
    fontWeight: 600,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  return (
    <div style={style} data-testid={`artboard-${entity.id}`}>
      <div style={headerStyle}>
        <span>{entity.name || "Untitled Artboard"}</span>
        {entity.childCanvasSlug && (
          <a
            href={`/canvas/${entity.childCanvasSlug}`}
            onClick={(e) => {
               // Don't trigger selection when clicking the link
               e.stopPropagation();
            }}
            style={{ color: themeVar("--sn-accent"), textDecoration: "none" }}
          >
            Open ↗
          </a>
        )}
      </div>
      
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {childDoc && renderEntity ? (
           <div style={{ 
             position: "absolute", 
             inset: 0,
             transform: `scale(${Math.min(
               entity.transform.size.width / (childDoc.viewport?.width || 1200),
               entity.transform.size.height / (childDoc.viewport?.height || 800)
             )})`,
             transformOrigin: "top left"
           }}>
             {childDoc.entities.map(renderEntity)}
           </div>
        ) : (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            height: "100%",
            color: themeVar("--sn-text-muted"),
            fontSize: "12px"
          }}>
            {entity.childCanvasSlug ? "Loading..." : "Empty Artboard"}
          </div>
        )}
      </div>
    </div>
  );
};
