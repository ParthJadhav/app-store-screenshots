# Image Elements

The screenshot editor supports image overlays on every non-feature-graphic slide. Use them for a logo, bowling photo, decorative asset, or other visual that should sit above or beside the device frame.

## Use

1. Select a screen in the editor.
2. In **Elements**, click **Image**.
3. Select the new image placeholder on the canvas.
4. Use **Pick** or drag a PNG/JPG into the Image control.
5. Drag, resize, rotate, and reorder the image. Choose **Fill frame** to crop or **Keep whole image** to preserve its full shape.
6. Use **Edge fade** to feather the image into the background from the top, bottom, left, or right. **Fade strength** controls the feather. The opposite edge always stays fully visible. At 100%, the selected edge is fully transparent through its outer quarter, then it feathers into a fully solid opposite quarter.

The editor saves uploaded assets under `public/screenshots/uploaded/` when its local API is available. Each image element is saved in `app-store-screenshots.json`, so its source, placement, rotation, layering, and fit mode are retained across refreshes and included in exports.

## Implementation

- `src/lib/types.ts` defines the persisted `ImageElement` shape.
- `src/components/editor/image-element-canvas.tsx` renders an individual overlay and applies its gradient mask during preview and export.
- `src/components/editor/inspector.tsx` adds upload, fit, layering, and delete controls.
- `src/components/editor/slide-canvas.tsx` includes image overlays in preview and export rendering.
- `src/lib/storage.ts` validates image elements when loading project data.
