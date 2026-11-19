import type { Question, Quiz } from "..";
import { isLocalFile } from "../loader/loader";
import { showMessage } from "../tools/errorHandler";
import { shuffle } from "../tools/helpers";
import { SUB_FOLDER_THEME, type QuizParams } from "../tools/params";
import { seedRandom } from "../tools/seedRandom";

export interface QuizFonts
{
    body?: 
    {
        name?: string,
        regular?: string,
        italic?: string,
        bold?: string,
        bold_italic?: string,
    }
    heading?: 
    {
        name?: string,
        regular?: string,
        italic?: string,
        bold?: string,
        bold_italic?: string,
    }
}

export interface QuizColorScheme
{
    text?: string,
    bg?: string,
    light?: string,
    dark?: string,
}

export interface DynamicThemeParams
{
    removeFonts?: boolean,
    removeBackground?: boolean,
    removeColor?: boolean,
}

export interface QuizThemeParams
{
    label?: string,
    inline?: string,
    external?: string,
    colors?: Record<string,QuizColorScheme>, // custom colors to load
    folderRoot?: string,
    folder?: string,
    fonts?: QuizFonts, // filenames of fonts to load 
    backgroundImages?: string[] // filenames of background images to load
    boldHeadings?: boolean
}

export const DEFAULT_FONT = "Helvetica";
export const DEFAULT_COLORS = 
{
    red: { light: "oklch(0.88 0.11 0)", dark: "oklch(0.45 0.1 0)" },
    orange: { light: "oklch(0.88 0.11 45)", dark: "oklch(0.45 0.1 45)" },
    yellow: { light: "oklch(0.88 0.11 90)", dark: "oklch(0.45 0.1 90)" },
    green: { light: "oklch(0.88 0.11 135)", dark: "oklch(0.45 0.1 135)" },
    cyan: { light: "oklch(0.88 0.11 180)", dark: "oklch(0.45 0.1 180)" },
    blue: { light: "oklch(0.88 0.11 225)", dark: "oklch(0.45 0.1 225)" },
    purple: { light: "oklch(0.88 0.11 270)", dark: "oklch(0.45 0.1 270)" },
    pink: { light: "oklch(0.88 0.11 315)", dark: "oklch(0.45 0.1 315)" },
};

export const refreshTheme = (quiz:Quiz, q:Question = undefined, node:HTMLElement = undefined, params:DynamicThemeParams = {}) =>
{
    node = node ?? quiz.nodes.nodeScreen;
    q = q ?? quiz.getCurrentQuestion();
    applyTheme(node, quiz, q, params); // actual screen
    applyTheme(quiz.nodes.getUINode(), quiz, q, params); // separate UI
}

export const applyTheme = (node:HTMLElement, quiz:Quiz, question:Question = null, params:DynamicThemeParams = {}) =>
{
    for(const theme of quiz.themes)
    {
        theme.applyTo(node, quiz, question);
    }

    if(params.removeFonts)
    {
        node.style.removeProperty("--font-body");
        node.style.removeProperty("--font-heading");
    }

    if(params.removeBackground)
    {
        node.style.removeProperty("--image-bg");
    }

    if(params.removeColor)
    {
        node.style.removeProperty("--color-scheme-light");
        node.style.removeProperty("--color-scheme-dark");
        node.style.removeProperty("--color-scheme-bg");
        node.style.removeProperty("--color-scheme-text");
    }
}

export const applyThemeFonts = (node:HTMLElement, quiz:Quiz) =>
{
    for(const theme of quiz.themes)
    {
        theme.setFonts(node, quiz.params.themeDisabled);
    }
}

export class QuizTheme
{
    label: string
    inlineStyles: string // fixed <style> string inserted in header
    externalStyles: string // URL to external stylesheet
    colorSchemes: Record<string,QuizColorScheme> // automatic color variable switching between questions 
    folderRoot: string // defaults to quiz.params.subFolderTheme 
    folder: string // where to find the theme's files; if set, overrides default of looking in `themes/label/` folder
    fonts: QuizFonts;
    backgroundImages: string[]
    boldHeadings: boolean; // if true, headings automatically use the bold/thick version of font

    constructor(params:QuizThemeParams)
    {
        this.label = params.label ?? "unnamed-theme";
        this.inlineStyles = params.inline ?? "";
        this.externalStyles = params.external ?? "";
        this.colorSchemes = params.colors ?? DEFAULT_COLORS;
        this.backgroundImages = params.backgroundImages ?? [];
        this.fonts = params.fonts ?? {};
        this.boldHeadings = params.boldHeadings ?? false;
        this.folderRoot = params.folderRoot ?? SUB_FOLDER_THEME;
    }

