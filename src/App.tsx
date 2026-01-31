import { useEffect } from "react";
import { AppProvider, useApp } from "./store";
import { WorkspacePicker } from "./components/WorkspacePicker";
import { Toolbar } from "./components/Toolbar";
import { DiagramCanvas } from "./components/DiagramCanvas";
import { DocViewer } from "./components/DocViewer";

function AppContent() {
  const { workspaceHandle, pasteDrawio } = useApp();

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!workspaceHandle) return;
      const text = e.clipboardData?.getData("text/plain");
      if (text && pasteDrawio(text)) {
        e.preventDefault();
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [workspaceHandle, pasteDrawio]);

  if (!workspaceHandle) {
    return <WorkspacePicker />;
  }

  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <div className="flex flex-1 min-h-0">
        <DiagramCanvas />
        <DocViewer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
