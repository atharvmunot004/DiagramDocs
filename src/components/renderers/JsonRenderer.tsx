import { useEffect, useState } from "react";

interface JsonRendererProps {
  file: File;
}

function JsonNode({
  keyName,
  value,
  depth,
}: {
  keyName: string;
  value: unknown;
  depth: number;
}) {
  const [open, setOpen] = useState(true);

  if (value === null) {
    return (
      <div style={{ paddingLeft: depth * 12 }} className="font-mono text-sm">
        <span className="text-[var(--dd-accent)]">"{keyName}"</span>
        <span className="text-[var(--dd-muted)]">: null</span>
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <div style={{ paddingLeft: depth * 12 }} className="font-mono text-sm">
        <span className="text-[var(--dd-accent)]">"{keyName}"</span>
        <span className="text-[var(--dd-muted)]">: </span>
        <span className="text-[#f9e2af]">{String(value)}</span>
      </div>
    );
  }

  if (typeof value === "number") {
    return (
      <div style={{ paddingLeft: depth * 12 }} className="font-mono text-sm">
        <span className="text-[var(--dd-accent)]">"{keyName}"</span>
        <span className="text-[var(--dd-muted)]">: </span>
        <span className="text-[#a6e3a1]">{value}</span>
      </div>
    );
  }

  if (typeof value === "string") {
    return (
      <div style={{ paddingLeft: depth * 12 }} className="font-mono text-sm">
        <span className="text-[var(--dd-accent)]">"{keyName}"</span>
        <span className="text-[var(--dd-muted)]">: </span>
        <span className="text-[#94e2d5]">"{value}"</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div style={{ paddingLeft: depth * 12 }} className="font-mono text-sm">
        <button
          onClick={() => setOpen(!open)}
          className="text-left hover:bg-[var(--dd-accent-dim)] rounded px-1 -mx-1"
        >
          {open ? "▼" : "▶"} <span className="text-[var(--dd-accent)]">"{keyName}"</span>
          <span className="text-[var(--dd-muted)]">: [</span>
        </button>
        {open && (
          <div>
            {value.map((item, i) => (
              <JsonNode key={i} keyName={String(i)} value={item} depth={depth + 1} />
            ))}
            <div style={{ paddingLeft: depth * 12 }}>
              <span className="text-[var(--dd-muted)]">]</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    return (
      <div style={{ paddingLeft: depth * 12 }} className="font-mono text-sm">
        <button
          onClick={() => setOpen(!open)}
          className="text-left hover:bg-[var(--dd-accent-dim)] rounded px-1 -mx-1"
        >
          {open ? "▼" : "▶"} <span className="text-[var(--dd-accent)]">"{keyName}"</span>
          <span className="text-[var(--dd-muted)]">: {"{"}</span>
        </button>
        {open && (
          <div>
            {entries.map(([k, v]) => (
              <JsonNode key={k} keyName={k} value={v} depth={depth + 1} />
            ))}
            <div style={{ paddingLeft: depth * 12 }}>
              <span className="text-[var(--dd-muted)]">{"}"}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function JsonRenderer({ file }: JsonRendererProps) {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    file
      .text()
      .then((t) => {
        setData(JSON.parse(t));
        setError("");
      })
      .catch((e) => setError(String(e)));
  }, [file]);

  if (error) {
    return (
      <div className="p-4 text-red-400">
        Invalid JSON: {error}
      </div>
    );
  }

  if (data === null) {
    return <div className="p-4 text-[var(--dd-muted)]">Loading…</div>;
  }

  return (
    <div className="p-4 overflow-auto">
      {Array.isArray(data) ? (
        data.map((item, i) => <JsonNode key={i} keyName={String(i)} value={item} depth={0} />)
      ) : (
        <JsonNode keyName="root" value={data} depth={0} />
      )}
    </div>
  );
}
