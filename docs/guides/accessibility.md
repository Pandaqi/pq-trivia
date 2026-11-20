# Accessibility

Target: WCAG 2.2 AA on Paper. Automated checks are cheap; the manual pass is
the honest one.

## Built in

- Landmarks, one `<h1>` per screen, lists for answers, tables for results.
- Focus moves to the heading after navigation.
- `:focus-visible` everywhere. `Escape` closes overlays.
- Single-letter shortcuts are off while typing.
- Live regions announce question changes and timer milestones at 30, 10 and 0
  seconds, once each.
- Answers are buttons with `aria-pressed`, not coloured boxes.
- Correct and wrong are text as well as colour.
- Media has `alt` support, captions via `captions=…`, `preload="metadata"`,
  no autoplay with sound.
- Reduced motion is honoured.
- `rem` sizing. 200% zoom and a 320px window are part of the manual check.

## What you should still check

- Your own theme's contrast. Tokens are yours; ratios are still your job.
- Your content's `alt` text. The parser can require it; it cannot write it.
- Audio rounds without a transcript. Add one.
- A screen reader pass on load, start, play, input, reveal, results, settings.

## Keyboard

| Key                 | Action                               |
| ------------------- | ------------------------------------ |
| `Tab` / `Shift+Tab` | move                                 |
| `→` / `↑`           | next question                        |
| `←` / `↓`           | previous question                    |
| `.` / `>`           | next round                           |
| `,` / `<`           | previous round                       |
| `a` / `r`           | show the answer, press again to hide |
| `m`                 | questions / answers                  |
| `h`                 | hint                                 |
| `f`                 | fullscreen the media                 |
| `l`                 | next language                        |
| `Enter` / `Space`   | play or pause media                  |
| `+` / `-`           | font size                            |
| `Home` / `Escape`   | start / end                          |

V2 hands know these; every key here is V2's own. `Hotkeys` and
`HotkeysForbidden` remap or switch them off.

The timer is announced, not just drawn. A countdown that only exists visually
is a countdown half the room cannot hear.
