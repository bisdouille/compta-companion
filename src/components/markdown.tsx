import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-neutral max-w-none",
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-3",
        "prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-2 prose-h2:border-b prose-h2:pb-1",
        "prose-h3:text-base prose-h3:mt-4 prose-h3:mb-1",
        "prose-p:leading-relaxed prose-p:my-2",
        "prose-li:my-0.5",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-table:text-sm prose-th:bg-muted/50 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-td:border",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
