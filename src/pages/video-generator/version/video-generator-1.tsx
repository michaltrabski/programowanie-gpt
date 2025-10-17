import React, { useRef, useState } from "react";

function ImageToVideoGenerator() {
  const [image, setImage] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(3);
  const [processing, setProcessing] = useState(false);
  const canvasRef = useRef(null);

  // Image drag & drop or select handler
  function handleImageChange(e) {
    let file;
    if (e.dataTransfer) {
      file = e.dataTransfer.files[0];
    } else {
      file = e.target.files[0];
    }
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setImage(url);
      setVideoUrl("");
    }
  }

  // Compose the video from the image
  async function handleGenerateVideo() {
    if (!image || processing) return;
    setProcessing(true);
    setVideoUrl("");

    // Prepare canvas for drawing the image
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.src = image;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    // Setup canvas size to match image
    const width = img.width;
    const height = img.height;
    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    // Capture the canvas stream
    const stream = canvas.captureStream(30); // 30 fps

    // Use MediaRecorder to record the stream
    const chunks = [];
    const rec = new window.MediaRecorder(stream, { mimeType: "video/webm" });

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const videoUrl = URL.createObjectURL(blob);
      setVideoUrl(videoUrl);
      setProcessing(false);
    };

    rec.start();

    // Draw the image for the entire video duration
    const seconds = parseFloat(duration) || 3;
    const start = performance.now();
    function drawFrame(now) {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      if ((now - start) / 1000 < seconds) {
        requestAnimationFrame(drawFrame);
      }
    }
    requestAnimationFrame(drawFrame);

    setTimeout(() => {
      rec.stop();
    }, seconds * 1000);
  }

  // Drag and drop logic
  function handleDrop(e) {
    e.preventDefault();
    handleImageChange(e);
  }
  function handleDragOver(e) {
    e.preventDefault();
  }

  return (
    <div style={{ maxWidth: 420, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h2>Image to Video Generator</h2>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          border: "2px dashed #888",
          padding: "2rem",
          textAlign: "center",
          marginBottom: "1rem",
          cursor: "pointer",
          borderRadius: 8,
        }}
        onClick={() => document.getElementById("fileinput").click()}
      >
        {image ? (
          <img src={image} alt="" style={{ maxWidth: 200, maxHeight: 200 }} />
        ) : (
          <span>Drag & drop an image, or click to select</span>
        )}
        <input id="fileinput" type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>
          Video duration (seconds):{" "}
          <input
            type="number"
            min={1}
            max={30}
            value={duration}
            style={{ width: 60 }}
            onChange={(e) => setDuration(e.target.value)}
            disabled={processing}
          />
        </label>
      </div>

      <button onClick={handleGenerateVideo} disabled={!image || processing} style={{ marginBottom: 16 }}>
        {processing ? "Generating Video..." : "Generate Video"}
      </button>
      <br />

      {videoUrl && (
        <div>
          <video src={videoUrl} controls style={{ maxWidth: "100%", margin: "1rem 0" }} />
          <br />
          <a
            href={videoUrl}
            download="image-video.webm"
            style={{
              display: "inline-block",
              textDecoration: "none",
              background: "#2196f3",
              color: "#fff",
              padding: "0.5rem 1.2rem",
              borderRadius: 4,
            }}
          >
            ⬇️ Download video
          </a>
        </div>
      )}

      {/* Hidden canvas for video rendering */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default ImageToVideoGenerator;
