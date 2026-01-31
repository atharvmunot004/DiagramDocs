import type { DiagramShape, DiagramConnector } from "../types";

const GRID = 10;

export function serializeToSvg(shapes: DiagramShape[], connectors: DiagramConnector[]): string {
  const allX = shapes.flatMap((s) => [s.x, s.x + s.width]);
  const allY = shapes.flatMap((s) => [s.y, s.y + s.height]);
  const minX = Math.min(0, ...allX) - 20;
  const minY = Math.min(0, ...allY) - 20;
  const maxX = Math.max(800, ...allX) + 20;
  const maxY = Math.max(600, ...allY) + 20;
  const w = maxX - minX;
  const h = maxY - minY;

  const shapeEls = shapes.map((s) => {
    const x = s.x - minX;
    const y = s.y - minY;
    if (s.type === "rect") {
      return `<g id="${s.id}"><rect x="${x}" y="${y}" width="${s.width}" height="${s.height}" fill="#89b4fa" stroke="#45475a" stroke-width="2" rx="4"/>${textToSvgLines(s.text || "", x + s.width / 2, y + s.height / 2)}</g>`;
    }
    if (s.type === "ellipse") {
      const cx = x + s.width / 2;
      const cy = y + s.height / 2;
      const rx = s.width / 2;
      const ry = s.height / 2;
      return `<g id="${s.id}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#a6e3a1" stroke="#45475a" stroke-width="2"/>${textToSvgLines(s.text || "", cx, cy)}</g>`;
    }
    if (s.type === "diamond") {
      const cx = x + s.width / 2;
      const cy = y + s.height / 2;
      const pts = `${cx},${y} ${x + s.width},${cy} ${cx},${y + s.height} ${x},${cy}`;
      return `<g id="${s.id}"><polygon points="${pts}" fill="#f9e2af" stroke="#45475a" stroke-width="2"/>${textToSvgLines(s.text || "", cx, cy)}</g>`;
    }
    return "";
  });

  const shapeMap = new Map(shapes.map((s) => [s.id, s]));
  const connEls = connectors.map((c) => {
    const from = shapeMap.get(c.from);
    const to = shapeMap.get(c.to);
    if (!from || !to) return "";
    const fx = from.x + from.width / 2;
    const fy = from.y + from.height;
    const tx = to.x + to.width / 2;
    const ty = to.y;
    const my = (fy + ty) / 2 - minY;
    const sfx = fx - minX;
    const sfy = fy - minY;
    const stx = tx - minX;
    const sty = ty - minY;
    const path = `M ${sfx} ${sfy} C ${sfx} ${my}, ${stx} ${my}, ${stx} ${sty}`;
    return `<path d="${path}" fill="none" stroke="#6c7086" stroke-width="2" marker-end="url(#arrow)"/>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="#6c7086"/></marker></defs>
  <g transform="translate(${-minX}, ${-minY})">
    ${connEls.join("\n    ")}
    ${shapeEls.join("\n    ")}
  </g>
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textToSvgLines(text: string, cx: number, cy: number): string {
  const raw = text || "";
  const lines = raw.split(/\r?\n/);
  const useLines = lines.some((l) => l.trim()) ? lines : [raw || "..."];
  const lineHeight = 1.2;
  const firstDy = useLines.length > 1 ? -(useLines.length - 1) * 0.5 * lineHeight : 0;
  return `<text x="${cx}" y="${cy}" text-anchor="middle" font-size="12" fill="#1e1e2e">${useLines
    .map((line, i) => `<tspan x="${cx}" dy="${i === 0 ? firstDy : lineHeight}em">${escapeXml(line)}</tspan>`)
    .join("")}</text>`;
}

export function parseSvg(content: string): {
  shapes: DiagramShape[];
  connectors: DiagramConnector[];
} {
  const shapes: DiagramShape[] = [];
  const connectors: DiagramConnector[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return { shapes, connectors };

  const g = svg.querySelector("g");
  const root = g || svg;

  root.querySelectorAll("g[id]").forEach((el) => {
    const id = el.getAttribute("id");
    if (!id || id.startsWith("conn-")) return;
    const rect = el.querySelector("rect");
    const ellipse = el.querySelector("ellipse");
    const polygon = el.querySelector("polygon");
    let x = 0,
      y = 0,
      w = 100,
      h = 60;
    let type: DiagramShape["type"] = "rect";
    if (rect) {
      x = parseFloat(rect.getAttribute("x") || "0");
      y = parseFloat(rect.getAttribute("y") || "0");
      w = parseFloat(rect.getAttribute("width") || "100");
      h = parseFloat(rect.getAttribute("height") || "60");
      type = "rect";
    } else if (ellipse) {
      const cx = parseFloat(ellipse.getAttribute("cx") || "0");
      const cy = parseFloat(ellipse.getAttribute("cy") || "0");
      const rx = parseFloat(ellipse.getAttribute("rx") || "50");
      const ry = parseFloat(ellipse.getAttribute("ry") || "30");
      x = cx - rx;
      y = cy - ry;
      w = rx * 2;
      h = ry * 2;
      type = "ellipse";
    } else if (polygon) {
      const pts = (polygon.getAttribute("points") || "").split(/[\s,]+/).map(Number);
      if (pts.length >= 8) {
        x = Math.min(pts[0], pts[2], pts[4], pts[6]);
        y = Math.min(pts[1], pts[3], pts[5], pts[7]);
        w = Math.max(pts[0], pts[2], pts[4], pts[6]) - x;
        h = Math.max(pts[1], pts[3], pts[5], pts[7]) - y;
        type = "diamond";
      }
    }
    const textEl = el.querySelector("text");
    let text = "";
    if (textEl) {
      const tspans = textEl.querySelectorAll("tspan");
      text =
        tspans.length > 0
          ? [...tspans].map((t) => t.textContent || "").join("\n")
          : (textEl.textContent || "");
    }
    shapes.push({ id, type, x, y, width: w, height: h, text });
  });

  let connId = 0;
  root.querySelectorAll("path[marker-end]").forEach(() => {
    // Simplified: we'd need to parse path to infer from/to. For now we could try to match by position.
    // Skip for parse - we'll lose connectors on load. Could store in a separate layer.
    connId++;
  });

  // If no shapes found (e.g. draw.io export), try draw.io structure: g[data-cell-id] with nested rect/ellipse/polygon
  if (shapes.length === 0) {
    const drawioShapes = parseDrawioSvg(doc);
    drawioShapes.forEach((s) => shapes.push(s));
  }

  return { shapes, connectors };
}

/** Parse draw.io / diagrams.net exported SVG (g[data-cell-id] with nested rect/ellipse/polygon) */
function parseDrawioSvg(doc: Document): DiagramShape[] {
  const out: DiagramShape[] = [];
  const svgEl = doc.querySelector("svg");
  if (!svgEl) return out;

  const skipIds = new Set(["0", "1"]);

  // Clone and add to DOM so getBBox/getCTM work (avoid mutating parsed doc)
  const docClone = doc.implementation.createDocument(null, null, null);
  docClone.appendChild(docClone.importNode(svgEl, true));
  const cloneSvg = docClone.querySelector("svg");
  if (!cloneSvg) return out;

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;pointer-events:none;";
  container.appendChild(cloneSvg);
  document.body.appendChild(container);

  try {
    const groups = docClone.querySelectorAll("g[data-cell-id]");
    groups.forEach((g) => {
      const id = g.getAttribute("data-cell-id");
      if (!id || skipIds.has(id)) return;

      const rect = g.querySelector("rect");
      const ellipse = g.querySelector("ellipse");
      const polygon = g.querySelector("polygon");
      if (!rect && !ellipse && !polygon) return;

      let type: DiagramShape["type"] = "rect";
      if (ellipse) type = "ellipse";
      else if (polygon) type = "diamond";

      const el = g as SVGGraphicsElement;
      let bbox: DOMRect;
      try {
        bbox = el.getBBox();
      } catch {
        return;
      }
      const ctm = el.getCTM();
      let x = bbox.x,
        y = bbox.y,
        w = bbox.width,
        h = bbox.height;
      if (ctm) {
        const tl = ctm.transformPoint({ x: bbox.x, y: bbox.y });
        const tr = ctm.transformPoint({ x: bbox.x + bbox.width, y: bbox.y });
        const bl = ctm.transformPoint({ x: bbox.x, y: bbox.y + bbox.height });
        const br = ctm.transformPoint({ x: bbox.x + bbox.width, y: bbox.y + bbox.height });
        x = Math.min(tl.x, tr.x, bl.x, br.x);
        y = Math.min(tl.y, tr.y, bl.y, br.y);
        w = Math.max(tl.x, tr.x, bl.x, br.x) - x;
        h = Math.max(tl.y, tr.y, bl.y, br.y) - y;
      }
      out.push({ id, type, x, y, width: w, height: h, text: "" });
    });
  } finally {
    if (container.parentNode) {
      container.removeChild(cloneSvg);
      document.body.removeChild(container);
    }
  }

  return out;
}

export function snapToGrid(v: number): number {
  return Math.round(v / GRID) * GRID;
}
