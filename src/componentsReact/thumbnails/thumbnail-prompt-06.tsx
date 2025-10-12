import React, { useRef, useState, useEffect } from "react";

// --- Constants
const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;
const PALETTE_SIZE = 5;

const MAIN_FONT_SIZES = [32, 40, 50, 60, 72];
const SEC_FONT_SIZES = [18, 22, 26, 32, 40];

// --- Types
type OverlayBox = {
  text: string;
  setText: (s: string) => void;
  bgIdx: number;
  setBgIdx: (i: number) => void;
  position: { x: number; y: number };
  setPosition: (p: { x: number; y: number }) => void;
  fontSize: number;
  setFontSize: (fs: number) => void;
  fontSizes: number[];
  padding: { x: number; y: number };
  radius: number;
  palette: string[];
  placeholder: string;
  ariaLabel: string;
  inputMaxLength: number;
  boxKey: "main" | "sec";
  inputStyle?: React.CSSProperties;
};

type Palette = string[];

// --- Utility: Draw rounded rectangle on a canvas context
function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  // Use Canvas 2.0 roundRect if available
  if ((ctx as any).roundRect) {
    ctx.beginPath();
    (ctx as any).roundRect(x, y, w, h, r);
    ctx.closePath();
    ctx.fill();
  } else {
    // Polyfill for roundRect
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }
}

// --- Utility: fast palette extractor from an image element (no dependency)
function getDominantColors(img: HTMLImageElement, numColors: number): string[] {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const scale = 80;
  canvas.width = scale;
  canvas.height = scale;
  ctx.drawImage(img, 0, 0, scale, scale);
  const { data } = ctx.getImageData(0, 0, scale, scale);
  const buckets: { [k: string]: number } = {};
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 80) continue;
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
  while (colors.length < numColors) colors.push("#fff");
  return colors;
}

