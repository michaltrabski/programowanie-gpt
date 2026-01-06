import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  type Ref,
} from "react";
import Moveable, {
  type OnDrag,
  type OnResize,
  type OnRotate,
} from "react-moveable";

// -------- Types & Constants ---------
const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;
const PRESET_BG_COLORS = ["red", "black", "#FFFFFF"];
const PRESET_TEXT_COLORS = ["red", "black", "#FFFFFF"];

// Arrow constants
const ARROW_PNG_URL = "/red-arrow.png";
const DEFAULT_ARROW_SIZE = { w: 190, h: 66 }; // px, matches original PNG size
const ARROW_MIN_SCALE = 0.15;

const LOCALSTORAGE_KEY = "overlay_image_editor_main_v2"; // bump v2 for new state!

export type OverlayState = {
  mainText: string;
  mainBgIdx: number;
  mainFontSize: number;
  mainAlpha: number;
  mainTextColor: string;
  mainRadius: number;
  mainPos: { x: number; y: number }; // normalized 0..1
  arrowPos: { x: number; y: number }; // normalized 0..1 (centered)
};

const initialOverlayState: OverlayState = {
  mainText: "Kto ma pierwszeństwo?",
  mainBgIdx: 0,
  mainFontSize: 100,
  mainAlpha: 0.76,
  mainTextColor: "#FFFFFF",
  mainRadius: 5,
  mainPos: { x: 0.5, y: 0.5 },
  arrowPos: { x: 0.28, y: 0.78 },
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
  if (color.startsWith("rgb(")) {
    const nums = color
      .replace(/^rgb\(|\)$/g, "")
      .split(",")
      .map((s) => s.trim());
    const [r, g, b] = nums.map(Number);
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
  if (typeof document !== "undefined") {
    try {
      const dummy = document.createElement("div");
      dummy.style.color = color;
      document.body.appendChild(dummy);
      const computedColor = getComputedStyle(dummy).color;
      document.body.removeChild(dummy);
      if (/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.test(computedColor)) {
        const nums = computedColor
          .replace(/^rgb\(|\)$/g, "")
          .split(",")
          .map((s) => s.trim());
        const [r, g, b] = nums.map(Number);
        return `rgba(${r},${g},${b},${alpha})`;
      }
    } catch {
      // ignore
    }
  }
  return color;
}
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
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
  const isHex3 = /^#[0-9a-fA-F]{3}$/.test(color);
  const isHex6 = /^#[0-9a-fA-F]{6}$/.test(color);
  if (isHex6) return color.toUpperCase();
  if (isHex3)
    return (
      "#" +
      color
        .slice(1)
        .split("")
        .map((h) => h + h)
        .join("")
    ).toUpperCase();

  if (typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#000";
        ctx.fillStyle = color;
        const computed = ctx.fillStyle as string;
        if (/^#[0-9a-fA-F]{6}$/.test(computed)) return computed.toUpperCase();
        const m = computed.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);
        if (m) {
          const [r, g, b] = m.slice(1).map((v) => Number(v));
          const h = (n: number) => n.toString(16).padStart(2, "0");
          return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
        }
      }
    } catch {}
  }
  return "#FFFFFF";
}
function loadOverlayState(): OverlayState {
  try {
    const s = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!s) return initialOverlayState;
    const parsed = JSON.parse(s) as Partial<OverlayState>;
    return {
      ...initialOverlayState,
      ...parsed,
      mainTextColor: toHex6(
        parsed.mainTextColor || initialOverlayState.mainTextColor
      ),
      mainAlpha:
        typeof parsed.mainAlpha === "number"
          ? Math.min(1, Math.max(0.2, parsed.mainAlpha))
          : initialOverlayState.mainAlpha,
      mainPos: parsed.mainPos
        ? {
            x: Math.min(1, Math.max(0, parsed.mainPos.x)),
            y: Math.min(1, Math.max(0, parsed.mainPos.y)),
          }
        : initialOverlayState.mainPos,
      arrowPos: parsed.arrowPos
        ? {
            x: Math.min(1, Math.max(0, parsed.arrowPos.x)),
            y: Math.min(1, Math.max(0, parsed.arrowPos.y)),
          }
        : initialOverlayState.arrowPos,
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

// ----------- ColorPalette, etc (as-is) ----------
type ColorPaletteProps = {
  label: string;
  palette: string[];
  selected: string | number;
  onChange: (color: string | number) => void;
  allowCustom?: boolean;
  isBg?: boolean;
  style?: React.CSSProperties;
};
const ColorPalette: React.FC<ColorPaletteProps> = ({
  label,
  palette,
  selected,
  onChange,
  allowCustom = false,
  isBg = false,
  style,
}) => (
  <div style={{ display: "flex", flexDirection: "column", ...style }}>
    <span style={{ color: "#286", fontSize: 14, marginBottom: 3 }}>{label}</span>
    <div style={{ display: "flex", gap: 5 }}>
      {palette.map((color, i) => {
        const isSelected =
          typeof selected === "number"
            ? selected === i
            : toHex6(selected as string) === toHex6(color);

        return (
          <ColorButton
            key={`color-btn-${label}-${i}`}
            color={color}
            selected={isSelected}
            onClick={() => onChange(isBg ? i : toHex6(color))}
          />
        );
      })}
      {allowCustom && (
        <input
          type="color"
          value={
            typeof selected === "string"
              ? toHex6(selected)
              : palette[selected as number] || "#ffffff"
          }
          aria-label={`Custom ${label.toLowerCase()} color`}
          onChange={(e) => {
            if (isBg) {
              onChange(e.target.value);
            } else {
              onChange(toHex6(e.target.value));
            }
          }}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: "none",
            background: "none",
            marginLeft: 2,
          }}
        />
      )}
    </div>
  </div>
);

