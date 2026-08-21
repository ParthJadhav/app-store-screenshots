# Themes

Use the **Theme** menu in the toolbar to preview and apply a color system across the entire screenshot deck. Each option shows its background and accent colors before you choose it.

Changing a theme updates every slide immediately and saves the selected theme in `app-store-screenshots.json`. It changes the canvas background, text colors, muted text, accent details, and each slide’s alternate background. It does not change screenshot images, text, layouts, or element placement.

## Included themes

- **Mark & Carry**: warm near-black with cream text and muted rose accents.
- **Clean Light**: warm off-white with blue accents.
- **Dark Bold**: deep navy with violet accents.
- **Warm Editorial**: soft peach with amber accents.
- **Ocean Fresh**: pale blue with ocean-blue accents.
- **Bloom Roast**: light stone with forest-green and warm brown accents.

## Relevant code

- `src/lib/constants.ts` defines the available theme colors.
- `src/components/editor/toolbar.tsx` renders the live theme menu.
- `src/components/editor/slide-canvas.tsx` applies the active theme to the exported and previewed canvas.
