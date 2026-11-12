import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { ImageZoom } from './ImageZoom';

interface Props {
  images: Array<{ id: string; url: string | null }>;
}

export function CardImages({ images }: Props) {
  const [zoomIdx, setZoomIdx] = useState<number | null>(null);

  if (!images || images.length === 0) return null;
  const validImages = images.filter((img) => img.url);
  if (validImages.length === 0) return null;

  return (
    <>
      <div className={`mt-3 grid gap-2 ${validImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {validImages.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setZoomIdx(i)}
            className="relative overflow-hidden rounded-xl border border-ink-100 dark:border-ink-700"
          >
            <img
              src={img.url!}
              alt={`Image ${i + 1}`}
              className="h-32 w-full object-cover transition hover:opacity-90"
              loading="lazy"
            />
            <div className="absolute bottom-1 end-1 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white">
              <ImageIcon size={10} className="inline" /> {i + 1}
            </div>
          </button>
        ))}
      </div>
      {zoomIdx !== null && validImages[zoomIdx] && (
        <ImageZoom
          src={validImages[zoomIdx].url!}
          alt={`Image ${zoomIdx + 1}`}
          onClose={() => setZoomIdx(null)}
        />
      )}
    </>
  );
}
