/** Grammar symbols. Any of them can be changed by the author. */

export interface Symbols {
  /** `Key => Value` */
  readonly pairing: string;
  /** `A | B | C` */
  readonly inlineList: string;
  /** `# Quiz title` */
  readonly title: string;
  /** `## Round name` */
  readonly section: string;
  /** `### Question text` */
  readonly question: string;
  /** `#### Answers` */
  readonly block: string;
  /** `// note` */
  readonly comment: string;
  /** `?question only` */
  readonly questionMask: string;
  /** `!answer only` */
  readonly answerMask: string;
  /** `$keep as is` */
  readonly keepAsIs: string;
  /** `left ~ right` */
  readonly match: string;
  /** `[blank]` */
  readonly blank: string;
}

export const DEFAULT_SYMBOLS: Symbols = {
  pairing: "=>",
  inlineList: "|",
  title: "#",
  section: "##",
  question: "###",
  block: "####",
  comment: "//",
  questionMask: "?",
  answerMask: "!",
  keepAsIs: "$",
  match: "~",
  blank: "[blank]",
};

export function resolveSymbols(overrides: Partial<Symbols> = {}): Symbols {
  const entries = Object.entries(DEFAULT_SYMBOLS).map(([key, value]) => {
    const override = overrides[key as keyof Symbols];
    return [
      key,
      typeof override === "string" && override.length > 0 ? override : value,
    ] as const;
  });
  return Object.fromEntries(entries) as unknown as Symbols;
}
