import { useApp } from "../store";

export function Toolbar() {
  const { workspaceHandle, dirty, save, loadDiagram } = useApp();

  return (
    <div className="h-10 flex-shrink-0 flex items-center gap-2 px-3 border-b border-[var(--dd-border)] bg-[var(--dd-surface)]">
      <span className="text-sm font-medium text-[var(--dd-accent)]">
        {workspaceHandle?.name || "DiagramDocs"}
      </span>
      {workspaceHandle && (
        <>
          <button
            onClick={save}
            className="px-2 py-1 rounded text-sm bg-[var(--dd-accent-dim)] hover:bg-[var(--dd-border)] disabled:opacity-50"
            disabled={!dirty}
          >
            {dirty ? "Save" : "Saved"}
          </button>
          <button
            onClick={loadDiagram}
            className="px-2 py-1 rounded text-sm bg-[var(--dd-accent-dim)] hover:bg-[var(--dd-border)]"
          >
            Reload
          </button>
        </>
      )}
    </div>
  );
}
