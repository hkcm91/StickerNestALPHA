/**
 * ConnectionFeedback -- Visual feedback for port connections during drag.
 *
 * When dragging from an output port:
 * - Compatible input ports "breathe" (scale pulse 1.0 -> 1.15)
 * - Incompatible ports dim to 30% opacity
 * - On port hover: tooltip with event type
 *
 * This component wraps the drag state management and injects CSS classes
 * that PortDot and other port components can respond to. It uses a React
 * context to propagate drag state without requiring props through the tree.
 *
 * @module lab/components/LabGraph
 * @layer L2
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { Port } from '../../graph/scene-types';
import { arePortsCompatible } from '../../graph/scene-types';
import { SPRING } from '../shared/palette';

// ======================================================================
// Connection Feedback Context
// ======================================================================

export interface DragState {
  /** Whether a port drag is in progress */
  isDragging: boolean;
  /** The source port being dragged from (always an output port) */
  sourcePort: Port | null;
  /** The source node ID */
  sourceNodeId: string | null;
}

export interface ConnectionFeedbackContextValue {
  /** Current drag state */
  dragState: DragState;
  /** Start dragging from an output port */
  startDrag: (sourceNodeId: string, port: Port) => void;
  /** End dragging */
  endDrag: () => void;
  /** Check if a given input port is compatible with the current drag source */
  isCompatible: (targetPort: Port) => boolean;
  /** Currently hovered port ID (for tooltip display) */
  hoveredPortId: string | null;
  /** Set hovered port ID */
  setHoveredPortId: (portId: string | null) => void;
}

const defaultState: DragState = {
  isDragging: false,
  sourcePort: null,
  sourceNodeId: null,
};

const ConnectionFeedbackContext = createContext<ConnectionFeedbackContextValue>({
  dragState: defaultState,
  startDrag: () => {},
  endDrag: () => {},
  isCompatible: () => true,
  hoveredPortId: null,
  setHoveredPortId: () => {},
});

export const useConnectionFeedback = (): ConnectionFeedbackContextValue =>
  useContext(ConnectionFeedbackContext);

// ======================================================================
// Keyframes
// ======================================================================

const FEEDBACK_KEYFRAMES_ID = 'sn-connection-feedback-keyframes';

function ensureFeedbackKeyframes(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(FEEDBACK_KEYFRAMES_ID)) return;

  const style = document.createElement('style');
  style.id = FEEDBACK_KEYFRAMES_ID;
  style.textContent = `
    @keyframes sn-port-breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }
    .sn-port-compatible {
      animation: sn-port-breathe 1.2s ease-in-out infinite;
    }
    .sn-port-incompatible {
      opacity: 0.3;
      transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    .sn-port-idle {
      opacity: 1;
      transform: scale(1);
      transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1),
                  transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    @media (prefers-reduced-motion: reduce) {
      .sn-port-compatible {
        animation: none !important;
        transform: scale(1.08);
      }
    }
  `;
  document.head.appendChild(style);
}

// ======================================================================
// Provider Component
// ======================================================================

export interface ConnectionFeedbackProviderProps {
  children: React.ReactNode;
}

export const ConnectionFeedbackProvider: React.FC<ConnectionFeedbackProviderProps> = ({
  children,
}) => {
  const [dragState, setDragState] = useState<DragState>(defaultState);
  const [hoveredPortId, setHoveredPortId] = useState<string | null>(null);

  // Inject keyframes on mount
  useEffect(() => {
    ensureFeedbackKeyframes();
  }, []);

  const startDrag = useCallback((sourceNodeId: string, port: Port) => {
    setDragState({
      isDragging: true,
      sourcePort: port,
      sourceNodeId,
    });
  }, []);

  const endDrag = useCallback(() => {
    setDragState(defaultState);
    setHoveredPortId(null);
  }, []);

  const isCompatible = useCallback(
    (targetPort: Port) => {
      if (!dragState.sourcePort) return true;
      return arePortsCompatible(dragState.sourcePort, targetPort);
    },
    [dragState.sourcePort],
  );

  const value = useMemo(
    () => ({
      dragState,
      startDrag,
      endDrag,
      isCompatible,
      hoveredPortId,
      setHoveredPortId,
    }),
    [dragState, startDrag, endDrag, isCompatible, hoveredPortId],
  );

  return (
    <ConnectionFeedbackContext.Provider value={value}>
      {children}
    </ConnectionFeedbackContext.Provider>
  );
};

