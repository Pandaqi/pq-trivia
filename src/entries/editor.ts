/**
 * Bundle entry for `dist/v3/editor.js`. The QuizWizard, on its own.
 *
 * Built with `bun run build --editor`, and left out of every normal build. A
 * player page never pays for an authoring tool.
 *
 *   <script type="module" src="editor.js"></script>
 *   <div data-pq-wizard></div>
 *
 * Or mount it yourself with `mountQuizWizard(element)`.
 */

import {
  mountEditor,
  type EditorFile,
  type EditorOptions,
  type MountedEditor,
  type PickedMedia,
  type PreviewInstance,
  type PreviewPlace,
} from "../editor";
import { downloadText, fileSlug } from "../platform/browser/download";

export type {
  EditorFile,
  EditorOptions,
  MountedEditor,
  PickedMedia,
  PreviewInstance,
  PreviewPlace,
} from "../editor";
export {
  EditorStore,
  SlideKind,
  SlideTemplate,
  HEADER_INDEX,
  addAnswer,
  addMedia,
  addSlide,
  blockTextAt,
  blockTexts,
  createEditorStore,
  duplicateSlide,
  headerText,
  listSlides,
  mountEditor,
  moveSlide,
  readText,
  removeAnswer,
  removeMedia,
  removeSlide,
  setAnswerAt,
  setFieldValue,
  setSlideText,
  setValuesField,
  setWholeText,
  tidy,
  toggleCorrect,
  valuesFor,
  withBlockText,
  withBlocks,
  withHeaderText,
} from "../editor";

/** File System Access bits, typed here so an old lib does not decide for us. */
interface WritableFile {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface FolderFileHandle {
  readonly kind: "file";
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<WritableFile>;
}

interface FolderHandle {
  readonly kind: "directory";
  readonly name: string;
  getDirectoryHandle(
    name: string,
    options?: { readonly create?: boolean },
  ): Promise<FolderHandle>;
  getFileHandle(
    name: string,
    options?: { readonly create?: boolean },
  ): Promise<FolderFileHandle>;
  values(): AsyncIterableIterator<FolderFileHandle | FolderHandle>;
}

interface FolderPickerWindow {
  showDirectoryPicker?: (options?: {
    readonly id?: string;
    readonly mode?: "read" | "write" | "readwrite";
  }) => Promise<FolderHandle>;
}

export interface WizardOptions {
  readonly text?: string | undefined;
  readonly onSave?: ((name: string, text: string) => void) | undefined;
  readonly onOpen?: (() => Promise<EditorFile | null>) | undefined;
  readonly preview?: EditorOptions["preview"];
  /** Start with the player pane closed. Handy on a small screen. */
  readonly previewOpen?: boolean | undefined;
}

const WIZARD_FOLDER_ID = "pq-trivia-wizard";
const MEDIA_FOLDER = "media";
const SUFFIXES = [".trivia", ".txt", ".md"];
const PLAIN_MIME = "text/plain";

/** The folder the author opened, so media and saves land next to the quiz. */
let openedFolder: FolderHandle | null = null;

function folderPicker(): FolderPickerWindow["showDirectoryPicker"] {
  if (typeof window === "undefined") {
    return undefined;
  }
  return (window as unknown as FolderPickerWindow).showDirectoryPicker;
}

async function pickFolder(): Promise<FolderHandle | null> {
  const picker = folderPicker();
  if (picker === undefined) {
    return null;
  }
  try {
    return await picker.call(window, {
      id: WIZARD_FOLDER_ID,
      mode: "readwrite",
    });
  } catch {
    return null;
  }
}

function hiddenInput(accept: string, multiple: boolean): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.multiple = multiple;
  return input;
}

/**
 * A file dialog resolves through `change`, or through focus coming back when
 * the author cancels. Without the second path the promise would hang for ever.
 */
function chooseFiles(
  accept: string,
  multiple: boolean,
): Promise<readonly File[]> {
  return new Promise((resolve) => {
    const input = hiddenInput(accept, multiple);
    const done = (): void => resolve([...(input.files ?? [])]);
    input.addEventListener("change", done, { once: true });
    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => resolve([]), 400);
      },
      { once: true },
    );
    input.click();
  });
}