type ColorButtonProps = {
  color: string;
  selected: boolean;
  onClick: () => void;
};
const ColorButton: React.FC<ColorButtonProps> = ({
  color,
  selected,
  onClick,
}) => (
  <div
    role="button"
    aria-pressed={selected}
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

// ----------- Overlay Controls (as-is) ----------------
type OverlayControlsProps = {
  state: OverlayState;
  setState: (s: OverlayState) => void;
  bgPalette: string[];
  textPalette: string[];
};
const OverlayControls: React.FC<OverlayControlsProps> = ({
  state,
  setState,
  bgPalette,
  textPalette,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label
        style={{ fontWeight: 600, color: "#285", fontSize: 18, marginBottom: 7 }}
      >
        Main Text
      </label>
      <textarea
        maxLength={200}
        placeholder="Your overlay text (multi-line)..."
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
          resize: "vertical",
          minHeight: 54,
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
          min={8}
          value={state.mainFontSize}
          step={1}
          style={{
            width: 56,
            fontSize: 15,
            padding: "5px 5px",
            borderRadius: 8,
            border: "none",
            background: "#dbfaef",
            color: "#222",
            textAlign: "center",
            boxShadow: "0 1.5px 6px #0002",
          }}
          onChange={(e) =>
            setState({
              ...state,
              mainFontSize: Math.max(8, Number(e.target.value) || 8),
            })
          }
        />

        <ColorPalette
          label="Text color"
          palette={textPalette}
          selected={state.mainTextColor}
          onChange={(c) => setState({ ...state, mainTextColor: c as string })}
          allowCustom
          isBg={false}
          style={{ marginLeft: 2, marginRight: 2 }}
        />

        <span style={{ color: "#286", fontSize: 14 }}>Radius</span>
        <input
          type="number"
          min={0}
          max={120}
          value={state.mainRadius}
          step={1}
          style={{
            width: 48,
            fontSize: 15,
            padding: "5px 6px",
            borderRadius: 8,
            border: "none",
            background: "#e7f7e0",
            color: "#125",
            textAlign: "center",
          }}
          onChange={(e) =>
            setState({
              ...state,
              mainRadius: Math.max(0, Number(e.target.value) || 0),
            })
          }
          title="Border radius"
        />

        <ColorPalette
          label="Background"
          palette={bgPalette}
          selected={state.mainBgIdx}
          onChange={(idxOrColor) => {
            if (typeof idxOrColor === "number") {
              setState({ ...state, mainBgIdx: idxOrColor });
            } else {
              setState({ ...state, mainBgIdx: bgPalette.length - 1 });
            }
          }}
          allowCustom={true}
          isBg={true}
          style={{ marginLeft: 2, marginRight: 2 }}
        />

        <span style={{ color: "#286", fontSize: 14 }}>Opacity</span>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.01}
          value={state.mainAlpha}
          onChange={(e) =>
            setState({
              ...state,
              mainAlpha: Math.max(0.2, Math.min(1, Number(e.target.value))),
            })
          }
          style={{
            width: 90,
            accentColor: bgPalette[state.mainBgIdx] ?? "#6666ff",
            background: "#151726",
          }}
        />
        <span style={{ fontSize: 13, width: 38, color: "#138" }}>
          {Math.round(state.mainAlpha * 100)}%
        </span>
      </div>
    </div>
  );
};

type OverlayStateTextareaProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error: string;
};
const OverlayStateTextarea: React.FC<OverlayStateTextareaProps> = ({
  value,
  onChange,
  error,
}) => (
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
        fontFamily: "Fira Mono, monospace",
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
    <div
      style={{
        fontSize: 13,
        color: "#248a6a",
        marginTop: 2,
        opacity: 0.81,
      }}
    >
      You can copy/paste or edit the full overlay state as editable JSON. The UI
      will update once valid JSON is parsed.
    </div>
  </div>
);

// --- Moveable OverlayBox ---
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

const OverlayBox = forwardRef<HTMLDivElement, OverlayBoxProps>(
  (
    {
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
    },
    ref
  ) => {
    const nodeRef = useRef<HTMLDivElement>(null);

    // Keep only normalized size and rotation to avoid double transforms with Moveable
    const [box, setBox] = useState<{
      widthN: number; // fraction of previewW
      heightN: number; // fraction of previewH
      rotation: number; // deg
    }>({
      widthN: 350 / Math.max(1, previewW),
      heightN: 120 / Math.max(1, previewH),
      rotation: 0,
    });

    // compute text width/height (min content size)
    const [estDims, setEstDims] = useState<{ width: number; lines: number }>({
      width: 200,
      lines: 1,
    });
    useEffect(() => {
      if (typeof window === "undefined") return;
      const lines = (text || " ").split("\n");
      let maxWidth = 0;
      const span = document.createElement("span");
      span.style.font = `500 ${Math.round(
        fontSize * (previewW / IMAGE_WIDTH)
      )}px Inter, Arial, sans-serif`;
      span.style.visibility = "hidden";
      span.style.position = "absolute";
      span.style.whiteSpace = "nowrap";
      lines.forEach((line) => {
        span.innerText = line.length ? line : " ";
        document.body.appendChild(span);
        maxWidth = Math.max(maxWidth, span.getBoundingClientRect().width);
        document.body.removeChild(span);
      });
      setEstDims({ width: maxWidth, lines: lines.length });
    }, [text, fontSize, previewW]);

    const pxFontSize = Math.round(fontSize * (previewW / IMAGE_WIDTH));
    const pxPadX = padding.x * (previewW / IMAGE_WIDTH);
    const pxPadY = padding.y * (previewH / IMAGE_HEIGHT);

    const minTextWidthPx = estDims.width + 2 * pxPadX;
    const minTextHeightPx = estDims.lines * pxFontSize + 2 * pxPadY;

    // Ensure current normalized size respects the minimum required for content.
    useEffect(() => {
      setBox((s) => {
        const currentWidthPx = s.widthN * previewW;
        const currentHeightPx = s.heightN * previewH;
        const newWidthPx = Math.max(currentWidthPx, minTextWidthPx, 80);
        const newHeightPx = Math.max(currentHeightPx, minTextHeightPx, 40);
        return {
          ...s,
          widthN: newWidthPx / Math.max(1, previewW),
          heightN: newHeightPx / Math.max(1, previewH),
        };
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [minTextWidthPx, minTextHeightPx, previewW, previewH]);

    // Expose nodeRef to parent
    useEffect(() => {
      if (ref && typeof ref === "object" && ref !== nodeRef) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current =
          nodeRef.current;
      }
    }, [ref]);

    // Derived px size and position
    const widthPx = Math.max(80, box.widthN * previewW);
    const heightPx = Math.max(40, box.heightN * previewH);
    const leftPx = position.x * previewW - widthPx / 2;
    const topPx = position.y * previewH - heightPx / 2;

    return (
      <>
        <div
          ref={nodeRef}
          className="moveable-textbox"
          tabIndex={0}
          style={{
            position: "absolute",
            left: leftPx,
            top: topPx,
            width: widthPx,
            height: heightPx,
            background: colorWithAlpha(bgColor, bgAlpha),
            borderRadius: radius * (previewW / IMAGE_WIDTH),
            fontSize: pxFontSize,
            fontWeight: 500,
            color: textColor,
            padding: `${pxPadY}px ${pxPadX}px`,
            textAlign: "center",
            whiteSpace: "pre-line",
            overflowX: "auto",
            overflowY: "hidden",
            boxShadow: "0 2px 14px rgba(0,0,0,0.23)",
            userSelect: "none",
            cursor: "grab",
            zIndex: 2,
            fontFamily: "Inter, Arial, sans-serif",
            opacity: 1,
            transition: "box-shadow .16s",
            transform: `rotate(${box.rotation}deg)`,
            minWidth: 80,
          }}
          aria-label="Overlay Main Text (drag/rotate/resize)"
          title="Drag/resize/rotate overlay text"
        >
          {text ? text : <span style={{ opacity: 0.28 }}>Your main text here</span>}
        </div>
        <Moveable
          target={nodeRef.current}
          draggable
          resizable
          rotatable
          keepRatio={false}
          renderDirections={["nw", "ne", "sw", "se", "n", "s", "e", "w"]}
          snappable
          snapThreshold={6}
          throttleDrag={0}
          bounds={{
            left: 0,
            top: 0,
            right: previewW,
            bottom: previewH,
          }}
          onDrag={(e: OnDrag) => {
            // We control position ourselves via React state.
            // Compute new normalized center from delta.
            const startLeft = position.x * previewW - widthPx / 2;
            const startTop = position.y * previewH - heightPx / 2;

            let newLeft = startLeft + (e.delta?.[0] ?? 0);
            let newTop = startTop + (e.delta?.[1] ?? 0);

            // Clamp inside bounds
            newLeft = Math.max(0, Math.min(previewW - widthPx, newLeft));
            newTop = Math.max(0, Math.min(previewH - heightPx, newTop));

            onPosChange({
              x: (newLeft + widthPx / 2) / previewW,
              y: (newTop + heightPx / 2) / previewH,
            });
          }}
          onResize={(e: OnResize) => {
            // Respect minimum content size
            const newW = Math.max(80, Math.max(minTextWidthPx, e.width));
            const newH = Math.max(40, Math.max(minTextHeightPx, e.height));

            // Set normalized size
            setBox((s) => ({
              ...s,
              widthN: newW / Math.max(1, previewW),
              heightN: newH / Math.max(1, previewH),
            }));

            // Update center from drag.left/top
            const l = e.drag.left;
            const t = e.drag.top;

            // Clamp position
            const clampedLeft = Math.max(0, Math.min(previewW - newW, l));
            const clampedTop = Math.max(0, Math.min(previewH - newH, t));

            onPosChange({
              x: (clampedLeft + newW / 2) / previewW,
              y: (clampedTop + newH / 2) / previewH,
            });
          }}
          onRotate={(e: OnRotate) => {
            setBox((s) => ({ ...s, rotation: e.beforeRotate }));
          }}
          throttleResize={0}
          throttleRotate={0}
          origin={false}
          hideDefaultLines={false}
          rotationPosition="top"
        />
        <div style={{ fontSize: 10, opacity: 0.7, userSelect: "none" }}>
          <button
            style={{
              fontSize: 11,
              cursor: "pointer",
              marginTop: 2,
              border: "1px solid #ccc",
              background: "#eff",
              borderRadius: 5,
              padding: "2px 8px",
            }}
            onClick={() =>
              setBox((s) => ({
                ...s,
                rotation: 0,
                // Reset size back to minimum content size
                widthN:
                  Math.max(minTextWidthPx, 80) / Math.max(1, previewW),
                heightN:
                  Math.max(minTextHeightPx, 40) / Math.max(1, previewH),
              }))
            }
          >
            Reset rotation/size
          </button>
        </div>
      </>
    );
  }
);
OverlayBox.displayName = "OverlayBox";

// --- Moveable Arrow ---
type DraggableArrowProps = {
  arrowImg: HTMLImageElement | null;
  position: { x: number; y: number }; // normalized center position [0,1]
  previewW: number;
  previewH: number;
  onPosChange: (pos: { x: number; y: number }) => void;
};
const DraggableArrow: React.FC<DraggableArrowProps> = ({
  arrowImg,
  position,
  previewW,
  previewH,
  onPosChange,
}) => {
  const arrowRef = useRef<HTMLDivElement>(null);

  // Normalize size to preview for stable resize across container changes
  const initialArrowWN = DEFAULT_ARROW_SIZE.w / IMAGE_WIDTH;
  const initialArrowHN = DEFAULT_ARROW_SIZE.h / IMAGE_HEIGHT;
  const minArrowWN = initialArrowWN * ARROW_MIN_SCALE;
  const minArrowHN = initialArrowHN * ARROW_MIN_SCALE;

  const [state, setState] = useState<{
    widthN: number;
    heightN: number;
    rotation: number;
  }>({
    widthN: initialArrowWN,
    heightN: initialArrowHN,
    rotation: 0,
  });

  // Derived px size and pos
  const widthPx = Math.max(minArrowWN * previewW, state.widthN * previewW);
  const heightPx = Math.max(minArrowHN * previewH, state.heightN * previewH);
  const leftPx = position.x * previewW - widthPx / 2;
  const topPx = position.y * previewH - heightPx / 2;

  // Helper for clamping center position
  const clampCenter = (left: number, top: number, w: number, h: number) => {
    const minNormX = w / 2 / previewW;
    const maxNormX = 1 - minNormX;
    const minNormY = h / 2 / previewH;
    const maxNormY = 1 - minNormY;
    return {
      x: Math.max(minNormX, Math.min(maxNormX, (left + w / 2) / previewW)),
      y: Math.max(minNormY, Math.min(maxNormY, (top + h / 2) / previewH)),
    };
  };

  return (
    <>
      <div
        ref={arrowRef}
        style={{
          position: "absolute",
          left: leftPx,
          top: topPx,
          width: widthPx,
          height: heightPx,
          zIndex: 5,
          userSelect: "none",
          touchAction: "none",
          pointerEvents: arrowImg ? "auto" : "none",
          transform: `rotate(${state.rotation}deg)`,
        }}
        tabIndex={0}
        aria-label="Moveable Arrow"
      >
        {arrowImg ? (
          <img
            src={arrowImg.src}
            alt="Arrow"
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              userSelect: "none",
              opacity: 0.95,
              filter:
                "drop-shadow(0 2px 12px rgba(206,54,33,0.19)) drop-shadow(0 1px 5px rgba(80,0,0,0.12))",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#8884",
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: Math.floor(Math.max(14, widthPx / 6)),
              color: "#c44",
            }}
          >
            Arrow...
          </div>
        )}
      </div>
      {arrowImg && (
        <>
          <Moveable
            target={arrowRef.current}
            draggable
            resizable
            rotatable
            keepRatio
            snappable
            snapThreshold={5}
            bounds={{
              left: 0,
              top: 0,
              right: previewW,
              bottom: previewH,
            }}
            origin={false}
            throttleDrag={0}
            renderDirections={["nw", "ne", "sw", "se"]}
            onDrag={(e: OnDrag) => {
              const startLeft = position.x * previewW - widthPx / 2;
              const startTop = position.y * previewH - heightPx / 2;

              let newLeft = startLeft + (e.delta?.[0] ?? 0);
              let newTop = startTop + (e.delta?.[1] ?? 0);

              // Clamp inside bounds
              newLeft = Math.max(0, Math.min(previewW - widthPx, newLeft));
              newTop = Math.max(0, Math.min(previewH - heightPx, newTop));

              onPosChange(clampCenter(newLeft, newTop, widthPx, heightPx));
            }}
            onResize={(e: OnResize) => {
              const newW = Math.max(minArrowWN * previewW, e.width);
              const newH = Math.max(minArrowHN * previewH, e.height);

              setState((s) => ({
                ...s,
                widthN: newW / Math.max(1, previewW),
                heightN: newH / Math.max(1, previewH),
              }));

              const l = e.drag.left;
              const t = e.drag.top;

              const clampedLeft = Math.max(0, Math.min(previewW - newW, l));
              const clampedTop = Math.max(0, Math.min(previewH - newH, t));

              onPosChange(clampCenter(clampedLeft, clampedTop, newW, newH));
            }}
            onRotate={(e: OnRotate) => {
              setState((s) => ({ ...s, rotation: e.beforeRotate }));
            }}
            throttleResize={0}
            throttleRotate={0}
            rotationPosition="top"
          />
          <div
            style={{
              fontSize: 10,
              opacity: 0.7,
              userSelect: "none",
              pointerEvents: "auto",
            }}
          >
            <button
              style={{
                fontSize: 11,
                cursor: "pointer",
                marginTop: 2,
                border: "1px solid #ccc",
                background: "#ffe",
                borderRadius: 5,
                padding: "2px 8px",
              }}
              onClick={() =>
                setState({
                  rotation: 0,
                  widthN: initialArrowWN,
                  heightN: initialArrowHN,
                })
              }
            >
              Reset rotation/size
            </button>
          </div>
        </>
      )}
    </>
  );
};

