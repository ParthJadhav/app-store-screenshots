import { DEFAULT_LOCALE } from "./locale";
import { DEFAULT_SCREENSHOT_FONT_ID, DEFAULT_THEME_ID, PROJECT_SCHEMA_VERSION } from "./constants";
import type { ProjectState, Slide } from "./types";

let _id = 0;
export const nid = () => `s_${Date.now().toString(36)}_${(_id++).toString(36)}`;

const en = (s: string) => ({ [DEFAULT_LOCALE]: s });

function makeStarterSlides(): Slide[] {
  return [
    {
      id: nid(),
      layout: "hero",
      label: en("MEET YOUR APP"),
      headline: en("Sell one\nidea per slide."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "device-bottom",
      label: en("FEATURE 01"),
      headline: en("Your headline\nlives here."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "two-devices",
      label: en("FEATURE 02"),
      headline: en("Show two\nscreens at once."),
      screenshot: "",
      screenshotSecondary: "",
    },
    {
      id: nid(),
      layout: "device-top",
      label: en("FEATURE 03"),
      headline: en("Flip the contrast\nfor visual rhythm."),
      screenshot: "",
      inverted: true,
    },
    {
      id: nid(),
      layout: "no-device",
      label: en("MORE"),
      headline: en("And so\nmuch more."),
      screenshot: "",
    },
  ];
}

function ipadStarter(): Slide[] {
  return [
    {
      id: nid(),
      layout: "hero",
      label: en("MEET YOUR APP"),
      headline: en("Made for\nthe big screen."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "device-bottom",
      label: en("FEATURE 01"),
      headline: en("Built for\nfocus."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "device-top",
      label: en("FEATURE 02"),
      headline: en("Always within reach."),
      screenshot: "",
      inverted: true,
    },
  ];
}

function tvStarter(): Slide[] {
  return [
    { id: nid(), layout: "hero", label: en("MEET YOUR APP"), headline: en("Made for\nthe living room."), screenshot: "" },
    { id: nid(), layout: "split-landscape", label: en("FEATURE 01"), headline: en("One idea\nper screen."), screenshot: "" },
    { id: nid(), layout: "device-top", label: en("FEATURE 02"), headline: en("Flip the contrast."), screenshot: "", inverted: true },
    { id: nid(), layout: "no-device", label: en("MORE"), headline: en("And so\nmuch more."), screenshot: "" },
  ];
}

// Short headlines: the watch canvas is only 422 px wide.
function watchStarter(): Slide[] {
  return [
    { id: nid(), layout: "hero", label: en("MEET YOUR APP"), headline: en("On your\nwrist."), screenshot: "" },
    { id: nid(), layout: "device-bottom", label: en("FEATURE 01"), headline: en("One glance.\nDone."), screenshot: "" },
    { id: nid(), layout: "device-top", label: en("FEATURE 02"), headline: en("Always\nwith you."), screenshot: "", inverted: true },
  ];
}

function carplayStarter(): Slide[] {
  return [
    { id: nid(), layout: "split-landscape", label: en("CARPLAY"), headline: en("Eyes on\nthe road."), screenshot: "" },
    { id: nid(), layout: "device-bottom", label: en("FEATURE 01"), headline: en("Everything, one tap away."), screenshot: "" },
    { id: nid(), layout: "device-top", label: en("FEATURE 02"), headline: en("Made for every drive."), screenshot: "", inverted: true },
  ];
}

function tabletStarter(kind: "7" | "10"): Slide[] {
  return [
    {
      id: nid(),
      layout: "hero",
      label: en("MEET YOUR APP"),
      headline: en(kind === "7" ? "Pocket-sized\npower." : "Made for\nthe big screen."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "split-landscape",
      label: en("FEATURE 01"),
      headline: en("Wide canvas,\nbigger ideas."),
      screenshot: "",
    },
  ];
}

// Mac is contained like the TV, so "hero" and "device-bottom" would look alike;
// the split and two-window slides give the wide canvas its rhythm instead.
function macStarter(): Slide[] {
  return [
    { id: nid(), layout: "hero", label: en("MEET YOUR APP"), headline: en("Made for\nyour Mac."), screenshot: "" },
    { id: nid(), layout: "split-landscape", label: en("FEATURE 01"), headline: en("Everything in\none window."), screenshot: "" },
    { id: nid(), layout: "device-top", label: en("FEATURE 02"), headline: en("One shortcut away."), screenshot: "", inverted: true },
    { id: nid(), layout: "two-devices", label: en("FEATURE 03"), headline: en("Work across windows."), screenshot: "", screenshotSecondary: "" },
    { id: nid(), layout: "no-device", label: en("MORE"), headline: en("And so\nmuch more."), screenshot: "" },
  ];
}

// iPhone Duo. The outer display is a short, wide phone (1398 × 2034) and the
// inner display opens to about the shape of A-series paper (2853 × 2007), so
// each gets its own deck. Opening the phone held upright gives the inner display
// in landscape, so that deck leads; it opens on the two-pane view and pairs the
// closed and open phone. "Two devices" on a Duo deck is that folded + open pair.
// See iphone-duo.md beside SKILL.md.
function duoOuterStarter(): Slide[] {
  return [
    { id: nid(), layout: "hero", label: en("MEET YOUR APP"), headline: en("Everything,\none hand."), screenshot: "" },
    { id: nid(), layout: "device-bottom", label: en("FEATURE 01"), headline: en("One idea\nper screen."), screenshot: "" },
    { id: nid(), layout: "two-devices", label: en("OPEN IT"), headline: en("Open it for\nthe full view."), screenshot: "", screenshotSecondary: "" },
    { id: nid(), layout: "device-top", label: en("FEATURE 02"), headline: en("Flip the contrast."), screenshot: "", inverted: true },
    { id: nid(), layout: "no-device", label: en("MORE"), headline: en("And so\nmuch more."), screenshot: "" },
  ];
}

function duoOuterLandscapeStarter(): Slide[] {
  return [
    { id: nid(), layout: "hero", label: en("TURN IT"), headline: en("Made for the wide view."), screenshot: "" },
    { id: nid(), layout: "split-landscape", label: en("FEATURE 01"), headline: en("One idea\nper screen."), screenshot: "" },
    { id: nid(), layout: "device-top", label: en("FEATURE 02"), headline: en("Flip the contrast."), screenshot: "", inverted: true },
  ];
}

function duoInnerStarter(): Slide[] {
  return [
    { id: nid(), layout: "hero", label: en("UNFOLD IT"), headline: en("Room for\nthe whole view."), screenshot: "" },
    { id: nid(), layout: "device-bottom", label: en("FEATURE 01"), headline: en("One idea\nper screen."), screenshot: "" },
    { id: nid(), layout: "two-devices", label: en("FOLDED + OPEN"), headline: en("Turn it, open it,\nkeep going."), screenshot: "", screenshotSecondary: "" },
    { id: nid(), layout: "device-top", label: en("FEATURE 02"), headline: en("Flip the contrast."), screenshot: "", inverted: true },
  ];
}

// Landscape copy runs across the top in one line; the device is the hero.
function duoInnerLandscapeStarter(): Slide[] {
  return [
    { id: nid(), layout: "hero", label: en("UNFOLD IT"), headline: en("Lead with the two-pane view."), screenshot: "" },
    { id: nid(), layout: "two-devices", label: en("FOLDED + OPEN"), headline: en("Same moment, closed and open."), screenshot: "", screenshotSecondary: "" },
    { id: nid(), layout: "split-landscape", label: en("FEATURE 02"), headline: en("One idea\nper screen."), screenshot: "" },
    { id: nid(), layout: "device-top", label: en("FEATURE 03"), headline: en("Show what only the wide screen can."), screenshot: "", inverted: true },
    { id: nid(), layout: "no-device", label: en("MORE"), headline: en("And so much more."), screenshot: "" },
  ];
}

// App Store creatives: one short brand message each, never a screenshot
// headline. The layout sits inside Apple's art safe area.
function creativeStarter(): Slide[] {
  return [
    { id: nid(), layout: "split-landscape", label: en("NEW"), headline: en("Your app,\nat a glance."), screenshot: "" },
  ];
}

function fgStarter(): Slide[] {
  return [
    {
      id: nid(),
      layout: "feature-graphic",
      label: {},
      headline: en("Your tagline goes here."),
      screenshot: "",
    },
  ];
}

export const DEFAULT_PROJECT: ProjectState = {
  schemaVersion: PROJECT_SCHEMA_VERSION,
  appName: "My App",
  themeId: DEFAULT_THEME_ID,
  fontId: DEFAULT_SCREENSHOT_FONT_ID,
  connectedCanvas: true,
  locales: [DEFAULT_LOCALE],
  locale: DEFAULT_LOCALE,
  device: "iphone",
  orientation: "portrait",
  appIcon: "",
  slidesByDevice: {
    iphone: makeStarterSlides(),
    android: makeStarterSlides(),
    ipad: ipadStarter(),
    tvos: tvStarter(),
    watchos: watchStarter(),
    carplay: carplayStarter(),
    mac: macStarter(),
    "android-7": tabletStarter("7"),
    "android-10": tabletStarter("10"),
    "feature-graphic": fgStarter(),
    "duo-outer": duoOuterStarter(),
    "duo-outer-landscape": duoOuterLandscapeStarter(),
    "duo-inner": duoInnerStarter(),
    "duo-inner-landscape": duoInnerLandscapeStarter(),
    "creative-universal": creativeStarter(),
    "creative-header": creativeStarter(),
    "creative-search": creativeStarter(),
  },
};

export function newSlide(layout: Slide["layout"]): Slide {
  return {
    id: nid(),
    layout,
    label: en("NEW"),
    headline: en("Edit this\nheadline."),
    screenshot: "",
  };
}
