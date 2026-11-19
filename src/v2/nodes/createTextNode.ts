import { createNode, CreateNodeParams } from "./createNode";

export const createTextNode = (params: CreateNodeParams) => {
  let classes = params.class ?? [];
  if (!Array.isArray(classes)) {
    classes = [classes];
  }
  classes.push("plain-text");

  params.class = classes;
  params.tag = params.tag ?? "div";
  return createNode(params);
};
