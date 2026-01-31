import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  DiagramShape,
  DiagramConnector,
  LinksSidecar,
  ShapeLink,
  OpenDocument,
} from "./types";
import { getDocKindFromPath } from "./types";
import * as workspace from "./lib/workspace";
import { parseSvg } from "./lib/diagram";
import { parseDrawioXml, isDrawioContent } from "./lib/drawio";

interface AppState {
  workspaceHandle: workspace.WorkspaceHandle | null;
  shapes: DiagramShape[];
  connectors: DiagramConnector[];
  shapeLinks: Record<string, ShapeLink>;
  /** Raw SVG content when parse yields 0 shapes (e.g. draw.io export) – display as-is */
  svgContent: string | null;
  openTabs: OpenDocument[];
  activeTabPath: string | null;
  selectedShapeId: string | null;
  connectorSourceId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  dirty: boolean;
}

interface AppActions {
  openWorkspace: () => Promise<void>;
  addShape: (type: DiagramShape["type"], x: number, y: number) => void;
  addConnector: (from: string, to: string) => void;
  updateShape: (id: string, patch: Partial<DiagramShape>) => void;
  deleteSelected: () => void;
  setSelectedShape: (id: string | null) => void;
  setConnectorSourceId: (id: string | null) => void;
  linkShapeToDoc: (shapeId: string, docPath: string) => void;
  unlinkShape: (shapeId: string) => void;
  openDoc: (path: string, title?: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  pinTab: (path: string, pinned: boolean) => void;
  setZoom: (z: number) => void;
  setPan: (p: { x: number; y: number }) => void;
  save: () => Promise<void>;
  loadDiagram: () => Promise<void>;
  pasteDrawio: (xml: string) => boolean;
}

const defaultState: AppState = {
  workspaceHandle: null,
  shapes: [],
  connectors: [],
  shapeLinks: {},
  svgContent: null,
  openTabs: [],
  activeTabPath: null,
  selectedShapeId: null,
  connectorSourceId: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  dirty: false,
};

/** Persist workspace across Strict Mode remounts (dev) and hot reloads */
let persistedWorkspace: workspace.WorkspaceHandle | null = null;

const AppContext = createContext<AppState & AppActions | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => ({
    ...defaultState,
    workspaceHandle: persistedWorkspace,
  }));
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabFilesRef = useRef<Map<string, File>>(new Map());

  const pasteDrawio = useCallback((xml: string): boolean => {
    if (!isDrawioContent(xml)) return false;
    try {
      let { shapes: newShapes, connectors: newConns } = parseDrawioXml(xml);
      if (newShapes.length === 0) return false;
      const offset = 20;
      newShapes = newShapes.map((s) => ({ ...s, x: s.x + offset, y: s.y + offset }));
      setState((s) => ({
        ...s,
        shapes: [...s.shapes, ...newShapes],
        connectors: [...s.connectors, ...newConns],
        dirty: true,
      }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const loadDiagram = useCallback(async () => {
    const handle = state.workspaceHandle;
    if (!handle) return;
    const [svgFile, linksFile] = await Promise.all([
      workspace.getDiagramSvg(handle),
      workspace.getLinksJson(handle),
    ]);
    let shapes = defaultState.shapes;
    let connectors = defaultState.connectors;
    let shapeLinks = defaultState.shapeLinks;
    let svgContent: string | null = null;
    if (svgFile) {
      const svgText = await svgFile.text();
      const parsed = parseSvg(svgText);
      shapes = parsed.shapes;
      connectors = parsed.connectors;
      if (shapes.length === 0) {
        svgContent = svgText;
      }
    }
    if (linksFile) {
      const text = await linksFile.text();
      const linksJson = JSON.parse(text) as LinksSidecar;
      if (linksJson.links) {
        shapeLinks = Object.fromEntries(
          Object.entries(linksJson.links).map(([id, e]) => [
            id,
            { docPath: e.docPath, docKind: e.docType, title: e.title },
          ])
        );
      } else {
        shapeLinks = linksJson.shapeLinks || {};
      }
      if (linksJson.connectors?.length) connectors = linksJson.connectors;
    }
    setState((s) => ({ ...s, shapes, connectors, shapeLinks, svgContent: svgContent ?? null, dirty: false }));
  }, [state.workspaceHandle]);

  const openWorkspace = useCallback(async () => {
    const handle = await workspace.pickWorkspace();
    if (!handle) {
      alert("Folder picker not supported. Use Chrome or Edge.");
      return;
    }
    persistedWorkspace = handle;
    setState((s) => ({
      ...s,
      workspaceHandle: handle,
      openTabs: [],
      activeTabPath: null,
    }));
  }, []);

  useEffect(() => {
    if (state.workspaceHandle) loadDiagram();
  }, [state.workspaceHandle, loadDiagram]);

  const addShape = useCallback((type: DiagramShape["type"], x: number, y: number) => {
    const id = `node-${uuidv4().slice(0, 8)}`;
    const w = type === "diamond" ? 80 : 120;
    const h = type === "diamond" ? 80 : 50;
    setState((s) => ({
      ...s,
      shapes: [...s.shapes, { id, type, x, y, width: w, height: h, text: "" }],
      dirty: true,
    }));
  }, []);

  const addConnector = useCallback((from: string, to: string) => {
    if (from === to) return;
    const id = `conn-${uuidv4().slice(0, 8)}`;
    setState((s) => ({
      ...s,
      connectors: [...s.connectors, { id, from, to, type: "straight" }],
      connectorSourceId: null,
      dirty: true,
    }));
  }, []);

  const updateShape = useCallback((id: string, patch: Partial<DiagramShape>) => {
    setState((s) => ({
      ...s,
      shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)),
      dirty: true,
    }));
  }, []);

  const deleteSelected = useCallback(() => {
    const id = state.selectedShapeId;
    if (!id) return;
    setState((s) => ({
      ...s,
      shapes: s.shapes.filter((sh) => sh.id !== id),
      connectors: s.connectors.filter((c) => c.from !== id && c.to !== id),
      shapeLinks: Object.fromEntries(Object.entries(s.shapeLinks).filter(([k]) => k !== id)),
      selectedShapeId: null,
      dirty: true,
    }));
  }, [state.selectedShapeId]);

  const linkShapeToDoc = useCallback((shapeId: string, docPath: string) => {
    const kind = getDocKindFromPath(docPath);
    if (!kind) return;
    const title = docPath.split("/").pop() || docPath;
    setState((s) => ({
      ...s,
      shapeLinks: { ...s.shapeLinks, [shapeId]: { docPath, docKind: kind, title } },
      dirty: true,
    }));
  }, []);

  const unlinkShape = useCallback((shapeId: string) => {
    setState((s) => ({
      ...s,
      shapeLinks: Object.fromEntries(Object.entries(s.shapeLinks).filter(([k]) => k !== shapeId)),
      dirty: true,
    }));
  }, []);

  const openDoc = useCallback(
    async (path: string, title?: string) => {
      const handle = state.workspaceHandle;
      if (!handle) return;
      const kind = getDocKindFromPath(path);
      if (!kind) return;
      const file = await workspace.getFileByPath(handle, path);
      if (!file) {
        alert(`Cannot open: ${path}`);
        return;
      }
      tabFilesRef.current.set(path, file);
      const doc: OpenDocument = {
        path,
        kind,
        title: title || path.split("/").pop() || path,
        file,
        pinned: false,
      };
      setState((s) => {
        const exists = s.openTabs.find((t) => t.path === path);
        if (exists) {
          return { ...s, activeTabPath: path };
        }
        return {
          ...s,
          openTabs: [...s.openTabs, doc],
          activeTabPath: path,
        };
      });
    },
    [state.workspaceHandle]
  );

  const closeTab = useCallback((path: string) => {
    tabFilesRef.current.delete(path);
    setState((s) => {
      const tabs = s.openTabs.filter((t) => t.path !== path);
      const nextActive =
        s.activeTabPath === path
          ? tabs.length
            ? tabs[tabs.length - 1].path
            : null
          : s.activeTabPath;
      return { ...s, openTabs: tabs, activeTabPath: nextActive };
    });
  }, []);

  const setActiveTab = useCallback((path: string) => {
    setState((s) => ({ ...s, activeTabPath: path }));
  }, []);

  const pinTab = useCallback((path: string, pinned: boolean) => {
    setState((s) => ({
      ...s,
      openTabs: s.openTabs.map((t) => (t.path === path ? { ...t, pinned } : t)),
    }));
  }, []);

  const save = useCallback(async () => {
    const handle = state.workspaceHandle;
    if (!handle) return;
    const links: LinksSidecar = {
      schemaVersion: 1,
      links: Object.fromEntries(
        Object.entries(state.shapeLinks).map(([id, s]) => [
          id,
          { docPath: s.docPath, docType: s.docKind, title: s.title },
        ])
      ),
      uiState: {
        openTabs: state.openTabs.map((t) => ({
          docPath: t.path,
          active: t.path === state.activeTabPath,
          pinned: t.pinned,
          group: "main" as const,
        })),
        activeSplit: "main",
      },
      audit: {
        lastModified: new Date().toISOString(),
      },
    };
    await workspace.writeLinksJson(handle, JSON.stringify(links, null, 2));
    setState((s) => ({ ...s, dirty: false }));
  }, [state.workspaceHandle, state.shapeLinks, state.openTabs, state.activeTabPath]);

  useEffect(() => {
    if (!state.dirty || !state.workspaceHandle) return;
    autoSaveTimer.current = setTimeout(() => {
      save();
    }, 2000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [state.dirty, state.workspaceHandle, save]);

  const value = useMemo(
    () => ({
      ...state,
      openWorkspace,
      addShape,
      addConnector,
      updateShape,
      setConnectorSourceId: (id: string | null) =>
        setState((s) => ({ ...s, connectorSourceId: id })),
      deleteSelected,
      setSelectedShape: (id: string | null) =>
        setState((s) => ({ ...s, selectedShapeId: id })),
      linkShapeToDoc,
      unlinkShape,
      openDoc,
      closeTab,
      setActiveTab,
      pinTab,
      setZoom: (zoom: number) =>
        setState((s) => ({ ...s, zoom: Math.max(0.05, Math.min(64, zoom)) })),
      setPan: (pan: { x: number; y: number }) => setState((s) => ({ ...s, pan })),
      save,
      loadDiagram,
      pasteDrawio,
    }),
    [
      state,
      openWorkspace,
      addShape,
      addConnector,
      updateShape,
      deleteSelected,
      linkShapeToDoc,
      unlinkShape,
      openDoc,
      closeTab,
      setActiveTab,
      pinTab,
      save,
      loadDiagram,
      pasteDrawio,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function getTabFile(_path: string): File | null {
  return null;
}
