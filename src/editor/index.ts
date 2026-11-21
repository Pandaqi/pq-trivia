/**
 * The wizard's public door: `import { mountEditor } from "@pandaqi/pq-trivia/editor"`.
 *
 * Text helpers are exported too. A host that only wants the serializer or the
 * block spans gets them without the UI.
 */

export {
  EditorStore,
  createEditorStore,
  STARTER_TEXT,
  type EditorSnapshot,
} from "./store";
export {
  mountEditor,
  type EditorFile,
  type EditorOptions,
  type MountedEditor,
  type PickedMedia,
  type PreviewHook,
  type PreviewInstance,
  type PreviewPlace,
} from "./mount";
export {
  readText,
  blockTextAt,
  blockTexts,
  headerText,
  sliceLines,
  splitLines,
  tidy,
  withBlockText,
  withBlocks,
  withHeaderText,
  type BlockSpan,
  type EditorDoc,
} from "./text";
export {
  HEADER_INDEX,
  SlideKind,
  listSlides,
  problemCount,
  slideAt,
  type SlideInfo,
} from "./slides";
export {
  addAnswer,
  addMedia,
  addSlide,
  duplicateSlide,
  moveAnswer,
  moveMedia,
  moveSlide,
  moveSlideTo,
  removeAnswer,
  removeMedia,
  removeSlide,
  setAnswerAt,
  setFieldValue,
  setMediaAt,
  setSlideText,
  setValuesField,
  setWholeText,
  toggleCorrect,
  valuesFor,
  SlideTemplate,
  TEMPLATES,
} from "./commands";
export {
  BLOCK_FIELDS,
  FIELD_GROUPS,
  HEADER_FIELDS,
  FieldKind,
  type FieldSpec,
  type HeaderFieldSpec,
} from "./fields";
export {
  EditorPane,
  MIN_PANE_WIDTH,
  PANE_LABEL_KEYS,
  PANE_ORDER,
  paneLabel,
  defaultLayout,
  startLayout,
  writeLayout,
  type EditorLayout,
  type LayoutChoice,
} from "./layout";
