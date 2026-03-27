# Voodoo Loader - Upgrade List

Updated: 2026-03-27
Status legend: `pending`, `in_progress`, `done`, `deferred`

1. Queue column `Destination` removal and replacement with file total size (`done`)
2. Resizable queue area height (`done`)
3. Queue block title localization RU/EN (`done`)
4. Queue item checkboxes + `Select all` checkbox (`done`)
5. Queue status color coding: failed/red, downloading/orange, completed/green (`done`)
6. Sound cues for start/success/failure (`done`)
7. Resizable logs area height (`done`)
8. Remove queue control buttons from control row and move to queue context menu (`done`)
9. Replace move up/down/top/bottom actions with drag-and-drop reordering (`done`)
10. Add context-menu priority actions: High / Medium / Low (`done`)
11. Move aria2 parameters to Settings dialog and remove inline settings button from speed block (`done`)
12. Rename `aria2 Parameters` UI block to `Speed` / `Пресеты скорости` (`done`)
13. Move `Continue / Resume (-c)` to Settings with explanatory hint (`done`)
14. Add `Downloads` menu and duplicate queue context actions there (`done`)
15. Add actions: open downloaded file and open containing folder (`done`)
16. Move `Import .txt` from URL row to `File` menu (`done`)
17. Move Authentication controls from main window to Settings (`done`)
18. Add `View` menu: show/hide logs, queue sort by date added, extension, priority (`done`)
19. Top-level menus order must be: `File`, `Downloads`, `View`, `Settings` (`done`)

Constraints:
- Do not produce final release build until all non-deferred items are implemented and verified.

20. Fix overlapping top menu by hiding non-visual service controls (`done`)
21. Progress accordion: Less/More details visibility (`done`)
22. Queue drag-and-drop data integrity fix (no row loss, stable selection, stable naming) (`done`)
23. Recovered accidental `main_window.py` truncation and restored implementation parity (`done`)
24. Queue drag'n'drop stability hardening: CopyAction DnD + model-safe reorder (`done`)

