import { test } from '@e2e-dev/web';
import type { Browser } from '@e2e-dev/web';
import { expect } from 'e2e';
import { readFile, readdir } from 'node:fs/promises';
import JSZip from 'jszip';
import sharp from 'sharp';

const slide = (id: string) => ({ id, layout: 'no-device', screenshot: '', label: { en: 'FEATURE' }, headline: { en: id } });
const fixture = (device = 'watchos', extra = {}) => ({ schemaVersion: 2, appName: 'Tester Army', themeId: 'clean-light', connectedCanvas: true, locales: ['en', 'de', 'ar'], locale: 'en', device, orientation: 'portrait', slidesByDevice: { [device]: [slide('First'), slide('Second')] }, ...extra });
async function mock(browser: Browser, state = fixture()) {
  await browser.route('**/api/project', async route => {
    if (route.request.method === 'POST') state = JSON.parse(route.request.postData!);
    await route.fulfill({ json: { ok: true, state }, headers: { etag: '"mock"' } });
  });
}

for (const device of ['iphone', 'ipad', 'duo-outer', 'duo-outer-landscape', 'duo-inner', 'duo-inner-landscape', 'tvos', 'watchos', 'carplay', 'mac', 'android', 'android-7', 'android-10', 'feature-graphic', 'creative-universal', 'creative-header', 'creative-search']) {
  test(`${device} opens and edits its own deck`, async ({ app, browser, screen }) => {
    await mock(browser, fixture(device));
    await app.open('/');
    const headline = screen.getByRole('textbox', device === 'feature-graphic' ? 'Tagline' : 'Headline');
    await expect(headline).toHaveValue('First');
    await headline.fill(`Edited ${device}`);
    await screen.getByRole('button', 'Add screen').tap();
    await expect(screen.getByRole('button', /^Delete screen/)).toHaveCount(3);
    await browser.locator('button[aria-label="Undo"]').tap();
    await expect(screen.getByRole('button', /^Delete screen/)).toHaveCount(2);
    await expect(headline).toHaveValue(`Edited ${device}`);
  });
}

test('create duplicate delete and undo preserve selection and copy', async ({ app, browser, screen }) => {
  await mock(browser); await app.open('/');
  await screen.getByRole('button', 'Duplicate screen 1').tap();
  await expect(screen.getByRole('button', /^Delete screen/)).toHaveCount(3);
  await screen.getByRole('textbox', 'Headline').fill('Copy edited');
  await screen.getByRole('button', 'Delete screen 2').tap();
  await expect(screen.getByRole('button', /^Delete screen/)).toHaveCount(2);
  await browser.locator('button[aria-label="Undo"]').tap();
  await expect(screen.getByRole('button', /^Delete screen/)).toHaveCount(3);
  await screen.getByRole('button', /Screen 2 ·/).tap();
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('Copy edited');
});

test('locale edits stay independent and Arabic canvas has RTL direction', async ({ app, browser, screen }) => {
  await mock(browser); await app.open('/');
  await screen.getByRole('combobox', 'Locale').tap();
  await screen.getByRole('option', 'DE', { exact: true }).tap();
  await screen.getByRole('textbox', 'Headline').fill('Deutsch');
  await screen.getByRole('combobox', 'Locale').tap();
  await screen.getByRole('option', 'AR', { exact: true }).tap();
  await screen.getByRole('textbox', 'Headline').fill('مرحبا بالعالم');
  await expect(browser.locator('main [contenteditable="plaintext-only"]').nth(1)).toContainText('مرحبا بالعالم');
  await expect(await browser.evaluate(() => getComputedStyle(document.querySelectorAll('main [contenteditable="plaintext-only"]')[1]).direction)).toBe('rtl');
  await screen.getByRole('combobox', 'Locale').tap();
  await screen.getByRole('option', 'EN', { exact: true }).tap();
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('First');
});

