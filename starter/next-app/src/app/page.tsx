"use client";

import { toPng } from "html-to-image";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DeviceKind = "iphone" | "ipad";

interface ExportSize {
  label: string;
  w: number;
  h: number;
}

interface SlideData {
  slug: string;
  kicker: string;
  headline: string;
  support: string;
  theme: "light" | "dark";
  layout: "center" | "offset" | "split";
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const IPHONE_SIZES: readonly ExportSize[] = [
  { label: '6.9"', w: 1320, h: 2868 },
  { label: '6.5"', w: 1284, h: 2778 },
  { label: '6.3"', w: 1206, h: 2622 },
  { label: '6.1"', w: 1125, h: 2436 },
];

const IPAD_SIZES: readonly ExportSize[] = [
  { label: '13" iPad', w: 2064, h: 2752 },
  { label: '12.9" iPad Pro', w: 2048, h: 2732 },
];

const DEVICE_SIZES: Record<DeviceKind, readonly ExportSize[]> = {
  iphone: IPHONE_SIZES,
  ipad: IPAD_SIZES,
};

const SLIDES: readonly SlideData[] = [
  {
    slug: "hero",
    kicker: "HERO BENEFIT",
    headline: "Turn your best feature\ninto the first thing\npeople feel.",
    support:
      "Swap in your real copy, screenshots, and colors. The layout, export flow, and device switching are already wired up.",
    theme: "light",
    layout: "center",
  },
  {
    slug: "focus",
    kicker: "OUTCOME SLIDE",
    headline: "Sell one clear idea\nper screenshot,\nnot five at once.",
    support:
      "Use this slide for one differentiator. Keep the headline short enough to read at thumbnail size.",
    theme: "dark",
    layout: "offset",
  },
  {
    slug: "export",
    kicker: "EXPORT FLOW",
    headline: "Preview fast.\nExport every size.\nStay production-ready.",
    support:
      "The template ships with per-slide export, export-all, numbered filenames, and an iPhone / iPad toggle.",
    theme: "light",
    layout: "split",
  },
];

const PHONE_MOCKUP = {
  width: 1022,
  height: 2082,
  screenLeft: (52 / 1022) * 100,
  screenTop: (46 / 2082) * 100,
  screenWidth: (918 / 1022) * 100,
  screenHeight: (1990 / 2082) * 100,
  screenRx: (126 / 918) * 100,
  screenRy: (126 / 1990) * 100,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  a.click();
}

function buildFileName(
  index: number,
  slide: SlideData,
  size: ExportSize,
  device: DeviceKind,
) {
  const pad = String(index + 1).padStart(2, "0");
  return `${pad}-${device}-${slide.slug}-${size.w}x${size.h}.png`;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

function usePreviewScale(targetWidth: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setScale(Math.min(w / targetWidth, 1));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [targetWidth]);

  return { ref, scale };
}

/* ------------------------------------------------------------------ */
/*  Primitives                                                         */
/* ------------------------------------------------------------------ */

function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 12px",
        borderRadius: "var(--radius-full)",
        background: "var(--success-subtle)",
        color: "var(--success)",
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </span>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 18px",
        borderRadius: "var(--radius-full)",
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "0.01em",
        background: active ? "var(--text-primary)" : "transparent",
        color: active ? "var(--text-inverse)" : "var(--text-secondary)",
        transition: "all var(--transition-fast)",
      }}
    >
      {children}
    </button>
  );
}

function ActionButton({
  variant = "primary",
  disabled,
  onClick,
  children,
}: {
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const styles: Record<string, CSSProperties> = {
    primary: {
      background: "var(--text-primary)",
      color: "var(--text-inverse)",
      boxShadow: "var(--shadow-sm)",
    },
    secondary: {
      background: "var(--surface-primary)",
      color: "var(--text-primary)",
      border: "1px solid var(--border-default)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-secondary)",
    },
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "9px 20px",
        borderRadius: "var(--radius-full)",
        fontSize: "13px",
        fontWeight: 600,
        transition: "all var(--transition-fast)",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen / Mockup components                                         */
/* ------------------------------------------------------------------ */

function ScreenPlaceholder({ title }: { title: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        padding: "14%",
        background:
          "linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        color: "#e2e8f0",
        textAlign: "center",
      }}
    >
      <div>
        <div
          style={{
            width: "48px",
            height: "48px",
            margin: "0 auto 16px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(255,255,255,0.08)",
            display: "grid",
            placeItems: "center",
            fontSize: "20px",
          }}
        >
          📱
        </div>
        <div
          style={{
            fontSize: "1.1rem",
            fontWeight: 600,
            lineHeight: 1.3,
            marginBottom: "8px",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: "0.8rem",
            color: "rgba(226,232,240,0.5)",
            lineHeight: 1.4,
          }}
        >
          Drop your screenshot PNG here
        </div>
      </div>
    </div>
  );
}

function ScreenAsset({ src, fallbackTitle }: { src: string; fallbackTitle: string }) {
  const [err, setErr] = useState(false);

  if (err) return <ScreenPlaceholder title={fallbackTitle} />;

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      onError={() => setErr(true)}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        objectFit: "cover",
        objectPosition: "top",
      }}
    />
  );
}

