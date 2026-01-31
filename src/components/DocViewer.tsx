import { useApp } from "../store";
import { PdfRenderer } from "./renderers/PdfRenderer";
import { ImageRenderer } from "./renderers/ImageRenderer";
import { MarkdownRenderer } from "./renderers/MarkdownRenderer";
import { JsonRenderer } from "./renderers/JsonRenderer";
import type { DocKind } from "../types";

export function DocViewer() {
  const { openTabs, activeTabPath, setActiveTab, closeTab } = useApp();
  const activeDoc = openTabs.find((t) => t.path === activeTabPath);

  if (openTabs.length === 0) {
    return (
      <div className="w-96 flex-shrink-0 border-l border-[var(--dd-border)] flex flex-col bg-[var(--dd-surface)]">
        <div className="p-4 text-center text-[var(--dd-muted)] text-sm">
          Right-click a linked shape to open a document
        </div>
      </div>
    );
  }

  return (
    <div className="w-[420px] flex-shrink-0 border-l border-[var(--dd-border)] flex flex-col bg-[var(--dd-surface)]">
      <div className="flex border-b border-[var(--dd-border)] overflow-x-auto">
        {openTabs.map((tab) => (
          <div
            key={tab.path}
            className={`flex items-center gap-1 px-3 py-2 cursor-pointer border-r border-[var(--dd-border)] min-w-0 max-w-[140px] group ${
              tab.path === activeTabPath ? "bg-[var(--dd-bg)]" : "hover:bg-[var(--dd-accent-dim)]"
            }`}
            onClick={() => setActiveTab(tab.path)}
          >
            <span
              className="truncate text-sm"
              title={tab.path}
            >
              {tab.pinned && "📌 "}
              {tab.title}
            </span>
            <button
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[var(--dd-border)] rounded text-[var(--dd-muted)]"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.path);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {activeDoc && (
          <DocContent doc={activeDoc} />
        )}
      </div>
    </div>
  );
}

function DocContent({ doc }: { doc: { path: string; kind: DocKind; file: File | null } }) {
  if (!doc.file) {
    return (
      <div className="p-4 text-[var(--dd-muted)]">
        Document not loaded. Try reopening.
      </div>
    );
  }

  switch (doc.kind) {
    case "pdf":
      return <PdfRenderer file={doc.file} />;
    case "image":
      return <ImageRenderer file={doc.file} />;
    case "markdown":
      return <MarkdownRenderer file={doc.file} />;
    case "json":
      return <JsonRenderer file={doc.file} />;
    default:
      return (
        <div className="p-4 text-[var(--dd-muted)]">
          Unsupported format: {doc.kind}
        </div>
      );
  }
}
