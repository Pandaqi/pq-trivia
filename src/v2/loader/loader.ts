import { isExternalURL, isValidMediaType, parseExtension, parseQuestionDataIntoObjects, parseRawFile } from "../tools/parser";
import type { Question } from "../questions/question";
import { showMessage } from "../tools/errorHandler";
import { type QuizParams, VALID_FILE_EXTENSIONS } from "../tools/params";
import { DEFAULT_UI_LANGUAGE } from "../translator/translator";
import { capitalize } from "../tools/helpers";
import { propertyAlreadyHasData, QuestionData } from "../tools/questions";
import type { QValRandom } from "../questions/questionValueRandom";

export const fileExists = (url:string) => 
{
    var req = new XMLHttpRequest();
    req.open('HEAD', url, false);
    req.send();
    return req.status !== 404;
}

export const loadFile = async (url:string, callback:Function) =>
{
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url);

        xhr.onerror = (ev) => { resolve(false); }
        xhr.onloadend = async () => {
            if(xhr.status == 404) { resolve(false); return; }
            if(xhr.status == 200) {
                await callback(url, xhr.response);
                resolve(true);
            }
        };

        xhr.send();
    });
}

export const isLocalFile = () =>
{
    return window.location.protocol == "file:";
}

export const isHosted = () =>
{
    return ["http:", "https:"].includes(window.location.protocol);
}

// It either returns flat strings OR already processed (JSON) objects
export type SubLoaderResult = Record<string,QuestionData[]>;
export type SubLoader = (l:Loader, params:QuizParams) => Promise<SubLoaderResult>;

export const getFileExtensionAcceptList = (params:QuizParams) =>
{
    return params.fileExtensionsUpload.map((x) => "." + x).join(",");
}

export const ensureTrailingSlash = (path:string) =>
{
    const lastChar = path.charAt(path.length-1);
    if(lastChar != "/") { path += "/"; }
    return path;
}

export const sanitizeLoaderParams = (params:QuizParams) =>
{
    // check if all extensions are valid; then remember to search for all of these
    const arr = [];
    for(const ext of params.fileExtensions)
    {
        if(!VALID_FILE_EXTENSIONS.includes(ext)) { continue; }
        arr.push(ext);
    }
    params.fileExtensions = arr;

    params.subFolderMedia = ensureTrailingSlash(params.subFolderMedia)
    params.subFolderQuestions = ensureTrailingSlash(params.subFolderQuestions)
    params.subFolderTheme = ensureTrailingSlash(params.subFolderTheme)

    return params;
}

export const getLanguageCode = (path:string) =>
{
    if(path.length <= 0) { return null; }
    const pathSplit = path.split(".");
    if(pathSplit.length < 3) { return null; }
    return pathSplit[pathSplit.length - 2];
}

export enum SubFolderType
{
    MEDIA = "media",
    QUESTIONS = "questions",
    THEME = "theme"
}

export class Loader
{
    params: QuizParams;
    cache: Record<string, Question[]>
    data: Question[];

    constructor(params:QuizParams = {})
    {
        this.params = sanitizeLoaderParams(params);
        this.cache = {};
    }

    async load(subLoader:SubLoader) : Promise<Question[]>
    {
        // this returns an object with URL (key) => QUESTION DATA LIST (value)
        const rawData = await subLoader(this, this.params); 

        // parse the actual content (basically translates between input and output)
        const questions = [];
        for(const [url,data] of Object.entries(rawData))
        {
            const questionDataAtURL : QuestionData[] = data;

            // if the file had a language code at the end, mark ALL questions inside as being that language
            const languageCode = getLanguageCode(url) ?? DEFAULT_UI_LANGUAGE;
            for(const q of questionDataAtURL)
            {
                const alreadyHasLanguageSet = propertyAlreadyHasData(q, "language");
                if(alreadyHasLanguageSet) { continue; }
                q.language = languageCode;
            }

            // convert the raw JSON objects into actual Question class instances
            const questionObjects = parseQuestionDataIntoObjects(questionDataAtURL, this.params);
            questions.push(...questionObjects);
        }

        // check urls to media/assets
        this.checkMediaValidity(questions);

        return questions;
    }

    isFullMediaPath(path:string)
    {
        return path.includes(this.params.subFolderMedia);
    }

    getFullMediaPath(name:string)
    {
        return this.getFilePath(name, "", SubFolderType.MEDIA);
    }

    getFilePath(name:string, ext = "txt", sub = SubFolderType.MEDIA)
    {
        const subFolder = this.params["subFolder" + capitalize(sub)] ?? "";

        let base = this.params.url + subFolder + name;
        if(isExternalURL(name, this.params)) { base = name; }

        if(ext.length <= 0) { return base; }
        return base + "." + ext;
    }

    checkMediaValidity(questions:Question[])
    {
        for(const elem of questions)
        {
            this.checkPathValidity(elem, "media");
            this.checkPathValidity(elem, "answers");
        }
    }

    checkPathValidity(q:Question, prop:string)
    {
        const checkFileExistence = window.location.protocol.includes("http");
        const elements = (q[prop] as QValRandom).get();
        for(const elem of elements)
        {
            const val = elem.get();
            elem.setRaw(val);

            const path = this.getFilePath(val, "", SubFolderType.MEDIA);
            const isMedia = isValidMediaType(parseExtension(path), this.params);
            if(isMedia && checkFileExistence && !fileExists(path))
            {
                showMessage(`Media doesn't exist: ${path}`);
            }
        }
    }
}