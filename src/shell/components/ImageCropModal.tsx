/**
 * ImageCropModal — lets users crop an image to a target aspect ratio
 * before uploading it as a profile avatar or banner.
 *
 * Uses native <canvas> for rendering — no external dependencies.
 *
 * @module shell/components
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Modal } from './Modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImageCropModalProps {
  /** The image file to crop */
  file: File;
  /** Target aspect ratio (width / height). 1 = square, 3 = 3:1 banner */
  aspectRatio: number;
  /** Modal title */
  title: string;
  /** Called with the cropped image blob */
  onCrop: (blob: Blob) => void;
  /** Called when the modal is dismissed */
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANVAS_SIZE = 400;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const btnBase: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 'var(--sn-radius, 8px)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: 'var(--sn-accent, #6366f1)',
  color: '#fff',
};

const btnSecondary: React.CSSProperties = {
  ...btnBase,
  background: 'var(--sn-bg, #f3f4f6)',
  color: 'var(--sn-text, #1a1a2e)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  file,
  aspectRatio,
  title,
  onCrop,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [cropRegion, setCropRegion] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, cx: 0, cy: 0 });

  // Load the image
  useEffect(() => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      setImage(img);

      // Calculate initial centered crop region
      const { width: iw, height: ih } = img;
      let cw = iw;
      let ch = iw / aspectRatio;
      if (ch > ih) {
        ch = ih;
        cw = ih * aspectRatio;
      }
      setCropRegion({
        x: (iw - cw) / 2,
        y: (ih - ch) / 2,
        w: cw,
        h: ch,
      });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, aspectRatio]);

  // Draw the image + crop overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: iw, height: ih } = image;
    const scale = Math.min(CANVAS_SIZE / iw, CANVAS_SIZE / ih);
    const dw = iw * scale;
    const dh = ih * scale;

    canvas.width = dw;
    canvas.height = dh;

    // Draw full image dimmed
    ctx.drawImage(image, 0, 0, dw, dh);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, dw, dh);

    // Draw crop region bright
    const sx = cropRegion.x * scale;
    const sy = cropRegion.y * scale;
    const sw = cropRegion.w * scale;
    const sh = cropRegion.h * scale;

    ctx.drawImage(
      image,
      cropRegion.x, cropRegion.y, cropRegion.w, cropRegion.h,
      sx, sy, sw, sh,
    );

    // Border around crop
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);
  }, [image, cropRegion]);

  // Map mouse position to image coordinates
  const toImageCoords = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !image) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(CANVAS_SIZE / image.width, CANVAS_SIZE / image.height);
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    },
    [image],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = toImageCoords(e);
      dragStart.current = { mx: pos.x, my: pos.y, cx: cropRegion.x, cy: cropRegion.y };
      setDragging(true);
    },
    [toImageCoords, cropRegion],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !image) return;
      const pos = toImageCoords(e);
      const dx = pos.x - dragStart.current.mx;
      const dy = pos.y - dragStart.current.my;

      const maxX = image.width - cropRegion.w;
      const maxY = image.height - cropRegion.h;
      setCropRegion((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(maxX, dragStart.current.cx + dx)),
        y: Math.max(0, Math.min(maxY, dragStart.current.cy + dy)),
      }));
    },
    [dragging, image, toImageCoords, cropRegion.w, cropRegion.h],
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleCrop = useCallback(async () => {
    if (!image) return;
    const { x, y, w, h } = cropRegion;

    const offscreen = new OffscreenCanvas(w, h);
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
    const blob = await offscreen.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    onCrop(blob);
  }, [image, cropRegion, onCrop]);

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={title}
      maxWidth={500}
      footer={
        <>
          <button style={btnSecondary} onClick={onCancel}>Cancel</button>
          <button style={btnPrimary} onClick={handleCrop}>Crop & Upload</button>
        </>
      }
    >
      <div
        style={{ display: 'flex', justifyContent: 'center', cursor: dragging ? 'grabbing' : 'grab' }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {image ? (
          <canvas
            ref={canvasRef}
            style={{ maxWidth: '100%', borderRadius: 'var(--sn-radius, 8px)' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          />
        ) : (
          <div style={{ padding: 40, color: 'var(--sn-text-muted, #6b7280)' }}>Loading image...</div>
        )}
      </div>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--sn-text-muted, #6b7280)', marginTop: 12 }}>
        Drag to reposition the crop area
      </p>
    </Modal>
  );
};