function PhoneMockup({
  screen,
  style,
}: {
  screen: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: `${PHONE_MOCKUP.width}/${PHONE_MOCKUP.height}`,
        width: "100%",
        ...style,
      }}
    >
      <img
        src="/mockup.png"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      <div
        style={{
          position: "absolute",
          left: `${PHONE_MOCKUP.screenLeft}%`,
          top: `${PHONE_MOCKUP.screenTop}%`,
          width: `${PHONE_MOCKUP.screenWidth}%`,
          height: `${PHONE_MOCKUP.screenHeight}%`,
          overflow: "hidden",
          borderRadius: `${PHONE_MOCKUP.screenRx}% / ${PHONE_MOCKUP.screenRy}%`,
        }}
      >
        {screen}
      </div>
    </div>
  );
}

function IpadMockup({
  screen,
  style,
}: {
  screen: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: "relative", aspectRatio: "770/1000", width: "100%", ...style }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          borderRadius: "5% / 3.6%",
          background: "linear-gradient(180deg, #2c2c2e, #1c1c1e)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 8px 40px rgba(0,0,0,0.42)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "1.2%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "0.9%",
            height: "0.65%",
            borderRadius: "999px",
            background: "#09090b",
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "4%",
            top: "2.8%",
            width: "92%",
            height: "94.4%",
            overflow: "hidden",
            borderRadius: "2.2% / 1.6%",
            background: "#020617",
          }}
        >
          {screen}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Slide Canvas                                                       */
/* ------------------------------------------------------------------ */

