/**
 * Theme folders in the browser.
 *
 * A theme is a folder with a `.trivia-theme` file, a stylesheet, fonts and
 * background images. The runtime turns it into a stylesheet link, `@font-face`
 * entries and a few CSS variables. It never touches the quiz model.
 *
 * `player.js` carries this, so `<pq-quiz theme="themes/forest/">` works on its
 * own. `themeFromFiles()` is the same thing for a folder the author picks.
 */

import {
  backgroundFor,
  fontOptions,
  parseThemeSettings,
  type ThemeFont,
  type ThemeSettings,
} from "../../core/quiz/theme";
import {
  checkContrast,
  CONTRAST_TOKENS,
  type ContrastPair,
} from "../../core/values/contrast";

export interface ThemeRuntime {
  readonly settings: ThemeSettings;
  /** Resolves when the stylesheet has loaded, or failed. */
  readonly ready: Promise<void>;
  /** Background images, already resolved, for the audit. */
  readonly images: readonly string[];
  /** Apply tokens, fonts, a colour scheme and a background for this screen. */
  apply(root: HTMLElement, key: string, scheme?: string | null): void;
  /** Remove the stylesheet, the fonts and any blob URLs. */
  destroy(): void;
}

const THEME_FILE = "theme.trivia-theme";

function folderUrl(base: string): string {
  return base.endsWith("/") ? base : `${base}/`;
}

function safeText(value: string): string {
  return value.replaceAll('"', '\\"');
}

/** A font that will not load is not worth losing the theme over. */
function loadFaces(
  doc: Document | null,
  fonts: readonly ThemeFont[],
  resolve: (path: string) => string,
  faces: FontFace[],
): void {
  const Font = typeof FontFace === "undefined" ? null : FontFace;
  if (doc === null || Font === null) {
    return;
  }
  for (const font of fonts) {
    try {
      const face = new Font(
        font.family,
        `url("${safeText(resolve(font.file))}")`,
        fontOptions(font),
      );
      doc.fonts.add(face);
      faces.push(face);
      void face.load().catch(() => undefined);
    } catch {
      // Try the next font.
    }
  }
}

