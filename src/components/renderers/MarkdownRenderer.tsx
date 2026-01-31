import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
  file: File;
}

export function MarkdownRenderer({ file }: MarkdownRendererProps) {
  const [content, setContent] = useState("");

  useEffect(() => {
    file.text().then(setContent);
  }, [file]);

  return (
    <div className="p-4 prose prose-invert prose-sm max-w-none overflow-auto">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} className="text-[var(--dd-accent)] hover:underline">
              {children}
            </a>
          ),
          code: ({ className, children }) =>
            className ? (
              <code className={className}>{children}</code>
            ) : (
              <code className="bg-[var(--dd-accent-dim)] px-1 rounded">{children}</code>
            ),
          pre: ({ children }) => (
            <pre className="bg-[var(--dd-accent-dim)] p-3 rounded overflow-x-auto">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
