import { test } from '@e2e-dev/web';
import type { Browser } from '@e2e-dev/web';
import { expect } from 'e2e';
import { readFile, readdir, stat } from 'node:fs/promises';
import JSZip from 'jszip';
import sharp from 'sharp';

type State = Record<string, any>;
const screen = (id: string, layout = 'device-bottom') => ({ id, layout, screenshot: '', label: { en: 'FEATURE' }, headline: { en: id } });
const deck = (extra: State = {}): State => ({
  schemaVersion: 2, appName: 'Scene Army', themeId: 'clean-light', connectedCanvas: true, locales: ['en'], locale: 'en',
  device: 'iphone', orientation: 'portrait', slidesByDevice: { iphone: [screen('One', 'hero'), screen('Two'), screen('Three')] }, ...extra,
});

// Serves the project from memory and exposes the latest saved state.
async function mock(browser: Browser, initial = deck()) {
  const store = { state: initial };
  await browser.route('**/api/project', async route => {
    if (route.request.method === 'POST') store.state = JSON.parse(route.request.postData!);
    await route.fulfill({ json: { ok: true, state: store.state }, headers: { etag: '"mock"' } });
  });
  return store;
}

// Autosave is debounced; retry an assertion on the saved state until it holds.
async function eventually(check: () => unknown | Promise<unknown>, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    try { await check(); return; } catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
}

// Downloads in the same minute share a name across tests; take the newest.
async function zipFrom(path: string) {
  const matches = (await readdir('.e2e/artifacts', { recursive: true })).filter(file => file.endsWith(path));
  await expect(matches.length).toBeGreaterThan(0);
  const dated = await Promise.all(matches.map(async file => ({ file, at: (await stat(`.e2e/artifacts/${file}`)).mtimeMs })));
  dated.sort((a, b) => b.at - a.at);
  return readFile(`.e2e/artifacts/${dated[0].file}`);
}

test('scene playground restyles every screen, persists and undoes', async ({ app, browser, screen: ui }) => {
  const store = await mock(browser); await app.open('/');
  await ui.getByRole('button', 'Scene', { exact: true }).tap();
  await ui.getByRole('radio', 'Grid', { exact: true }).tap();
  await ui.getByRole('checkbox', /Flow across screens/).check();
  await ui.getByRole('radio', 'Rings', { exact: true }).tap();
  await ui.getByRole('slider', 'Tilt', { exact: true }).fill('12');
  await ui.getByRole('radio', 'UPPER', { exact: true }).tap();
  await expect(ui.getByRole('radio', 'Grid', { exact: true })).toHaveAttribute('aria-checked', 'true');
  await eventually(async () => {
    await expect(store.state.scene).toMatchObject({ backdrop: 'grid', span: true, decoration: 'rings', tilt: 12, headlineCase: 'upper' });
  });
  // Every screen in the main canvas renders the scene's backdrop art.
  await expect(browser.locator('main [data-scene-art="grid"]')).toHaveCount(3);
  await browser.keyboard.press('Escape');
  // Undo walks the scene edits back to the classic look. How many steps that
  // takes depends on how fast the tweaks above landed (rapid edits coalesce).
  const undo = browser.locator('button[aria-label="Undo"]').first();
  for (let i = 0; i < 5 && store.state.scene !== undefined; i++) {
    const before = JSON.stringify(store.state.scene);
    await undo.tap();
    await eventually(() => expect(JSON.stringify(store.state.scene) === before).toBe(false));
  }
  await expect(store.state.scene).toBeUndefined();
  // Redo brings back at least the first edit, the Grid backdrop.
  await browser.locator('button[aria-label="Redo"]').tap();
  await eventually(() => expect(store.state.scene?.backdrop).toBe('grid'));
  await ui.getByRole('button', 'Scene', { exact: true }).tap();
  await ui.getByRole('button', 'Reset scene', { exact: true }).tap();
  await eventually(async () => {
    await expect(store.state.scene).toBeUndefined();
  });
  await expect(browser.locator('main [data-scene-art="gradient"]')).toHaveCount(3);
});