function createRuntime(
  settings: ThemeSettings,
  resolve: (path: string) => string,
  cleanups: readonly (() => void)[] = [],
): ThemeRuntime {
  const doc = typeof document === "undefined" ? null : document;
  const link =
    doc === null || settings.stylesheet.trim().length === 0
      ? null
      : doc.createElement("link");
  const ready =
    link === null
      ? Promise.resolve()
      : new Promise<void>((settle) => {
          link.addEventListener("load", () => settle(), { once: true });
          link.addEventListener("error", () => settle(), { once: true });
        });
  if (doc !== null && link !== null) {
    link.rel = "stylesheet";
    link.href = resolve(settings.stylesheet.trim());
    link.dataset["pqTheme"] = settings.label;
    doc.head.append(link);
  }

  const faces: FontFace[] = [];
  loadFaces(doc, settings.fonts, resolve, faces);

  const bodyFont = settings.fonts.find((font) => font.slot === "body");
  const headingFont = settings.fonts.find((font) => font.slot === "heading");
  // Image alpha becomes a soft dark veil, which works in light and dark paper.
  const fade =
    settings.backgroundAlpha === null
      ? null
      : Math.round((1 - settings.backgroundAlpha) * 65) / 100;

  return {
    settings,
    ready,
    images: settings.backgrounds.map((path) => resolve(path)),
    apply(root, key, scheme = null) {
      for (const [name, value] of Object.entries(settings.tokens)) {
        root.style.setProperty(name, value);
      }
      if (settings.colorScheme === null) {
        root.style.removeProperty("color-scheme");
      } else {
        root.style.setProperty("color-scheme", settings.colorScheme);
      }
      const colors = scheme === null ? undefined : settings.schemes[scheme];
      for (const [name, value] of [
        ["--pq-scheme-light", colors?.light],
        ["--pq-scheme-dark", colors?.dark],
        ["--pq-scheme-bg", colors?.bg],
        ["--pq-scheme-text", colors?.text],
      ] as const) {
        if (value === null || value === undefined) {
          root.style.removeProperty(name);
        } else {
          root.style.setProperty(name, value);
        }
      }
      if (bodyFont !== undefined) {
        root.style.setProperty("--pq-font-body", `"${bodyFont.family}"`);
      }
      if (headingFont !== undefined) {
        root.style.setProperty("--pq-font-heading", `"${headingFont.family}"`);
        root.style.setProperty(
          "--pq-heading-weight",
          settings.boldHeadings ? "700" : "400",
        );
      } else if (settings.boldHeadings) {
        root.style.setProperty("--pq-heading-weight", "700");
      }
      if (fade !== null) {
        root.style.setProperty("--pq-theme-fade", String(fade));
      }
      const image = backgroundFor(settings, key);
      if (image === null) {
        root.style.removeProperty("--pq-theme-image");
      } else {
        root.style.setProperty(
          "--pq-theme-image",
          `url("${safeText(resolve(image))}")`,
        );
      }
    },
    destroy() {
      link?.remove();
      for (const face of faces) {
        doc?.fonts.delete(face);
      }
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
  };
}

/**
 * A theme folder, or a single stylesheet. A `theme="./theme.css"` attribute is
 * the old, smaller contract; a folder adds settings, fonts and images.
 */
export async function loadTheme(folder: string): Promise<ThemeRuntime> {
  if (/\.css(?:\?.*)?$/i.test(folder.trim())) {
    const href = new URL(folder.trim(), document.baseURI).href;
    return createRuntime(
      { ...parseThemeSettings(""), stylesheet: href },
      (path) => path,
    );
  }
  const base = folderUrl(folder);
  let text = "";
  try {
    const response = await fetch(`${base}${THEME_FILE}`);
    if (response.ok) {
      text = await response.text();
    }
  } catch {
    // A theme without a settings file still has style.css.
  }
  const settings = parseThemeSettings(text);
  const absolute = (path: string): string => new URL(path, base).href;
  return createRuntime(settings, absolute);
}

function baseName(path: string): string {
  const cut = path.lastIndexOf("/");
  return cut < 0 ? path : path.slice(cut + 1);
}

function normalize(path: string): string {
  const parts: string[] = [];
  for (const part of path.replaceAll("\\", "/").split("/")) {
    if (part === "" || part === ".") {
      continue;
    }
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

/**
 * A folder picked with `<input type="file" webkitdirectory>`.
 *
 * Every file gets a blob URL. The settings file is read, paths resolve inside
 * the picked folder, and `destroy()` releases the URLs again.
 */
export async function themeFromFiles(
  files: readonly File[],
): Promise<ThemeRuntime> {
  const urls = new Map<string, string>();
  const cleanups: Array<() => void> = [];
  let themeFile: File | null = null;
  let themePath = "";

  for (const file of files) {
    const path = normalize(
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ??
        file.name,
    );
    const url = URL.createObjectURL(file);
    urls.set(path, url);
    cleanups.push(() => URL.revokeObjectURL(url));
    if (baseName(path) === THEME_FILE && themeFile === null) {
      themeFile = file;
      themePath = path;
    }
  }

  const text = themeFile === null ? "" : await themeFile.text();
  const settings = parseThemeSettings(text);
  const root = themePath.includes("/")
    ? themePath.slice(0, themePath.lastIndexOf("/") + 1)
    : "";
  const resolve = (path: string): string => {
    const wanted = normalize(`${root}${path}`);
    return urls.get(wanted) ?? urls.get(normalize(path)) ?? path;
  };
  return createRuntime(settings, resolve, cleanups);
}

/**
 * The contrast verdict for the theme on screen. The browser resolves the CSS
 * variables, so a `light-dark()` token is judged by the colour it actually
 * paints, not by the text of its declaration.
 */
export type ThemeIssue =
  | ({ readonly kind: "contrast" } & ContrastPair)
  | {
      readonly kind: "image";
      readonly file: string;
      readonly width: number;
      readonly height: number;
    }
  | { readonly kind: "imageMissing"; readonly file: string };

/** A background drawn at twice its width or more will look soft. */
const IMAGE_UPSCALE_LIMIT = 2;

/** An SVG has no fixed resolution, so stretching it is free. */
function isVector(path: string): boolean {
  return /\.svg(?:[?#]|$)/i.test(path);
}

function fileName(path: string): string {
  const tail = path.split("/").pop() ?? path;
  const clean = tail.split("?")[0] ?? tail;
  try {
    return decodeURIComponent(clean);
  } catch {
    return clean;
  }
}

export type ImageResult =
  { readonly width: number; readonly height: number } | "missing" | null;

/** The audit's inputs, so a test can hand it a theme without a browser. */
export interface ThemeAuditOptions {
  readonly enabled?: boolean;
  readonly root?: HTMLElement | null;
  readonly warnings?: readonly ContrastPair[];
  readonly theme?: Pick<ThemeRuntime, "images"> | null;
  readonly shownWidth?: number;
  readonly measure?: (src: string) => Promise<ImageResult>;
}

function imageSize(src: string): Promise<ImageResult> {
  return new Promise((settle) => {
    if (typeof Image === "undefined") {
      settle(null);
      return;
    }
    const image = new Image();
    const timer = setTimeout(() => settle(null), 4000);
    image.onload = () => {
      clearTimeout(timer);
      settle({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      clearTimeout(timer);
      settle("missing");
    };
    image.src = src;
  });
}

/**
 * The ad-hoc theme audit. Contrast is instant; backgrounds have to load first.
 * Only images that are stretched past twice their width are reported, so a
 * deliberately tiny tile is not called a mistake.
 */
export async function themeAudit(
  options: ThemeAuditOptions = {},
): Promise<ThemeIssue[]> {
  if (options.enabled === false) {
    return [];
  }
  const host =
    options.root !== undefined
      ? options.root
      : typeof document === "undefined"
        ? null
        : document.querySelector<HTMLElement>(".pq-quiz");
  const issues: ThemeIssue[] = (options.warnings ?? themeWarnings(host)).map(
    (pair) => ({ kind: "contrast", ...pair }),
  );
  const theme = options.theme !== undefined ? options.theme : active;
  if (theme === null) {
    return issues;
  }
  const shown = options.shownWidth ?? host?.clientWidth ?? 0;
  if (shown <= 0) {
    return issues;
  }
  const measure = options.measure ?? imageSize;
  const seen = new Set<string>();
  for (const path of theme.images) {
    if (seen.has(path)) {
      continue;
    }
    seen.add(path);
    if (isVector(path)) {
      continue;
    }
    const size = await measure(path);
    if (size === "missing") {
      issues.push({ kind: "imageMissing", file: fileName(path) });
      continue;
    }
    if (size !== null && size.width * IMAGE_UPSCALE_LIMIT < shown) {
      issues.push({
        kind: "image",
        file: fileName(path),
        width: size.width,
        height: size.height,
      });
    }
  }
  return issues;
}

export function themeWarnings(
  root?: HTMLElement | null,
): readonly ContrastPair[] {
  if (typeof document === "undefined") {
    return [];
  }
  const host = root ?? document.querySelector<HTMLElement>(".pq-quiz");
  if (host === null) {
    return [];
  }
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.position = "absolute";
  probe.style.width = "0";
  probe.style.height = "0";
  probe.style.overflow = "hidden";
  probe.style.opacity = "0";
  probe.style.pointerEvents = "none";
  host.append(probe);
  const colors: Record<string, string> = {};
  try {
    for (const token of CONTRAST_TOKENS) {
      probe.style.color = `var(${token})`;
      const value = getComputedStyle(probe).color.trim();
      if (value.length > 0) {
        colors[token] = value;
      }
    }
  } finally {
    probe.remove();
  }
  return checkContrast(colors);
}

let active: ThemeRuntime | null = null;
const listeners = new Set<(theme: ThemeRuntime | null) => void>();

export function getTheme(): ThemeRuntime | null {
  return active;
}

/** Replaces the active theme. The old one is destroyed. */
export function setTheme(theme: ThemeRuntime | null): void {
  if (active === theme) {
    return;
  }
  active?.destroy();
  active = theme;
  for (const listener of listeners) {
    listener(theme);
  }
}

export function subscribeTheme(
  listener: (theme: ThemeRuntime | null) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The `<pq-quiz theme>` value, resolved against the page. */
export function resolveThemeFolder(path: string): string {
  const trimmed = path.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("/")) {
    return folderUrl(trimmed);
  }
  const base =
    typeof document === "undefined" ? "http://localhost/" : document.baseURI;
  return new URL(folderUrl(trimmed), base).href;
}
