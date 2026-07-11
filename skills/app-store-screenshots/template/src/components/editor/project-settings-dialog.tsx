"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Languages, Palette, Plus, Settings2, Trash2, Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { THEMES } from "@/lib/constants";
import { addVariant, removeVariant, renameVariant } from "@/lib/project-model";
import { runPreflight } from "@/lib/preflight";
import { activeTheme, createCustomTheme, deleteCustomTheme, updateActiveTheme } from "@/lib/theme-model";
import type { ProjectState, Theme } from "@/lib/types";

export type ProjectSettingsTab = "theme" | "locales" | "variants" | "canvas" | "preflight";

export function ProjectSettingsDialog({ open, tab, state, onOpenChange, onTabChange, onChange }: {
  open: boolean;
  tab: ProjectSettingsTab;
  state: ProjectState;
  onOpenChange: (open: boolean) => void;
  onTabChange: (tab: ProjectSettingsTab) => void;
  onChange: (update: (state: ProjectState) => ProjectState) => void;
}) {
  const report = React.useMemo(() => runPreflight(state), [state]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Project tools</DialogTitle>
          <DialogDescription>Theme, localization, variants, canvas behavior, and automated store preflight.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(value) => onTabChange(value as ProjectSettingsTab)} className="min-h-0">
          <TabsList className="grid h-auto w-full grid-cols-5">
            <TabsTrigger value="theme" className="gap-1 px-2"><Palette className="h-3.5 w-3.5" />Theme</TabsTrigger>
            <TabsTrigger value="locales" className="gap-1 px-2"><Languages className="h-3.5 w-3.5" />Locales</TabsTrigger>
            <TabsTrigger value="variants" className="gap-1 px-2"><Variable className="h-3.5 w-3.5" />Variants</TabsTrigger>
            <TabsTrigger value="canvas" className="gap-1 px-2"><Settings2 className="h-3.5 w-3.5" />Canvas</TabsTrigger>
            <TabsTrigger value="preflight" className="gap-1 px-2"><AlertTriangle className="h-3.5 w-3.5" />Preflight</TabsTrigger>
          </TabsList>
          <div className="max-h-[62vh] overflow-y-auto pr-1">
            <TabsContent value="theme"><ThemeEditor state={state} onChange={onChange} /></TabsContent>
            <TabsContent value="locales"><LocaleEditor state={state} onChange={onChange} /></TabsContent>
            <TabsContent value="variants"><VariantEditor state={state} onChange={onChange} /></TabsContent>
            <TabsContent value="canvas"><CanvasEditor state={state} onChange={onChange} /></TabsContent>
            <TabsContent value="preflight"><PreflightPanel state={state} report={report} onNavigate={(issue) => onChange((current) => ({ ...current, activeVariantId: issue.variantId || current.activeVariantId, device: issue.device || current.device, locale: issue.locale || current.locale }))} /></TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ThemeEditor({ state, onChange }: EditorProps) {
  const theme = activeTheme(state);
  const allThemes = [...Object.values(THEMES), ...Object.values(state.customThemes)];
  const patch = (value: Partial<Theme>) => onChange((current) => updateActiveTheme(current, value));
  return <Panel title="Theme editor" description="Editing a built-in theme creates a custom copy, so defaults remain stable.">
    <div className="flex gap-2">
      <Select value={state.themeId} onValueChange={(themeId) => onChange((current) => ({ ...current, themeId }))}>
        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
        <SelectContent>{allThemes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
      </Select>
      <Button variant="outline" onClick={() => onChange((current) => createCustomTheme(current))}><Plus className="h-4 w-4" />Duplicate</Button>
      <Button variant="ghost" size="icon" disabled={!state.customThemes[state.themeId]} onClick={() => onChange((current) => deleteCustomTheme(current, current.themeId))}><Trash2 className="h-4 w-4" /></Button>
    </div>
    <Field label="Name"><Input aria-label="Theme name" value={theme.name} onChange={(event) => patch({ name: event.target.value })} /></Field>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <ColorField label="Background" value={theme.bg} onChange={(bg) => patch({ bg })} />
      <ColorField label="Alternate" value={theme.bgAlt} onChange={(bgAlt) => patch({ bgAlt })} />
      <ColorField label="Text" value={theme.fg} onChange={(fg) => patch({ fg })} />
      <ColorField label="Alternate text" value={theme.fgAlt} onChange={(fgAlt) => patch({ fgAlt })} />
      <ColorField label="Accent" value={theme.accent} onChange={(accent) => patch({ accent })} />
      <ColorField label="Muted" value={theme.muted} onChange={(muted) => patch({ muted })} />
    </div>
    <div className="grid grid-cols-2 gap-3"><Field label="Body font stack"><Input aria-label="Body font stack" value={theme.fontFamily || ""} onChange={(event) => patch({ fontFamily: event.target.value })} /></Field><Field label="Headline font stack"><Input aria-label="Headline font stack" value={theme.headlineFontFamily || ""} onChange={(event) => patch({ headlineFontFamily: event.target.value })} /></Field></div>
    <div className="grid grid-cols-2 gap-3"><Field label="Background CSS"><Input aria-label="Background CSS" value={theme.background || ""} placeholder="linear-gradient(...)" onChange={(event) => patch({ background: event.target.value || undefined })} /></Field><Field label="Corner radius"><Input aria-label="Corner radius" type="number" min={0} value={theme.cornerRadius || 0} onChange={(event) => patch({ cornerRadius: Number(event.target.value) })} /></Field></div>
  </Panel>;
}

function LocaleEditor({ state, onChange }: EditorProps) {
  const [draft, setDraft] = React.useState("");
  const add = () => {
    const locale = draft.trim().toLowerCase().replace(/_/g, "-");
    if (!locale || state.locales.includes(locale)) return;
    onChange((current) => ({ ...current, locales: [...current.locales, locale], locale }));
    setDraft("");
  };
  return <Panel title="Localization" description="Copy and text layers can hold a value per locale; missing values are reported by preflight.">
    <div className="flex gap-2"><Input aria-label="New locale" value={draft} placeholder="fr, de-DE, ja" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") add(); }} /><Button onClick={add}><Plus className="h-4 w-4" />Add locale</Button></div>
    <div className="space-y-1 rounded-md border p-2">{state.locales.map((locale) => {
      const completion = localeCompletion(state, locale);
      return <div key={locale} className={`flex items-center gap-3 rounded px-2 py-2 ${state.locale === locale ? "bg-primary/10" : ""}`}>
        <button className="w-20 text-left text-sm font-semibold uppercase" onClick={() => onChange((current) => ({ ...current, locale }))}>{locale}</button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${completion}%` }} /></div>
        <span className="w-10 text-right text-xs text-muted-foreground">{completion}%</span>
        <Button variant="ghost" size="icon" disabled={state.locales.length === 1} onClick={() => onChange((current) => ({ ...current, locales: current.locales.filter((item) => item !== locale), locale: current.locale === locale ? current.locales.find((item) => item !== locale) || "en" : current.locale }))}><Trash2 className="h-4 w-4" /></Button>
      </div>;
    })}</div>
  </Panel>;
}

function VariantEditor({ state, onChange }: EditorProps) {
  const [draft, setDraft] = React.useState("Variant");
  return <Panel title="Creative variants" description="Each variant carries a complete set of device decks and is included in the export bundle.">
    <div className="flex gap-2"><Input aria-label="New variant name" value={draft} onChange={(event) => setDraft(event.target.value)} /><Button onClick={() => onChange((current) => addVariant(current, draft))}><Plus className="h-4 w-4" />Clone active</Button></div>
    <div className="space-y-2">{state.variants.map((variant) => <div key={variant.id} className={`flex items-center gap-2 rounded-md border p-2 ${state.activeVariantId === variant.id ? "border-primary bg-primary/5" : ""}`}>
      <input type="radio" checked={state.activeVariantId === variant.id} onChange={() => onChange((current) => ({ ...current, activeVariantId: variant.id }))} aria-label={`Select ${variant.name}`} />
      <Input aria-label={`Variant name: ${variant.name}`} value={variant.name} onChange={(event) => onChange((current) => renameVariant(current, variant.id, event.target.value))} />
      <Button variant="ghost" size="icon" disabled={state.variants.length === 1} onClick={() => onChange((current) => removeVariant(current, variant.id))}><Trash2 className="h-4 w-4" /></Button>
    </div>)}</div>
  </Panel>;
}

function CanvasEditor({ state, onChange }: EditorProps) {
  const patch = (value: Partial<ProjectState["canvasSettings"]>) => onChange((current) => ({ ...current, canvasSettings: { ...current.canvasSettings, ...value } }));
  return <Panel title="Canvas assistance" description="Guides are editor-only and never appear in exported artwork.">
    <Toggle label="Snapping" description="Snap to the grid, canvas center, safe edges, and nearby layers." checked={state.canvasSettings.snapping} onChange={(snapping) => patch({ snapping })} />
    <div className="grid grid-cols-2 gap-3"><Field label="Grid size (px)"><Input aria-label="Grid size" type="number" min={1} value={state.canvasSettings.snapSize} onChange={(event) => patch({ snapSize: Math.max(1, Number(event.target.value)) })} /></Field><Field label="Safe area (%)"><Input aria-label="Safe area percent" type="number" min={0} max={40} value={state.canvasSettings.safeAreaPercent} onChange={(event) => patch({ safeAreaPercent: Math.max(0, Math.min(40, Number(event.target.value))) })} /></Field></div>
    <Toggle label="Rulers" description="Show calibrated rulers on the top and left edges." checked={state.canvasSettings.showRulers} onChange={(showRulers) => patch({ showRulers })} />
    <Toggle label="Safe-area overlay" description="Highlight the recommended content boundary." checked={state.canvasSettings.showSafeAreas} onChange={(showSafeAreas) => patch({ showSafeAreas })} />
  </Panel>;
}

function PreflightPanel({ state, report, onNavigate }: { state: ProjectState; report: ReturnType<typeof runPreflight>; onNavigate: (issue: ReturnType<typeof runPreflight>["issues"][number]) => void }) {
  return <Panel title="Automated preflight" description="Runs continuously across every variant, device, and locale.">
    <div className={`flex items-center gap-3 rounded-md border p-3 ${report.passed ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
      {report.passed ? <CheckCircle2 className="h-6 w-6 text-green-600" /> : <AlertTriangle className="h-6 w-6 text-destructive" />}
      <div><div className="font-medium">{report.passed ? "Ready to export" : `${report.errors} blocking error${report.errors === 1 ? "" : "s"}`}</div><div className="text-xs text-muted-foreground">{report.warnings} warning{report.warnings === 1 ? "" : "s"} · {state.variants.length} variant{state.variants.length === 1 ? "" : "s"} checked</div></div>
    </div>
    <div className="space-y-2">{report.issues.map((issue) => <button key={issue.id} className="flex w-full items-start gap-3 rounded-md border p-3 text-left hover:bg-muted/50" onClick={() => onNavigate(issue)}>
      <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${issue.severity === "error" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700"}`}>{issue.severity}</span>
      <span><span className="block text-sm font-medium">{issue.title}</span><span className="block text-xs text-muted-foreground">{issue.detail}</span></span>
    </button>)}{!report.issues.length && <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">No issues found.</div>}</div>
  </Panel>;
}

type EditorProps = { state: ProjectState; onChange: (update: (state: ProjectState) => ProjectState) => void };
function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="space-y-4 py-2"><div><h3 className="font-semibold">{title}</h3><p className="text-sm text-muted-foreground">{description}</p></div>{children}</section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>; }
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Field label={label}><div className="flex gap-2"><Input aria-label={`${label} color picker`} type="color" value={value} onChange={(event) => onChange(event.target.value)} className="w-12 px-1" /><Input aria-label={`${label} color`} value={value} onChange={(event) => onChange(event.target.value)} /></div></Field>; }
function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border p-3"><span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{description}</span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>; }
function localeCompletion(state: ProjectState, locale: string) {
  let complete = 0;
  let total = 0;
  for (const variant of state.variants) for (const slides of Object.values(variant.slidesByDevice)) for (const slide of slides) {
    total += 1; if (slide.headline[locale]?.trim()) complete += 1;
    for (const layer of slide.layers || []) if (layer.kind === "text") { total += 1; if (layer.text[locale]?.trim()) complete += 1; }
  }
  return total ? Math.round(complete / total * 100) : 100;
}
