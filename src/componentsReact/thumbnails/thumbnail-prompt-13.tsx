import React, { useRef, useState, useEffect } from "react";

// --- Constants
const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;
const MAIN_FONT_SIZES = [32, 40, 50, 60, 72];
const SEC_FONT_SIZES = [18, 22, 26, 32, 40];
const PRESET_COLORS = [
  "#F44242", // red
  "#F58D2D", // orange
  "#F8D94F", // yellow
  "#43d964", // green
  "#5183f9", // blue
];

// Useful for text color choices
const TEXT_COLORS = ["#FFF", "#222", "#E3E3E3", "#000", "#ffd700", "#00ffbe", "#ef40ea", "#ff3800", "#22aaff"];

// --- Utils
function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
}

// --- OverlayImageEditor Component
const OverlayImageEditor: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>(PRESET_COLORS);

  const [mainText, setMainText] = useState<string>("");
  const [secondaryText, setSecondaryText] = useState<string>("");
  const [mainBgIdx, setMainBgIdx] = useState(0);
  const [secBgIdx, setSecBgIdx] = useState(1);

  const [mainPos, setMainPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [secondaryPos, setSecondaryPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.72 });
  const [mainFontSize, setMainFontSize] = useState<number>(MAIN_FONT_SIZES[1]);
  const [secFontSize, setSecFontSize] = useState<number>(SEC_FONT_SIZES[2]);
  const [mainAlpha, setMainAlpha] = useState<number>(0.76);
  const [secAlpha, setSecAlpha] = useState<number>(0.75);

  // Now offer text color setting
  const [mainTextColor, setMainTextColor] = useState<string>("#fff");
  const [secTextColor, setSecTextColor] = useState<string>("#fff");

  const [draggingBox, setDraggingBox] = useState<null | "main" | "sec">(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const overlayRefs = {
    main: useRef<HTMLDivElement>(null),
    sec: useRef<HTMLDivElement>(null),
  };

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
    setMainTextColor("#fff");
    setSecTextColor("#fff");
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

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingBox) return;
      const parent = previewRef.current;
      if (!parent) return;
      const bounds = parent.getBoundingClientRect();
      const mx = e.clientX - bounds.left;
      const my = e.clientY - bounds.top;
      const box = overlayRefs[draggingBox].current;
      const boxW = box?.offsetWidth ?? 0;
      const boxH = box?.offsetHeight ?? 0;
      let x = (mx - dragOffset.current.x) / bounds.width;
      let y = (my - dragOffset.current.y) / bounds.height;
      const minX = boxW / bounds.width / 2;
      const maxX = 1 - minX;
      const minY = boxH / bounds.height / 2;
      const maxY = 1 - minY;
      x = Math.max(minX, Math.min(maxX, x));
      y = Math.max(minY, Math.min(maxY, y));
      if (draggingBox === "main") setMainPos({ x, y });
      if (draggingBox === "sec") setSecondaryPos({ x, y });
    }
    function onUp() {
      setDraggingBox(null);
    }
    if (draggingBox) {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggingBox]);

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
      // --- Background crop-fit
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
      // --- Overlays
      const fontFamily = "Inter, Arial, sans-serif";
      {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `500 ${mainFontSize}px ${fontFamily}`;
        const displayText = mainText.trim() ? mainText : " ";
        const metrics = ctx.measureText(displayText);
        const paddingX = 54,
          paddingY = 26,
          rad = 28;
        const textWidth = metrics.width + paddingX * 2;
        const textHeight = mainFontSize + paddingY * 2;
        const posX = mainPos.x * IMAGE_WIDTH;
        const posY = mainPos.y * IMAGE_HEIGHT;
        ctx.globalAlpha = mainAlpha;
        ctx.fillStyle = palette[mainBgIdx] ?? "#222";
        drawRoundRect(ctx, posX - textWidth / 2, posY - textHeight / 2, textWidth, textHeight, rad);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = mainTextColor || "#fff";
        ctx.font = `500 ${mainFontSize}px ${fontFamily}`;
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
      {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `500 ${secFontSize}px ${fontFamily}`;
        const displayText = secondaryText.trim() ? secondaryText : " ";
        const metrics = ctx.measureText(displayText);
        const paddingX = 24,
          paddingY = 13,
          rad = 21;
        const textWidth = metrics.width + paddingX * 2;
        const textHeight = secFontSize + paddingY * 2;
        const posX = secondaryPos.x * IMAGE_WIDTH;
        const posY = secondaryPos.y * IMAGE_HEIGHT;
        ctx.globalAlpha = secAlpha;
        ctx.fillStyle = palette[secBgIdx] ?? "#222";
        drawRoundRect(ctx, posX - textWidth / 2, posY - textHeight / 2, textWidth, textHeight, rad);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = secTextColor || "#fff";
        ctx.font = `500 ${secFontSize}px ${fontFamily}`;
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
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "image-with-text.png";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, "image/png");
    };
  };

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
        boxShadow: selected ? "0 2px 9px #2213, 0 0px 0 #4e4cff inset" : "0 2px 7px #0004",
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
    if (window && document && previewFontSize) {
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
          scrollbarWidth: "thin",
        }}
        aria-label={ariaLabel}
      >
        {text || <span style={{ opacity: 0.28 }}>{placeholder}</span>}
      </div>
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
          justifyContent: "center",
        }}
      >
        <label style={{ fontWeight: 600, color: "#dbe0ff", marginRight: 4, fontSize: 18, whiteSpace: "nowrap" }}>
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
            width: "min(48vw,400px)",
            padding: "10px 16px",
            fontSize: 18,
            borderRadius: 8,
            border: "none",
            outline: "none",
            background: "#232348",
            color: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
            fontFamily: "Inter, Arial, sans-serif",
          }}
        />
        <span style={{ color: "#aaa", fontSize: 17 }}>Size</span>
        <input
          type="number"
          min={1}
          value={fontSize}
          step={1}
          style={{
            width: 58,
            fontSize: 16,
            padding: "6px 5px",
            borderRadius: 8,
            border: "none",
            background: "#1b1c34",
            color: "#fff",
            textAlign: "center",
            boxShadow: "0 1.5px 6px #0002",
          }}
          onChange={(e) => {
            let v = Number(e.target.value);
            if (isNaN(v)) v = 1;
            setFontSize(v);
          }}
        />
        {/* --- Text Color controls --- */}
        <span style={{ color: "#aaa", fontSize: 16 }}>Text&nbsp;color</span>
        <div style={{ display: "flex", gap: 2, alignItems: "center", marginRight: 3 }}>
          {TEXT_COLORS.map((c, i) => (
            <ColorButton
              key={boxKey + "-txtc-" + i}
              color={c}
              selected={textColor === c}
              onClick={() => setTextColor(c)}
            />
          ))}
          <input
            type="color"
            value={textColor}
            aria-label="Custom text color"
            onChange={(e) => setTextColor(e.target.value)}
            style={{
              width: 31,
              height: 31,
              borderRadius: 8,
              border: "none",
              outline: "none",
              padding: 0,
              background: "none",
            }}
          />
        </div>
        {/* --- End Text Color --- */}
        {showPalette && palette.length > 0 && (
          <>
            <span style={{ color: "#aaa", fontSize: 16 }}>Background</span>
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
        <span style={{ color: "#aaa", fontSize: 16 }}>Opacity</span>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.01}
          value={alpha}
          onChange={(e) => setAlpha(Number(e.target.value))}
          style={{
            width: 110,
            accentColor: boxKey === "main" ? palette[mainBgIdx] : palette[secBgIdx],
            margin: "0 5px",
            background: "#151726",
          }}
        />
        <span style={{ fontSize: 15, width: 43, color: "#ddd", display: "inline-block" }}>
          {Math.round(alpha * 100)}%
        </span>
      </div>
    );
  }

  // Main JSX
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily: "Inter, Arial, sans-serif",
        padding: 12,
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
        <div style={{ width: "100%", maxWidth: 2000 }}>
          {/* Controls above preview */}
          {renderOverlayControls({
            text: mainText,
            setText: setMainText,
            fontSize: mainFontSize,
            setFontSize: setMainFontSize,
            fontSizes: MAIN_FONT_SIZES,
            palette,
            bgIdx: mainBgIdx,
            setBgIdx: setMainBgIdx,
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

          {/* Actual preview: always 1920x1080! */}
          <div
            ref={previewRef}
            style={{
              width: IMAGE_WIDTH,
              height: IMAGE_HEIGHT,
              maxWidth: "99vw",
              maxHeight: "95vh",
              position: "relative",
              margin: "22px 0",
              borderRadius: 13,
              overflow: "hidden",
              background: "#222",
              userSelect: "none",
              boxShadow: "0 6px 32px rgba(17,24,39,0.20)",
              border: "3px solid #353768",
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
              radius: 28,
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
              radius: 21,
              palette,
              placeholder: "Secondary text",
              ariaLabel: "Secondary overlay text",
              boxKey: "sec",
              bgAlpha: secAlpha,
              textColor: secTextColor,
            })}
          </div>
          {/* Buttons */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 22 }}>
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
                marginTop: 13,
                padding: "10px 22px",
                fontSize: 16,
                background: "#333",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                cursor: "pointer",
                opacity: 0.93,
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
                setMainTextColor("#fff");
                setSecTextColor("#fff");
              }}
            >
              Change Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverlayImageEditor;
