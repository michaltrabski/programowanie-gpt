import React, { useRef, useState } from "react";

const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;

export default function Thumbnail() {
  const [image, setImage] = useState(null); // image url
  const [text, setText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef();

  // Drag & drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setImage(URL.createObjectURL(file));
    }
  };
  // File input handler
  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setImage(URL.createObjectURL(file));
    }
  };

  // Download logic: draw to 1920x1080 canvas and trigger download
  const handleDownload = async () => {
    if (!image) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      // Draw img scaled to fit 1920x1080 (cover)
      const canvas = document.createElement("canvas");
      canvas.width = IMAGE_WIDTH;
      canvas.height = IMAGE_HEIGHT;
      const ctx = canvas.getContext("2d");
      // Calc best-fit cover
      const iw = img.width,
        ih = img.height;
      const ir = iw / ih;
      const wr = IMAGE_WIDTH / IMAGE_HEIGHT;
      let sw, sh, sx, sy;
      if (ir > wr) {
        // Image is wider, crop sides
        sh = ih;
        sw = ih * wr;
        sx = (iw - sw) / 2;
        sy = 0;
      } else {
        // Image is taller, crop top/bottom
        sw = iw;
        sh = iw / wr;
        sx = 0;
        sy = (ih - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

      // Draw text overlay
      ctx.font = "64px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Optional background box for readability
      if (text.trim() !== "") {
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
      }}
    >
      {!image && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
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
          }}
        >
          <div>
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
            width: 960,
            height: 540,
            maxWidth: "90vw",
            maxHeight: "60vh",
            position: "relative",
            margin: "16px 0",
          }}
        >
          <img
            src={image}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: 8,
              display: "block",
            }}
          />
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
          <input
            type="text"
            placeholder="Type overlay text..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              position: "absolute",
              left: "50%",
              bottom: 24,
              transform: "translateX(-50%)",
              width: "70%",
              padding: "12px 20px",
              fontSize: 20,
              borderRadius: 8,
              border: "none",
              outline: "none",
              background: "rgba(10,10,10,0.7)",
              color: "white",
              boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
            }}
            maxLength={200}
          />
        </div>
      )}

      {image && (
        <button
          style={{
            marginTop: 18,
            padding: "16px 32px",
            fontSize: 20,
            background: "#66f",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(102,102,255,0.12)",
          }}
          onClick={handleDownload}
        >
          Download 1920x1080 Image
        </button>
      )}

      {image && (
        <button
          style={{
            marginTop: 12,
            marginLeft: 10,
            padding: "10px 24px",
            fontSize: 16,
            background: "#333",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            opacity: 0.85,
          }}
          onClick={() => setImage(null)}
        >
          Change Image
        </button>
      )}
    </div>
  );
}
