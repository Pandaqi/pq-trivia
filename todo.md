# To-Do

## Multi-Language Implementation

* If multiple languages loaded, add a Language picker to the Settings. Or directly on the Start Screen?
* => In the long run, might also want to support translations for the _interface_ and all the _default texts_.
  * Create a "multilanguage" or "i18n" folder?
  * Allow players to input a dictionary of "ui-key" -> how to translate in that language.
  * All UI will now run through that translator first. (Which probably requires adding quiz/params reference to a few things)



* **CHERRYPICK:** Cleaner media file path handling -> so that it only exports the _original path_ and there's no trickery that can break at any time.   => It feels better if the _full path_ is created _at runtime_. (So the original path remains saved, we just need a reference to the params/loader then)


## UI/USABILITY

* **CHERRYPICK:** Ticking noise for timer (on timed questions)? (Customizable by user in settings too? Is this part of _theme_? Feels most clean ...)

* A favicon?? Splash image/banner (for the whole quiz, displayed on startup)?
* Auto-fade away errors? Prevent _duplicate_ (fully identical) errors from appearing?
* More unique design for section pages?
* Add touch controls (swipe left/right?) => not sure, clicking controls are a mess in such a complex UI
  * A SWIPE is more useful, or a click on the EDGE (left/right) of the screen.
* When someone tries to continue without filling in their answer, make error nicer => probably highlight box itself
* Allow moving through answers on interactive anyway, and then display the REAL answer and YOUR answer side by side?
  * Just feel like there's no space for this, and the feature isn't important to have all that extra baggage in the code.
* Allow alternative "default templates/layouts" for questions? (Determining how exactly they're styled and laid out?) => For example, could one entire _side_ of the question be background-colored with the randomly chosen Color?
* GRADING => Provide buttons to go back? **To print?**
* Any other useful buttons we might want in the UI toolbar? It's now a pretty big/constant addition for just next/prev and font +/- ...
  * On the other hand, in practice those are the buttons you really like to use a lot, and the others are far less important.
  * Maybe something like "media fullscreen" or "media play/stop"? Or the skip section forward/backward thing?
  * Maybe make this CUSTOMIZABLE / MODULAR so people can choose for themselves?
* Make settings look prettier/more consistent.

## MAJOR REWRITE (probs v2.0)

REFACTORING: We're re-writing code (such as the 2/3 steps for displaying a MEDIA node) in different places, though it's not the end of the world.

When we do this, a lot of code cleanup would be nice too. Lots of duplicate code/params setting and passing when creating answer/media nodes, also when exporting to answer sheet/form.

IMPROVEMENT: More premium support for _grading_ and _input_ -> for using it in an actual traditional classroom setting, even if I don't _want_ people to do that. GRADING/INPUT IS PROBABLY COMPLETELY BROKEN AT THIS POINT.


## FEATURES

* Allow injecting code/executable program (in JavaScript)? And a nice code highlighter?
* Animations?
* A "match" question type? (You get _two rows of things_, and must match stuff from one side to the other side.)
* Switch the entire nodes creation and stuff to [(Custom) Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) instead?

## CUSTOMIZATION

* Allow adding **(CSS) classes** to questions (through `.txt` syntax) to change their layout + implement some default layouts to pick immediately.
  * Also allow `[inlineCSSStyles]` syntax? Or am I really overcomplicating stuff now? 
* Allow **directly responding** to quiz change signals (in your own custom implementation), so people can do their own HTML entirely. For this to work ...
  * I'd need to explain the basic functions here (`gotoNext`, `getCurrentQuestion`)
  * I'd need to allow completely turning off the Nodes output, or sending it through a custom filter to get the markup _you_ want.