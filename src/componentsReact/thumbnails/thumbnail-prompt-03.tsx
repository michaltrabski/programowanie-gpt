import React, { useRef, useState, useEffect } from "react";

// Constants
const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;
const PALETTE_SIZE = 5;

// Color quantization: Extract N most common colors from image
function getDominantColors(img: HTMLImageElement, numColors: number): string[] {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const scale = 80; // speed vs color variety
  canvas.width = scale;
  canvas.height = scale;

  ctx.drawImage(img, 0, 0, scale, scale);
  const { data } = ctx.getImageData(0, 0, scale, scale);

  const buckets: { [k: string]: number } = {};
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 80) continue; // ignore alpha
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

type Palette = string[];

const OverlayImageEditor: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [palette, setPalette] = useState<Palette>([]);
  const [text, setText] = useState<string>("");
  const [secondaryText, setSecondaryText] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  // Chosen bg color indexes
  const [mainBgIdx, setMainBgIdx] = useState(0);
  const [secBgIdx, setSecBgIdx] = useState(0);
  // Last updated: so each gets a unique default pick
  useEffect(() => {
    setMainBgIdx(0);
    setSecBgIdx(1);
  }, [palette.length]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Handle file input/drag-drop
  const loadImage = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const imgUrl = URL.createObjectURL(file);
    setImage(imgUrl);
    setPalette([]);
    setText("");
    setSecondaryText("");
    setMainBgIdx(0);
    setSecBgIdx(1);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) loadImage(file);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) loadImage(file);
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  // Extract colors after image loads
  useEffect(() => {
    if (!image) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      setPalette(getDominantColors(img, PALETTE_SIZE));
    };
  }, [image]);

  // Download button handler
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

      // "cover" fit calculation
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

      // Main text
      if (text.trim()) {
        ctx.font = "64px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const textMetrics = ctx.measureText(text);
        const padding = 48;
        const textWidth = textMetrics.width + padding;
        const textHeight = 88;
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = palette[mainBgIdx] ?? "#222";
        ctx.fillRect((IMAGE_WIDTH - textWidth) / 2, IMAGE_HEIGHT / 2 - textHeight / 2, textWidth, textHeight);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "#fff";
        ctx.fillText(text, IMAGE_WIDTH / 2, IMAGE_HEIGHT / 2 + 5);
      }
      // Secondary text
      if (secondaryText.trim()) {
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const y = IMAGE_HEIGHT / 2 + (text ? 76 : 0) + 28;
        const secMetrics = ctx.measureText(secondaryText);
        const pad = 18;
        const tw = secMetrics.width + pad * 2;
        const th = 60;
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = palette[secBgIdx] ?? "#222";
        ctx.fillRect((IMAGE_WIDTH - tw) / 2, y - 16, tw, th);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "#fff";
        ctx.fillText(secondaryText, IMAGE_WIDTH / 2, y + th / 8);
      }

      // Download
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = "image-with-text.png";
      link.click();
    };
  };

  // UI helpers for showing which picker is active
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
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            width: 400,
            height: 300,
            border: dragActive ? "3px dashed #66f" : "3px dashed #888",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#aaa",
            cursor: "pointer",
            background: dragActive ? "#222" : "#181818",
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

      {image && (
        <>
          <div
            style={{
              width: 960,
              height: 540,
              maxWidth: "95vw",
              maxHeight: "65vh",
              position: "relative",
              margin: "16px 0",
              borderRadius: 13,
              overflow: "hidden",
              background: "#222",
            }}
          >
            {/* Image */}
            <img
              src={image}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
            {/* Main overlay text */}
            {text && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    fontSize: 40,
                    color: "white",
                    padding: "24px 42px",
                    background: palette[mainBgIdx] ? `${palette[mainBgIdx]}c0` : "rgba(34,34,34,0.7)",
                    borderRadius: 12,
                    textAlign: "center",
                    maxWidth: "92%",
                    wordBreak: "break-word",
                    boxShadow: "0 2px 14px #2005",
                  }}
                >
                  {text}
                </div>
              </div>
            )}
            {/* Secondary text below center */}
            {secondaryText && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: text ? "64%" : "53%",
                  transform: "translateX(-50%)",
                  color: "#fff",
                  background: palette[secBgIdx] ? `${palette[secBgIdx]}c0` : "rgba(34,34,34,0.7)",
                  borderRadius: 10,
                  fontSize: 28,
                  padding: "13px 26px",
                  textAlign: "center",
                  maxWidth: "85%",
                  pointerEvents: "none",
                  boxShadow: "0 2px 12px #2003",
                }}
              >
                {secondaryText}
              </div>
            )}
            {/* Main overlay text input */}
            <input
              type="text"
              placeholder="Type main overlay text..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                position: "absolute",
                left: "50%",
                bottom: 70,
                transform: "translateX(-50%)",
                width: "74%",
                padding: "12px 20px",
                fontSize: 20,
                borderRadius: 8,
                border: "none",
                outline: "none",
                background: "rgba(10,10,10,0.7)",
                color: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
              }}
              maxLength={200}
              tabIndex={0}
            />
            {/* Secondary text input */}
            <input
              type="text"
              placeholder="Type secondary text (appears below)..."
              value={secondaryText}
              onChange={(e) => setSecondaryText(e.target.value)}
              style={{
                position: "absolute",
                left: "50%",
                bottom: 18,
                transform: "translateX(-50%)",
                width: "74%",
                padding: "11px 18px",
                fontSize: 18,
                borderRadius: 8,
                border: "none",
                outline: "none",
                background: "rgba(10,10,10,0.60)",
                color: "#eee",
                boxShadow: "0 2px 12px rgba(0,0,0,0.11)",
              }}
              maxLength={180}
              tabIndex={0}
            />
          </div>

          {/* Palette Pickers */}
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
              {/* Main Overlay text color */}
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
              {/* Secondary Overlay text color */}
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
              setText("");
              setSecondaryText("");
              setMainBgIdx(0);
              setSecBgIdx(1);
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
