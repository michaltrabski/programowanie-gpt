import React, { useRef, useState, type ChangeEvent, type DragEvent, useEffect } from "react";

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

function pickSupportedMimeType(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=opus,vp9",
    "video/webm",
  ];
  for (const t of candidates) {
    if ((window as any).MediaRecorder && (window as any).MediaRecorder.isTypeSupported?.(t)) {
      return t;
    }
  }
  return undefined;
}

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

  // Revoke object URLs when they change to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (mp3Url) URL.revokeObjectURL(mp3Url);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    return () => {
      if (mp3Url) URL.revokeObjectURL(mp3Url);
    };
  }, [mp3Url]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

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
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      const imgUrl = URL.createObjectURL(localImg);
      setImageFile(localImg);
      setImageUrl(imgUrl);
      setVideoUrl(null);
    } else if (!foundImg) {
      setImageFile(null);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }

    if (localMp3) {
      if (mp3Url) URL.revokeObjectURL(mp3Url);
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
    } else if (!foundMp3) {
      setMp3File(null);
      if (mp3Url) URL.revokeObjectURL(mp3Url);
      setMp3Url(null);
      setMp3Duration(null);
    }
  }

  function handleSelectFiles(e: ChangeEvent<HTMLInputElement>) {
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

    if (!(window as any).MediaRecorder) {
      alert("MediaRecorder is not supported in this browser.");
      return;
    }

    setProcessing(true);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }

    // Load the image
    const img = new window.Image();
    img.crossOrigin = "anonymous";
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
          setProcessing(false);
          throw new Error("Canvas stream capture not supported");
        })();

    // Setup audio routing if mp3 is provided
    let composedStream: MediaStream = new MediaStream(canvasStream.getVideoTracks());
    let audioObj: HTMLAudioElement | null = null;
    let audioContext: AudioContext | null = null;
    let audioTrack: MediaStreamTrack | undefined;

    if (mp3Url) {
      audioObj = new Audio();
      audioObj.src = mp3Url;
      audioObj.crossOrigin = "anonymous";
      audioObj.preload = "auto";
      audioObj.currentTime = 0;

      // Web Audio routing: element -> destination node (stream)
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audioObj);
      const dest = audioContext.createMediaStreamDestination();

      // Connect to the stream (do NOT connect to audioContext.destination to avoid echo)
      source.connect(dest);

      // Include audio track in composed stream
      audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        composedStream.addTrack(audioTrack);
      }
    }

    // Pick a supported WebM mime type
    const mimeType = pickSupportedMimeType();
    const recorderOptions: MediaRecorderOptions = mimeType
      ? {
          mimeType,
          // Reasonable bitrates to avoid muted audio on some setups
          audioBitsPerSecond: 128_000,
          videoBitsPerSecond: 2_500_000,
        }
      : {
          audioBitsPerSecond: 128_000,
          videoBitsPerSecond: 2_500_000,
        };

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(composedStream, recorderOptions);
    } catch (err) {
      setProcessing(false);
      alert("Video recording with the chosen settings is not supported in this browser.");
      return;
    }

    const CHUNKS: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) CHUNKS.push(e.data);
    };

    const stopRecording = async () => {
      try {
        // Stop animation loop and media tracks
        recording = false;
        composedStream.getTracks().forEach((t) => t.stop());
        canvasStream.getTracks().forEach((t) => t.stop());
        if (audioObj) {
          audioObj.pause();
          // Ensure the last bit of audio is flushed before stopping the recorder
          await new Promise((r) => setTimeout(r, 100));
        }
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      } catch {
        // no-op
      }
    };

    recorder.onstop = async () => {
      try {
        if (audioContext) await audioContext.close();
      } catch {}
      const blob = new Blob(CHUNKS, { type: mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setProcessing(false);
    };

    // Animate canvas with static image at FPS, so canvas stream is "live"
    let recording = true;
    const drawFrame = () => {
      if (!recording) return;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      setTimeout(() => {
        requestAnimationFrame(drawFrame);
      }, 1000 / FPS);
    };

    // Start drawing frames before starting recorder
    requestAnimationFrame(drawFrame);

    // Start the recorder
    try {
      recorder.start(); // no timeslice for maximal compatibility
    } catch (e) {
      setProcessing(false);
      alert("Failed to start recorder.");
      return;
    }

    // Start audio (if any) and stop on end
    if (audioObj && audioContext) {
      try {
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
      } catch {}
      const onEnded = () => {
        audioObj?.removeEventListener("ended", onEnded);
        stopRecording();
      };
      audioObj.addEventListener("ended", onEnded);

      try {
        await audioObj.play();
      } catch {
        // If autoplay policies block, wait until it's ready
        await new Promise<void>((resolve) => {
          const onCanPlay = () => {
            audioObj.removeEventListener("canplay", onCanPlay);
            resolve();
          };
          audioObj.addEventListener("canplay", onCanPlay);
        });
        await audioObj.play().catch(() => {
          // Still blocked - user must interact; fall back to timed stop
        });
      }
    } else {
      // No audio - stop after selected duration
      const secs = Math.max(0.1, duration || 3);
      setTimeout(() => {
        stopRecording();
      }, Math.ceil(secs * 1000));
    }
  }

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "2rem auto",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "1.5rem",
        borderRadius: 12,
        border: "1px solid #eee",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Image + MP3 to Video Generator</h2>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={uploadAreaClick}
        tabIndex={0}
        style={{
          border: "2px dashed #1a8dd8",
          padding: "1.25rem",
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
              maxWidth: 260,
              maxHeight: 200,
              display: "block",
              margin: "0 auto 8px",
              borderRadius: 6,
            }}
          />
        ) : (
          <span style={{ color: "#666" }}>
            Drag & drop an image and/or MP3 here,
            <br /> or click to select files.
            <br />
            <span style={{ fontSize: 13, color: "#888" }}>(JPEG, PNG, GIF, WebP • MP3)</span>
          </span>
        )}

        <input
          id="imginput"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,audio/mp3,audio/mpeg"
          multiple
          style={{ display: "none" }}
          onChange={handleSelectFiles}
        />

        {mp3Url && mp3File && (
          <div
            style={{
              fontSize: 13,
              marginTop: 10,
              color: "#555",
              borderTop: imageUrl ? "1px solid #eee" : undefined,
              paddingTop: imageUrl ? 8 : 0,
            }}
          >
            🎵 {mp3File.name || fileNameFromUrl(mp3Url)}{" "}
            {mp3Duration && <span style={{ color: "#1a8dd8" }}>• Length: {formatSeconds(mp3Duration)}</span>}
            <div style={{ marginTop: 6 }}>
              <audio src={mp3Url} controls style={{ width: "100%" }} />
            </div>
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
          Video duration (seconds):{" "}
          <input
            type="number"
            min={1}
            max={600}
            step="any"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={!!mp3Duration || processing}
            style={{ width: 80, marginLeft: 6 }}
          />
        </label>
        {!!mp3Duration && <span style={{ fontSize: 13, color: "#1a8dd8", marginLeft: 8 }}>(using MP3 duration)</span>}
      </div>

      <button
        onClick={handleGenerateVideo}
        disabled={!imageUrl || processing}
        style={{
          marginBottom: 18,
          padding: "0.5rem 1.2rem",
          borderRadius: 6,
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

      {videoUrl && (
        <div>
          <video
            src={videoUrl}
            controls
            style={{ width: "100%", maxWidth: 420, margin: "0.5rem auto 0.75rem", display: "block" }}
          />
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

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default ImageToVideoGenerator;
