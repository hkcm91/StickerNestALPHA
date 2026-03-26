/**
 * TimelinePlayhead — red vertical scrubber line
 *
 * @module shell/canvas/panels/timeline
 * @layer L6
 */

import React from 'react';

import { useTimelineStore } from '../../../../kernel/stores/timeline/timeline.store';

import { timeToPixels } from './timeline-utils';

interface TimelinePlayheadProps {
  height: number;
}

export const TimelinePlayhead: React.FC<TimelinePlayheadProps> = ({ height }) => {
  const playheadTime = useTimelineStore((s) => s.playheadTime);
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond);
  const scrollOffset = useTimelineStore((s) => s.scrollOffset);

  const x = timeToPixels(playheadTime, pixelsPerSecond, scrollOffset);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        width: 1,
        height,
        background: '#ef4444',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      {/* Triangle handle at top */}
      <div
        style={{
          position: 'absolute',
          top: -6,
          left: -5,
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '6px solid #ef4444',
        }}
      />
    </div>
  );
};
