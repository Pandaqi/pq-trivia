import { applyMask, filterExclusions, shuffle } from "../tools/helpers";
import type { QuizParams } from "../tools/params";
import { getAllPossibleValuesFor } from "../tools/parser";
import type { Question } from "./question";

export class Section
{
    start: Question
    questions: Question[]

    constructor()
    {
        this.questions = [];
    }

    getName() { return this.start.getSection(); }
    getID() { return this.start.getID(); }
    setID(id:string) { this.start.setID(id); }
    getSecret() { return this.start.getSecret(); }
    setStart(q:Question) { this.start = q; q.sectionObject = this; return this; }
    addQuestion(q:Question) { this.questions.push(q); return this; }
    getQuestions() { return this.questions; }
    getQuestionsWithStart() { return [this.start, this.questions].flat(); }

    setQuestions(qs:Question[]) { this.questions = qs; }
    countQuestions() { return this.questions.length; }

    getFixedIndex()
    {
        if(!this.start.params.placeat) { return 0; }
        return parseInt(this.start.params.placeat[0].get());
    }

    calculateStatistics()
    {
        return { 
            numQuestions: this.questions.length, 
            numPoints: this.questions.reduce((prev,cur) => prev + cur.getScoreMaximum(), 0) 
        };
    }

    applyFilters(params:QuizParams)
    {
        this.questions = filterExclusions(applyMask(this.questions, params.include), params.exclude);
    }

    // @NOTE: this is useful to cachce once for displaying question number while playing 
    // as well as when printing out (e.g. answer sheet or grade table)
    assignQuestionIndices(startIndex:number)
    {
        for(let i = 0; i < this.questions.length; i++)
        {
            this.questions[i].indexRelative = startIndex + i;
        }
    }

    shuffle(params:QuizParams, rng)
    {
        if(!params.keepQuestionOrder)
        {
            // first do a STABLE, CONSISTENT sort on anything (I picked the question alphabetically, but it doesn't matter)
            // so that the seeded shuffling works later on
            // otherwise it's STILL random because of delays and inconsistencies in downloading the questions,
            // and thus different ordering when inserted into array
            this.questions.sort((a,b) => 
            {
                return a.getQuestion().localeCompare(b.getQuestion(), "en", { sensitivity: "variant", numeric: true });
            })
            shuffle(this.questions, rng.questions);
        }
        
        // allow some common groupings (default to sections, which means NO grouping if you set no sections yourself)
        const groupBy = params.groupBy;
        if(groupBy)
        {
            const allPossibleValues = getAllPossibleValuesFor(this.questions, groupBy);
            shuffle(allPossibleValues, rng.grouping);
            this.questions.sort((a,b) => 
            {
                const idx1 = allPossibleValues.indexOf(a.getPropertyAsValue(groupBy));
                const idx2 = allPossibleValues.indexOf(b.getPropertyAsValue(groupBy));
                return idx1 - idx2;
            })
        }

        for(const q of this.questions)
        {
            q.shuffle(params, rng);
        }
    }
}