function SlideCanvas({
  slide,
  size,
  device,
}: {
  slide: SlideData;
  size: ExportSize;
  device: DeviceKind;
}) {
  const screenshotPath =
    device === "iphone"
      ? `/screenshots/${slide.slug}.png`
      : `/screenshots-ipad/${slide.slug}.png`;

  const isLight = slide.theme === "light";

  const vars = {
    "--s-kicker": isLight ? "#3772ff" : "#93bbff",
    "--s-text": isLight ? "#0f172a" : "#f8fafc",
    "--s-support": isLight ? "#475569" : "#94a3b8",
    "--s-shadow": isLight ? "rgba(15,23,42,0.16)" : "rgba(0,0,0,0.48)",
    "--s-glow-a": isLight ? "rgba(55,114,255,0.12)" : "rgba(55,114,255,0.2)",
    "--s-glow-b": isLight ? "rgba(14,165,233,0.08)" : "rgba(14,165,233,0.16)",
  } as CSSProperties;

  function renderFrame() {
    const screen = (
      <ScreenAsset src={screenshotPath} fallbackTitle={slide.kicker} />
    );
    const isSplit = slide.layout === "split";

    return device === "iphone" ? (
      <PhoneMockup screen={screen} style={{ width: isSplit ? "54%" : "72%" }} />
    ) : (
      <IpadMockup screen={screen} style={{ width: isSplit ? "52%" : "64%" }} />
    );
  }

  return (
    <div
      style={{
        ...vars,
        width: size.w,
        height: size.h,
        position: "relative",
        overflow: "hidden",
        background: isLight
          ? "linear-gradient(165deg, var(--canvas-light-start), var(--canvas-light-end))"
          : "linear-gradient(165deg, var(--canvas-dark-start), var(--canvas-dark-end))",
      }}
    >
      {/* Decorative glow orbs */}
      <div
        style={{
          position: "absolute",
          top: "-14%",
          right: "-8%",
          width: "42%",
          aspectRatio: "1",
          borderRadius: "999px",
          background: "var(--s-glow-a)",
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-8%",
          width: "34%",
          aspectRatio: "1",
          borderRadius: "999px",
          background: "var(--s-glow-b)",
          filter: "blur(60px)",
        }}
      />

      {/* Copy block */}
      <div
        style={{
          position: "absolute",
          left: "8%",
          top: "7%",
          width: "42%",
          zIndex: 2,
        }}
      >
        <div
          style={{
            color: "var(--s-kicker)",
            fontSize: size.w * 0.022,
            fontWeight: 700,
            letterSpacing: "0.14em",
            marginBottom: size.w * 0.02,
          }}
        >
          {slide.kicker}
        </div>
        <h1
          style={{
            margin: 0,
            whiteSpace: "pre-line",
            color: "var(--s-text)",
            fontSize: size.w * (device === "iphone" ? 0.068 : 0.058),
            fontWeight: 700,
            lineHeight: 1.0,
            letterSpacing: "-0.035em",
          }}
        >
          {slide.headline}
        </h1>
        <p
          style={{
            margin: `${size.w * 0.028}px 0 0`,
            color: "var(--s-support)",
            fontSize: size.w * 0.022,
            lineHeight: 1.5,
            maxWidth: "92%",
          }}
        >
          {slide.support}
        </p>
      </div>

      {/* Device placement */}
      {slide.layout === "center" && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "-4%",
            transform: "translateX(-50%)",
            width: device === "iphone" ? "80%" : "72%",
            filter: "drop-shadow(0 24px 48px var(--s-shadow))",
          }}
        >
          {renderFrame()}
        </div>
      )}

      {slide.layout === "offset" && (
        <div
          style={{
            position: "absolute",
            right: device === "iphone" ? "-1%" : "4%",
            bottom: "-2%",
            width: device === "iphone" ? "68%" : "64%",
            transform: "rotate(-4deg)",
            filter: "drop-shadow(0 24px 48px var(--s-shadow))",
          }}
        >
          {renderFrame()}
        </div>
      )}

      {slide.layout === "split" && (
        <>
          <div
            style={{
              position: "absolute",
              left: device === "iphone" ? "-3%" : "5%",
              bottom: "5%",
              width: device === "iphone" ? "48%" : "40%",
              opacity: 0.65,
              transform: "rotate(-8deg)",
              filter: "drop-shadow(0 20px 42px var(--s-shadow))",
            }}
          >
            {renderFrame()}
          </div>
          <div
            style={{
              position: "absolute",
              right: device === "iphone" ? "3%" : "9%",
              bottom: "-1%",
              width: device === "iphone" ? "54%" : "44%",
              filter: "drop-shadow(0 24px 48px var(--s-shadow))",
            }}
          >
            {renderFrame()}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview Card                                                       */
/* ------------------------------------------------------------------ */

function PreviewCard({
  slide,
  size,
  device,
  index,
  onExport,
}: {
  slide: SlideData;
  size: ExportSize;
  device: DeviceKind;
  index: number;
  onExport: () => void;
}) {
  const { ref, scale } = usePreviewScale(size.w);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "var(--radius-xl)",
        border: `1px solid ${hovered ? "var(--border-accent)" : "var(--border-default)"}`,
        background: "var(--surface-primary)",
        boxShadow: hovered ? "var(--shadow-card-hover)" : "var(--shadow-card)",
        transition: "all var(--transition-smooth)",
        overflow: "hidden",
        animation: "fadeIn 400ms ease both",
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Preview area */}
      <div
        ref={ref}
        style={{
          width: "100%",
          height: size.h * scale,
          position: "relative",
          overflow: "hidden",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
          background: "var(--surface-secondary)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: size.w,
            height: size.h,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <SlideCanvas slide={slide} size={size} device={device} />
        </div>
      </div>

      {/* Card footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "22px",
                height: "22px",
                borderRadius: "var(--radius-full)",
                background: "var(--accent-subtle)",
                color: "var(--text-accent)",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              {index + 1}
            </span>
            {slide.slug}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-tertiary)",
              marginTop: "2px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {size.w} × {size.h} · {slide.theme}
          </div>
        </div>

        <button
          type="button"
          onClick={onExport}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 14px",
            borderRadius: "var(--radius-full)",
            background: hovered ? "var(--text-primary)" : "var(--surface-secondary)",
            color: hovered ? "var(--text-inverse)" : "var(--text-secondary)",
            fontSize: "12px",
            fontWeight: 600,
            transition: "all var(--transition-fast)",
            border: hovered ? "none" : "1px solid var(--border-default)",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M6 1.5v7M3 6.5l3 3 3-3M2 10.5h8"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Export
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const [device, setDevice] = useState<DeviceKind>("iphone");
  const [sizeIndex, setSizeIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedCount, setExportedCount] = useState(0);
  const exportRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    if (params.get("device") === "ipad") setDevice("ipad");
  }, []);

  const sizes = DEVICE_SIZES[device];
  const selectedSize = sizes[sizeIndex] ?? sizes[0];

  const registryKey = useMemo(
    () => `${device}-${selectedSize.w}x${selectedSize.h}`,
    [device, selectedSize.w, selectedSize.h],
  );

  useEffect(() => {
    setSizeIndex(0);
  }, [device]);

  const doExport = useCallback(
    async (slide: SlideData, index: number) => {
      const key = `${registryKey}-${slide.slug}`;
      const el = exportRefs.current[key];
      if (!el) return;

      const opts = {
        width: selectedSize.w,
        height: selectedSize.h,
        pixelRatio: 1,
        cacheBust: true,
      };

      await toPng(el, opts);
      const dataUrl = await toPng(el, opts);
      downloadDataUrl(dataUrl, buildFileName(index, slide, selectedSize, device));
    },
    [registryKey, selectedSize, device],
  );

  async function handleExportAll() {
    setIsExporting(true);
    setExportedCount(0);
    try {
      for (const [i, slide] of SLIDES.entries()) {
        await doExport(slide, i);
        setExportedCount(i + 1);
        await wait(300);
      }
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportedCount(0), 2000);
    }
  }

  return (
    <main style={{ minHeight: "100dvh" }}>
      {/* ---- Top bar ---- */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--surface-glass)",
          backdropFilter: "blur(16px) saturate(1.6)",
          WebkitBackdropFilter: "blur(16px) saturate(1.6)",
          borderBottom: "1px solid var(--surface-glass-border)",
        }}
      >
        <div
          style={{
            maxWidth: "1440px",
            margin: "0 auto",
            padding: "14px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          {/* Left: brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-sm)",
                background: "linear-gradient(135deg, #3772ff, #1d4ed8)",
                display: "grid",
                placeItems: "center",
                color: "white",
                fontWeight: 800,
                fontSize: "16px",
                boxShadow: "0 2px 8px rgba(55,114,255,0.3)",
              }}
            >
              S
            </div>
            <div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                }}
              >
                Screenshot Studio
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-tertiary)",
                }}
              >
                {SLIDES.length} slides · {device === "iphone" ? "iPhone" : "iPad"} · {selectedSize.label}
              </div>
            </div>
          </div>

          {/* Center: controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {/* Device toggle */}
            <div
              style={{
                display: "inline-flex",
                padding: "3px",
                borderRadius: "var(--radius-full)",
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <Pill
                active={device === "iphone"}
                onClick={() => setDevice("iphone")}
              >
                iPhone
              </Pill>
              <Pill
                active={device === "ipad"}
                onClick={() => setDevice("ipad")}
              >
                iPad
              </Pill>
            </div>

            {/* Size select */}
            <select
              value={sizeIndex}
              onChange={(e) => setSizeIndex(Number(e.target.value))}
              style={{
                padding: "8px 36px 8px 14px",
                borderRadius: "var(--radius-full)",
                border: "1px solid var(--border-default)",
                background: "var(--surface-primary)",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontWeight: 500,
                appearance: "none",
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234e5d78' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
              }}
            >
              {sizes.map((s, i) => (
                <option key={`${s.w}-${s.h}`} value={i}>
                  {s.label} · {s.w}×{s.h}
                </option>
              ))}
            </select>
          </div>

          {/* Right: actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {isExporting && (
              <Badge>
                <span style={{ animation: "pulse 1s infinite" }}>●</span>
                {exportedCount}/{SLIDES.length}
              </Badge>
            )}
            <ActionButton
              variant="secondary"
              disabled={isExporting}
              onClick={() => void handleExportAll()}
            >
              {isExporting ? "Exporting..." : "Export all"}
            </ActionButton>
          </div>
        </div>
      </header>

      {/* ---- Hero section ---- */}
      <section
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "48px 28px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "start",
            justifyContent: "space-between",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                fontWeight: 750,
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
                color: "var(--text-primary)",
              }}
            >
              Build once.
              <br />
              Export every size.
            </h1>
            <p
              style={{
                marginTop: "12px",
                maxWidth: "520px",
                color: "var(--text-secondary)",
                fontSize: "15px",
                lineHeight: 1.6,
              }}
            >
              Replace the placeholder copy and screenshot files, then use the
              controls above to export production-sized App Store assets.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Slides", value: String(SLIDES.length) },
              { label: "Sizes", value: String(sizes.length) },
              {
                label: "Total exports",
                value: String(SLIDES.length * sizes.length),
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: "16px 24px",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-default)",
                  background: "var(--surface-primary)",
                  minWidth: "100px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: "var(--text-primary)",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-tertiary)",
                    marginTop: "2px",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Grid ---- */}
      <section
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "20px 28px 80px",
          display: "grid",
          gap: "20px",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        }}
      >
        {SLIDES.map((slide, index) => (
          <PreviewCard
            key={`${device}-${selectedSize.w}-${slide.slug}`}
            slide={slide}
            size={selectedSize}
            device={device}
            index={index}
            onExport={() => void doExport(slide, index)}
          />
        ))}
      </section>

      {/* ---- Offscreen export targets ---- */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        {SLIDES.map((slide) => {
          const key = `${registryKey}-${slide.slug}`;
          return (
            <div
              key={key}
              ref={(node) => {
                exportRefs.current[key] = node;
              }}
            >
              <SlideCanvas slide={slide} size={selectedSize} device={device} />
            </div>
          );
        })}
      </div>
    </main>
  );
}