    getFolderName() { return this.folder ?? this.label; }
    getFullURL(str:string)
    {
        const pathRelative = `${this.folderRoot}/${this.getFolderName()}/${str}`;
        if(isLocalFile()) { return pathRelative; }
        return `${window.location.href}/${pathRelative}`;
    }

    load() 
    { 
        this.loadFonts();
        this.loadInlineStyles();
        this.loadExternalStyles();
    }

    loadInlineStyles()
    {
        if(!this.inlineStyles) { return; }
        const styleTag = document.createElement("style");
        styleTag.setAttribute("type", "text/css");
        styleTag.innerHTML = this.inlineStyles;
        document.head.appendChild(styleTag);
    }

    loadExternalStyles()
    {
        if(!this.externalStyles) { return; }
        const linkTag = document.createElement("link");
        linkTag.rel = "stylesheet";
        linkTag.href = this.getFullURL(this.externalStyles);
        document.head.appendChild(linkTag); 
    }

    loadFonts()
    {
        const fontData = this.fonts;
        for(const [key,fontFiles] of Object.entries(fontData))
        {
            const fontName = fontFiles.name ?? `${key}FontCustom`;
            fontData[key]._fontName = fontName;

            // actually load them by name
            for(const [fontType,fontFile] of Object.entries(fontFiles))
            {
                if(fontType == "name" || fontType == "_fontName") { continue; }

                const fontURL = `url(${this.getFullURL(fontFile as string)})`;

                let options = {};
                if(fontType == "bold") { options = { weight: "900" }; }
                else if(fontType == "italic") { options = { style: "italic" }; }
                else if(fontType == "bold_italic") { options = { weight: "900", style: "italic" }; }

                const fontFaceToAdd = new FontFace(fontName, fontURL, options);
                // @ts-ignore
                document.fonts.add(fontFaceToAdd);
            }

        }
    }

    applyTo(nodes: HTMLElement|HTMLElement[], quiz:Quiz, curQuestion:Question = null)
    {
        if(!Array.isArray(nodes)) { nodes = [nodes]; }
        for(const node of nodes)
        {
            this.randomizeBackground(node, quiz.params.themeDisabled);
            this.setFonts(node, quiz.params.themeDisabled);
            this.setColorScheme(node, this.getSeededColorSchemeKey(curQuestion ? curQuestion.getID() : quiz.params.seed, quiz), quiz.params.themeDisabled);
        }
    }

    changePropertyIfSet(node:HTMLElement, prop:string, val)
    {
        if(!val) { document.body.style.removeProperty(prop); return; }
        node.style.setProperty(prop, val);
    }

    getSeededColorSchemeKey(seed:string, quiz:Quiz) 
    {
        const allPossibleColors = quiz.themes.map((x) => Object.keys(x.colorSchemes)).flat();
        shuffle(allPossibleColors, seedRandom(seed));
        return allPossibleColors[0];
    }

    getColorScheme(id:string) { return this.colorSchemes[id] ?? null; }
    setColorScheme(node:HTMLElement, id:string, disabled = false)
    {
        const data = this.getColorScheme(id);
        if(!data) { return; }

        if(disabled)
        {
            this.changePropertyIfSet(node, "--color-scheme-text", undefined);
            this.changePropertyIfSet(node, "--color-scheme-bg", undefined);
            this.changePropertyIfSet(node, "--color-scheme-light", undefined);
            this.changePropertyIfSet(node, "--color-scheme-dark", undefined);
            return;
        }

        this.changePropertyIfSet(node, "--color-scheme-text", data.text);
        this.changePropertyIfSet(node, "--color-scheme-bg", data.bg);
        this.changePropertyIfSet(node, "--color-scheme-light", data.light);
        this.changePropertyIfSet(node, "--color-scheme-dark", data.dark);
    }

    setFonts(node:HTMLElement, disabled = false)
    {
        const headingWeight = (this.boldHeadings && !disabled) ? "bold" : "regular";
        node.style.setProperty("--heading-weight", headingWeight);

        for(const fontType of ["body", "heading"])
        {
            const cssVar = `--font-${fontType}`;
            const customFontProvided = this.fonts[fontType];
            let fontName = DEFAULT_FONT;
            if(customFontProvided && !disabled)
            {
                fontName = this.fonts[fontType]._fontName;
            }

            // set CSS variable to use font
            node.style.setProperty(cssVar, fontName);
        }
    }

    getRandomBackgroundImage() { return this.backgroundImages[Math.floor(Math.random() * this.backgroundImages.length)]; }
    randomizeBackground(node:HTMLElement, disabled = false)
    {
        if(disabled) { node.style.removeProperty("--image-bg"); return; }
        if(this.backgroundImages.length <= 0) { return; }
        node.style.setProperty("--image-bg", `url(${this.getFullURL(this.getRandomBackgroundImage())})`);
    }
}