test('style lab shows four looks and applies one as a single undo step', async ({ app, browser, screen: ui }) => {
  const store = await mock(browser); await app.open('/');
  await ui.getByRole('button', 'Style Lab', { exact: true }).tap();
  const looks = browser.locator('[data-testid="style-lab-looks"] > section');
  await expect(looks).toHaveCount(5);
  await expect(looks.nth(0)).toContainText('Current');
  await expect(ui.getByRole('button', /^Apply /)).toHaveCount(4);
  await ui.getByRole('button', /^Apply Editorial/).tap();
  await expect(ui.getByText(/^Applied Editorial/)).toBeVisible();
  await eventually(async () => {
    await expect(store.state.themeId).not.toBe('clean-light');
    await expect(store.state.scene.captionAlign).toBe('left');
    await expect(store.state.slidesByDevice.iphone.map((s: State) => s.headline.en)).toEqual(['One', 'Two', 'Three']);
  });
  await browser.locator('button[title^="Undo ("]').tap();
  await eventually(async () => {
    await expect(store.state.themeId).toBe('clean-light');
    await expect(store.state.scene).toBeUndefined();
    await expect(store.state.slidesByDevice.iphone.map((s: State) => s.layout)).toEqual(['hero', 'device-bottom', 'device-bottom']);
  });
});

test('style lab locks keep colors and layout while shuffling the rest', async ({ app, browser, screen: ui }) => {
  const store = await mock(browser, deck({ themeId: 'ocean-fresh' })); await app.open('/');
  await ui.getByRole('button', 'Style Lab', { exact: true }).tap();
  await ui.getByRole('button', 'Colors', { exact: true }).tap();
  await ui.getByRole('button', 'Layout', { exact: true }).tap();
  await expect(ui.getByRole('button', 'Colors', { exact: true })).toHaveAttribute('aria-pressed', 'true');
  await ui.getByRole('button', 'Shuffle', { exact: true }).tap();
  // Every look now reports the locked palette.
  const rows = browser.locator('[data-testid="style-lab-looks"] > section');
  for (let i = 1; i < 5; i++) await expect(rows.nth(i)).toContainText('Ocean Fresh ·');
  await ui.getByRole('button', /^Apply /).first().tap();
  await eventually(async () => {
    await expect(store.state.themeId).toBe('ocean-fresh');
    await expect(store.state.slidesByDevice.iphone.map((s: State) => s.layout)).toEqual(['hero', 'device-bottom', 'device-bottom']);
  });
  // Locking everything leaves nothing to shuffle.
  await ui.getByRole('button', 'Style Lab', { exact: true }).tap();
  await ui.getByRole('button', 'Type', { exact: true }).tap();
  await ui.getByRole('button', 'Scene', { exact: true }).last().tap();
  await expect(ui.getByRole('button', 'Shuffle', { exact: true })).toBeDisabled();
});

test('saved looks persist across reloads and can be applied or removed', async ({ app, browser, screen: ui }) => {
  const store = await mock(browser); await app.open('/');
  await ui.getByRole('button', 'Style Lab', { exact: true }).tap();
  await ui.getByRole('button', /^Save Playful/).tap();
  await expect(ui.getByRole('button', /^Unsave Playful/)).toHaveAttribute('aria-pressed', 'true');
  await eventually(async () => {
    await expect(store.state.savedLooks).toHaveLength(1);
  });
  const savedScene = store.state.savedLooks[0].scene;
  await browser.reload();
  await ui.getByRole('button', 'Style Lab', { exact: true }).tap();
  await expect(ui.getByText('Saved looks', { exact: true })).toBeVisible();
  await ui.getByRole('button', /^Apply saved look Playful/).tap();
  await eventually(async () => {
    await expect(store.state.scene).toEqual(savedScene);
  });
  await ui.getByRole('button', 'Style Lab', { exact: true }).tap();
  await ui.getByRole('button', /^Remove saved look Playful/).tap();
  await eventually(async () => {
    await expect(store.state.savedLooks).toBeUndefined();
  });
});

