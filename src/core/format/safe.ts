/** Where a link may point and which styles survive. Shared, pure, small. */

const ALLOWED_LINK_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

export const SAFE_CLASS = /^[a-zA-Z][\w-]*$/;

const ALLOWED_STYLE_PROPERTIES: ReadonlySet<string> = new Set([
  "color",
  "background-color",
  "font-size",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-align",
]);

export function isSafeHref(href: string): boolean {
  const value = href.trim();
  if (value.startsWith("#")) {
    return true;
  }
  const lowered = value.toLowerCase();
  if (
    lowered.startsWith("javascript:") ||
    lowered.startsWith("data:") ||
    lowered.startsWith("vbscript:")
  ) {
    return false;
  }
  const colon = lowered.indexOf(":");
  if (colon < 0) {
    return true;
  }
  return ALLOWED_LINK_PROTOCOLS.includes(lowered.slice(0, colon + 1));
}

export function sanitizeStyle(raw: string): {
  style: string;
  dropped: string[];
} {
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const declaration of raw.split(";")) {
    const body = declaration.trim();
    if (body.length === 0) {
      continue;
    }
    const colon = body.indexOf(":");
    if (colon < 0) {
      dropped.push(body);
      continue;
    }
    const property = body.slice(0, colon).trim().toLowerCase();
    const value = body.slice(colon + 1).trim();
    const unsafe = /url\(|expression\(|@import/i.test(value);
    if (
      !ALLOWED_STYLE_PROPERTIES.has(property) ||
      unsafe ||
      value.length === 0
    ) {
      dropped.push(body);
      continue;
    }
    kept.push(`${property}: ${value}`);
  }
  return { style: kept.join("; "), dropped };
}
