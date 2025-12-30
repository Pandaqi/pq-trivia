# To-Do

## NEEDS FURTHER TESTING

* Constraint Solving -> PlaceBefore, PlaceAfter, PlaceAt
* Other toolbar buttons (besides the default)
* Setting language on questions _directly/manually_.
* Check icons, banner image, and other styling for simplication/improvement.



## UI/USABILITY

* LIGHT/DARK MODE TOGGLE (in Settings)
* Ticking noise for timer (on timed questions)? (Customizable by user in settings too? Is this part of _theme_? Feels most clean ...)
* Auto-fade away errors? Prevent _duplicate_ (fully identical) errors from appearing? Nicer-looking error messages in the first place?
  * Perhaps a few more possible errors that would like to have a visible message (instead of just in developer console).
  * **Copy design from PQ-ESCAPE**, add as much error feedback as possible.
* More unique design for section pages? (Color inversion? White text on black background? Would have to be turned off when printing then ...)
* When someone tries to continue without filling in their answer, make error nicer => probably highlight box itself
* Allow moving through answers on interactive anyway, and then display the REAL answer and YOUR answer side by side?
  * Just feel like there's no space for this, and the feature isn't important enough to have all that extra baggage in the code.
* Allow alternative "default templates/layouts" for questions? (Determining how exactly they're styled and laid out?) => For example, could one entire _side_ of the question be background-colored with the randomly chosen Color?
* Allow creating "START" and "END" questions (like PQ-ESCAPE)? To customize a starting screen and end screen for the whole quiz, while keeping syntax completely consistent?


## FEATURES

* Allow injecting code/executable program (in JavaScript)? And a nice code highlighter?
* Animations?
* A "match" question type? (You get _two rows of things_, and must match stuff from one side to the other side.)
* Switch the entire nodes creation and stuff to [(Custom) Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) instead?
* "Unlockable" questions/rounds? -> Only if players have this one right/wrong, do more questions appear about that?
  * I can see use cases for this, but not many.
  * Also, the current system is anchored on the idea of "prepare the whole quiz in advance, then play through it" -> allowing dynamic changes to the whole thing (while playing) would require a complete rework of the entire core

## CUSTOMIZATION

* Allow adding **(CSS) classes** to questions (through `.txt` syntax) to change their layout + implement some default layouts to pick immediately.
  * Also allow `[inlineCSSStyles]` syntax? Or am I really overcomplicating stuff now? 
* Allow **directly responding** to quiz change signals (in your own custom implementation), so people can do their own HTML entirely. For this to work ...
  * I'd need to explain the basic functions here (`gotoNext`, `getCurrentQuestion`)
  * I'd need to allow completely turning off the Nodes output, or sending it through a custom filter to get the markup _you_ want.

## DISCARDED

* Allow language switching on load screen already? => Can't be done, as there's nothing loaded yet, so the different possible languages aren't even known yet. To make this possible, I would need to input "possible languages" myself manually for each quiz, and only to "refresh" the UI so the load buttons are in the right language.
* Background music? (Would have to include turning on/off and controlling volume ... not sure what this adds. People can just play their own background music if they want / double-click an audio file.)