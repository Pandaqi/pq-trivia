/** Tiny static server for examples. No dependency, no watcher, no magic. */

import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const PORT = Number(process.env["PORT"] ?? 4173);

const HOME = "/examples/feature-demos/index.html";

const server = Bun.serve({
  port: PORT,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    // A folder means its index.html, so `/examples/feature-demos/` works.
    const path =
      url.pathname === "/"
        ? HOME
        : url.pathname.endsWith("/")
          ? `${url.pathname}index.html`
          : url.pathname;
    const file = Bun.file(join(ROOT, decodeURIComponent(path)));
    if (!(await file.exists())) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(file);
  },
});

console.log(`Serving ${ROOT} on http://localhost:${server.port}`);
