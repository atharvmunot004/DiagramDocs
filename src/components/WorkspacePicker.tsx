import { useApp } from "../store";

export function WorkspacePicker() {
  const { workspaceHandle, openWorkspace } = useApp();

  if (workspaceHandle) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[var(--dd-bg)]">
      <div className="text-center max-w-md p-8">
        <h1 className="text-2xl font-bold text-[var(--dd-accent)] mb-2">
          DiagramDocs
        </h1>
        <p className="text-[var(--dd-muted)] mb-6">
          draw.io-like diagramming with linked documents. Open a folder to start.
        </p>
        <button
          onClick={openWorkspace}
          className="px-6 py-3 rounded-lg bg-[var(--dd-accent)] text-[var(--dd-bg)] font-medium hover:opacity-90 transition"
        >
          Open folder
        </button>
        <p className="text-sm text-[var(--dd-muted)] mt-6">
          Requires Chrome or Edge. The folder should contain <code className="bg-[var(--dd-accent-dim)] px-1 rounded">diagram.svg</code> and{" "}
          <code className="bg-[var(--dd-accent-dim)] px-1 rounded">diagram.links.json</code>, or start empty.
        </p>
      </div>
    </div>
  );
}
