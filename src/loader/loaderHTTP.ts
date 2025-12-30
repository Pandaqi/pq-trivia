import type { QuizParams } from "../tools/params";
import { parseRawFile, parseStringIntoData } from "../tools/parser";
import { QuestionData } from "../tools/questions";
import { Loader, SubFolderType, fileExists, loadFile } from "./loader";

const getURLsToLoad = (loader:Loader, type = SubFolderType.QUESTIONS) =>
{
    if(loader.params.filenames.length > 0) { return getURLsFixed(loader, type); }
    return getURLsInSequence(loader, type);
}

const getURLsFixed = (loader:Loader, type = SubFolderType.QUESTIONS) =>
{
    const arr = [];
    for(const name of loader.params.filenames)
    {
        const path = loader.getFilePath(name, "txt", type);
        const exists = fileExists(path);
        if(!exists) { break; }
        arr.push(path);
    }
    return arr;
}

const getURLsInSequence = (loader:Loader, type = SubFolderType.QUESTIONS) =>
{   
    let counter = 0;
    let exists = true;
    const arr = [];
    const languages = loader.params.languages ?? [""];
    while(exists)
    {
        let path = "";
        let foundFile = false;

        // try to find all languages
        for(const language of languages)
        {
            let foundFileForLanguage = false;

            for(const extension of loader.params.fileExtensions)
            {
                let pathStart = `${loader.params.filenamePattern}-${counter}`;
                if(language.length > 0) { pathStart += `.${language}` }

                path = loader.getFilePath(pathStart, extension, type);
                exists = fileExists(path);
                if(exists) { foundFile = true; foundFileForLanguage = true; break; }
            }

            if(foundFileForLanguage)
            {
                arr.push(path);
            }
        }

        counter++;
        if(!foundFile) { break; }
        arr.push(path);
    }
    return arr;
}

const cache : Record<string, string> = {};

const inCache = (url:string) => (url in cache);
const fileLoadedCallback = async (url:string, data:string) =>
{
    cache[url] = data;
}

// Loads files with <NAME>_<IDX>, index from 0 and upwards, until it can't find the next one anymore
export const loaderHTTP = () =>
{ 
    return async (loader:Loader, params:QuizParams) =>
    {
        // first load the actual files (depends on network)
        const urls = getURLsToLoad(loader, SubFolderType.QUESTIONS);
        const promises = [];
        for(const url of urls)
        {
            if(inCache(url)) { continue; }
            promises.push(loadFile(url, fileLoadedCallback));
        }

        await Promise.all(promises);

        // then convert into raw objects (to be turned into Question objects later)
        const cacheConverted : Record<string, QuestionData[]> = {};
        for(const [url,data] of Object.entries(cache))
        {
            cacheConverted[url] = parseStringIntoData(parseRawFile(data, url), params);
        }

        return cacheConverted;
    }
}