import { QuizTheme } from "./quizTheme";

export const loadDefaultTheme = () =>
{
    const params = 
    {
        label: "default",
        external: "style.css",
        boldHeadings: true,
        backgroundImages: ["bg-pattern-1.webp", "bg-pattern-2.webp", "bg-pattern-3.webp", "bg-pattern-4.webp"],
        fonts:
        {
            body:
            {
                name: "Lora",
                regular: "Lora-Regular.woff2",
                italic: "Lora-Italic.woff2",
                bold: "Lora-Bold.woff2",
                bold_italic: "Lora-BoldItalic.woff2",
            },

            heading:
            {
                name: "Lora",
                regular: "Lora-Regular.woff2",
                italic: "Lora-Italic.woff2",
                bold: "Lora-Bold.woff2",
                bold_italic: "Lora-BoldItalic.woff2",
            },
        }
    }
    return new QuizTheme(params);
}