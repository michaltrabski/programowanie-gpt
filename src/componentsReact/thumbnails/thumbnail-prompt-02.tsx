import React, { useRef, useState, useEffect } from "react";

const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;
const PALETTE_SIZE = 5;

function getDominantColors(img: HTMLImageElement, numColors: number): string[] {
  // Downscale & quantize to reduce color space (simple implementation)
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const scale = 80; // Narrow down for perf but keep variety
  canvas.width = scale;
  canvas.height = scale;

  ctx.drawImage(img, 0, 0, scale, scale);
  const { data } = ctx.getImageData(0, 0, scale, scale);

  // Quantize: bucket r/g/b to multiples of 32 to reduce noise
  const buckets: { [key: string]: number } = {};
  for (let i = 0; i < data.length; i += 4) {
    // Ignore fully transparent
    if (data[i + 3] < 64) continue;
    const key = [
      Math.round(data[i] / 32) * 32,
      Math.round(data[i + 1] / 32) * 32,
      Math.round(data[i + 2] / 32) * 32,
    ].join(",");
    buckets[key] = (buckets[key] || 0) + 1;
  }
  // Sort buckets by count, get top N
  const colors = Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, numColors)
    .map(([rgb]) => {
      const [r, g, b] = rgb.split(",").map(Number);
      return `rgb(${r},${g},${b})`;
    });

  // If too little, pad with white
  while (colors.length < numColors) colors.push("#fff");

  return colors;
}

type Palette = string[];

const Thumbnail: React.FC = () => {
  const [image, setImage] = useState<string | null>(null); // image url
  const [palette, setPalette] = useState<Palette>([]);
  const [text, setText] = useState<string>("");
  const [secondaryText, setSecondaryText] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Drag & drop handlers
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
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const imgURL = URL.createObjectURL(file);
      setImage(imgURL);
      setPalette([]);
    }
  };
  // File input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const imgURL = URL.createObjectURL(file);
      setImage(imgURL);
      setPalette([]);
    }
  };

  // Extract colors once image loads
  useEffect(() => {
    if (!image) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      setPalette(getDominantColors(img, PALETTE_SIZE));
    };
  }, [image]);

  // Download logic: draw to 1920x1080 canvas and trigger download
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

      // Cover logic
      const iw = img.width;
      const ih = img.height;
      const ir = iw / ih;
      const wr = IMAGE_WIDTH / IMAGE_HEIGHT;
      let sw, sh, sx, sy;
      if (ir > wr) {
        // crop sides
        sh = ih;
        sw = sh * wr;
        sx = (iw - sw) / 2;
        sy = 0;
      } else {
        // crop top/bottom
        sw = iw;
        sh = sw / wr;
        sx = 0;
        sy = (ih - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

      // Draw overlay text, center
      if (text.trim() !== "") {
        ctx.font = "64px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const textMetrics = ctx.measureText(text);
        const padding = 40;
        const textWidth = textMetrics.width + padding;
        const textHeight = 80;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "#222";
        ctx.fillRect((IMAGE_WIDTH - textWidth) / 2, IMAGE_HEIGHT / 2 - textHeight / 2, textWidth, textHeight);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "white";
        ctx.fillText(text, IMAGE_WIDTH / 2, IMAGE_HEIGHT / 2);
      }

      // Draw secondary text below, if any
      if (secondaryText.trim() !== "") {
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const y = IMAGE_HEIGHT / 2 + (text.trim() !== "" ? 70 : 0) + 16; // offset from main
        // Background box
        const secMetrics = ctx.measureText(secondaryText);
        const pad = 24;
        const tw = secMetrics.width + pad;
        const th = 56;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "#222";
        ctx.fillRect((IMAGE_WIDTH - tw) / 2, y - 10, tw, th);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "white";
        ctx.fillText(secondaryText, IMAGE_WIDTH / 2, y + th / 4);
      }

      // Download
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = "image-with-text.png";
      link.click();
    };
  };

  // UI
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
      {/* Upload panel */}
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

      {/* Main image editor panel */}
      {image && (
        <>
          <div
            style={{
              width: 960,
              height: 540,
              maxWidth: "90vw",
              maxHeight: "60vh",
              position: "relative",
              margin: "16px 0",
              borderRadius: 12,
              overflow: "hidden",
              background: "#222",
            }}
          >
            {/* The image */}
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
              {text && (
                <div
                  style={{
                    fontSize: 40,
                    color: "white",
                    padding: "24px 40px",
                    background: "rgba(34,34,34,0.6)",
                    borderRadius: 12,
                    textAlign: "center",
                    maxWidth: "90%",
                    wordBreak: "break-word",
                  }}
                >
                  {text}
                </div>
              )}
            </div>
            {/* Secondary text below center */}
            {secondaryText && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: text ? "62%" : "52%",
                  transform: "translateX(-50%)",
                  color: "#fff",
                  background: "rgba(34,34,34,0.6)",
                  borderRadius: 10,
                  fontSize: 28,
                  padding: "14px 26px",
                  textAlign: "center",
                  maxWidth: "82%",
                  pointerEvents: "none",
                  boxShadow: "0 1px 16px rgba(0,0,0,0.14)",
                }}
              >
                {secondaryText}
              </div>
            )}
            {/* Overlay text input */}
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
            />
          </div>

          {/* Palette row (from image) */}
          {palette.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 14,
                marginBottom: 10,
              }}
              aria-label="Image color palette"
            >
              {palette.map((color, i) => (
                <div
                  key={i}
                  title={color}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 10,
                    border: "2px solid #fff4",
                    background: color,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
                  }}
                />
              ))}
            </div>
          )}

          {/* Download & Change buttons */}
          <button
            style={{
              marginTop: 16,
              padding: "15px 32px",
              fontSize: 20,
              background: "#66f",
              color: "white",
              border: "none",
              borderRadius: 9,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(102,102,255,0.13)",
              transition: ".2s",
              fontWeight: 600,
            }}
            onClick={handleDownload}
          >
            Download 1920x1080 Image
          </button>
          <button
            style={{
              marginTop: 10,
              marginLeft: 6,
              padding: "10px 24px",
              fontSize: 16,
              background: "#333",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              opacity: 0.9,
            }}
            onClick={() => {
              setImage(null);
              setPalette([]);
              setText("");
              setSecondaryText("");
            }}
          >
            Change Image
          </button>
        </>
      )}
    </div>
  );
};

export default Thumbnail;
