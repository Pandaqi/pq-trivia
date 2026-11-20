/** One language's interface strings. Keys are shared; values are not. */

export type TranslationTable = Readonly<Record<string, string>>;

/** The one function a component needs to speak the interface language. */
export type Translate = (
  key: string,
  params?: Readonly<Record<string, string | number>>,
) => string;
