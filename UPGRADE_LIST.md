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
12. Rename `aria2 Parameters` UI block to `Speed` / `Р В РЎСџР РЋР вЂљР В Р’ВµР РЋР С“Р В Р’ВµР РЋРІР‚С™Р РЋРІР‚в„– Р РЋР С“Р В РЎвЂќР В РЎвЂўР РЋР вЂљР В РЎвЂўР РЋР С“Р РЋРІР‚С™Р В РЎвЂ` (`done`)
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
25. Add drag'n'drop regression tests (row-loss guard + MIME row decode/encode checks) (`done`)
26. Add widget-level drag'n'drop tests (viewport source + mime drop path) (`done`)

27. Fix `Start` regression in `_build_download_options` and add dedicated start-path regression test (`done`)

28. Help menu + in-app update flow (GitHub Releases, modal check/about, update apply) (done)
29. Cross-platform build matrix + release artifact naming convention (done)
30. Fix Linux portable CI build conflict (PyInstaller EXE/COLLECT naming + Ubuntu Qt libs install) (done)

31. Introduce mandatory QA gate (local scripts + pre-push hook + CI workflow + governance doc) (done)
32. Add auto-tag on master merge (next vX.Y.Z-alpha tag generation workflow) (done)
33. Configure default update repository for fresh/local builds (no manual setup required) (done)

34. Version sync hardening for updates: bundle version stamp file + runtime resolution priority (done)
35. Update UX fix: replace blank progress modal with explicit loader dialogs for check/download/apply (done)
36. Update relaunch hardening: updater working directory + retry loop + manual fallback message (done)
37. Add regression tests for update launcher and runtime version resolution (done)
38. Progress bar visual refresh: height 15px + chunk color #00BB0A (done)
39. CI auto-release hardening: auto-tag -> explicit build/release dispatch by tag (done)
40. Update apply/relaunch hardening + progress UX regression fix (done)
41. Increase progress bar height to 15px for readable percent text (done)
42. Updater apply hardening: robocopy retries + explicit PowerShell resolution (done)
43. Updater startup handshake hardening: stale marker cleanup + marker/log readiness fallback + startup timeout increase (done)
44. Build script reliability: fail-fast on PyInstaller errors to prevent stale archive packaging (done)
45. Updater file hygiene: purge previous runtime (_internal + old exe) before copy to prevent mixed Python runtimes (done)
