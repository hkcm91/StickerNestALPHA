/**
 * CanvasContextMenu — P10: Context menus are quiet conversations.
 *
 * Appears on right-click with glass surface, rounded corners, grouped items,
 * and warm-colored destructive actions. Fades in with subtle scale animation.
 *
 * @module shell/canvas/components
 * @layer L6
 */

import React, { useCallback, useEffect, useState } from "react";

import { CanvasEvents } from "@sn/types";

import { bus } from "../../../kernel/bus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MenuItemDef {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  destructive?: boolean;
  disabled?: boolean;
}

interface MenuGroup {
  items: MenuItemDef[];
}

export interface CanvasContextMenuProps {
  /** Currently selected entity IDs */
  selectedIds: Set<string>;
  /** Interaction mode */
  interactionMode: "edit" | "preview";
}

// ---------------------------------------------------------------------------
// Menu definitions
// ---------------------------------------------------------------------------

function getEntityMenu(hasMultiple: boolean): MenuGroup[] {
  return [
    {
      items: [
        { id: "cut", label: "Cut", icon: "✂", shortcut: "⌘X" },
        { id: "copy", label: "Copy", icon: "◫", shortcut: "⌘C" },
        { id: "duplicate", label: "Duplicate", icon: "❏", shortcut: "⌘D" },
      ],
    },
    {
      items: [
        { id: "bringToFront", label: "Bring to front", icon: "↑", shortcut: "⌘]" },
        { id: "sendToBack", label: "Send to back", icon: "↓", shortcut: "⌘[" },
        ...(hasMultiple
          ? [{ id: "group", label: "Group", icon: "⊞", shortcut: "⌘G" }]
          : []),
      ],
    },
    {
      items: [
        { id: "lock", label: "Lock", icon: "🔒" },
        { id: "dockToPanel", label: "Dock to panel", icon: "⊟" },
      ],
    },
    {
      items: [
        { id: "delete", label: "Remove", icon: "✕", destructive: true, shortcut: "⌫" },
      ],
    },
  ];
}

function getCanvasMenu(): MenuGroup[] {
  return [
    {
      items: [
        { id: "paste", label: "Paste", icon: "📋", shortcut: "⌘V" },
        { id: "selectAll", label: "Select all", icon: "◻", shortcut: "⌘A" },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  selectedIds,
  interactionMode,
}) => {
  const [state, setState] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    targetEntityId: string | null;
  }>({ visible: false, position: { x: 0, y: 0 }, targetEntityId: null });

  // Listen for context menu bus event
  useEffect(() => {
    const unsub = bus.subscribe(
      "canvas.contextmenu.requested",
      (event: { payload: { x: number; y: number; entityId?: string } }) => {
        if (interactionMode !== "edit") return;
        setState({
          visible: true,
          position: { x: event.payload.x, y: event.payload.y },
          targetEntityId: event.payload.entityId ?? null,
        });
      },
    );

    return unsub;
  }, [interactionMode]);

  // Close on any click or Escape
  useEffect(() => {
    if (!state.visible) return;

    const close = () => setState((s) => ({ ...s, visible: false }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    // Delay listener so the opening right-click doesn't close it
    const id = setTimeout(() => {
      window.addEventListener("click", close);
      window.addEventListener("contextmenu", close);
      window.addEventListener("keydown", onKey);
    }, 10);

    return () => {
      clearTimeout(id);
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [state.visible]);

  const handleAction = useCallback(
    (actionId: string) => {
      const entityId = state.targetEntityId;
      const ids = selectedIds.size > 0 ? Array.from(selectedIds) : (entityId ? [entityId] : []);

      switch (actionId) {
        case "delete":
          for (const id of ids) bus.emit(CanvasEvents.ENTITY_DELETED, { id });
          break;
        case "bringToFront":
          for (const id of ids) bus.emit("canvas.entity.bringToFront", { id });
          break;
        case "sendToBack":
          for (const id of ids) bus.emit("canvas.entity.sendToBack", { id });
          break;
        case "duplicate":
          for (const id of ids) bus.emit("canvas.entity.duplicate", { id });
          break;
        case "group":
          bus.emit("canvas.entity.group", { entityIds: ids });
          break;
        case "lock":
          for (const id of ids) {
            bus.emit(CanvasEvents.ENTITY_UPDATED, { id, updates: { locked: true } });
          }
          break;
        case "dockToPanel":
          bus.emit("docker.widget.dockRequested", { entityIds: ids });
          break;
        case "selectAll":
          bus.emit("canvas.entity.selectAll", {});
          break;
      }

      setState((s) => ({ ...s, visible: false }));
    },
    [state.targetEntityId, selectedIds],
  );

  if (!state.visible) return null;

  const hasEntity = state.targetEntityId !== null || selectedIds.size > 0;
  const groups = hasEntity
    ? getEntityMenu(selectedIds.size > 1)
    : getCanvasMenu();

  return (
    <div
      data-testid="canvas-context-menu"
      style={{
        position: "fixed",
        left: state.position.x,
        top: state.position.y,
        zIndex: 10000,
        animation: "sn-menu-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      <div
        style={{
          background: "color-mix(in srgb, var(--sn-surface-raised, #1A1A1F) 94%, transparent)",
          backdropFilter: "blur(20px) saturate(1.2)",
          borderRadius: 14,
          border: "1px solid var(--sn-border-hover, rgba(255,255,255,0.08))",
          padding: "6px",
          minWidth: 200,
          boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.1)",
        }}
      >
        {groups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && (
              <div
                style={{
                  height: 1,
                  background: "var(--sn-border, rgba(255,255,255,0.04))",
                  margin: "4px 10px",
                }}
              />
            )}
            {group.items.map((item) => (
              <ContextMenuItem
                key={item.id}
                item={item}
                onClick={() => handleAction(item.id)}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Menu item
// ---------------------------------------------------------------------------

const ContextMenuItem: React.FC<{
  item: MenuItemDef;
  onClick: () => void;
}> = ({ item, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-testid={`context-menu-item-${item.id}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!item.disabled) onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 8,
        background: hovered && !item.disabled
          ? "color-mix(in srgb, var(--sn-accent, #4E7B8E) 10%, transparent)"
          : "transparent",
        cursor: item.disabled ? "default" : "pointer",
        opacity: item.disabled ? 0.4 : 1,
        transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {item.icon && (
        <span
          style={{
            fontSize: 12,
            width: 16,
            textAlign: "center",
            color: hovered
              ? item.destructive
                ? "var(--sn-ember, #E8806C)"
                : "var(--sn-text, #EDEBE6)"
              : "var(--sn-text-muted, #6B6878)",
            transition: "color 0.15s",
          }}
        >
          {item.icon}
        </span>
      )}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: hovered
            ? item.destructive
              ? "var(--sn-ember, #E8806C)"
              : "var(--sn-text, #EDEBE6)"
            : "var(--sn-text-soft, #A8A4AE)",
          transition: "color 0.15s",
        }}
      >
        {item.label}
      </span>
      {item.shortcut && (
        <span
          style={{
            fontSize: 10,
            color: "var(--sn-text-faint, #3A3842)",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {item.shortcut}
        </span>
      )}
    </div>
  );
};
