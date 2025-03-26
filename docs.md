# Documentation

The trivia system has two different parts.

* INPUT: The syntax for writing your questions and answers.
* OUTPUT: The code that automatically reads the input and transforms that into the final quiz.

This documentation explains them both, in that order.

But first, the crucial part that most documentation skips: the **philosophy!**

The idea behind this system was as follows.

* It allows anyone to add questions to a quiz. This way, you can create a quiz together ("everyone sends in 10 questions") and still all play.
* The actual content (questions and answers) is contained in small and simple text files, completely separated from everything else. This makes it easy and lightweight to store, transfer, edit, etcetera.
* The system simply _reads_ that content and completely transforms it into a fully functioning quiz. (If it finds mistakes or has trouble parsing, it will inform you.) Ideally, after making the content of the quiz ... you are done and can enjoy it!

When surprised by how something works, or looking for how to achieve something, keep this general philosophy in mind and you'll probably figure it out quickly.

## Input

### What you DON'T need to do

When I created this system, many people defaulted to doing extra work that wasn't needed (or even broke the system). 

The idea behind the Trivia system is that it _takes care of everything for you_!

You don't need to do any numbering, or formatting, or labeling yourself. Nothing of the sort. Simply create your raw questions (including answers and other media, of course) in a text file, and you're done.

Below are some common examples of things I see often, but which you **shouldn't do**.