// --- Overlay Editor Component
const OverlayImageEditor: React.FC = () => {
  // ========== State
  const [image, setImage] = useState<string | null>(null);
  const [palette, setPalette] = useState<Palette>([]);
  const [mainText, setMainText] = useState<string>("");
  const [secondaryText, setSecondaryText] = useState<string>("");
  const [mainBgIdx, setMainBgIdx] = useState(0);
  const [secBgIdx, setSecBgIdx] = useState(1);
  // Positions as proportions (x, y) between 0-1: {x, y}
  const [mainPos, setMainPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [secondaryPos, setSecondaryPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.72 });

  // == New for font size controls
  const [mainFontSize, setMainFontSize] = useState(MAIN_FONT_SIZES[1]);
  const [secFontSize, setSecFontSize] = useState(SEC_FONT_SIZES[2]);

  // Drag handling state
  const [draggingBox, setDraggingBox] = useState<null | "main" | "sec">(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 }); // Offset at drag start

  // For file input
  const inputRef = useRef<HTMLInputElement>(null);

  // For preview box dimensions
  const PREVIEW_W = 960;
  const PREVIEW_H = 540;

  // On palette load, prioritize differing bg colors
  useEffect(() => {
    setMainBgIdx(0);
    setSecBgIdx(1);
  }, [palette.length]);

  // Reset positions and font size when image changes
  useEffect(() => {
    setMainPos({ x: 0.5, y: 0.5 });
    setSecondaryPos({ x: 0.5, y: 0.72 });
    setMainFontSize(MAIN_FONT_SIZES[1]);
    setSecFontSize(SEC_FONT_SIZES[2]);
  }, [image]);

  // === Image Upload/Drop
  const loadImage = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const imgUrl = URL.createObjectURL(file);
    setImage(imgUrl);
    setPalette([]);
    setMainText("");
    setSecondaryText("");
    setMainBgIdx(0);
    setSecBgIdx(1);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) loadImage(file);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) loadImage(file);
  };

  // Extract palette when image loads
  useEffect(() => {
    if (!image) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      setPalette(getDominantColors(img, PALETTE_SIZE));
    };
  }, [image]);

  // === Download
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

      // Cover fit calculation
      const iw = img.width,
        ih = img.height,
        ir = iw / ih;
      const wr = IMAGE_WIDTH / IMAGE_HEIGHT;
      let sw, sh, sx, sy;
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

      // Drawing overlays, positions as proportions (x/y: 0-1)

      // --- Main text
      if (mainText.trim() || true) {
        const fontSize = mainFontSize;
        ctx.save();
        const posX = mainPos.x * IMAGE_WIDTH;
        const posY = mainPos.y * IMAGE_HEIGHT;
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const textMetrics = ctx.measureText(mainText || " ");
        const paddingX = 54;
        const paddingY = 26;
        const rad = 28;
        const textWidth = textMetrics.width + paddingX * 2;
        const textHeight = fontSize + paddingY * 2;
        const rectX = posX - textWidth / 2;
        const rectY = posY - textHeight / 2;

        ctx.globalAlpha = 0.76;
        ctx.fillStyle = palette[mainBgIdx] ?? "#222";
        drawRoundRect(ctx, rectX, rectY, textWidth, textHeight, rad);

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "#fff";
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (mainText.trim()) ctx.fillText(mainText, posX, posY + 5);
        ctx.restore();
      }
      // --- Secondary text
      if (secondaryText.trim() || true) {
        const fontSize = secFontSize;
        ctx.save();
        const posX = secondaryPos.x * IMAGE_WIDTH;
        const posY = secondaryPos.y * IMAGE_HEIGHT;
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const secMetrics = ctx.measureText(secondaryText || " ");
        const padX = 24;
        const padY = 13;
        const rad = 21;
        const tw = secMetrics.width + padX * 2;
        const th = fontSize + padY * 2;
        const rectX = posX - tw / 2;
        const rectY = posY - th / 2;

        ctx.globalAlpha = 0.75;
        ctx.fillStyle = palette[secBgIdx] ?? "#222";
        drawRoundRect(ctx, rectX, rectY, tw, th, rad);

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "#fff";
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (secondaryText.trim()) ctx.fillText(secondaryText, posX, posY + th / 16);
        ctx.restore();
      }

      // Download as PNG
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "image-with-text.png";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      }, "image/png");
    };
  };

  // --- Color Picker Button
  const ColorButton: React.FC<{
    color: string;
    selected: boolean;
    onClick: () => void;
  }> = ({ color, selected, onClick }) => (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 38,
        height: 38,
        borderRadius: 8,
        background: color,
        border: selected ? "3px solid #66f" : "2px solid #fff7",
        boxShadow: selected ? "0 3px 14px #2213, 0 0px 0 #4e4cff inset" : "0 2px 7px #0004",
        cursor: "pointer",
        outline: "none",
        transition: "box-shadow .13s,border .13s",
      }}
      aria-label={`Palette color ${color}`}
      tabIndex={0}
    />
  );

  // --- Draggable overlays logic
  const overlayRefs = {
    main: useRef<HTMLDivElement>(null),
    sec: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    // Listen for drag movement at document level when dragging
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingBox) return;
      const bounds = overlayRefs[draggingBox].current?.parentElement?.getBoundingClientRect();
      if (!bounds) return;
      const mx = e.clientX - bounds.left;
      const my = e.clientY - bounds.top;
      // Estimate the box's own width/height
      const box = overlayRefs[draggingBox].current;
      const boxW = box?.offsetWidth ?? 0;
      const boxH = box?.offsetHeight ?? 0;
      // Apply the initial drag offset so dragging isn't jerky
      let newX = (mx - dragOffset.current.x) / bounds.width;
      let newY = (my - dragOffset.current.y) / bounds.height;
      // Clamp in [0,1] with some margin so box can't be pulled off-canvas
      const minFrac = 0 + boxW / bounds.width / 2;
      const maxFrac = 1 - boxW / bounds.width / 2;
      const minY = 0 + boxH / bounds.height / 2;
      const maxY = 1 - boxH / bounds.height / 2;
      newX = Math.max(minFrac, Math.min(maxFrac, newX));
      newY = Math.max(minY, Math.min(maxY, newY));
      if (draggingBox === "main") setMainPos({ x: newX, y: newY });
      else setSecondaryPos({ x: newX, y: newY });
    };
    const handleMouseUp = () => setDraggingBox(null);
    if (draggingBox) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // eslint-disable-next-line
  }, [draggingBox]);

  // --- Helper for overlay render
  const renderOverlayBox = ({
    text,
    setText,
    bgIdx,
    setBgIdx,
    position,
    setPosition,
    fontSize,
    setFontSize,
    fontSizes,
    padding,
    radius,
    palette,
    placeholder,
    ariaLabel,
    inputMaxLength,
    boxKey,
    inputStyle,
  }: OverlayBox) => {
    // Absolutize position in px
    const x = position.x * PREVIEW_W;
    const y = position.y * PREVIEW_H;

    // For drag
    const dragRef = overlayRefs[boxKey];
    const dragStart = (e: React.MouseEvent<HTMLDivElement>) => {
      if (draggingBox) return;
      e.preventDefault();
      e.stopPropagation();
      // Get the mouse offset from the overlay top-left
      const box = dragRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const parentRect = box.parentElement!.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      dragOffset.current = { x: relX, y: relY };
      setDraggingBox(boxKey);
    };

    return (
      <>
        {/* Overlay box */}
        <div
          ref={dragRef}
          style={{
            position: "absolute",
            left: x,
            top: y,
            transform: "translate(-50%,-50%)",
            background: palette[bgIdx] ? palette[bgIdx] + "cc" : "rgba(34,34,34,0.79)",
            borderRadius: radius,
            fontSize,
            fontWeight: 500,
            color: "#fff",
            padding: `${padding.y}px ${padding.x}px`,
            textAlign: "center",
            maxWidth: "92%",
            wordBreak: "break-word",
            boxShadow: "0 2px 14px #2005",
            userSelect: "none",
            cursor: draggingBox === boxKey ? "grabbing" : "grab",
            MozUserSelect: "none",
            WebkitUserSelect: "none",
            pointerEvents: "auto",
            zIndex: 10,
            outline: draggingBox === boxKey ? "2.5px dashed #66f" : undefined,
            border: draggingBox === boxKey ? "1px solid #66f" : undefined,
            opacity: draggingBox && draggingBox !== boxKey ? 0.6 : 1,
            transition: "box-shadow .16s,outline .12s",
          }}
          aria-label={ariaLabel}
          onMouseDown={dragStart}
        >
          {text || <span style={{ opacity: 0.25 }}>{placeholder}</span>}
        </div>
        {/* Text input */}
        <input
          type="text"
          placeholder={placeholder}
          aria-label={ariaLabel + " input"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{
            position: "absolute",
            left: "50%",
            bottom: boxKey === "main" ? 70 : 18,
            transform: "translateX(-50%)",
            width: "74%",
            padding: boxKey === "main" ? "12px 20px" : "11px 18px",
            fontSize: boxKey === "main" ? 20 : 18,
            borderRadius: 8,
            border: "none",
            outline: "none",
            background: "rgba(10,10,10,0.73)",
            color: "white",
            boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
            zIndex: 20,
            userSelect: "text",
            ...inputStyle,
          }}
          maxLength={inputMaxLength}
          tabIndex={0}
        />
        {/* Font size picker */}
        <select
          aria-label={ariaLabel + " font size"}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          style={{
            position: "absolute",
            left: boxKey === "main" ? "14%" : "84%",
            bottom: boxKey === "main" ? 69 : 17,
            transform: "translateX(-50%)",
            fontSize: 16,
            background: "#19193a",
            color: "#fff",
            borderRadius: 7,
            border: "none",
            padding: "6px 9px",
            zIndex: 21,
            boxShadow: "0 2px 8px #0003",
          }}
        >
          {fontSizes.map((fs) => (
            <option value={fs} key={fs}>
              {fs}px
            </option>
          ))}
        </select>
      </>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily: "Inter,sans-serif",
      }}
    >
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
            background: "#181818",
            borderRadius: 12,
            userSelect: "none",
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 22, marginBottom: 8 }}>Drag & Drop Image Here</div>
            <div>
              or{" "}
              <span
                style={{
                  color: "#66f",
                  textDecoration: "underline",
                }}
              >
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

      {/* --- Main editor area --- */}
      {image && (
        <>
          {/* --- Preview area --- */}
          <div
            style={{
              width: PREVIEW_W,
              height: PREVIEW_H,
              maxWidth: "95vw",
              maxHeight: "65vh",
              position: "relative",
              margin: "16px 0",
              borderRadius: 13,
              overflow: "hidden",
              background: "#222",
              userSelect: "none",
            }}
            tabIndex={-1}
          >
            {/* Background image */}
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
            {/* --- Main overlay (draggable) */}
            {renderOverlayBox({
              text: mainText,
              setText: setMainText,
              bgIdx: mainBgIdx,
              setBgIdx: setMainBgIdx,
              position: mainPos,
              setPosition: setMainPos,
              fontSize: mainFontSize,
              setFontSize: setMainFontSize,
              fontSizes: MAIN_FONT_SIZES,
              padding: { x: 54, y: 26 },
              radius: 28,
              palette,
              placeholder: "Type main overlay text...",
              ariaLabel: "Main overlay text",
              inputMaxLength: 200,
              boxKey: "main",
            })}
            {/* --- Secondary overlay (draggable) */}
            {renderOverlayBox({
              text: secondaryText,
              setText: setSecondaryText,
              bgIdx: secBgIdx,
              setBgIdx: setSecBgIdx,
              position: secondaryPos,
              setPosition: setSecondaryPos,
              fontSize: secFontSize,
              setFontSize: setSecFontSize,
              fontSizes: SEC_FONT_SIZES,
              padding: { x: 24, y: 13 },
              radius: 21,
              palette,
              placeholder: "Type secondary text (appears below)...",
              ariaLabel: "Secondary overlay text",
              inputMaxLength: 180,
              boxKey: "sec",
              inputStyle: { background: "rgba(10,10,10,0.60)", color: "#eee" },
            })}
          </div>

          {/* --- Palette Pickers --- */}
          {palette.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 34,
                margin: "22px 0 12px 0",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {/* Main Overlay bg color */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#bbb", marginBottom: 4 }}>Main background:</div>
                <div style={{ display: "flex", gap: 7 }}>
                  {palette.map((color, i) => (
                    <ColorButton
                      key={"main-" + color}
                      color={color}
                      selected={mainBgIdx === i}
                      onClick={() => setMainBgIdx(i)}
                    />
                  ))}
                </div>
              </div>
              <div style={{ minWidth: 38 }} />
              {/* Secondary Overlay bg color */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#bbb", marginBottom: 4 }}>Secondary background:</div>
                <div style={{ display: "flex", gap: 7 }}>
                  {palette.map((color, i) => (
                    <ColorButton
                      key={"sec-" + color}
                      color={color}
                      selected={secBgIdx === i}
                      onClick={() => setSecBgIdx(i)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- Download and reset --- */}
          <button
            style={{
              marginTop: 13,
              padding: "14px 32px",
              fontSize: 20,
              background: "#66f",
              color: "white",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              boxShadow: "0 3px 16px #66f5",
              transition: "box-shadow .13s",
              fontWeight: 600,
            }}
            onClick={handleDownload}
          >
            Download 1920x1080 Image
          </button>
          <button
            style={{
              marginTop: 11,
              marginLeft: 14,
              padding: "10px 20px",
              fontSize: 16,
              background: "#333",
              color: "#fff",
              border: "none",
              borderRadius: 9,
              cursor: "pointer",
              opacity: 0.92,
            }}
            onClick={() => {
              setImage(null);
              setPalette([]);
              setMainText("");
              setSecondaryText("");
              setMainBgIdx(0);
              setSecBgIdx(1);
              setMainFontSize(MAIN_FONT_SIZES[1]);
              setSecFontSize(SEC_FONT_SIZES[2]);
              setMainPos({ x: 0.5, y: 0.5 });
              setSecondaryPos({ x: 0.5, y: 0.72 });
            }}
          >
            Change Image
          </button>
        </>
      )}
    </div>
  );
};

export default OverlayImageEditor;
