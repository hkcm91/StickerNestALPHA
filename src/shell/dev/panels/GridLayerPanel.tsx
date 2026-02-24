/**
 * GridLayerPanel — Grid Layer testing panel with visual grid canvas
 *
 * @module shell/dev
 * @layer L6
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

import type { GridConfig, GridSnapMode, GridProjectionMode } from '@sn/types';

import {
  createGridLayer,
  createViewport,
  type GridLayer,
  type ViewportState,
  canvasToScreen,
  screenToCanvas,
  panBy,
  zoomTo,
  getIsometricCellCorners,
} from '../../../canvas/core';

// Color presets for quick selection
const COLOR_PRESETS = [
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#FF5722', // Orange
  '#9C27B0', // Purple
  '#F44336', // Red
  '#FFEB3B', // Yellow
  '#00BCD4', // Cyan
  '#795548', // Brown
  '#607D8B', // Gray
  '#E91E63', // Pink
];

// Cell size presets
const CELL_SIZE_OPTIONS = [16, 32, 64, 128];

// Snap mode options
const SNAP_MODE_OPTIONS: { value: GridSnapMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'center', label: 'Center' },
  { value: 'corner', label: 'Corner' },
  { value: 'edge', label: 'Edge' },
];

// Projection mode options
const PROJECTION_MODE_OPTIONS: { value: GridProjectionMode; label: string }[] = [
  { value: 'orthogonal', label: 'Orthogonal' },
  { value: 'isometric', label: 'Isometric' },
];

// Isometric ratio presets
const ISOMETRIC_RATIO_OPTIONS = [
  { value: 2, label: '2:1 (Standard)' },
  { value: 1.73, label: '√3:1 (True ISO)' },
  { value: 1.5, label: '1.5:1 (Tall)' },
  { value: 3, label: '3:1 (Wide)' },
];

export const GridLayerPanel: React.FC = () => {
  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Grid layer instance
  const [gridLayer] = useState<GridLayer>(() => createGridLayer());

  // Viewport state
  const [viewport, setViewport] = useState<ViewportState>(() => createViewport(400, 250));

  // Paint settings
  const [paintColor, setPaintColor] = useState('#4CAF50');
  const [eraseMode, setEraseMode] = useState(false);

  // Grid config
  const [gridEnabled, setGridEnabled] = useState(true);
  const [showGridLines, setShowGridLines] = useState(true);
  const [cellSize, setCellSize] = useState(64);
  const [snapMode, setSnapMode] = useState<GridSnapMode>('none');
  const [projection, setProjection] = useState<GridProjectionMode>('orthogonal');
  const [isometricRatio, setIsometricRatio] = useState(2);

  // Painting state
  const [isPainting, setIsPainting] = useState(false);
  const [lastCell, setLastCell] = useState<{ col: number; row: number } | null>(null);
  const paintedInStroke = useRef<Set<string>>(new Set());

  // Initialize grid layer with canvas
  useEffect(() => {
    if (canvasRef.current) {
      gridLayer.init(canvasRef.current);
      gridLayer.setViewport(viewport);
    }
  }, [gridLayer, viewport]);

  // Update grid config when settings change
  useEffect(() => {
    gridLayer.setConfig({
      enabled: gridEnabled,
      showGridLines,
      cellSize,
      snapMode,
      projection,
      isometricRatio,
    });
  }, [gridLayer, gridEnabled, showGridLines, cellSize, snapMode, projection, isometricRatio]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const config = gridLayer.getConfig();
    const isIsometric = projection === 'isometric';

    const render = () => {
      // Clear
      ctx.fillStyle = config.defaultBackground;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!gridEnabled) {
        rafId = requestAnimationFrame(render);
        return;
      }

      // Calculate visible cells (use larger bounds for isometric)
      const topLeft = screenToCanvas({ x: 0, y: 0 }, viewport);
      const bottomRight = screenToCanvas({ x: canvas.width, y: canvas.height }, viewport);

      const buffer = isIsometric ? 3 : 1;
      const minCol = Math.floor(topLeft.x / cellSize) - buffer - 5;
      const maxCol = Math.ceil(bottomRight.x / cellSize) + buffer + 5;
      const minRow = Math.floor(topLeft.y / cellSize) - buffer - 5;
      const maxRow = Math.ceil(bottomRight.y / cellSize) + buffer + 5;

      // Render painted cells
      const cellStore = gridLayer.getCellStore();
      const cells = cellStore.getCellsInBounds({ minCol, maxCol, minRow, maxRow });

      for (const cell of cells) {
        ctx.fillStyle = cell.color ?? '#4CAF50';

        if (isIsometric) {
          // Draw diamond for isometric
          const currentConfig = { ...config, cellSize, isometricRatio, projection };
          const corners = getIsometricCellCorners(cell.col, cell.row, currentConfig);
          const top = canvasToScreen(corners.top, viewport);
          const right = canvasToScreen(corners.right, viewport);
          const bottom = canvasToScreen(corners.bottom, viewport);
          const left = canvasToScreen(corners.left, viewport);

          ctx.beginPath();
          ctx.moveTo(top.x, top.y);
          ctx.lineTo(right.x, right.y);
          ctx.lineTo(bottom.x, bottom.y);
          ctx.lineTo(left.x, left.y);
          ctx.closePath();
          ctx.fill();
        } else {
          // Draw rectangle for orthogonal
          const pos = gridLayer.cellToPosition(cell.col, cell.row);
          const screenPos = canvasToScreen(pos, viewport);
          const screenSize = cellSize * viewport.zoom;
          ctx.fillRect(screenPos.x, screenPos.y, screenSize, screenSize);
        }
      }

      // Render grid lines
      if (showGridLines && cellSize * viewport.zoom >= 4) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();

        if (isIsometric) {
          // Draw diagonal grid lines for isometric
          const currentConfig = { ...config, cellSize, isometricRatio, projection };

          // Lines in one diagonal direction (constant col)
          for (let col = minCol; col <= maxCol + 1; col++) {
            const startCorners = getIsometricCellCorners(col, minRow, currentConfig);
            const endCorners = getIsometricCellCorners(col, maxRow + 1, currentConfig);
            const start = canvasToScreen(startCorners.top, viewport);
            const end = canvasToScreen(endCorners.top, viewport);
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
          }

          // Lines in the other diagonal direction (constant row)
          for (let row = minRow; row <= maxRow + 1; row++) {
            const startCorners = getIsometricCellCorners(minCol, row, currentConfig);
            const endCorners = getIsometricCellCorners(maxCol + 1, row, currentConfig);
            const start = canvasToScreen(startCorners.top, viewport);
            const end = canvasToScreen(endCorners.top, viewport);
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
          }
        } else {
          // Draw orthogonal grid lines
          for (let col = minCol; col <= maxCol + 1; col++) {
            const canvasX = col * cellSize;
            const screenX = canvasToScreen({ x: canvasX, y: 0 }, viewport).x;
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, canvas.height);
          }

          for (let row = minRow; row <= maxRow + 1; row++) {
            const canvasY = row * cellSize;
            const screenY = canvasToScreen({ x: 0, y: canvasY }, viewport).y;
            ctx.moveTo(0, screenY);
            ctx.lineTo(canvas.width, screenY);
          }
        }

        ctx.stroke();
      }

      rafId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [gridLayer, viewport, gridEnabled, showGridLines, cellSize, projection, isometricRatio]);

  // Paint cell helper
  const paintCellAt = useCallback((screenX: number, screenY: number) => {
    const canvasPos = screenToCanvas({ x: screenX, y: screenY }, viewport);
    const { col, row } = gridLayer.positionToCell(canvasPos.x, canvasPos.y);
    const key = `${col},${row}`;

    if (paintedInStroke.current.has(key)) return;

    if (eraseMode) {
      gridLayer.clearCell(col, row);
    } else {
      gridLayer.paintCell(col, row, paintColor);
    }

    paintedInStroke.current.add(key);
    setLastCell({ col, row });
  }, [viewport, gridLayer, paintColor, eraseMode]);

  // Bresenham line for continuous strokes
  const paintLine = useCallback((fromCol: number, fromRow: number, toCol: number, toRow: number) => {
    const dx = Math.abs(toCol - fromCol);
    const dy = Math.abs(toRow - fromRow);
    const sx = fromCol < toCol ? 1 : -1;
    const sy = fromRow < toRow ? 1 : -1;
    let err = dx - dy;

    let col = fromCol;
    let row = fromRow;

    while (col !== toCol || row !== toRow) {
      const key = `${col},${row}`;
      if (!paintedInStroke.current.has(key)) {
        if (eraseMode) {
          gridLayer.clearCell(col, row);
        } else {
          gridLayer.paintCell(col, row, paintColor);
        }
        paintedInStroke.current.add(key);
      }

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        col += sx;
      }
      if (e2 < dx) {
        err += dx;
        row += sy;
      }
    }

    // Paint final cell
    const finalKey = `${toCol},${toRow}`;
    if (!paintedInStroke.current.has(finalKey)) {
      if (eraseMode) {
        gridLayer.clearCell(toCol, toRow);
      } else {
        gridLayer.paintCell(toCol, toRow, paintColor);
      }
      paintedInStroke.current.add(finalKey);
    }

    setLastCell({ col: toCol, row: toRow });
  }, [gridLayer, paintColor, eraseMode]);

  // Pointer handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!gridEnabled) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsPainting(true);
    paintedInStroke.current.clear();

    // Alt key for erase
    const shouldErase = eraseMode || e.altKey;
    const prevEraseMode = eraseMode;
    if (shouldErase !== eraseMode) setEraseMode(shouldErase);

    paintCellAt(e.clientX - rect.left, e.clientY - rect.top);

    if (!e.altKey && shouldErase !== prevEraseMode) {
      setEraseMode(prevEraseMode);
    }
  }, [gridEnabled, eraseMode, paintCellAt]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPainting || !gridEnabled) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPos = screenToCanvas({ x: screenX, y: screenY }, viewport);
    const { col, row } = gridLayer.positionToCell(canvasPos.x, canvasPos.y);

    if (lastCell && (lastCell.col !== col || lastCell.row !== row)) {
      paintLine(lastCell.col, lastCell.row, col, row);
    } else {
      paintCellAt(screenX, screenY);
    }
  }, [isPainting, gridEnabled, viewport, gridLayer, lastCell, paintLine, paintCellAt]);

  const handlePointerUp = useCallback(() => {
    setIsPainting(false);
    setLastCell(null);
    paintedInStroke.current.clear();
  }, []);

  // Pan/zoom handlers
  const handlePan = useCallback((dx: number, dy: number) => {
    setViewport((v) => panBy(v, { x: dx / v.zoom, y: dy / v.zoom }));
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setViewport((v) => {
      const center = { x: v.viewportWidth / 2, y: v.viewportHeight / 2 };
      return zoomTo(v, v.zoom + delta, center);
    });
  }, []);

  const handleResetViewport = useCallback(() => {
    setViewport(createViewport(400, 250));
  }, []);

  const handleClearGrid = useCallback(() => {
    gridLayer.clearAllCells();
  }, [gridLayer]);

  return (
    <section
      style={{
        flex: '1 1 400px',
        border: '1px solid var(--sn-border, #374151)',
        padding: 10,
      }}
    >
      <h2>Grid Layer</h2>

      {/* Grid Controls Row 1 */}
      <div style={{ marginBottom: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={gridEnabled}
            onChange={(e) => setGridEnabled(e.target.checked)}
          />
          Grid
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={showGridLines}
            onChange={(e) => setShowGridLines(e.target.checked)}
          />
          Lines
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Cell:
          <select
            value={cellSize}
            onChange={(e) => setCellSize(Number(e.target.value))}
          >
            {CELL_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}px</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Snap:
          <select
            value={snapMode}
            onChange={(e) => setSnapMode(e.target.value as GridSnapMode)}
          >
            {SNAP_MODE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Projection:
          <select
            value={projection}
            onChange={(e) => setProjection(e.target.value as GridProjectionMode)}
          >
            {PROJECTION_MODE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        {projection === 'isometric' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            Ratio:
            <select
              value={isometricRatio}
              onChange={(e) => setIsometricRatio(Number(e.target.value))}
            >
              {ISOMETRIC_RATIO_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Paint Controls Row */}
      <div style={{ marginBottom: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span>Paint:</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => {
                setPaintColor(color);
                setEraseMode(false);
              }}
              style={{
                width: 20,
                height: 20,
                background: color,
                border: paintColor === color && !eraseMode ? '2px solid white' : '1px solid #333',
                borderRadius: 2,
                cursor: 'pointer',
                padding: 0,
              }}
              title={color}
            />
          ))}
          <input
            type="color"
            value={paintColor}
            onChange={(e) => {
              setPaintColor(e.target.value);
              setEraseMode(false);
            }}
            style={{ width: 20, height: 20, padding: 0, border: 'none', cursor: 'pointer' }}
          />
        </div>

        <button
          onClick={() => setEraseMode(!eraseMode)}
          style={{
            background: eraseMode ? '#f44336' : 'transparent',
            border: '1px solid #666',
            padding: '2px 8px',
            cursor: 'pointer',
            color: eraseMode ? 'white' : 'inherit',
          }}
        >
          Erase {eraseMode ? 'ON' : 'OFF'}
        </button>

        <button onClick={handleClearGrid}>Clear All</button>
      </div>

      {/* Viewport Controls */}
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => handlePan(-50, 0)}>← Pan</button>
        <button onClick={() => handlePan(50, 0)}>Pan →</button>
        <button onClick={() => handlePan(0, -50)}>↑ Pan</button>
        <button onClick={() => handlePan(0, 50)}>Pan ↓</button>
        <button onClick={() => handleZoom(0.2)}>Zoom +</button>
        <button onClick={() => handleZoom(-0.2)}>Zoom -</button>
        <button onClick={handleResetViewport}>Reset</button>
        <span style={{ marginLeft: 10, fontSize: 10 }}>
          zoom: {viewport.zoom.toFixed(2)} | cells: {gridLayer.cellCount}
        </span>
      </div>

      {/* Visual Grid Canvas */}
      <canvas
        ref={canvasRef}
        width={400}
        height={250}
        style={{
          border: '1px solid var(--sn-border, #374151)',
          cursor: eraseMode ? 'not-allowed' : 'crosshair',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* Instructions */}
      <div style={{ marginTop: 5, fontSize: 10, color: '#888' }}>
        Click/drag to paint. Hold Alt to erase. Pan/zoom with buttons above.
        {projection === 'isometric' && ' Isometric mode: cells are diamond-shaped.'}
      </div>
    </section>
  );
};
