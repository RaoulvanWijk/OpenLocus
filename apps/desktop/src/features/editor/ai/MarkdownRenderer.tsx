import type { ReactNode } from 'react'
import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

type MarkdownRendererProps = {
  content: string
}

type ComponentProps = {
  children?: ReactNode
  href?: string
  inline?: boolean
}

/**
 * Production-grade markdown renderer for AI responses
 * - Sanitizes HTML to prevent XSS attacks
 * - Supports GitHub Flavored Markdown (tables, strikethrough)
 * - Custom styling for all markdown elements
 * - Optimized for readability with proper spacing and typography
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        // Headings
        h1: ({ children }: ComponentProps) => (
          <h1 className="text-foreground mt-4 mb-3 text-sm leading-tight font-bold">{children}</h1>
        ),
        h2: ({ children }: ComponentProps) => (
          <h2 className="text-foreground mt-3 mb-2 text-sm leading-tight font-semibold">
            {children}
          </h2>
        ),
        h3: ({ children }: ComponentProps) => (
          <h3 className="text-foreground mt-3 mb-2 text-xs leading-tight font-semibold">
            {children}
          </h3>
        ),
        h4: ({ children }: ComponentProps) => (
          <h4 className="text-foreground mt-2 mb-2 text-xs font-semibold">{children}</h4>
        ),
        h5: ({ children }: ComponentProps) => (
          <h5 className="text-foreground mt-2 mb-2 text-xs font-medium">{children}</h5>
        ),
        h6: ({ children }: ComponentProps) => (
          <h6 className="text-muted-foreground mt-2 mb-2 text-xs font-medium">{children}</h6>
        ),

        // Paragraphs
        p: ({ children }: ComponentProps) => (
          <p className="text-foreground mb-2 leading-relaxed">{children}</p>
        ),

        // Lists
        ul: ({ children }: ComponentProps) => (
          <ul className="text-foreground mb-3 ml-4 list-disc space-y-1">{children}</ul>
        ),
        ol: ({ children }: ComponentProps) => (
          <ol className="text-foreground mb-3 ml-4 list-decimal space-y-1">{children}</ol>
        ),
        li: ({ children }: ComponentProps) => (
          <li className="text-sm leading-relaxed">{children}</li>
        ),

        // Code
        code: ({ inline, children }: ComponentProps) =>
          inline ? (
            <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
              {children}
            </code>
          ) : (
            <code className="text-foreground rounded-xs bg-gray-300 font-mono whitespace-nowrap">
              {children}
            </code>
          ),

        pre: ({ children }: ComponentProps) => (
          <pre className="bg-muted border-muted-foreground/20 overflow-x-auto rounded-md border p-3 font-mono text-xs leading-relaxed">
            {children}
          </pre>
        ),

        // Blockquote
        blockquote: ({ children }: ComponentProps) => (
          <blockquote className="border-muted-foreground/30 text-muted-foreground my-2 border-l-2 py-1 pl-3 text-sm italic">
            {children}
          </blockquote>
        ),

        // Horizontal rule
        hr: () => <hr className="border-muted-foreground/20 my-3 border-t" />,

        // Links
        a: ({ href, children }: ComponentProps) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-xs hover:underline"
          >
            {children}
          </a>
        ),

        // Tables
        table: ({ children }: ComponentProps) => (
          <table className="my-3 w-full border-collapse text-sm">{children}</table>
        ),
        thead: ({ children }: ComponentProps) => (
          <thead className="bg-muted border-muted-foreground/20 border-b">{children}</thead>
        ),
        tbody: ({ children }: ComponentProps) => <tbody>{children}</tbody>,
        tr: ({ children }: ComponentProps) => (
          <tr className="border-muted-foreground/10 border-b">{children}</tr>
        ),
        th: ({ children }: ComponentProps) => (
          <th className="text-foreground px-2 py-1.5 text-left text-xs font-semibold">
            {children}
          </th>
        ),
        td: ({ children }: ComponentProps) => (
          <td className="text-foreground px-2 py-1.5 text-left text-xs">{children}</td>
        ),

        // Strong/Bold
        strong: ({ children }: ComponentProps) => (
          <strong className="text-foreground font-semibold">{children}</strong>
        ),

        // Emphasis/Italic
        em: ({ children }: ComponentProps) => (
          <em className="text-foreground italic">{children}</em>
        ),

        // Line break
        br: () => <br />,
      }}
    >
      {content}
    </ReactMarkdown>
  )
})

MarkdownRenderer.displayName = 'MarkdownRenderer'
