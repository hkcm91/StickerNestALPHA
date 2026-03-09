/**
 * WidgetStateOverlay — P12: Every widget state tells a story.
 *
 * Loading isn't a spinner. Empty isn't blank. Error isn't a red banner.
 * Each state is intentional, warm, and specific.
 *
 * @module shell/canvas/components
 * @layer L6
 */

import React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WidgetState = "loading" | "empty" | "error" | "syncing";

export interface WidgetStateOverlayProps {
  state: WidgetState;
  /** Widget display name (used in empty and error messages) */
  widgetName?: string;
  /** Error message (shown in error state) */
  errorMessage?: string;
  /** Empty state call-to-action text */
  emptyAction?: string;
  /** Called when the user clicks "Try again" in error state */
  onRetry?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const WidgetStateOverlay: React.FC<WidgetStateOverlayProps> = ({
  state,
  widgetName = "Widget",
  errorMessage = "Something went wrong",
  emptyAction = "Get started",
  onRetry,
}) => {
  return (
    <div
      data-testid={`widget-state-${state}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        minHeight: 80,
        padding: 16,
        boxSizing: "border-box",
        animation: "sn-fade-in 0.4s ease both",
      }}
    >
      {state === "loading" && <LoadingState />}
      {state === "empty" && (
        <EmptyState widgetName={widgetName} emptyAction={emptyAction} />
      )}
      {state === "error" && (
        <ErrorState errorMessage={errorMessage} onRetry={onRetry} />
      )}
      {state === "syncing" && <SyncingState widgetName={widgetName} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Loading — gentle pulsing dots
// ---------------------------------------------------------------------------

const LoadingState: React.FC = () => (
  <div style={{ textAlign: "center" }}>
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 12,
        justifyContent: "center",
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--sn-accent, #3E7D94)",
            animation: `sn-loading-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
    <div
      style={{
        fontSize: 12,
        color: "var(--sn-text-muted, #6B6878)",
      }}
    >
      Waking up...
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Empty — invitation, not absence
// ---------------------------------------------------------------------------

const EmptyState: React.FC<{
  widgetName: string;
  emptyAction: string;
}> = ({ widgetName, emptyAction }) => (
  <div style={{ textAlign: "center" }}>
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        border: "1px dashed var(--sn-text-faint, #3A3842)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 14px",
        fontSize: 20,
        color: "var(--sn-text-faint, #3A3842)",
      }}
    >
      +
    </div>
    <div
      style={{
        fontSize: 14,
        color: "var(--sn-text-soft, #A8A4AE)",
        marginBottom: 4,
      }}
    >
      {widgetName} is empty
    </div>
    <div
      style={{
        fontSize: 12,
        color: "var(--sn-text-muted, #6B6878)",
      }}
    >
      {emptyAction}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Error — warm nudge, not a red banner
// ---------------------------------------------------------------------------

const ErrorState: React.FC<{
  errorMessage: string;
  onRetry?: () => void;
}> = ({ errorMessage, onRetry }) => (
  <div style={{ textAlign: "center" }}>
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: "color-mix(in srgb, var(--sn-ember, #E8806C) 12%, transparent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 14px",
        fontSize: 18,
        color: "var(--sn-ember, #E8806C)",
      }}
    >
      !
    </div>
    <div
      style={{
        fontSize: 14,
        color: "var(--sn-text, #EDEBE6)",
        marginBottom: 6,
      }}
    >
      {errorMessage}
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          marginTop: 8,
          padding: "7px 18px",
          borderRadius: 9,
          background: "var(--sn-surface-raised, #1A1A1F)",
          color: "var(--sn-ember, #E8806C)",
          border: "1px solid color-mix(in srgb, var(--sn-ember, #E8806C) 20%, transparent)",
          fontSize: 12,
          cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        Try again
      </button>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Syncing — alive but dimmed
// ---------------------------------------------------------------------------

const SyncingState: React.FC<{ widgetName: string }> = ({ widgetName }) => (
  <div style={{ width: "100%", textAlign: "center" }}>
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
        marginBottom: 10,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "var(--sn-accent-light, #5A92A8)",
          fontFamily: "'DM Mono', monospace",
          animation: "sn-sync-pulse 1.5s ease-in-out infinite",
        }}
      >
        ●
      </span>
      <span
        style={{
          fontSize: 11,
          color: "var(--sn-accent-light, #5A92A8)",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        Syncing {widgetName}
      </span>
    </div>
    <div
      style={{
        height: 2,
        background: "var(--sn-text-faint, #3A3842)",
        borderRadius: 1,
        overflow: "hidden",
        maxWidth: 200,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          width: "30%",
          height: "100%",
          background: "var(--sn-accent, #3E7D94)",
          borderRadius: 1,
          animation: "sn-sync-bar 2s ease-in-out infinite",
        }}
      />
    </div>
  </div>
);
