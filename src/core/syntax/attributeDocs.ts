/**
 * One sentence per attribute, for docs and the wizard.
 *
 * Not imported by the parser or the player. The core bundle stays small, and
 * `bun run cli/index.ts docs` prints the reference from this plus the registry.
 */

export const ATTRIBUTE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  Question: "Starts a question block.",
  Type: "What kind of question this is.",
  Answers: "Options or expected answers.",
  Correct:
    "Which answers count. Defaults to the first, or to all for list, sort, match and cloze.",
  Range: "Error margin. Implies Type => Range.",
  Tolerance: "Estimate: how far off the answer may be. Falls back to Range.",
  Unit: "Shown after a number: km, kg, years. Never graded.",
  Slider: "Show a slider with this range, like 0..100.",
  HitRadius:
    "How close a click must land, in percent of the image. Eight by default.",
  Negate:
    "Flip the choice: the player picks the false options, not the true ones.",
  Feedback: "One line per answer, shown after the reveal.",
  Suggest: "Autocomplete suggestions for text and number answers.",
  Rows: "Matrix: one statement per row.",
  Scale: "Matrix: the shared scale. True and False when absent.",
  Multiple: "Matrix: tick more than one box per row.",
  Parts: "Parts: one `kind: label: weight` per part, answers split by ||.",
  Buckets: "Classification: the named buckets.",
  Targets:
    "Hotspot and diagram: `label @ x,y` points on the image, in percent.",
  PlayLimit: "How many times a clip may play.",
  Buzzer: "Live only: the first correct answer wins the question.",
  ID: "Stable reference for translations, storage and flow.",
  Section: "Assign this question to a round.",
  PlaceAt: "Rounds only: fix this round at a position, counting from one.",
  PlaceBefore: "Put this block before the given IDs.",
  PlaceAfter: "Put this block after the given IDs.",
  AnswersOrder: "Keep or shuffle the answers.",
  MediaOrder: "Keep or shuffle the media.",
  Buttons: "Start and End screens: which buttons to show, in order.",
  Timer: "Time limit. 90, 1:30 and 1m30s all work.",
  Media: "A file to show, play or link.",
  Category: "Topic tags.",
  Author: "Who wrote it.",
  Score: "Points for a correct answer.",
  Scoring: "How points are awarded: all-or-nothing, partial or per-correct.",
  Grading:
    "How strictly text answers are compared: exact, normalized or fuzzy.",
  FuzzyDistance: "Maximum edit distance for fuzzy grading.",
  AlsoAccept: "Equivalent answers.",
  Reject: "Explicitly wrong answers. Beats fuzzy.",
  Explanation: "Shown after the reveal and in the results.",
  Comment: "Shown to players.",
  Hints: "Revealed one at a time.",
  Sources: "Where the answer comes from.",
  Description: "Screen-reader summary.",
  Alt: "Fallback alt text for media.",
  Variant: "Tag for a short or alternate version.",
  SyncAll: "Copy missing properties from the other language.",
  Secret: "Rounds only: hidden theme.",
  FormatText: "Parse inline formatting.",
  HiddenAtPlay: "Skip this block during play.",
  HiddenAtExport: "Leave this block out of exports.",
  Class: "Extra CSS classes on the screen.",
  Layout: "Named layout. CSS does the rest.",
  Background: "color:..., image:..., gradient:..., none.",
  ColorScheme: "Named color scheme.",
  Transition: "Screen enter animation.",
  Reveal: "Answer reveal animation.",
  Steps:
    "Reveal one part at a time: media, question, answers, comments, hints, sources, explanation, or all. An animation name between two parts sets the transition for what follows.",
  StepTransition: "Default animation between steps. Fade when nobody says.",
  Print: "hide, background, no-background, notes.",
  Direction: "Text direction: auto, ltr or rtl.",
  Height: "Height for a custom script widget.",
  PrintFallback: "Static text for print when a widget cannot be printed.",
  Credits: "End screen: who made this quiz.",
  Language: "Content language code.",
  Translation: "Explicit link to another language.",
  Unlock: "Round ID this block waits for.",
  When: "Tiny condition grammar. No eval.",
  Continue: "When the player may move on.",
  Include: "Path[#selector] to merge before planning.",
  Script: "Sandboxed widget file.",
  Notes:
    "Presenter notes. Host only. Never in the player view model, never on paper.",
  Pool: "Rounds only: draw this many questions from the round, seeded.",
  Difficulty: "How hard it is, 1 to 5. Used to balance a pool.",
  Variants:
    "One line per slot. `{1}`, `{2}` in the text take the value picked for that slot.",
  RoundTimer: "Rounds only: one timer for the whole round.",
  Wager:
    "Bet up to your score, never more than the question's points. Right wins the stake, wrong loses it, and a score never goes below zero.",
};
