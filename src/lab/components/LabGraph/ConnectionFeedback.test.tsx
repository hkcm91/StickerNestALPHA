/**
 * Tests for ConnectionFeedback component.
 *
 * @vitest-environment happy-dom
 * @module lab/components/LabGraph
 * @layer L2
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import type { Port } from '../../graph/scene-types';

import {
  ConnectionFeedbackProvider,
  PortFeedbackWrapper,
  useConnectionFeedback,
  getPortFeedbackClass,
} from './ConnectionFeedback';

// ======================================================================
// Test helpers
// ======================================================================

const outputPort: Port = {
  id: 'out-1',
  name: 'timer.tick',
  direction: 'output',
  eventType: 'timer.tick',
};

const compatibleInputPort: Port = {
  id: 'in-1',
  name: 'timer.tick',
  direction: 'input',
  eventType: 'timer.tick',
};

const incompatibleInputPort: Port = {
  id: 'in-2',
  name: 'user.click',
  direction: 'input',
  eventType: 'user.click',
  schema: { type: 'object' },
};

const wildcardInputPort: Port = {
  id: 'in-3',
  name: 'any',
  direction: 'input',
  eventType: '*',
};

/** Test harness that exposes drag controls */
const DragTestHarness: React.FC<{
  sourceNodeId: string;
  sourcePort: Port;
  children: React.ReactNode;
}> = ({ sourceNodeId, sourcePort, children }) => {
  return (
    <ConnectionFeedbackProvider>
      <DragStarter sourceNodeId={sourceNodeId} sourcePort={sourcePort} />
      {children}
    </ConnectionFeedbackProvider>
  );
};

const DragStarter: React.FC<{ sourceNodeId: string; sourcePort: Port }> = ({
  sourceNodeId,
  sourcePort,
}) => {
  const { startDrag, endDrag, dragState } = useConnectionFeedback();
  return (
    <div>
      <button
        data-testid="start-drag"
        onClick={() => startDrag(sourceNodeId, sourcePort)}
      />
      <button data-testid="end-drag" onClick={() => endDrag()} />
      <span data-testid="drag-active">{String(dragState.isDragging)}</span>
    </div>
  );
};

// ======================================================================
// Tests
// ======================================================================

describe('ConnectionFeedbackProvider', () => {
  it('provides default idle drag state', () => {
    const TestConsumer: React.FC = () => {
      const { dragState } = useConnectionFeedback();
      return <span data-testid="state">{String(dragState.isDragging)}</span>;
    };

    render(
      <ConnectionFeedbackProvider>
        <TestConsumer />
      </ConnectionFeedbackProvider>,
    );

    expect(screen.getByTestId('state').textContent).toBe('false');
  });

  it('transitions to dragging on startDrag', () => {
    render(
      <DragTestHarness sourceNodeId="n1" sourcePort={outputPort}>
        <span />
      </DragTestHarness>,
    );

    expect(screen.getByTestId('drag-active').textContent).toBe('false');
    fireEvent.click(screen.getByTestId('start-drag'));
    expect(screen.getByTestId('drag-active').textContent).toBe('true');
  });

  it('transitions back to idle on endDrag', () => {
    render(
      <DragTestHarness sourceNodeId="n1" sourcePort={outputPort}>
        <span />
      </DragTestHarness>,
    );

    fireEvent.click(screen.getByTestId('start-drag'));
    expect(screen.getByTestId('drag-active').textContent).toBe('true');
    fireEvent.click(screen.getByTestId('end-drag'));
    expect(screen.getByTestId('drag-active').textContent).toBe('false');
  });
});