* Number your own questions
* Add a title (or _any_ other data that isn't related to the quiz) to your text file. (If you really want to add more info, use the comment syntax explained below.)
* Add returns ("line breaks") to make the text wrap or look nicer on your screen. (It assumes each individual line is a _new_ entry in a list.)
* Add weird characters or spaces to your file names. (For maximum compatibility, only use _letters_ and _numbers_, and replace spaces by something like `-`.) 

### File Name & Type

The system accepts any plain text files. The extension technically doesn't matter, but I settled on `.txt` files only for simplicity.

By default, it searches these text files in the `questions` folder, and expects names formatted like `questions_X`. (It checks questions_0, questions_1, and so forth until it finds nothing anymore and stops.)

There is no limit to the content inside one text file, or the total number of text files. This is what allows people to submit their own questions to a pub quiz, for example, to collaboratively create one where everyone can participate too.

### Parsing

The general parsing rules are as follows.

* Whitespace doesn't matter. You can leave as much space as you want between questions, or even properties of the same question, or accidentally place tabs before random things, it's all fine.
* If the system doesn't recognize something, it's thrown out. If possible, it just continues parsing and displays an error message.
* All attributes are optional and order doesn't matter ... with two exceptions. (This is further explained below.)
  * The `Question` property must always be included and always be first, as it marks the _start_ of a new question.
  * The `Answers` property must be present.

Everything in the questions syntax is, well, a question. If you want to add some other information, such as some comments to your future self, use the comment syntax: `// comment here` Every line that starts this way is simply ignored when the quiz is parsed.

Note that all parsing rules can be completely customized to your liking when initializing the system. This includes changing the specific symbols used in the syntax below, or whether something is possible/allowed at all.

### Questions

A question is nothing more than a list of attributes. Every attribute is formatted with an arrow (`=>`) between its _name_ and its _value_. For example, `Question => What is 2+2?`

Below is an example of the simplest possible question. (An _open-ended question_, relying on defaults, and most attributes are left out.)

```
Question => Which superhero is also called "Man of Steel"?
Answers => Superman
```

_Remark_: The arrow was chosen because the less digitally inclined understand it too, while very unlikely to show up inside an actual question or answer. A double colon (`:`), for example, is way more likely to be part of a question and thus screw up the parsing. Be mindful of this when customizing the syntax.

Below is an example of a slightly more customized question. This one is _multiple choice_, displays a nice image as decoration, and shows whose question it is.

```
Question => Which superhero is also called "Man of Steel"?
Answers => 
Superman
Batman
Wolverine
Mandalorian
Media => man_of_steel_logo.png
Author => Tiamo
```

Below is a final example of a much more involved question, using almost everything available to us.

```
Question => Name all superheroes that were part of the Avengers in the 2012 movie.
Answers => Iron Man|Captain America|Hulk|Thor|Black Widow|Hawkeye
Type => ChoiceSecret
Media => avengers_poster.jpg
Category => Movies, Marvel
Author => Tiamo
Comment =>
? Use their superhero names, not their real names
! Nick Fury recruits them but is no superhero himself, and Loki is not part of the Avengers.
Score => 6
ScoreMethod => One point per correct name
```

The next section explains all possible attributes in more detail.

### Attributes

`Question`: starts a new question. The value is the specific question you want to ask.
* SPECIAL SYNTAX! You can also start a question with `## Question Here` (like a second Markdown heading).

`Answers`: one or multiple answers.

* If a single answer, it defaults to an _Open question_.
* If multiple answers, it defaults to a _ChoicePublic question_.
* You can override these defaults with the `Type` attribute.
* The order of these answers is _randomly shuffled_ when the quiz is played, so don't worry about that.

`Correct`: its value should be the correct answer(s) to the question.

* If left out, the _first_ answer listed is assumed to be the correct one.
* It accepts _multiple_ correct answers, in which case it defaults to a _ChoicePublic_ question.
* The system checks if your correct answer is actually an option (if multiple choice). It doesn't care about case or whitespace, but if you actually misspell or put in something wrong it will throw an error.

`Range`: if it's an open question where the answer is a number, this property allows setting an "error margin". Any answer within the margin is still correct. If included, it defaults to a _Range_ question. (For example, you ask, "How many people lived in the Netherlands in 2024?" and allow people to be off by 500,000 at most.) 

`Type`: force the question to be a specific type. It tries to follow this command, but it's not always possible. Possible types are ...

* `Open`: only the question is displayed, nothing else. People are free to fill in whatever answer they want.
* `ChoicePublic`: several options are displayed (labeled A, B, C, ...). People must pick the correct one. (Or multiple, if there are multiple correct answers.)
* `ChoiceSecret`: no options are displayed. People are expected to give multiple answers.
* `Range`: an open question where people must give a number. If it falls within the error margin ("range") set by the question, it's deemed correct.
* `Section`: this is not a question, but an intermediate screen with some other purpose. Mostly used to split questions into smaller sections.

`Media`: one or multiple media files to be displayed with the question. These can be images, audio, or videos. (See below. Also note that media can be inserted as an answer too; this attribute is for standalone media that relates to the question as a whole.)

`Category`: one or multiple categories to which the question belongs. (This can be used to sort by category automatically, or to have a quick check to see how varied your quiz is.)

`Author`: the name(s) of whoever made this question.

`Score`: the maximum number of points to score here.

* By default, questions simply score 1 point, and you get them all for being right.
* Use `ScoreMethod` to dictate some different, custom way of (partial) scoring.

`Comment`: any comment(s) or remark(s) about this question.

`Timer`: how much time is available for this question (in _seconds_).

* If excluded, it defaults to the global timer duration you set in the system configuration.
* If that is excluded too, there simply is no timer.

### Lists

As seen in the examples, there are _two ways_ to input a _list of values_. This works for any attribute, but you'll likely only use it for multiple choice questions.

**Inline List:** Keep all values on the same line, and split them with a `|`. 

**Block List**: Put every value on a _new line_. (If you want, the invisible "line break" that does this is now your split character.)

The two syntaxes below lead to the same output. (The question shows A, B, C and D as different choices/options.)

```
Answers => A|B|C|D
```

```
Answers =>
A
B
C
D
```

### Display Type

By default, all information that belongs to a question is displayed all the time. Sometimes, however, you only want to display something when the question is posed _or_ only when the answer is revealed.

To do this, prepend your value with a "display symbol".

* `?` before a value means it's ONLY displayed in question mode.
* `!` before a value means it's ONLY displayed in answer mode.

Below is an example of how you write a question where you display some vague media first (that people need to guess or recognize), but display the full picture upon reveal of the answer

```
Question => Who's that Pokémon!?
Media => ?image_blurred.png, !image_revealed.png
```

### Links & Media

Anything with a **recognizable extension** (e.g. `.mp3`, `.png`, ...) is treated as media to load. 

This means that media can be inserted anywhere. In a comment, in the answers to a multiple choice question, etcetera. Most likely, you'll only use it as values for the `Media` attribute.

By default, these files should be placed inside the `media` folder. Inside your `.txt` file, you merely need to type the _name_ of the file you want to show.

Many people are used to embedding images into the text, such as when working with Microsoft Word. This is _not_ how the system works. It's not even possible with plain text files! Just make sure your media file is present, and copy its exact name to your question syntax.

Similarly, anything that **starts as a link** (e.g. `http://` or `https://`) is treated as external media. It tries to load whatever is at the destination and embed it into the quiz.

Most large video/sharing websites, however, forbid loading a video externally through its regular URL. For example, for YouTube, you have to click "Embed" and then use the _embed_ URL you get from them.

You can change this behavior to simply create a _clickable link_ instead.

If you don't want the system to change _anything_ about a value (such as try to load it as an image), prepend the value with a `$` => @TODO

### Sections

It's common practice to subdivide a trivia experience into smaller rounds. This is not required. (You can simply place all questions in one bunch, or use their categories to sort them, or any other approach you want.)

I found it valuable enough to natively support sections/rounds, but not very streamlined to add loads more unique syntax for it. As such, sections are supported in two ways: **simple** and **advanced**.

For **simple sections** (only a name/marker, nothing else needed), you can use the following one-liner inspired by the Markdown syntax.

```
# Section Name
```

For more **advanced sections**, the section divider is simply a **special type of question** that follows the same syntax.

* Set `Type` to `Section`
* Use the `Question` to give a name/label to that round.
* Use the `Comment` for some unique description of the round.

The system automatically calculates the metadata of a round (number of questions, total number of points, etc) and displays them in these section overviews.

It also shuffles questions inside the same section.

Please note that location inside the text file matters. Everything _after_ this section declaration will be put inside that section. (Until a new one is declared, of course.)

## Output

Once you've written your quiz into a text file, or bought a pack from me, the system takes care of everything else. Still it's worth explaining a bit how that works, especially because you can _customize_ almost everything to your liking.

If you're eager to dive into the actual _code_, please note that this system grew organically. Doing a quiz once or twice a year, implement some new requested features that same evening, and that's that. I obviously changed over time (and hopefully improved), which means some parts of the code can mix naming conventions or use some weird approach. 

(For example, the error messages use _signals_ (`CustomEvent`s) in some enthusiastic attempt to decouple everything, but it just feels weird when absolutely nothing else in the system uses that.)

As time goes on, and I actually sell quizzes with this system and test it way more, this will be streamlined.

### Quiz States

The quiz can be in the following states, in the following order.

* START: The start screen. It displays buttons to continue with a preloaded quiz or upload your own files.
* ACTIVITY: Here you choose how you want to show the quiz.
  * Show Questions (which is the main quiz activity)
  * Show Answers
* QUIZ: All the specific questions/sections it parsed from your input.
* END: The end screen. A simple final message, and some useful buttons (like checking answers).

You can freely move back and forth between these screens.

### Hotkeys

You can move **backward** using `<` (arrow key left).

You can move **forward** using

* `>` (arrow key right)
* spacebar
* clicking anywhere

Press **A** to toggle show/hide answers. This _only_ changes the current question.

Press **M** to toggle your mode (questions/answers). This is a global setting for the entire quiz.

Press **Escape** to skip to the end of the quiz.

Press **Enter** to play/pause the selected media ( = first one listed).

Press **+** or **-** to change font size.

### The Quiz object

This framework exposes a `Quiz` class.

As such, to turn a webpage into a Quiz, use

```
const params = {}; // your unique configuration 
const quiz = new Quiz(params);
quiz.load();
```

### Configuration

Almost everything can be customized when you create your `Quiz` instance. (By setting the correct properties in the `params`, which you put into it on construction.)

Below is a list of all options, but don't be overwhelmed. They're all _optional_.

#### General

`id` (string): given to the container element of the quiz. If you want multiple quizzes on the same page (... for some reason), they need unique IDs.

`seed` (string): a quiz with the same content ( = questions) and seed, will always output the exact same thing. (If not set, every time you load the quiz, questions will be in a different order and such.)

`url` (string): by default, it assumes all your content (questions and media) is relative to the quiz location. If this is not the case, set the actual base URL of the quiz here.

`builtin` (JSON object): allows putting in the final quiz object on creation directly. No more loading/parsing needed, playable offline.

`filename` (string): the string used for automatic text file name matching. (Default is `questions`, which looks for `questions_0.txt` first.)

`filenames` (string[]): a list of filenames to use. If set, it _only_ loads these exact files and nothing else.

`fileExtensions` (string[]): a list of allowed file extensions (for media, not questions).

`subFolders` (object): custom folders where it should look for the `questions` or the `media`.

#### Interactivity

`allowInput` (boolean): if true, people can directly enter their answers into the quiz itself. This can then be used to automatically grade the answers, if desired. 

If turned on, the quiz is very _restricted_ (can't toggle on answer mode, for example). This allows letting everyone play on their own device, unsupervised, without cheating. (Or, well, without _too much_ cheating ;) You can never completely prevent it. If anyone wants to desperately find a way to ruin a fun night together, they will. Just don't invite them again.)

This mode is also useful when the quiz is used educationally / collaboratively, such as a parent and their kid(s) trying one together to learn about a topic.

#### Scores

`defaultScore` (number): if no score set, this is the default score applied to a question.

`minScore` (number): the lowest possible score for questions. (If below, the number snaps back up.) Default is 1.

`maxScore` (number): the highest possible score for questions. (If above, the number snaps back down.) Default is 5. _Yes, this was added because some people thought it was funny to abuse this and give their own questions massive points._

`hideScore` (boolean): if true, scores are not displayed.

#### Questions & Answers

`exclude` (object): any questions that have a matching _attribute-value pair_ are removed. 

For example, the code below would exclude all questions with category Music, as well as all questions with author Tiamo.

```
exclude: { category: "Music", author: "Tiamo" }
```

`include` (object): _only_ questions that have a matching _attribute-value pair_ are kept.

`groupBy` (string): takes the name of an _attribute_ (such as `Category`). If set, questions are grouped by this attribute, and only randomly shuffled _within_ their group.

`questionTypesAllowed` (string): if set, only questions of the types listed are allowed. (Others are excluded without giving an error.)

`minAnswers` (number): the minimum number of options a question should have. Default is 1. (Use to force multiple choice questions only, for example.)

`maxAnswers` (number): the maximum number of options a question can have.

`excludeSections` (boolean): if true, all section declarations are simply ignored.

`randomizeQuestions` (boolean): if false, no randomization at all will take place. (Default = true)

`randomizeSections` (boolean): if false, sections stay in the order that you input them. (Default = true)

`randomizeAnswers` (boolean): if false, answers stay in the order that you input them. (Default = true)

#### Links & Media

`loadExternalMediaAsIframe` (boolean): if true, links try to embed themselves. If false, links just become a clickable link.

`linkPrefixes` (string[]): if set, only these strings mark text as a link (if present at the start)

`mediaFormats` (string[]): if set, only these extensions mark text as media

`symbols` (ParseSymbols object): allows setting a different symbol to use when parsing the question syntax. Possible keys are `comment`, `pairing` (what separates attribute from value), `questionOnly`, `answerOnly`, `keepAsIs` (forbid parsing text further), `inlineList` (for inline lists), and `section` (short-hand for section declaration)

#### Metadata

`defaultCategory` (string): if a question has no Category set, it defaults to this

`possibleCategories` (string[]): if set, any question with a Category that isn't in this list throws an error.

`hideCategory` (boolean): if set, doesn't show categories.

`defaultAuthor` (string): if a question has no Author set, it defaults to this

`possibleAuthors` (string[]): if set, any question with an Author that isn't in this list throws an error.

`hideAuthor` (boolean): if set, doesn't show the author.

#### Theming

`theme` (QuizTheme): for loading your own custom theme. (See the _Themes / Custom Styling_ section for how to create/modify one.) If set, the default theme is NOT loaded.

`loadDefaultStyles` (boolean): true by default, which loads a very minimal set of core styles to get things looking usable.

#### UI & Usability

`showErrors` (boolean): if true, errors are shown (in red boxes at top left).

`enableInlineLists` (boolean): if true, inline lists are allowed in the question syntax.

`enableSafety` (boolean): if true, it doesn't allow you to (accidentally) reload or leave the quiz while in progress, unless you confirm your action.

`enableMouse` (boolean): if true, allows navigation by clicking and scrolling.

`enableKeys` (boolean): if true, allows navigation by keyboard

`enableUI` (boolean): if true, shows buttons for the most common actions (such as prev/next questions) at the top.

`hotkeys` (object): allows setting custom hotkeys (one or multiple per action) that override the defaults. See `QuizAction` for all possible actions to define.

`hotkeysForbidden` (string[]): any action named will simply not trigger (when pressing a connected key).

#### Timer

`defaultTimer` (number): if a question has no custom timer duration set, this is the default duration it uses. (A timer of 0 just means no timer, which is the default.)

`hideTimerGlobal` (boolean): if true, the global timer (for the entire quiz) isn't displayed.

`hideTimerQuestion` (boolean): if true, the timer on a specific question isn't displayed.

`timerStrategy` (TimerStrategy): what to do when a timer runs out.

* `nothing`: do nothing. Use when the timer is only meant as a subtle pressure but you want things to stay relaxed/manual otherwise.
* `stayButHide`: you stay on the same question, but its content is hidden.
* `autoContinue`: the quiz automatically skips to the next question. (And its timer instantly starts too.)

`allowTimersOnSections` (boolean): if true, section dividers can be timed as well. (This is disabled by default as sections are natural moments to take a breather/break.)


### Exporting

I wanted to have a single syntax and a single base system for all quizzes. This simple digital system makes it really easy to build and host quizzes, while opening many doors. 

At the same time, I actually prefer playing quizzes without any screens. I know the same is true for many others. That's why I added the ability to _export_ your quiz to other formats. 

This isn't something, however, that should clutter the main interface or workflow. Most people will never even consider this. As such, it's only available in code.

* Once a quiz is loaded, open the Inspector Console of your browser (usually `F12`).
* (Make sure you have access to your quiz object, such as by saving it on the `window`)
* Then,
  * Use `quiz.export.toEmbedded()` to get all questions as a JSON object. (Using the `builtin` property, you can embed it directly into the quiz and don't need to load the text files anymore.)
  * Use `quiz.export.toPrint()` to get all questions on one page (and nothing else), styled in such a way that you can print it. (One question = One full page.)
  * Use `quiz.export.toAnswerSheet()` to get a table with the answers to all questions filled-in. 
  * Use `quiz.export.toAnswerForm()` to get an _empty_ table, for others to write their answers.
  * Use `quiz.export.toMarkdown()` to get a Markdown string. This can be put into one of several "Markdown to Slideshow" converters (@TODO: List best option here)

When you have your result, and want it as a PDF, use the browser's Print functionality.

This area is most likely to change over time, as I refine this approach or switch to other existing frameworks.

### Themes / Custom Styling

The Quiz styles itself according to `QuizTheme` objects you put in.

* The system automatically loads some core styles and CSS properties. These are very minimal, but _not_ optional, as they're needed to make all other theming work.
* On top of that, it loads the `default` theme, which actually contains most style rules.
* If you give the Quiz any other theme, however, or turn off `loadDefaultStyles`, it _only_ load yours instead.

Creating a new theme has the following steps.

* Create a folder (`yourthemename`) inside the `themes` folder. This folder will hold all custom _assets_ for your theme, such as font files and background images.
* When creating the Quiz, create a `QuizTheme` object, and insert it at the `theme` property. 
* To connect that theme with the folder where it can find its files, set its `label` to te right name.

The following properties are available for configuration in your theme. As usual, all are optional.

* `label`: name of your theme; folder to look for assets by default. (Defaults to "unnamed-theme".)
* `folder`: a custom folder where it should look for assets. Overrides the label if set.
* `inline`: a flat string with CSS code, which gets inserted first (if set).
* `external`: the filename of an external CSS stylesheet, which is inserted second (if set).
* `fonts`: custom font files you want to load and how it should name them.
  * You can set the `body` or `heading` font.
  * These accept an object like `{ name: FONTNAME, regular: FONTFILE, bold: FONTFILE, italic: FONTFILE }`.
  * If a variant isn't set, it just defaults to the _regular_ version. Don't forget extensions of font files.
* `backgroundImages`: a list of image files that it should randomly select as backgrounds for questions.
* `colors`: an object with colorschemes. These are evenly (but randomly) distributed over the questions.
  * A color scheme has the shape `name: { light: COLOR, dark: COLOR, text: COLOR, dark: COLOR }`
  * When a value isn't set, it just falls back on the default of the core styles (e.g. text = black, bg = white)

Themes are the latest addition to this system. (When I was only using this system myself, all values and design were just baked-in, of course. Took some effort to decouple and make it more friendly to style.) They're still a bit barebones and I shall complete this documentation when their API is somewhat finalized.

_Remark_: Obviously, you can also simply style the quiz by inserting your own stylesheet in the HTML page that hosts it. Probably the most flexible and fastest way for people who really know what they're doing.