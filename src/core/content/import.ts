/**
 * Spreadsheets and notes in, Trivia Syntax out.
 *
 * Teachers already have a CSV or a Markdown file. Neither is an authoring
 * format, so this is a bridge, not a new syntax: every row becomes a block,
 * and every problem names its row.
 */

import {
  DiagnosticCodes,
  syntaxError,
  syntaxWarning,
  type Diagnostic,
} from "../syntax/diagnostics";

export enum ImportFormat {
  Csv = "csv",
  Markdown = "markdown",
}

/** Which column is which. Long names and the short ones teachers type. */
const COLUMNS: Readonly<Record<string, string>> = {
  question: "question",
  q: "question",
  prompt: "question",
  answer: "answer",
  answers: "answer",
  a: "answer",
  correct: "answer",
  type: "type",
  score: "score",
  points: "score",
  explanation: "explanation",
  explain: "explanation",
  comment: "comment",
  note: "comment",
  round: "round",
  section: "round",
  category: "category",
  categories: "category",
  media: "media",
  image: "media",
  difficulty: "difficulty",
};

const KNOWN_COLUMNS: ReadonlySet<string> = new Set(Object.values(COLUMNS));

export interface ContentImportResult {
  /** Ready to save as a `.trivia` file. */
  readonly text: string;
  readonly questions: number;
  readonly diagnostics: readonly Diagnostic[];
}

function locationOf(file: string, line: number) {
  return { file, line, column: 1 };
}

/** Commas outside quotes. `"Hey, Jude",2` is two fields, not three. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line.charAt(index);
    if (char === '"') {
      if (quoted && line.charAt(index + 1) === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      out.push(field);
      field = "";
      continue;
    }
    field += char;
  }
  out.push(field);
  return out.map((value) => value.trim());
}

function columnMap(header: readonly string[]): Map<number, string> {
  const map = new Map<number, string>();
  header.forEach((cell, index) => {
    const name = COLUMNS[cell.trim().toLowerCase()];
    if (name !== undefined) {
      map.set(index, name);
    }
  });
  return map;
}

interface Row {
  readonly line: number;
  readonly fields: Readonly<Record<string, string>>;
}

interface Parsed {
  readonly rows: Row[];
  readonly diagnostics: Diagnostic[];
  readonly file: string;
  /** The title from a `#` heading. Markdown only; one file holds one quiz. */
  readonly title?: string;
}

/**
 * Records, not lines. A quoted field may hold a newline, and splitting on
 * lines first cut that row in two and invented a question out of the tail.
 */
function csvRecords(source: string): readonly { text: string; line: number }[] {
  const records: { text: string; line: number }[] = [];
  let quoted = false;
  let text = "";
  let line = 1;
  let startedAt = 1;
  const cut = (): void => {
    records.push({ text, line: startedAt });
    text = "";
  };
  for (let index = 0; index < source.length; index += 1) {
    const char = source.charAt(index);
    if (char === '"') {
      // Two quotes in a row are one escaped quote: toggling twice settles it.
      quoted = !quoted;
      text += char;
      continue;
    }
    if (char !== "\r" && char !== "\n") {
      text += char;
      continue;
    }
    line += 1;
    if (quoted) {
      text += "\n";
      continue;
    }
    if (char === "\r" && source.charAt(index + 1) === "\n") {
      index += 1;
    }
    cut();
    startedAt = line;
  }
  cut();
  return records;
}

function csvRows(source: string): Parsed {
  const records = csvRecords(source);
  const diagnostics: Diagnostic[] = [];
  const first = records.findIndex((record) => record.text.trim().length > 0);
  if (first < 0) {
    return { rows: [], diagnostics, file: "import.csv" };
  }
  const header = splitCsvLine(records[first]?.text ?? "");
  const map = columnMap(header);
  if (![...map.values()].includes("question")) {
    diagnostics.push(
      syntaxError(
        DiagnosticCodes.MissingQuestion,
        "The first row needs a `question` column.",
        {
          suggestion: "Try: question,answer,type,score",
        },
      ),
    );
    return { rows: [], diagnostics, file: "import.csv" };
  }
  const rows: Row[] = [];
  for (let index = first + 1; index < records.length; index += 1) {
    const record = records[index];
    if (record === undefined || record.text.trim().length === 0) {
      continue;
    }
    const cells = splitCsvLine(record.text);
    const fields: Record<string, string> = {};
    for (const [at, name] of map) {
      const value = cells[at] ?? "";
      if (value.length > 0) {
        fields[name] = value;
      }
    }
    rows.push({ line: record.line, fields });
  }
  return { rows, diagnostics, file: "import.csv" };
}