test('platform tabs remember the last device and its copy', async ({ app, browser, screen }) => {
  await mock(browser); await app.open('/');
  await screen.getByRole('tab', 'Android', { exact: true }).tap();
  await screen.getByRole('textbox', 'Headline').fill('Android copy');
  await screen.getByRole('tab', 'iOS', { exact: true }).tap();
  await expect(screen.getByRole('combobox', 'Device')).toContainText('Watch');
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('First');
  await screen.getByRole('tab', 'Android', { exact: true }).tap();
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('Android copy');
});

test('connected mode toggles and survives undo and redo', async ({ app, browser, screen }) => {
  await mock(browser); await app.open('/');
  await screen.getByRole('button', 'Connected', { exact: true }).tap();
  await expect(screen.getByRole('button', 'Isolated', { exact: true })).toHaveAttribute('aria-pressed', 'false');
  await browser.locator('button[aria-label="Undo"]').tap();
  await expect(screen.getByRole('button', 'Connected', { exact: true })).toHaveAttribute('aria-pressed', 'true');
  await screen.getByRole('button', 'Redo').tap();
  await expect(screen.getByRole('button', 'Isolated', { exact: true })).toBeVisible();
  await screen.getByRole('button', 'Reset', { exact: true }).tap();
  await expect(screen.getByRole('dialog')).toBeVisible();
  await screen.getByRole('button', 'Cancel', { exact: true }).tap();
  await expect(screen.getByRole('dialog')).toHaveCount(0);
  await expect(screen.getByRole('button', 'Isolated', { exact: true })).toBeVisible();
  await expect(screen.getByRole('button', /^Delete screen/)).toHaveCount(2);
});

test('copy ideas inserts an editable headline formula', async ({ app, browser, screen }) => {
  await mock(browser); await app.open('/');
  await screen.getByRole('button', 'Copy ideas').tap();
  const item = screen.getByRole('menuitem').first();
  await item.tap();
  await expect(screen.getByRole('textbox', 'Headline')).toBeVisible();
  const value = await screen.getByRole('textbox', 'Headline').inputValue();
  await expect(value).toContain('[');
  await screen.getByRole('textbox', 'Headline').fill('Final copy');
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('Final copy');
});

test('mobile viewport retains usable controls without document overflow', async ({ app, browser, screen }) => {
  await mock(browser); await browser.setViewport({ width: 390, height: 844 }); await app.open('/');
  await expect(screen.getByRole('button', 'Add screen')).toBeVisible();
  await screen.getByRole('textbox', 'Headline').fill('Mobile edited');
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('Mobile edited');
  await expect(await browser.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('missing referenced images prevent downloads and unlock controls', async ({ app, browser, screen }) => {
  await mock(browser, fixture('watchos', { slidesByDevice: { watchos: [{ ...slide('Broken'), layout: 'hero', screenshot: '/missing-tester-army.png' }] } }));
  await app.open('/'); await screen.getByRole('button', 'Export bundle', { exact: true }).tap();
  await expect(screen.getByText('Export failed', { exact: true })).toBeVisible();
  await expect(screen.getByRole('textbox', 'App name')).toBeEnabled();
  await expect(browser.locator('[inert]')).toHaveCount(0);
});

test('real ZIP exports exact RGB dimensions locale filenames and composition', async ({ app, browser, screen }) => {
  await mock(browser, fixture('watchos', { locales: ['en', 'de'] })); await app.open('/');
  const download = await browser.waitForDownload(() => screen.getByRole('button', 'Export bundle', { exact: true }).tap(), { timeout: 120_000 });
  const matches = (await readdir('.e2e/artifacts', { recursive: true })).filter(file => file.endsWith(download.path));
  await expect(matches).toHaveLength(1);
  const zip = await JSZip.loadAsync(await readFile(`.e2e/artifacts/${matches[0]}`));
  const pngs = Object.values(zip.files).filter(file => file.name.endsWith('.png'));
  await expect(pngs).toHaveLength(24);
  for (const file of pngs) {
    const bytes = await file.async('nodebuffer'); const dimensions = file.name.match(/\/(\d+)x(\d+)\/(en|de)\/0[12]-no-device\.png$/)!;
    await expect(dimensions).toBeTruthy();
    await expect(bytes.readUInt32BE(16)).toBe(Number(dimensions[1])); await expect(bytes.readUInt32BE(20)).toBe(Number(dimensions[2]));
    await expect(bytes[25]).toBe(2);
  }
  const stats = await sharp(await pngs[0].async('nodebuffer')).stats();
  await expect(stats.channels.some(channel => channel.stdev > 3)).toBe(true);
  await expect(screen.getByRole('textbox', 'App name')).toBeEnabled();
});

test('real disk autosave reload and cache preserve edits', async ({ app, browser, screen }) => {
  const endpoint = new URL('/api/project', app.baseUrl);
  const original = (await (await fetch(endpoint)).json()).state;
  try {
    await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(fixture()) });
    await app.open('/'); await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('First');
    const saved = browser.waitForResponse('**/api/project');
    await screen.getByRole('textbox', 'App name').fill('Persisted army');
    await expect((await saved).status).toBe(200);
    await browser.reload(); await expect(screen.getByRole('textbox', 'App name')).toHaveValue('Persisted army');
    await expect((await (await fetch(endpoint)).json()).state.appName).toBe('Persisted army');
    await expect(await browser.evaluate(() => Object.keys(localStorage).length > 0)).toBe(true);
  } finally { await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(original) }); }
});

