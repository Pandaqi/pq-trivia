# To-Do











EXAMPLES: Please create an example test within `examples/feature-demos/` for all major features of the framework (incl animations, transitions, audio, video, multiplayer, etcetera). (Either a raw `.html` or a folder with more files inside for that specific example.) A suite of 10 or 15 simple examples that, together, cover basically everything you can do.

TEST: Now that the framework is in place, **create a full quiz from scratch**. 

* Pick a popular topic, design the `.trivia` file, gather the media needed online, and create a proper theme for it (by grabbing fonts/images online too). 
* Report any breaking points that make it hard for you (an AI agent) to automate this entire process, then fix all of them.
* Put these automatically generated quizzes into their own folder in `examples/complete-quizzes/`. Do NOT add any details about that they were automatically generated or an AI made them---the point is to test if it's indistinguishable from a human-made quiz.

LANGUAGES: Please add full UI support for 10 languages. Pick the most common languages in which people will be playing quizzes or buying my quizzes.

CODE QUALITY: Please check all code in the repository against our strict code style guidelines.

* For example, I noticed loads of nested ternary statements (`? : ` multiple times). This is EXPLICITLY forbidden at all times. So fix all that.
* Do NOT ignore the strict code quality rules. Follow them. Update the codebase.
* (This will likely surface bugs and more areas of improvement, because bad code leads to invisible bugs.)

CLEAN UP: Dramatically shorten and rewrite all documents (incl CHANGELOG.md and such), and remove the entire `ROADMAP.md`. Make it read in my voice, a human voice. Remove redundancy, bloat, long paragraphs, needless marketing copy ("it's not X, it's Y", or three short statements in a row with a comma in-between, or phrases like "here's why you should care"). It's just a TOOL to make QUIZZES, no need to sell anything or convince anyone, be HELPFUL instead.

PUBLISH: Publish this repository to npm. Namespace it: `@pandaqi/pq-trivia`