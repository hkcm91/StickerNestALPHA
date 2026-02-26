import React from "react";

import type { Object3DEntity } from "@sn/types";

export interface Object3DRendererProps {
  entity: Object3DEntity;
}

export const Object3DRenderer: React.FC<Object3DRendererProps> = ({
  entity,
}) => {
  // A simple 2D representation of the 3D object for the 2D canvas
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: entity.color || "#cccccc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: "bold",
        color: "#fff",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
        borderRadius: entity.primitive === "sphere" ? "50%" : "8px",
        border: "2px solid rgba(0,0,0,0.5)",
      }}
    >
      3D {entity.primitive}
    </div>
  );
};
