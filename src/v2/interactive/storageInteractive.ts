import type { Question } from "../questions/question";

export class StorageInteractive
{
    id: string; // id/seed of this specific quiz, used to know what data to access/change and what not
    data:Record<string,any>

    constructor(id:string)
    {
        this.id = id;
        this.load();
    }

    getKey() { return `pq-trivia-${this.id}`; }
    clear() 
    { 
        window.localStorage.removeItem(this.getKey());
        this.load();
    }

    load()
    {
        this.data = JSON.parse(window.localStorage.getItem(this.getKey()) ?? "{}");
    }

    loadAnswer(q:Question) : any[]
    {
        return this.data[q.getID()] ?? [];
    }

    save()
    {
        window.localStorage.setItem(this.getKey(), JSON.stringify(this.data));
    }

    saveAnswer(q:Question, node:HTMLElement)
    {
        let value;
        let number = parseInt(node.dataset.id ?? "0");

        // from input elements we can read the `.value`
        if(node instanceof HTMLInputElement) {
            value = node.value;
            if(node.type == "number") { value = parseFloat(node.value); }
        
        // otherwise, value needs to have been set by me into `.dataset` properties
        } else {
            value = node.dataset.value ?? "no-value";
        }

        // for this specific question (differentiated by ID), 
        // set answer at position `number` (in case multiple answers allowed), 
        // to `value` (the thing the user put into the interactive element)
        const id = q.getID();
        if(!(id in this.data)) { this.data[id] = []; }
        this.data[id][number] = value;

        this.save();
    }

    clearAnswer(q:Question, node:HTMLElement)
    {
        const number = parseInt(node.dataset.id ?? "0");
        const id = q.getID();
        this.data[id][number] = undefined;
        if(this.data[id].filter((x) => x != undefined).length <= 0) { delete this.data[id]; }
        this.save();
    }
}