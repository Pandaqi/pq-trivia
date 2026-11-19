/** Bun's `with { type: "text" }` import gives the file as a string. */

declare module "*.css" {
  const text: string;
  export default text;
}
