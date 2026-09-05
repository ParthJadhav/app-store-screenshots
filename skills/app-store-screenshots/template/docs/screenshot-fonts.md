# Screenshot Fonts

Use the **Font** menu in the toolbar to change the typeface used on the screenshot canvas and in exported images. It does not change the editor’s controls.

## Included choices

- **Editorial Serif** uses Georgia.
- **Modern Sans** uses the device’s clean system sans-serif font.
- **Classic Serif** uses Georgia.
- **Avenir Next**, **Helvetica Neue**, **American Typewriter**, **Baskerville**, **Optima**, **Palatino**, and **Futura** use their macOS-native versions when available, with sensible fallbacks elsewhere.
- **Import a font** accepts your WOFF2, WOFF, TTF, or OTF file directly.

## Adding your own font

1. Choose **Import a font** in the toolbar, then select **Import font**.
2. Choose a licensed WOFF2, WOFF, TTF, or OTF file. It is copied to `public/fonts/imported/` and used immediately in previews and exports.
3. You can also add a WOFF2, WOFF, TTF, or OTF file manually as `public/fonts/imported/custom-screenshot-font.<extension>`, choose **Import a font**, and the editor uses it when no imported file has been selected.

The selected font is saved in `app-store-screenshots.json` as `fontId`.

## Relevant code

- `src/lib/constants.ts` defines the available screenshot fonts.
- `src/components/editor/toolbar.tsx` provides the font selector.
- `src/components/editor/slide-canvas.tsx` applies the font to previews and exports.
- `src/app/globals.css` registers the self-hosted font location.
