/** Inline AST to nodes. No `innerHTML`, ever. */

import type { JSX } from "preact";
import { InlineKind, type InlineNode } from "../../../core/format/inline";

const CONTAINERS: Readonly<Record<string, string>> = {
  [InlineKind.Strong]: "strong",
  [InlineKind.Em]: "em",
  [InlineKind.Underline]: "u",
  [InlineKind.Strike]: "s",
  [InlineKind.Mark]: "mark",
  [InlineKind.Kbd]: "kbd",
  [InlineKind.Fn]: "small",
  [InlineKind.Spoiler]: "span",
  [InlineKind.Sup]: "sup",
  [InlineKind.Sub]: "sub",
};

export function Inline({
  nodes,
}: {
  readonly nodes: readonly InlineNode[];
}): JSX.Element {
  return (
    <>
      {nodes.map((node, index) => (
        <NodeView key={index} node={node} />
      ))}
    </>
  );
}

function NodeView({
  node,
}: {
  readonly node: InlineNode;
}): JSX.Element | string {
  switch (node.kind) {
    case InlineKind.Text:
      return node.text;
    case InlineKind.Code:
      return <code class="pq-code">{node.text}</code>;
    case InlineKind.Blank:
      return (
        <span class="pq-blank" role="img" aria-label="blank">
          ____
        </span>
      );
    case InlineKind.Break:
      return <br />;
    case InlineKind.Link:
      return (
        <a href={node.href} rel="noopener noreferrer">
          <Inline nodes={node.children} />
        </a>
      );
    case InlineKind.Abbr:
      return (
        <abbr title={node.title}>
          <Inline nodes={node.children} />
        </abbr>
      );
    case InlineKind.Span: {
      const className = node.attributes["class"];
      const style = node.attributes["style"];
      return (
        <span class={className ? `pq-${className}` : undefined} style={style}>
          <Inline nodes={node.children} />
        </span>
      );
    }
    default: {
      const tag = CONTAINERS[node.kind] ?? "span";
      const Tag = tag as "span";
      return (
        <Tag>
          <Inline nodes={node.children} />
        </Tag>
      );
    }
  }
}
