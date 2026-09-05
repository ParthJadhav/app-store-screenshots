# Background Controls

Each slide has its own **Background** control in the right-hand Screen settings panel.

- **Theme background** uses the deck’s active theme color.
- **Theme alternate** uses the second background color from that theme. This is the per-slide light/dark variation.
- **Custom color** opens a color picker and hex input. The color only applies to the selected slide and overrides the theme background there.

Switching back to either theme option removes the custom override. Background choices are saved with the slide in `app-store-screenshots.json` and included in exports.

## Relevant code

- `src/components/editor/background-controls.tsx` provides the editor controls.
- `src/components/editor/slide-canvas.tsx` renders the selected background.
- `src/lib/storage.ts` validates saved custom hex colors during load.
