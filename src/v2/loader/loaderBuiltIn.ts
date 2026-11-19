import type { QuizParams } from "../tools/params";
import { Loader } from "./loader";

export const loaderBuiltIn = (json: Record<any, any>) => {
  return async (loader: Loader, params: QuizParams) => {
    return Object.assign({}, json);
  };
};
