/** Supported document kinds for linking */
export type DocKind = "pdf" | "image" | "markdown" | "json";

/** Extensions per doc kind */
export const DOC_EXTENSIONS: Record<DocKind, string[]> = {
  pdf: ["pdf"],
  image: ["png", "jpg", "jpeg", "svg", "webp"],
  markdown: ["md"],
  json: ["json"],
};

export function getDocKindFromPath(path: string): DocKind | null {
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  for (const [kind, exts] of Object.entries(DOC_EXTENSIONS)) {
    if (exts.includes(ext)) return kind as DocKind;
  }
  return null;
}

/** Shape in diagram */
export interface DiagramShape {
  id: string;
  type: "rect" | "ellipse" | "diamond";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

/** Connector between shapes */
export interface DiagramConnector {
  id: string;
  from: string;
  to: string;
  type: "straight" | "orthogonal";
}

/** Link from shape/element to document (internal) */
export interface ShapeLink {
  docPath: string;
  docKind: DocKind;
  title?: string;
}

/** Persisted link entry in diagram.links.json (spec: docType) */
export interface SidecarLinkEntry {
  docPath: string;
  docType: DocKind;
  title?: string;
}

/** diagram.links.json schema (spec format + legacy compat) */
export interface LinksSidecar {
  schemaVersion: number;
  /** Spec format: key = svg_element_id */
  links?: Record<string, SidecarLinkEntry>;
  /** Legacy */
  shapeLinks?: Record<string, ShapeLink>;
  connectors?: DiagramConnector[];
  uiState?: {
    openTabs?: OpenTab[];
    activeSplit?: string;
    splits?: { enabled: boolean; groups: string[]; activeGroup: string };
  };
  audit?: { lastModified?: string; lastUpdatedAt?: string; updatedBy?: string };
}

export interface OpenTab {
  docPath: string;
  active: boolean;
  pinned: boolean;
  group: "main" | "side";
}

/** Opened document with file handle */
export interface OpenDocument {
  path: string;
  kind: DocKind;
  title: string;
  file: File | null;
  pinned: boolean;
}
