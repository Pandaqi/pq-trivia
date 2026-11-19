/**
 * Every built-in language. The default build imports this file.
 *
 * A filtered build replaces it with only the languages you picked, through
 * `bun run build --languages nl`. Keep the key equal to the language code.
 */

import type { TranslationTable } from "../types";
import { en } from "./en";
import { nl } from "./nl";

export const LOCALES: Readonly<Record<string, TranslationTable>> = { en, nl };
