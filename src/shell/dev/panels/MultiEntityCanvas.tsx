/**
 * MultiEntityCanvas — interactive test canvas with text, shape, image, counter entities and game map
 * Extracted from TestHarness.tsx
 *
 * @module shell/dev
 * @layer L6
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

import { bus } from '../../../kernel/bus';
import { WidgetFrame } from '../../../runtime';
import { CanvasContextMenu, useLongPress, type ContextMenuItem } from '../components/CanvasContextMenu';
import { useCanvasShortcuts } from '../hooks/use-canvas-shortcuts';
import { usePointerDrag } from '../hooks/use-pointer-drag';
import { DEFAULT_WIDGET_THEME, getWidgetHtml } from '../widget-templates';

import type {
  CanvasTextEntity,
  CanvasShapeEntity,
  CanvasImageEntity,
  CanvasCounterEntity,
  CanvasDrawingEntity,
  CanvasStickerEntity,
  CanvasLottieEntity,
  SelectedEntityRef,
  TileData,
  GameMapState,
} from './types';

// ============================================================================
// SVG Smoothing Utility
// ============================================================================

/**
 * Converts an array of points to an SVG path `d` attribute string.
 * Uses Catmull-Rom to cubic bezier conversion for smooth curves.
 *
 * @param points - Array of {x, y} coordinates
 * @param smoothing - 0 = straight line segments (polyline), 1 = fully smooth curves
 * @returns SVG path `d` attribute string
 */
function pointsToSmoothPath(
  points: { x: number; y: number }[],
  smoothing: number,
): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  // Clamp smoothing to [0, 1]
  const t = Math.max(0, Math.min(1, smoothing));

  // At smoothing = 0, use straight line segments
  if (t === 0) {
    return 'M' + points.map((p) => `${p.x},${p.y}`).join(' L');
  }

  // Build path with Catmull-Rom → cubic bezier conversion
  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom tangent vectors scaled by smoothing factor
    const cp1x = p1.x + ((p2.x - p0.x) / 6) * t;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * t;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * t;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * t;

    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

// ============================================================================
// MultiEntityCanvas Component
// ============================================================================

