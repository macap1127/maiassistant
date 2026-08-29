import { useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

type Props = {
  src: string;
  alt?: string;
  className?: string;
};

/** Pinch / wheel / double-tap zoomable image with drag panning. */
const ZoomableImage = ({ src, alt = "", className = "" }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    reset();
  }, [src, reset]);

  const applyZoom = useCallback((next: number, px: number, py: number) => {
    const { zoom: z, offset: o } = stateRef.current;
    const clamped = Math.min(Math.max(next, MIN_ZOOM), MAX_ZOOM);
    const k = clamped / z;
    const nx = px - (px - o.x) * k;
    const ny = py - (py - o.y) * k;
    setZoom(clamped);
    setOffset(clamped === 1 ? { x: 0, y: 0 } : { x: nx, y: ny });
  }, []);

  const zoomAtCenter = useCallback(
    (factor: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      applyZoom(stateRef.current.zoom * factor, rect.width / 2, rect.height / 2);
    },
    [applyZoom],
  );

  // Native non-passive wheel listener so preventDefault works (incl. trackpad pinch).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      applyZoom(
        stateRef.current.zoom * Math.exp(-dy * 0.002),
        e.clientX - rect.left,
        e.clientY - rect.top,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyZoom]);

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchRef.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
      };
      dragRef.current = null;
    } else if (stateRef.current.zoom > 1) {
      dragRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    if (pointers.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2 - rect.left;
      const cy = (a.y + b.y) / 2 - rect.top;
      if (pinchRef.current.dist > 0) {
        applyZoom(stateRef.current.zoom * (dist / pinchRef.current.dist), cx, cy);
      }
      pinchRef.current = { dist, cx, cy };
      return;
    }

    if (dragRef.current && stateRef.current.zoom > 1) {
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      dragRef.current = { x: e.clientX, y: e.clientY };
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    if (pointers.current.size < 2) pinchRef.current = null;
    if (pointers.current.size === 0) dragRef.current = null;
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (stateRef.current.zoom > 1) reset();
    else applyZoom(2.5, e.clientX - rect.left, e.clientY - rect.top);
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`relative overflow-hidden touch-none ${className}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onDoubleClick={onDoubleClick}
        style={{ cursor: zoom > 1 ? "grab" : "zoom-in" }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="w-full h-full object-contain select-none"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        />
      </div>
      <div className="absolute bottom-2 right-2 flex gap-1">
        <Button type="button" size="icon" variant="secondary" className="h-8 w-8" onClick={() => zoomAtCenter(1 / 1.5)} aria-label="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button type="button" size="icon" variant="secondary" className="h-8 w-8" onClick={() => zoomAtCenter(1.5)} aria-label="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button type="button" size="icon" variant="secondary" className="h-8 w-8" onClick={reset} aria-label="Reset zoom">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ZoomableImage;
