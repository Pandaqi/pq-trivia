# To-Do

## TECH STACK

Use `bun` to build this library into `dist` from now on. (Move older versions into some other folder so people can still find them/grab them if they are on an olrder version. This new version would be V3.) It can also type check, fmt, lint, etc.

Currently it's just raw DOM (HTML/CSS/JS). Investigate two things:

- Switch to using Preact or Svelte or similar?
- Switch the entire nodes creation and stuff to [(Custom) Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) instead?

Pick the best option and plan for that migration.

## MORE CUSTOMIZATION

- Allow adding **(CSS) classes** to questions (through `.txt`, Trivia Syntax) to change their layout. (These classes would then be present in the stylesheet of the theme you loaded.)
  - Implement some default layouts to pick immediately.
  - One obvious thing would be an easy way to change the entire background color of a question/section
  - There should be some default option about background color being removed (or not) on prints---you generally don't want to waste the ink on that.
  - ALSO: allow typical Markdown `[inlineCSSStyles]` syntax. For example, `[class="blabla"]TEXT[/class]` will render that piece of text with that class, or even `[style="color:red;"]SOMETHING HERE[/style]` will apply inline CSS styles.
- Allow _completely_ turning off the default output (that renders quiz screens with nodes and stuff), returning just flat text inside flat nodes with consistent class names. So people can override/restyle how the quiz is presented even better.
  - This is connected to my "PUBLIC API" point. Someone should be able to do `quiz.onQuestionLoad = callbackFunction`, and their custom callbackFunction receives all info it needs and becomes responsible for drawing the whole quiz however you like.
  - So, in essence, the current way of displaying things is just the "default callback function" for that part.
  - Example of an alternative layout: one where the left half has this bright background color, and the right half does not (or vice versa). Though maybe this should be supported at the core with the default layouts ... alternative layouts likely will be _really_ alternative and then the defaults don't support that.

## PUBLIC API

- Expose a nice, clean, complete public API surface for this system.
- It would allow people to read/change/respond to what the system is doing with their own code / wrapper / extra script they wrote around this library.
  - Example: `quiz.gotoNext()` to immediately go to the next question
  - Example: `quiz.getCurrentQuestion()` to get the Question data of the current question.
  - Example: the quiz emits a nice basic _signal_ when it changes questions or something else happens, so your own code can respond to that.

## CODE ARCHITECTURE

It's a bit too class-based and big-object based now.

- Make it as modular as possible. Only pure functions, no side-effects, loose coupling.
- So you only import exactly what you need and nothing more.
- The general idea is: dependencies only move _one way_. Parent files may use and depend on files below them, but files at a lower layer may never import or depend on anything at a higher layer.

EXAMPLE: Someone might only want to use the _parser / question database_ logic of the system, but not actually display anything (because they wrote their custom visualizer, for example). That should be possible. And it should mean a bundle that does NOT include all the stuff they did not need.

A quiz can already be quite heavy because of the massive number of questions + media. It is of utmost importance that this library stays as lean, lightweight, and fast as possible, at all times.

## ANIMATIONS

- Add a large range of animations for switching between screens, revealing elements, revealing answers, etcetera.
  - Especially "transitions" are a big part of this.
  - We should have a really strong wide library of effects to play with, but without bloating bundles for people who don't actually use any of it. (Hence my "Code Architecture" notes.)
- Use a few of them by default in the basic settings.
- Others can be turned on/used as needed, either by defining them in the Trivia Syntax (`.txt` file), through a custom theme, or through code (public API).

## BETTER DEFAULT STYLING

- The current default look is a bit bland and mediocre. Keep it neutral and lightweight, but make it look more professional and accessible. Keep generous white space and simplicity---most quizzes are styled with custom themes anyway. So lay a really strong _foundation_ that other themes can build on top of.
- ERRORS: Make them look much nicer and friendlier, centered at the top of the page (enough padding around it)
  - Automatically fade away after some time.
  - Prevent duplicate errors from appearing (more than once)
  - Perhaps a few more possible errors would like to have a clear visible message (instead of silence or just appearing in console)
