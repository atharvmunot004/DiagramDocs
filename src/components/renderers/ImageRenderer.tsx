import { useState, useRef } from "react";

interface ImageRendererProps {
  file: File;
}

export function ImageRenderer({ file }: ImageRendererProps) {
  const [src, setSrc] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const reader = new FileReader();
  reader.onload = () => setSrc(reader.result as string);
  reader.readAsDataURL(file);

  if (!src) {
    return <div className="p-4 text-[var(--dd-muted)]">Loading image…</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-[var(--dd-border)]">
        <button
          className="px-2 py-1 rounded bg-[var(--dd-accent-dim)]"
          onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
        >
          −
        </button>
        <span className="text-sm text-[var(--dd-muted)]">{Math.round(zoom * 100)}%</span>
        <button
          className="px-2 py-1 rounded bg-[var(--dd-accent-dim)]"
          onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
        >
          +
        </button>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex items-center justify-center"
      >
        <img
          src={src}
          alt={file.name}
          style={{ transform: `scale(${zoom})` }}
          className="max-w-full object-contain"
        />
      </div>
    </div>
  );
}
