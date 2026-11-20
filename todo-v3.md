# To-Do












TEST: Now that the framework is in place, **create a full quiz from scratch**. 

* Pick a popular topic, design the `.trivia` file, gather the media needed online, and create a proper theme for it (by grabbing fonts/images online too). 
* Report any breaking points that make it hard for you (an AI agent) to automate this entire process, then fix all of them.
* Put these automatically generated quizzes into their own folder in `examples/complete-quizzes/`. Do NOT add any details about that they were automatically generated or an AI made them---the point is to test if it's indistinguishable from a human-made quiz.

LANGUAGES: Please add full localized support for 8 languages (total; EN and NL already there). Pick the most common languages in which people will be playing quizzes or buying my quizzes.

CLEAN UP: Find any documents, JSDoc comments, and more that are still far too long and clearly written by your AI voice. Make it read in my voice, a human voice. Remove redundancy, bloat, long paragraphs, needless marketing copy ("it's not X, it's Y", or three short statements in a row with a comma in-between, or phrases like "here's why you should care"). It's just a TOOL to make QUIZZES, no need to sell anything or convince anyone, be HELPFUL instead. 

Also use this time to verify the documents are complete and accurate, compared to the current standing of the framework and its API/features/workflow. Don't let things go undocumented nor confidently state something wrong/vague/useless.

And rewrite them to be as immediately practical as possible. "You want to do X? Then use properties A, B and do C, D." "Want to use a quiz in the classroom? Try this, look at these options, and maybe you're interested in features A and B here." That kind of thing.

PUBLISH: Publish this repository to npm. Namespace it: `@pandaqi/pq-trivia`