test('style lab exports a comparison image of every look', async ({ app, browser, screen: ui }) => {
  await mock(browser); await app.open('/');
  await ui.getByRole('button', 'Style Lab', { exact: true }).tap();
  const download = await browser.waitForDownload(() => ui.getByRole('button', 'Export comparison', { exact: true }).tap(), { timeout: 120_000 });
  await expect(download.path.endsWith('scene-army-style-lab.png')).toBe(true);
  const bytes = await zipFrom(download.path);
  const meta = await sharp(bytes).metadata();
  await expect(meta.format).toBe('png');
  await expect(meta.width!).toBeGreaterThan(900);
  await expect(meta.height!).toBeGreaterThan(meta.width!);
  await expect(ui.getByText('Comparison image exported', { exact: true })).toBeVisible();
});

test('magnifier can be added, aimed, zoomed and removed', async ({ app, browser, screen: ui }) => {
  const store = await mock(browser); await app.open('/');
  await ui.getByRole('button', 'Add', { exact: true }).tap();
  const focus = ui.getByRole('slider', 'Magnifier focus', { exact: true });
  await expect(focus).toBeVisible();
  await focus.tap();
  await browser.keyboard.press('ArrowRight');
  await ui.getByRole('slider', 'Magnifier zoom', { exact: true }).fill('3.5');
  await ui.getByRole('radio', 'Rounded', { exact: true }).tap();
  await eventually(async () => {
    const callout = store.state.slidesByDevice.iphone[0].callout;
    await expect(callout).toMatchObject({ zoom: 3.5, shape: 'rounded' });
    await expect(callout.focusX).toBeGreaterThan(0.5);
  });
  await ui.getByRole('button', 'Remove magnifier', { exact: true }).tap();
  await eventually(async () => {
    await expect(store.state.slidesByDevice.iphone[0].callout).toBeUndefined();
  });
  await expect(ui.getByRole('slider', 'Magnifier focus', { exact: true })).toHaveCount(0);
});

test('scene and magnifier export into the ZIP at exact sizes', async ({ app, browser, screen: ui }) => {
  const scene = { backdrop: 'spotlight', span: true, decoration: 'sparkles', shadow: 70, glow: 60, tilt: -16, headlineWeight: 800, headlineCase: 'upper', captionAlign: 'left' };
  const slides = [{ ...screen('One', 'hero'), callout: { focusX: 0.5, focusY: 0.3, zoom: 2, shape: 'circle' } }, screen('Two')];
  await mock(browser, deck({ scene, slidesByDevice: { iphone: slides } })); await app.open('/');
  const download = await browser.waitForDownload(() => ui.getByRole('button', 'Export bundle', { exact: true }).tap(), { timeout: 120_000 });
  const zip = await JSZip.loadAsync(await zipFrom(download.path));
  const pngs = Object.values(zip.files).filter(file => file.name.endsWith('.png'));
  await expect(pngs).toHaveLength(8);
  const hero = pngs.find(file => file.name.includes('/1320x2868/en/01-hero.png'))!;
  const bytes = await hero.async('nodebuffer');
  await expect(bytes.readUInt32BE(16)).toBe(1320); await expect(bytes.readUInt32BE(20)).toBe(2868);
  await expect(bytes[25]).toBe(2);
  const stats = await sharp(bytes).stats();
  await expect(stats.channels.every(channel => channel.stdev > 3)).toBe(true);
});

