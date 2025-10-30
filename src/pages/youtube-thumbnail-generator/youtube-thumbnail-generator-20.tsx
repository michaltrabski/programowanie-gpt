import React, { useRef, useState, useEffect, useCallback } from "react";

// --- Constants/constants
const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;
const MAIN_FONT_SIZES = [32, 40, 50, 60, 72];
const SEC_FONT_SIZES = [18, 22, 26, 32, 40];
const PRESET_COLORS = ["#F44242", "#F58D2D", "#F8D94F", "#43d964", "#5183f9"];
const TEXT_COLORS = ["#FFFFFF", "#222222", "#E3E3E3", "#000000", "#FFD700", "#00FFBE", "#EF40EA", "#FF3800", "#22AAFF"];
const ARROW_COLORS = ["#FFFFFF", "#222222", "#F44242", "#43D964", "#5183F9", "#FFDA00", "#FF3800", "#EF40EA"];

const LOCALSTORAGE_KEY = "overlay_image_editor_v1";
const LOCALSTORAGE_THEME_KEY = "overlay_image_editor_theme";

// --- Types ---
type Vec2 = { x: number; y: number };
type OverlayState = {
  mainText: string;
  secondaryText: string;
  mainBgIdx: number;
  secBgIdx: number;
  mainFontSize: number;
  secFontSize: number;
  mainAlpha: number;
  secAlpha: number;
  mainTextColor: string;
  secTextColor: string;
  mainRadius: number;
  secRadius: number;
  mainPos: Vec2;
  secondaryPos: Vec2;
  showArrow: boolean;
  arrowPos: Vec2;
  arrowAngle: number;
  arrowColor: string;
  arrowSize: number;
};
// Default initial state
const DEFAULT_OVERLAY: OverlayState = {
  mainText: "",
  secondaryText: "",
  mainBgIdx: 0,
  secBgIdx: 1,
  mainFontSize: MAIN_FONT_SIZES[1],
  secFontSize: SEC_FONT_SIZES[2],
  mainAlpha: 0.76,
  secAlpha: 0.75,
  mainTextColor: "#FFFFFF",
  secTextColor: "#FFFFFF",
  mainRadius: 28,
  secRadius: 21,
  mainPos: { x: 0.5, y: 0.5 },
  secondaryPos: { x: 0.5, y: 0.72 },
  showArrow: false,
  arrowPos: { x: 0.9, y: 0.2 },
  arrowAngle: -45,
  arrowColor: "#FFFFFF",
  arrowSize: 220,
};
// --- Utility Fns ---
function colorWithAlpha(color: string, alpha: number): string {
  if (color.startsWith("rgba(")) {
    const nums = color
      .replace(/^rgba\(|\)$/g, "")
      .split(",")
      .map((s) => s.trim());
    const [r, g, b] = nums.slice(0, 3).map(Number);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (color.startsWith("rgb(")) {
    const nums = color
      .replace(/^rgb\(|\)$/g, "")
      .split(",")
      .map((s) => s.trim());
    const [r, g, b] = nums.slice(0, 3).map(Number);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((h) => h + h)
        .join("");
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
  }
  return color;
}
function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}
function getDominantColors(img: HTMLImageElement, numColors: number): string[] {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const scale = 80;
    canvas.width = scale;
    canvas.height = scale;
    ctx.drawImage(img, 0, 0, scale, scale);
    const { data } = ctx.getImageData(0, 0, scale, scale);
    const buckets: Record<string, number> = {};
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 72) continue;
      const key = [
        Math.round(data[i] / 32) * 32,
        Math.round(data[i + 1] / 32) * 32,
        Math.round(data[i + 2] / 32) * 32,
      ].join(",");
      buckets[key] = (buckets[key] || 0) + 1;
    }
    const sorted = Object.entries(buckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, numColors);
    const colors = sorted.map(([rgb]) => {
      const [r, g, b] = rgb.split(",").map(Number);
      return `rgb(${r},${g},${b})`;
    });
    return colors;
  } catch {
    return [];
  }
}
function drawArrowOnCanvas(
  ctx: CanvasRenderingContext2D,
  options: {
    x: number;
    y: number;
    angleDeg: number;
    size: number;
    color: string;
    lineW?: number;
  }
) {
  const { x, y, angleDeg, size, color, lineW } = options;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((Math.PI / 180) * angleDeg);
  ctx.beginPath();
  ctx.moveTo(-size * 0.45, 0);
  ctx.lineTo(size * 0.35, 0);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW || size / 13;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size * 0.35, 0);
  ctx.lineTo(size * 0.21, -size * 0.17);
  ctx.moveTo(size * 0.35, 0);
  ctx.lineTo(size * 0.21, size * 0.17);
  ctx.stroke();
  ctx.restore();
}
function toHex6(color: string): string {
  if (typeof color === "string" && color.startsWith("#") && color.length === 4) {
    const r = color[1],
      g = color[2],
      b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return color;
}
// --- Storage FNs
function loadPersistedState(): Partial<OverlayState> | undefined {
  try {
    const s = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!s) return undefined;
    return JSON.parse(s) as Partial<OverlayState>;
  } catch {
    return undefined;
  }
}
function savePersistedState(state: Partial<OverlayState>) {
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(state));
  } catch {}
}
function loadTheme(): "dark" | "light" {
  try {
    const t = localStorage.getItem(LOCALSTORAGE_THEME_KEY);
    return t === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}
function saveTheme(theme: "dark" | "light") {
  try {
    localStorage.setItem(LOCALSTORAGE_THEME_KEY, theme);
  } catch {}
}

// --- Main OverlayImageEditor Component
const OverlayImageEditor: React.FC = () => {
  // Theme
  const [theme, setTheme] = useState<"light" | "dark">(loadTheme());

  // --- Image state
  const [image, setImage] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>(PRESET_COLORS);
  // --- OverlayState & JSON Editing
  const [overlayState, setOverlayState] = useState<OverlayState>({
    ...DEFAULT_OVERLAY,
    ...(loadPersistedState() ?? {}),
  });
  const [overlayStateJson, setOverlayStateJson] = useState<string>(() =>
    JSON.stringify({ ...DEFAULT_OVERLAY, ...(loadPersistedState() ?? {}) }, null, 2)
  );
  const [overlayStateJsonError, setOverlayStateJsonError] = useState<string>("");

  // --- Refs ---
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // --- Which overlay is being dragged ("main", "sec", "arrow", or null)
  const [draggingDot, setDraggingDot] = useState<"main" | "sec" | "arrow" | null>(null);

  // Cursor offsets inside drag dot when pointer down
  const dragDotOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Arrow rotation/resize (handle dragging)
  const [arrowResizeDragging, setArrowResizeDragging] = useState(false);
  const arrowResizeOrigin = useRef<{
    ox: number;
    oy: number;
    oAngle: number;
    oSize: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Pick up overlayState values
  const state = overlayState; // just so we can "destructure"
  const {
    mainText,
    secondaryText,
    mainBgIdx,
    secBgIdx,
    mainFontSize,
    secFontSize,
    mainAlpha,
    secAlpha,
    mainTextColor,
    secTextColor,
    mainRadius,
    secRadius,
    mainPos,
    secondaryPos,
    showArrow,
    arrowPos,
    arrowAngle,
    arrowColor,
    arrowSize,
  } = state;

  // --- Persist overlayState and JSON textarea on state change
  useEffect(() => {
    setOverlayStateJson(JSON.stringify(overlayState, null, 2));
    savePersistedState(overlayState);
  }, [overlayState]);
  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  // --- Load image logic
  function loadImage(file: File) {
    if (!file || !file.type.startsWith("image/")) return;
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {}
      objectUrlRef.current = null;
    }
    const imgUrl = URL.createObjectURL(file);
    objectUrlRef.current = imgUrl;
    setImage(imgUrl);

    // Load overlay config (includes possibly user's saved position!)
    const persisted = loadPersistedState() ?? {};
    setOverlayState({ ...DEFAULT_OVERLAY, ...persisted });
    setOverlayStateJson(JSON.stringify({ ...DEFAULT_OVERLAY, ...persisted }, null, 2));
    setPalette(PRESET_COLORS);
  }
  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        try {
          URL.revokeObjectURL(objectUrlRef.current);
        } catch {}
        objectUrlRef.current = null;
      }
    },
    []
  );
  // Update palette when image loads
  useEffect(() => {
    if (!image) {
      setPalette(PRESET_COLORS);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      const extracted = getDominantColors(img, 4);
      setPalette([...PRESET_COLORS, ...extracted.filter(Boolean)]);
      setOverlayState((prev) => ({ ...prev, mainBgIdx: 0, secBgIdx: 1 }));
    };
    // eslint-disable-next-line
  }, [image]);

  // --- Handle drop/click file
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) loadImage(file);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) loadImage(file);
  };

  // --- Dot drag handlers for overlays ---
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!previewRef.current || !draggingDot) return;
      const bounds = previewRef.current.getBoundingClientRect();
      const px = Math.max(0, Math.min(bounds.width, e.clientX - bounds.left));
      const py = Math.max(0, Math.min(bounds.height, e.clientY - bounds.top));
      let x = px / bounds.width,
        y = py / bounds.height;
      // Clamp to safe edges
      x = Math.max(0.01, Math.min(0.99, x));
      y = Math.max(0.01, Math.min(0.99, y));
      // Main/Sec: center at text box
      if (draggingDot === "main") setOverlayState((v) => ({ ...v, mainPos: { x, y } }));
      if (draggingDot === "sec") setOverlayState((v) => ({ ...v, secondaryPos: { x, y } }));
      if (draggingDot === "arrow") setOverlayState((v) => ({ ...v, arrowPos: { x, y } }));
    }
    function onPointerUp() {
      setDraggingDot(null);
    }
    if (draggingDot) {
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [draggingDot]);

  // --- Arrow resize/rotate drag handler
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!arrowResizeDragging || !showArrow) return;
      if (!previewRef.current || !arrowResizeOrigin.current) return;
      const bounds = previewRef.current.getBoundingClientRect();
      const ax = arrowPos.x * bounds.width;
      const ay = arrowPos.y * bounds.height;
      const px = e.clientX - bounds.left;
      const py = e.clientY - bounds.top;
      // Compute vector orig: anchor -> pointer
      const dx = px - ax,
        dy = py - ay;
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      // Clamp size
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ARROW_MIN_SIZE = 30,
        ARROW_MAX_SIZE = 600;
      let size = Math.max(ARROW_MIN_SIZE, Math.min(ARROW_MAX_SIZE, dist * 2.1));
      setOverlayState((v) => ({ ...v, arrowAngle: ang, arrowSize: size }));
    }
    function onPointerUp() {
      setArrowResizeDragging(false);
      arrowResizeOrigin.current = null;
    }
    if (arrowResizeDragging && showArrow) {
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      return () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };
    }
  }, [arrowResizeDragging, showArrow, arrowPos.x, arrowPos.y]);

  // --- Download PNG as export ---
  const handleDownload = () => {
    if (!image) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = IMAGE_WIDTH;
      canvas.height = IMAGE_HEIGHT;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
      // Cover crop (center-crop to 1920x1080)
      const iw = img.width,
        ih = img.height,
        ir = iw / ih,
        wr = IMAGE_WIDTH / IMAGE_HEIGHT;
      let sw: number, sh: number, sx: number, sy: number;
      if (ir > wr) {
        // Image is wider: crop left+right
        sh = ih;
        sw = sh * wr;
        sx = (iw - sw) / 2;
        sy = 0;
      } else {
        // Image is taller: crop top/bottom
        sw = iw;
        sh = sw / wr;
        sx = 0;
        sy = (ih - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

      // Main
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `500 ${mainFontSize}px Inter, Arial,sans-serif`;
      const mainDisplayText = mainText.trim() ? mainText : " ";
      const mainMetrics = ctx.measureText(mainDisplayText);
      const mainPX = 54,
        mainPY = 26,
        mainRad = mainRadius;
      const mainW = mainMetrics.width + mainPX * 2;
      const mainH = mainFontSize + mainPY * 2;
      const mainX = mainPos.x * IMAGE_WIDTH;
      const mainY = mainPos.y * IMAGE_HEIGHT;
      ctx.globalAlpha = mainAlpha;
      ctx.fillStyle = palette[mainBgIdx] ?? "#222";
      drawRoundRect(ctx, mainX - mainW / 2, mainY - mainH / 2, mainW, mainH, mainRad);
      ctx.globalAlpha = 1;
      ctx.fillStyle = mainTextColor;
      ctx.font = `500 ${mainFontSize}px Inter, Arial,sans-serif`;
      if (mainText.trim()) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(mainX - mainW / 2, mainY - mainH / 2, mainW, mainH);
        ctx.clip();
        ctx.fillText(mainText, mainX, mainY);
        ctx.restore();
      }
      ctx.restore();

      // Sec
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `500 ${secFontSize}px Inter, Arial,sans-serif`;
      const secDisplayText = secondaryText.trim() ? secondaryText : " ";
      const secMetrics = ctx.measureText(secDisplayText);
      const secPX = 24,
        secPY = 13,
        secRad = secRadius;
      const secW = secMetrics.width + secPX * 2;
      const secH = secFontSize + secPY * 2;
      const secX = secondaryPos.x * IMAGE_WIDTH;
      const secY = secondaryPos.y * IMAGE_HEIGHT;
      ctx.globalAlpha = secAlpha;
      ctx.fillStyle = palette[secBgIdx] ?? "#222";
      drawRoundRect(ctx, secX - secW / 2, secY - secH / 2, secW, secH, secRad);
      ctx.globalAlpha = 1;
      ctx.fillStyle = secTextColor;
      ctx.font = `500 ${secFontSize}px Inter, Arial,sans-serif`;
      if (secondaryText.trim()) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(secX - secW / 2, secY - secH / 2, secW, secH);
        ctx.clip();
        ctx.fillText(secondaryText, secX, secY);
        ctx.restore();
      }
      ctx.restore();

      if (showArrow) {
        drawArrowOnCanvas(ctx, {
          x: arrowPos.x * IMAGE_WIDTH,
          y: arrowPos.y * IMAGE_HEIGHT,
          angleDeg: arrowAngle,
          color: arrowColor,
          size: arrowSize,
        });
      }
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "image-with-text.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, "image/png");
    };
  };

  // --- Overlay JSON textarea logic ---
  function handleOverlayStateJsonEdit(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setOverlayStateJson(text);
    try {
      const json = JSON.parse(text);
      setOverlayState((cur) => ({ ...cur, ...json }));
      setOverlayStateJsonError("");
    } catch (err: any) {
      setOverlayStateJsonError("Invalid JSON: " + (err?.message || "parse error"));
    }
  }

  // --- Control for color, with selection ---
  const ColorButton: React.FC<{
    color: string;
    selected: boolean;
    onClick: () => void;
  }> = ({ color, selected, onClick }) => (
    <div
      role="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      tabIndex={0}
      style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        background: color,
        border: selected ? "3px solid #66f" : "2px solid #fff7",
        boxShadow: selected ? "0 2px 7px #4e4cff66,0 2px 9px #2213" : "0 2px 7px #0004",
        cursor: "pointer",
        outline: "none",
        marginLeft: 1,
        marginRight: 1,
      }}
    />
  );

  // --- "Sidebar" controls are unchanged, except TS types
  function renderOverlayControls(props: {
    text: string;
    setText: (v: string) => void;
    fontSize: number;
    setFontSize: (n: number) => void;
    fontSizes: number[];
    palette: string[];
    bgIdx: number;
    setBgIdx: (v: number) => void;
    radius: number;
    setRadius: (v: number) => void;
    alpha: number;
    setAlpha: (v: number) => void;
    textColor: string;
    setTextColor: (c: string) => void;
    placeholder: string;
    ariaLabel: string;
    inputMaxLength: number;
    showPalette: boolean;
    boxKey: "main" | "sec";
  }) {
    // As in your code
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 17,
          marginBottom: 12,
          flexWrap: "wrap",
          justifyContent: "flex-start",
        }}
      >
        <label
          style={{
            fontWeight: 600,
            color: theme === "dark" ? "#dbe0ff" : "#285",
            marginRight: 4,
            fontSize: 18,
            whiteSpace: "nowrap",
          }}
        >
          {props.ariaLabel}
        </label>
        <input
          type="text"
          maxLength={props.inputMaxLength}
          placeholder={props.placeholder}
          aria-label={props.ariaLabel + " input"}
          value={props.text}
          onChange={(e) => props.setText(e.target.value)}
          style={{
            width: "min(34vw,280px)",
            padding: "7px 12px",
            fontSize: 16,
            borderRadius: 8,
            border: "none",
            outline: "none",
            background: theme === "dark" ? "#232348" : "#ebf7eb",
            color: theme === "dark" ? "white" : "#111",
            boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
            fontFamily: "Inter, Arial, sans-serif",
          }}
        />
        <span style={{ color: theme === "dark" ? "#aaa" : "#286", fontSize: 15 }}>Size</span>
        <input
          type="number"
          min={1}
          value={props.fontSize}
          step={1}
          style={{
            width: 44,
            fontSize: 15,
            padding: "5px 5px",
            borderRadius: 8,
            border: "none",
            background: theme === "dark" ? "#1b1c34" : "#dbfaef",
            color: theme === "dark" ? "#fff" : "#222",
            textAlign: "center",
            boxShadow: "0 1.5px 6px #0002",
          }}
          onChange={(e) => {
            let v = Number(e.target.value);
            if (isNaN(v)) v = 1;
            props.setFontSize(v);
          }}
        />
        <span style={{ color: theme === "dark" ? "#aaa" : "#286", fontSize: 14 }}>Text color</span>
        <div style={{ display: "flex", gap: 2, alignItems: "center", marginRight: 3 }}>
          {TEXT_COLORS.map((c: string, i: number) => (
            <ColorButton
              key={`${props.boxKey}-txtc-${i}`}
              color={c}
              selected={props.textColor.toUpperCase() === c.toUpperCase()}
              onClick={() => props.setTextColor(toHex6(c))}
            />
          ))}
          <input
            type="color"
            value={toHex6(props.textColor)}
            aria-label="Custom text color"
            onChange={(e) => props.setTextColor(toHex6(e.target.value))}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "none",
              outline: "none",
              padding: 0,
              background: "none",
            }}
          />
        </div>
        <span style={{ color: theme === "dark" ? "#aaa" : "#286", fontSize: 14, marginLeft: 0, marginRight: 0 }}>
          Radius
        </span>
        <input
          type="number"
          min={0}
          max={120}
          value={props.radius}
          step={1}
          style={{
            width: 36,
            fontSize: 15,
            padding: "5px 6px",
            borderRadius: 8,
            border: "none",
            background: theme === "dark" ? "#202033" : "#e7f7e0",
            color: theme === "dark" ? "#fff" : "#125",
            textAlign: "center",
          }}
          onChange={(e) => {
            let v = Number(e.target.value);
            if (isNaN(v)) v = 0;
            props.setRadius(v);
          }}
          title="Border radius"
        />
        {props.showPalette && props.palette.length > 0 && (
          <>
            <span style={{ color: theme === "dark" ? "#aaa" : "#286", fontSize: 14 }}>Background</span>
            <div style={{ display: "flex", gap: 5 }}>
              {props.palette.map((color: string, i: number) => (
                <ColorButton
                  key={`${props.boxKey}-color-${i}`}
                  color={color}
                  selected={props.bgIdx === i}
                  onClick={() => props.setBgIdx(i)}
                />
              ))}
            </div>
          </>
        )}
        <span style={{ color: theme === "dark" ? "#aaa" : "#286", fontSize: 14 }}>Opacity</span>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.01}
          value={props.alpha}
          onChange={(e) => props.setAlpha(Number(e.target.value))}
          style={
            {
              width: 77,
              accentColor: props.boxKey === "main" ? palette[mainBgIdx] ?? "#6666ff" : palette[secBgIdx] ?? "#6666ff",
              margin: "0 2px",
              background: "#151726",
            } as React.CSSProperties
          }
        />
        <span style={{ fontSize: 13, width: 33, color: theme === "dark" ? "#ddd" : "#138", display: "inline-block" }}>
          {Math.round(props.alpha * 100)}%
        </span>
      </div>
    );
  }

  // --- Overlay dots: main, sec, arrow position
  const renderDraggableDot = useCallback(
    (x: number, y: number, which: "main" | "sec" | "arrow") => {
      const previewW = previewRef.current?.clientWidth ?? IMAGE_WIDTH;
      const previewH = previewRef.current?.clientHeight ?? IMAGE_HEIGHT;
      // Dot colors
      const color = which === "main" ? "#5fd3fa" : which === "sec" ? "#92fa5f" : "#fd0";
      const borderC = which === draggingDot ? "#66f" : "#222";
      return (
        <div
          style={{
            position: "absolute",
            left: x * previewW,
            top: y * previewH,
            transform: "translate(-50%,-50%)",
            width: 22,
            height: 22,
            background: color,
            borderRadius: "50%",
            border: `3.5px solid ${borderC}`,
            boxShadow: "0 1.5px 9px " + color,
            zIndex: 21,
            cursor: draggingDot === which ? "grabbing" : "grab",
            userSelect: "none",
            transition: "box-shadow .18s, border .14s",
            pointerEvents: "auto",
            outline: draggingDot === which ? "2.5px dashed #66f" : undefined,
          }}
          onPointerDown={(e) => {
            if (draggingDot) return;
            e.preventDefault();
            setDraggingDot(which);
          }}
          title={
            which === "main"
              ? "Drag to move main text overlay"
              : which === "sec"
              ? "Drag to move secondary text overlay"
              : "Drag to move arrow anchor"
          }
          aria-label={
            which === "main"
              ? "Main text position dot"
              : which === "sec"
              ? "Secondary text position dot"
              : "Arrow anchor dot"
          }
        >
          <svg width={18} height={18} style={{ display: "block", margin: 2 }}>
            <circle cx={9} cy={9} r={7.8} fill="none" stroke="#fff" strokeWidth="2" />
          </svg>
        </div>
      );
    },
    [draggingDot]
  );

  // --- Text overlays (main/secondary, draggable dot on each)
  function renderOverlayBox(props: {
    text: string;
    bgIdx: number;
    position: Vec2;
    fontSize: number;
    padding: { x: number; y: number };
    radius: number;
    palette: string[];
    placeholder: string;
    ariaLabel: string;
    boxKey: "main" | "sec";
    bgAlpha: number;
    textColor: string;
    showDot?: boolean;
  }) {
    const previewW = previewRef.current?.clientWidth ?? IMAGE_WIDTH;
    const previewH = previewRef.current?.clientHeight ?? IMAGE_HEIGHT;
    const x = props.position.x * previewW,
      y = props.position.y * previewH;
    const previewFontSize = Math.round(props.fontSize * (previewW / IMAGE_WIDTH));
    let estWidth = 200;
    if (typeof window !== "undefined" && typeof document !== "undefined" && previewFontSize) {
      const dummySpan = document.createElement("span");
      dummySpan.style.font = `500 ${previewFontSize}px Inter, Arial, sans-serif`;
      dummySpan.style.visibility = "hidden";
      dummySpan.style.position = "absolute";
      dummySpan.style.whiteSpace = "nowrap";
      dummySpan.innerText = props.text || " ";
      document.body.appendChild(dummySpan);
      estWidth = dummySpan.getBoundingClientRect().width;
      document.body.removeChild(dummySpan);
    }
    const textWidth = estWidth + 2 * props.padding.x * (previewW / IMAGE_WIDTH);
    const textHeight = previewFontSize + 2 * props.padding.y * (previewH / IMAGE_HEIGHT);

    return (
      <>
        <div
          style={{
            position: "absolute",
            left: x,
            top: y,
            transform: "translate(-50%,-50%)",
            background: props.palette[props.bgIdx]
              ? colorWithAlpha(props.palette[props.bgIdx], props.bgAlpha)
              : "rgba(34,34,34,0.79)",
            borderRadius: props.radius * (previewW / IMAGE_WIDTH),
            fontSize: previewFontSize,
            fontWeight: 500,
            color: props.textColor,
            padding: `${props.padding.y * (previewH / IMAGE_HEIGHT)}px ${props.padding.x * (previewW / IMAGE_WIDTH)}px`,
            textAlign: "center",
            maxWidth: "94%",
            whiteSpace: "nowrap",
            overflowX: "auto",
            overflowY: "hidden",
            boxShadow: "0 2px 14px rgba(0,0,0,0.23)",
            userSelect: "none",
            pointerEvents: "auto",
            zIndex: 2,
            minWidth: 80,
            transition: "box-shadow .16s,outline .12s",
            fontFamily: "Inter, Arial, sans-serif",
          }}
          aria-label={props.ariaLabel}
        >
          {props.text || <span style={{ opacity: 0.28 }}>{props.placeholder}</span>}
        </div>
        {props.showDot !== false && renderDraggableDot(props.position.x, props.position.y, props.boxKey)}
      </>
    );
  }

  // --- Arrow overlay, draggable dot at root position plus drag handle for angle/size
  function renderArrowOverlay(pos: Vec2, angle: number, color: string, size: number) {
    const previewW = previewRef.current?.clientWidth ?? IMAGE_WIDTH;
    const previewH = previewRef.current?.clientHeight ?? IMAGE_HEIGHT;
    const x = pos.x * previewW;
    const y = pos.y * previewH;
    // Arrow thickness
    const thickness = Math.max(3, (size / 13) * (previewW / IMAGE_WIDTH));
    // --- Resize/rotate handle
    const handleDist = size * (previewW / IMAGE_WIDTH) * 0.47;
    const handleAngle = (angle * Math.PI) / 180;
    const handleX = x + handleDist * Math.cos(handleAngle);
    const handleY = y + handleDist * Math.sin(handleAngle);

    return (
      <>
        {/* Arrow SVG: positioned at anchor, rotated by angle */}
        <div
          style={{
            position: "absolute",
            left: x,
            top: y,
            transform: `translate(-50%,-50%) rotate(${angle}deg)`,
            pointerEvents: "none",
            zIndex: 6,
            userSelect: "none",
          }}
        >
          <svg width={size * 1.03} height={size / 5} viewBox={`0 0 ${size} ${size / 5}`}>
            <g stroke={color} strokeWidth={thickness} strokeLinecap="round" fill="none">
              <line x1={size * 0.07} y1={size / 10} x2={size * 0.87} y2={size / 10} />
              <polyline
                points={`${size * 0.87},${size / 10} ${size * 0.76},${size / 19} ${size * 0.87},${size / 10} ${
                  size * 0.76
                },${size * 0.19}`}
              />
            </g>
          </svg>
        </div>
        {/* Drag dot for arrow anchor */}
        {renderDraggableDot(pos.x, pos.y, "arrow")}
        {/* Circle handle at end for rotate/resize */}
        <div
          style={{
            position: "absolute",
            left: handleX,
            top: handleY,
            width: 28,
            height: 28,
            borderRadius: "999px",
            background: "#fcd703e0",
            border: "3px solid #222",
            boxShadow: "0 0px 9px #eacc11cc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "nw-resize",
            zIndex: 99,
            userSelect: "none",
            pointerEvents: "auto",
            opacity: 0.91,
          }}
          title="Drag to resize/rotate arrow"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // We don't care about the angle, because our handler is based on pointer position vs anchor
            setArrowResizeDragging(true);
          }}
        >
          <svg width={16} height={16}>
            <circle cx={8} cy={8} r={7.2} fill="#fd0" stroke="#a80" strokeWidth="1" />
          </svg>
        </div>
      </>
    );
  }

  // --- Main JSX ---
  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme === "dark" ? "#1a1a1a" : "#e2f1e9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily: "Inter, Arial, sans-serif",
        padding: 12,
        color: theme === "dark" ? "#f8f7fb" : "#162611",
      }}
    >
      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        style={{
          position: "fixed",
          right: 26,
          top: 23,
          zIndex: 333,
          border: "none",
          borderRadius: 22,
          padding: "7px 18px",
          fontSize: 18,
          fontWeight: 600,
          color: theme === "dark" ? "#fff" : "#162611",
          background:
            theme === "dark"
              ? "linear-gradient(90deg,#272454,#223233 80%)"
              : "linear-gradient(90deg,#defdfb 70%,#ebfbb2 100%)",
          boxShadow: theme === "dark" ? "0 1.5px 7px #3be5" : "0 2px 14px #bde29d86",
          cursor: "pointer",
          userSelect: "none",
        }}
        title="Toggle dark/light mode"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <>🌙 Dark</> : <>🌞 Light</>}
      </button>
      {/* Title/description as in your code */}
      <div
        style={{
          marginTop: 20,
          marginBottom: 20,
          textAlign: "center",
          color: theme === "dark" ? "#f9fafc" : "#183",
          maxWidth: 900,
        }}
      >
        <h1
          style={{
            fontSize: "2.3rem",
            marginBottom: 7,
            fontWeight: 700,
            letterSpacing: "0.01em",
            color: theme === "dark" ? "#8ac7fa" : "#19c646",
          }}
        >
          Overlay Image Editor
        </h1>
        <h2
          style={{
            fontSize: "1.3rem",
            fontWeight: 400,
            marginBottom: 10,
            color: theme === "dark" ? "#e0e6f6" : "#257036",
          }}
        >
          Add text overlays and arrows to images: drag, style, export!
        </h2>
        <ul
          style={{
            textAlign: "left",
            maxWidth: 550,
            margin: "0 auto 7px auto",
            fontSize: 18,
            color: theme === "dark" ? "#f7f7fb" : "#173c2a",
            background: theme === "dark" ? "#252854" : "#b0eeceee",
            borderRadius: 13,
            padding: "16px 26px 17px 40px",
            boxShadow: "0 2px 16px #0002",
            lineHeight: 1.66,
          }}
        >
          <li>Drag and drop or click to load an image (preview 1920×1080)</li>
          <li>Type overlay text(s), choose fonts, color, position, background, and radius</li>
          <li>Optionally add an arrow: drag to move, drag handle to resize/rotate, choose color/size/angle</li>
          <li>
            All settings persist (text, overlays, arrow) via <b>localStorage</b>
          </li>
          <li>Click "Download" to export a 1920×1080 PNG with your chosen overlays</li>
        </ul>
      </div>
      {/* --- File input / image load --- */}
      {!image && (
        <div
          onDragEnter={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            width: 400,
            height: 300,
            border: "3px dashed #888",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#aaa",
            cursor: "pointer",
            background: theme === "dark" ? "#181818" : "#f7fff7",
            borderRadius: 12,
            userSelect: "none",
            marginBottom: 24,
            maxWidth: "95vw",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>Drag & Drop Image Here</div>
            <div>
              or <span style={{ color: "#66f", textDecoration: "underline" }}>Click to select</span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleInputChange}
            />
          </div>
        </div>
      )}
      {image && (
        <div
          style={{
            width: "100%",
            maxWidth: 2200,
            display: "flex",
            gap: 35,
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          {/* Controls area */}
          <aside
            style={{
              minWidth: 298,
              maxWidth: 370,
              background:
                theme === "dark"
                  ? "linear-gradient(120deg,#22243e 70%,#181928 110%)"
                  : "linear-gradient(120deg,#e6fff6 70%,#f2f2d5 110%)",
              borderRadius: 11,
              boxShadow: "0 2px 32px #3375a012",
              padding: "28px 19px 24px 22px",
              marginRight: 0,
              position: "relative",
              zIndex: 2,
              marginBottom: 10,
            }}
          >
            {/* Main/Secondary controls */}
            {renderOverlayControls({
              text: mainText,
              setText: (v: string) => setOverlayState((s) => ({ ...s, mainText: v })),
              fontSize: mainFontSize,
              setFontSize: (n: number) => setOverlayState((s) => ({ ...s, mainFontSize: n })),
              fontSizes: MAIN_FONT_SIZES,
              palette,
              bgIdx: mainBgIdx,
              setBgIdx: (v: number) => setOverlayState((s) => ({ ...s, mainBgIdx: v })),
              radius: mainRadius,
              setRadius: (v: number) => setOverlayState((s) => ({ ...s, mainRadius: v })),
              placeholder: "Type main overlay text...",
              ariaLabel: "Main text",
              inputMaxLength: 200,
              showPalette: true,
              boxKey: "main",
              alpha: mainAlpha,
              setAlpha: (v: number) => setOverlayState((s) => ({ ...s, mainAlpha: v })),
              textColor: mainTextColor,
              setTextColor: (v: string) => setOverlayState((s) => ({ ...s, mainTextColor: v })),
            })}
            {renderOverlayControls({
              text: secondaryText,
              setText: (v: string) => setOverlayState((s) => ({ ...s, secondaryText: v })),
              fontSize: secFontSize,
              setFontSize: (n: number) => setOverlayState((s) => ({ ...s, secFontSize: n })),
              fontSizes: SEC_FONT_SIZES,
              palette,
              bgIdx: secBgIdx,
              setBgIdx: (v: number) => setOverlayState((s) => ({ ...s, secBgIdx: v })),
              radius: secRadius,
              setRadius: (v: number) => setOverlayState((s) => ({ ...s, secRadius: v })),
              placeholder: "Secondary text (below)...",
              ariaLabel: "Secondary text",
              inputMaxLength: 180,
              showPalette: true,
              boxKey: "sec",
              alpha: secAlpha,
              setAlpha: (v: number) => setOverlayState((s) => ({ ...s, secAlpha: v })),
              textColor: secTextColor,
              setTextColor: (v: string) => setOverlayState((s) => ({ ...s, secTextColor: v })),
            })}
            {/* --- Arrow controls --- */}
            <details style={{ marginBottom: 9, marginTop: 5, textAlign: "left" }} open={showArrow}>
              <summary
                style={{
                  color: theme === "dark" ? "#dbe0ff" : "#163e2f",
                  fontWeight: 600,
                  fontSize: 18,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {!showArrow ? <>Add Arrow Overlay</> : <>Arrow Overlay Settings</>}
              </summary>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  alignItems: "center",
                  justifyContent: "flex-start",
                  padding: 8,
                }}
              >
                <label style={{ fontWeight: 600, color: "#e8f84d", fontSize: 15 }}>Show Arrow</label>
                <input
                  type="checkbox"
                  checked={showArrow}
                  onChange={(e) => setOverlayState((s) => ({ ...s, showArrow: e.target.checked }))}
                  style={{ width: 24, height: 24, accentColor: "#e8f84d", marginRight: 4 }}
                />
                <span style={{ color: "#aaa", fontSize: 15 }}>Color</span>
                <div style={{ display: "flex", gap: 2, alignItems: "center", marginRight: 3 }}>
                  {ARROW_COLORS.map((c: string, i: number) => (
                    <ColorButton
                      key={"arrowc-" + i}
                      color={c}
                      selected={arrowColor.toUpperCase() === c.toUpperCase()}
                      onClick={() => setOverlayState((s) => ({ ...s, arrowColor: toHex6(c) }))}
                    />
                  ))}
                  <input
                    type="color"
                    value={toHex6(arrowColor)}
                    aria-label="Custom arrow color"
                    onChange={(e) => setOverlayState((s) => ({ ...s, arrowColor: toHex6(e.target.value) }))}
                    style={{
                      width: 25,
                      height: 25,
                      borderRadius: 8,
                      border: "none",
                      outline: "none",
                      padding: 0,
                      background: "none",
                    }}
                  />
                </div>
                <span style={{ color: "#aaa", fontSize: 14 }}>Angle</span>
                <input
                  type="number"
                  min={-359}
                  max={359}
                  value={arrowAngle}
                  step={1}
                  style={{
                    width: 35,
                    fontSize: 14,
                    padding: "3px 2px",
                    borderRadius: 8,
                    border: "none",
                    background: "#202033",
                    color: "#fff",
                    textAlign: "center",
                  }}
                  title="Arrow angle (degrees)"
                  onChange={(e) => setOverlayState((s) => ({ ...s, arrowAngle: Number(e.target.value) }))}
                />
                <span style={{ color: "#aaa", fontSize: 14 }}>Size</span>
                <input
                  type="number"
                  min={30}
                  max={600}
                  value={arrowSize}
                  step={1}
                  style={{
                    width: 34,
                    fontSize: 14,
                    padding: "3px 3px",
                    borderRadius: 8,
                    border: "none",
                    background: "#202033",
                    color: "#fff",
                    textAlign: "center",
                  }}
                  title="Arrow length"
                  onChange={(e) => setOverlayState((s) => ({ ...s, arrowSize: Number(e.target.value) }))}
                />
                <span style={{ color: "#aaa", fontSize: 14, display: "inline-block", marginTop: 4 }}>
                  Drag yellow dot to move arrow, drag circle to resize/rotate.
                </span>
              </div>
            </details>
            {/* Download/reset */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 22, marginBottom: 11 }}>
              <button
                style={{
                  padding: "14px 12px",
                  fontSize: 18,
                  background: theme === "dark" ? "#66f" : "#28c840",
                  color: "white",
                  border: "none",
                  borderRadius: 7,
                  cursor: "pointer",
                  boxShadow: "0 3px 12px #6af3",
                  fontWeight: 600,
                }}
                onClick={handleDownload}
              >
                Download PNG
              </button>
              <button
                style={{
                  padding: "10px 10px",
                  fontSize: 14,
                  background: theme === "dark" ? "#333" : "#ccefe9",
                  color: theme === "dark" ? "#fff" : "#242",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  opacity: 0.95,
                }}
                onClick={() => {
                  setImage(null);
                  setPalette(PRESET_COLORS);
                  setOverlayState(DEFAULT_OVERLAY);
                  setOverlayStateJson(JSON.stringify(DEFAULT_OVERLAY, null, 2));
                }}
              >
                Change Image
              </button>
            </div>
            {/* OverlayState JSON */}
            <div style={{ marginTop: 22 }}>
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  fontSize: 17,
                  color: "#1968a8",
                  marginBottom: 4,
                }}
              >
                Overlay State (JSON, editable)
              </label>
              <textarea
                value={overlayStateJson}
                onChange={handleOverlayStateJsonEdit}
                style={{
                  width: "100%",
                  minHeight: 180,
                  fontSize: 14,
                  fontFamily: "Fira Mono,monospace, monospace",
                  borderRadius: 8,
                  padding: 9,
                  border: overlayStateJsonError ? "2px solid #e22" : "2px solid #aac",
                  background: "#f2f7fb",
                  color: "#1E293B",
                  resize: "vertical",
                }}
                spellCheck={false}
                rows={11}
                title="Edit overlay state: you can paste/copy the overlay settings JSON here"
                aria-label="Overlay state JSON text area"
              />
              {overlayStateJsonError && (
                <div style={{ color: "#b22", fontSize: 14, lineHeight: 1, marginTop: 2, marginBottom: 3 }}>
                  {overlayStateJsonError}
                </div>
              )}
              <div style={{ fontSize: 13, color: "#248a6a", marginTop: 2, opacity: 0.81 }}>
                You can copy/paste or edit the full overlay state as editable JSON.
                <br />
                The UI will update once valid JSON is parsed.
              </div>
            </div>
          </aside>
          {/* --- Main Preview 1920x1080 with draggable overlays+resizable --- */}
          <div
            ref={previewRef}
            style={{
              width: IMAGE_WIDTH,
              height: IMAGE_HEIGHT,
              maxWidth: "99vw",
              maxHeight: "95vh",
              position: "relative",
              margin: "17px 0",
              borderRadius: 13,
              overflow: "hidden",
              background: "#222",
              userSelect: "none",
              boxShadow: "0 6px 32px rgba(17,24,39,0.20)",
              border: theme === "dark" ? "3px solid #353768" : "2.5px solid #6bfac7",
            }}
            tabIndex={-1}
          >
            <img
              src={image!!}
              alt=""
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
            {renderOverlayBox({
              text: mainText,
              bgIdx: mainBgIdx,
              position: mainPos,
              fontSize: mainFontSize,
              padding: { x: 54, y: 26 },
              radius: mainRadius,
              palette,
              placeholder: "Your main text here",
              ariaLabel: "Main overlay text",
              boxKey: "main",
              bgAlpha: mainAlpha,
              textColor: mainTextColor,
              showDot: true,
            })}
            {renderOverlayBox({
              text: secondaryText,
              bgIdx: secBgIdx,
              position: secondaryPos,
              fontSize: secFontSize,
              padding: { x: 24, y: 13 },
              radius: secRadius,
              palette,
              placeholder: "Secondary text",
              ariaLabel: "Secondary overlay text",
              boxKey: "sec",
              bgAlpha: secAlpha,
              textColor: secTextColor,
              showDot: true,
            })}
            {showArrow && renderArrowOverlay(arrowPos, arrowAngle, arrowColor, arrowSize)}
          </div>
        </div>
      )}
    </div>
  );
};
export default OverlayImageEditor;
