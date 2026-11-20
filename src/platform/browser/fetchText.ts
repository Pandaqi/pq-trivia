/** The one place the browser player reaches the network. */

import type { Translate } from "../../i18n/types";

export async function fetchText(url: string, t?: Translate): Promise<string> {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(
      t === undefined
        ? `Could not fetch ${url} (${response.status}).`
        : t("loaderFetch", { url, status: response.status }),
    );
  }
  return response.text();
}
