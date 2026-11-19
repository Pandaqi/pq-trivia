import type { Quiz } from "../quiz";

export const TRANSLATION_EN = 
{
    // LOAD SCREEN
    "load-heading": `Load your Quiz`,
    "load-message": `Please select which questions you want to load.`,

    "load-button-builtin": `Load built-in questions!`,
    "load-button-builtin-tooltip": `Use this option when you just want to play, now, without hassle.`,
    "load-button-server": `Download questions from server!`,
    "load-button-server-tooltip": `Use this option when self-hosting and just dropping all files on your website.`,
    "load-button-upload": `Upload my own questions!`,
    "load-button-upload-tooltip": `Please select your own text files in the upload field above first.`,

    // START SCREEN
    "start-button-play": `Play the Questions!`,
    "start-button-play-tooltip": `Play the quiz! The button you probably want to click!`,
    "start-button-interactive": `Play interactively!`,
    "start-button-interactive-tooltip": `Each question gives an input field where you can put your answer. Automatic grading at the end.`,
    "start-button-answers": `View the Answers!`,
    "start-button-answers-tooltip": `Move through the quiz, but all answers are revealed / highlighted.`,
    "start-button-settings": `Settings`,
    "start-button-settings-tooltip": `Allows changing some settings before you continue.`,

    "start-heading": `Welcome to the Quiz!`,
    "start-message": `For each question, write down the number and your answer. Is everyone ready?`,
    "start-message-date": (quiz:Quiz) => `<em>This quiz was created or last updated in <strong>${ quiz.params.dateCreation }</strong>. Questions were designed using the information available at that time!</em>`,

    // END SCREEN
    "end-heading": `The End!`,
    "end-message": `You've finished all the questions! Press the button to see answers.`,

    "end-button-grade": `Grade your answers,`,
    "end-button-grade-tooltip": `Compares your input answers to the correct ones and gives a grade.`,
    "end-button-answers": `Play through the answers.`,
    "end-button-answers-tooltip": `Simply allows you to move through the quiz again, but the correct answer(s) are highlighted per question.`,
    "end-button-start": `Go back to start.`,
    "end-button-start-tooltip": `Return to the start screen (settings intact, questions still loaded).`,
    "end-button-exit": `Exit / Reload!`,
    "end-button-exit-tooltip": `Returns to the very first screen and CLEARS your data!`,

    // (DEFAULT) SETTINGS SCREEN
    "settings-rounds": `Rounds`,
    "settings-rounds-message": `Pick which rounds you want to include/exclude.`,
    "settings-export": `Export (Advanced)`,
    "settings-export-message": `These buttons help export the quiz (or various parts) for other uses (such as offline, physical, custom).`,

    "settings-export-answer-sheet": `Export Answer Sheet`,
    "settings-export-answer-sheet-tooltip": `Creates an answer sheet (for grading) for this specific quiz. Use browser Print function to turn into PDF.`,
    "settings-export-answer-form": `Export Answer Form`,
    "settings-export-answer-form-tooltip": `Creates an answer form (for players) for this specific quiz. Use browser Print function to turn into PDF.`,
    "settings-export-print": `Export Quiz (Printable; Questions)`,
    "settings-export-print-tooltip": `Converts the entire quiz into a one-question-one-page format. Use browser Print function to turn into PDF.`,
    "settings-export-print-answers": `Export Quiz (Printable; Answers)`,
    "settings-export-print-answers-tooltip": `Converts the entire quiz into a one-question-one-page format, showing ANSWERS. Use browser Print function to turn into PDF.`,
    "settings-export-builtin": `Export Quiz (as Object)`,
    "settings-export-builtin-tooltip": `Copies a JavaScript (JSON) object to your clipboard containing this quiz. Use as builtin data for the system.`,

    "settings-seed": `Seed`,
    "settings-seed-tooltip": `Changing this will change the random order of questions and answers.`,
    "settings-button-theme": (quiz:Quiz) => `Turn ${quiz.params.themeDisabled ? "On" : "Off"} Theme`,
    "settings-button-theme-tooltip": `The "theme" refers to the general design (colors, background image, ...) around the quiz.`,

    "settings-heading": `Settings`,
    "settings-save": `Save & Go Back`,
    "settings-save-tooltip": `Saves your settings and returns to the start screen.`,

    // EXPORTS & GRADING
    "export-answer-form-heading": `Answer Form`,
    "export-answer-sheet-heading": `Answer Sheet`,
    "export-grade-heading": `Grade`,
    "export-grade-question-column": `Question`,
    "export-grade-correct-column": `Correct`,
    "export-grade-answer-column": `You Said`,
    "export-grade-message": (quiz:Quiz, params:Record<string,any>) => `Here are your results and your final grade. You scored <strong>${params.totalPointsScored} / ${params.totalPointsPossible} (${params.scoreAsPercentage}%)</strong>!`,

    "export-ui-button-print": `Print / Save`,
    "export-ui-button-print-tooltip": `Uses the browser print feature to save this as a PDF.`,
    "export-ui-button-back": `Go Back`,
    "export-ui-button-back-tooltip": `Return to the quiz interface.`, 

    // PLAYING
    "play-new-round-default-message": `This is the start of a new round. Continue when you're ready!`,
    "play-secret-theme-message": `This round has a secret theme that connects all the answers. Figuring it out will help you!`,
    "play-secret-theme-word": `Secret Theme`,
    "play-secret-theme-question": `What was the secret theme of this round?`,
    "play-sources-word": `Sources`,
    "play-question-categories-tooltip": `Question Categories`,
    "play-question-authors-tooltip": `Question Authors`,
    "play-question-range-tooltip": `Question Range ("Error Margin")`,
    "play-question-score-tooltip": `Question Score`,
    "play-interactive-answer-placeholder": `... answer here ...`,
    "play-mode-answer": "Answer Mode",
    "play-mode-question": "Question Mode",

    // QUESTIONS
    "question-hint-reveal": `Reveal Hint`,
    "question-open-answer-type": `This is an open question!`,
    "question-choice-answer-type": (quiz:Quiz, params:Record<string,any>) => {
        const suffix = params.num <= 1 ? "answer" : "answers";
        return `This is a multiple choice question! (Pick ${params.num} correct ${suffix}.)`
    },
    "question-list-answer-type": (quiz:Quiz, params:Record<string,any>) => {
        const suffix = params.num <= 1 ? "answer" : "answers";
        return `This is a multiple response question! (Give ${params.num} correct ${suffix}; you get the number of points indicated <em>for each correct answer</em>.)`;
    },
    "question-range-answer-type": (quiz:Quiz, params:Record<string,any>) => {
        return `Answer with a specific number. You may be off by at most ${params.range}.`;
    },
    "question-range-interactive-answer-placeholder": "... numeric answer here ...",
    "question-section-answer-type": (quiz:Quiz, params:Record<string,any>) => {
        return `This round contains ${params.stats.numQuestions} questions for ${params.stats.numPoints} points.`
    },
    "question-sort-answer-type": `Place all options in the <em>correct order</em>. You get the number of points indicated <em>for each element at the correct position</em>.`,

    // UI
    "ui-button-prev": `Previous`,
    "ui-button-next": `Next`,
    "ui-button-font-size-plus": `Font +`,
    "ui-button-font-size-min": `Font -`,

    "ui-button-prev-section": `Previous Section`,
    "ui-button-next-section": `Next Section`,
    "ui-button-reveal": `Toggle Question/Answer`,
    "ui-button-end": `Skip to End`,
    "ui-button-start": `Skip to Start`,

    "ui-button-media": `Play/Pause Media`,
    "ui-button-media-fullscreen": `Make Media Fullscreen`,
    "ui-button-hint": `Toggle Hints`,
    "ui-button-language": `Change Language`,

    "ui-interactive-no-input-error": `Please give your input/answer before continuing`,
    "ui-interactive-cant-go-back-error": `Can't go back in restricted mode.`,
    "ui-restricted-no-answers-error": `Can't show answers / go to answer mode in restricted mode`,

    "ui-score-singular": "point",
    "ui-score-plural": "points",

    "ui-leave-safety-message": `Are you sure you want to leave?`,
    "ui-toggle-answer-safety-message": `Are you sure you wish to toggle answers?`,
    "ui-toggle-mode-message": `Are you sure you want to toggle mode (questions<->answers)?`,
    "ui-skip-start-safety-message": `Are you sure you want to skip to the start?`,
    "ui-skip-end-safety-message": `Are you sure you want to skip to the end?`,
    "ui-stats-message": (quiz:Quiz, params:Record<string,any>) => {
        return `(${params.stats.numRounds} rounds, ${params.stats.numQuestions} questions, ${params.stats.numPoints} points)`;
    }

}