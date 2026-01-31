import type { DiagramShape, DiagramConnector } from "../types";
import { v4 as uuidv4 } from "uuid";

interface MxGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  relative?: boolean;
}

interface MxCell {
  id: string;
  parent: string;
  vertex?: boolean;
  edge?: boolean;
  value: string;
  style: string;
  geometry?: MxGeometry;
  source?: string;
  target?: string;
  sourcePoint?: { x: number; y: number };
  targetPoint?: { x: number; y: number };
}

function parseNum(s: string | null | undefined, def: number): number {
  if (s == null || s === "") return def;
  const n = parseFloat(s);
  return isNaN(n) ? def : n;
}

function parseGeometry(el: Element): MxGeometry | undefined {
  const geom = el.querySelector("mxGeometry");
  if (!geom) return undefined;
  const x = parseNum(geom.getAttribute("x"), 0);
  const y = parseNum(geom.getAttribute("y"), 0);
  const w = parseNum(geom.getAttribute("width"), 100);
  const h = parseNum(geom.getAttribute("height"), 60);
  const relative = geom.getAttribute("relative") === "1";
  return { x, y, width: w, height: h, relative };
}

function parsePoint(el: Element): { x: number; y: number } | undefined {
  const x = parseNum(el.getAttribute("x"), 0);
  const y = parseNum(el.getAttribute("y"), 0);
  return { x, y };
}

function decodeHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function getShapeType(style: string): DiagramShape["type"] {
  const s = style.toLowerCase();
  if (s.includes("shape=ellipse") || s.includes("shape=doubleellipse")) return "ellipse";
  if (s.includes("shape=rhombus") || s.includes("shape=diamond") || s.includes("shape=hexagon")) return "diamond";
  return "rect";
}

/** Parse draw.io / mxGraph XML and return shapes + connectors */
export function parseDrawioXml(input: string): {
  shapes: DiagramShape[];
  connectors: DiagramConnector[];
} {
  let xml = input.trim();
  try {
    if (xml.includes("%3C") || xml.includes("%3E")) {
      xml = decodeURIComponent(xml);
    }
  } catch {
    // not URL-encoded, use as-is
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const root = doc.documentElement;
  if (!root || root.tagName !== "mxGraphModel") {
    return { shapes: [], connectors: [] };
  }
  const cells: MxCell[] = [];
  const cellEls = root.querySelectorAll("mxCell");
  cellEls.forEach((el) => {
    const id = el.getAttribute("id") ?? "";
    const parent = el.getAttribute("parent") ?? "0";
    const vertex = el.getAttribute("vertex") === "1";
    const edge = el.getAttribute("edge") === "1";
    const value = el.getAttribute("value") ?? "";
    const style = el.getAttribute("style") ?? "";
    const source = el.getAttribute("source") ?? undefined;
    const target = el.getAttribute("target") ?? undefined;
    const geometry = parseGeometry(el);
    let sourcePoint: { x: number; y: number } | undefined;
    let targetPoint: { x: number; y: number } | undefined;
    const geomEl = el.querySelector("mxGeometry");
    if (geomEl) {
      const sp = geomEl.querySelector('[as="sourcePoint"]');
      const tp = geomEl.querySelector('[as="targetPoint"]');
      if (sp) sourcePoint = parsePoint(sp as Element);
      if (tp) targetPoint = parsePoint(tp as Element);
    }
    cells.push({
      id,
      parent,
      vertex,
      edge,
      value,
      style,
      geometry,
      source,
      target,
      sourcePoint,
      targetPoint,
    });
  });

  const byId = new Map(cells.map((c) => [c.id, c]));
  function getAbsPos(cell: MxCell): { x: number; y: number } {
    const geom = cell.geometry;
    if (!geom) return { x: 0, y: 0 };
    if (cell.parent === "0" || cell.parent === "1") return { x: geom.x, y: geom.y };
    const parent = byId.get(cell.parent);
    if (!parent) return { x: geom.x, y: geom.y };
    const ppos = getAbsPos(parent);
    return { x: ppos.x + geom.x, y: ppos.y + geom.y };
  }
  function toAbsPoint(cell: MxCell, x: number, y: number): { x: number; y: number } {
    if (cell.parent === "0" || cell.parent === "1") return { x, y };
    const parent = byId.get(cell.parent);
    if (!parent) return { x, y };
    const ppos = getAbsPos(parent);
    return { x: ppos.x + x, y: ppos.y + y };
  }

  const shapes: DiagramShape[] = [];
  const idMap = new Map<string, string>();

  cells.forEach((cell) => {
    if (!cell.vertex || !cell.geometry) return;
    const style = cell.style.toLowerCase();
    if (style.includes("group") || style.includes("shape=connector") || style.includes("text;")) return;
    if (cell.geometry.width < 2 || cell.geometry.height < 2) return;
    const pos = getAbsPos(cell);
    const newId = `node-${uuidv4().slice(0, 8)}`;
    idMap.set(cell.id, newId);
    const type = getShapeType(cell.style);
    const text = decodeHtml(cell.value).trim();
    shapes.push({
      id: newId,
      type,
      x: pos.x,
      y: pos.y,
      width: cell.geometry.width,
      height: cell.geometry.height,
      text,
    });
  });

  const connectors: DiagramConnector[] = [];
  function findShapeAt(x: number, y: number): string | undefined {
    for (const s of shapes) {
      if (x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height) {
        return s.id;
      }
    }
    let best: { id: string; dist: number } | null = null;
    for (const s of shapes) {
      const cx = s.x + s.width / 2;
      const cy = s.y + s.height / 2;
      const dist = (x - cx) ** 2 + (y - cy) ** 2;
      if (!best || dist < best.dist) best = { id: s.id, dist };
    }
    return best?.id;
  }

  cells.forEach((cell) => {
    if (!cell.edge) return;
    let fromId: string | undefined;
    let toId: string | undefined;
    if (cell.source && cell.target) {
      fromId = idMap.get(cell.source);
      toId = idMap.get(cell.target);
    } else if (cell.sourcePoint && cell.targetPoint) {
      const sp = toAbsPoint(cell, cell.sourcePoint.x, cell.sourcePoint.y);
      const tp = toAbsPoint(cell, cell.targetPoint.x, cell.targetPoint.y);
      fromId = findShapeAt(sp.x, sp.y);
      toId = findShapeAt(tp.x, tp.y);
    }
    if (fromId && toId && fromId !== toId) {
      connectors.push({
        id: `conn-${uuidv4().slice(0, 8)}`,
        from: fromId,
        to: toId,
        type: "straight",
      });
    }
  });

  return { shapes, connectors };
}

/** Check if a string looks like draw.io/mxGraph content */
export function isDrawioContent(text: string): boolean {
  const t = text.trim();
  if (t.startsWith("%3CmxGraphModel") || t.startsWith("<mxGraphModel")) return true;
  if (t.includes("mxGraphModel") && t.includes("mxCell")) return true;
  return false;
}
