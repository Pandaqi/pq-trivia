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
  type ThemeSettings,
} from "../../core/quiz/theme";

export interface ThemeRuntime {
  readonly settings: ThemeSettings;
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
  if (doc !== null && link !== null) {
    link.rel = "stylesheet";
    link.href = resolve(settings.stylesheet.trim());
    link.dataset["pqTheme"] = settings.label;
    doc.head.append(link);
  }

  const faces: FontFace[] = [];
  const fonts = typeof FontFace === "undefined" ? null : FontFace;
  if (doc !== null && fonts !== null) {
    for (const font of settings.fonts) {
      const options = fontOptions(font);
      try {
        const face = new fonts(
          font.family,
          `url("${safeText(resolve(font.file))}")`,
          options,
        );
        doc.fonts.add(face);
        faces.push(face);
        void face.load().catch(() => undefined);
      } catch {
        // A font that will not load is not worth losing the theme over.
      }
    }
  }

  const bodyFont = settings.fonts.find((font) => font.slot === "body");
  const headingFont = settings.fonts.find((font) => font.slot === "heading");
  // Image alpha becomes a soft dark veil, which works in light and dark paper.
  const fade =
    settings.backgroundAlpha === null
      ? null
      : Math.round((1 - settings.backgroundAlpha) * 65) / 100;

  return {
    settings,
    apply(root, key, scheme = null) {
      for (const [name, value] of Object.entries(settings.tokens)) {
        root.style.setProperty(name, value);
      }
      const colors =
        scheme === null ? undefined : settings.schemes[scheme];
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
