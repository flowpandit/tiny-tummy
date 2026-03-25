import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "../ui/button";

interface AvatarCropperProps {
  imageUrl: string;
  onCrop: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const CROP_SIZE = 256; // Output size in px
const VIEW_SIZE = 280; // Visible crop area

export function AvatarCropper({ imageUrl, onCrop, onCancel }: AvatarCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  // Load image dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Fit image so shortest side fills the view
      const scale = VIEW_SIZE / Math.min(img.width, img.height);
      setImgSize({ w: img.width * scale, h: img.height * scale });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [offset],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [dragging, dragStart],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleCrop = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;

    // Calculate what portion of the image is visible in the circle
    const scaledW = imgSize.w * zoom;
    const scaledH = imgSize.h * zoom;
    const viewCenterX = VIEW_SIZE / 2;
    const viewCenterY = VIEW_SIZE / 2;

    // Image position relative to the view center
    const imgLeft = (VIEW_SIZE - scaledW) / 2 + offset.x;
    const imgTop = (VIEW_SIZE - scaledH) / 2 + offset.y;

    // Source coordinates in original image space
    const srcScale = img.width / (imgSize.w * zoom);
    const srcX = (viewCenterX - VIEW_SIZE / 2 - imgLeft) * srcScale;
    const srcY = (viewCenterY - VIEW_SIZE / 2 - imgTop) * srcScale;
    const srcSize = VIEW_SIZE * srcScale;

    // Draw circular clip
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, CROP_SIZE, CROP_SIZE);

    canvas.toBlob(
      (blob) => {
        if (blob) onCrop(blob);
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm font-medium text-[var(--color-text)]">Position your photo</p>

      {/* Crop viewport */}
      <div
        ref={containerRef}
        className="relative overflow-hidden cursor-grab active:cursor-grabbing touch-none"
        style={{ width: VIEW_SIZE, height: VIEW_SIZE, borderRadius: "50%" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Image */}
        <div
          style={{
            width: imgSize.w * zoom,
            height: imgSize.h * zoom,
            position: "absolute",
            left: `calc(50% - ${(imgSize.w * zoom) / 2}px + ${offset.x}px)`,
            top: `calc(50% - ${(imgSize.h * zoom) / 2}px + ${offset.y}px)`,
          }}
        >
          <img
            src={imageUrl}
            alt="Avatar preview"
            className="w-full h-full object-cover pointer-events-none select-none"
            draggable={false}
          />
        </div>

        {/* Circle border overlay */}
        <div
          className="absolute inset-0 rounded-full border-4 border-white/80 pointer-events-none"
          style={{ boxShadow: "0 0 0 1000px rgba(0,0,0,0.4)" }}
        />
      </div>

      {/* Zoom slider */}
      <div className="flex items-center gap-3 w-full max-w-[280px]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="var(--color-muted)" className="w-4 h-4 flex-shrink-0">
          <path d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" />
        </svg>
        <input
          type="range"
          min="1"
          max="3"
          step="0.05"
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-[var(--color-primary)] cursor-pointer"
          aria-label="Zoom"
        />
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="var(--color-muted)" className="w-4 h-4 flex-shrink-0">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
      </div>

      <p className="text-xs text-[var(--color-muted)]">Drag to reposition, slide to zoom</p>

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-[280px]">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="cta" className="flex-1" onClick={handleCrop}>
          Save
        </Button>
      </div>

      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
