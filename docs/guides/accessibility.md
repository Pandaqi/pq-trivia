# Accessibility

Target: WCAG 2.2 AA on Paper. Automated checks are cheap. The manual pass is the
honest one.

## Built in

- Landmarks, one `<h1>` per screen, lists for answers, tables for results.
- Focus moves to the heading after navigation.
- `:focus-visible` everywhere. `Escape` closes overlays.
- Single-letter shortcuts are off while you type.
- Live regions announce question changes and timer milestones at 30, 10 and 0
  seconds, once each.
- Answers are buttons with `aria-pressed`, not coloured boxes.
- Correct and wrong are text as well as colour.
- Media takes `alt`, `captions=…` and `transcript=…`, with
  `preload="metadata"` and no autoplay with sound.
- Reduced motion is honoured.
- `rem` sizing. 200% zoom and a 320px window are part of the manual check.

## What you still check

- Your theme's contrast. Tokens are yours; ratios are still your job.
- Your content's `alt` text. The parser can require it; it cannot write it.
- Audio rounds without a transcript. Add `transcript="intro.txt"` and listen to
  a screen reader read it.
- One screen reader pass over load, start, play, input, reveal, results and
  settings.

## Keyboard

| Key                 | Action                               |
| ------------------- | ------------------------------------ |
| `Tab` / `Shift+Tab` | move                                 |
| `→` / `↑`           | next question                        |
| `←` / `↓`           | previous question                    |
| `.` / `>`           | next round                           |
| `,` / `<`           | previous round                       |
| `a` / `r`           | show the answer, press again to hide |
| `m`                 | questions / answers mode             |
| `h`                 | hint                                 |
| `u`                 | undo the last answer                 |
| `f`                 | fullscreen the media                 |
| `l`                 | next language                        |
| `Enter` / `Space`   | play or pause media                  |
| `+` / `=`           | bigger text                          |
| `-` / `_`           | smaller text                         |
| `Home` / `Escape`   | start / end                          |

Every key is V2's own. `Hotkeys` and `HotkeysForbidden` remap or switch them
off. `AllowHotkeyMapping` shows the remap panel in Settings.

The timer is announced, not just drawn. A countdown that only exists visually is
a countdown half the room cannot hear.
