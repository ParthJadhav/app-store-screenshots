# Edit History

The screenshot editor keeps the 25 most recent canvas and project edits available during the current browser session.

## Using it

- Select **Undo** in the toolbar, or press `Command + Z` on macOS (`Ctrl + Z` on Windows/Linux).
- Select **Redo** in the toolbar, or press `Command + Shift + Z` on macOS (`Ctrl + Shift + Z` on Windows/Linux). `Ctrl + Y` also redoes an edit on Windows/Linux.
- The buttons are unavailable when there is nothing left to undo or redo.

Typing and slider adjustments made in quick succession are combined into one history step, so a single Undo reverses the full small adjustment rather than one character or slider tick at a time. The history resets when the editor reloads.

## Relevant code

- `src/lib/storage.ts` owns the 25-step in-memory history stacks and state restoration.
- `src/components/editor/toolbar.tsx` renders the Undo and Redo buttons.
- `src/components/editor/screenshot-editor.tsx` connects the editor’s state history to the toolbar and keyboard shortcuts.
