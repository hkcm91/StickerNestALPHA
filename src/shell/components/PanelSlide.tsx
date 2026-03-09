/**
 * PanelSlide — P14: Panels slide like curtains, not drawers.
 *
 * Wraps a side panel with curtain-style animation. The panel slides in,
 * then its content staggers in after the panel finishes arriving.
 * Closing reverses: content fades, panel slides out.
 *
 * @module shell/components
 * @layer L6
 */

import React, { useEffect, useState } from "react";

export interface PanelSlideProps {
  /** Whether the panel is open */
  open: boolean;
  /** Panel width in pixels */
  width?: number;
  /** Which side the panel slides from */
  side?: "left" | "right";
  /** Optional panel title */
  title?: string;
  /** Panel content */
  children: React.ReactNode;
  /** Called when user requests close */
  onClose?: () => void;
}

/**
 * Animating side panel with curtain entry and staggered content.
 */
export const PanelSlide: React.FC<PanelSlideProps> = ({
  open,
  width = 280,
  side = "right",
  title,
  children,
  onClose,
}) => {
  // Track "content visible" separately for the two-phase animation:
  // Phase 1: panel slides in
  // Phase 2: content fades in after a delay
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setContentVisible(true), 200);
      return () => clearTimeout(timer);
    } else {
      setContentVisible(false);
    }
  }, [open]);

  return (
    <div
      data-testid={`panel-slide-${side}`}
      style={{
        width: open ? width : 0,
        flexShrink: 0,
        overflow: "hidden",
        transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        borderLeft: side === "right" ? "1px solid var(--sn-border, rgba(255,255,255,0.04))" : "none",
        borderRight: side === "left" ? "1px solid var(--sn-border, rgba(255,255,255,0.04))" : "none",
        background: "var(--sn-surface, #131317)",
      }}
    >
      <div
        style={{
          width,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          opacity: contentVisible ? 1 : 0,
          transform: contentVisible
            ? "translateX(0)"
            : side === "right"
              ? "translateX(20px)"
              : "translateX(-20px)",
          transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDelay: contentVisible ? "0.1s" : "0s",
        }}
      >
        {/* Panel header */}
        {(title || onClose) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "1px solid var(--sn-border, rgba(255,255,255,0.04))",
              flexShrink: 0,
            }}
          >
            {title && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--sn-text-muted, #6B6878)",
                  fontFamily: "'DM Mono', monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {title}
              </span>
            )}
            {onClose && (
              <span
                onClick={onClose}
                style={{
                  fontSize: 14,
                  color: "var(--sn-text-muted, #6B6878)",
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                ✕
              </span>
            )}
          </div>
        )}

        {/* Staggered content */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PanelSlideItem — child items that stagger in
// ---------------------------------------------------------------------------

export interface PanelSlideItemProps {
  /** Stagger index (0, 1, 2, ...) */
  index: number;
  /** Whether the parent panel is visible */
  visible: boolean;
  children: React.ReactNode;
}

/**
 * Individual panel item with staggered entry animation.
 * Use inside PanelSlide for consistent stagger timing.
 */
export const PanelSlideItem: React.FC<PanelSlideItemProps> = ({
  index,
  visible,
  children,
}) => (
  <div
    style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(0)" : "translateX(10px)",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      transitionDelay: visible ? `${0.15 + index * 0.05}s` : "0s",
    }}
  >
    {children}
  </div>
);
