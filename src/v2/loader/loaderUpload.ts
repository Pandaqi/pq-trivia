import type { QuizParams } from "../tools/params";
import { parseRawFile, parseStringIntoData } from "../tools/parser";
import { QuestionData } from "../tools/questions";
import { Loader } from "./loader";

export const loaderUpload = (input: HTMLInputElement) => {
  return async (loader: Loader, params: QuizParams) => {
    const filesToLoad = input.files;
    if (!filesToLoad || filesToLoad.length <= 0) {
      return {};
    }

    // get content from inside files selected
    const cache: Record<string, string> = {};
    for (const file of Array.from(filesToLoad)) {
      const data = await file.text();
      cache[file.name] = data;
    }

    // then convert into raw objects (to be turned into Question objects later)
    const cacheConverted: Record<string, QuestionData[]> = {};
    for (const [url, data] of Object.entries(cache)) {
      cacheConverted[url] = parseStringIntoData(
        parseRawFile(data, url),
        params,
      );
    }

    return cacheConverted;
  };
};
