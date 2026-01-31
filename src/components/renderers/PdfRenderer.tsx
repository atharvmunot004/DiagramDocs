import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfRendererProps {
  file: File;
}

export function PdfRenderer({ file }: PdfRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        const data = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;
        setNumPages(pdf.numPages);
        setPage(1);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [file]);

  useEffect(() => {
    if (!canvasRef.current || !file || page < 1) return;
    let cancelled = false;
    const render = async () => {
      const data = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      if (cancelled) return;
      const pg = await pdf.getPage(page);
      const viewport = pg.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const ctx = canvas.getContext("2d")!;
      await pg.render({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;
    };
    render();
    return () => { cancelled = true; };
  }, [file, page]);

  if (loading) {
    return (
      <div className="p-4 text-[var(--dd-muted)]">Loading PDF…</div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-[var(--dd-border)]">
        <button
          className="px-2 py-1 rounded bg-[var(--dd-accent-dim)] disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ←
        </button>
        <span className="text-sm text-[var(--dd-muted)]">
          Page {page} / {numPages}
        </span>
        <button
          className="px-2 py-1 rounded bg-[var(--dd-accent-dim)] disabled:opacity-50"
          disabled={page >= numPages}
          onClick={() => setPage((p) => Math.min(numPages, p + 1))}
        >
          →
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <canvas ref={canvasRef} className="max-w-full shadow-lg" />
      </div>
    </div>
  );
}