test('keyboard screen reorder keeps the selected screen and has a separate undo step', async ({ app, browser, screen }) => {
  await mock(browser); await app.open('/');
  const handle = screen.getByRole('button', 'Reorder screen 1 (press space, then arrow keys)', { exact: true });
  await handle.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  await expect(screen.getByRole('status')).toContainText(/First was (picked up|moved over droppable area First)/);
  await browser.keyboard.press('ArrowDown');
  await expect(screen.getByRole('status')).toContainText('over droppable area Second');
  await browser.keyboard.press('Space');
  await expect(screen.getByRole('button', /Screen 1 ·.*Second/)).toBeVisible();
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('First');
  await browser.locator('button[aria-label="Undo"]').tap();
  await expect(screen.getByRole('button', /Screen 1 ·.*First/)).toBeVisible();
});

test('real API rejects invalid projects without changing disk', async ({ app }) => {
  const url = new URL('/api/project', app.baseUrl); const original = await fetch(url); const state = (await original.json()).state;
  for (const invalid of [null, {}, { ...state, schemaVersion: 999 }, { ...state, slidesByDevice: { unknown: [] } }]) {
    await expect((await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(invalid) })).status).toBe(400);
  }
  await expect((await (await fetch(url)).json()).state).toEqual(state);
});

test('real API stale revisions conflict and keep the winning project', async ({ app }) => {
  const url = new URL('/api/project', app.baseUrl); const initial = await fetch(url); const state = (await initial.json()).state; const revision = initial.headers.get('etag')!;
  const post = (appName: string) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'if-match': revision }, body: JSON.stringify({ ...state, appName }) });
  try {
    const responses = await Promise.all([post('Winner A'), post('Winner B')]);
    await expect(responses.map(response => response.status).sort()).toEqual([200, 412]);
    await expect((await (await fetch(url)).json()).state.appName).toBe(responses[0].status === 200 ? 'Winner A' : 'Winner B');
  } finally { await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(state) }); }
});

test('real upload endpoints reject corrupt content and foreign origins', async ({ app }) => {
  for (const [endpoint, data] of [['/api/upload', { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' }], ['/api/upload-font', { data: 'd09GMg==' }]] as const) {
    const url = new URL(endpoint, app.baseUrl); const body = JSON.stringify(data);
    await expect((await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body })).status).toBe(400);
    await expect((await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://foreign.example' }, body })).status).toBe(403);
  }
});
