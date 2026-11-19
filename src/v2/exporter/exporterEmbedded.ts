import { parseQuestionValueIntoString } from "../tools/parser"
import { ItemOrder, type Question } from "../questions/question";
import { QVal } from "../questions/questionValue";
import type { Quiz } from "../quiz"
import { isQuestionPropertyDefault, RANDOMIZED_PROPS } from "../tools/questions";

export const parseQuestionsIntoJSON = (questions: Question[]) =>
{
    const questionsParsed = [];
    for(const q of questions)
    {
        if(q.isHiddenAtExport()) { continue; }

        // first export all the basic parameters
        const obj = {};
        for(const [prop,val] of Object.entries(q.params))
        {
            const noValue = !val || (Array.isArray(val) && val.length <= 0) || (val instanceof QVal && val.get() == "");
            if(noValue) { continue; }

            let newVal;
            if(!Array.isArray(val)) { newVal = parseQuestionValueIntoString(val); } 
            else { newVal = val.map((x) => parseQuestionValueIntoString(x)); }

            // defaults don't need to be exported!
            if(isQuestionPropertyDefault(q, prop, newVal)) { continue; }

            // finally, save it on the object
            obj[prop] = newVal;
        }

        // then export all special ones (which also overwrites whatever basic param was)
        for(const prop of RANDOMIZED_PROPS)
        {
            const { value, order } = q[prop].toExport();
            if(value.length > 0) { obj[prop] = value.map((x) => parseQuestionValueIntoString(x)); }
            if(order != ItemOrder.SHUFFLE) { obj[prop + "order"] = order; }
        }

        questionsParsed.push(obj);
    }
    
    return questionsParsed;
}

export const parseQuestionsIntoJSONString = (questions: Question[]) =>
{
    return JSON.stringify(parseQuestionsIntoJSON(questions));
}

export const exporterEmbedded = () =>
{
    return (q:Quiz) =>
    {
        // use a unique property per language, in the format that the loader likes
        const obj = {};
        for(const [langCode, db] of q.translator.databasesByLanguage.entries())
        {
            obj[`questions.${langCode}.txt`] = parseQuestionsIntoJSON(db.questionList);
        }
        return obj;
    }
}