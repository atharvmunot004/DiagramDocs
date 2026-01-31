/** File System Access API - folder-as-project */

const DIAGRAM_SVG = "diagram.svg";
const LINKS_JSON = "diagram.links.json";

export interface WorkspaceHandle {
  root: FileSystemDirectoryHandle;
  name: string;
}

export async function pickWorkspace(): Promise<WorkspaceHandle | null> {
  if (!("showDirectoryPicker" in window)) {
    return null;
  }
  try {
    const root = await (window as unknown as {
      showDirectoryPicker: (opts?: { id?: string; mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
    }).showDirectoryPicker({ id: "diagramdocs", mode: "readwrite" });
    return { root, name: root.name };
  } catch (e) {
    return null;
  }
}

/** Try root first, then docs/ (recommendedStructure) */
export async function getDiagramSvg(handle: WorkspaceHandle): Promise<File | null> {
  const file = await getFileByPath(handle, DIAGRAM_SVG);
  if (file) return file;
  return getFileByPath(handle, `docs/${DIAGRAM_SVG}`);
}

/** Try root first, then docs/ */
export async function getLinksJson(handle: WorkspaceHandle): Promise<File | null> {
  const file = await getFileByPath(handle, LINKS_JSON);
  if (file) return file;
  return getFileByPath(handle, `docs/${LINKS_JSON}`);
}

export async function writeDiagramSvg(handle: WorkspaceHandle, content: string): Promise<void> {
  const f = await handle.root.getFileHandle(DIAGRAM_SVG, { create: true });
  const w = await f.createWritable();
  await w.write(content);
  await w.close();
}

export async function writeLinksJson(handle: WorkspaceHandle, content: string): Promise<void> {
  const f = await handle.root.getFileHandle(LINKS_JSON, { create: true });
  const w = await f.createWritable();
  await w.write(content);
  await w.close();
}

/** Resolve relative path within workspace. Returns File or null. Path must be within workspace. */
export async function getFileByPath(
  handle: WorkspaceHandle,
  relativePath: string
): Promise<File | null> {
  const parts = relativePath.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.some((p) => p === "..")) return null;
  try {
    let dir: FileSystemDirectoryHandle = handle.root;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]);
    }
    const file = await dir.getFileHandle(parts[parts.length - 1]);
    return file.getFile();
  } catch {
    return null;
  }
}

type DirEntry = [string, FileSystemFileHandle | FileSystemDirectoryHandle];

const SUPPORTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".svg", ".webp", ".md", ".json"];
const ACCEPT_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/svg+xml": [".svg"],
  "image/webp": [".webp"],
  "text/markdown": [".md"],
  "application/json": [".json"],
};

/** Pick a file from the user's computer via native file picker */
export function pickFileFromComputer(): Promise<File | null> {
  if ("showOpenFilePicker" in window) {
    return (async () => {
      try {
        const handles = await (window as unknown as {
          showOpenFilePicker: (opts: {
            types: { description: string; accept: Record<string, string[]> }[];
            multiple?: boolean;
          }) => Promise<FileSystemFileHandle[]>;
        }).showOpenFilePicker({
          types: [{ description: "Documents", accept: ACCEPT_TYPES }],
          multiple: false,
        });
        if (handles.length === 0) return null;
        return handles[0].getFile();
      } catch {
        return null;
      }
    })();
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = SUPPORTED_EXTENSIONS.join(",");
    input.onchange = () => {
      const file = input.files?.[0];
      resolve(file ?? null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Ensure a filename is unique in the target dir. Returns base name with optional (1), (2) suffix. */
async function getUniqueFileName(
  dir: FileSystemDirectoryHandle,
  baseName: string
): Promise<string> {
  let name = baseName;
  let n = 0;
  while (true) {
    try {
      await dir.getFileHandle(name);
      n++;
      const ext = baseName.includes(".") ? baseName.substring(baseName.lastIndexOf(".")) : "";
      const stem = baseName.includes(".") ? baseName.slice(0, -ext.length) : baseName;
      name = `${stem} (${n})${ext}`;
    } catch {
      return name;
    }
  }
}

/** Copy a file into docs/ and return the relative path. If file already exists in docs/ with same size, just return path (no copy). */
export async function copyFileToDocs(
  handle: WorkspaceHandle,
  file: File
): Promise<string> {
  const ext = file.name.includes(".") ? file.name.substring(file.name.lastIndexOf(".")).toLowerCase() : "";
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type: ${file.name}`);
  }
  let docsDir: FileSystemDirectoryHandle;
  try {
    docsDir = await handle.root.getDirectoryHandle("docs", { create: true });
  } catch {
    throw new Error("Could not create docs/ folder");
  }
  const path = `docs/${file.name}`;
  try {
    const existing = await docsDir.getFileHandle(file.name);
    const existingFile = await existing.getFile();
    if (existingFile.size === file.size) {
      return path;
    }
  } catch {
    /* file doesn't exist, will copy */
  }
  const uniqueName = await getUniqueFileName(docsDir, file.name);
  const targetFile = await docsDir.getFileHandle(uniqueName, { create: true });
  const w = await targetFile.createWritable();
  const buf = await file.arrayBuffer();
  await w.write(buf);
  await w.close();
  return `docs/${uniqueName}`;
}

/** List files recursively under docs/ for picker */
export async function listDocFiles(handle: WorkspaceHandle): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: FileSystemDirectoryHandle, prefix: string) {
    const iterable = (dir as unknown as { entries(): AsyncIterableIterator<DirEntry> }).entries();
    for await (const [name, entry] of iterable) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (entry.kind === "file") out.push(path);
      else await walk(entry as FileSystemDirectoryHandle, path);
    }
  }
  try {
    const docs = await handle.root.getDirectoryHandle("docs");
    await walk(docs, "docs");
  } catch {
    try {
      await walk(handle.root, "");
    } catch {
      // empty
    }
  }
  return out;
}