export const MultiEntityCanvas: React.FC = () => {
  // ---- Text/Color Test Canvas State ----
  const [testCanvasBgColor, setTestCanvasBgColor] = useState('#ffffff');
  const [textColorWidgets, setTextColorWidgets] = useState<{ id: string; type: string }[]>([]);

  // Live text entities on canvas - synced with Text Tool widget
  const [canvasTextEntities, setCanvasTextEntities] = useState<CanvasTextEntity[]>([]);
  const [selectedTextEntity, setSelectedTextEntity] = useState<string | null>(null);
  const [editingTextEntity, setEditingTextEntity] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Shape entities on canvas - synced with Shape Props widget
  const [canvasShapeEntities, setCanvasShapeEntities] = useState<CanvasShapeEntity[]>([]);
  const [selectedShapeEntity, setSelectedShapeEntity] = useState<string | null>(null);

  // Image entities on canvas - synced with Image Props widget
  const [canvasImageEntities, setCanvasImageEntities] = useState<CanvasImageEntity[]>([]);
  const [selectedImageEntity, setSelectedImageEntity] = useState<string | null>(null);

  // Counter entities on canvas - synced with Counter Control widget
  const [canvasCounterEntities, setCanvasCounterEntities] = useState<CanvasCounterEntity[]>([]);
  const [selectedCounterEntity, setSelectedCounterEntity] = useState<string | null>(null);

  // Drawing entities on canvas - synced with Pen Props widget
  const [canvasDrawingEntities, setCanvasDrawingEntities] = useState<CanvasDrawingEntity[]>([]);
  const [selectedDrawingEntity, setSelectedDrawingEntity] = useState<string | null>(null);
  const [penMode, setPenMode] = useState(false);
  const [isDrawingStroke, setIsDrawingStroke] = useState(false);
  const [liveStrokePoints, setLiveStrokePoints] = useState<{ x: number; y: number }[]>([]);
  const [penStroke, setPenStroke] = useState('#333333');
  const [penStrokeWidth, setPenStrokeWidth] = useState(2);
  const [penSmoothing, setPenSmoothing] = useState(0.5);

  // Sticker entities on canvas - synced with Sticker Props widget
  const [canvasStickerEntities, setCanvasStickerEntities] = useState<CanvasStickerEntity[]>([]);
  const [selectedStickerEntity, setSelectedStickerEntity] = useState<string | null>(null);
  const [hoveredSticker, setHoveredSticker] = useState<string | null>(null);

  // Lottie entities on canvas - synced with Lottie Props widget
  const [canvasLottieEntities, setCanvasLottieEntities] = useState<CanvasLottieEntity[]>([]);
  const [selectedLottieEntity, setSelectedLottieEntity] = useState<string | null>(null);
  const lottieRefs = useRef<Map<string, unknown>>(new Map());

  // ---- Game Map State ----
  const [gameMap, setGameMap] = useState<GameMapState>({
    cols: 16,
    rows: 12,
    cellSize: 24,
    showGrid: true,
    gridType: 'flat',
    gridColor: '#969696',
    gridLineWeight: 1,
    gridOpacity: 0.35,
    tiles: Array(12).fill(null).map(() => Array(16).fill(null)),
  });
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [selectedTile, setSelectedTile] = useState<TileData>({ id: 'grass', color: '#4CAF50', name: 'Grass' });
  const [brushMode, setBrushMode] = useState<'paint' | 'erase'>('paint');
  const [brushSize, setBrushSize] = useState(1);
  const [isPainting, setIsPainting] = useState(false);
  const [paintCount, setPaintCount] = useState(0);
  const [mapWidgets, setMapWidgets] = useState<{ id: string; type: string }[]>([]);
  const [gameWidgets, setGameWidgets] = useState<{ id: string; type: string }[]>([]);
  const [playerPos, setPlayerPos] = useState<{ row: number; col: number; tileName: string; moves: number } | null>(null);
  const [showMapLayer, setShowMapLayer] = useState(true);

  // ---- Context Menu State ----
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // ---- Bus Subscriptions ----

  // Subscribe to canvas background color changes from widgets
  useEffect(() => {
    const unsub = bus.subscribe('widget.canvas.bgcolor.set', (event: unknown) => {
      const payload = (event as { payload: { color: string } }).payload;
      if (payload?.color) {
        setTestCanvasBgColor(payload.color);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to text property changes from Text Tool widget - update selected text entity live
  useEffect(() => {
    const unsub = bus.subscribe('widget.text.props.changed', (event: unknown) => {
      const payload = (event as { payload: { fontSize?: number; bold?: boolean; italic?: boolean; underline?: boolean; color?: string } }).payload;
      if (payload && selectedTextEntity) {
        setCanvasTextEntities((prev) =>
          prev.map((entity) =>
            entity.id === selectedTextEntity
              ? {
                  ...entity,
                  fontSize: payload.fontSize ?? entity.fontSize,
                  bold: payload.bold ?? entity.bold,
                  italic: payload.italic ?? entity.italic,
                  underline: payload.underline ?? entity.underline,
                  color: payload.color ?? entity.color,
                }
              : entity
          )
        );
      }
    });
    return () => unsub();
  }, [selectedTextEntity]);

  // Subscribe to text color changes from Color Picker
  useEffect(() => {
    const unsub = bus.subscribe('widget.text.color.set', (event: unknown) => {
      const payload = (event as { payload: { color: string } }).payload;
      if (payload?.color && selectedTextEntity) {
        setCanvasTextEntities((prev) =>
          prev.map((entity) =>
            entity.id === selectedTextEntity
              ? { ...entity, color: payload.color }
              : entity
          )
        );
      }
    });
    return () => unsub();
  }, [selectedTextEntity]);

  // Subscribe to shape property changes from Shape Props widget
  useEffect(() => {
    const unsub = bus.subscribe('widget.shape.props.changed', (event: unknown) => {
      const payload = (event as { payload: { fill?: string; stroke?: string; strokeWidth?: number; borderRadius?: number } }).payload;
      if (payload && selectedShapeEntity) {
        setCanvasShapeEntities((prev) =>
          prev.map((entity) =>
            entity.id === selectedShapeEntity
              ? {
                  ...entity,
                  fill: payload.fill ?? entity.fill,
                  stroke: payload.stroke ?? entity.stroke,
                  strokeWidth: payload.strokeWidth ?? entity.strokeWidth,
                  borderRadius: payload.borderRadius ?? entity.borderRadius,
                }
              : entity
          )
        );
      }
    });
    return () => unsub();
  }, [selectedShapeEntity]);

  // Subscribe to image property changes from Image Props widget
  useEffect(() => {
    const unsub = bus.subscribe('widget.image.props.changed', (event: unknown) => {
      const payload = (event as { payload: { opacity?: number; brightness?: number; blur?: number; fit?: 'cover' | 'contain' | 'fill' } }).payload;
      if (payload && selectedImageEntity) {
        setCanvasImageEntities((prev) =>
          prev.map((entity) =>
            entity.id === selectedImageEntity
              ? {
                  ...entity,
                  opacity: payload.opacity ?? entity.opacity,
                  brightness: payload.brightness ?? entity.brightness,
                  blur: payload.blur ?? entity.blur,
                  fit: payload.fit ?? entity.fit,
                }
              : entity
          )
        );
      }
    });
    return () => unsub();
  }, [selectedImageEntity]);

  // Subscribe to counter entity changes from Counter Control widget
  useEffect(() => {
    const unsub = bus.subscribe('widget.counter.entity.changed', (event: unknown) => {
      const payload = (event as { payload: { value?: number } }).payload;
      if (payload && selectedCounterEntity) {
        setCanvasCounterEntities((prev) =>
          prev.map((entity) =>
            entity.id === selectedCounterEntity
              ? { ...entity, value: payload.value ?? entity.value }
              : entity
          )
        );
      }
    });
    return () => unsub();
  }, [selectedCounterEntity]);

  // Subscribe to drawing property changes from Pen Props widget
  useEffect(() => {
    const unsub = bus.subscribe('widget.drawing.props.changed', (event: unknown) => {
      const payload = (event as { payload: { stroke?: string; strokeWidth?: number; smoothing?: number } }).payload;
      if (payload) {
        // Update pen tool defaults
        if (payload.stroke !== undefined) setPenStroke(payload.stroke);
        if (payload.strokeWidth !== undefined) setPenStrokeWidth(payload.strokeWidth);
        if (payload.smoothing !== undefined) setPenSmoothing(payload.smoothing);
        // Also update selected drawing entity live
        if (selectedDrawingEntity) {
          setCanvasDrawingEntities((prev) =>
            prev.map((entity) =>
              entity.id === selectedDrawingEntity
                ? {
                    ...entity,
                    stroke: payload.stroke ?? entity.stroke,
                    strokeWidth: payload.strokeWidth ?? entity.strokeWidth,
                    smoothing: payload.smoothing ?? entity.smoothing,
                  }
                : entity
            )
          );
        }
      }
    });
    return () => unsub();
  }, [selectedDrawingEntity]);

  // ---- Sticker Props Bus Subscription ----
  useEffect(() => {
    const unsub = bus.subscribe('widget.sticker.props.changed', (event: unknown) => {
      const payload = (event as { payload: Record<string, unknown> }).payload;
      if (selectedStickerEntity && payload) {
        setCanvasStickerEntities((prev) =>
          prev.map((entity) =>
            entity.id === selectedStickerEntity
              ? {
                  ...entity,
                  ...(payload.clickEventType !== undefined && { clickEventType: payload.clickEventType as string }),
                  ...(payload.clickEventPayload !== undefined && { clickEventPayload: payload.clickEventPayload as Record<string, unknown> }),
                  ...(payload.hoverEffect !== undefined && { hoverEffect: payload.hoverEffect as CanvasStickerEntity['hoverEffect'] }),
                }
              : entity
          )
        );
      }
    });
    return () => unsub();
  }, [selectedStickerEntity]);

  // ---- Lottie Props Bus Subscription ----
  useEffect(() => {
    const unsub = bus.subscribe('widget.lottie.props.changed', (event: unknown) => {
      const payload = (event as { payload: Record<string, unknown> }).payload;
      if (selectedLottieEntity && payload) {
        setCanvasLottieEntities((prev) =>
          prev.map((entity) =>
            entity.id === selectedLottieEntity
              ? {
                  ...entity,
                  ...(payload.loop !== undefined && { loop: payload.loop as boolean }),
                  ...(payload.speed !== undefined && { speed: payload.speed as number }),
                  ...(payload.direction !== undefined && { direction: payload.direction as number }),
                  ...(payload.autoplay !== undefined && { autoplay: payload.autoplay as boolean }),
                }
              : entity
          )
        );
      }
    });
    return () => unsub();
  }, [selectedLottieEntity]);

  // ---- Lottie Playback Command Subscription ----
  useEffect(() => {
    const unsub = bus.subscribe('widget.lottie.playback.command', (event: unknown) => {
      const payload = (event as { payload: { command: string } }).payload;
      if (selectedLottieEntity && payload?.command) {
        // Lottie playback commands are handled by the lottie instances in render
        // We store a flag on the entity to trigger re-render with playback state
        const lottieInstance = lottieRefs.current.get(selectedLottieEntity);
        if (lottieInstance) {
          const dl = lottieInstance as { play: () => void; pause: () => void; stop: () => void };
          if (payload.command === 'play') dl.play();
          if (payload.command === 'pause') dl.pause();
          if (payload.command === 'stop') dl.stop();
        }
      }
    });
    return () => unsub();
  }, [selectedLottieEntity]);

  // ---- Game Map Event Subscriptions ----
  // Subscribe to tile selection from Tile Palette widget
  useEffect(() => {
    const unsub = bus.subscribe('widget.map.tile.selected', (event: unknown) => {
      const payload = (event as { payload: { tile: TileData } }).payload;
      if (payload?.tile) {
        setSelectedTile(payload.tile);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to map properties changes from Map Props widget
  useEffect(() => {
    const unsub = bus.subscribe('widget.map.props.changed', (event: unknown) => {
      const payload = (event as { payload: { cols?: number; rows?: number; cellSize?: number; showGrid?: boolean } }).payload;
      if (payload) {
        setGameMap((prev) => {
          const newCols = payload.cols ?? prev.cols;
          const newRows = payload.rows ?? prev.rows;
          // Resize tiles array if dimensions changed
          let newTiles = prev.tiles;
          if (newCols !== prev.cols || newRows !== prev.rows) {
            newTiles = Array(newRows).fill(null).map((_, rowIdx) =>
              Array(newCols).fill(null).map((_, colIdx) =>
                prev.tiles[rowIdx]?.[colIdx] ?? null
              )
            );
          }
          return {
            ...prev,
            cols: newCols,
            rows: newRows,
            cellSize: payload.cellSize ?? prev.cellSize,
            showGrid: payload.showGrid ?? prev.showGrid,
            tiles: newTiles,
          };
        });
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to brush changes from Brush Tool widget
  useEffect(() => {
    const unsub = bus.subscribe('widget.map.brush.changed', (event: unknown) => {
      const payload = (event as { payload: { mode?: 'paint' | 'erase'; brushSize?: number } }).payload;
      if (payload) {
        if (payload.mode) setBrushMode(payload.mode);
        if (payload.brushSize) setBrushSize(payload.brushSize);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to map clear command
  useEffect(() => {
    const unsub = bus.subscribe('widget.map.clear', () => {
      setGameMap((prev) => ({
        ...prev,
        tiles: Array(prev.rows).fill(null).map(() => Array(prev.cols).fill(null)),
      }));
      setPaintCount(0);
      bus.emit('widget.map.paint.count', { count: 0 });
    });
    return () => unsub();
  }, []);

  // Subscribe to map fill command
  useEffect(() => {
    const unsub = bus.subscribe('widget.map.fill', () => {
      setGameMap((prev) => ({
        ...prev,
        tiles: Array(prev.rows).fill(null).map(() => Array(prev.cols).fill(selectedTile)),
      }));
      const total = gameMap.rows * gameMap.cols;
      setPaintCount(total);
      bus.emit('widget.map.paint.count', { count: total });
    });
    return () => unsub();
  }, [selectedTile, gameMap.rows, gameMap.cols]);

  // Sync map data to game player widget whenever tiles or gridType change
  useEffect(() => {
    if (gameWidgets.length > 0) {
      const sendMapData = () => {
        bus.emit('widget.map.data', {
          tiles: gameMap.tiles,
          cols: gameMap.cols,
          rows: gameMap.rows,
          gridType: gameMap.gridType,
        });
      };
      // Send immediately for tile changes while widget is running
      sendMapData();
      // Also send after a delay for newly spawned widgets that haven't subscribed yet
      const timer = setTimeout(sendMapData, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameMap.tiles, gameMap.cols, gameMap.rows, gameMap.gridType, gameWidgets.length]);

  // Subscribe to player movement from game widget
  useEffect(() => {
    const unsub = bus.subscribe('widget.player.moved', (event: unknown) => {
      const payload = (event as { payload: { row: number; col: number; tileName: string; moves: number } }).payload;
      if (payload) {
        setPlayerPos({ row: payload.row, col: payload.col, tileName: payload.tileName, moves: payload.moves });
      }
    });
    return () => unsub();
  }, []);

  // ---- Handler Functions ----

  // Paint tile function
  const paintTile = (row: number, col: number) => {
    setGameMap((prev) => {
      const newTiles = prev.tiles.map((r, ri) =>
        r.map((c, ci) => {
          // Apply brush size
          const inRange = Math.abs(ri - row) < brushSize && Math.abs(ci - col) < brushSize;
          if (inRange) {
            return brushMode === 'paint' ? selectedTile : null;
          }
          return c;
        })
      );
      return { ...prev, tiles: newTiles };
    });
    // Update paint count
    setPaintCount((prev) => {
      const newCount = brushMode === 'paint' ? prev + (brushSize * brushSize) : Math.max(0, prev - (brushSize * brushSize));
      bus.emit('widget.map.paint.count', { count: newCount });
      return newCount;
    });
  };

  // Resize grid while preserving existing tiles
  const resizeGrid = (newCols: number, newRows: number) => {
    setGameMap((prev) => {
      const clampedCols = Math.max(4, Math.min(64, newCols));
      const clampedRows = Math.max(4, Math.min(64, newRows));
      const newTiles: (TileData | null)[][] = [];
      let count = 0;
      for (let r = 0; r < clampedRows; r++) {
        const row: (TileData | null)[] = [];
        for (let c = 0; c < clampedCols; c++) {
          const tile = prev.tiles[r]?.[c] ?? null;
          row.push(tile);
          if (tile) count++;
        }
        newTiles.push(row);
      }
      setPaintCount(count);
      return { ...prev, cols: clampedCols, rows: clampedRows, tiles: newTiles };
    });
    // Reset player if out of bounds
    setPlayerPos((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        row: Math.min(prev.row, newRows - 1),
        col: Math.min(prev.col, newCols - 1),
      };
    });
  };

  // Add a text entity to the canvas
  const addTextEntityToCanvas = () => {
    const newEntity: CanvasTextEntity = {
      id: `text-entity-${Date.now()}`,
      text: 'New Text',
      fontSize: 16,
      bold: false,
      italic: false,
      underline: false,
      color: '#000000',
      x: 50 + Math.random() * 200,
      y: 30 + Math.random() * 50,
    };
    setCanvasTextEntities((prev) => [...prev, newEntity]);
    setSelectedTextEntity(newEntity.id);
    // Emit to sync initial state to Text Properties panel
    bus.emit('widget.text.selection.sync', {
      text: newEntity.text,
      fontSize: newEntity.fontSize,
      bold: newEntity.bold,
      italic: newEntity.italic,
      underline: newEntity.underline,
      color: newEntity.color,
    });
  };

  // Select a text entity and sync to Text Properties panel
  const selectTextEntity = (entityId: string) => {
    const entity = canvasTextEntities.find((t) => t.id === entityId);
    if (!entity) return;
    setSelectedTextEntity(entityId);
    // Emit selection sync to Text Properties panel
    bus.emit('widget.text.selection.sync', {
      text: entity.text,
      fontSize: entity.fontSize,
      bold: entity.bold,
      italic: entity.italic,
      underline: entity.underline,
      color: entity.color,
    });
  };

  // Deselect text entity and notify widgets
  const deselectTextEntity = () => {
    if (selectedTextEntity) {
      bus.emit('widget.text.deselected', {});
    }
    setSelectedTextEntity(null);
    setEditingTextEntity(null);
  };

  // Handle double-click to enter edit mode (Photoshop-style)
  const handleTextEntityDoubleClick = (e: React.MouseEvent, entityId: string) => {
    e.stopPropagation();
    setEditingTextEntity(entityId);
    // Focus the input after render
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  // Handle inline edit change
  const handleInlineEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    if (editingTextEntity) {
      setCanvasTextEntities((prev) =>
        prev.map((entity) =>
          entity.id === editingTextEntity
            ? { ...entity, text: newText }
            : entity
        )
      );
    }
  };

  // Handle inline edit blur or enter key - commit edit
  const handleInlineEditCommit = () => {
    if (editingTextEntity) {
      const entity = canvasTextEntities.find((t) => t.id === editingTextEntity);
      if (entity) {
        // Sync updated text to properties panel
        bus.emit('widget.text.selection.sync', {
          text: entity.text,
          fontSize: entity.fontSize,
          bold: entity.bold,
          italic: entity.italic,
          underline: entity.underline,
          color: entity.color,
        });
      }
    }
    setEditingTextEntity(null);
  };

  // Handle inline edit keydown
  const handleInlineEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInlineEditCommit();
    } else if (e.key === 'Escape') {
      setEditingTextEntity(null);
    }
  };

  const snapPosition = (val: number): number => {
    if (!snapToGrid || !showMapLayer) return val;
    const gridSize = gameMap.cellSize;
    return Math.round(val / gridSize) * gridSize;
  };

  // ---- Shape Entity Functions ----
  const addShapeEntityToCanvas = (type: 'rectangle' | 'ellipse' = 'rectangle') => {
    const newEntity: CanvasShapeEntity = {
      id: `shape-entity-${Date.now()}`,
      type,
      fill: '#4CAF50',
      stroke: '#333333',
      strokeWidth: 2,
      borderRadius: type === 'rectangle' ? 0 : 0,
      x: 50 + Math.random() * 200,
      y: 30 + Math.random() * 80,
      width: 80,
      height: 60,
    };
    setCanvasShapeEntities((prev) => [...prev, newEntity]);
    // Deselect other types and select the new shape
    deselectTextEntity();
    if (selectedImageEntity) bus.emit('widget.image.deselected', {});
    setSelectedImageEntity(null);
    if (selectedCounterEntity) bus.emit('widget.counter.deselected', {});
    setSelectedCounterEntity(null);
    deselectDrawingEntity();
    setSelectedShapeEntity(newEntity.id);
    bus.emit('widget.shape.selection.sync', {
      type: newEntity.type,
      fill: newEntity.fill,
      stroke: newEntity.stroke,
      strokeWidth: newEntity.strokeWidth,
      borderRadius: newEntity.borderRadius,
    });
  };

  const selectShapeEntity = (entityId: string) => {
    setCanvasShapeEntities((current) => {
      const entity = current.find((s) => s.id === entityId);
      if (!entity) return current;
      // Deselect other entity types
      deselectTextEntity();
      if (selectedImageEntity) bus.emit('widget.image.deselected', {});
      setSelectedImageEntity(null);
      if (selectedCounterEntity) bus.emit('widget.counter.deselected', {});
      setSelectedCounterEntity(null);
      deselectDrawingEntity();
      setSelectedShapeEntity(entityId);
      bus.emit('widget.shape.selection.sync', {
        type: entity.type,
        fill: entity.fill,
        stroke: entity.stroke,
        strokeWidth: entity.strokeWidth,
        borderRadius: entity.borderRadius,
      });
      return current;
    });
  };

  const deselectShapeEntity = () => {
    if (selectedShapeEntity) {
      bus.emit('widget.shape.deselected', {});
    }
    setSelectedShapeEntity(null);
  };

  // ---- Image Entity Functions ----
  const addImageEntityToCanvas = () => {
    const placeholders = [
      'https://picsum.photos/seed/a/100/80',
      'https://picsum.photos/seed/b/100/80',
      'https://picsum.photos/seed/c/100/80',
    ];
    const newEntity: CanvasImageEntity = {
      id: `image-entity-${Date.now()}`,
      src: placeholders[Math.floor(Math.random() * placeholders.length)],
      opacity: 100,
      brightness: 100,
      blur: 0,
      fit: 'cover',
      x: 50 + Math.random() * 200,
      y: 30 + Math.random() * 80,
      width: 100,
      height: 80,
    };
    setCanvasImageEntities((prev) => [...prev, newEntity]);
    // Deselect other types and select the new image
    deselectTextEntity();
    deselectShapeEntity();
    if (selectedCounterEntity) bus.emit('widget.counter.deselected', {});
    setSelectedCounterEntity(null);
    deselectDrawingEntity();
    setSelectedImageEntity(newEntity.id);
    bus.emit('widget.image.selection.sync', {
      src: newEntity.src,
      opacity: newEntity.opacity,
      brightness: newEntity.brightness,
      blur: newEntity.blur,
      fit: newEntity.fit,
    });
  };

  const selectImageEntity = (entityId: string) => {
    setCanvasImageEntities((current) => {
      const entity = current.find((i) => i.id === entityId);
      if (!entity) return current;
      // Deselect other entity types
      deselectTextEntity();
      deselectShapeEntity();
      if (selectedCounterEntity) bus.emit('widget.counter.deselected', {});
      setSelectedCounterEntity(null);
      deselectDrawingEntity();
      setSelectedImageEntity(entityId);
      bus.emit('widget.image.selection.sync', {
        src: entity.src,
        opacity: entity.opacity,
        brightness: entity.brightness,
        blur: entity.blur,
        fit: entity.fit,
      });
      return current;
    });
  };

  const deselectImageEntity = () => {
    if (selectedImageEntity) {
      bus.emit('widget.image.deselected', {});
    }
    setSelectedImageEntity(null);
  };

  // ---- Counter Entity Functions ----
  const addCounterEntityToCanvas = () => {
    const newEntity: CanvasCounterEntity = {
      id: `counter-entity-${Date.now()}`,
      value: Math.floor(Math.random() * 100),
      x: 50 + Math.random() * 200,
      y: 30 + Math.random() * 80,
    };
    setCanvasCounterEntities((prev) => [...prev, newEntity]);
    // Deselect other types and select the new counter
    deselectTextEntity();
    deselectShapeEntity();
    deselectImageEntity();
    deselectDrawingEntity();
    setSelectedCounterEntity(newEntity.id);
    bus.emit('widget.counter.selection.sync', {
      id: newEntity.id,
      value: newEntity.value,
    });
  };

  const selectCounterEntity = (entityId: string) => {
    setCanvasCounterEntities((current) => {
      const entity = current.find((c) => c.id === entityId);
      if (!entity) return current;
      // Deselect other entity types
      deselectTextEntity();
      deselectShapeEntity();
      deselectImageEntity();
      deselectDrawingEntity();
      setSelectedCounterEntity(entityId);
      bus.emit('widget.counter.selection.sync', {
        id: entity.id,
        value: entity.value,
      });
      return current;
    });
  };

  const deselectCounterEntity = () => {
    if (selectedCounterEntity) {
      bus.emit('widget.counter.deselected', {});
    }
    setSelectedCounterEntity(null);
  };

  // ---- Drawing Entity Functions ----
  const addDrawingEntityToCanvas = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return;
    const newEntity: CanvasDrawingEntity = {
      id: `drawing-entity-${Date.now()}`,
      points,
      stroke: penStroke,
      strokeWidth: penStrokeWidth,
      smoothing: penSmoothing,
      x: 0,
      y: 0,
    };
    setCanvasDrawingEntities((prev) => [...prev, newEntity]);
    // Deselect other types and select the new drawing
    deselectTextEntity();
    deselectShapeEntity();
    deselectImageEntity();
    deselectCounterEntity();
    setSelectedDrawingEntity(newEntity.id);
    bus.emit('widget.drawing.selection.sync', {
      stroke: newEntity.stroke,
      strokeWidth: newEntity.strokeWidth,
      smoothing: newEntity.smoothing,
      pointCount: newEntity.points.length,
    });
  };

  const selectDrawingEntity = (entityId: string) => {
    setCanvasDrawingEntities((current) => {
      const entity = current.find((d) => d.id === entityId);
      if (!entity) return current;
      // Deselect other entity types
      deselectTextEntity();
      deselectShapeEntity();
      deselectImageEntity();
      deselectCounterEntity();
      setSelectedDrawingEntity(entityId);
      bus.emit('widget.drawing.selection.sync', {
        stroke: entity.stroke,
        strokeWidth: entity.strokeWidth,
        smoothing: entity.smoothing,
        pointCount: entity.points.length,
      });
      return current;
    });
  };

  const deselectDrawingEntity = () => {
    if (selectedDrawingEntity) {
      bus.emit('widget.drawing.deselected', {});
    }
    setSelectedDrawingEntity(null);
  };

  // ---- Sticker Entity Functions ----
  const addStickerEntityToCanvas = () => {
    const id = `sticker-${Date.now()}`;
    const newSticker: CanvasStickerEntity = {
      id,
      assetUrl: `https://picsum.photos/seed/${id}/100/100`,
      assetType: 'image',
      aspectLocked: true,
      clickEventType: 'sticker.clicked',
      clickEventPayload: {},
      hoverEffect: 'scale',
      x: 50 + Math.random() * 200,
      y: 50 + Math.random() * 200,
      width: 80,
      height: 80,
    };
    setCanvasStickerEntities((prev) => [...prev, newSticker]);
    deselectAllEntities();
    setSelectedStickerEntity(id);
    bus.emit('widget.sticker.selection.sync', newSticker);
  };

  const selectStickerEntity = (id: string) => {
    setSelectedStickerEntity(id);
    deselectTextEntity();
    deselectShapeEntity();
    deselectImageEntity();
    deselectCounterEntity();
    deselectDrawingEntity();
    deselectLottieEntity();
    const entity = canvasStickerEntities.find((e) => e.id === id);
    if (entity) {
      bus.emit('widget.sticker.selection.sync', entity);
    }
  };

  const deselectStickerEntity = () => {
    if (selectedStickerEntity) {
      bus.emit('widget.sticker.deselected', {});
    }
    setSelectedStickerEntity(null);
  };

  // ---- Lottie Entity Functions ----
  const addLottieEntityToCanvas = () => {
    const id = `lottie-${Date.now()}`;
    const newLottie: CanvasLottieEntity = {
      id,
      assetUrl: 'https://lottie.host/4db68bbd-31f6-4cd8-84eb-189571e20dc3/3VEPaAaJfp.lottie',
      loop: true,
      speed: 1,
      direction: 1,
      autoplay: true,
      aspectLocked: true,
      x: 50 + Math.random() * 200,
      y: 50 + Math.random() * 200,
      width: 120,
      height: 120,
    };
    setCanvasLottieEntities((prev) => [...prev, newLottie]);
    deselectAllEntities();
    setSelectedLottieEntity(id);
    bus.emit('widget.lottie.selection.sync', newLottie);
  };

  const selectLottieEntity = (id: string) => {
    setSelectedLottieEntity(id);
    deselectTextEntity();
    deselectShapeEntity();
    deselectImageEntity();
    deselectCounterEntity();
    deselectDrawingEntity();
    deselectStickerEntity();
    const entity = canvasLottieEntities.find((e) => e.id === id);
    if (entity) {
      bus.emit('widget.lottie.selection.sync', entity);
    }
  };

  const deselectLottieEntity = () => {
    if (selectedLottieEntity) {
      bus.emit('widget.lottie.deselected', {});
    }
    setSelectedLottieEntity(null);
  };

  // ---- Pen Mode Handlers ----
  const handlePenDown = (e: React.MouseEvent) => {
    if (!penMode) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLiveStrokePoints([{ x, y }]);
    setIsDrawingStroke(true);
  };

  const handlePenMove = (e: React.MouseEvent) => {
    if (!isDrawingStroke || !penMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLiveStrokePoints((prev) => [...prev, { x, y }]);
  };

  const handlePenUp = () => {
    if (!isDrawingStroke) return;
    setIsDrawingStroke(false);
    if (liveStrokePoints.length >= 2) {
      addDrawingEntityToCanvas([...liveStrokePoints]);
    }
    setLiveStrokePoints([]);
  };

  // Deselect all entities
  const deselectAllEntities = () => {
    deselectTextEntity();
    deselectShapeEntity();
    deselectImageEntity();
    deselectCounterEntity();
    deselectDrawingEntity();
    deselectStickerEntity();
    deselectLottieEntity();
  };

  // ---- Unified Selection (computed from per-type selection states) ----
  const unifiedSelection: SelectedEntityRef =
    selectedTextEntity ? { kind: 'text', id: selectedTextEntity }
    : selectedShapeEntity ? { kind: 'shape', id: selectedShapeEntity }
    : selectedImageEntity ? { kind: 'image', id: selectedImageEntity }
    : selectedCounterEntity ? { kind: 'counter', id: selectedCounterEntity }
    : selectedDrawingEntity ? { kind: 'drawing', id: selectedDrawingEntity }
    : selectedStickerEntity ? { kind: 'sticker', id: selectedStickerEntity }
    : selectedLottieEntity ? { kind: 'lottie', id: selectedLottieEntity }
    : null;

  // Parse composite key "kind:id" and select the appropriate entity type
  const selectByCompositeKey = useCallback((compositeId: string) => {
    const colonIdx = compositeId.indexOf(':');
    if (colonIdx === -1) return;
    const kind = compositeId.slice(0, colonIdx);
    const id = compositeId.slice(colonIdx + 1);
    switch (kind) {
      case 'text': selectTextEntity(id); break;
      case 'shape': selectShapeEntity(id); break;
      case 'image': selectImageEntity(id); break;
      case 'counter': selectCounterEntity(id); break;
      case 'drawing': selectDrawingEntity(id); break;
      case 'sticker': selectStickerEntity(id); break;
      case 'lottie': selectLottieEntity(id); break;
    }
  }, []);

  // Move the currently selected entity by delta
  const moveEntityUnified = useCallback((dx: number, dy: number) => {
    if (!unifiedSelection) return;
    const { kind, id } = unifiedSelection;
    switch (kind) {
      case 'text':
        setCanvasTextEntities((prev) => prev.map((e) =>
          e.id === id ? { ...e, x: snapPosition(e.x + dx), y: snapPosition(e.y + dy) } : e,
        ));
        break;
      case 'shape':
        setCanvasShapeEntities((prev) => prev.map((e) =>
          e.id === id ? { ...e, x: snapPosition(e.x + dx), y: snapPosition(e.y + dy) } : e,
        ));
        break;
      case 'image':
        setCanvasImageEntities((prev) => prev.map((e) =>
          e.id === id ? { ...e, x: snapPosition(e.x + dx), y: snapPosition(e.y + dy) } : e,
        ));
        break;
      case 'counter':
        setCanvasCounterEntities((prev) => prev.map((e) =>
          e.id === id ? { ...e, x: snapPosition(e.x + dx), y: snapPosition(e.y + dy) } : e,
        ));
        break;
      case 'drawing':
        setCanvasDrawingEntities((prev) => prev.map((e) =>
          e.id === id ? {
            ...e,
            x: snapPosition(e.x + dx),
            y: snapPosition(e.y + dy),
            points: e.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          } : e,
        ));
        break;
      case 'sticker':
        setCanvasStickerEntities((prev) => prev.map((e) =>
          e.id === id ? { ...e, x: snapPosition(e.x + dx), y: snapPosition(e.y + dy) } : e,
        ));
        break;
      case 'lottie':
        setCanvasLottieEntities((prev) => prev.map((e) =>
          e.id === id ? { ...e, x: snapPosition(e.x + dx), y: snapPosition(e.y + dy) } : e,
        ));
        break;
    }
    bus.emit('canvas.entity.moved', { entityId: id, kind, dx, dy });
  }, [unifiedSelection, snapToGrid, showMapLayer, gameMap.cellSize]);

  // Delete the currently selected entity
  const deleteSelectedEntity = useCallback(() => {
    if (!unifiedSelection) return;
    const { kind, id } = unifiedSelection;
    switch (kind) {
      case 'text':
        setCanvasTextEntities((prev) => prev.filter((e) => e.id !== id));
        setSelectedTextEntity(null);
        break;
      case 'shape':
        setCanvasShapeEntities((prev) => prev.filter((e) => e.id !== id));
        setSelectedShapeEntity(null);
        break;
      case 'image':
        setCanvasImageEntities((prev) => prev.filter((e) => e.id !== id));
        setSelectedImageEntity(null);
        break;
      case 'counter':
        setCanvasCounterEntities((prev) => prev.filter((e) => e.id !== id));
        setSelectedCounterEntity(null);
        break;
      case 'drawing':
        setCanvasDrawingEntities((prev) => prev.filter((e) => e.id !== id));
        setSelectedDrawingEntity(null);
        break;
      case 'sticker':
        setCanvasStickerEntities((prev) => prev.filter((e) => e.id !== id));
        setSelectedStickerEntity(null);
        break;
      case 'lottie': {
        const instance = lottieRefs.current.get(id);
        if (instance && typeof (instance as { destroy?: () => void }).destroy === 'function') {
          (instance as { destroy: () => void }).destroy();
        }
        lottieRefs.current.delete(id);
        setCanvasLottieEntities((prev) => prev.filter((e) => e.id !== id));
        setSelectedLottieEntity(null);
        break;
      }
    }
    bus.emit('canvas.entity.deleted', { entityId: id, kind });
  }, [unifiedSelection]);

  // ---- Pointer Drag Hook ----
  const drag = usePointerDrag({
    onDragMove: useCallback((_id: string, delta: { dx: number; dy: number }) => {
      moveEntityUnified(delta.dx, delta.dy);
    }, [moveEntityUnified]),
    onTap: useCallback((compositeId: string) => {
      selectByCompositeKey(compositeId);
      // Fire sticker click events on tap
      const colonIdx = compositeId.indexOf(':');
      if (colonIdx !== -1 && compositeId.slice(0, colonIdx) === 'sticker') {
        const id = compositeId.slice(colonIdx + 1);
        const entity = canvasStickerEntities.find((e) => e.id === id);
        if (entity?.clickEventType) {
          bus.emit(entity.clickEventType, {
            entityId: entity.id,
            entityName: `Sticker ${entity.id}`,
            eventType: entity.clickEventType,
            customPayload: entity.clickEventPayload || {},
          });
        }
      }
    }, [selectByCompositeKey, canvasStickerEntities]),
    enabled: !penMode && !editingTextEntity,
  });

  // ---- Keyboard Shortcuts Hook ----
  const shortcuts = useCanvasShortcuts({
    hasSelection: !!unifiedSelection,
    onDelete: useCallback(() => {
      deleteSelectedEntity();
    }, [deleteSelectedEntity]),
    onDeselect: useCallback(() => {
      deselectAllEntities();
    }, []),
    onNudge: useCallback((dx: number, dy: number) => {
      moveEntityUnified(dx, dy);
    }, [moveEntityUnified]),
    enabled: !penMode && !editingTextEntity,
  });

  // ---- Long Press (touch context menu) ----
  const longPress = useLongPress(
    useCallback((pos: { x: number; y: number }) => {
      if (unifiedSelection) {
        setContextMenu({ x: pos.x, y: pos.y });
      }
    }, [unifiedSelection]),
    !penMode && !editingTextEntity,
  );

  // ---- Context Menu Items ----
  const contextMenuItems: ContextMenuItem[] = contextMenu && unifiedSelection ? [
    { label: 'Delete', action: () => deleteSelectedEntity() },
  ] : [];

  // ---- Right-click Context Menu on Entity ----
  const handleEntityContextMenu = useCallback((e: React.MouseEvent, compositeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    selectByCompositeKey(compositeId);
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [selectByCompositeKey]);

  // ---- Canvas Click (deselect when clicking background) ----
  const handleCanvasBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (penMode) return;
    if (e.target === e.currentTarget) {
      deselectAllEntities();
    }
  }, [penMode]);

  // ---- Render ----

  return (
    <section style={{ flex: '1 1 800px', border: '1px solid var(--sn-border, #374151)', padding: 10 }}>
      <h2>Multi-Entity Test Canvas</h2>

      <div style={{ marginBottom: 10 }}>
        <div style={{ marginBottom: 5, color: '#888', fontSize: 9 }}>PROPERTY PANELS</div>
        <button onClick={() => setTextColorWidgets((prev) => [...prev, { id: `text-${Date.now()}`, type: 'text-tool' }])} style={{ marginRight: 5 }}>
          + Text Props
        </button>
        <button onClick={() => setTextColorWidgets((prev) => [...prev, { id: `color-${Date.now()}`, type: 'color-picker' }])} style={{ marginRight: 5 }}>
          + Color Picker
        </button>
        <button onClick={() => setTextColorWidgets((prev) => [...prev, { id: `shape-${Date.now()}`, type: 'shape-props' }])} style={{ marginRight: 5 }}>
          + Shape Props
        </button>
        <button onClick={() => setTextColorWidgets((prev) => [...prev, { id: `image-${Date.now()}`, type: 'image-props' }])} style={{ marginRight: 5 }}>
          + Image Props
        </button>
        <button onClick={() => setTextColorWidgets((prev) => [...prev, { id: `counter-${Date.now()}`, type: 'counter-control' }])} style={{ marginRight: 5 }}>
          + Counter
        </button>
        <button onClick={() => setTextColorWidgets((prev) => [...prev, { id: `pen-${Date.now()}`, type: 'pen-props' }])} style={{ marginRight: 5 }}>
          + Pen Props
        </button>
        <button onClick={() => setTextColorWidgets((prev) => [...prev, { id: `sticker-${Date.now()}`, type: 'sticker-props' }])} style={{ marginRight: 5, background: '#ffcc00', color: '#000', border: 'none', padding: '4px 8px' }}>
          + Sticker Props
        </button>
        <button onClick={() => setTextColorWidgets((prev) => [...prev, { id: `lottie-${Date.now()}`, type: 'lottie-props' }])} style={{ marginRight: 5, background: '#ff8800', color: '#fff', border: 'none', padding: '4px 8px' }}>
          + Lottie Props
        </button>
        <span style={{ margin: '0 5px', color: '#ccc' }}>|</span>
        <button onClick={() => setMapWidgets((prev) => [...prev, { id: `tile-${Date.now()}`, type: 'tile-palette' }])} style={{ marginRight: 5, background: '#4CAF50', color: '#fff', border: 'none', padding: '4px 8px' }}>
          + Tile Palette
        </button>
        <button onClick={() => setMapWidgets((prev) => [...prev, { id: `brush-${Date.now()}`, type: 'brush-tool' }])} style={{ marginRight: 5, background: '#2196F3', color: '#fff', border: 'none', padding: '4px 8px' }}>
          + Brush Tool
        </button>
        <button onClick={() => setMapWidgets((prev) => [...prev, { id: `props-${Date.now()}`, type: 'map-props' }])} style={{ marginRight: 5, background: '#9C27B0', color: '#fff', border: 'none', padding: '4px 8px' }}>
          + Map Props
        </button>
        <button onClick={() => setGameWidgets((prev) => [...prev, { id: `game-${Date.now()}`, type: 'game-player' }])} style={{ marginRight: 5, background: '#FF4081', color: '#fff', border: 'none', padding: '4px 8px', fontWeight: 'bold' }}>
          + Game Player
        </button>
        <button onClick={() => setTextColorWidgets([])} style={{ marginRight: 5 }}>
          Clear All
        </button>
        <button onClick={() => setTestCanvasBgColor('#ffffff')}>
          Reset BG
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <strong>Test Bus Events:</strong>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
          <button
            onClick={() => {
              if (selectedTextEntity) {
                const entity = canvasTextEntities.find((e) => e.id === selectedTextEntity);
                if (entity) {
                  bus.emit('widget.text.selection.sync', {
                    text: entity.text, fontSize: 24, bold: entity.bold, italic: entity.italic, underline: entity.underline, color: entity.color,
                  });
                  setCanvasTextEntities((prev) => prev.map((e) => e.id === selectedTextEntity ? { ...e, fontSize: 24 } : e));
                }
              }
            }}
            disabled={!selectedTextEntity}
          >
            Set FontSize 24
          </button>
          <button
            onClick={() => {
              if (selectedTextEntity) {
                const entity = canvasTextEntities.find((e) => e.id === selectedTextEntity);
                if (entity) {
                  const newBold = !entity.bold;
                  bus.emit('widget.text.selection.sync', {
                    text: entity.text, fontSize: entity.fontSize, bold: newBold, italic: entity.italic, underline: entity.underline, color: entity.color,
                  });
                  setCanvasTextEntities((prev) => prev.map((e) => e.id === selectedTextEntity ? { ...e, bold: newBold } : e));
                }
              }
            }}
            disabled={!selectedTextEntity}
          >
            Toggle Bold
          </button>
          <button onClick={() => bus.emit('widget.canvas.bgcolor.set', { color: '#ffeeee' })}>
            BG → Light Red
          </button>
          <button onClick={() => bus.emit('widget.canvas.bgcolor.set', { color: '#eeffee' })}>
            BG → Light Green
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
          {selectedTextEntity ? 'Text selected - can modify properties' : 'Select text on canvas to enable property buttons'}
        </div>
      </div>

      {/* Canvas Entity Controls */}
      <div style={{ marginBottom: 10, borderTop: '1px solid #ddd', paddingTop: 10 }}>
        <div style={{ marginBottom: 5, color: '#888', fontSize: 9 }}>ADD ENTITIES</div>
        <button onClick={addTextEntityToCanvas} style={{ marginRight: 5, background: '#00ccff', border: 'none', padding: '4px 8px', cursor: 'pointer' }}>
          + Text
        </button>
        <button onClick={() => addShapeEntityToCanvas('rectangle')} style={{ marginRight: 5, background: '#ff66cc', border: 'none', padding: '4px 8px', cursor: 'pointer' }}>
          + Rectangle
        </button>
        <button onClick={() => addShapeEntityToCanvas('ellipse')} style={{ marginRight: 5, background: '#ff99dd', border: 'none', padding: '4px 8px', cursor: 'pointer' }}>
          + Ellipse
        </button>
        <button onClick={addImageEntityToCanvas} style={{ marginRight: 5, background: '#66ccff', border: 'none', padding: '4px 8px', cursor: 'pointer' }}>
          + Image
        </button>
        <button onClick={addCounterEntityToCanvas} style={{ marginRight: 5, background: '#9966ff', border: 'none', padding: '4px 8px', cursor: 'pointer' }}>
          + Counter
        </button>
        <button onClick={addStickerEntityToCanvas} style={{ marginRight: 5, background: '#ffcc00', border: 'none', padding: '4px 8px', cursor: 'pointer', color: '#000' }}>
          + Sticker
        </button>
        <button onClick={addLottieEntityToCanvas} style={{ marginRight: 5, background: '#ff8800', border: 'none', padding: '4px 8px', cursor: 'pointer', color: '#fff' }}>
          + Lottie
        </button>
        <button
          onClick={() => setPenMode(!penMode)}
          style={{
            marginRight: 5,
            background: penMode ? '#ff4081' : '#ff9800',
            border: 'none',
            padding: '4px 8px',
            cursor: 'pointer',
            color: '#fff',
            fontWeight: penMode ? 'bold' : 'normal',
          }}
        >
          {penMode ? 'Pen ON' : 'Pen OFF'}
        </button>
        <button onClick={() => {
          setCanvasTextEntities([]);
          setCanvasShapeEntities([]);
          setCanvasImageEntities([]);
          setCanvasCounterEntities([]);
          setCanvasDrawingEntities([]);
          setCanvasStickerEntities([]);
          setCanvasLottieEntities([]);
          deselectAllEntities();
        }} style={{ marginRight: 5, background: '#ccc', border: 'none', padding: '4px 8px', cursor: 'pointer' }}>
          Clear All
        </button>
        <span style={{ marginLeft: 10, fontSize: 10, color: '#666' }}>
          Text: {canvasTextEntities.length} | Shapes: {canvasShapeEntities.length} | Images: {canvasImageEntities.length} | Counters: {canvasCounterEntities.length} | Drawings: {canvasDrawingEntities.length} | Stickers: {canvasStickerEntities.length} | Lotties: {canvasLottieEntities.length}
        </span>
      </div>

      {/* Map Layer Controls */}
      <div style={{ marginBottom: 10, borderTop: '1px solid #ddd', paddingTop: 10 }}>
        <div style={{ marginBottom: 5, color: '#888', fontSize: 9 }}>MAP LAYER</div>
        <button
          onClick={() => setShowMapLayer(!showMapLayer)}
          style={{
            marginRight: 5,
            background: showMapLayer ? '#4CAF50' : '#666',
            color: '#fff',
            border: 'none',
            padding: '4px 8px',
            cursor: 'pointer',
          }}
        >
          {showMapLayer ? '\uD83D\uDDFA\uFE0F Map ON' : '\uD83D\uDDFA\uFE0F Map OFF'}
        </button>
        <button
          onClick={() => setGameMap(prev => ({ ...prev, showGrid: !prev.showGrid }))}
          style={{ marginRight: 5, background: gameMap.showGrid ? '#2196F3' : '#666', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer' }}
        >
          Grid: {gameMap.showGrid ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => setBrushMode(brushMode === 'paint' ? 'erase' : 'paint')}
          style={{ marginRight: 5, background: brushMode === 'paint' ? '#4CAF50' : '#f44336', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer' }}
        >
          {brushMode === 'paint' ? '\uD83D\uDD8C\uFE0F Paint' : '\uD83E\uDDF9 Erase'}
        </button>
        <select
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          style={{ marginRight: 5, padding: '3px 6px' }}
        >
          <option value={1}>Brush: 1</option>
          <option value={2}>Brush: 2</option>
          <option value={3}>Brush: 3</option>
          <option value={4}>Brush: 4</option>
        </select>
        <button
          onClick={() => {
            setGameMap(prev => ({ ...prev, tiles: prev.tiles.map(r => r.map(() => null)) }));
            setPaintCount(0);
          }}
          style={{ marginRight: 5, background: '#ff5722', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer' }}
        >
          Clear Map
        </button>
        <span style={{ margin: '0 5px', color: '#ccc' }}>|</span>
        {/* Grid type toggle */}
        {([
          ['flat', 'Flat'],
          ['iso-classic', 'Iso'],
          ['iso-top', 'Top-Down'],
          ['iso-steep', 'Steep'],
          ['iso-diamond', 'Diamond'],
        ] as const).map(([gt, label]) => (
          <button
            key={gt}
            onClick={() => setGameMap((prev) => ({ ...prev, gridType: gt }))}
            style={{
              marginRight: 2,
              background: gameMap.gridType === gt ? '#E91E63' : '#555',
              color: '#fff',
              border: 'none',
              padding: '4px 8px',
              cursor: 'pointer',
              fontWeight: gameMap.gridType === gt ? 'bold' : 'normal',
              fontSize: 11,
            }}
          >
            {label}
          </button>
        ))}
        <span style={{ margin: '0 5px', color: '#ccc' }}>|</span>
        {/* Grid resize controls */}
        <span style={{ fontSize: 10, color: '#888' }}>Cols:</span>
        <button onClick={() => resizeGrid(gameMap.cols - 1, gameMap.rows)} style={{ width: 20, height: 20, fontSize: 12, padding: 0, cursor: 'pointer', marginLeft: 2 }}>{'\u2212'}</button>
        <span style={{ fontSize: 11, fontWeight: 'bold', margin: '0 3px', minWidth: 18, textAlign: 'center', display: 'inline-block' }}>{gameMap.cols}</span>
        <button onClick={() => resizeGrid(gameMap.cols + 1, gameMap.rows)} style={{ width: 20, height: 20, fontSize: 12, padding: 0, cursor: 'pointer' }}>+</button>
        <span style={{ fontSize: 10, color: '#888', marginLeft: 6 }}>Rows:</span>
        <button onClick={() => resizeGrid(gameMap.cols, gameMap.rows - 1)} style={{ width: 20, height: 20, fontSize: 12, padding: 0, cursor: 'pointer', marginLeft: 2 }}>{'\u2212'}</button>
        <span style={{ fontSize: 11, fontWeight: 'bold', margin: '0 3px', minWidth: 18, textAlign: 'center', display: 'inline-block' }}>{gameMap.rows}</span>
        <button onClick={() => resizeGrid(gameMap.cols, gameMap.rows + 1)} style={{ width: 20, height: 20, fontSize: 12, padding: 0, cursor: 'pointer' }}>+</button>
        <span style={{ margin: '0 5px', color: '#ccc' }}>|</span>
        <span style={{ fontSize: 10, color: '#888' }}>Cell:</span>
        <input
          type="range"
          min={8}
          max={64}
          step={1}
          value={gameMap.cellSize}
          onChange={(e) => setGameMap(prev => ({ ...prev, cellSize: Number(e.target.value) }))}
          style={{ width: 60, marginLeft: 4, verticalAlign: 'middle' }}
        />
        <span style={{ fontSize: 10, fontWeight: 'bold', marginLeft: 3 }}>{gameMap.cellSize}px</span>
        <span style={{ margin: '0 5px', color: '#ccc' }}>|</span>
        {/* Grid customization controls */}
        <span style={{ fontSize: 10, color: '#888' }}>Line:</span>
        <input
          type="color"
          value={gameMap.gridColor}
          onChange={(e) => setGameMap(prev => ({ ...prev, gridColor: e.target.value }))}
          title="Grid line color"
          style={{ width: 20, height: 18, padding: 0, border: '1px solid #555', cursor: 'pointer', marginLeft: 3, verticalAlign: 'middle' }}
        />
        <span style={{ fontSize: 10, color: '#888', marginLeft: 4 }}>Wt:</span>
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.5}
          value={gameMap.gridLineWeight}
          onChange={(e) => setGameMap(prev => ({ ...prev, gridLineWeight: Number(e.target.value) }))}
          title="Grid line weight"
          style={{ width: 40, marginLeft: 2, verticalAlign: 'middle' }}
        />
        <span style={{ fontSize: 9, marginLeft: 1 }}>{gameMap.gridLineWeight}</span>
        <span style={{ fontSize: 10, color: '#888', marginLeft: 4 }}>Op:</span>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={gameMap.gridOpacity}
          onChange={(e) => setGameMap(prev => ({ ...prev, gridOpacity: Number(e.target.value) }))}
          title="Grid opacity"
          style={{ width: 40, marginLeft: 2, verticalAlign: 'middle' }}
        />
        <span style={{ fontSize: 9, marginLeft: 1 }}>{Math.round(gameMap.gridOpacity * 100)}%</span>
        <span style={{ margin: '0 5px', color: '#ccc' }}>|</span>
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          style={{
            background: snapToGrid ? '#FF9800' : '#555',
            color: '#fff',
            border: 'none',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          Snap: {snapToGrid ? 'ON' : 'OFF'}
        </button>
        <span style={{ marginLeft: 8, fontSize: 10, color: '#666' }}>
          {gameMap.cols}{'\u00D7'}{gameMap.rows} {gameMap.gridType} | Tile: {selectedTile.name} | Painted: {paintCount}
        </span>
      </div>

      {/* Test Canvas Preview - Interactive with all entity types */}
      <div
        tabIndex={0}
        style={{
          background: testCanvasBgColor,
          border: '2px solid #333',
          padding: 0,
          marginBottom: 10,
          aspectRatio: '1',
          position: 'relative',
          transition: 'background-color 0.3s',
          cursor: penMode ? 'crosshair' : (drag.isDragging ? 'grabbing' : 'default'),
          overflow: 'hidden',
          touchAction: 'none',
          outline: 'none',
        }}
        onKeyDown={shortcuts.onKeyDown}
        onMouseDown={handlePenDown}
        onMouseMove={handlePenMove}
        onMouseUp={handlePenUp}
        onMouseLeave={handlePenUp}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerDown={longPress.onPointerDown}
        onClick={handleCanvasBackgroundClick}
      >
        {/* Canvas info overlay */}
        <div style={{
          position: 'absolute',
          top: 5,
          left: 5,
          fontSize: 10,
          color: testCanvasBgColor === '#ffffff' || testCanvasBgColor === '#ffff00' ? '#333' : '#fff',
          background: 'rgba(0,0,0,0.1)',
          padding: '2px 5px',
          borderRadius: 3,
          zIndex: 100,
          pointerEvents: 'none',
        }}>
          Canvas BG: {testCanvasBgColor}
        </div>

        {/* Map Layer — SVG grid lines + transformed tile cells */}
        {showMapLayer && (() => {
          const cs = gameMap.cellSize;
          const cellPx = `${cs}px`;

          // Transform lookup per grid type
          const ISO_TRANSFORMS: Record<string, string> = {
            'flat': 'none',
            'iso-classic': 'rotate(45deg) scaleY(0.57735)',
            'iso-top': 'rotate(45deg) scaleY(0.26795)',
            'iso-steep': 'rotate(45deg) scaleY(1.0)',
            'iso-diamond': 'rotate(45deg) scaleY(0.5)',
          };

          const isoTransform = ISO_TRANSFORMS[gameMap.gridType] || 'none';
          const isIso = gameMap.gridType !== 'flat';
          const gridW = gameMap.cols * cs;
          const gridH = gameMap.rows * cs;

          // Shared transform style for both SVG grid and tile layers
          const sharedTransform: React.CSSProperties = isIso
            ? { transform: isoTransform, transformOrigin: 'center center', transition: 'transform 0.4s ease' }
            : { transition: 'transform 0.4s ease' };

          return (
          <>
            {/* Layer 1: SVG Grid Lines — same transform as tiles for perfect alignment */}
            {gameMap.showGrid && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <svg
                width={gridW}
                height={gridH}
                style={{ ...sharedTransform, overflow: 'visible' }}
              >
                {/* Vertical lines */}
                {Array.from({ length: gameMap.cols + 1 }, (_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * cs} y1={0}
                    x2={i * cs} y2={gridH}
                    stroke={gameMap.gridColor}
                    strokeWidth={gameMap.gridLineWeight}
                    strokeOpacity={gameMap.gridOpacity}
                  />
                ))}
                {/* Horizontal lines */}
                {Array.from({ length: gameMap.rows + 1 }, (_, i) => (
                  <line
                    key={`h-${i}`}
                    x1={0} y1={i * cs}
                    x2={gridW} y2={i * cs}
                    stroke={gameMap.gridColor}
                    strokeWidth={gameMap.gridLineWeight}
                    strokeOpacity={gameMap.gridOpacity}
                  />
                ))}
              </svg>
            </div>
            )}

            {/* Layer 2: Tile Cells — centered, same transform as grid */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  width: `${gridW}px`,
                  height: `${gridH}px`,
                  ...sharedTransform,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsPainting(true);
                }}
                onMouseUp={() => setIsPainting(false)}
                onMouseLeave={() => setIsPainting(false)}
              >
                {gameMap.tiles.map((row, rowIdx) =>
                  row.map((tile, colIdx) => {
                    const isPlayerHere = playerPos && playerPos.row === rowIdx && playerPos.col === colIdx;
                    return (
                      <div
                        key={`map-${rowIdx}-${colIdx}`}
                        style={{
                          width: cellPx,
                          height: cellPx,
                          background: tile ? tile.color : 'transparent',
                          cursor: 'crosshair',
                          position: 'relative',
                          boxSizing: 'border-box',
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          paintTile(rowIdx, colIdx);
                        }}
                        onMouseEnter={() => {
                          if (isPainting) paintTile(rowIdx, colIdx);
                        }}
                      >
                        {isPlayerHere && (
                          <div style={{
                            position: 'absolute',
                            inset: '15%',
                            borderRadius: '50%',
                            background: '#FF4081',
                            border: '2px solid #fff',
                            boxShadow: '0 0 6px rgba(255,64,129,0.8)',
                            pointerEvents: 'none',
                            zIndex: 10,
                          }} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
          );
        })()}

        {/* Render shape entities */}
        {canvasShapeEntities.map((entity) => {
          const isSelected = selectedShapeEntity === entity.id;
          return (
            <div
              key={entity.id}
              style={{
                position: 'absolute',
                left: entity.x,
                top: entity.y,
                width: entity.width,
                height: entity.height,
                background: entity.fill,
                border: `${entity.strokeWidth}px solid ${entity.stroke}`,
                borderRadius: entity.type === 'ellipse' ? '50%' : entity.borderRadius,
                cursor: 'pointer',
                outline: isSelected ? '2px dashed #0066ff' : 'none',
                outlineOffset: 2,
                boxSizing: 'border-box',
              }}
              onPointerDown={(e) => drag.onPointerDown(e, `shape:${entity.id}`)}
              onContextMenu={(e) => handleEntityContextMenu(e, `shape:${entity.id}`)}
            />
          );
        })}

        {/* Render image entities */}
        {canvasImageEntities.map((entity) => {
          const isSelected = selectedImageEntity === entity.id;
          return (
            <div
              key={entity.id}
              style={{
                position: 'absolute',
                left: entity.x,
                top: entity.y,
                width: entity.width,
                height: entity.height,
                cursor: 'pointer',
                outline: isSelected ? '2px dashed #0066ff' : 'none',
                outlineOffset: 2,
                overflow: 'hidden',
                borderRadius: 4,
              }}
              onPointerDown={(e) => drag.onPointerDown(e, `image:${entity.id}`)}
              onContextMenu={(e) => handleEntityContextMenu(e, `image:${entity.id}`)}
            >
              <img
                src={entity.src}
                alt="entity"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: entity.fit,
                  opacity: entity.opacity / 100,
                  filter: `brightness(${entity.brightness}%) blur(${entity.blur}px)`,
                  pointerEvents: 'none',
                }}
              />
            </div>
          );
        })}

        {/* Render counter entities */}
        {canvasCounterEntities.map((entity) => {
          const isSelected = selectedCounterEntity === entity.id;
          return (
            <div
              key={entity.id}
              style={{
                position: 'absolute',
                left: entity.x,
                top: entity.y,
                width: 60,
                height: 40,
                background: '#1a1a2e',
                border: '2px solid #333',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 20,
                fontWeight: 'bold',
                cursor: 'pointer',
                outline: isSelected ? '2px dashed #0066ff' : 'none',
                outlineOffset: 2,
              }}
              onPointerDown={(e) => drag.onPointerDown(e, `counter:${entity.id}`)}
              onContextMenu={(e) => handleEntityContextMenu(e, `counter:${entity.id}`)}
            >
              {entity.value}
            </div>
          );
        })}

        {/* Render drawing entities + live stroke as SVG overlay */}
        {(canvasDrawingEntities.length > 0 || isDrawingStroke) && (
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              zIndex: 50,
              pointerEvents: 'none',
            }}
          >
            {canvasDrawingEntities.map((entity) => {
              const isSelected = selectedDrawingEntity === entity.id;
              const pathD = pointsToSmoothPath(entity.points, entity.smoothing);
              return (
                <path
                  key={entity.id}
                  d={pathD}
                  fill="none"
                  stroke={entity.stroke}
                  strokeWidth={entity.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    pointerEvents: 'stroke',
                    cursor: 'pointer',
                    filter: isSelected ? 'drop-shadow(0 0 3px #0066ff)' : 'none',
                  }}
                  onPointerDown={(e) => { e.stopPropagation(); drag.onPointerDown(e, `drawing:${entity.id}`); }}
                  onContextMenu={(e) => handleEntityContextMenu(e, `drawing:${entity.id}`)}
                />
              );
            })}
            {/* Live stroke while drawing */}
            {isDrawingStroke && liveStrokePoints.length >= 2 && (
              <path
                d={pointsToSmoothPath(liveStrokePoints, penSmoothing)}
                fill="none"
                stroke={penStroke}
                strokeWidth={penStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.7}
              />
            )}
          </svg>
        )}

        {/* Render text entities */}
        {canvasTextEntities.map((entity) => {
          const isEditing = editingTextEntity === entity.id;
          const isSelected = selectedTextEntity === entity.id;

          return (
            <div
              key={entity.id}
              style={{
                position: 'absolute',
                left: entity.x,
                top: entity.y,
                padding: '4px 8px',
                border: isSelected ? '2px dashed #0066ff' : '2px dashed transparent',
                background: isSelected ? 'rgba(0, 102, 255, 0.1)' : 'transparent',
                borderRadius: 4,
                cursor: isEditing ? 'text' : (isSelected ? 'grab' : 'pointer'),
              }}
              onPointerDown={(e) => { if (!isEditing) drag.onPointerDown(e, `text:${entity.id}`); }}
              onContextMenu={(e) => handleEntityContextMenu(e, `text:${entity.id}`)}
              onDoubleClick={(e) => handleTextEntityDoubleClick(e, entity.id)}
            >
              {isEditing ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={entity.text}
                  onChange={handleInlineEditChange}
                  onBlur={handleInlineEditCommit}
                  onKeyDown={handleInlineEditKeyDown}
                  style={{
                    fontSize: entity.fontSize,
                    fontWeight: entity.bold ? 'bold' : 'normal',
                    fontStyle: entity.italic ? 'italic' : 'normal',
                    textDecoration: entity.underline ? 'underline' : 'none',
                    color: entity.color,
                    background: 'transparent',
                    border: 'none',
                    outline: '2px solid #0066ff',
                    padding: 0,
                    margin: 0,
                    fontFamily: 'inherit',
                    minWidth: 50,
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  style={{
                    fontSize: entity.fontSize,
                    fontWeight: entity.bold ? 'bold' : 'normal',
                    fontStyle: entity.italic ? 'italic' : 'normal',
                    textDecoration: entity.underline ? 'underline' : 'none',
                    color: entity.color,
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {entity.text || '(empty)'}
                </span>
              )}
            </div>
          );
        })}

        {/* Render sticker entities */}
        {canvasStickerEntities.map((entity) => {
          const isSelected = selectedStickerEntity === entity.id;
          const isHovered = hoveredSticker === entity.id;
          const hoverStyle: React.CSSProperties = {};
          if (isHovered && entity.hoverEffect === 'scale') {
            hoverStyle.transform = 'scale(1.1)';
          } else if (isHovered && entity.hoverEffect === 'glow') {
            hoverStyle.boxShadow = '0 0 12px 4px rgba(255, 204, 0, 0.6)';
          } else if (isHovered && entity.hoverEffect === 'opacity') {
            hoverStyle.opacity = 0.7;
          }
          return (
            <div
              key={entity.id}
              style={{
                position: 'absolute',
                left: entity.x,
                top: entity.y,
                width: entity.width,
                height: entity.height,
                border: isSelected ? '2px solid #ffcc00' : '2px solid transparent',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.15s',
                ...hoverStyle,
              }}
              onPointerDown={(e) => drag.onPointerDown(e, `sticker:${entity.id}`)}
              onContextMenu={(e) => handleEntityContextMenu(e, `sticker:${entity.id}`)}
              onMouseEnter={() => {
                setHoveredSticker(entity.id);
                bus.emit('sticker.hovered', { entityId: entity.id });
              }}
              onMouseLeave={() => {
                setHoveredSticker(null);
                bus.emit('sticker.unhovered', { entityId: entity.id });
              }}
            >
              {entity.assetType === 'video' ? (
                <video
                  src={entity.assetUrl}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2, pointerEvents: 'none' }}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={entity.assetUrl}
                  alt={`Sticker ${entity.id}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2, pointerEvents: 'none' }}
                  draggable={false}
                />
              )}
              {isSelected && (
                <div style={{ position: 'absolute', top: -16, left: 0, fontSize: 9, color: '#ffcc00', whiteSpace: 'nowrap' }}>
                  Sticker {entity.clickEventType ? `[${entity.clickEventType}]` : ''}
                </div>
              )}
            </div>
          );
        })}

        {/* Render lottie entities */}
        {canvasLottieEntities.map((entity) => {
          const isSelected = selectedLottieEntity === entity.id;
          return (
            <div
              key={entity.id}
              style={{
                position: 'absolute',
                left: entity.x,
                top: entity.y,
                width: entity.width,
                height: entity.height,
                border: isSelected ? '2px solid #ff8800' : '2px solid transparent',
                borderRadius: 4,
                cursor: 'pointer',
              }}
              onPointerDown={(e) => drag.onPointerDown(e, `lottie:${entity.id}`)}
              onContextMenu={(e) => handleEntityContextMenu(e, `lottie:${entity.id}`)}
            >
              <canvas
                ref={(el) => {
                  if (el && !lottieRefs.current.has(entity.id)) {
                    import('@lottiefiles/dotlottie-web').then(({ DotLottie }) => {
                      const instance = new DotLottie({
                        canvas: el,
                        src: entity.assetUrl,
                        loop: entity.loop,
                        speed: entity.speed,
                        autoplay: entity.autoplay,
                      });
                      lottieRefs.current.set(entity.id, instance);
                    });
                  }
                }}
                width={entity.width}
                height={entity.height}
                style={{ width: '100%', height: '100%', borderRadius: 2 }}
              />
              {isSelected && (
                <div style={{ position: 'absolute', top: -16, left: 0, fontSize: 9, color: '#ff8800', whiteSpace: 'nowrap' }}>
                  Lottie [{entity.speed}x {entity.loop ? 'loop' : 'once'}]
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state hint */}
        {canvasTextEntities.length === 0 && canvasShapeEntities.length === 0 && canvasImageEntities.length === 0 && canvasCounterEntities.length === 0 && canvasDrawingEntities.length === 0 && canvasStickerEntities.length === 0 && canvasLottieEntities.length === 0 && !showMapLayer && (
          <div style={{
            textAlign: 'center',
            padding: 40,
            color: testCanvasBgColor === '#ffffff' || testCanvasBgColor === '#ffff00' ? '#999' : 'rgba(255,255,255,0.5)',
            fontSize: 12,
          }}>
            Add entities using the buttons above.<br/>
            <strong>Text:</strong> Click to select, double-click to edit inline<br/>
            <strong>Shapes/Images/Counters:</strong> Click to select<br/>
            <strong>Stickers:</strong> Click to trigger bus event, hover for effects<br/>
            <strong>Lotties:</strong> Animated .lottie playback with controls<br/>
            <strong>Pen:</strong> Toggle Pen mode ON, then draw on canvas<br/>
            Property panels sync with selected entities (Photoshop-style)<br/>
            <strong>Drag:</strong> Click and drag any entity to reposition<br/>
            <strong>Shortcuts:</strong> Del=delete, Esc=deselect, Arrows=nudge, Shift+Arrows=big nudge
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <CanvasContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenuItems}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>

      {/* Property Panel Widgets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {textColorWidgets.map((w) => {
          const widgetColors: Record<string, string> = {
            'text-tool': '#2196F3',
            'color-picker': '#9C27B0',
            'shape-props': '#ff66cc',
            'image-props': '#66ccff',
            'counter-control': '#9966ff',
            'pen-props': '#ff9800',
            'sticker-props': '#ffcc00',
            'lottie-props': '#ff8800',
          };
          const widgetNames: Record<string, string> = {
            'text-tool': 'Text Props',
            'color-picker': 'Color Picker',
            'shape-props': 'Shape Props',
            'image-props': 'Image Props',
            'counter-control': 'Counter',
            'pen-props': 'Pen Props',
            'sticker-props': 'Sticker Props',
            'lottie-props': 'Lottie Props',
          };
          const widgetHeights: Record<string, number> = {
            'text-tool': 180,
            'color-picker': 200,
            'shape-props': 200,
            'image-props': 200,
            'counter-control': 180,
            'pen-props': 220,
            'sticker-props': 240,
            'lottie-props': 220,
          };
          return (
            <div key={w.id} style={{ border: '1px solid #999', position: 'relative' }}>
              <div style={{ background: widgetColors[w.type] || '#666', color: '#fff', padding: '2px 5px', fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span>{widgetNames[w.type] || w.type}</span>
                <button onClick={() => setTextColorWidgets((prev) => prev.filter((x) => x.id !== w.id))} style={{ fontSize: 10, padding: '0 4px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>{'\u00D7'}</button>
              </div>
              <div style={{ width: 220, height: widgetHeights[w.type] || 180 }}>
                <WidgetFrame
                  widgetId={w.type}
                  instanceId={w.id}
                  widgetHtml={getWidgetHtml(w.type)}
                  config={{}}
                  theme={DEFAULT_WIDGET_THEME}
                  visible={true}
                  width={220}
                  height={widgetHeights[w.type] || 180}
                />
              </div>
            </div>
          );
        })}

        {/* Map Editor Widgets */}
        {mapWidgets.map((w) => {
          const widgetColors: Record<string, string> = {
            'tile-palette': '#4CAF50',
            'map-props': '#9C27B0',
            'brush-tool': '#2196F3',
          };
          const widgetNames: Record<string, string> = {
            'tile-palette': 'Tile Palette',
            'map-props': 'Map Props',
            'brush-tool': 'Brush Tool',
          };
          const widgetHeights: Record<string, number> = {
            'tile-palette': 220,
            'map-props': 220,
            'brush-tool': 180,
          };
          return (
            <div key={w.id} style={{ border: '1px solid #4CAF50', position: 'relative' }}>
              <div style={{ background: widgetColors[w.type] || '#666', color: '#fff', padding: '2px 5px', fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span>{widgetNames[w.type] || w.type}</span>
                <button onClick={() => setMapWidgets((prev) => prev.filter((x) => x.id !== w.id))} style={{ fontSize: 10, padding: '0 4px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>x</button>
              </div>
              <div style={{ width: 220, height: widgetHeights[w.type] || 180 }}>
                <WidgetFrame
                  widgetId={w.type}
                  instanceId={w.id}
                  widgetHtml={getWidgetHtml(w.type)}
                  config={{}}
                  theme={DEFAULT_WIDGET_THEME}
                  visible={true}
                  width={220}
                  height={widgetHeights[w.type] || 180}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Game Player Widgets - larger size */}
      {gameWidgets.length > 0 && (
        <div>
          <div style={{ marginBottom: 5, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {playerPos && (
              <div style={{ padding: '4px 8px', background: '#1a1a2e', color: '#0f0', fontFamily: 'monospace', fontSize: 11, borderRadius: 4, display: 'inline-flex', gap: 12 }}>
                <span>Player: ({playerPos.col}, {playerPos.row})</span>
                <span>Tile: {playerPos.tileName}</span>
                <span>Moves: {playerPos.moves}</span>
              </div>
            )}
            <div style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#888', marginRight: 4 }}>Move:</span>
              {[
                { label: '\u2191', dr: -1, dc: 0 },
                { label: '\u2193', dr: 1, dc: 0 },
                { label: '\u2190', dr: 0, dc: -1 },
                { label: '\u2192', dr: 0, dc: 1 },
              ].map((d) => (
                <button key={d.label} onClick={() => bus.emit('widget.map.move', { dr: d.dr, dc: d.dc })} style={{ width: 24, height: 24, fontSize: 14, padding: 0, cursor: 'pointer', background: '#FF4081', color: '#fff', border: 'none', borderRadius: 3 }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {gameWidgets.map((w) => (
              <div key={w.id} style={{ border: '2px solid #FF4081', position: 'relative', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ background: '#FF4081', color: '#fff', padding: '2px 8px', fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Game Player</span>
                  <button onClick={() => { setGameWidgets((prev) => prev.filter((x) => x.id !== w.id)); setPlayerPos(null); }} style={{ fontSize: 12, padding: '0 4px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>x</button>
                </div>
                <div style={{ width: 400, height: 400 }}>
                  <WidgetFrame
                    widgetId={w.type}
                    instanceId={w.id}
                    widgetHtml={getWidgetHtml(w.type)}
                    config={{}}
                    theme={DEFAULT_WIDGET_THEME}
                    visible={true}
                    width={400}
                    height={400}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {textColorWidgets.length === 0 && mapWidgets.length === 0 && gameWidgets.length === 0 && (
        <p style={{ color: '#666', fontSize: 10 }}>
          Add property panel widgets above. They sync with selected canvas entities (Photoshop-style).
        </p>
      )}
    </section>
  );
};