- More unique design for section pages? (Color inversion? Something else?)

## INTERACTIVE MODE

The system has an interactive mode that turns the quiz into more of a test. Someone (maybe a student) can sit down, work through it, and directly input their answers at each stage.

- This is half-baked too. Make sure we fully support taking any quiz "interactively"---giving answers in place---and getting a nice grade/results page at the end. More robust code and checks to ensure nothing goes wrong here.=
- STYLING: When someone tries to continue without filling in their answer, make error nicer => probably highlight box itself
- Allow moving through answers on interactive anyway, and then display the REAL answer and YOUR answer side by side?
  - Maybe an option in settings in case you don't want this / want to allow this?

The biggest stretch here is to allow Interactive play _for everyone_ (>1 person). Similar to websites like Kahoots,

- Players can "connect" with the quiz on their phone. (Enter code / visit link / scan QR code / make it easy.)
- Each question mirrors itself (or only the relevant parts, because phones have less space) to their device.
- They can immediately give their answer (write it, tap multiple choice option, etcetera).
- All of this is sent back and stored in the main quiz

This is possible with a static ("offline") system by using something like [Trystero](https://github.com/dmotz/trystero). (As long as someone shows the quiz on a big screen, and others have the quiz file / web page on their phone, this works fine)

This _does_ add a pretty big dependency. So make an extra build option to decide if you do or don't want to include this. (If not included, then this entire option obviously isn't present in the quiz itself, to pevent people wondering why it doesn't work.)

## FEATURES

- Ticking noise for timer (on timed questions)? (Customizable by user in settings too? Is this part of _theme_? Feels most clean ...)
- The toolbar system is half-baked: move it fully to a kind of "quick access" or "pin button into toolbar" system where you can easily move tools in or out the permanent toolbar (below all questions) through settings/config.
- Allow displaying code in questions (typical markdown) syntax + include an optional code highlighter to make that look prettier.
- Allow injecting code/executable program (in JavaScript) into questions. (So that question becomes interactive or does something special.)
- NEW "QUESTION" TYPES (Trivia Syntax): Allow creating "START" and "END" questions (like my PQ-ESCAPE).
  - These are not actually questions and don't show up in the quiz themselves.
  - They customize/add a custom _starting screen_ and _end screen_ for the whole quiz (with clean consistent syntax, like all other questions).
- NEW QUESTION TYPE: MATCH.
  - You get _two rows of things_
  - And must match stuff from one side to the other side.
- "Unlockable" questions/rounds? -> Only if players have this one right/wrong, do more questions appear about that?
  - I can see use cases for this, but not many.
  - Also, the current system is anchored on the idea of "prepare the whole quiz in advance, then play through it" -> allowing dynamic changes to the whole thing (while playing) would require a complete rework of the entire core. But if we're reworking it anyway, then sure, this is a nice feature.
- Make the Github page look more complete and ready-to-use to get more visitors/users.
  - Add those nice little badges that lots of repositories have.
  - Add a CI/CD integration (Github Actions) that automatically tags something as a new version (if `package.json` version changed), and if so, checks and rebuilds as a proper release automatically.
  - Add a few more images + links to example quizzes + starting templates?
  - Docs should not be one massive file but a proper `docs` folder with small files inside, one per topic.

## NEEDS FURTHER TESTING

- Constraint Solving -> PlaceBefore, PlaceAfter, PlaceAt
- Other toolbar buttons (besides the default)
- Setting language on questions _directly/manually_.
- Check icons, banner image, and other styling for simplication/improvement.

## DISCARDED / DON'T DO

- Allow language switching on load screen already? => Can't be done, as there's nothing loaded yet, so the different possible languages aren't even known yet. To make this possible, I would need to input "possible languages" myself manually for each quiz, and only to "refresh" the UI so the load buttons are in the right language.
- Background music? (Would have to include turning on/off and controlling volume ... not sure what this adds. People can just play their own background music if they want / double-click an audio file.)
