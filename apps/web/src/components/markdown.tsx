"use client";

import { Check, Copy } from "lucide-react";
import { Children, isValidElement, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

function remarkCallouts() {
  return (tree: unknown) => {
    visit(
      tree as never,
      (node: {
        type: string;
        name?: string;
        data?: Record<string, unknown>;
      }) => {
        if (
          node.type !== "containerDirective" ||
          !node.name ||
          !["note", "tip", "warning", "summary"].includes(node.name)
        )
          return;
        node.data = {
          ...(node.data ?? {}),
          hName: "aside",
          hProperties: { className: ["callout", `callout-${node.name}`] },
        };
      },
    );
  };
}

function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number")
        return String(child);
      return isValidElement<{ children?: ReactNode }>(child)
        ? textOf(child.props.children)
        : "";
    })
    .join("");
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const code = textOf(children).replace(/\n$/, "");
  const className = isValidElement<{ className?: string }>(children)
    ? (children.props.className ?? "")
    : "";
  const language = /language-([\w-]+)/.exec(className)?.[1] ?? "text";
  return (
    <div className="markdown-code">
      <div className="markdown-code-toolbar">
        <span>{language}</span>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

const sanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: "",
  tagNames: [...(defaultSchema.tagNames ?? []), "aside"],
  attributes: {
    ...defaultSchema.attributes,
    aside: ["className"],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-/],
    ],
    h1: [...(defaultSchema.attributes?.h1 ?? []), "id"],
    h2: [...(defaultSchema.attributes?.h2 ?? []), "id"],
    h3: [...(defaultSchema.attributes?.h3 ?? []), "id"],
    img: [...(defaultSchema.attributes?.img ?? []), "loading"],
  },
};

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkCallouts]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeSanitize, sanitizeSchema],
          rehypeHighlight,
        ]}
        skipHtml
        components={{
          pre: CodeBlock,
          table: ({ children: tableChildren }) => (
            <div className="markdown-table-wrap">
              <table>{tableChildren}</table>
            </div>
          ),
          img: ({ alt, title, ...props }) => (
            <figure className="markdown-figure">
              <img {...props} alt={alt ?? ""} loading="lazy" />
              {(title || alt) && <figcaption>{title || alt}</figcaption>}
            </figure>
          ),
          a: ({ href, children: linkChildren }) => {
            const external = Boolean(href?.startsWith("http"));
            return (
              <a
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
              >
                {linkChildren}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