// ======================================================================
// PortFeedbackWrapper -- wraps a port to apply breathing/dimming classes
// ======================================================================

export interface PortFeedbackWrapperProps {
  /** The port this wrapper is for */
  port: Port;
  /** Node ID this port belongs to */
  nodeId: string;
  children: React.ReactNode;
}

export const PortFeedbackWrapper: React.FC<PortFeedbackWrapperProps> = ({
  port,
  nodeId,
  children,
}) => {
  const { dragState, isCompatible, hoveredPortId, setHoveredPortId } =
    useConnectionFeedback();

  const isDragging = dragState.isDragging;
  const isSourceNode = dragState.sourceNodeId === nodeId;
  const isInputPort = port.direction === 'input';

  // Only input ports react during drag (we're dragging from an output)
  const shouldReact = isDragging && isInputPort && !isSourceNode;
  const compatible = shouldReact ? isCompatible(port) : true;

  const feedbackClass = !isDragging
    ? 'sn-port-idle'
    : shouldReact
      ? compatible
        ? 'sn-port-compatible'
        : 'sn-port-incompatible'
      : 'sn-port-idle';

  const isHovered = hoveredPortId === port.id;

  return (
    <div
      data-testid={`port-feedback-${port.id}`}
      data-feedback-state={feedbackClass.replace('sn-port-', '')}
      className={feedbackClass}
      onMouseEnter={() => {
        if (isDragging && shouldReact) {
          setHoveredPortId(port.id);
        }
      }}
      onMouseLeave={() => {
        if (hoveredPortId === port.id) {
          setHoveredPortId(null);
        }
      }}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {children}

      {/* Tooltip on hover during drag */}
      {isHovered && isDragging && (
        <PortTooltip port={port} compatible={compatible} />
      )}
    </div>
  );
};

// ======================================================================
// PortTooltip -- event type tooltip on port hover during drag
// ======================================================================

interface PortTooltipProps {
  port: Port;
  compatible: boolean;
}

const PortTooltip: React.FC<PortTooltipProps> = ({ port, compatible }) => {
  const eventType = port.eventType ?? port.name;

  return (
    <div
      data-testid={`port-tooltip-${port.id}`}
      role="tooltip"
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 6,
        padding: '4px 8px',
        borderRadius: 6,
        background: compatible
          ? 'rgba(20,17,24,0.92)'
          : 'rgba(200,88,88,0.15)',
        border: `1px solid ${compatible ? 'rgba(255,255,255,0.08)' : 'rgba(200,88,88,0.3)'}`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        fontSize: 10,
        fontWeight: 500,
        color: compatible ? 'rgba(255,255,255,0.8)' : '#C85858',
        fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        animation: `sn-drift-up 150ms ${SPRING}`,
      }}
    >
      {compatible ? eventType : `Incompatible: ${eventType}`}
    </div>
  );
};

// ======================================================================
// Utility: get CSS class for a port given current drag state
// ======================================================================

/**
 * Returns the appropriate CSS class name for a port based on
 * the current connection drag state. Useful for components that
 * cannot use the React context (e.g., xyflow custom nodes).
 */
export function getPortFeedbackClass(
  isDragging: boolean,
  sourcePort: Port | null,
  targetPort: Port,
  isSameNode: boolean,
): string {
  if (!isDragging) return 'sn-port-idle';
  if (targetPort.direction !== 'input') return 'sn-port-idle';
  if (isSameNode) return 'sn-port-idle';
  if (!sourcePort) return 'sn-port-idle';

  return arePortsCompatible(sourcePort, targetPort)
    ? 'sn-port-compatible'
    : 'sn-port-incompatible';
}
