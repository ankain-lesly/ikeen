interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <div className="text-xs text-muted-foreground italic">
        No content to preview. Type something in Edit mode.
      </div>
    );
  }

  // Basic markdown line-by-line renderer
  const lines = content.split("\n");

  return (
    <div className="space-y-3 font-sans text-xs leading-relaxed text-foreground select-text">
      {lines.map((line, idx) => {
        if (line.startsWith("# ")) {
          return (
            <h1 key={idx} className="text-xl font-bold tracking-tight text-foreground border-b border-border pb-1">
              {line.replace("# ", "")}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-base font-semibold tracking-tight text-foreground mt-3">
              {line.replace("## ", "")}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-sm font-medium tracking-tight text-[#39ff14] mt-2">
              {line.replace("### ", "")}
            </h3>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <li key={idx} className="ml-4 list-disc text-muted-foreground">
              {line.substring(2)}
            </li>
          );
        }
        if (line.startsWith("> ")) {
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-[#39ff14] pl-3 italic text-muted-foreground my-2"
            >
              {line.substring(2)}
            </blockquote>
          );
        }
        if (line.trim() === "") {
          return <div key={idx} className="h-2" />;
        }
        return (
          <p key={idx} className="text-muted-foreground">
            {line}
          </p>
        );
      })}
    </div>
  );
}
