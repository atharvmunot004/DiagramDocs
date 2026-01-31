import { useCallback, useRef, useState, useEffect } from "react";
import { useApp } from "../store";
import { DocPicker } from "./DocPicker";
import { pickFileFromComputer, copyFileToDocs } from "../lib/workspace";
import type { DiagramShape } from "../types";
import { snapToGrid } from "../lib/diagram";

export function DiagramCanvas() {
  const {
    shapes,
    connectors,
    shapeLinks,
    svgContent,
    selectedShapeId,
    connectorSourceId,
    setSelectedShape,
    setConnectorSourceId,
    updateShape,
    addConnector,
    openDoc,
    zoom,
    pan,
    setZoom,
    setPan,
  } = useApp();

  const showRawSvg = Boolean(svgContent && shapes.length === 0);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, shapeX: 0, shapeY: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [connectorDragEnd, setConnectorDragEnd] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    shapeId: string;
  } | null>(null);

  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [zoom, pan]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (contextMenu) return;
      const pt = toCanvas(e.clientX, e.clientY);
      if (e.button === 1) {
        setPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }
      if (e.button !== 0) return;
      const hit = shapes.slice().reverse().find((s) => hitShape(s, pt.x, pt.y));
      if (connectorSourceId !== null) {
        if (hit) {
          if (connectorSourceId === "") {
            setConnectorSourceId(hit.id);
            setConnectorDragEnd(pt);
            setSelectedShape(hit.id);
            e.currentTarget.setPointerCapture(e.pointerId);
          } else if (connectorSourceId !== hit.id) {
            addConnector(connectorSourceId, hit.id);
            setConnectorSourceId(null);
            setConnectorDragEnd(null);
            setSelectedShape(hit.id);
          }
        } else {
          setConnectorSourceId(null);
          setConnectorDragEnd(null);
        }
        return;
      }
      if (hit) {
        setSelectedShape(hit.id);
        setDragging(hit.id);
        setDragStart({ x: e.clientX, y: e.clientY, shapeX: hit.x, shapeY: hit.y });
      } else {
        setSelectedShape(null);
      }
    },
    [shapes, toCanvas, contextMenu, pan, connectorSourceId, setSelectedShape, setConnectorSourceId, addConnector]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (panning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        return;
      }
      if (connectorSourceId && connectorSourceId !== "" && connectorDragEnd !== null) {
        setConnectorDragEnd(toCanvas(e.clientX, e.clientY));
        return;
      }
      if (dragging) {
        const dx = (e.clientX - dragStart.x) / zoom;
        const dy = (e.clientY - dragStart.y) / zoom;
        updateShape(dragging, {
          x: snapToGrid(dragStart.shapeX + dx),
          y: snapToGrid(dragStart.shapeY + dy),
        });
      }
    },
    [panning, panStart, dragging, dragStart, zoom, connectorSourceId, connectorDragEnd, toCanvas, setPan, updateShape]
  );

  const handlePointerUp = useCallback(() => {
    if (connectorSourceId && connectorSourceId !== "" && connectorDragEnd !== null) {
      const hit = shapes.slice().reverse().find((s) => hitShape(s, connectorDragEnd!.x, connectorDragEnd!.y));
      if (hit && hit.id !== connectorSourceId) {
        addConnector(connectorSourceId, hit.id);
        setConnectorSourceId(null);
        setSelectedShape(hit.id);
      } else if (!hit) {
        setConnectorSourceId(null);
      }
      setConnectorDragEnd(null);
      return;
    }
    setDragging(null);
    setPanning(false);
  }, [connectorSourceId, connectorDragEnd, shapes, addConnector, setConnectorSourceId, setSelectedShape]);

  useEffect(() => {
    const up = () => {
      setDragging(null);
      setPanning(false);
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const connectorDragging = connectorSourceId && connectorSourceId !== "" && connectorDragEnd !== null;

  useEffect(() => {
    const closeMenus = () => setContextMenu(null);
    const handler = (e: MouseEvent) => {
      if (contextMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-dialog]")) closeMenus();
      }
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  /** Find element id or data-cell-id when clicking inside raw SVG */
  const getRawSvgElementId = useCallback((target: EventTarget | null): string | null => {
    let el = target instanceof Element ? target : null;
    while (el) {
      const id = el.getAttribute?.("id") ?? el.getAttribute?.("data-cell-id");
      if (id && id !== "0" && id !== "1") return id;
      el = el.parentElement;
    }
    return null;
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (contextMenu) return;
      const pt = toCanvas(e.clientX, e.clientY);
      const hit = shapes.find((s) => hitShape(s, pt.x, pt.y));
      if (hit && shapeLinks[hit.id]) {
        e.preventDefault();
        openDoc(shapeLinks[hit.id].docPath, shapeLinks[hit.id].title);
        return;
      }
      if (showRawSvg) {
        const elementId = getRawSvgElementId(e.target);
        if (elementId && shapeLinks[elementId]) {
          e.preventDefault();
          openDoc(shapeLinks[elementId].docPath, shapeLinks[elementId].title);
        }
      }
    },
    [shapes, shapeLinks, toCanvas, openDoc, contextMenu, showRawSvg, getRawSvgElementId]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const pt = toCanvas(e.clientX, e.clientY);
      const hit = shapes.find((s) => hitShape(s, pt.x, pt.y));
      if (hit) {
        setContextMenu({ x: e.clientX, y: e.clientY, shapeId: hit.id });
        return;
      }
      if (showRawSvg) {
        const elementId = getRawSvgElementId(e.target);
        if (elementId) {
          setContextMenu({ x: e.clientX, y: e.clientY, shapeId: elementId });
        }
      }
    },
    [shapes, toCanvas, showRawSvg, getRawSvgElementId]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const el = containerRef.current;
      if (!el) return;

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(0.05, Math.min(64, zoom + delta));
        setZoom(newZoom);
        setPan({
          x: sx - ((sx - pan.x) * newZoom) / zoom,
          y: sy - ((sy - pan.y) * newZoom) / zoom,
        });
      } else {
        e.preventDefault();
        setPan({ x: pan.x - e.deltaX, y: pan.y - e.deltaY });
      }
    },
    [zoom, pan, setZoom, setPan]
  );

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-[var(--dd-surface)]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
      style={{
        cursor: panning ? "grabbing" : dragging ? "move" : connectorDragging ? "crosshair" : "default",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          backgroundImage: `
            linear-gradient(var(--dd-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--dd-border) 1px, transparent 1px)
          `,
          backgroundSize: "10px 10px",
        }}
      >
        {showRawSvg ? (
          <div
            className="absolute top-0 left-0 inline-block"
            style={{ minWidth: 800, minHeight: 600 }}
            dangerouslySetInnerHTML={{ __html: svgContent ?? "" }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              const elementId = getRawSvgElementId(e.target);
              if (elementId && shapeLinks[elementId]) {
                e.preventDefault();
                openDoc(shapeLinks[elementId].docPath, shapeLinks[elementId].title);
              }
            }}
          />
        ) : (
        <svg
          className="absolute top-0 left-0 w-full h-full"
          style={{ minWidth: 800, minHeight: 600 }}
        >
          {connectors.map((c) => {
            const from = shapes.find((s) => s.id === c.from);
            const to = shapes.find((s) => s.id === c.to);
            if (!from || !to) return null;
            const fx = from.x + from.width / 2;
            const fy = from.y + from.height;
            const tx = to.x + to.width / 2;
            const ty = to.y;
            const my = (fy + ty) / 2;
            const path = `M ${fx} ${fy} C ${fx} ${my}, ${tx} ${my}, ${tx} ${ty}`;
            return (
              <path
                key={c.id}
                d={path}
                fill="none"
                stroke="var(--dd-muted)"
                strokeWidth={2}
                markerEnd="url(#arrow)"
              />
            );
          })}
          {connectorSourceId && connectorSourceId !== "" && connectorDragEnd && (() => {
            const from = shapes.find((s) => s.id === connectorSourceId);
            if (!from) return null;
            const fx = from.x + from.width / 2;
            const fy = from.y + from.height;
            const tx = connectorDragEnd.x;
            const ty = connectorDragEnd.y;
            const my = (fy + ty) / 2;
            const path = `M ${fx} ${fy} C ${fx} ${my}, ${tx} ${my}, ${tx} ${ty}`;
            return (
              <path
                d={path}
                fill="none"
                stroke="var(--dd-accent)"
                strokeWidth={2}
                strokeDasharray="4 4"
                markerEnd="url(#arrow-preview)"
                opacity={0.9}
              />
            );
          })()}
          <defs>
            <marker
              id="arrow"
              markerWidth={10}
              markerHeight={10}
              refX={9}
              refY={3}
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="var(--dd-muted)" />
            </marker>
            <marker
              id="arrow-preview"
              markerWidth={10}
              markerHeight={10}
              refX={9}
              refY={3}
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="var(--dd-accent)" />
            </marker>
          </defs>
          {shapes.map((s) => (
            <ShapeNode
              key={s.id}
              shape={s}
              selected={selectedShapeId === s.id}
              hasLink={!!shapeLinks[s.id]}
              linkTitle={shapeLinks[s.id]?.title}
              onSelect={() => setSelectedShape(s.id)}
              onUpdate={(p) => updateShape(s.id, p)}
            />
          ))}
        </svg>
        )}
      </div>

      {contextMenu && (
        <ShapeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          shapeId={contextMenu.shapeId}
          hasLink={!!shapeLinks[contextMenu.shapeId]}
          onClose={() => setContextMenu(null)}
        />
      )}

      <div className="absolute bottom-2 right-2 text-xs text-[var(--dd-muted)]">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

function hitShape(s: DiagramShape, x: number, y: number): boolean {
  return (
    x >= s.x &&
    x <= s.x + s.width &&
    y >= s.y &&
    y <= s.y + s.height
  );
}

function ShapeNode({
  shape,
  selected,
  hasLink,
  linkTitle,
  onSelect,
  onUpdate,
}: {
  shape: DiagramShape;
  selected: boolean;
  hasLink: boolean;
  linkTitle?: string;
  onSelect: () => void;
  onUpdate: (p: Partial<DiagramShape>) => void;
}) {
  const [editing, setEditing] = useState(false);

  const content = (
    <>
      {shape.type === "rect" && (
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill="#89b4fa"
          stroke={selected ? "#f5c2e7" : "#45475a"}
          strokeWidth={selected ? 3 : 2}
          rx={4}
        />
      )}
      {shape.type === "ellipse" && (
        <ellipse
          cx={shape.x + shape.width / 2}
          cy={shape.y + shape.height / 2}
          rx={shape.width / 2}
          ry={shape.height / 2}
          fill="#a6e3a1"
          stroke={selected ? "#f5c2e7" : "#45475a"}
          strokeWidth={selected ? 3 : 2}
        />
      )}
      {shape.type === "diamond" && (
        <polygon
          points={`${shape.x + shape.width / 2},${shape.y} ${shape.x + shape.width},${shape.y + shape.height / 2} ${shape.x + shape.width / 2},${shape.y + shape.height} ${shape.x},${shape.y + shape.height / 2}`}
          fill="#f9e2af"
          stroke={selected ? "#f5c2e7" : "#45475a"}
          strokeWidth={selected ? 3 : 2}
        />
      )}
      {!editing ? (
        <foreignObject
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          style={{ overflow: "hidden" }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            style={{
              width: "100%",
              height: "100%",
              padding: `4px ${hasLink ? 18 : 6}px 4px 6px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontSize: 12,
              lineHeight: 1.3,
              color: "#1e1e2e",
              wordBreak: "break-word",
              overflowWrap: "break-word",
              whiteSpace: "pre-wrap",
              cursor: "text",
            }}
          >
            {shape.text || "..."}
          </div>
        </foreignObject>
      ) : null}
      {hasLink && (
        <g transform={`translate(${shape.x + shape.width - 12}, ${shape.y})`}>
          <circle r={6} fill="#f38ba8" />
          <title>{linkTitle || "Linked document"}</title>
        </g>
      )}
    </>
  );

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {content}
      {editing && (
        <foreignObject
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
        >
          <textarea
            autoFocus
            value={shape.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full h-full text-center text-xs bg-white/90 border border-[var(--dd-accent)] rounded resize-none outline-none text-[#1e1e2e] p-1 box-border"
            style={{
              font: "12px ui-monospace",
              wordBreak: "break-word",
              overflowWrap: "break-word",
              minHeight: 0,
            }}
          />
        </foreignObject>
      )}
    </g>
  );
}

function ShapeContextMenu({
  x,
  y,
  shapeId,
  hasLink,
  onClose,
}: {
  x: number;
  y: number;
  shapeId: string;
  hasLink: boolean;
  onClose: () => void;
}) {
  const { openDoc, unlinkShape, linkShapeToDoc, shapeLinks, workspaceHandle } = useApp();
  const [showPicker, setShowPicker] = useState(false);
  const [linking, setLinking] = useState(false);
  const link = shapeLinks[shapeId];

  const handlePickFromComputer = async () => {
    if (!workspaceHandle) return;
    setLinking(true);
    try {
      const file = await pickFileFromComputer();
      if (!file) {
        setLinking(false);
        return;
      }
      const path = await copyFileToDocs(workspaceHandle, file);
      linkShapeToDoc(shapeId, path);
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add document");
    } finally {
      setLinking(false);
    }
  };

  if (showPicker) {
    return (
      <DocPicker
        anchor={{ x, y }}
        onSelect={(path) => {
          linkShapeToDoc(shapeId, path);
          onClose();
        }}
        onClose={onClose}
        onPickFromComputer={handlePickFromComputer}
      />
    );
  }

  return (
    <div
      className="fixed bg-[var(--dd-surface)] border border-[var(--dd-border)] rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {hasLink && link && (
        <>
          <button
            className="block w-full text-left px-4 py-2 hover:bg-[var(--dd-accent-dim)]"
            onClick={() => {
              openDoc(link.docPath, link.title);
              onClose();
            }}
          >
            Open doc
          </button>
          <button
            className="block w-full text-left px-4 py-2 hover:bg-[var(--dd-accent-dim)]"
            onClick={() => setShowPicker(true)}
          >
            Change link
          </button>
          <button
            className="block w-full text-left px-4 py-2 hover:bg-[var(--dd-accent-dim)] text-red-400"
            onClick={() => {
              unlinkShape(shapeId);
              onClose();
            }}
          >
            Remove link
          </button>
        </>
      )}
      {!hasLink && (
        <button
          className="block w-full text-left px-4 py-2 hover:bg-[var(--dd-accent-dim)] disabled:opacity-50"
          onClick={handlePickFromComputer}
          disabled={linking}
        >
          {linking ? "Adding…" : "Link document..."}
        </button>
      )}
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
// Let me refactor ShapeContextMenu to get everything from useApp properly.