test('project API rejects malformed scene data and the editor cleans out-of-range values', async ({ app, browser, screen: ui }) => {
  const endpoint = new URL('/api/project', app.baseUrl);
  const post = (body: State) => fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  await expect((await post(deck({ scene: 'neon' }))).status).toBe(400);
  await expect((await post(deck({ savedLooks: {} }))).status).toBe(400);
  await expect((await post(deck({ slidesByDevice: { iphone: [{ ...screen('One'), callout: { focusX: 'left', focusY: 0, zoom: 2 } }] } }))).status).toBe(400);
  const store = await mock(browser, deck({
    scene: { backdrop: 'lava', tilt: 99, shadow: -5, headlineWeight: 1200 },
    savedLooks: [{ id: 'kept', scene: {}, themeId: 'nope' }, { id: '' }],
    slidesByDevice: { iphone: [{ ...screen('One'), callout: { focusX: 4, focusY: -1, zoom: 50, shape: 'blob' } }] },
  }));
  await app.open('/');
  await ui.getByRole('textbox', 'App name').fill('Cleaned');
  await eventually(async () => {
    await expect(store.state.scene).toMatchObject({ backdrop: 'gradient', tilt: 30, shadow: 0, headlineWeight: 900 });
    await expect(store.state.savedLooks).toHaveLength(1);
    await expect(store.state.savedLooks[0].themeId).toBe('clean-light');
    await expect(store.state.slidesByDevice.iphone[0].callout).toEqual({ focusX: 1, focusY: 0, zoom: 5, shape: 'circle' });
  });
});

test('flowing spotlight lights every screen the same', async ({ app, browser, screen: ui }) => {
  const scene = { backdrop: 'spotlight', span: true, decoration: 'none', shadow: 0, glow: 0, tilt: 0, headlineWeight: 700, headlineCase: 'as-typed', captionAlign: 'auto' };
  const slides = ['A', 'B', 'C'].map(id => ({ ...screen(id, 'no-device'), headline: { en: '' }, label: { en: '' } }));
  await mock(browser, deck({ scene, slidesByDevice: { iphone: slides } })); await app.open('/');
  const download = await browser.waitForDownload(() => ui.getByRole('button', 'Export bundle', { exact: true }).tap(), { timeout: 120_000 });
  const zip = await JSZip.loadAsync(await zipFrom(download.path));
  const means: number[] = [];
  for (const n of ['01', '02', '03']) {
    const file = Object.values(zip.files).find(f => f.name.endsWith(`/1320x2868/en/${n}-no-device.png`))!;
    const stats = await sharp(await file.async('nodebuffer')).stats();
    means.push(stats.channels.slice(0, 3).reduce((sum, c) => sum + c.mean, 0) / 3);
  }
  // A strip-wide vignette used to leave screens 2+ under a flat dark wash.
  await expect(Math.abs(means[1] - means[0])).toBeLessThan(8);
  await expect(Math.abs(means[2] - means[0])).toBeLessThan(8);
});

test('looks keep per-screen headline sizes and the toast undo never reverts a later edit', async ({ app, browser, screen: ui }) => {
  const slides = [{ ...screen('Long headline here', 'hero'), typography: { headlineScale: 0.7 } }, screen('Two')];
  const store = await mock(browser, deck({ slidesByDevice: { iphone: slides } })); await app.open('/');
  await ui.getByRole('button', 'Style Lab', { exact: true }).tap();
  await ui.getByRole('button', /^Apply Playful/).tap();
  await eventually(async () => {
    await expect(store.state.slidesByDevice.iphone[0].typography).toEqual({ headlineScale: 0.7 });
    await expect(store.state.scene.headlineScale).toBeGreaterThan(1);
  });
  await ui.getByRole('textbox', 'App name').fill('Edited after look');
  await browser.locator('[data-sonner-toast] button[data-button]').first().tap();
  await expect(ui.getByText('Use the toolbar Undo', { exact: true })).toBeVisible();
  await eventually(async () => {
    await expect(store.state.appName).toBe('Edited after look');
    await expect(store.state.scene.headlineScale).toBeGreaterThan(1);
  });
});

test('a magnifier with only some values is accepted and completed', async ({ app }) => {
  const endpoint = new URL('/api/project', app.baseUrl);
  const original = (await (await fetch(endpoint)).json()).state;
  try {
    const partial = deck({ slidesByDevice: { iphone: [{ ...screen('One'), callout: { focusX: 0.4 }, transforms: { callout: { x: 10, y: 20, width: 300, height: 300 } } }] } });
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(partial) });
    await expect(response.status).toBe(200);
  } finally { await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(original) }); }
});
