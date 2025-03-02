# To-Do

## NEW STUFF TO TEST 

Implemented all this, didn't get chance to test yet.

* Timers
* Whether questions display correctly (of all types, both in Q mode and in A mode)
* Uploading custom files + Built-in files
  * All the new screens stuff in general
* All exporters
  * Make exported tables look much nicer and more polished.
* Inputting answers + grading
* Theming
  * CHECK CORE CSS: I want quizzes to look and work fine even _without_ my default theme included everywhere. (In other words, move stuff from my Default theme back to Core when sensible.)
  * (The restriction of "no overflow" on entire slides/questions is lifted when on a phone/viewport is too small in width?)

## UI/USABILITY

* Display the question timer as a _bar_ that shrinks instead
* When clicking/unclicking a multiple choice answer (on interactive mode), actually HIGHLIGHT/VISUALLY CHANGE IT to give feedback 
* More unique design for section pages
* Add touch controls (swipe left/right?)
* When someone tries to continue without filling in their answer, highlight that box/make error nicer
* Allow moving through answers on interactive anyway, and then display the REAL answer and YOUR answer side by side?

## FEATURES

* Allow injecting code/executable program (in JavaScript)? And a nice code highlighter?
* Animations?

## CODE

* MAYBE it's easier to create a _hierarchy_, where every top-level object is a SECTION/ROUND, and it contains its own questions. Because having everything in a flat list now is a bit annoying sometimes.
* Switch the entire nodes creation and stuff to [(Custom) Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) instead?

## CUSTOMIZATION

* Allow adding **(CSS) classes** to questions (through `.txt` syntax) to change their layout + implement some default layouts to pick immediately.
* Allow **directly responding** to quiz changes, so people can do their own HTML entirely. For this to work ...
  * I'd need to explain the basic functions here (`gotoNext`, `getCurrentQuestion`)
  * I'd need to allow completely turning off the Nodes output, or sending it through a custom filter to get the markup _you_ want.