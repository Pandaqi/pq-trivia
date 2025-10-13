# PQ Trivia

An easy system to generate digital or analog (pub) quiz experiences. 

* You write your questions in simple text (or Markdown) files.
* Gather all the media for your quiz (image/audio/video) as separate files too.
* Then simply include this library, create a new `Quiz` with your preferred settings, and all your work is transformed into an interactive trivia experience.

Read the docs for a more detailed explanation. This includes the very simple "syntax" for inputting questions (answers, score, media to include, etc), as well the _many_ settings you can change and modify to your liking.

Check out the barebones template folder for the simplest setup for a new quiz.

* A very simple `index.html` file that includes the library and starts a new Quiz.
* The library (`pq-trivia.min.js`) itself, of course. (I won't update this file in the template all the time, so replace it with the latest version yourself.)
* The questions in the `questions` folder.
* All your media in the `media` folder.
* Open `index.html` in any browser, point it to your questions, and you're good to go.