async function readFiles(files: readonly File[]): Promise<EditorFile | null> {
  const parts = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      text: await file.text(),
    })),
  );
  if (parts.length === 0) {
    return null;
  }
  parts.sort((a, b) => a.name.localeCompare(b.name));
  const name = parts[0]?.name ?? "quiz.trivia";
  return { name, text: parts.map((part) => part.text).join("\n\n") };
}

async function openFiles(): Promise<EditorFile | null> {
  return readFiles(await chooseFiles(SUFFIXES.join(","), true));
}

async function readFolder(handle: FolderHandle): Promise<EditorFile | null> {
  const parts: { name: string; text: string }[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind !== "file") {
      continue;
    }
    const lower = entry.name.toLowerCase();
    if (!SUFFIXES.some((suffix) => lower.endsWith(suffix))) {
      continue;
    }
    const file = await entry.getFile();
    parts.push({ name: entry.name, text: await file.text() });
  }
  if (parts.length === 0) {
    return null;
  }
  parts.sort((a, b) => a.name.localeCompare(b.name));
  return {
    name: `${handle.name}.trivia`,
    text: parts.map((part) => part.text).join("\n\n"),
  };
}

async function openFolder(): Promise<EditorFile | null> {
  if (folderPicker() === undefined) {
    return openFiles();
  }
  const handle = await pickFolder();
  if (handle === null) {
    return null;
  }
  openedFolder = handle;
  return readFolder(handle);
}

async function saveToFolder(title: string, text: string): Promise<boolean> {
  const handle = openedFolder ?? (await pickFolder());
  if (handle === null) {
    return false;
  }
  openedFolder = handle;
  try {
    const file = await handle.getFileHandle(`${fileSlug(title)}.trivia`, {
      create: true,
    });
    const writable = await file.createWritable();
    await writable.write(new Blob([text], { type: PLAIN_MIME }));
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

async function copyIntoMedia(file: File): Promise<boolean> {
  const handle = openedFolder;
  if (handle === null) {
    return false;
  }
  try {
    const folder = await handle.getDirectoryHandle(MEDIA_FOLDER, {
      create: true,
    });
    const target = await folder.getFileHandle(file.name, { create: true });
    const writable = await target.createWritable();
    await writable.write(file);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

async function pickMedia(): Promise<PickedMedia | null> {
  const files = await chooseFiles("image/*,audio/*,video/*", false);
  const file = files[0];
  if (file === undefined) {
    return null;
  }
  const copied = await copyIntoMedia(file);
  return { name: file.name, copied };
}

function saveDownload(name: string, text: string): void {
  downloadText(`${fileSlug(name)}.trivia`, text, PLAIN_MIME);
}
/**
 * The player arrives as its own chunk, the first time a preview is needed.
 *
 * The wizard is a text tool. Carrying the whole player in `editor.js` would
 * charge every author for a preview they may never open. Text that arrives
 * before the chunk does is kept, so the pane opens on the current draft.
 */
function previewQuiz(text: string, host: HTMLElement): PreviewInstance {
  let current = text;
  let place: PreviewPlace | null = null;
  let cancelled = false;
  let live: PreviewInstance | null = null;
  void import("../renderers/preview").then(({ mountPreview }) => {
    if (cancelled) {
      return;
    }
    live = mountPreview(current, host, { keepHead: true });
    // The pane may have asked for a slide before the player arrived.
    if (place !== null) {
      live.show?.(place);
    }
  });
  return {
    load(next) {
      current = next;
      live?.load(next);
    },
    show(next) {
      place = next;
      live?.show?.(next);
    },
    destroy() {
      cancelled = true;
      live?.destroy();
      live = null;
    },
  };
}

/** `mountEditor` with a browser's dialogs and a live player behind it. */
export function mountQuizWizard(
  target: Element,
  options: WizardOptions = {},
): MountedEditor {
  return mountEditor(target, {
    ...(options.text === undefined ? {} : { text: options.text }),
    onSave: options.onSave ?? saveDownload,
    onOpen: options.onOpen ?? openFiles,
    onOpenFolder: openFolder,
    onSaveToFolder: saveToFolder,
    onPickMedia: pickMedia,
    preview: options.preview ?? previewQuiz,
    ...(options.previewOpen === undefined
      ? {}
      : { previewOpen: options.previewOpen }),
  });
}

if (typeof document !== "undefined") {
  for (const host of document.querySelectorAll("[data-pq-wizard]")) {
    mountQuizWizard(host);
  }
}
