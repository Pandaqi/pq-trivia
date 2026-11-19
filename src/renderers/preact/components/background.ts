/** Background attribute to a style string. V2 wrote `image: file.jpg`. */

const IMAGE_PREFIX = /^image:\s*/i;
const COLOR_PREFIX = /^color:\s*/i;

export function backgroundStyle(background: string | null): string | undefined {
  if (background === null || background.trim().length === 0) {
    return undefined;
  }
  const value = background.trim();
  if (IMAGE_PREFIX.test(value)) {
    const path = value.replace(IMAGE_PREFIX, "");
    return `background-image: url("${path}")`;
  }
  if (COLOR_PREFIX.test(value)) {
    return `background-color: ${value.replace(COLOR_PREFIX, "")}`;
  }
  return value.startsWith("#") || value.startsWith("rgb")
    ? `background-color: ${value}`
    : `background-image: url("${value}")`;
}
