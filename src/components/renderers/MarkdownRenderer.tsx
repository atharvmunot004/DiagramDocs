import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const markdownStyles = {
  wrapper: "p-4 overflow-auto text-[var(--dd-text)]",
  h1: "text-2xl font-bold mt-6 mb-3 first:mt-0 border-b border-[var(--dd-border)] pb-1",
  h2: "text-xl font-bold mt-5 mb-2 first:mt-0 border-b border-[var(--dd-border)] pb-1",
  h3: "text-lg font-semibold mt-4 mb-2 first:mt-0",
  h4: "text-base font-semibold mt-3 mb-1",
  h5: "text-sm font-semibold mt-2 mb-1",
  h6: "text-sm font-semibold mt-2 mb-1 text-[var(--dd-muted)]",
  p: "my-2 leading-relaxed",
  ul: "my-2 pl-6 list-disc space-y-0.5",
  ol: "my-2 pl-6 list-decimal space-y-0.5",
  li: "leading-relaxed",
  blockquote: "border-l-4 border-[var(--dd-accent)] pl-4 py-0.5 my-2 text-[var(--dd-muted)] italic",
  code: "bg-[var(--dd-accent-dim)] px-1.5 py-0.5 rounded text-sm font-mono",
  pre: "bg-[var(--dd-accent-dim)] p-3 rounded overflow-x-auto my-2 text-sm",
  hr: "border-0 border-t border-[var(--dd-border)] my-4",
  a: "text-[var(--dd-accent)] hover:underline",
  strong: "font-bold",
  em: "italic",
  table: "w-full border-collapse my-3 text-sm",
  thead: "border-b-2 border-[var(--dd-border)]",
  th: "text-left py-2 px-3 font-semibold",
  tbody: "",
  tr: "border-b border-[var(--dd-border)]",
  td: "py-2 px-3",
};

interface MarkdownRendererProps {
  file: File;
}

export function MarkdownRenderer({ file }: MarkdownRendererProps) {
  const [content, setContent] = useState("");

  useEffect(() => {
    file.text().then(setContent);
  }, [file]);

  return (
    <div className={markdownStyles.wrapper}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className={markdownStyles.h1}>{children}</h1>,
          h2: ({ children }) => <h2 className={markdownStyles.h2}>{children}</h2>,
          h3: ({ children }) => <h3 className={markdownStyles.h3}>{children}</h3>,
          h4: ({ children }) => <h4 className={markdownStyles.h4}>{children}</h4>,
          h5: ({ children }) => <h5 className={markdownStyles.h5}>{children}</h5>,
          h6: ({ children }) => <h6 className={markdownStyles.h6}>{children}</h6>,
          p: ({ children }) => <p className={markdownStyles.p}>{children}</p>,
          ul: ({ children }) => <ul className={markdownStyles.ul}>{children}</ul>,
          ol: ({ children }) => <ol className={markdownStyles.ol}>{children}</ol>,
          li: ({ children }) => <li className={markdownStyles.li}>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className={markdownStyles.blockquote}>{children}</blockquote>
          ),
          code: ({ className, children }) =>
            className ? (
              <code className="block font-mono text-sm whitespace-pre overflow-x-auto">{children}</code>
            ) : (
              <code className={markdownStyles.code}>{children}</code>
            ),
          pre: ({ children }) => <pre className={markdownStyles.pre}>{children}</pre>,
          hr: () => <hr className={markdownStyles.hr} />,
          a: ({ href, children }) => (
            <a href={href} className={markdownStyles.a} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className={markdownStyles.strong}>{children}</strong>,
          em: ({ children }) => <em className={markdownStyles.em}>{children}</em>,
          table: ({ children }) => <table className={markdownStyles.table}>{children}</table>,
          thead: ({ children }) => <thead className={markdownStyles.thead}>{children}</thead>,
          th: ({ children }) => <th className={markdownStyles.th}>{children}</th>,
          tbody: ({ children }) => <tbody className={markdownStyles.tbody}>{children}</tbody>,
          tr: ({ children }) => <tr className={markdownStyles.tr}>{children}</tr>,
          td: ({ children }) => <td className={markdownStyles.td}>{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
