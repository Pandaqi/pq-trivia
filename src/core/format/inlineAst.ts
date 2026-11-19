/** Inline AST types. No parser, no cache. Anything can import these. */

export enum InlineKind {
  Text = "text",
  Strong = "strong",
  Em = "em",
  Underline = "underline",
  Strike = "strike",
  Code = "code",
  Link = "link",
  Span = "span",
  Mark = "mark",
  Kbd = "kbd",
  Abbr = "abbr",
  Fn = "fn",
  Spoiler = "spoiler",
  Sup = "sup",
  Sub = "sub",
  Blank = "blank",
  Break = "break",
}

export type EmphasisKind =
  | InlineKind.Strong
  | InlineKind.Em
  | InlineKind.Underline
  | InlineKind.Strike
  | InlineKind.Mark
  | InlineKind.Kbd
  | InlineKind.Fn
  | InlineKind.Spoiler
  | InlineKind.Sup
  | InlineKind.Sub;

export interface InlineTextNode {
  readonly kind: InlineKind.Text;
  readonly text: string;
}

export interface InlineCodeNode {
  readonly kind: InlineKind.Code;
  readonly text: string;
}

export interface InlineEmphasisNode {
  readonly kind: EmphasisKind;
  readonly children: readonly InlineNode[];
}

export interface InlineLinkNode {
  readonly kind: InlineKind.Link;
  readonly href: string;
  readonly children: readonly InlineNode[];
}

export interface InlineSpanNode {
  readonly kind: InlineKind.Span;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: readonly InlineNode[];
}

export interface InlineAbbrNode {
  readonly kind: InlineKind.Abbr;
  readonly title: string;
  readonly children: readonly InlineNode[];
}

export interface InlineBlankNode {
  readonly kind: InlineKind.Blank;
}

export interface InlineBreakNode {
  readonly kind: InlineKind.Break;
}

export type InlineNode =
  | InlineTextNode
  | InlineCodeNode
  | InlineEmphasisNode
  | InlineLinkNode
  | InlineSpanNode
  | InlineAbbrNode
  | InlineBlankNode
  | InlineBreakNode;
