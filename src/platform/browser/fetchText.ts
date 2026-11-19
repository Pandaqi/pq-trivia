/** The one place the browser player reaches the network. */

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(`Could not fetch ${url} (${response.status}).`);
  }
  return response.text();
}
