import React, { useRef, useState } from "react";

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const VIDEO_BG_COLOR = "#2196F3"; // Blue

function imageToVideo({ image, durationSec }) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = VIDEO_WIDTH;
      canvas.height = VIDEO_HEIGHT;
      const ctx = canvas.getContext("2d");

      const stream = canvas.captureStream(30); // 30fps
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });

      let chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        resolve(blob);
      };

      // Draw frame
      function drawFrame() {
        // Fill background
        ctx.fillStyle = VIDEO_BG_COLOR;
        ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

        // Scale image to width=1080 and maintain aspect ratio
        const w = VIDEO_WIDTH;
        const h = (image.height * w) / image.width;

        ctx.drawImage(image, 0, (VIDEO_HEIGHT - h) / 2, w, h);
      }

      let frameCount = Math.ceil(durationSec * 30);

      mediaRecorder.start();

      let currentFrame = 0;
      const drawLoop = () => {
        if (currentFrame >= frameCount) {
          mediaRecorder.stop();
          return;
        }
        drawFrame();
        currentFrame++;
        setTimeout(drawLoop, 1000 / 30);
      };
      drawLoop();
    } catch (e) {
      reject(e);
    }
  });
}

export default function App() {
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [videoBlob, setVideoBlob] = useState(null);
  const [duration, setDuration] = useState(5);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();

  function handleFile(file) {
    if (!file.type.startsWith("image/")) {
      setError("Please drop a valid image file.");
      return;
    }
    setError("");
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setVideoBlob(null);
  }

  const handleDrop = (e) => {
    e.preventDefault();
    setError("");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleBrowse = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleGenerateVideo = async () => {
    if (!imageFile) return;
    setProcessing(true);
    setError("");
    setVideoBlob(null);
    try {
      const img = new window.Image();
      img.onload = async () => {
        try {
          const blob = await imageToVideo({
            image: img,
            durationSec: duration,
          });
          setVideoBlob(blob);
          setProcessing(false);
        } catch (err) {
          setError("Failed to generate video: " + err.message);
          setProcessing(false);
        }
      };
      img.onerror = () => {
        setError("Failed to load image.");
        setProcessing(false);
      };
      img.src = imageUrl;
    } catch (err) {
      setError("Unexpected error: " + err.message);
      setProcessing(false);
    }
  };

  const handleDurationChange = (e) => {
    let val = Math.max(1, Math.min(60, Number(e.target.value)));
    setDuration(val);
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        minHeight: "100vh",
        background: "#F1F3F9",
        padding: 0,
        margin: 0,
      }}
    >
      <h1 style={{ textAlign: "center", margin: 24 }}>Image to Vertical Video (1080x1920)</h1>
      <div
        style={{
          background: "#fff",
          margin: "0 auto",
          maxWidth: 440,
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 2px 16px 0 #0001",
        }}
      >
        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            border: "2px dashed #2196F3",
            padding: 30,
            borderRadius: 10,
            textAlign: "center",
            cursor: "pointer",
            background: "#E3F2FD",
          }}
          onClick={() => inputRef.current?.click()}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="preview"
              style={{
                maxWidth: "100%",
                maxHeight: 300,
                display: "block",
                margin: "0 auto",
              }}
            />
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📥</div>
              <div>Drag & drop image here, or click to browse.</div>
            </>
          )}
          <input style={{ display: "none" }} type="file" accept="image/*" ref={inputRef} onChange={handleBrowse} />
        </div>
        <div style={{ marginTop: 24 }}>
          <label>
            Video duration (seconds) &nbsp;
            <input
              type="number"
              min={1}
              max={60}
              step={1}
              value={duration}
              disabled={processing}
              style={{
                width: 60,
                fontSize: 16,
                padding: "2px 7px",
              }}
              onChange={handleDurationChange}
            />
          </label>
        </div>
        <button
          style={{
            marginTop: 24,
            width: "100%",
            fontSize: 18,
            padding: "10px 0",
            background: "#1565C0",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: processing || !imageFile ? "not-allowed" : "pointer",
            opacity: processing || !imageFile ? 0.5 : 1,
          }}
          onClick={handleGenerateVideo}
          disabled={!imageFile || processing}
        >
          {processing ? "Generating Video..." : "Generate Video"}
        </button>
        {error && (
          <div
            style={{
              color: "#d32f2f",
              marginTop: 10,
              background: "#FFF3F3",
              padding: 10,
              borderRadius: 6,
            }}
          >
            {error}
          </div>
        )}

        {videoBlob && (
          <div style={{ marginTop: 32, textAlign: "center" }}>
            <div>
              <video
                controls
                style={{
                  width: "200px",
                  height: "355px",
                  background: "#2196F3",
                  borderRadius: 8,
                  border: "2px solid #1565C0",
                  marginBottom: 16,
                }}
                src={URL.createObjectURL(videoBlob)}
              />
            </div>
            <a
              href={URL.createObjectURL(videoBlob)}
              download="image_video.webm"
              style={{
                display: "inline-block",
                fontSize: 17,
                fontWeight: "bold",
                background: "#4CAF50",
                color: "#fff",
                padding: "10px 24px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              ⬇️ Download video
            </a>
            <div
              style={{
                marginTop: 8,
                color: "#888",
                fontSize: 13,
              }}
            >
              Format: webm (VP8/VP9)
            </div>
          </div>
        )}
      </div>
      <div style={{ maxWidth: 440, margin: "28px auto", fontSize: 14, color: "#555", textAlign: "center" }}>
        <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
          <li>- Drag any image (png/jpg/webp etc)</li>
          <li>- Outputs vertical video (1080x1920, blue background)</li>
          <li>- Download video, ready for TikTok/Reels/Shorts</li>
        </ul>
        <div style={{ marginTop: 24, fontSize: 12, color: "#888" }}>
          * Video is generated in-browser, no upload needed
        </div>
      </div>
    </div>
  );
}
