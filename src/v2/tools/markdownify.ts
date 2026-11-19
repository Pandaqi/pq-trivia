// @NOTE: Order can be important here. We want to search BIGGER PATTERNS (e.g. **blabla**) before SMALLER PATTERNS (e.g. *blabla*). Otherwise we obviously find the smaller ones inside the bigger ones first and replace them in the wrong way.
export const markdownify = (s: string) => {
  if (s.length <= 0) {
    return "";
  }

  let output = s.replaceAll(/\*\*(.*?)\*\*/g, `<strong>$1</strong>`); // bold
  output = output.replaceAll(/\*(.*?)\*/g, `<em>$1</em>`); // italics (1)
  output = output.replaceAll(
    /\_\_(.*?)\_\_/g,
    `<span style="text-decoration:underline;">$1</span>`,
  ); // underline
  output = output.replaceAll(/\_(.*?)\_/g, `<em>$1</em>`); // italics (2)
  output = output.replaceAll(/\`(.*?)\`/g, `<code>$1</code>`); // code
  output = output.replaceAll(
    /\~(.*?)\~/g,
    `<span style="text-decoration:line-through;">$1</span>`,
  ); // strikethrough
  output = output.replaceAll(
    /\[color=(.*?)\](.*?)\[\/color\]/g,
    `<span style="color:$1;">$2</span>`,
  ); // recolor
  output = output.replaceAll(
    /\[size=(.*?)\](.*?)\[\/size\]/g,
    `<span style="font-size:$1;">$2</span>`,
  ); // resize
  output = output.replaceAll(/\[(.*?)\]\((.*?)\)/g, `<a href="$2">$1</a>`); // links (full)
  output = output.replaceAll(/\^\[(.*?)\]/g, `<sup>$1</sup>`); // superscript
  output = output.replaceAll(/\_\[(.*?)\]/g, `<sub>$1</sub>`); // subscript
  output = output.replaceAll(/\[blank\]/g, "___"); // replace blanks at the end, because the typical method with underscores would now create ITALICS
  return output;
};
