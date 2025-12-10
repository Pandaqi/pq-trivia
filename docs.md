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

> _DISCLAIMER: Some crucial parts of the system will change between major versions. The docs below are only for the latest version. It's unlikely that you can replace the framework by a much newer version willy-nilly and expect your old quiz questions to still work 100% (no tweaks needed). For example, going from v1 to v2 the system added full support for multiple languages + interface translations, which forced massive changes on input and quiz processing ;)_

## Input

### What you DON'T need to do

When I created this system, many people defaulted to doing extra work that wasn't needed (or even broke the system). 

The idea behind the Trivia system is that it _takes care of everything for you_!

You don't need to do any numbering, or formatting, or labeling yourself. Nothing of the sort. Simply create your raw questions (including answers and names of media used) in a text file, and you're done.

Below are some common examples of things I see often, but which you **shouldn't do**.

* Number your own questions
* Add a title (or _any_ other data that isn't related to the quiz) to your text file. (If you really want to add more info, use the comment syntax explained below.)
* Add returns ("line breaks") to make the text wrap or look nicer on your screen. (It assumes each individual line is a _new_ entry in a list.)
* Add weird characters or spaces to your file names. (For maximum compatibility, only use _letters_ and _numbers_, and replace spaces by something like `-`.) 
* Include your media _in the file itself_. (If you use simple text files, this is literally impossible.) For example: just throw it all in the folder called `media`, then type the name of the image/video/audio to show with the question.

### File Name & Type

The system accepts any plain text files. The extension technically doesn't matter, but I settled on `.txt` files only for simplicity.

If hosting the quiz **on a server**, it searches these text files in the `questions` folder, and expects names formatted like `questions-X`. (It checks questions-0, questions-1, and so forth until it finds nothing anymore and stops.)

Alternatively, you can simply **input the right text files** directly at the start. Just select where the files are on your local computer system, and it will find and use them.

(If you converted a quiz and added it as `builtin` data, you'll be able to simply press the Start button every next time you want to play. It does not upload/search anything anymore, but just uses the "built-in" data it already has.)

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

A question is nothing more than a list of attributes. Every attribute is formatted with an arrow (`=>`) between its _name_ and its _value_. 

For example, `Question => What is 2+2?`

Below is an example of the simplest possible question. (An _open-ended question_, relying on defaults, and most attributes are left out.)

```
Question => Which superhero is also called "Man of Steel"?
Answers => Superman
```

> The arrow was chosen because the less digitally inclined understand it too, while very unlikely to show up inside an actual question or answer. A double colon (`:`), for example, is way more likely to be part of a question and thus screw up the parsing. Be mindful of this when customizing the syntax.

Below is an example of a slightly more customized question. This one is _multiple choice_, displays a nice image as decoration, and shows whose question it is.

```
Question => Which superhero is also called "Man of Steel"?
Answers => 
Superman
Batman
Wolverine
Mandalorian
Media => man-of-steel-logo.png
Author => Tiamo
```

Below is a final example of a much more involved question, using almost everything available to us.

```
Question => Name all superheroes that were part of the Avengers in the 2012 movie.
Answers => Iron Man|Captain America|Hulk|Thor|Black Widow|Hawkeye
Type => List
Media => avengers-poster.jpg
Category => Movies | Marvel
Author => Tiamo
Comment =>
? Use their superhero names, not their real names
! Nick Fury recruits them but is no superhero himself, and Loki is not part of the Avengers.
Score => 1
```

The next section explains all possible attributes in more detail.

### Attributes

`Question`: starts a new question. The value is the specific question you want to ask.

> SPECIAL SYNTAX! You can also start a section with `# Section Here` and a question with `## Question Here` (like a first and second Markdown heading). See [Sections](#sections) for more info.

`Answers`: one or multiple answers.

* If a single answer, it defaults to an `Open` question.
* If multiple answers, it defaults to a `Choice` question.
* You can override these defaults with the `Type` attribute.
* The order of these answers is _randomly shuffled_ when the quiz is played, so you don't have to do it. (Except for question types where this doesn't make sense because the order of answers might matter; see `List` and `Sort`.)

`AnswersOrder`: if set to "keep", it will keep the answers in the order in which you input them (no matter your other settings/randomization).

`Correct`: its value should be the correct answer(s) to the question.

* If left out, the _first_ answer listed is assumed to be the correct one.
* It accepts _multiple_ correct answers, in which case it defaults to a `Choice` question.
* The system checks if your correct answer is actually an option (if multiple choice). It doesn't care about letter case or whitespace, but if you actually misspell or put in something wrong it will throw an error.

`Type`: force the question to be a specific type. It tries to follow this command, but it's not always possible. Possible types are ...

* `Open`: only the question is displayed, nothing else. People are free to fill in whatever answer they want.
* `Choice` ("Multiple Choice"): several options are displayed (labeled A, B, C, ...). People must pick the correct one. (Or multiple, if there are multiple correct answers.)
* `List` ("Multiple Answer"): no options are displayed. People are expected to give multiple answers.
* `Range`: an open question where people must give a number. If it falls within the error margin ("range") set by the question, it's deemed correct.
* `Sort`: provide multiple answers, they're all shown (in a random order) and people have to sort them into the correct order.
* `Custom`: a completely custom question that does nothing for you by default, so you can fill it in however you like
* `Section`: this is not a question, but an intermediate screen with some other purpose. Mostly used to split questions into smaller "rounds".

`Range` (_Only applies to `Range` questions_): this property sets an "error margin" around the correct (numeric) answer. Any answer within the margin is still correct. If included, it defaults to a _Range_ question. (For example, you ask, "How many people lived in the Netherlands in 2024?" and allow people to be off by 500,000 at most.) 

`Media`: one or multiple media files to be displayed with the question. These can be images, audio, or videos. (See below. Also note that media can be inserted as an answer too; this attribute is for standalone media that relates to the question as a whole.)

`MediaOrder`: if set to `keep`, it will keep the media in the order you input them (no matter your other settings/randomization).

`Category`: one or multiple categories to which the question belongs. (This can be used to sort by category automatically, or to have a quick check to see how varied your quiz is.)

`Author`: the name(s) of whoever made this question.

`Score`: the maximum number of points to score here.

* By default, questions simply score 1 point, and you get them all for being right.
* Use `ScoreMethod` to dictate some different, custom way of (partial) scoring. This is just a piece of text that you need to write yourself; the system can't "automatically" execute your creative custom scoring idea.

`Comment`: any comment(s) or remark(s) about this question.

`Secret` (_Only applies to Sections_): A secret common "theme" for this section/round. It reveals this theme when the section starts on _answer mode_.

* You can also use the `addSecretThemeQuestions` parameter on Quiz to automatically insert a question at the end of each round asking what the theme was (for 1 point).
* I created this "quick" way to support secrets for individual rounds, because that's most common and would be more annoying to do manually each time. But if you want a single "secret theme" for _the entire quiz_ ... just invent one behind the scenes (and manually add a question about the secret at the very end) :)

`Hints`: One or more "hints". These are hidden by default, but can be revealed in the moment if desired.  

`Sources`: one or more "sources". This is meant for sourcing the info in your questions, or the media used, and perhaps provide a way to "learn more". These appear in a small font below all the other information. (Be mindful of not giving away the answer to your question by listing your sources.)

`Timer`: how much time is available for this question (in _seconds_).

* If excluded, it defaults to the global timer duration you set in the system configuration.
* If that is excluded too, there simply is no timer.

`ID`: a _unique_ identifier/name for this question. You'd only need this if you intend to reference this specific question from another question, or if you want to support multiple languages. For example, you might want to say "question A must appear _before_ question B in the order". Speaking of that ...

`PlaceAt` (number) (_Only applies to Sections_): forcibly places this section at that location. For example, `PlaceAt => 1` will try and force this section to be the very first you encounter.

`PlaceBefore` (QuestionID): give the ID of another question, and it will place this question before it. (It _does not_ necessarily place it _directly_ before it.)

`PlaceAfter` (QuestionID): give the ID of another question, and it will place this question after it. (It _does not_ necessarily place it _directly_ after it.)

> Please note that it's easy to accidentally add "constraints" to question order that are unsolvable. In which case the system tries its best, but there are no guarantees. I focused a lot on a very robust sorting/shuffling system for the latest version (as the order of questions can be very important in educational quizzes, for example), but ... always check if the end result is what you wanted.

`FormatText` (boolean): you can set this to false on specific questions if you don't want their text to be run through the (Markdown-like) formatter. Not sure why you'd do this, but hey, it's there.

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
Media => ?image_blurred.png | !image_revealed.png
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

For **simple sections** (only a name/marker, nothing else needed), you can use the following one-liner (`#`) inspired by the Markdown syntax.

```
# Section Name
```

Similarly, you can then mark new questions inside the round with a double pound (`##`).

```
# Section Name

## What is green?
Answers => A color

## And what is blue?
Answers => Another color
```

For more **advanced sections**, the section divider is simply a **special type of question** that follows the same syntax.

* Set `Type` to `Section`
* Use the `Question` to give a name/label to that round.
* Use the `Comment` for some unique description of the round.

The system automatically calculates the metadata of a round (number of questions, total number of points, etc) and displays them in these section overviews.

It also shuffles questions inside the same section.

Please note that location inside the text file matters. Everything _after_ this section declaration will be put inside that section, until a new one is declared. 

You _can_ ignore all this. You can assign no sections at all, or give a custom `Section => blabla` to questions, and type them in the text file in a random order. The system will figure it out for you and group questions by section, without duplicate sections. (It will _not_ insert an actual "new section screen", unless you add `addMissingSectionScreens: true` to the quiz parameters.)

But for your sanity and organization, it's best to just group questions by section and let the system automatically assign from input order ;)

## Output

Once you've written your quiz into a text file, or bought a pack from my online store, the system takes care of everything else. Still, it's worth explaining a bit how that works, especially because you can _customize_ almost everything to your liking.

If you're looking to dive into the _code_ behind it all, please note the following. The original system started as a tiny thing and grew organically. V1 was a mess of different naming conventions, spaghetti code, and technical debt that accrued over 5 years of barely working on this. With v2 of the system, I did a massive rewrite and I actually dare say the code is quite clean and consistent now.

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
* clicking near the left/right edge of the screen (as long as `enableMouse` is true)

Press **A** to toggle show/hide answers. This _only_ changes the current question.

Press **H** to toggle show/hide hints. This _only_ changes the current question, and obviously only applies if you added one or more hints yourself.

Press **M** to toggle your mode (questions/answers). This is a global setting for the entire quiz.

Press **Escape** to skip to the end of the quiz.

Press **L** to switch to the next language on the spot. (Not sure when anyone would ever use it, but the system can switch languages dynamically like that. Which is nice, I guess.)

Press **Enter** to play/pause the selected media ( = first one listed).

Press **+** or **-** to change font size. This is a very easy way to _resize_ the quiz to fit every screen and make sure everyone can read it. (NOTE! You can also **click** all images to make them fullscreen, if they're ever too small. And then click the popup again to remove it.)

### Text Formatting

Like with the other parts of the system, we stole our formatting syntax from _Markdown_. It's supported basically anywhere in the system where text could be shown.

* Use `[blank]` to insert a "blank" in the question (the answer is the thing to fill in), which is displayed as "___" by default. (You can use your own symbols for blanks if you want. This is simply a nice thing we decided to support. Because, as you see below, actually typing "___" would be interpreted as _italic text_ instead.)
* Use `**texthere**` for **bold text**.
* Use `_texthere_` for _italic text_.
* Use ``codehere`` for `code`.
* Use `__texthere__` for <u>underlined text</u>.
* Use `~texthere~` for ~~~struck-through text~~~
* Use `[Name](Url)` to insert a [link](#).
* Use `[color=COLOR]texthere[/color]` to recolor text to COLOR. Common color names will work (_orange, red, ..._). Otherwise, learn about CSS Hex Colors and put one of those in.
* Use `[size=SIZE]texthere[/size]` to change font size to SIZE. Please note that you need to provide a _unit_, and the most common one is `px` for pixels, or `%` for a percentage of the default font size. So, to increase the font, you might say `[size=150%]BIG TEXT[/size]`
* Use `^[texthere]` for a superscript, like E=mc<sup>2</sup>
* Use `_[texthere]` for a subscript, like x<sub>2</sub>.

If these don't suit you, then you can also directly write HTML tags. Do note, however, this isn't guaranteed to work or look like you wanted, due to the constraints and general styling/node hierarchy of the system.

You can **turn this off completely** with the `disableTextFormatting:true` parameter in the Quiz configuration.

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

> **All properties default to false / 0 / empty string / empty list.** Setting the thing to _some value_ is always an action you do on purpose; the system doesn't surprise you by toggling any of these switches to true by default.

#### General

`id` (string): given to the container element of the quiz. If you want multiple quizzes on the same page (... for some reason), they need unique IDs.

`seed` (string): a quiz with the same content ( = questions) and seed, will always output the exact same thing. (If not set, every time you load the quiz, questions will be in a different order and such.)

`url` (string): by default, it assumes all your content (questions and media) is relative to the quiz location. If this is not the case, set the actual base URL of the quiz here.

`builtin` (JSON object): allows putting in the final quiz object on creation directly. No more loading/parsing needed, playable offline.

`filename` (string): the string used for automatic text file name matching. (Default is `questions`, which looks for `questions_0.txt` first.)

`filenames` (string[]): a list of filenames to use. If set, it _only_ loads these exact files and nothing else.

`fileExtensions` (string[]): a list of allowed file extensions (for media, not questions).

`subFolderQuestions` / `subFolderMedia` / `subFolderTheme`: custom folders where it should look for the respective files.

#### Settings

`settings` (QuizSetting[]): list of custom settings you created yourself, which will be displayed and used within the system. See [Custom Settings](#custom-settings).

`hideDefaultSettings` (boolean): by default, it adds a few sensible default settings (changing seeds + rounds to play). This removes that.

#### Language

Supporting multiple languages is a multi-step process. See [Multi-Language](#multi-language). At this top level, you don't really have much to configure. In most cases, you'll obviously just use a single language and you can ignore this functionality exists entirely.

`languageDefault` (string): a language code/name for your default language.

`languages` (string[]): if set, it will automatically trigger an error if you add any question that isn't marked as one of these languages. (If not set, it populates this array with all unique languages it finds in your input data.)

`syncPropertiesWithTranslations` (boolean): if true, questions in other languages will look at the "root language" and copy their properties _if they didn't set anything themselves_. Useful if you only want to set properties once on the main translation (e.g. score, media to show) and have everything else automatically use the same stuff. As soon as a question has its own value for a property, it will just keep that and ignore the root language. REMARK: This is off by default because it's very powerful but not that necessary for most people.

#### Interactivity

`allowInput` (boolean): if true, people can directly enter their answers into the quiz itself. This can then be used to automatically grade the answers, if desired. 

If turned on, the quiz is very _restricted_ (can't toggle on answer mode, for example). This allows letting everyone play on their own device, unsupervised, without cheating. 

Or, well, without _too much_ cheating ;) You can never completely prevent it. If anyone wants to desperately find a way to ruin a fun night together, they will. Just don't invite them again.

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

`keepQuestionOrder` (boolean): if true, no randomization at all will take place. 

`keepSectionOrder` (boolean): if true, sections stay in the order that you input them. 

`keepAnswerOrder` (boolean): if true, answers stay in the order that you input them.

`randomizeMedia` (boolean): if true, the order of media items will be randomized. (Default = false; media, like all other properties, just appears in the order you input it.)

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

`showPropertiesWithoutDiversity` (boolean): if false, properties that only have the same (default) values are not shown to minimize the interface clutter. (Example: all questions have the same author or no author.) 

`addSecretThemeQuestions` (boolean): if a section has a `secret` theme attached, this will automatically inject a question at the _end_ of that round. An open question that asks what the theme was, for 1 point.

#### Theming

`theme` (QuizTheme[]): for loading your own custom theme. (See the _Themes / Custom Styling_ section for how to create/modify one.) If set, the default theme is NOT loaded. See [Custom Themes](#custom-themes).

`themeDisabled` (boolean): if true, turns off all theming (fonts/colors/background images). You can also turn off/on all theming in the settings after the quiz has been loaded.

`hideDefaultStyles` (boolean): if true, does NOT load the very minimal set of core styles to get things looking usable.

#### UI & Usability

`toolbar` (QuizAction[]): a list of buttons that you want to have in your toolbar. (Defined by their `QuizAction`. That is, the specific thing that they _do_ when you press it.) See the code for all possible QuizActions. If empty, uses the default toolbar (PREV/NEXT and FONT SIZE +/-).

`hideErrors` (boolean): if true, errors are NOT shown (in red boxes at top left).

`forbidInlineLists` (boolean): if true, inline lists are MOT allowed in the question syntax.

`enableSafety` (boolean): if true, it doesn't allow you to (accidentally) reload or leave the quiz while in progress, unless you confirm your action.

`enableMouse` (boolean): if true, allows navigation by clicking and scrolling.

`disableKeys` (boolean): if true, disables hotkeys / navigation by keyboard

`disableUI` (boolean): if true, removes the toolbar at the bottom. (The one that shows buttons for the most common actions.)

`hotkeys` (object): allows setting custom hotkeys (one or multiple per action) that override the defaults. See `QuizAction` for all possible actions to define.

`hotkeysForbidden` (string[]): any action named will simply not trigger (when pressing a connected key).

`disableTextFormatting` (boolean): if true, it doesn't check for _any_ of the patterns mentioned in the `Text Formatting` section, and just leaves text as-is.

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

By default, buttons are added to the _settings_ screen for all these exports. You can also simply grab your quiz object and call the functions manually after loading the quiz, as follows.

* Once a quiz is loaded, open the Inspector Console of your browser (usually `F12`).
* (Make sure you have access to your quiz object, such as by saving it on the `window`)
* Then,
  * Use `quiz.export.toEmbedded()` to get all questions as a JSON object. (Using the `builtin` property, you can embed it directly into the quiz and don't need to load the text files anymore.)
  * Use `quiz.export.toPrintQuestions()` to get all questions on one page (and nothing else), styled in such a way that you can print it. 
    * You'll see all questions overlapping on your screen. This may look funny, but this is necessary such that when you _print_ it, everything is where it should be.
    * One question = One full page. By default, backgrounds are removed to save ink and reduce file size.
    * On large quizzes, wait a few seconds until everything has loaded.
  * Use `quiz.export.toPrintAnswers()` for the same thing, but now you have a PDF where all ANSWERS are revealed for each question.
  * Use `quiz.export.toAnswerSheet()` to get a table with the answers to all questions filled-in. 
  * Use `quiz.export.toAnswerForm()` to get an _empty_ table, for others to write their answers.
* Also, you can use the shortcut `quiz.export.toGrade()` to immediately get the graded results of the quiz (even if not playing interactively).

When you have your result, and want it as a PDF, use the browser's Print functionality. You can also simply click the button on the page that does this for you.

> _Remark:_ The Embedded exporter will try to "compress" the quiz as much as possible, leaving out any properties that it doesn't need to save (such as default values). This saves a lot of space, I can tell you, especially on huge quizzes in multiple languages. If this causes issues, let me know, as I haven't been able to test whether this compression is too aggressive or not.

> _Remark:_ In old versions, exporting the quiz "destroyed" the current instance. You'd need to reload the page and load your questions again afterwards. Not great, I admit, but I had never expected to create exporters at all when this system just started. In the latest version, this is fixed, and you can export all you want and still stay within the page/quiz!

### Custom Themes

The Quiz styles itself according to `QuizTheme` objects you put in.

* The system automatically loads some core styles and CSS properties. These are very minimal, but _not_ optional, as they're needed to make all other theming work.
* On top of that, it loads the `default` theme, which actually contains most style rules.
* If you give the Quiz any other theme, however, or turn off `loadDefaultStyles`, it _only_ loadz yours instead.

Creating a new theme has the following steps.

* Create a folder (`yourthemename`) inside the `themes` folder. This folder will hold all custom _assets_ for your theme, such as font files and background images.
* When creating the Quiz, create a `QuizTheme` object, and insert it at the `theme` property. 
* To connect that theme with the folder where it can find its files, set its `label` to the right name.

The following properties are available for configuration in your theme. As usual, all are optional.

* `label` (string): name of your theme; folder to look for assets by default. (Defaults to "unnamed-theme".)
* `folder` (string): a custom folder where it should look for assets. Overrides the label if set.
* `inline` (string): a flat string with CSS code, which gets inserted first (if set).
* `external` (string): the filename of an external CSS stylesheet, which is inserted second (if set).
* `fonts`: custom font files you want to load and how it should name them.
  * You can set the `body` or `heading` font.
  * These accept an object like `{ name: FONTNAME, regular: FONTFILE, bold: FONTFILE, italic: FONTFILE, bold_italic: FONTFILE }`.
  * If a variant isn't set, it just defaults to the _regular_ version. Don't forget extensions of font files.
* `backgroundImages`: a list of image files that it should randomly select as backgrounds for questions.
* `colors`: an object with colorschemes. These are evenly (but randomly) distributed over the questions.
  * A color scheme has the shape `name: { light: COLOR, dark: COLOR, text: COLOR, dark: COLOR }`
  * When a value isn't set, it just falls back on the default of the core styles (e.g. text = black, bg = white)
* `boldHeadings` (boolean): a very common way to make the questions big and stand out is to make them bold by default. If you want that, set this to true. (Otherwise, all "headings"---questions, sections, etcetera---will just use regular weight of the "heading" font.)

Themes are the latest addition to this system. (When I was only using this system myself, all values and design were just baked-in, of course. Took some effort to decouple and make it more friendly to style.) They're still a bit barebones and I shall complete this documentation when their API is somewhat finalized.

_Remark_: Obviously, you can also simply style the quiz by inserting your own stylesheet in the HTML page that hosts it. Probably the most flexible and fastest way for people who really know what they're doing.

### Custom Settings

The system also exposes a `QuizSetting` object. By adding a list of these to the `settings:` parameter (of Quiz), you can add your own custom settings that players can access and modify.

The possible parameters are ...

* `type`: "button", "text" or "checkbox"
* `label`: the name displayed next to it, identifying what it is
* `input`: a _function_ that is triggered when the input is changed / the button is clicked. It gives you two arguments to do with as you please: `elem` (the element that was changed/clicked), and `quiz`.
* `placeholder`: what to display when nothing has been input yet.
* `value`: the default value to fill in

Each parameter can also accept a _function_ (taking the `quiz` as parameter), instead of a fixed string, for even more custom settings.

### Multi-Language

The "problem" to solve, with multiple languages, is how to "connect" the same question through multiple languages. How to tell the system that a certain question is the same one as another, even if their content is completely different ... because they're in different languages.

I decided to support two ways to do this.

**Method 1: Give both translations the same ID, but mark them as different languages.**

```
Question => Wanneer was de waternoodsramp?
ID => north-sea-flood
Language => NL
Answers => 1953

Question => When did the North Sea Flood happen in the Netherlands?
ID => north-sea-flood
Language => EN
Answers => 1953
```

The system basically does the following: "oh I need to display this ID" -> "oh it needs to be in that language" -> "let's find the question with that language and that ID -> bingo!"

In many cases, however, it's cleaner to _split_ translations. Put each different "translation" of the quiz into its own _file_.

**Method 2: Create files ending in `languageCode.extension`. Make sure all questions are in the same order. Upload them all at once.**

The system will look at the filename and see "oh, these questions belong to language `languageCode`". Then, assuming the order of questions is identical, it can match every question with its translations in the other files.

If you use this, the system allows you to pick your language at the start. You can also press `L` to cycle through all the different languages loaded on demand.

_Remark: This was the latest feature to be added to the system. It's hard to code well and not something that's typically stress-tested a lot. If you use it, and find issues, please let me know._

You can also **translate the system/UI**. To do so, 

* Supply a dictionary with your translations to the `translations` parameter on Quiz.
* Set the `languageDefault` to the language code you chose.
* (Optional: set the questions to the same language code too.)

For example,

```
new Quiz({
  translations:
  {
    nl:
    {
      "question-open-answer-type": "Dit is een open vraag!",
      "settings-heading": "Instellingen"
    }
  }
})
```

See the `translations/en.ts` folder of the source for the many (many) keys that the system automatically "translates" into your current language. The framework only supports `en` (English) and `nl` (Dutch) by default, as those are the only two languages in which I'm fluent. **If you want to help translate the interface to other languages, I'd be very grateful.** Send your final JS object/file with all translations to me (+ language code) and I'll include it.

