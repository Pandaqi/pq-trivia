/** The shape the parser produces. Plain data. No classes, no methods. */

import type { SourceLocation } from "./diagnostics";

export interface AstAttribute {
  /** Canonical key when known, lowercased raw key when not. */
  readonly key: string;
  /** As written, so unknown attributes survive a format. */
  readonly rawKey: string;
  /** One entry per value. Inline lists are already split. */
  readonly values: readonly string[];
  readonly location: SourceLocation;
}

export interface AstQuestion {
  readonly attributes: readonly AstAttribute[];
  readonly location: SourceLocation;
}

export interface AstDocument {
  readonly header: readonly AstAttribute[];
  readonly questions: readonly AstQuestion[];
}