describe('PortFeedbackWrapper', () => {
  it('renders children in idle state when not dragging', () => {
    render(
      <ConnectionFeedbackProvider>
        <PortFeedbackWrapper port={compatibleInputPort} nodeId="n2">
          <span data-testid="child">hello</span>
        </PortFeedbackWrapper>
      </ConnectionFeedbackProvider>,
    );

    expect(screen.getByTestId('child')).toBeDefined();
    const wrapper = screen.getByTestId('port-feedback-in-1');
    expect(wrapper.getAttribute('data-feedback-state')).toBe('idle');
  });

  it('shows "compatible" state for type-matching ports during drag', () => {
    render(
      <DragTestHarness sourceNodeId="n1" sourcePort={outputPort}>
        <PortFeedbackWrapper port={compatibleInputPort} nodeId="n2">
          <span>port</span>
        </PortFeedbackWrapper>
      </DragTestHarness>,
    );

    fireEvent.click(screen.getByTestId('start-drag'));
    const wrapper = screen.getByTestId('port-feedback-in-1');
    expect(wrapper.getAttribute('data-feedback-state')).toBe('compatible');
    expect(wrapper.className).toContain('sn-port-compatible');
  });

  it('shows "incompatible" state for type-mismatching ports during drag', () => {
    // Create a source port with schema so schema check kicks in
    const typedOutput: Port = {
      id: 'out-typed',
      name: 'counter.value',
      direction: 'output',
      eventType: 'counter.value',
      schema: { type: 'number' },
    };

    render(
      <DragTestHarness sourceNodeId="n1" sourcePort={typedOutput}>
        <PortFeedbackWrapper port={incompatibleInputPort} nodeId="n2">
          <span>port</span>
        </PortFeedbackWrapper>
      </DragTestHarness>,
    );

    fireEvent.click(screen.getByTestId('start-drag'));
    const wrapper = screen.getByTestId('port-feedback-in-2');
    expect(wrapper.getAttribute('data-feedback-state')).toBe('incompatible');
    expect(wrapper.className).toContain('sn-port-incompatible');
  });

  it('shows "compatible" for wildcard input ports', () => {
    render(
      <DragTestHarness sourceNodeId="n1" sourcePort={outputPort}>
        <PortFeedbackWrapper port={wildcardInputPort} nodeId="n2">
          <span>port</span>
        </PortFeedbackWrapper>
      </DragTestHarness>,
    );

    fireEvent.click(screen.getByTestId('start-drag'));
    const wrapper = screen.getByTestId('port-feedback-in-3');
    expect(wrapper.getAttribute('data-feedback-state')).toBe('compatible');
  });

  it('keeps idle state for output ports during drag', () => {
    const anotherOutput: Port = {
      id: 'out-other',
      name: 'other',
      direction: 'output',
    };

    render(
      <DragTestHarness sourceNodeId="n1" sourcePort={outputPort}>
        <PortFeedbackWrapper port={anotherOutput} nodeId="n2">
          <span>port</span>
        </PortFeedbackWrapper>
      </DragTestHarness>,
    );

    fireEvent.click(screen.getByTestId('start-drag'));
    const wrapper = screen.getByTestId('port-feedback-out-other');
    expect(wrapper.getAttribute('data-feedback-state')).toBe('idle');
  });

  it('keeps idle state for ports on the same node as drag source', () => {
    render(
      <DragTestHarness sourceNodeId="n1" sourcePort={outputPort}>
        <PortFeedbackWrapper port={compatibleInputPort} nodeId="n1">
          <span>port</span>
        </PortFeedbackWrapper>
      </DragTestHarness>,
    );

    fireEvent.click(screen.getByTestId('start-drag'));
    const wrapper = screen.getByTestId('port-feedback-in-1');
    // Same node -- should stay idle (can't self-connect)
    expect(wrapper.getAttribute('data-feedback-state')).toBe('idle');
  });

  it('shows tooltip on hover during drag for compatible port', () => {
    render(
      <DragTestHarness sourceNodeId="n1" sourcePort={outputPort}>
        <PortFeedbackWrapper port={compatibleInputPort} nodeId="n2">
          <span>port</span>
        </PortFeedbackWrapper>
      </DragTestHarness>,
    );

    fireEvent.click(screen.getByTestId('start-drag'));
    fireEvent.mouseEnter(screen.getByTestId('port-feedback-in-1'));

    const tooltip = screen.getByTestId('port-tooltip-in-1');
    expect(tooltip).toBeDefined();
    expect(tooltip.textContent).toBe('timer.tick');
  });

  it('shows "Incompatible" prefix in tooltip for incompatible port', () => {
    const typedOutput: Port = {
      id: 'out-typed',
      name: 'counter.value',
      direction: 'output',
      eventType: 'counter.value',
      schema: { type: 'number' },
    };

    render(
      <DragTestHarness sourceNodeId="n1" sourcePort={typedOutput}>
        <PortFeedbackWrapper port={incompatibleInputPort} nodeId="n2">
          <span>port</span>
        </PortFeedbackWrapper>
      </DragTestHarness>,
    );

    fireEvent.click(screen.getByTestId('start-drag'));
    fireEvent.mouseEnter(screen.getByTestId('port-feedback-in-2'));

    const tooltip = screen.getByTestId('port-tooltip-in-2');
    expect(tooltip.textContent).toContain('Incompatible');
  });

  it('hides tooltip on mouse leave', () => {
    render(
      <DragTestHarness sourceNodeId="n1" sourcePort={outputPort}>
        <PortFeedbackWrapper port={compatibleInputPort} nodeId="n2">
          <span>port</span>
        </PortFeedbackWrapper>
      </DragTestHarness>,
    );

    fireEvent.click(screen.getByTestId('start-drag'));
    fireEvent.mouseEnter(screen.getByTestId('port-feedback-in-1'));
    expect(screen.queryByTestId('port-tooltip-in-1')).not.toBeNull();

    fireEvent.mouseLeave(screen.getByTestId('port-feedback-in-1'));
    expect(screen.queryByTestId('port-tooltip-in-1')).toBeNull();
  });

  it('returns to idle when drag ends', () => {
    render(
      <DragTestHarness sourceNodeId="n1" sourcePort={outputPort}>
        <PortFeedbackWrapper port={compatibleInputPort} nodeId="n2">
          <span>port</span>
        </PortFeedbackWrapper>
      </DragTestHarness>,
    );

    fireEvent.click(screen.getByTestId('start-drag'));
    expect(
      screen.getByTestId('port-feedback-in-1').getAttribute('data-feedback-state'),
    ).toBe('compatible');

    fireEvent.click(screen.getByTestId('end-drag'));
    expect(
      screen.getByTestId('port-feedback-in-1').getAttribute('data-feedback-state'),
    ).toBe('idle');
  });
});

