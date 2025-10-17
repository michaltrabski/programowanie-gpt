import React, { useRef, useState, type ChangeEvent, type DragEvent } from "react";

type Nullable<T> = T | null;

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"];

const ACCEPTED_AUDIO_TYPES = ["audio/mp3", "audio/mpeg"];

function isImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}
function isMp3File(file: File): boolean {
  return ACCEPTED_AUDIO_TYPES.includes(file.type);
}

const formatSeconds = (secs: number) => `${secs.toFixed(2)}s`;

const getMp3Duration = (url: string): Promise<number> =>
  new Promise((resolve, reject) => {
    const audio = new window.Audio();
    audio.src = url;
    audio.preload = "metadata";
    audio.onloadedmetadata = function () {
      if (!isNaN(audio.duration)) resolve(audio.duration);
      else reject("Audio duration could not be determined.");
    };
    audio.onerror = () => reject("Failed to load audio for duration check.");
  });

const fileNameFromUrl = (url: string) => {
  try {
    return decodeURIComponent(url.split("/").pop() || "");
  } catch {
    return url;
  }
};

const ImageToVideoGenerator: React.FC = () => {
  const [imageFile, setImageFile] = useState<Nullable<File>>(null);
  const [imageUrl, setImageUrl] = useState<Nullable<string>>(null);

  const [mp3File, setMp3File] = useState<Nullable<File>>(null);
  const [mp3Url, setMp3Url] = useState<Nullable<string>>(null);
  const [mp3Duration, setMp3Duration] = useState<Nullable<number>>(null);

  const [videoUrl, setVideoUrl] = useState<Nullable<string>>(null);
  const [duration, setDuration] = useState<number>(3);
  const [processing, setProcessing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    processFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function processFiles(fileList: FileList | null) {
    if (!fileList) return;

    let foundImg = false;
    let foundMp3 = false;
    let localImg: File | null = null;
    let localMp3: File | null = null;

    Array.from(fileList).forEach((file) => {
      if (!foundImg && isImageFile(file)) {
        localImg = file;
        foundImg = true;
      }
      if (!foundMp3 && isMp3File(file)) {
        localMp3 = file;
        foundMp3 = true;
      }
    });

    if (localImg) {
      const imgUrl = URL.createObjectURL(localImg);
      setImageFile(localImg);
      setImageUrl(imgUrl);
      setVideoUrl(null);
    }
    if (!foundImg) {
      setImageFile(null);
      setImageUrl(null);
    }

    if (localMp3) {
      const mp3U = URL.createObjectURL(localMp3);
      setMp3File(localMp3);
      setMp3Url(mp3U);
      getMp3Duration(mp3U)
        .then((dur) => {
          setMp3Duration(dur);
          setDuration(dur);
        })
        .catch(() => {
          setMp3Duration(null);
        });
      setVideoUrl(null);
    }
    if (!foundMp3) {
      setMp3File(null);
      setMp3Url(null);
      setMp3Duration(null);
    }
  }

  function handleSelectImage(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) processFiles(e.target.files);
  }
  function handleSelectMp3(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) processFiles(e.target.files);
  }

  function uploadAreaClick() {
    const input = document.getElementById("imginput");
    if (input) (input as HTMLInputElement).click();
  }

  async function handleGenerateVideo() {
    if (!imageUrl || processing) return;

    setProcessing(true);
    setVideoUrl(null);

    // Load the image
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject("Error loading image");
    });

    // Prepare canvas to match image
    const width = img.width;
    const height = img.height;
    const canvas = canvasRef.current!;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, width, height);

    // Create canvas video stream
    const FPS = 30;
    const canvasStream: MediaStream = (canvas as any).captureStream
      ? (canvas as any).captureStream(FPS)
      : (canvas as any).mozCaptureStream
      ? (canvas as any).mozCaptureStream(FPS)
      : (() => {
          throw new Error("Canvas stream capture not supported");
        })();

    // Optionally add audio stream track
    let destStream: MediaStream = canvasStream;
    let audioObj: HTMLAudioElement | null = null;
    let audioContext: AudioContext | null = null;

    if (mp3Url) {
      audioObj = new window.Audio();
      audioObj.src = mp3Url;
      audioObj.crossOrigin = "anonymous";
      audioObj.currentTime = 0;

      // Setup Web Audio routing
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audioObj);
      const dest = audioContext.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioContext.destination);

      // Compose video+audio stream
      const audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        destStream = new MediaStream([...canvasStream.getVideoTracks(), audioTrack]);
      }
    }

    // Prepare recording
    const CHUNKS: BlobPart[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new window.MediaRecorder(destStream, {
        mimeType: "video/webm",
      });
    } catch (err) {
      alert("Video recording not supported in this browser.");
      setProcessing(false);
      return;
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) CHUNKS.push(e.data);
    };

    recorder.onstop = () => {
      if (audioObj) audioObj.pause();
      if (audioContext) audioContext.close();
      const blob = new Blob(CHUNKS, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setProcessing(false);
    };

    // Animate canvas with static image at FPS, so that the canvas stream is "live"
    const seconds = mp3Duration ? mp3Duration : duration;
    const start = performance.now();
    let frameReq: number;
    function drawFrame(now: number) {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      if ((now - start) / 1000 < seconds) {
        frameReq = requestAnimationFrame(drawFrame);
      }
    }
    frameReq = requestAnimationFrame(drawFrame);

    // Start recording
    recorder.start();
    if (audioObj && audioContext) {
      try {
        await audioContext.resume();
      } catch {}
      await audioObj.play();
    }
    setTimeout(() => {
      recorder.stop();
      cancelAnimationFrame(frameReq);
    }, Math.ceil(seconds * 1000));
  }

  return (
    <div
      style={{
        maxWidth: 450,
        margin: "2rem auto",
        fontFamily: "sans-serif",
        padding: "1.5rem",
        borderRadius: 12,
        border: "1px solid #eee",
        background: "#fff",
      }}
    >
      <h2>Image + MP3 to Video Generator</h2>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={uploadAreaClick}
        tabIndex={0}
        style={{
          border: "2px dashed #1a8dd8",
          padding: "2rem",
          textAlign: "center",
          marginBottom: "1rem",
          cursor: "pointer",
          borderRadius: 8,
          outline: "none",
          background: "#f8fcff",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Preview"
            style={{
              maxWidth: 240,
              maxHeight: 180,
              display: "block",
              margin: "0 auto 8px",
            }}
          />
        ) : (
          <span style={{ color: "#666" }}>
            Drag & drop an image <b>and/or</b> mp3 here,
            <br /> or click to select image/mp3 files.
            <br />
            <span style={{ fontSize: 13, color: "#888" }}>(JPEG, PNG, GIF, WebP &middot; MP3)</span>
          </span>
        )}

        <input
          id="imginput"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,audio/mp3,audio/mpeg"
          multiple
          style={{ display: "none" }}
          onChange={(e) => processFiles(e.target.files)}
        />

        {mp3Url && mp3File && (
          <div
            style={{
              fontSize: 13,
              marginTop: 8,
              color: "#555",
              borderTop: imageUrl ? "1px solid #eee" : undefined,
              paddingTop: imageUrl ? 5 : 0,
            }}
          >
            🎵 {mp3File.name || fileNameFromUrl(mp3Url)} <br />
            {mp3Duration && <span style={{ color: "#1a8dd8" }}>Length: {formatSeconds(mp3Duration)}</span>}
            <br />
            <audio src={mp3Url} controls style={{ marginTop: 4, width: "90%" }} />
          </div>
        )}
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          <b>Select MP3 file: </b>
          <input
            type="file"
            accept="audio/mp3,audio/mpeg"
            onChange={handleSelectMp3}
            disabled={processing}
            style={{ display: "inline", marginLeft: 7 }}
          />
        </label>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ opacity: mp3Duration ? 0.5 : 1 }}>
          Video duration (seconds):&nbsp;
          <input
            type="number"
            min={1}
            max={180}
            step="any"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={!!mp3Duration || processing}
            style={{ width: 70, marginLeft: 2 }}
          />
        </label>
        {!!mp3Duration && <span style={{ fontSize: 13, color: "#1a8dd8", marginLeft: 8 }}>(using MP3 duration)</span>}
      </div>

      <button
        onClick={handleGenerateVideo}
        disabled={!imageUrl || processing}
        style={{
          marginBottom: 18,
          padding: "0.45rem 1.2rem",
          borderRadius: 5,
          background: !imageUrl || processing ? "#aaa" : "#2196f3",
          color: "#fff",
          border: "none",
          cursor: !imageUrl || processing ? "default" : "pointer",
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {processing ? "Generating Video..." : "Generate Video"}
      </button>
      <br />

      {videoUrl && (
        <div>
          <video src={videoUrl} controls style={{ maxWidth: 350, margin: "1rem auto 1rem" }} />
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
              marginTop: 5,
            }}
          >
            ⬇️ Download video
          </a>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
    </div>
  );
};

export default ImageToVideoGenerator;
