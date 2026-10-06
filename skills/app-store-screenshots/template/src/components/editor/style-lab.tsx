"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { Check, Dices, Download, FlaskConical, Lock, LockOpen, Shuffle, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEVICE_LABEL, SCREENSHOT_FONTS, THEMES, projectTheme } from "@/lib/constants";
import { renderSlide } from "@/lib/export-render";
import { BACKDROPS, DECORATIONS } from "@/lib/scene";
import {
  LOCK_LABEL,
  NO_LOCKS,
  applyLook,
  canRearrange,
  currentLook,
  directionName,
  generateLook,
  pickDirections,
  savedLookId,
  withLocks,
  type LockKey,
  type Locks,
} from "@/lib/style-lab";
import { cn } from "@/lib/utils";
import type { Look, ProjectState } from "@/lib/types";
import { DeckCanvas, getCanvas } from "./slide-canvas";

type Slot = { direction: string; seed: number };

const PREVIEW_MIN_H = 160;
const PREVIEW_MAX_H = 440;
// Card padding + border inside the scrolling list.
const ROW_CHROME_W = 28;

function slotsFor(round: number): Slot[] {
  return pickDirections(round).map((direction, i) => ({ direction, seed: round * 16 + i + 1 }));
}

export function StyleLab({
  open,
  onOpenChange,
  state,
  onApply,
  onSavedLooksChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: ProjectState;
  onApply: (next: ProjectState, look: Look) => void;
  onSavedLooksChange: (looks: Look[]) => void;
}) {
  const [locks, setLocks] = React.useState<Locks>(NO_LOCKS);
  const [round, setRound] = React.useState(0);
  const [slots, setSlots] = React.useState<Slot[]>(() => slotsFor(0));
  const [exporting, setExporting] = React.useState(false);
  const boardRef = React.useRef<HTMLDivElement>(null);
  const [listWidth, setListWidth] = React.useState(0);
  const listObserver = React.useRef<ResizeObserver | null>(null);
  // Callback ref: the list only exists while the dialog is open.
  const listRef = React.useCallback((node: HTMLDivElement | null) => {
    listObserver.current?.disconnect();
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setListWidth(entry.contentRect.width));
    observer.observe(node);
    listObserver.current = observer;
  }, []);

  const slides = state.slidesByDevice[state.device] || [];
  const rearrange = canRearrange(state.device, state.orientation);
  const saved = state.savedLooks || [];
  const base = React.useMemo(() => currentLook(state), [state]);
  const looks = React.useMemo(
    () => slots.map((slot) => withLocks(generateLook(slot.direction, slot.seed), base, locks)),
    [slots, base, locks],
  );
  // Size every deck preview so the whole strip fits the row without scrolling.
  const { cW, cH } = getCanvas(state.device, state.orientation);
  const previewH = Math.round(
    Math.max(
      PREVIEW_MIN_H,
      Math.min(PREVIEW_MAX_H, (listWidth - ROW_CHROME_W) / (Math.max(1, slides.length) * (cW / cH))),
    ),
  ) || PREVIEW_MIN_H;
  const allLocked = (Object.keys(locks) as LockKey[]).every((key) => locks[key] || (key === "layout" && !rearrange));

  function shuffle() {
    const next = round + 1;
    setRound(next);
    setSlots(slotsFor(next));
  }

  function remix(index: number) {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, seed: slot.seed + 1009 } : slot)));
  }

  function apply(look: Look) {
    onApply(applyLook(state, look, locks), look);
    onOpenChange(false);
  }

  function toggleSaved(look: Look) {
    const existing = saved.find((s) => s.id === look.id);
    if (existing) {
      onSavedLooksChange(saved.filter((s) => s.id !== look.id));
      return;
    }
    onSavedLooksChange([...saved, { ...look, id: savedLookId(look, saved) }]);
    toast.success("Look saved", { description: "Find it under Saved looks in Style Lab." });
  }

  async function exportComparison() {
    if (exporting) return;
    setExporting(true);
    try {
      // Let the board mount and lay out before capturing it.
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await document.fonts?.ready;
      const el = boardRef.current;
      if (!el) throw new Error("Comparison board did not render");
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const rendered = await renderSlide(el, w, h, "#F4F3EF");
      const png = await rendered.toPng(w, h);
      const url = URL.createObjectURL(new Blob([png as BlobPart], { type: "image/png" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug(state.appName)}-style-lab.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("Comparison image exported");
    } catch (error) {
      toast.error("Couldn't export the comparison", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setExporting(false);
    }
  }

  const rows: { key: string; title: string; look: Look; current?: boolean }[] = [
    { key: "current", title: "Current", look: base, current: true },
    ...looks.map((look, i) => ({ key: `slot-${i}`, title: look.name, look })),
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !exporting && onOpenChange(next)}>
      <DialogContent className="flex h-[92vh] max-w-[min(1240px,96vw)] flex-col gap-0 p-0">
        <DialogHeader className="space-y-1 border-b px-5 pb-3 pt-4 text-left">
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" /> Style Lab
          </DialogTitle>
          <DialogDescription>
            Four complete looks for your {DEVICE_LABEL[state.device]} deck. Lock what you like, shuffle the rest, apply
            one. Your screenshots and copy stay as they are.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 border-b px-5 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">Keep</span>
          {(Object.keys(LOCK_LABEL) as LockKey[]).map((key) => {
            const unavailable = key === "layout" && !rearrange;
            const on = locks[key] || unavailable;
            return (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={on ? "secondary" : "outline"}
                className="h-7 gap-1.5 px-2.5 text-xs"
                aria-pressed={on}
                disabled={unavailable}
                title={unavailable ? "This device keeps its own layouts" : `${LOCK_LABEL[key].hint}. ${on ? "Kept from your deck." : "Varies between looks."}`}
                onClick={() => setLocks((prev) => ({ ...prev, [key]: !prev[key] }))}
              >
                {on ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                {LOCK_LABEL[key].name}
              </Button>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => void exportComparison()}
              disabled={exporting || slides.length === 0}
              title="Download one image comparing your deck with these looks"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? "Exporting…" : "Export comparison"}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5"
              onClick={shuffle}
              disabled={allLocked}
              title={allLocked ? "Unlock something to shuffle it" : "Four new looks"}
            >
              <Shuffle className="h-3.5 w-3.5" />
              Shuffle
            </Button>
          </div>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/30 px-5 py-4" data-testid="style-lab-looks">
          {slides.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Add a screen to try looks on it.</p>
          ) : (
            <>
              {rows.map((row, i) => (
                <LookRow
                  key={row.key}
                  title={row.title}
                  look={row.look}
                  project={row.current ? state : applyLook(state, row.look, locks)}
                  height={previewH}
                  current={row.current}
                  actions={
                    row.current ? (
                      <span className="text-[11px] text-muted-foreground">Your deck now</span>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => remix(i - 1)}
                          aria-label={`Remix ${row.title}`}
                          title="Another take on this direction"
                        >
                          <Dices className="h-3.5 w-3.5" />
                          Remix
                        </Button>
                        <SaveButton saved={saved.some((s) => s.id === row.look.id)} onClick={() => toggleSaved(row.look)} name={row.title} />
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 gap-1 px-2.5 text-xs"
                          onClick={() => apply(row.look)}
                          aria-label={`Apply ${row.title}`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Apply
                        </Button>
                      </>
                    )
                  }
                />
              ))}

              {saved.length > 0 && (
                <div className="space-y-3 pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved looks</h3>
                  {saved.map((look) => (
                    <LookRow
                      key={`saved-${look.id}`}
                      title={look.name}
                      look={look}
                      project={applyLook(state, look, locks)}
                      height={previewH}
                      actions={
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:text-destructive"
                            onClick={() => onSavedLooksChange(saved.filter((s) => s.id !== look.id))}
                            aria-label={`Remove saved look ${look.name}`}
                            title="Remove from saved looks"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 gap-1 px-2.5 text-xs"
                            onClick={() => apply(look)}
                            aria-label={`Apply saved look ${look.name}`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Apply
                          </Button>
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
      {exporting &&
        createPortal(
          <ComparisonBoard
            ref={boardRef}
            appName={state.appName}
            rows={rows.map((row) => ({
              title: row.current ? "Current" : row.title,
              project: row.current ? state : applyLook(state, row.look, locks),
            }))}
          />,
          document.body,
        )}
    </Dialog>
  );
}

function SaveButton({ saved, onClick, name }: { saved: boolean; onClick: () => void; name: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 gap-1 px-2 text-xs"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={`${saved ? "Unsave" : "Save"} ${name}`}
      title={saved ? "Remove from saved looks" : "Keep this look for later"}
    >
      <Star className={cn("h-3.5 w-3.5", saved && "fill-amber-400 text-amber-500")} />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}

function describe(look: Look) {
  const font = SCREENSHOT_FONTS[look.fontId]?.name.replace(" (default)", "") ?? look.fontId;
  const backdrop = BACKDROPS.find((b) => b.id === look.scene.backdrop)?.name ?? look.scene.backdrop;
  const decoration = DECORATIONS.find((d) => d.id === look.scene.decoration)?.name;
  return [
    THEMES[look.themeId]?.name,
    font,
    `${backdrop}${look.scene.span ? " (flowing)" : ""}`,
    look.scene.decoration !== "none" ? decoration : null,
    look.scene.tilt ? `${look.scene.tilt}° tilt` : null,
    look.scene.headlineCase === "upper" ? "Uppercase" : null,
  ].filter(Boolean).join(" · ");
}

function LookRow({
  title,
  look,
  project,
  height,
  current,
  actions,
}: {
  title: string;
  look: Look;
  project: ProjectState;
  height: number;
  current?: boolean;
  actions: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={cn("rounded-lg border bg-card p-3 shadow-sm", current && "border-dashed bg-card/60")}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{title}</h3>
            {!current && look.direction && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {directionName(look.direction)}
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-muted-foreground">{describe(look)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
      <div className="overflow-x-auto">
        <DeckPreview project={project} height={height} />
      </div>
    </section>
  );
}

function fontFamilyOf(project: ProjectState) {
  return SCREENSHOT_FONTS[project.fontId || "template-default"].family;
}

/** A whole deck, scaled to `height`, exactly as the export would render it. */
function DeckPreview({ project, height }: { project: ProjectState; height: number }) {
  const slides = project.slidesByDevice[project.device] || [];
  const { cW, cH } = getCanvas(project.device, project.orientation);
  const scale = height / cH;
  return (
    <div
      className="relative overflow-hidden rounded-md"
      style={{ width: slides.length * cW * scale, height }}
      aria-hidden
    >
      <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "top left", transform: `scale(${scale})` }}>
        <DeckCanvas
          slides={slides}
          device={project.device}
          orientation={project.orientation}
          theme={projectTheme(project.themeId, project.themeColors)}
          locale={project.locale}
          appName={project.appName}
          appIcon={project.appIcon}
          fontFamily={fontFamilyOf(project)}
          connectedCanvas={project.connectedCanvas}
          scene={project.scene}
          hideEmpty
        />
      </div>
    </div>
  );
}

const BOARD_ROW_H = 520;
const BOARD_PAD = 72;
const BOARD_MAX_W = 12000;

// Offscreen board captured for "Export comparison". Lives at the page origin
// (behind the app) because html-to-image needs an untransformed node.
const ComparisonBoard = React.forwardRef<
  HTMLDivElement,
  { appName: string; rows: { title: string; project: ProjectState }[] }
>(function ComparisonBoard({ appName, rows }, ref) {
  const first = rows[0].project;
  const { cW, cH } = getCanvas(first.device, first.orientation);
  const count = (first.slidesByDevice[first.device] || []).length;
  // Stay well under Safari's canvas limit for long or landscape decks.
  const rowH = Math.min(BOARD_ROW_H, Math.floor((BOARD_MAX_W - BOARD_PAD * 2) / Math.max(1, count) / (cW / cH)));
  const stripW = Math.ceil(count * cW * (rowH / cH));
  const width = Math.max(stripW, 960) + BOARD_PAD * 2;
  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: -1,
        pointerEvents: "none",
        width,
        padding: BOARD_PAD,
        background: "#F4F3EF",
        color: "#141413",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ fontSize: 22, letterSpacing: 2, textTransform: "uppercase", opacity: 0.55, fontWeight: 600 }}>Style Lab</div>
      <div style={{ fontSize: 56, fontWeight: 700, marginTop: 6, marginBottom: 40 }}>{appName || "My App"}</div>
      {rows.map((row) => (
        <div key={row.title} style={{ marginBottom: 44 }}>
          <div style={{ fontSize: 26, fontWeight: 600, marginBottom: 14 }}>{row.title}</div>
          <DeckPreview project={row.project} height={rowH} />
        </div>
      ))}
    </div>
  );
});

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "screenshots";
}
