import type { Quiz } from "..";
import { markdownify } from "./markdownify";

export const markdownifyNode = (node: HTMLElement, formatText = true) => {
  if (!formatText) {
    return node;
  }

  // Check all children of this node; if they have no further children (leaf node), but text only, markdownify that text
  const nodesToCheck: HTMLElement[] = [node];
  while (nodesToCheck.length > 0) {
    const currentNode = nodesToCheck.pop();
    const children: HTMLElement[] = Array.from(
      currentNode.childNodes,
    ) as HTMLElement[];
    for (const child of children) {
      // OKAY, so the thing is, that a TextNode can only contain ... text, not HTML
      // Many of these Markdown replacements insert HTML nodes (for subscript, superscript, text coloring, etc)
      // So, we need to insert an actual HTML element at the textNode positions, put the new value INTO THAT, and then remove the old text node
      if (child.nodeType !== Node.TEXT_NODE) {
        nodesToCheck.push(child);
        continue;
      }
      const newNode = document.createElement("span");
      currentNode.insertBefore(newNode, child);

      newNode.innerHTML = markdownify(child.nodeValue ?? "");
      child.remove();
    }
  }
  return node;
};
