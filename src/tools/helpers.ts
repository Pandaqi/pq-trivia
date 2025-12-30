import type { Question } from "../questions/question";
import { Section } from "../questions/section";
import type { Quiz } from "../quiz";

export const shuffle = <T>(array:T[], RNG = Math.random) : T[] =>
{
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(RNG() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export const anyMatch = (a:any[], b:any[]) =>
{
    for(const elem1 of a)
    {
        for(const elem2 of b)
        {
            if(elem1.toString().toLowerCase().trim() == elem2.toString().toLowerCase().trim()) { return true; }
        }
    }
    return false;
}

export const getRelativeIndexMax = (q:Question, quiz:Quiz) =>
{ 
    return q.isSection() ? quiz.translator.countSections() : quiz.translator.countQuestionsWithoutSections(); 
}

export const clamp = (val:number, a:number, b:number) =>
{
    return Math.min(Math.max(val, a), b);
}

export const toMiddotString = (val:string[]) =>
{
    return val.join("&nbsp;&cdot;&nbsp;");
}

export const toMultiNodeString = (val:string[]) =>
{
    if(val.length <= 0) { return ""; }
    if(val.length <= 1) { return val[0]; }
    return val.map((x) => `<p>${x}</p>`).join("");
}

export const toWhiteSpaceString = (val:string[]) =>
{
   return val.join("<br>");
}

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const getMultipleChoiceLetter = (num:number) =>
{
    return ALPHABET.charAt(num);
}

export const filterExclusions = (questions:Question[], exclude:Record<string,string> = {}) =>
{
    // delete any questions that need to be excluded
    const hasExclusions = Object.keys(exclude).length > 0;
    if(!hasExclusions) { return questions; }

    const arr = [];
    for(const q of questions)
    {
        let shouldRemove = false;
        for(const [prop,data] of Object.entries(exclude))
        {
            const val = q.getPropertyAsList(prop);
            const dataList = Array.isArray(data) ? data : [data];
            if(anyMatch(dataList,val)) 
            {
                shouldRemove = true; 
                break;
            }
        }

        if(shouldRemove) { continue; }
        arr.push(q);
    }
    return arr;
}

export const applyMask = (questions:Question[], include:Record<string,string> = {}) =>
{
    const hasMask = Object.keys(include).length > 0;
    if(!hasMask) { return questions; }

    const arr = [];
    for(const q of questions)
    {
        let shouldAdd = false;
        for(const [prop,data] of Object.entries(include))
        {
            const val = q.getPropertyAsList(prop);
            const dataList = Array.isArray(data) ? data : [data];
            if(anyMatch(dataList,val)) 
            {
                shouldAdd = true; 
                break;
            }
        }

        if(!shouldAdd) { continue; }
        arr.push(q);
    }
    return arr;
}

export const filterSections = (sections:Section[], filter:string[]) =>
{
    if(filter.length <= 0) { return sections; }

    const arr = [];
    for(const section of sections)
    {
        if(!filter.includes(section.getName())) { continue; }
        arr.push(section);
    }
    
    return arr;
}

export const capitalize = (str:string) =>
{
    return str.slice(0,1).toUpperCase() + str.slice(1)
}