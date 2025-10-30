import React, { useRef, useState, useEffect, useCallback } from "react";
import Draggable, { type DraggableData, type DraggableEvent } from "react-draggable";

// -------- Types & Constants ---------
const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;
const FONT_SIZES = [32, 40, 50, 60, 72];
const PRESET_COLORS = ["#F44242", "#F58D2D", "#F8D94F", "#43d964", "#5183f9"];
const TEXT_COLORS = ["#FFFFFF", "#222222", "#E3E3E3", "#000000", "#FFD700", "#00FFBE", "#EF40EA", "#FF3800", "#22AAFF"];

const LOCALSTORAGE_KEY = "overlay_image_editor_main_v1";

export type OverlayState = {
  mainText: string;
  mainBgIdx: number;
  mainFontSize: number;
  mainAlpha: number;
  mainTextColor: string;
  mainRadius: number;
  mainPos: { x: number; y: number }; // normalized 0..1
};

const initialOverlayState: OverlayState = {
  mainText: "",
  mainBgIdx: 0,
  mainFontSize: FONT_SIZES[1],
  mainAlpha: 0.76,
  mainTextColor: "#FFFFFF",
  mainRadius: 28,
  mainPos: { x: 0.5, y: 0.5 },
};

// --------- Utility functions ----------
function colorWithAlpha(color: string, alpha: number): string {
  if (color.startsWith("rgba(")) {
    const nums = color
      .replace(/^rgba\(|\)$/g, "")
      .split(",")
      .map((s) => s.trim());
    const [r, g, b] = nums.slice(0, 3).map(Number);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((h) => h + h)
        .join("");
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

function toHex6(color: string): string {
  if (typeof color === "string" && color.startsWith("#") && color.length === 4) {
    const r = color[1],
      g = color[2],
      b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (typeof color === "string" && color.startsWith("#") && color.length === 7) {
    return color.toUpperCase();
  }
  // fallback: try to parse rgba() to hex, or return as is
  // Edge case if invalid
  return color;
}

// --- Load/Save OverlayState (localStorage) ---
function loadOverlayState(): OverlayState {
  try {
    const s = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!s) return initialOverlayState;
    return {
      ...initialOverlayState,
      ...(JSON.parse(s) as Partial<OverlayState>),
    };
  } catch {
    return initialOverlayState;
  }
}
function saveOverlayState(state: OverlayState) {
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ----------- Reusable Components ---------

type OverlayControlsProps = {
  state: OverlayState;
  setState: (s: OverlayState) => void;
  palette: string[];
};

const OverlayControls: React.FC<OverlayControlsProps> = ({ state, setState, palette }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label
        style={{
          fontWeight: 600,
          color: "#285",
          fontSize: 18,
          marginBottom: 7,
        }}
      >
        Main Text
      </label>
      <input
        type="text"
        maxLength={200}
        placeholder="Your main overlay text..."
        aria-label="Main text"
        value={state.mainText}
        onChange={(e) => setState({ ...state, mainText: e.target.value })}
        style={{
          width: "min(34vw,280px)",
          padding: "7px 12px",
          fontSize: 16,
          borderRadius: 8,
          border: "none",
          background: "#ebf7eb",
          color: "#111",
          boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "#286", fontSize: 15 }}>Size</span>
        <input
          type="number"
          min={1}
          value={state.mainFontSize}
          step={1}
          style={{
            width: 48,
            fontSize: 15,
            padding: "5px 5px",
            borderRadius: 8,
            border: "none",
            background: "#dbfaef",
            color: "#222",
            textAlign: "center",
            boxShadow: "0 1.5px 6px #0002",
          }}
          onChange={(e) => setState({ ...state, mainFontSize: Number(e.target.value) })}
        />
        <span style={{ color: "#286", fontSize: 14 }}>Text color</span>
        <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
          {TEXT_COLORS.map((c, i) => (
            <ColorButton
              key={`main-txtc-${i}`}
              color={c}
              selected={state.mainTextColor.toUpperCase() === toHex6(c)}
              onClick={() => setState({ ...state, mainTextColor: toHex6(c) })}
            />
          ))}
          <input
            type="color"
            value={toHex6(state.mainTextColor)}
            aria-label="Custom text color"
            onChange={(e) => setState({ ...state, mainTextColor: toHex6(e.target.value) })}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "none",
              background: "none",
            }}
          />
        </div>
        <span style={{ color: "#286", fontSize: 14 }}>Radius</span>
        <input
          type="number"
          min={0}
          max={120}
          value={state.mainRadius}
          step={1}
          style={{
            width: 38,
            fontSize: 15,
            padding: "5px 6px",
            borderRadius: 8,
            border: "none",
            background: "#e7f7e0",
            color: "#125",
            textAlign: "center",
          }}
          onChange={(e) => setState({ ...state, mainRadius: Number(e.target.value) })}
          title="Border radius"
        />
        <span style={{ color: "#286", fontSize: 14 }}>Background</span>
        <div style={{ display: "flex", gap: 5 }}>
          {palette.map((color, i) => (
            <ColorButton
              key={`main-bg-${i}`}
              color={color}
              selected={state.mainBgIdx === i}
              onClick={() => setState({ ...state, mainBgIdx: i })}
            />
          ))}
        </div>
        <span style={{ color: "#286", fontSize: 14 }}>Opacity</span>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.01}
          value={state.mainAlpha}
          onChange={(e) => setState({ ...state, mainAlpha: Number(e.target.value) })}
          style={{
            width: 77,
            accentColor: palette[state.mainBgIdx] ?? "#6666ff",
            background: "#151726",
          }}
        />
        <span style={{ fontSize: 13, width: 33, color: "#138" }}>{Math.round(state.mainAlpha * 100)}%</span>
      </div>
    </div>
  );
};

