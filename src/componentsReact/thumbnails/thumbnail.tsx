import React, { useRef, useState, useEffect } from "react";

// --- Constants
const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;
const MAIN_FONT_SIZES = [32, 40, 50, 60, 72];
const SEC_FONT_SIZES = [18, 22, 26, 32, 40];
const PRESET_COLORS = ["#F44242", "#F58D2D", "#F8D94F", "#43d964", "#5183f9"];

const TEXT_COLORS = ["#FFFFFF", "#222222", "#E3E3E3", "#000000", "#FFD700", "#00FFBE", "#EF40EA", "#FF3800", "#22AAFF"];
const ARROW_COLORS = ["#FFFFFF", "#222222", "#F44242", "#43D964", "#5183F9", "#FFDA00", "#FF3800", "#EF40EA"];

const LOCALSTORAGE_KEY = "overlay_image_editor_v1";
const LOCALSTORAGE_THEME_KEY = "overlay_image_editor_theme";

type Persisted = {
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
  mainPos: { x: number; y: number };
  secondaryPos: { x: number; y: number };
  showArrow: boolean;
  arrowPos: { x: number; y: number };
  arrowAngle: number;
  arrowColor: string;
  arrowSize: number;
};

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

function colorWithAlpha(color: string, alpha: number): string {
  if (color.startsWith("rgba(")) {
    const nums = color
      .replace(/^rgba\(|\)$/g, "")
      .split(",")
      .map((s) => s.trim());
    const [r, g, b] = nums.slice(0, 3).map((n) => Number(n));
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (color.startsWith("rgb(")) {
    const nums = color
      .replace(/^rgb\(|\)$/g, "")
      .split(",")
      .map((s) => s.trim());
    const [r, g, b] = nums.slice(0, 3).map((n) => Number(n));
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

function getDominantColors(img: HTMLImageElement, numColors: number): string[] {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const scale = 80;
    canvas.width = scale;
    canvas.height = scale;
    ctx.drawImage(img, 0, 0, scale, scale);
    const { data } = ctx.getImageData(0, 0, scale, scale);
    const buckets: { [k: string]: number } = {};
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
  // Draw an arrow at (x,y) pointing at angleDeg (degrees), of given size
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
  // Arrow head
  ctx.moveTo(size * 0.35, 0);
  ctx.lineTo(size * 0.21, -size * 0.17);
  ctx.moveTo(size * 0.35, 0);
  ctx.lineTo(size * 0.21, size * 0.17);
  ctx.stroke();
  ctx.restore();
}

// --- Load state from localStorage utility
function loadPersistedState(): Partial<Persisted> | undefined {
  try {
    const s = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!s) return undefined;
    return JSON.parse(s) as Partial<Persisted>;
  } catch {
    return undefined;
  }
}
function savePersistedState(state: Partial<Persisted>) {
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
function toHex6(color: string): string {
  if (typeof color === "string" && color.startsWith("#") && color.length === 4) {
    const r = color[1],
      g = color[2],
      b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return color;
}

// --- OverlayImageEditor Component
const OverlayImageEditor: React.FC = () => {
  // ----------- Theme toggle state -----------
  const [theme, setTheme] = useState<"light" | "dark">(loadTheme());

  // ----- Image and palette -----
  const [image, setImage] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>(PRESET_COLORS);

  // ----- Overlay state -----
  // Initial: grab from localStorage
  const [persistedState, setPersistedState] = useState<Partial<Persisted> | undefined>(loadPersistedState());

  // All states start from persistedState
  const [mainText, setMainText] = useState<string>(persistedState?.mainText ?? "");
  const [secondaryText, setSecondaryText] = useState<string>(persistedState?.secondaryText ?? "");

  const [mainBgIdx, setMainBgIdx] = useState(persistedState?.mainBgIdx ?? 0);
  const [secBgIdx, setSecBgIdx] = useState(persistedState?.secBgIdx ?? 1);

  const [mainFontSize, setMainFontSize] = useState<number>(persistedState?.mainFontSize ?? MAIN_FONT_SIZES[1]);
  const [secFontSize, setSecFontSize] = useState<number>(persistedState?.secFontSize ?? SEC_FONT_SIZES[2]);

  const [mainAlpha, setMainAlpha] = useState<number>(persistedState?.mainAlpha ?? 0.76);
  const [secAlpha, setSecAlpha] = useState<number>(persistedState?.secAlpha ?? 0.75);

  const [mainTextColor, setMainTextColor] = useState<string>(toHex6(persistedState?.mainTextColor ?? "#FFFFFF"));
  const [secTextColor, setSecTextColor] = useState<string>(toHex6(persistedState?.secTextColor ?? "#FFFFFF"));

  // Border radius
  const [mainRadius, setMainRadius] = useState<number>(persistedState?.mainRadius ?? 28);
  const [secRadius, setSecRadius] = useState<number>(persistedState?.secRadius ?? 21);

  // Overlay positions
  const [mainPos, setMainPos] = useState<{ x: number; y: number }>(persistedState?.mainPos ?? { x: 0.5, y: 0.5 });
  const [secondaryPos, setSecondaryPos] = useState<{ x: number; y: number }>(
    persistedState?.secondaryPos ?? { x: 0.5, y: 0.72 }
  );

  // ----- Arrow -----
  const [showArrow, setShowArrow] = useState<boolean>(persistedState?.showArrow ?? false);
  const [arrowPos, setArrowPos] = useState<{ x: number; y: number }>(persistedState?.arrowPos ?? { x: 0.9, y: 0.2 });
  const [arrowAngle, setArrowAngle] = useState<number>(persistedState?.arrowAngle ?? -45);
  const [arrowColor, setArrowColor] = useState<string>(toHex6(persistedState?.arrowColor ?? "#FFFFFF"));
  const [arrowSize, setArrowSize] = useState<number>(persistedState?.arrowSize ?? 220);

  // ----- Dragging state -----
  const [draggingBox, setDraggingBox] = useState<null | "main" | "sec" | "arrow">(null);
  const [draggingResize, setDraggingResize] = useState<boolean>(false);
  // Arrow resize drag (size/rotation handle only)
  const arrowResizeOrigin = useRef<{ x: number; y: number; angle: number; size: number } | null>(null);

  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const overlayRefs = {
    main: useRef<HTMLDivElement>(null),
    sec: useRef<HTMLDivElement>(null),
    arrow: useRef<HTMLDivElement>(null),
    arrowResize: useRef<HTMLDivElement>(null),
  };

  // ---------- Persist settings ----------
  useEffect(() => {
    savePersistedState({
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
    });
  }, [
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
  ]);

  // ---------- Save theme preference ----------
  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  // ---------- Image loading -----------
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

    // NEW: Pull state from localStorage, not default!
    const persisted = loadPersistedState();
    setPersistedState(persisted);

    setMainText(persisted?.mainText ?? "");
    setSecondaryText(persisted?.secondaryText ?? "");
    setMainBgIdx(persisted?.mainBgIdx ?? 0);
    setSecBgIdx(persisted?.secBgIdx ?? 1);
    setMainFontSize(persisted?.mainFontSize ?? MAIN_FONT_SIZES[1]);
    setSecFontSize(persisted?.secFontSize ?? SEC_FONT_SIZES[2]);
    setMainPos(persisted?.mainPos ?? { x: 0.5, y: 0.5 });
    setSecondaryPos(persisted?.secondaryPos ?? { x: 0.5, y: 0.72 });
    setMainAlpha(persisted?.mainAlpha ?? 0.76);
    setSecAlpha(persisted?.secAlpha ?? 0.75);
    setMainTextColor(toHex6(persisted?.mainTextColor ?? "#FFFFFF"));
    setSecTextColor(toHex6(persisted?.secTextColor ?? "#FFFFFF"));
    setMainRadius(persisted?.mainRadius ?? 28);
    setSecRadius(persisted?.secRadius ?? 21);
    setShowArrow(persisted?.showArrow ?? false);
    setArrowPos(persisted?.arrowPos ?? { x: 0.9, y: 0.2 });
    setArrowAngle(persisted?.arrowAngle ?? -45);
    setArrowColor(toHex6(persisted?.arrowColor ?? "#FFFFFF"));
    setArrowSize(persisted?.arrowSize ?? 220);
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
      setMainBgIdx(0);
      setSecBgIdx(1);
    };
  }, [image]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) loadImage(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) loadImage(file);
  };

  // --------- TEXT/ARROW DRAGGING ---------
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const parent = previewRef.current;
      if (!parent) return;
      const bounds = parent.getBoundingClientRect();
      if (draggingBox) {
        const mx = e.clientX - bounds.left;
        const my = e.clientY - bounds.top;
        let box: HTMLDivElement | null = null;
        let boxW = 0,
          boxH = 0;
        if (draggingBox === "main" || draggingBox === "sec" || draggingBox === "arrow") {
          box = overlayRefs[draggingBox].current;
          boxW = box?.offsetWidth ?? (draggingBox === "arrow" ? 56 : 0);
          boxH = box?.offsetHeight ?? (draggingBox === "arrow" ? 56 : 0);
        }
        let x = (mx - dragOffset.current.x) / bounds.width;
        let y = (my - dragOffset.current.y) / bounds.height;
        if (draggingBox === "arrow") {
          x = Math.max(0.02, Math.min(0.98, x));
          y = Math.max(0.02, Math.min(0.98, y));
          setArrowPos({ x, y });
        } else if (draggingBox === "main" || draggingBox === "sec") {
          const minX = boxW / bounds.width / 2;
          const maxX = 1 - minX;
          const minY = boxH / bounds.height / 2;
          const maxY = 1 - minY;
          x = Math.max(minX, Math.min(maxX, x));
          y = Math.max(minY, Math.min(maxY, y));
          if (draggingBox === "main") setMainPos({ x, y });
          if (draggingBox === "sec") setSecondaryPos({ x, y });
        }
      }
      if (draggingResize && showArrow) {
        // Drag handle for arrow: changes arrowSize and arrowAngle
        const arrowDiv = overlayRefs.arrow.current;
        if (!arrowDiv) return;
        const ax = arrowPos.x * bounds.width,
          ay = arrowPos.y * bounds.height;
        const pointerX = e.clientX - bounds.left;
        const pointerY = e.clientY - bounds.top;
        const dx = pointerX - ax;
        const dy = pointerY - ay;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pointerAngleRad = Math.atan2(dy, dx);
        let newAngle = (pointerAngleRad * 180) / Math.PI;
        if (newAngle > 180) newAngle -= 360;
        if (newAngle < -180) newAngle += 360;
        setArrowAngle(newAngle);
        const ARROW_MIN_SIZE = 30,
          ARROW_MAX_SIZE = 600;
        let size = Math.max(ARROW_MIN_SIZE, Math.min(ARROW_MAX_SIZE, dist * 2));
        setArrowSize(size);
      }
    }
    function onUp() {
      setDraggingBox(null);
      setDraggingResize(false);
      arrowResizeOrigin.current = null;
    }
    if (draggingBox || draggingResize) {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggingBox, draggingResize, showArrow, arrowPos]);

  // ---------- Download export -----------
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
      // --- fit image ---
      const iw = img.width,
        ih = img.height,
        ir = iw / ih;
      const wr = IMAGE_WIDTH / IMAGE_HEIGHT;
      let sw: number, sh: number, sx: number, sy: number;
      if (ir > wr) {
        sh = ih;
        sw = sh * wr;
        sx = (iw - sw) / 2;
        sy = 0;
      } else {
        sw = iw;
        sh = sw / wr;
        sx = 0;
        sy = (ih - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
      // --- main text ---
      {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `500 ${mainFontSize}px Inter, Arial,sans-serif`;
        const displayText = mainText.trim() ? mainText : " ";
        const metrics = ctx.measureText(displayText);
        const paddingX = 54,
          paddingY = 26,
          rad = mainRadius;
        const textWidth = metrics.width + paddingX * 2;
        const textHeight = mainFontSize + paddingY * 2;
        const posX = mainPos.x * IMAGE_WIDTH;
        const posY = mainPos.y * IMAGE_HEIGHT;
        ctx.globalAlpha = mainAlpha;
        ctx.fillStyle = palette[mainBgIdx] ?? "#222";
        drawRoundRect(ctx, posX - textWidth / 2, posY - textHeight / 2, textWidth, textHeight, rad);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = mainTextColor || "#FFFFFF";
        ctx.font = `500 ${mainFontSize}px Inter, Arial,sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (mainText.trim()) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(posX - textWidth / 2, posY - textHeight / 2, textWidth, textHeight);
          ctx.clip();
          ctx.fillText(mainText, posX, posY);
          ctx.restore();
        }
        ctx.restore();
      }
      // --- secondary text ---
      {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `500 ${secFontSize}px Inter, Arial,sans-serif`;
        const displayText = secondaryText.trim() ? secondaryText : " ";
        const metrics = ctx.measureText(displayText);
        const paddingX = 24,
          paddingY = 13,
          rad = secRadius;
        const textWidth = metrics.width + paddingX * 2;
        const textHeight = secFontSize + paddingY * 2;
        const posX = secondaryPos.x * IMAGE_WIDTH;
        const posY = secondaryPos.y * IMAGE_HEIGHT;
        ctx.globalAlpha = secAlpha;
        ctx.fillStyle = palette[secBgIdx] ?? "#222";
        drawRoundRect(ctx, posX - textWidth / 2, posY - textHeight / 2, textWidth, textHeight, rad);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = secTextColor || "#FFFFFF";
        ctx.font = `500 ${secFontSize}px Inter, Arial,sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (secondaryText.trim()) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(posX - textWidth / 2, posY - textHeight / 2, textWidth, textHeight);
          ctx.clip();
          ctx.fillText(secondaryText, posX, posY);
          ctx.restore();
        }
        ctx.restore();
      }
      // --- ARROW
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

  // ------------ UI components -------------
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
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
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
      aria-label={`Palette color ${color}${selected ? " selected" : ""}`}
      tabIndex={0}
    />
  );

  function renderOverlayBox({
    text,
    bgIdx,
    position,
    fontSize,
    padding,
    radius,
    palette,
    placeholder,
    ariaLabel,
    boxKey,
    bgAlpha,
    textColor,
  }: {
    text: string;
    bgIdx: number;
    position: { x: number; y: number };
    fontSize: number;
    padding: { x: number; y: number };
    radius: number;
    palette: string[];
    placeholder: string;
    ariaLabel: string;
    boxKey: "main" | "sec";
    bgAlpha: number;
    textColor: string;
  }) {
    const previewW = previewRef.current?.clientWidth ?? IMAGE_WIDTH;
    const previewH = previewRef.current?.clientHeight ?? IMAGE_HEIGHT;
    const x = position.x * previewW;
    const y = position.y * previewH;
    const previewFontSize = Math.round(fontSize * (previewW / IMAGE_WIDTH));
    let estWidth = 200;
    if (typeof window !== "undefined" && typeof document !== "undefined" && previewFontSize) {
      const dummySpan = document.createElement("span");
      dummySpan.style.font = `500 ${previewFontSize}px Inter, Arial, sans-serif`;
      dummySpan.style.visibility = "hidden";
      dummySpan.style.position = "absolute";
      dummySpan.style.whiteSpace = "nowrap";
      dummySpan.innerText = text || " ";
      document.body.appendChild(dummySpan);
      estWidth = dummySpan.getBoundingClientRect().width;
      document.body.removeChild(dummySpan);
    }
    const textWidth = estWidth + 2 * padding.x * (previewW / IMAGE_WIDTH);
    const textHeight = previewFontSize + 2 * padding.y * (previewH / IMAGE_HEIGHT);

    return (
      <div
        ref={overlayRefs[boxKey]}
        onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
          if (draggingBox) return;
          e.preventDefault();
          e.stopPropagation();
          const box = overlayRefs[boxKey].current;
          if (!box) return;
          const rect = box.getBoundingClientRect();
          const relX = e.clientX - rect.left;
          const relY = e.clientY - rect.top;
          dragOffset.current = { x: relX, y: relY };
          setDraggingBox(boxKey);
        }}
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: "translate(-50%,-50%)",
          background: palette[bgIdx] ? colorWithAlpha(palette[bgIdx], bgAlpha) : "rgba(34,34,34,0.79)",
          borderRadius: radius * (previewW / IMAGE_WIDTH),
          fontSize: previewFontSize,
          fontWeight: 500,
          color: textColor,
          padding: `${padding.y * (previewH / IMAGE_HEIGHT)}px ${padding.x * (previewW / IMAGE_WIDTH)}px`,
          textAlign: "center",
          maxWidth: "94%",
          whiteSpace: "nowrap",
          overflowX: "auto",
          overflowY: "hidden",
          boxShadow: "0 2px 14px rgba(0,0,0,0.23)",
          userSelect: "none",
          cursor: draggingBox === boxKey ? "grabbing" : "grab",
          pointerEvents: "auto",
          zIndex: 2,
          outline: draggingBox === boxKey ? "2.5px dashed #66f" : undefined,
          border: draggingBox === boxKey ? "1px solid #66f" : undefined,
          opacity: draggingBox && draggingBox !== boxKey ? 0.6 : 1,
          transition: "box-shadow .16s,outline .12s",
          fontFamily: "Inter, Arial, sans-serif",
          minWidth: 80,
        }}
        aria-label={ariaLabel}
      >
        {text || <span style={{ opacity: 0.28 }}>{placeholder}</span>}
      </div>
    );
  }

  // Arrow overlay with drag, resize, rotate, color
  function renderArrowOverlay({
    pos,
    angle,
    color,
    size,
  }: {
    pos: { x: number; y: number };
    angle: number;
    color: string;
    size: number;
  }) {
    const previewW = previewRef.current?.clientWidth ?? IMAGE_WIDTH;
    const previewH = previewRef.current?.clientHeight ?? IMAGE_HEIGHT;
    const x = pos.x * previewW;
    const y = pos.y * previewH;
    const arrowThickness = Math.max(3, (size / 13) * (previewW / IMAGE_WIDTH));
    // Arrow head handle position is at right tip of arrow
    const handleDist = size * (previewW / IMAGE_WIDTH) * 0.47;
    const handleAngle = (angle * Math.PI) / 180;
    const handleX = x + handleDist * Math.cos(handleAngle);
    const handleY = y + handleDist * Math.sin(handleAngle);

    return (
      <>
        <div
          ref={overlayRefs.arrow}
          onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
            if (draggingBox || draggingResize) return;
            const handleDom = overlayRefs.arrowResize.current;
            if (handleDom) {
              const handleBounds = handleDom.getBoundingClientRect();
              if (
                e.clientX >= handleBounds.left &&
                e.clientX <= handleBounds.right &&
                e.clientY >= handleBounds.top &&
                e.clientY <= handleBounds.bottom
              )
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            const box = overlayRefs.arrow.current;
            if (!box) return;
            const rect = box.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;
            dragOffset.current = { x: relX, y: relY };
            setDraggingBox("arrow");
          }}
          style={{
            position: "absolute",
            left: x,
            top: y,
            transform: `translate(-50%,-50%) rotate(${angle}deg)`,
            pointerEvents: "auto",
            zIndex: 6,
            cursor: draggingBox === "arrow" ? "grabbing" : "grab",
            userSelect: "none",
            transition: "outline .11s",
            outline: draggingBox === "arrow" ? "2px dashed #ff0" : undefined,
            opacity: draggingBox && draggingBox !== "arrow" ? 0.5 : 1,
          }}
          aria-label="Arrow overlay (drag to move)"
        >
          <svg
            width={size * 1.03}
            height={size / 5}
            viewBox={`0 0 ${size} ${size / 5}`}
            style={{ display: "block", pointerEvents: "none" }}
          >
            <g stroke={color} strokeWidth={arrowThickness} strokeLinecap="round" fill="none">
              <line x1={size * 0.07} y1={size / 10} x2={size * 0.87} y2={size / 10} />
              <polyline
                points={`${size * 0.87},${size / 10} ${size * 0.76},${size / 19} ${size * 0.87},${size / 10} ${
                  size * 0.76
                },${size * 0.19}`}
              />
            </g>
          </svg>
        </div>
        <div // arrow resize/rotate drag handle
          ref={overlayRefs.arrowResize}
          onPointerDown={(e) => {
            if (draggingResize) return;
            e.preventDefault();
            e.stopPropagation();
            arrowResizeOrigin.current = { x, y, angle, size };
            setDraggingResize(true);
          }}
          style={{
            position: "absolute",
            left: handleX,
            top: handleY,
            width: 30,
            height: 30,
            borderRadius: "999px",
            background: "#fcd703e0",
            border: "3px solid #222",
            boxShadow: "0 0px 9px #eacc11cc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "nw-resize",
            zIndex: 99,
            touchAction: "none",
            opacity: 0.91,
            pointerEvents: "auto",
          }}
          title="Drag to resize and rotate arrow"
        >
          <svg width={19} height={19}>
            <circle cx={9.5} cy={9.5} r={7.5} fill="#fd0" stroke="#a80" strokeWidth="1" />
            <path d="M10 2.1 L12.4 6.5 L7.6 6.5 Z" fill="#a80" />
          </svg>
        </div>
      </>
    );
  }

  function renderOverlayControls({
    text,
    setText,
    fontSize,
    setFontSize,
    fontSizes,
    palette,
    bgIdx,
    setBgIdx,
    radius,
    setRadius,
    placeholder,
    ariaLabel,
    inputMaxLength,
    showPalette,
    boxKey,
    alpha,
    setAlpha,
    textColor,
    setTextColor,
  }: {
    text: string;
    setText: (s: string) => void;
    fontSize: number;
    setFontSize: (fs: number) => void;
    fontSizes: number[];
    palette: string[];
    bgIdx: number;
    setBgIdx: (i: number) => void;
    radius: number;
    setRadius: (r: number) => void;
    placeholder: string;
    ariaLabel: string;
    inputMaxLength: number;
    showPalette: boolean;
    boxKey: "main" | "sec";
    alpha: number;
    setAlpha: (a: number) => void;
    textColor: string;
    setTextColor: (c: string) => void;
  }) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 17,
          marginBottom: 12,
          flexWrap: "wrap",
          justifyContent: "flex-start", // Align stuff left in sidebar
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
          {ariaLabel}
        </label>
        <input
          type="text"
          maxLength={inputMaxLength}
          placeholder={placeholder}
          aria-label={ariaLabel + " input"}
          value={text}
          onChange={(e) => setText(e.target.value)}
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
          value={fontSize}
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
            setFontSize(v);
          }}
        />
        <span style={{ color: theme === "dark" ? "#aaa" : "#286", fontSize: 14 }}>Text&nbsp;color</span>
        <div style={{ display: "flex", gap: 2, alignItems: "center", marginRight: 3 }}>
          {TEXT_COLORS.map((c, i) => (
            <ColorButton
              key={boxKey + "-txtc-" + i}
              color={c}
              selected={textColor.toUpperCase() === c.toUpperCase()}
              onClick={() => setTextColor(toHex6(c))}
            />
          ))}
          <input
            type="color"
            value={toHex6(textColor)}
            aria-label="Custom text color"
            onChange={(e) => setTextColor(toHex6(e.target.value))}
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
          value={radius}
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
            setRadius(v);
          }}
          title="Border radius"
        />
        {showPalette && palette.length > 0 && (
          <>
            <span style={{ color: theme === "dark" ? "#aaa" : "#286", fontSize: 14 }}>Background</span>
            <div style={{ display: "flex", gap: 5 }}>
              {palette.map((color, i) => (
                <ColorButton
                  key={`${boxKey}-color-${i}`}
                  color={color}
                  selected={bgIdx === i}
                  onClick={() => setBgIdx(i)}
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
          value={alpha}
          onChange={(e) => setAlpha(Number(e.target.value))}
          style={
            {
              width: 77,
              accentColor: boxKey === "main" ? palette[mainBgIdx] ?? "#6666ff" : palette[secBgIdx] ?? "#6666ff",
              margin: "0 2px",
              background: "#151726",
            } as React.CSSProperties
          }
        />
        <span style={{ fontSize: 13, width: 33, color: theme === "dark" ? "#ddd" : "#138", display: "inline-block" }}>
          {Math.round(alpha * 100)}%
        </span>
      </div>
    );
  }

  // --- MAIN JSX
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
      {/* Theme toggle button */}
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

      {/* Title and Description */}
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
          {/* SIDEBAR OPTIONS */}
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
            {/* Controls, now in sidebar */}
            {renderOverlayControls({
              text: mainText,
              setText: setMainText,
              fontSize: mainFontSize,
              setFontSize: setMainFontSize,
              fontSizes: MAIN_FONT_SIZES,
              palette,
              bgIdx: mainBgIdx,
              setBgIdx: setMainBgIdx,
              radius: mainRadius,
              setRadius: setMainRadius,
              placeholder: "Type main overlay text...",
              ariaLabel: "Main text",
              inputMaxLength: 200,
              showPalette: true,
              boxKey: "main",
              alpha: mainAlpha,
              setAlpha: setMainAlpha,
              textColor: mainTextColor,
              setTextColor: setMainTextColor,
            })}
            {renderOverlayControls({
              text: secondaryText,
              setText: setSecondaryText,
              fontSize: secFontSize,
              setFontSize: setSecFontSize,
              fontSizes: SEC_FONT_SIZES,
              palette,
              bgIdx: secBgIdx,
              setBgIdx: setSecBgIdx,
              radius: secRadius,
              setRadius: setSecRadius,
              placeholder: "Secondary text (below)...",
              ariaLabel: "Secondary text",
              inputMaxLength: 180,
              showPalette: true,
              boxKey: "sec",
              alpha: secAlpha,
              setAlpha: setSecAlpha,
              textColor: secTextColor,
              setTextColor: setSecTextColor,
            })}

            {/* Arrow controls */}
            <details
              style={{
                marginBottom: 9,
                marginTop: 5,
                textAlign: "left",
              }}
              open={showArrow}
            >
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
                  onChange={(e) => setShowArrow(e.target.checked)}
                  style={{ width: 24, height: 24, accentColor: "#e8f84d", marginRight: 4 }}
                />
                <span style={{ color: "#aaa", fontSize: 15 }}>Color</span>
                <div style={{ display: "flex", gap: 2, alignItems: "center", marginRight: 3 }}>
                  {ARROW_COLORS.map((c, i) => (
                    <ColorButton
                      key={"arrowc-" + i}
                      color={c}
                      selected={arrowColor.toUpperCase() === c.toUpperCase()}
                      onClick={() => setArrowColor(toHex6(c))}
                    />
                  ))}
                  <input
                    type="color"
                    value={toHex6(arrowColor)}
                    aria-label="Custom color"
                    onChange={(e) => setArrowColor(toHex6(e.target.value))}
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
                  onChange={(e) => setArrowAngle(Number(e.target.value))}
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
                  onChange={(e) => setArrowSize(Number(e.target.value))}
                />
                <span style={{ color: "#aaa", fontSize: 14, display: "inline-block", marginTop: 4 }}>
                  Drag arrow to move, or drag handle to rotate/resize
                </span>
              </div>
            </details>
            {/* Buttons */}
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
                  setMainText("");
                  setSecondaryText("");
                  setMainBgIdx(0);
                  setSecBgIdx(1);
                  setMainFontSize(MAIN_FONT_SIZES[1]);
                  setSecFontSize(SEC_FONT_SIZES[2]);
                  setMainPos({ x: 0.5, y: 0.5 });
                  setSecondaryPos({ x: 0.5, y: 0.72 });
                  setMainAlpha(0.76);
                  setSecAlpha(0.75);
                  setMainTextColor("#FFFFFF");
                  setSecTextColor("#FFFFFF");
                  setMainRadius(28);
                  setSecRadius(21);
                  setShowArrow(false);
                  setArrowPos({ x: 0.9, y: 0.2 });
                  setArrowAngle(-45);
                  setArrowColor("#FFFFFF");
                  setArrowSize(220);
                  // Persisted state not reset
                }}
              >
                Change Image
              </button>
            </div>
          </aside>
          {/* Preview: always 1920x1080! */}
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
              src={image}
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
            })}
            {showArrow &&
              renderArrowOverlay({
                pos: arrowPos,
                angle: arrowAngle,
                color: arrowColor,
                size: arrowSize,
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default OverlayImageEditor;