/** `## Question`, then `- answer` lines. `# Title` names the quiz. */
function markdownRows(source: string): Parsed {
  const rows: Row[] = [];
  const diagnostics: Diagnostic[] = [];
  let title: string | null = null;
  let current: { line: number; fields: Record<string, string> } | null = null;
  const answers: string[] = [];
  const flush = (): void => {
    if (current === null) {
      return;
    }
    if (answers.length > 0) {
      current.fields["answer"] = answers.join(" | ");
    }
    rows.push({ line: current.line, fields: current.fields });
    current = null;
    answers.length = 0;
  };
  source.split(/\r?\n/).forEach((text, index) => {
    const line = text.trim();
    if (line.length === 0) {
      return;
    }
    const heading = /^(#+)\s*(.*)$/.exec(line);
    if (heading !== null) {
      flush();
      const name = (heading[2] ?? "").trim();
      if ((heading[1] ?? "").length === 1) {
        // One hash is the quiz title, never a question. A second title would
        // mean a second quiz, and one file holds one.
        if (title === null) {
          title = name;
        } else {
          diagnostics.push(
            syntaxWarning(
              DiagnosticCodes.InvalidLine,
              `Line ${index + 1}: a second title starts a second quiz.`,
              {
                location: locationOf("import.md", index + 1),
                suggestion: `One file holds one quiz. Keep "${title}" at the top, or import the rest on its own.`,
              },
            ),
          );
        }
        return;
      }
      current = { line: index + 1, fields: { question: name } };
      return;
    }
    if (line.startsWith(">")) {
      if (current !== null) {
        current.fields["explanation"] = line.replace(/^>\s*/, "").trim();
      }
      return;
    }
    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    if (bullet !== null && current !== null) {
      answers.push(bullet[1] ?? "");
      return;
    }
    diagnostics.push(
      syntaxWarning(
        DiagnosticCodes.InvalidLine,
        `Line ${index + 1} is neither a heading, a bullet nor a note, so it was skipped.`,
        {
          location: locationOf("import.md", index + 1),
          suggestion: "Start a question with `## `, an answer with `- `.",
        },
      ),
    );
  });
  flush();
  return {
    rows,
    diagnostics,
    file: "import.md",
    ...(title === null ? {} : { title }),
  };
}

const BOLD = /^\*\*(.+)\*\*$/;

/** A Markdown bullet with bold text is the correct answer. Strip the bold. */
function markdownAnswer(value: string): string {
  const bold = BOLD.exec(value.trim());
  return bold === null ? value.trim() : (bold[1] ?? value.trim());
}

function toBlock(
  fields: Readonly<Record<string, string>>,
  markdown: boolean,
): string {
  const lines: string[] = [];
  const question = (fields["question"] ?? "").trim();
  lines.push(`Question => ${question}`);
  const answers = (fields["answer"] ?? "")
    .split("|")
    .map((value) => (markdown ? markdownAnswer(value) : value.trim()))
    .filter((value) => value.length > 0);
  if (answers.length > 0) {
    lines.push(`Answers => ${answers.join(" | ")}`);
    const marked = (fields["answer"] ?? "")
      .split("|")
      .filter((value) => BOLD.test(value.trim()));
    if (markdown && marked.length > 0) {
      lines.push(
        `Correct => ${marked.map((value) => markdownAnswer(value)).join(" | ")}`,
      );
    }
  }
  for (const [key, attribute] of [
    ["type", "Type"],
    ["score", "Score"],
    ["difficulty", "Difficulty"],
    ["explanation", "Explanation"],
    ["comment", "Comment"],
    ["media", "Media"],
    ["category", "Category"],
  ] as const) {
    const value = (fields[key] ?? "").trim();
    if (value.length > 0) {
      lines.push(`${attribute} => ${value}`);
    }
  }
  return lines.join("\n");
}

/** One file in, one `.trivia` file out. Problems name the row they came from. */
export function importContent(
  source: string,
  format: ImportFormat,
): ContentImportResult {
  const markdown = format === ImportFormat.Markdown;
  const parsed = markdown ? markdownRows(source) : csvRows(source);
  const diagnostics: Diagnostic[] = [...parsed.diagnostics];
  const byRound = new Map<string, string[]>();
  let questions = 0;

  for (const row of parsed.rows) {
    const unused = Object.keys(row.fields).filter(
      (key) => !KNOWN_COLUMNS.has(key),
    );
    if (unused.length > 0) {
      diagnostics.push(
        syntaxWarning(
          DiagnosticCodes.InvalidLine,
          `Row ${row.line}: "${unused.join('", "')}" is not a column this importer knows.`,
          { location: locationOf(parsed.file, row.line) },
        ),
      );
    }
    const question = (row.fields["question"] ?? "").trim();
    if (question.length === 0) {
      diagnostics.push(
        syntaxError(
          DiagnosticCodes.MissingQuestion,
          `Row ${row.line} has no question text.`,
          { location: locationOf(parsed.file, row.line) },
        ),
      );
      continue;
    }
    const round = (row.fields["round"] ?? "").trim();
    const blocks = byRound.get(round) ?? [];
    blocks.push(toBlock(row.fields, markdown));
    byRound.set(round, blocks);
    questions += 1;
  }

  const sections: string[] = [];
  if (parsed.title !== undefined) {
    // The title goes first, before any round heading.
    sections.push(`Quiz => ${parsed.title}`);
  }
  for (const [round, blocks] of byRound) {
    if (round.length > 0) {
      // V3 rounds are `##`; `#` is the quiz title.
      sections.push(`## ${round}`);
    }
    sections.push(...blocks);
  }
  return {
    text: `${sections.join("\n\n")}\n`,
    questions,
    diagnostics,
  };
}

/** `.csv` is a spreadsheet; anything else is treated as Markdown. */
export function importFormatOf(path: string): ImportFormat {
  return /\.csv$/i.test(path) ? ImportFormat.Csv : ImportFormat.Markdown;
}