type OverlayBoxProps = {
  text: string;
  bgColor: string;
  bgAlpha: number;
  textColor: string;
  fontSize: number;
  padding: { x: number; y: number };
  radius: number;
  position: { x: number; y: number }; // normalized [0,1]
  previewW: number;
  previewH: number;
  onPosChange: (pos: { x: number; y: number }) => void;
};

const OverlayBox: React.FC<OverlayBoxProps> = ({
  text,
  bgColor,
  bgAlpha,
  textColor,
  fontSize,
  padding,
  radius,
  position,
  previewW,
  previewH,
  onPosChange,
}) => {
  // compute text width (estimation, dynamically)
  const [estWidth, setEstWidth] = useState<number>(200);
  const displayText = text || " ";

  useEffect(() => {
    // estimate width using measurement
    if (typeof window === "undefined") return;
    const dummy = document.createElement("span");
    dummy.style.font = `500 ${Math.round(fontSize * (previewW / IMAGE_WIDTH))}px Inter, Arial, sans-serif`;
    dummy.style.visibility = "hidden";
    dummy.style.position = "absolute";
    dummy.style.whiteSpace = "nowrap";
    dummy.innerText = displayText;
    document.body.appendChild(dummy);
    setEstWidth(dummy.getBoundingClientRect().width);
    document.body.removeChild(dummy);
    // Cleanups
    // eslint-disable-next-line
  }, [displayText, fontSize, previewW]);

  // Calculate sizes, position, etc
  const pxFontSize = Math.round(fontSize * (previewW / IMAGE_WIDTH));
  const pxPadX = padding.x * (previewW / IMAGE_WIDTH);
  const pxPadY = padding.y * (previewH / IMAGE_HEIGHT);

  const textWidth = estWidth + 2 * pxPadX;
  const textHeight = pxFontSize + 2 * pxPadY;

  const minX = 0;
  const maxX = previewW - textWidth;
  const minY = 0;
  const maxY = previewH - textHeight;

  // compute offset from normalized center (position.x, position.y)
  const left = position.x * previewW - textWidth / 2;
  const top = position.y * previewH - textHeight / 2;

  // Draggable expects px offset from top/left
  const controlledPosition = {
    x: Math.max(minX, Math.min(maxX, left)),
    y: Math.max(minY, Math.min(maxY, top)),
  };

  // When user stops dragging, map px to normalized
  const handleDrag = (_e: DraggableEvent, data: DraggableData): void => {
    // data.x is px from parent left, data.y from top
    // Convert center of box to normalized
    const center = {
      x: (data.x + textWidth / 2) / previewW,
      y: (data.y + textHeight / 2) / previewH,
    };
    // Clamp within bounds
    const minNormX = textWidth / 2 / previewW;
    const maxNormX = 1 - minNormX;
    const minNormY = textHeight / 2 / previewH;
    const maxNormY = 1 - minNormY;
    onPosChange({
      x: Math.max(minNormX, Math.min(maxNormX, center.x)),
      y: Math.max(minNormY, Math.min(maxNormY, center.y)),
    });
  };

  return (
    <Draggable
      bounds="parent"
      position={controlledPosition}
      onDrag={handleDrag}
      onStop={handleDrag}
      handle=".draggable-overlay-box"
    >
      <div
        className="draggable-overlay-box"
        tabIndex={0}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          background: colorWithAlpha(bgColor, bgAlpha),
          borderRadius: radius * (previewW / IMAGE_WIDTH),
          fontSize: pxFontSize,
          fontWeight: 500,
          color: textColor,
          padding: `${pxPadY}px ${pxPadX}px`,
          textAlign: "center",
          maxWidth: "94%",
          whiteSpace: "nowrap",
          overflowX: "auto",
          overflowY: "hidden",
          boxShadow: "0 2px 14px rgba(0,0,0,0.23)",
          userSelect: "none",
          cursor: "grab",
          zIndex: 2,
          outline: undefined,
          border: undefined,
          fontFamily: "Inter, Arial, sans-serif",
          minWidth: 80,
          opacity: 1,
          transition: "box-shadow .16s",
        }}
        aria-label="Overlay Main Text (drag to move)"
        title="Drag to move overlay text"
      >
        {text || <span style={{ opacity: 0.28 }}>Your main text here</span>}
      </div>
    </Draggable>
  );
};

type OverlayStateTextareaProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error: string;
};

const OverlayStateTextarea: React.FC<OverlayStateTextareaProps> = ({ value, onChange, error }) => (
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
      value={value}
      onChange={onChange}
      style={{
        width: "100%",
        minHeight: 140,
        fontSize: 14,
        fontFamily: "Fira Mono,monospace, monospace",
        borderRadius: 8,
        padding: 9,
        border: error ? "2px solid #e22" : "2px solid #aac",
        background: "#f2f7fb",
        color: "#1E293B",
        resize: "vertical",
      }}
      spellCheck={false}
      rows={8}
      title="Edit overlay state: you can paste/copy the overlay settings JSON here"
      aria-label="Overlay state JSON text area"
    />
    {error && (
      <div
        style={{
          color: "#b22",
          fontSize: 14,
          marginTop: 2,
          marginBottom: 3,
        }}
      >
        {error}
      </div>
    )}
    <div style={{ fontSize: 13, color: "#248a6a", marginTop: 2, opacity: 0.81 }}>
      You can copy/paste or edit the full overlay state as editable JSON.
      <br />
      The UI will update once valid JSON is parsed.
    </div>
  </div>
);

type ColorButtonProps = {
  color: string;
  selected: boolean;
  onClick: () => void;
};
const ColorButton: React.FC<ColorButtonProps> = ({ color, selected, onClick }) => (
  <div
    role="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        onClick();
      }
    }}
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

// ----------- Main Component ------------

