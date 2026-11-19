/**
 * Includes and banks. `Include => shared/music.trivia` merges a file in.
 *
 * Core has no filesystem. The caller passes a map of name → text, so the same
 * code serves the CLI, a browser folder picker and a test.
 */

export interface IncludeSource {
  readonly name: string;
  readonly text: string;
}

export interface ExpandResult {
  readonly text: string;
  /** Every file that ended up in the result, root first. */
  readonly files: readonly string[];
  /** Missing files, cycles, empty selectors. The quiz still builds. */
  readonly problems: readonly string[];
}

const INCLUDE_LINE = /^\s*(?:Include|Import)\s*=>\s*(.+?)\s*$/i;
const MAX_DEPTH = 6;

function directoryOf(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? "" : path.slice(0, index);
}

function normalizePath(from: string, target: string): string {
  const parts = `${directoryOf(from)}/${target}`
    .replaceAll("\\", "/")
    .split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") {
      continue;
    }
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

/** `bank.trivia#Bonus` takes that round and nothing else. */
function selectRound(text: string, selector: string): string | null {
  const wanted = selector.trim().toLowerCase();
  if (wanted.length === 0) {
    return null;
  }
  const lines = text.split(/\r?\n/);
  const sectionName = /^##(?!#)\s*(.*)$/;
  const start = lines.findIndex((line) => {
    const match = sectionName.exec(line.trim());
    return match !== null && (match[1] ?? "").trim().toLowerCase() === wanted;
  });
  if (start < 0) {
    return null;
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,2}(?!#)/.test(line.trim()));
  return (end < 0 ? rest : rest.slice(0, end)).join("\n");
}

/** A bank may carry its own header. It should not override the host's. */
function stripHeader(text: string): string {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => {
    const trimmed = line.trim();
    return (
      trimmed.startsWith("##") ||
      /^(?:Question|Q|Type|Section|Round|Answers|Answer|A)\s*=>/.test(trimmed)
    );
  });
  return start <= 0 ? text : lines.slice(start).join("\n");
}

interface ExpandContext {
  readonly files: ReadonlyMap<string, string>;
  readonly problems: string[];
  readonly used: string[];
  readonly stack: readonly string[];
}

function expandText(
  name: string,
  text: string,
  context: ExpandContext,
): string {
  if (context.stack.length > MAX_DEPTH) {
    context.problems.push(
      `Includes are more than ${MAX_DEPTH} deep at "${name}".`,
    );
    return "";
  }
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = INCLUDE_LINE.exec(line);
    if (match === null) {
      out.push(line);
      continue;
    }
    const raw = match[1] ?? "";
    const hash = raw.indexOf("#");
    const path = (hash < 0 ? raw : raw.slice(0, hash)).trim();
    const selector = hash < 0 ? "" : raw.slice(hash + 1).trim();
    const target = normalizePath(name, path);
    const included = context.files.get(target);
    if (included === undefined) {
      context.problems.push(
        `"${name}" includes "${path}", which was not loaded.`,
      );
      continue;
    }
    if (context.stack.includes(target)) {
      context.problems.push(
        `"${name}" includes "${target}" in a circle. Skipped.`,
      );
      continue;
    }
    let body = selector.length > 0 ? selectRound(included, selector) : included;
    if (body === null) {
      context.problems.push(`"${target}" has no round called "${selector}".`);
      continue;
    }
    body = stripHeader(body);
    if (!context.used.includes(target)) {
      context.used.push(target);
    }
    out.push(
      expandText(target, body, {
        ...context,
        stack: [...context.stack, target],
      }),
    );
  }
  return out.join("\n");
}

export function expandIncludes(
  root: IncludeSource,
  files: ReadonlyMap<string, string>,
): ExpandResult {
  const problems: string[] = [];
  const used: string[] = [root.name];
  const text = expandText(root.name, root.text, {
    files,
    problems,
    used,
    stack: [root.name],
  });
  return { text, files: used, problems };
}

/** Convenience for `{ name, text }[]`, the shape every loader already has. */
export function expandFromList(
  sources: readonly IncludeSource[],
): ExpandResult {
  const root = sources[0];
  if (root === undefined) {
    return { text: "", files: [], problems: ["No source files."] };
  }
  const files = new Map(
    sources.map((source) => [normalizePath("", source.name), source.text]),
  );
  return expandIncludes(
    { name: normalizePath("", root.name), text: root.text },
    files,
  );
}