// ----------- Main Component ------------
const OverlayImageEditor: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [bgPalette, setBgPalette] = useState<string[]>(PRESET_BG_COLORS);
  const [textPalette, setTextPalette] = useState<string[]>(PRESET_TEXT_COLORS);

  const [overlayState, setOverlayState] = useState<OverlayState>(() =>
    loadOverlayState()
  );
  const [overlayStateJson, setOverlayStateJson] = useState<string>(() =>
    JSON.stringify(loadOverlayState(), null, 2)
  );
  const [overlayStateJsonError, setOverlayStateJsonError] =
    useState<string>("");

  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState<{ w: number; h: number }>({
    w: IMAGE_WIDTH,
    h: IMAGE_HEIGHT,
  });

  const [arrowImg, setArrowImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = ARROW_PNG_URL;
    img.onload = () => setArrowImg(img);
    img.onerror = () => setArrowImg(null);
    return () => {
      setArrowImg(null);
    };
  }, []);

  useEffect(() => {
    setOverlayStateJson(JSON.stringify(overlayState, null, 2));
    saveOverlayState(overlayState);
  }, [overlayState]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    const updateSize = () => {
      setPreviewSize({
        w: Math.round(el.clientWidth),
        h: Math.round(el.clientHeight),
      });
    };
    updateSize();

    const ro = new window.ResizeObserver(() => updateSize());
    ro.observe(el);

    window.addEventListener("resize", updateSize);
    window.addEventListener("orientationchange", updateSize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("orientationchange", updateSize);
    };
  }, [image]);

  const inputRef = useRef<HTMLInputElement>(null);

  const setNewImage = (url: string) => {
    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
    }
    setImage(url);
    setObjectUrl(url);
    setBgPalette(PRESET_BG_COLORS);
    setTextPalette(PRESET_TEXT_COLORS);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const imgUrl = URL.createObjectURL(file);
    setNewImage(imgUrl);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const imgUrl = URL.createObjectURL(file);
    setNewImage(imgUrl);
  };

  const handleOverlayStateJsonEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setOverlayStateJson(text);
    try {
      const json = JSON.parse(text);
      setOverlayState((prev) => ({
        ...prev,
        ...json,
        mainTextColor: toHex6(json.mainTextColor || prev.mainTextColor),
        arrowPos: json.arrowPos
          ? {
              x: Math.min(1, Math.max(0, json.arrowPos.x)),
              y: Math.min(1, Math.max(0, json.arrowPos.y)),
            }
          : prev.arrowPos,
      }));
      setOverlayStateJsonError("");
    } catch (err: any) {
      setOverlayStateJsonError("Invalid JSON: " + (err?.message || "parse error"));
    }
  };

  const handleDownload = useCallback(() => {
    if (!image || !arrowImg) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = IMAGE_WIDTH;
      canvas.height = IMAGE_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

      // Fit image to 1920x1080 cover
      const iw = img.width;
      const ih = img.height;
      const ir = iw / ih;
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
      ctx.font = `500 ${overlayState.mainFontSize}px Inter, Arial, sans-serif`;

      const lines = (overlayState.mainText || " ").split("\n");
      const metricsLines = lines.map((line) =>
        ctx.measureText(line.length ? line : " ")
      );
      const maxLineWidth = Math.max(...metricsLines.map((m) => m.width));
      const paddingX = 54;
      const paddingY = 26;
      const rad = overlayState.mainRadius;
      const textWidth = maxLineWidth + paddingX * 2;
      const textHeight = overlayState.mainFontSize * lines.length + paddingY * 2;
      const posX = overlayState.mainPos.x * IMAGE_WIDTH;
      const posY = overlayState.mainPos.y * IMAGE_HEIGHT;

      ctx.globalAlpha = overlayState.mainAlpha;
      ctx.fillStyle =
        bgPalette[
          typeof overlayState.mainBgIdx === "number"
            ? overlayState.mainBgIdx
            : 0
        ] || "#222";
      drawRoundRect(
        ctx,
        posX - textWidth / 2,
        posY - textHeight / 2,
        textWidth,
        textHeight,
        rad
      );

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = toHex6(overlayState.mainTextColor) || "#FFFFFF";
      ctx.font = `500 ${overlayState.mainFontSize}px Inter, Arial, sans-serif`;
      ctx.save();
      ctx.beginPath();
      ctx.rect(posX - textWidth / 2, posY - textHeight / 2, textWidth, textHeight);
      ctx.clip();

      lines.forEach((line, i) => {
        const totalHeight = overlayState.mainFontSize * lines.length;
        const y =
          posY -
          totalHeight / 2 +
          overlayState.mainFontSize * i +
          overlayState.mainFontSize / 2;
        ctx.fillText(line.length ? line : " ", posX, y);
      });
      ctx.restore();
      ctx.restore();

      // Arrow PNG (draw after box/text)
      const arrowW = DEFAULT_ARROW_SIZE.w;
      const arrowH = DEFAULT_ARROW_SIZE.h;
      const arrowPos = overlayState.arrowPos;
      ctx.save();
      ctx.globalAlpha = 1;

      ctx.drawImage(
        arrowImg,
        0,
        0,
        arrowImg.width,
        arrowImg.height,
        Math.round(arrowPos.x * IMAGE_WIDTH - arrowW / 2),
        Math.round(arrowPos.y * IMAGE_HEIGHT - arrowH / 2),
        arrowW,
        arrowH
      );
      ctx.restore();

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "image-with-text-and-arrow.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, "image/png");
    };
  }, [image, overlayState, bgPalette, arrowImg]);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }
    };
  }, [objectUrl]);

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
          <li>Drag & Drop or click to load image (preview 1920×1080)</li>
          <li>Type overlay text, choose font, color, position, background, and radius</li>
          <li>Drag, rotate, or resize the overlay text and arrow</li>
          <li>All settings persist via localStorage</li>
          <li>
            Click "Download" to export PNG (preview and PNG will both show the overlay
            text and arrow in your chosen positions)
          </li>
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
            <div style={{ fontSize: 22, marginBottom: 8 }}>
              Drag & Drop Image Here
            </div>
            <div>
              or{" "}
              <span style={{ color: "#66f", textDecoration: "underline" }}>
                Click to select
              </span>
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
            <OverlayControls
              state={overlayState}
              setState={setOverlayState}
              bgPalette={bgPalette}
              textPalette={textPalette}
            />

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
                disabled={!image || !arrowImg}
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
                  if (objectUrl) {
                    try {
                      URL.revokeObjectURL(objectUrl);
                    } catch {}
                  }
                  setImage(null);
                  setBgPalette(PRESET_BG_COLORS);
                  setTextPalette(PRESET_TEXT_COLORS);
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
              alt="Background"
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
              bgColor={
                bgPalette[
                  typeof overlayState.mainBgIdx === "number"
                    ? overlayState.mainBgIdx
                    : 0
                ] || "#222"
              }
              bgAlpha={overlayState.mainAlpha}
              textColor={toHex6(overlayState.mainTextColor)}
              fontSize={overlayState.mainFontSize}
              padding={{ x: 54, y: 26 }}
              radius={overlayState.mainRadius}
              position={overlayState.mainPos}
              previewW={previewSize.w}
              previewH={previewSize.h}
              onPosChange={(pos) =>
                setOverlayState((prev) => ({
                  ...prev,
                  mainPos: pos,
                }))
              }
            />
            <DraggableArrow
              arrowImg={arrowImg}
              position={overlayState.arrowPos}
              previewW={previewSize.w}
              previewH={previewSize.h}
              onPosChange={(arrowPos) =>
                setOverlayState((prev) => ({
                  ...prev,
                  arrowPos,
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