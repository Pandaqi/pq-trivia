import type { Quiz } from "../quiz";

export const TRANSLATION_NL = {
  // LOAD SCREEN
  "load-heading": `Quiz Laden`,
  "load-message": `Selecteer de vragen die je wilt laden.`,

  "load-button-builtin": `Laad standaard ingebouwde vragen.`,
  "load-button-builtin-tooltip": `Gebruik deze optie als je meteen wilt spelen, nu, zonder iets te veranderen.`,
  "load-button-server": `Download vragen van de server.`,
  "load-button-server-tooltip": `Gebruik deze optie als je de quiz (en tekstbestanden met vragen) host op je website.`,
  "load-button-upload": `Upload bestanden vanaf de computer.`,
  "load-button-upload-tooltip": `Gebruik het uploadvak hierboven om je bestanden te kiezen. Druk daarna op deze knop.`,

  // START SCREEN
  "start-button-play": `Speel de quiz.`,
  "start-button-play-tooltip": `Dit is de knop die je waarschijnlijk wilt klikken.`,
  "start-button-interactive": `Speel de quiz op interactieve modus.`,
  "start-button-interactive-tooltip": `Elke vraag staat je toe om het antwoord in te voeren. Je antwoorden worden automatisch opgeslagen en nagekeken aan het einde.`,
  "start-button-answers": `Bekijk de antwoorden.`,
  "start-button-answers-tooltip": `Stap door de quiz van begin tot eind terwijl de antwoorden worden getoond.`,
  "start-button-settings": `Instellingen`,
  "start-button-settings-tooltip": `Verander instellingen voordat je begint. (Voorbeeld: bepaalde rondes uitsluiten.)`,

  "start-heading": `Welkom bij de quiz!`,
  "start-message": `Probeer op elke vraag het juiste antwoord te geven. Is iedereen er klaar voor?`,
  "start-message-date": (quiz: Quiz) =>
    `<em>Deze quiz werd gemaakt (of voor het laatste geupdatet) in <strong>${quiz.params.dateCreation}</strong>. Vragen zijn ontworpen met de kennis die toen beschikbaar was!</em>`,

  // END SCREEN
  "end-heading": `Einde`,
  "end-message": `Je hebt alle vragen gehad! Gebruik de knop om naar antwoordmodus te schakelen.`,

  "end-button-grade": `Kijk je antwoorden na.`,
  "end-button-grade-tooltip": `Vergelijkt de antwoorden die je hebt ingevoerd met de juiste antwoorden en geeft je een eindcijfer.`,
  "end-button-answers": `Bekijk de antwoorden.`,
  "end-button-answers-tooltip": `Staat je toe om nogmaals door de quiz te gaan (van begin tot eind), maar nu wordt bij elke vraag het juiste antwoord getoond.`,
  "end-button-start": `Ga terug naar start.`,
  "end-button-start-tooltip": `Keer terug naar het startscherm (instellingen intact, vragen nog steeds geladen).`,
  "end-button-exit": `Sluit af`,
  "end-button-exit-tooltip": `Keert terug naar het laadscherm. (Alle ingevoerde data / progressie is KWIJT.)`,

  // (DEFAULT) SETTINGS SCREEN
  "settings-rounds": `Rondes`,
  "settings-rounds-message": `Kies welke rondes je wel/niet wilt spelen.`,
  "settings-export": `Exporteren (Geavanceerd)`,
  "settings-export-message": `Deze knoppen helpen je bij het exporteren van de quiz voor andere doeleinden (zoals offline/fysiek spelen).`,

  "settings-export-answer-sheet": `Exporteer Antwoordvel`,
  "settings-export-answer-sheet-tooltip": `Dit maakt een antwoordvel: alle juiste antwoorden op een rijtje om alles makkelijk na te kijken.`,
  "settings-export-answer-form": `Exporteer Antwoordformulier`,
  "settings-export-answer-form-tooltip": `Dit maakt een antwoordformulier: voor spelers om antwoorden in te vullen, precies toegespitst op deze quiz.`,
  "settings-export-print": `Exporteer Quiz (Printbaar; Vragen)`,
  "settings-export-print-tooltip": `Print alle vragen van de quiz naar een PDF; één vraag per pagina. Dit is identiek aan de quiz op je scherm, maar dan om te printen.`,
  "settings-export-print-answers": `Exporteer Quiz (Printbaar; Antwoorden)`,
  "settings-export-print-answers-tooltip": `Print de quiz naar een PDF met de ANTWOORDEN onthuld; één vraag per pagina.`,
  "settings-export-builtin": `Exporteer Quiz (als Object)`,
  "settings-export-builtin-tooltip": `Kopieert een JavaScript object (JSON) naar je plakbord. Dit kan je rechtstreeks invoeren in dit quiz systeem om offline te spelen.`,

  "settings-seed": `Notendop`,
  "settings-seed-tooltip": `De notendop bepaalt hoe alle willekeurige onderdelen worden gerangschikt. Exact dezelfde waarde hier moet altijd leiden tot exact dezelfde quiz (zelfde volgorde vragen, zelfde volgorde antwoorden, etc).`,
  "settings-button-theme": (quiz: Quiz) =>
    `Zet het thema ${quiz.params.themeDisabled ? "aan" : "uit"}.`,
  "settings-button-theme-tooltip": `Het "thema" refereert naar de lay-out/design (kleuren, achtergrondplaatjes, ...) van de quiz.`,

  "settings-heading": `Instellingen`,
  "settings-save": `Sla op en ga terug.`,
  "settings-save-tooltip": `Slaat je instellingen op en keert terug naar het startscherm.`,

  // EXPORTS & GRADING
  "export-answer-form-heading": `Antwoordformulier`,
  "export-answer-sheet-heading": `Antwoordvel`,
  "export-grade-heading": `Nakijkformulier`,
  "export-grade-question-column": `Vraag`,
  "export-grade-correct-column": `Juist`,
  "export-grade-answer-column": `Jij zei`,
  "export-grade-message": (quiz: Quiz, params: Record<string, any>) =>
    `Hier zijn je resultaten en je eindcijfer. Je hebt <strong>${params.totalPointsScored} / ${params.totalPointsPossible} (${params.scoreAsPercentage}%)</strong> gescoord!`,

  "export-ui-button-print": `Printen / Opslaan als PDF`,
  "export-ui-button-print-tooltip": `Gebruikt de ingebouwd Print functionaliteit van de browser om van deze pagina een PDF te maken.`,
  "export-ui-button-back": `Ga terug`,
  "export-ui-button-back-tooltip": `Keer terug naar waar je was in de interface van de Quiz.`,

  // PLAYING
  "play-new-round-default-message": `Dit is het begin van een nieuwe ronde. Wacht tot iedereen er klaar voor is. Ga dan door naar de volgende vraag.`,
  "play-secret-theme-message": `Deze ronde heeft een geheim thema dat alle antwoorden verbindt. Als je deze geheime connectie uitvogelt, kan je waarschijnlijk meer vragen juist beantwoorden.`,
  "play-secret-theme-word": `Geheim Thema`,
  "play-secret-theme-question": `Wat was het geheime thema van deze ronde?`,
  "play-sources-word": `Bronnen`,
  "play-question-categories-tooltip": `Categorieën`,
  "play-question-authors-tooltip": `Auteurs`,
  "play-question-range-tooltip": `Getalbereik ("foutmarge")`,
  "play-question-score-tooltip": `Score`,
  "play-interactive-answer-placeholder": `... antwoord hier ...`,
  "play-mode-answer": `Antwoordmodus`,
  "play-mode-question": `Vraagmodus`,

  // QUESTIONS
  "question-hint-reveal": `Toon hint`,
  "question-open-answer-type": `Dit is een open vraag!`,
  "question-choice-answer-type": (quiz: Quiz, params: Record<string, any>) => {
    const suffix = params.num <= 1 ? "correct antwoord" : "correcte antwoorden";
    return `Dit is een meerkeuzevraag! (Kies ${params.num} ${suffix}.)`;
  },
  "question-list-answer-type": (quiz: Quiz, params: Record<string, any>) => {
    const suffix = params.num <= 1 ? "correct antwoord" : "correcte antwoorden";
    return `Dit is een meerantwoordvraag! (Geef ${params.num} ${suffix}; je krijgt de aangegeven hoeveelheid punten voor <em>elk juist antwoord</em>.)`;
  },
  "question-range-answer-type": (quiz: Quiz, params: Record<string, any>) => {
    return `Antwoord met een specifiek <em>getal</em>. Je mag er maximaal ${params.range} vanaf zitten.`;
  },
  "question-range-interactive-answer-placeholder":
    "... numeriek antwoord hier ...",
  "question-section-answer-type": (quiz: Quiz, params: Record<string, any>) => {
    return `Deze ronde bevat ${params.stats.numQuestions} vragen voor ${params.stats.numPoints} punten.`;
  },
  "question-sort-answer-type": `Zet alle antwoorden in de <em>juiste volgorde</em>. Je krijgt de aangegeven hoeveelheid punten voor <em>elk antwoord dat op de juiste positie staat</em>.`,

  // UI
  "ui-button-prev": `Vorige`,
  "ui-button-next": `Volgende`,
  "ui-button-font-size-plus": `Lettergrootte +`,
  "ui-button-font-size-min": `Lettergrootte -`,

  "ui-button-prev-section": `Vorige ronde`,
  "ui-button-next-section": `Volgende ronde`,
  "ui-button-reveal": `Wissel Vraag/Antwoord`,
  "ui-button-end": `Skip naar einde`,
  "ui-button-start": `Skip naar start`,

  "ui-button-media": `Speel/Pauzeer media`,
  "ui-button-media-fullscreen": `Maak media fullscreen`,
  "ui-button-hint": `Wissel hints aan/uit`,
  "ui-button-language": `Verander taal`,

  "ui-score-singular": "punt",
  "ui-score-plural": "punten",

  "ui-interactive-no-input-error": `Geef een antwoord voordat je doorgaat.`,
  "ui-interactive-cant-go-back-error": `Je mag niet terug in de restrictieve modus.`,
  "ui-restricted-no-answers-error": `Je mag geen antwoorden bekijken in de restrictieve modus.`,

  "ui-leave-safety-message": `Weet je zeker dat je wilt weggaan?`,
  "ui-toggle-answer-safety-message": `Weet je zeker dat je antwoorden aan/uit wilt zetten?`,
  "ui-toggle-mode-message": `Weet je zeker dat je van modus wilt veranderen (vraagmodus <-> antwoordmodus)?`,
  "ui-skip-start-safety-message": `Weet je zeker dat je terug wilt naar start?`,
  "ui-skip-end-safety-message": `Weet je zeker dat je helemaal naar het einde wilt?`,
  "ui-stats-message": (quiz: Quiz, params: Record<string, any>) => {
    return `(${params.stats.numRounds} rondes, ${params.stats.numQuestions} vragen, ${params.stats.numPoints} punten)`;
  },
};
