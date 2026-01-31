import { useEffect, useState } from "react";
import { useApp } from "../store";
import { listDocFiles } from "../lib/workspace";
import { getDocKindFromPath } from "../types";

interface DocPickerProps {
  onSelect: (path: string) => void;
  onClose: () => void;
  anchor: { x: number; y: number };
  onPickFromComputer?: () => void;
}

export function DocPicker({ onSelect, onClose, anchor, onPickFromComputer }: DocPickerProps) {
  const { workspaceHandle } = useApp();
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    if (!workspaceHandle) return;
    listDocFiles(workspaceHandle).then((list) => {
      const supported = list.filter(
        (p) =>
          getDocKindFromPath(p) &&
          !p.endsWith("diagram.svg") &&
          !p.endsWith("diagram.links.json")
      );
      setPaths(supported);
    });
  }, [workspaceHandle]);

  return (
    <div
      data-dialog
      className="fixed bg-[var(--dd-surface)] border border-[var(--dd-border)] rounded-lg shadow-xl py-1 z-[60] max-h-64 overflow-auto min-w-[200px]"
      style={{ left: anchor.x, top: anchor.y }}
    >
      <div className="px-3 py-2 text-xs text-[var(--dd-muted)] border-b border-[var(--dd-border)]">
        Select document to link
      </div>
      {onPickFromComputer && (
        <button
          className="block w-full text-left px-4 py-2 hover:bg-[var(--dd-accent-dim)] text-sm border-b border-[var(--dd-border)]"
          onClick={onPickFromComputer}
        >
          + Add from computer...
        </button>
      )}
      {paths.length === 0 && (
        <div className="px-4 py-6 text-[var(--dd-muted)] text-sm">
          {onPickFromComputer ? "No docs in workspace yet." : "No supported docs in workspace. Add PDF, MD, JSON, or images to docs/"}
        </div>
      )}
      {paths.map((path) => (
        <button
          key={path}
          className="block w-full text-left px-4 py-2 hover:bg-[var(--dd-accent-dim)] text-sm truncate"
          onClick={() => onSelect(path)}
        >
          {path}
        </button>
      ))}
      <hr className="border-[var(--dd-border)] my-1" />
      <button
        className="block w-full text-left px-4 py-2 text-[var(--dd-muted)] hover:bg-[var(--dd-accent-dim)]"
        onClick={onClose}
      >
        Cancel
      </button>
    </div>
  );
}
