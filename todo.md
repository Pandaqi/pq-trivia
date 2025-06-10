# To-Do

## UI/USABILITY

* **CHERRYPICK:** Ticking noise for timer (on timed questions)?
* **CHERRYPICK:** Now we basically ask _you_ to make sure you don't overflow the screen (say, with 10 multiple choice answers). Is there any way to safeguard against this? Scrollbars if needed? Automatic resizing? (Make the max-width of double-view in `px` instead of `em`, to make it independent of font size?)

* Use Webshop fonts (Gloria/Lora) as default instead of Kreon?
* A favicon?? Splash image/banner?
* Auto-fade away errors? Prevent _duplicate_ (fully identical) errors from appearing?
* More unique design for section pages?
* Add touch controls (swipe left/right?) => not sure, clicking controls are a mess in such a complex UI
* When someone tries to continue without filling in their answer, make error nicer => probably highlight box itself
* Allow moving through answers on interactive anyway, and then display the REAL answer and YOUR answer side by side?
* Reconsider what to color with the unique question color!
  * Should one entire _side_ of the question be background-colored with the randomly chosen Color? => nah, probably really expensive to print, make this a non-default/core thing if wanted
* GRADING => Provide buttons to go back? **To print?**
* Any other useful buttons we might want in the UI toolbar? It's now a pretty big/constant addition for just next/prev and font +/- ...


## SETTINGS

For now, the "settings" selection is some fixed, custom code. In the long run, find a general way to "expose" ANY setting here! 
* Maybe some `QuizSetting` class that dictates how its shown, tooltip, max range, default value, etcetera
* And then I input those classes for all properties I'd want to show/allow changing

## FEATURES

* Allow injecting code/executable program (in JavaScript)? And a nice code highlighter?
* Animations?
* Think about supporting some other question types like "sort" / "match".

## CODE

* REFACTORING: We're looping through all questions a lot. We're re-writing code (such as the 2/3 steps for displaying a MEDIA node) in different places, though it's not the end of the world.
* MAYBE it's easier to create a _hierarchy_, where every top-level object is a SECTION/ROUND, and it contains its own questions. Because having everything in a flat list now is a bit annoying sometimes. (It also has major benefits, though, so not sure if this is a good switch.)
* Switch the entire nodes creation and stuff to [(Custom) Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) instead?

## CUSTOMIZATION

* Allow adding **(CSS) classes** to questions (through `.txt` syntax) to change their layout + implement some default layouts to pick immediately.
  * Also allow `[inlineCSSStyles]` syntax? Or am I really overcomplicating stuff now? 
* Allow **directly responding** to quiz change signals (in your own custom implementation), so people can do their own HTML entirely. For this to work ...
  * I'd need to explain the basic functions here (`gotoNext`, `getCurrentQuestion`)
  * I'd need to allow completely turning off the Nodes output, or sending it through a custom filter to get the markup _you_ want.