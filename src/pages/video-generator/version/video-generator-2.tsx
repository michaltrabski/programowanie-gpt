import React, { useRef, useState } from "react";

function ImageToVideoGenerator() {
  const [image, setImage] = useState(null);
  const [mp3, setMp3] = useState(null);
  const [mp3Duration, setMp3Duration] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(3);
  const [processing, setProcessing] = useState(false);
  const canvasRef = useRef(null);

  // Drag & drop logic for both image and mp3
  function handleDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }
  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleFiles(fileList) {
    let foundImg = false;
    let foundMp3 = false;
    [...fileList].forEach((file) => {
      if (file.type.startsWith("image/")) {
        // Only one image at a time
        const url = URL.createObjectURL(file);
        setImage(url);
        setVideoUrl("");
        foundImg = true;
      }
      if (file.type === "audio/mp3" || file.type === "audio/mpeg") {
        // Only one mp3 at a time
        const url = URL.createObjectURL(file);
        setMp3(url);
        setVideoUrl("");
        fetchMp3Duration(url);
        foundMp3 = true;
      }
    });
    // For manual clearing
    if (!foundImg) setImage(null);
    if (!foundMp3) {
      setMp3(null);
      setMp3Duration(null);
    }
  }

  function handleImageChange(e) {
    handleFiles(e.target.files);
  }
  function handleMp3Change(e) {
    handleFiles(e.target.files);
  }

  function fetchMp3Duration(url) {
    const audio = new window.Audio();
    audio.src = url;
    audio.preload = "metadata";
    audio.onloadedmetadata = function () {
      if (!isNaN(audio.duration)) {
        setMp3Duration(audio.duration);
        setDuration(audio.duration); // Set to mp3 duration by default
      }
    };
  }

  // Compose the video from image (+audio optional)
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

    // Capture the canvas stream (video)
    const fps = 30;
    const stream = canvas.captureStream(fps);

    // If there's an mp3, add as audio track
    let destStream = stream;
    let audioObj = null,
      audioTrack = null;
    if (mp3) {
      audioObj = new window.Audio();
      audioObj.src = mp3;
      audioObj.crossOrigin = "anonymous";
      audioObj.currentTime = 0;
      audioObj.loop = false;
      // Route audio to a MediaStream
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(audioObj);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination);
      audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        destStream = new MediaStream([...stream.getVideoTracks(), audioTrack]);
      }
    }

    // Use MediaRecorder to record (video + audio if available)
    const chunks = [];
    let rec;
    try {
      rec = new window.MediaRecorder(destStream, { mimeType: "video/webm" });
    } catch (err) {
      alert("Video recording not supported in this browser or with this media type.");
      setProcessing(false);
      return;
    }

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    rec.onstop = () => {
      if (audioObj) audioObj.pause();
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setProcessing(false);
    };

    // Draw still image frames for the entire video duration (~30 fps)
    const seconds = +duration || 3;
    const start = performance.now();
    let frameReq;
    function drawFrame(now) {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      if ((now - start) / 1000 < seconds) {
        frameReq = requestAnimationFrame(drawFrame);
      }
    }
    requestAnimationFrame(drawFrame);

    rec.start();
    // Start audio exactly with recorder
    if (audioObj) {
      try {
        // Resume audio context for autoplay policies
        await audioObj.play();
      } catch (_) {}
    }

    setTimeout(() => {
      rec.stop();
      cancelAnimationFrame(frameReq);
    }, seconds * 1000);
  }

  return (
    <div style={{ maxWidth: 420, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h2>Image + MP3 to Video Generator</h2>

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
        onClick={() => document.getElementById("imginput").click()}
      >
        {image ? (
          <img src={image} alt="" style={{ maxWidth: 200, maxHeight: 200, display: "block", margin: "0 auto" }} />
        ) : (
          <span>Drag & drop an image or mp3, or click to select image.</span>
        )}
        {mp3 && (
          <div style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
            🎵 {decodeURIComponent(mp3.split("/").pop() || "MP3")} <br />
            {mp3Duration && <small>Duration: {mp3Duration.toFixed(2)} s</small>}
          </div>
        )}
        <input
          id="imginput"
          type="file"
          accept="image/*,audio/mp3,audio/mpeg"
          multiple
          style={{ display: "none" }}
          onChange={handleFiles}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          <b>Select MP3 file: </b>
          <input
            type="file"
            accept="audio/mp3,audio/mpeg"
            onChange={handleMp3Change}
            style={{ display: "inline-block" }}
            disabled={processing}
          />
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>
          Video duration (seconds):
          <input
            type="number"
            min={1}
            max={180}
            step="any"
            value={duration}
            style={{ width: 70, marginLeft: 8 }}
            onChange={(e) => setDuration(e.target.value)}
            disabled={mp3Duration || processing}
          />
        </label>
        {mp3Duration && (
          <span
            style={{
              fontSize: 13,
              marginLeft: 8,
              color: "#1a8dd8",
            }}
          >
            (using MP3 duration)
          </span>
        )}
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
            download="image-mp3-video.webm"
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