const OverlayImageEditor: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>(PRESET_COLORS);

  const [overlayState, setOverlayState] = useState<OverlayState>(() => loadOverlayState());
  const [overlayStateJson, setOverlayStateJson] = useState<string>(() => JSON.stringify(loadOverlayState(), null, 2));
  const [overlayStateJsonError, setOverlayStateJsonError] = useState<string>("");

  const previewRef = useRef<HTMLDivElement>(null);

  // Persist overlayState and JSON
  useEffect(() => {
    setOverlayStateJson(JSON.stringify(overlayState, null, 2));
    saveOverlayState(overlayState);
    // eslint-disable-next-line
  }, [overlayState]);

  // Handle file/image load
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const imgUrl = URL.createObjectURL(file);
    setImage(imgUrl);
    setOverlayState(loadOverlayState());
    setOverlayStateJson(JSON.stringify(loadOverlayState(), null, 2));
    setPalette(PRESET_COLORS);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const imgUrl = URL.createObjectURL(file);
    setImage(imgUrl);
    setOverlayState(loadOverlayState());
    setOverlayStateJson(JSON.stringify(loadOverlayState(), null, 2));
    setPalette(PRESET_COLORS);
  };

  // Editable textarea logic
  const handleOverlayStateJsonEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setOverlayStateJson(text);
    try {
      const json = JSON.parse(text);
      setOverlayState((prev) => ({ ...prev, ...json }));
      setOverlayStateJsonError("");
    } catch (err: any) {
      setOverlayStateJsonError("Invalid JSON: " + (err?.message || "parse error"));
    }
  };

  // Download export
  const handleDownload = useCallback(() => {
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
      // fit image into 1920x1080
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
      // main text box
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `500 ${overlayState.mainFontSize}px Inter, Arial,sans-serif`;
      const displayText = overlayState.mainText.trim() ? overlayState.mainText : " ";
      const metrics = ctx.measureText(displayText);
      const paddingX = 54,
        paddingY = 26,
        rad = overlayState.mainRadius;
      const textWidth = metrics.width + paddingX * 2;
      const textHeight = overlayState.mainFontSize + paddingY * 2;
      const posX = overlayState.mainPos.x * IMAGE_WIDTH;
      const posY = overlayState.mainPos.y * IMAGE_HEIGHT;
      ctx.globalAlpha = overlayState.mainAlpha;
      ctx.fillStyle = palette[overlayState.mainBgIdx] ?? "#222";
      drawRoundRect(ctx, posX - textWidth / 2, posY - textHeight / 2, textWidth, textHeight, rad);
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = overlayState.mainTextColor || "#FFFFFF";
      ctx.font = `500 ${overlayState.mainFontSize}px Inter, Arial,sans-serif`;
      if (overlayState.mainText.trim()) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(posX - textWidth / 2, posY - textHeight / 2, textWidth, textHeight);
        ctx.clip();
        ctx.fillText(overlayState.mainText, posX, posY);
        ctx.restore();
      }
      ctx.restore();
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
  }, [image, overlayState, palette]);

  // ---- JSX ----
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#e2f1e9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily: "Inter, Arial, sans-serif",
        padding: 12,
        color: "#162611",
      }}
    >
      {/* Title */}
      <div
        style={{
          marginTop: 20,
          marginBottom: 20,
          textAlign: "center",
          color: "#183",
          maxWidth: 900,
        }}
      >
        <h1
          style={{
            fontSize: "2.3rem",
            marginBottom: 7,
            fontWeight: 700,
            color: "#19c646",
          }}
        >
          Overlay Image Editor
        </h1>
        <ul
          style={{
            textAlign: "left",
            maxWidth: 550,
            margin: "0 auto 7px auto",
            fontSize: 18,
            color: "#173c2a",
            background: "#b0eeceee",
            borderRadius: 13,
            padding: "16px 26px 17px 40px",
            boxShadow: "0 2px 16px #0002",
            lineHeight: 1.66,
          }}
        >
          <li>Drag &amp; Drop or click to load image (preview 1920×1080)</li>
          <li>Type overlay text, choose font, color, position, background, &amp; radius</li>
          <li>
            All settings persist via <b>localStorage</b>
          </li>
          <li>Click "Download" to export PNG with your chosen overlay</li>
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
            background: "#f7fff7",
            borderRadius: 12,
            userSelect: "none",
            marginBottom: 24,
            maxWidth: "95vw",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>Drag &amp; Drop Image Here</div>
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
          {/* Sidebar */}
          <aside
            style={{
              minWidth: 270,
              maxWidth: 350,
              background: "linear-gradient(120deg,#e6fff6 70%,#f2f2d5 110%)",
              borderRadius: 11,
              boxShadow: "0 2px 32px #3375a012",
              padding: "28px 19px 24px 22px",
              marginRight: 0,
              position: "relative",
              zIndex: 2,
              marginBottom: 10,
            }}
          >
            <OverlayControls state={overlayState} setState={setOverlayState} palette={palette} />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 9,
                marginTop: 22,
                marginBottom: 11,
              }}
            >
              <button
                style={{
                  padding: "14px 12px",
                  fontSize: 18,
                  background: "#28c840",
                  color: "white",
                  border: "none",
                  borderRadius: 7,
                  cursor: "pointer",
                  boxShadow: "0 3px 12px #6af3",
                  fontWeight: 600,
                }}
                onClick={handleDownload}
                disabled={!image}
              >
                Download PNG
              </button>
              <button
                style={{
                  padding: "10px 10px",
                  fontSize: 14,
                  background: "#ccefe9",
                  color: "#242",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  opacity: 0.95,
                }}
                onClick={() => {
                  setImage(null);
                  setPalette(PRESET_COLORS);
                  setOverlayState(initialOverlayState);
                  setOverlayStateJson(JSON.stringify(initialOverlayState, null, 2));
                }}
              >
                Reset
              </button>
            </div>
            <OverlayStateTextarea
              value={overlayStateJson}
              onChange={handleOverlayStateJsonEdit}
              error={overlayStateJsonError}
            />
          </aside>
          {/* Preview */}
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
              border: "2.5px solid #6bfac7",
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
            <OverlayBox
              text={overlayState.mainText}
              bgColor={palette[overlayState.mainBgIdx] || "#222"}
              bgAlpha={overlayState.mainAlpha}
              textColor={overlayState.mainTextColor}
              fontSize={overlayState.mainFontSize}
              padding={{ x: 54, y: 26 }}
              radius={overlayState.mainRadius}
              position={overlayState.mainPos}
              previewW={previewRef.current?.clientWidth || IMAGE_WIDTH}
              previewH={previewRef.current?.clientHeight || IMAGE_HEIGHT}
              onPosChange={(pos) =>
                setOverlayState((prev) => ({
                  ...prev,
                  mainPos: pos,
                }))
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OverlayImageEditor;
