import React, { useRef, useState, useEffect, type ChangeEvent, type DragEvent } from "react";

type Nullable<T> = T | null;

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"] as const;

const ACCEPTED_AUDIO_TYPES = ["audio/mp3", "audio/mpeg"] as const;

function isImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type as any);
}
function isMp3File(file: File): boolean {
  return ACCEPTED_AUDIO_TYPES.includes(file.type as any);
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

type Orientation = "horizontal" | "vertical";

interface Resolution {
  width: number;
  height: number;
}

const ORIENTATIONS: Record<Orientation, Resolution> = {
  horizontal: { width: 1920, height: 1080 },
  vertical: { width: 1080, height: 1920 },
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

  const [orientation, setOrientation] = useState<Orientation>("horizontal");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup URLs on unmount
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

  // Only accept images in drag & drop area
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!e.dataTransfer.files) return;
    const files = Array.from(e.dataTransfer.files);
    const image = files.find(isImageFile);
    if (image) {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      const imgUrl = URL.createObjectURL(image);
      setImageFile(image);
      setImageUrl(imgUrl);
      setVideoUrl(null);
    }
    // ignore audio or other non-image files
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleSelectImage(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const image = Array.from(files).find(isImageFile);
    if (image) {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      const imgUrl = URL.createObjectURL(image);
      setImageFile(image);
      setImageUrl(imgUrl);
      setVideoUrl(null);
    }
    e.target.value = "";
  }

  // Only accept audio via separate mp3 file picker
  function handleSelectMp3(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const mp3 = Array.from(files).find(isMp3File);
    if (mp3) {
      if (mp3Url) URL.revokeObjectURL(mp3Url);
      const mp3U = URL.createObjectURL(mp3);
      setMp3File(mp3);
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
    e.target.value = "";
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

    // Set canvas dimensions for selected orientation
    const { width, height } = ORIENTATIONS[orientation];

    // Load image
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject("Error loading image");
    });

    // Prep canvas
    const canvas = canvasRef.current!;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // Draw image to fill canvas while keeping its aspect ratio
    ctx.clearRect(0, 0, width, height);
    // Cover-fit algorithm (object-fit: cover for canvas draw)
    const iw = img.width;
    const ih = img.height;
    const scale = Math.max(width / iw, height / ih);
    const iwScaled = iw * scale;
    const ihScaled = ih * scale;
    const x = (width - iwScaled) / 2;
    const y = (height - ihScaled) / 2;
    ctx.drawImage(img, x, y, iwScaled, ihScaled);

    // Canvas stream
    const FPS = 30;
    const canvasStream: MediaStream = (canvas as any).captureStream
      ? (canvas as any).captureStream(FPS)
      : (canvas as any).mozCaptureStream
      ? (canvas as any).mozCaptureStream(FPS)
      : (() => {
          setProcessing(false);
          throw new Error("Canvas stream capture not supported");
        })();

    // Audio routing if mp3 provided
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
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audioObj);
      const dest = audioContext.createMediaStreamDestination();
      source.connect(dest);
      audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        composedStream.addTrack(audioTrack);
      }
    }

    // Recorder mime selection
    const mimeType = pickSupportedMimeType();
    const recorderOptions: MediaRecorderOptions = mimeType
      ? {
          mimeType,
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
        recording = false;
        composedStream.getTracks().forEach((t) => t.stop());
        canvasStream.getTracks().forEach((t) => t.stop());
        if (audioObj) {
          audioObj.pause();
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

    // Animation loop: redraws to keep MediaRecorder happy (even if image is static)
    let recording = true;
    const drawFrame = () => {
      if (!recording) return;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, x, y, iwScaled, ihScaled);
      setTimeout(() => {
        requestAnimationFrame(drawFrame);
      }, 1000 / FPS);
    };

    requestAnimationFrame(drawFrame);

    try {
      recorder.start();
    } catch (e) {
      setProcessing(false);
      alert("Failed to start recorder.");
      return;
    }

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
        await audioObj.play().catch(() => {});
      }
    } else {
      // No audio: stop after duration
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
      <div style={{ marginBottom: 14 }}>
        <label>
          <b>Orientation: </b>
          <select
            value={orientation}
            disabled={processing}
            onChange={(e) => {
              setOrientation(e.target.value as Orientation);
            }}
            style={{
              marginLeft: 8,
              padding: "4px 10px",
              fontSize: 15,
              borderRadius: 4,
              border: "1px solid #bbb",
            }}
          >
            <option value="horizontal">Horizontal (1920×1080)</option>
            <option value="vertical">Vertical (1080×1920)</option>
          </select>
        </label>
      </div>

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
            Drag & drop an image here,
            <br /> or click to select an image.
            <br />
            <span style={{ fontSize: 13, color: "#888" }}>(JPEG, PNG, GIF, WebP)</span>
          </span>
        )}
        <input
          id="imginput"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          multiple={false}
          style={{ display: "none" }}
          onChange={handleSelectImage}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          <b>Select MP3 file: </b>
          <input
            type="file"
            accept={ACCEPTED_AUDIO_TYPES.join(",")}
            onChange={handleSelectMp3}
            disabled={processing}
            style={{ display: "inline", marginLeft: 7 }}
          />
        </label>
        {mp3Url && mp3File && (
          <div
            style={{
              fontSize: 13,
              marginTop: 7,
              color: "#555",
              borderTop: "1px solid #eee",
              paddingTop: 8,
              maxWidth: 420,
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
            style={{
              width: "100%",
              maxWidth: 420,
              margin: "0.5rem auto 0.75rem",
              display: "block",
            }}
          />
          <a
            href={videoUrl}
            download={`image-mp3-video` + (orientation === "vertical" ? "-vertical" : "-horizontal") + `.webm`}
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
