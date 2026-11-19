/**
 * Save text as a file, with no server and no library.
 *
 * The URL is revoked on the next tick: revoking it in the click handler can
 * cancel the download in some browsers.
 */

export function downloadText(
  filename: string,
  text: string,
  mime: string,
): void {
  if (typeof document === "undefined") {
    return;
  }
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** A slug that survives Windows, macOS and Linux. */
export function fileSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length === 0 ? "quiz" : slug;
}
