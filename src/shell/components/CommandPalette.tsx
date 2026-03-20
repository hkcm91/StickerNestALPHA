/**
 * CommandPalette — P15: Search is a portal, not a filter.
 *
 * Cmd+K opens a centered search portal with backdrop dim. Widgets, actions,
 * settings — everything is one keystroke away. Results categorize themselves.
 *
 * @module shell/components
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

import { bus } from "../../kernel/bus";
import { useUIStore } from "../../kernel/stores/ui/ui.store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaletteResult {
  id: string;
  label: string;
  category: "widget" | "action" | "setting" | "canvas";
  icon?: string;
  shortcut?: string;
  action: () => void;
}

export interface CommandPaletteProps {
  /** Additional results to include (e.g., from marketplace) */
  extraResults?: PaletteResult[];
}

// ---------------------------------------------------------------------------
// Built-in results
// ---------------------------------------------------------------------------

function getBuiltinResults(): PaletteResult[] {
  return [
    {
      id: "new-canvas",
      label: "New canvas",
      category: "action",
      icon: "+",
      action: () => bus.emit("shell.action.newCanvas", {}),
    },
    {
      id: "toggle-grid",
      label: "Toggle grid",
      category: "setting",
      icon: "⊞",
      shortcut: "G",
      action: () => bus.emit("grid.toggled", { enabled: true }),
    },
    {
      id: "toggle-theme",
      label: "Toggle dark mode",
      category: "setting",
      icon: "◐",
      action: () => {
        const current = useUIStore.getState().theme;
        bus.emit("shell.theme.changed", {
          theme: current === "dark" ? "light" : "dark",
          tokens: {},
        });
      },
    },
    {
      id: "open-marketplace",
      label: "Open marketplace",
      category: "action",
      icon: "◈",
      action: () => bus.emit("shell.navigate", { path: "/marketplace" }),
    },
    {
      id: "open-lab",
      label: "Open Widget Lab",
      category: "action",
      icon: "⬡",
      action: () => bus.emit("shell.navigate", { path: "/lab" }),
    },
    {
      id: "undo",
      label: "Undo",
      category: "action",
      icon: "↩",
      shortcut: "⌘Z",
      action: () => bus.emit("history.undo", {}),
    },
    {
      id: "redo",
      label: "Redo",
      category: "action",
      icon: "↪",
      shortcut: "⌘⇧Z",
      action: () => bus.emit("history.redo", {}),
    },
  ];
}

// ---------------------------------------------------------------------------
// Category labels
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  widget: "Widgets",
  action: "Actions",
  setting: "Settings",
  canvas: "Canvases",
};

const CATEGORY_ORDER = ["widget", "canvas", "action", "setting"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  extraResults = [],
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open on Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setQuery("");
        setActiveIndex(0);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Also open via bus event
  useEffect(() => {
    const unsub = bus.subscribe("shell.commandPalette.open", () => {
      setOpen(true);
      setQuery("");
      setActiveIndex(0);
    });
    return unsub;
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  // Build and filter results
  const allResults = [...getBuiltinResults(), ...extraResults];
  const filtered = query.trim()
    ? allResults.filter((r) =>
        r.label.toLowerCase().includes(query.toLowerCase()),
      )
    : allResults;

  // Group by category
  const grouped = CATEGORY_ORDER
    .map((cat) => ({
      category: cat,
      results: filtered.filter((r) => r.category === cat),
    }))
    .filter((g) => g.results.length > 0);

  // Flatten for keyboard navigation
  const flatResults = grouped.flatMap((g) => g.results);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatResults[activeIndex]) {
      flatResults[activeIndex].action();
      close();
    }
  };

  if (!open) return null;

  return (
    <div
      data-testid="command-palette"
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "min(15vh, 120px)",
        zIndex: 100000,
        animation: "sn-backdrop-in 0.2s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: "calc(100vw - 32px)",
          background: "color-mix(in srgb, var(--sn-surface-raised, #1A1A1F) 96%, transparent)",
          borderRadius: 18,
          border: "1px solid var(--sn-border-hover, rgba(255,255,255,0.08))",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.15)",
          animation: "sn-search-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
          overflow: "hidden",
          backdropFilter: "blur(24px) saturate(1.3)",
        }}
      >
        {/* Input area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
            borderBottom: "1px solid var(--sn-border, rgba(255,255,255,0.04))",
          }}
        >
          <span style={{ color: "var(--sn-text-faint, #3A3842)", fontSize: 16 }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search widgets, actions, settings..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--sn-text, #EDEBE6)",
              fontSize: 15,
              fontFamily: "inherit",
            }}
          />
          <span
            onClick={close}
            style={{
              fontSize: 10,
              color: "var(--sn-text-faint, #3A3842)",
              fontFamily: "'DM Mono', monospace",
              cursor: "pointer",
              padding: "3px 8px",
              borderRadius: 5,
              background: "color-mix(in srgb, var(--sn-text-faint, #3A3842) 18%, transparent)",
            }}
          >
            ESC
          </span>
        </div>

        {/* Results */}
        <div style={{ padding: 6, maxHeight: 340, overflow: "auto" }}>
          {grouped.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "20px 16px",
                fontSize: 13,
                color: "var(--sn-text-muted, #6B6878)",
              }}
            >
              No results found
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.category}>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--sn-text-faint, #3A3842)",
                  fontFamily: "'DM Mono', monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "8px 14px 4px",
                }}
              >
                {CATEGORY_LABELS[group.category] ?? group.category}
              </div>
              {group.results.map((result) => {
                const idx = flatResults.indexOf(result);
                const isActive = idx === activeIndex;

                return (
                  <div
                    key={result.id}
                    data-testid={`palette-result-${result.id}`}
                    onClick={() => {
                      result.action();
                      close();
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 14px",
                      borderRadius: 9,
                      cursor: "pointer",
                      background: isActive
                        ? "color-mix(in srgb, var(--sn-accent, #4E7B8E) 10%, transparent)"
                        : "transparent",
                      transition: "background 0.12s",
                    }}
                  >
                    {result.icon && (
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: isActive
                            ? "color-mix(in srgb, var(--sn-accent, #4E7B8E) 12%, transparent)"
                            : "color-mix(in srgb, var(--sn-text-faint, #3A3842) 15%, transparent)",
                          fontSize: 13,
                          color: isActive
                            ? "var(--sn-accent, #4E7B8E)"
                            : "var(--sn-text-muted, #6B6878)",
                          transition: "all 0.12s",
                        }}
                      >
                        {result.icon}
                      </span>
                    )}
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: isActive
                          ? "var(--sn-text, #EDEBE6)"
                          : "var(--sn-text-soft, #A8A4AE)",
                        transition: "color 0.12s",
                      }}
                    >
                      {result.label}
                    </span>
                    {result.shortcut && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--sn-text-faint, #3A3842)",
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        {result.shortcut}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