describe('getPortFeedbackClass', () => {
  it('returns idle when not dragging', () => {
    expect(getPortFeedbackClass(false, null, compatibleInputPort, false)).toBe('sn-port-idle');
  });

  it('returns idle for output ports during drag', () => {
    expect(getPortFeedbackClass(true, outputPort, outputPort, false)).toBe('sn-port-idle');
  });

  it('returns idle for same-node ports', () => {
    expect(getPortFeedbackClass(true, outputPort, compatibleInputPort, true)).toBe('sn-port-idle');
  });

  it('returns compatible for matching event types', () => {
    expect(getPortFeedbackClass(true, outputPort, compatibleInputPort, false)).toBe(
      'sn-port-compatible',
    );
  });

  it('returns compatible for wildcard targets', () => {
    expect(getPortFeedbackClass(true, outputPort, wildcardInputPort, false)).toBe(
      'sn-port-compatible',
    );
  });

  it('returns incompatible for mismatched types with schemas', () => {
    const typedOutput: Port = {
      ...outputPort,
      schema: { type: 'string' },
    };
    expect(getPortFeedbackClass(true, typedOutput, incompatibleInputPort, false)).toBe(
      'sn-port-incompatible',
    );
  });
});

describe('Keyframe injection', () => {
  it('injects feedback keyframes into document head', () => {
    render(
      <ConnectionFeedbackProvider>
        <span />
      </ConnectionFeedbackProvider>,
    );

    const styleEl = document.getElementById('sn-connection-feedback-keyframes');
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain('sn-port-breathe');
    expect(styleEl?.textContent).toContain('sn-port-compatible');
    expect(styleEl?.textContent).toContain('sn-port-incompatible');
  });

  it('includes prefers-reduced-motion handling', () => {
    render(
      <ConnectionFeedbackProvider>
        <span />
      </ConnectionFeedbackProvider>,
    );

    const styleEl = document.getElementById('sn-connection-feedback-keyframes');
    expect(styleEl?.textContent).toContain('prefers-reduced-motion');
  });
});
