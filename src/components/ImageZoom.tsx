import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface Props {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageZoom({ src, alt, onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const startRef = useRef<{ x: number; y: number; scale: number; tx: number; ty: number } | null>(null);
  const touchDistRef = useRef<number | null>(null);

  const clamp = useCallback((val: number, min: number, max: number) => Math.min(max, Math.max(min, val)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistRef.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1) {
      startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, scale, tx: translate.x, ty: translate.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistRef.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / touchDistRef.current;
      setScale((s) => clamp(s * ratio, 1, 4));
      touchDistRef.current = dist;
    } else if (e.touches.length === 1 && startRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - startRef.current.x;
      const dy = e.touches[0].clientY - startRef.current.y;
      setTranslate({ x: startRef.current.tx + dx, y: startRef.current.ty + dy });
    }
  };

  const handleTouchEnd = () => {
    touchDistRef.current = null;
    startRef.current = null;
  };

  const zoomIn = () => setScale((s) => clamp(s + 0.5, 1, 4));
  const zoomOut = () => {
    setScale((s) => clamp(s - 0.5, 1, 4));
    if (scale <= 1.5) setTranslate({ x: 0, y: 0 });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={src}
        alt={alt}
        className="max-h-[100dvh] max-w-full touch-none select-none"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: touchDistRef.current === null && !startRef.current ? 'transform 0.2s ease' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-3 py-2 backdrop-blur" onClick={(e) => e.stopPropagation()}>
        <button onClick={zoomOut} className="rounded-full p-1.5 text-white hover:bg-white/20" aria-label="Zoom out">
          <ZoomOut size={20} />
        </button>
        <span className="min-w-12 text-center text-xs font-medium text-white tabular-nums">{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} className="rounded-full p-1.5 text-white hover:bg-white/20" aria-label="Zoom in">
          <ZoomIn size={20} />
        </button>
      </div>
      <button onClick={onClose} className="absolute end-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close">
        <X size={22} />
      </button>
    </div>
  );
}
