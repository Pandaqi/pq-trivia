/**
 * `pack`: one folder that plays offline, with media, a manifest and a
 * service worker. The templates live here so the dispatcher stays readable.
 */

import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { formatText } from "../src/core/syntax/serialize";
import { signPack, verifyPack } from "./sign";
import {
  copyMedia,
  readExpanded,
  readPackFiles,
  requireCleanQuiz,
  ROOT,
  writeText,
  type Flags,
} from "./lib";

export async function packCommand(
  files: readonly string[],
  flags: Flags,
): Promise<number> {
  const file = files[0];
  if (file === undefined) {
    console.error("pack needs one file.");
    return 2;
  }
  const { text: expanded, quiz, problems } = await readExpanded(file);
  requireCleanQuiz(quiz, problems);
  if (quiz.questions.length === 0) {
    console.error("Nothing to pack: this quiz has no questions.");
    return 1;
  }
  const slug =
    quiz.meta.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "quiz";
  const outFlag = flags["out"];
  const outDir = join(
    ROOT,
    typeof outFlag === "string" ? outFlag : `dist/pack/${slug}`,
  );
  // Includes are already written out, so the pack is one self-contained file.
  const text = formatText(expanded, {}).replaceAll("</script", "<\\/script");
  const seed = typeof flags["seed"] === "string" ? flags["seed"] : "";
  // Media travels with the pack. A path to the author's laptop is not offline.
  const configured = quiz.meta.config?.["subFolderMedia"];
  const mediaFolder = typeof configured === "string" ? configured : "media";
  const mediaPaths = quiz.questions.flatMap((question) =>
    question.media.map((item) => item.path),
  );
  const localMedia = [...new Set(mediaPaths)].filter(
    (path) => !/^[a-z][a-z0-9+.-]*:/i.test(path) && !path.startsWith("//"),
  );
  const mediaFiles = localMedia.map((path) => `${mediaFolder}/${path}`);
  // Bump this with the content. A cache name that never changes never updates.
  const version = new Bun.CryptoHasher("sha256")
    .update(text)
    .digest("hex")
    .slice(0, 12);
  const packFiles = [
    "index.html",
    "quiz.trivia",
    "pq-trivia.min.js",
    "pq-qr.min.js",
    "style.css",
    "print.css",
    "manifest.json",
    "sw.js",
    ...mediaFiles,
  ];
  const html = `<!doctype html>
<html>
<head>
<style>html,body{margin:0;height:100%}\n#pq-update{position:fixed;left:1rem;right:1rem;bottom:1rem;display:flex;gap:1rem;justify-content:space-between;align-items:center;padding:.75rem 1rem;background:#111;color:#fff;font:1rem/1.4 system-ui,sans-serif;border-radius:.5rem;z-index:9}\n#pq-update[hidden]{display:none}\n#pq-update button{font:inherit;padding:.4rem .8rem}</style>
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="print.css" media="print">
<script src="pq-trivia.min.js" defer></script>
</head>
<body>
<div id="app"></div>
<div id="pq-update" role="status" hidden>
  <span>A new version is ready.</span>
  <button type="button" id="pq-update-button">Reload</button>
</div>
<script id="quiz-text" type="text/plain">
${text}
</script>
<script>
window.addEventListener("load", function () {
  var host = document.getElementById("app");
  var source = document.getElementById("quiz-text").textContent;
  var quiz = new PQTrivia.Quiz({ seed: ${JSON.stringify(seed)} });
  PQTrivia.mountQuiz(quiz, host);
  quiz.load({ type: "text", text: source });
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    var box = document.getElementById("pq-update");
    var button = document.getElementById("pq-update-button");
    var hadController = navigator.serviceWorker.controller !== null;
    var offer = function (worker) {
      if (!worker || !box || !button) return;
      box.hidden = false;
      button.onclick = function () {
        worker.postMessage({ type: "pq-skip-waiting" });
      };
    };
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (hadController) location.reload();
    });
    navigator.serviceWorker.register("sw.js").then(function (registration) {
      if (registration.waiting) offer(registration.waiting);
      registration.addEventListener("updatefound", function () {
        var installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", function () {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            offer(installing);
          }
        });
      });
      setInterval(function () { registration.update().catch(function () {}); }, 3600000);
    }).catch(function () {});
  }
});
</script>
</body>
</html>
`;
  const sw = `/* Offline pack: cache the files, wait, and let the page ask for a reload. */
const CACHE = "pq-pack-${slug}-${version}";
const FILES = ${JSON.stringify(packFiles, null, 2)};
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "pq-skip-waiting") self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key.startsWith("pq-pack-") && key !== CACHE)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request)),
  );
});
`;
  try {
    await mkdir(outDir, { recursive: true });
    await copyFile(
      join(ROOT, "dist/v3/pq-trivia.min.js"),
      join(outDir, "pq-trivia.min.js"),
    );
    await copyFile(
      join(ROOT, "dist/v3/pq-qr.min.js"),
      join(outDir, "pq-qr.min.js"),
    );
    await copyFile(
      join(ROOT, "dist/v3/themes/paper.css"),
      join(outDir, "style.css"),
    );
    await copyFile(
      join(ROOT, "dist/v3/themes/print.css"),
      join(outDir, "print.css"),
    );
  } catch {
    console.error("Build first: bun run build makes the player and themes.");
    return 1;
  }
  await writeText(join(outDir, "quiz.trivia"), text);
  await writeText(join(outDir, "index.html"), html);
  await writeText(
    join(outDir, "manifest.json"),
    `${JSON.stringify(
      {
        name: quiz.meta.title,
        version: 3,
        seed,
        questions: quiz.questions.length,
        files: packFiles,
      },
      null,
      2,
    )}\n`,
  );
  await writeText(join(outDir, "sw.js"), sw);
  const copied = await copyMedia(
    localMedia,
    dirname(file),
    outDir,
    mediaFolder,
  );
  if (copied.missing.length > 0) {
    console.warn(
      `Missing media, left out of the pack: ${copied.missing.join(", ")}`,
    );
  }
  const signingKey = flags["key"];
  if (typeof signingKey === "string") {
    const signed = await readPackFiles(outDir, packFiles);
    const signature = signPack(
      signed,
      await readFile(join(ROOT, signingKey), "utf8"),
    );
    await writeText(
      join(outDir, "signature.json"),
      `${JSON.stringify(signature, null, 2)}\n`,
    );
    console.log(
      verifyPack(signed, signature).ok
        ? `Signed ${Object.keys(signature.files).length} file(s).`
        : "The signature did not check out. Do not ship this pack.",
    );
  }
  console.log(
    `Packed ${quiz.questions.length} questions into ${outDir}${copied.copied > 0 ? `, with ${copied.copied} media file(s)` : ""}.`,
  );
  console.log("Open index.html from the folder, Wi-Fi or not.");
  return 0;
}
