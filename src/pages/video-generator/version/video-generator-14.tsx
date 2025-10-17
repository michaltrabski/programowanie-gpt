tsx
"use client";

import React, {
  useState,
  useEffect,
  type ChangeEvent,
  type DragEvent,
} from "react";

type Nullable<T> = T | null;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/jpg",
] as const;

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
    if (
      (window as any).MediaRecorder &&
      (window as any).MediaRecorder.isTypeSupported?.(t)
    ) {
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

interface VideoResult {
  url: string;
  blob: Blob;
  orientation: Orientation;
}

const BLUE_BG = "#1a8dd8";

// Helper: Split input text into lines that fit maxWidth (canvas 2D context).
function splitTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const words = text.split(/\s/);
  const lines: string[] = [];
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line.length > 0 ? line + " " + words[n] : words[n];
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && line.length > 0) {
      lines.push(line);
      line = words[n];
    } else {
      line = testLine;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

// Draw image to always match the canvas width (requirement),
// centered vertically; may crop top/bottom if image is tall.
// Optionally draws overlayText after textDelaySec.
function drawImageFullWidth(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  img: HTMLImageElement,
  opts?: {
    overlayText?: string;
    showText?: boolean; // whether to draw overlay text this frame
  }
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = BLUE_BG;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const iw = img.width;
  const ih = img.height;
  const scale = canvasWidth / iw; // force width to match canvas width
  const drawW = canvasWidth;
  const drawH = ih * scale;
  const offsetX = 0;
  const offsetY = (canvasHeight - drawH) / 2; // center vertically (may be negative -> crop)
  ctx.imageSmoothingEnabled = true;
  try {
    // @ts-ignore
    ctx.imageSmoothingQuality = "high";
  } catch {}
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

  // ----- OVERLAY TEXT -----
  if (
    opts &&
    opts.overlayText &&
    opts.overlayText.trim().length > 0 &&
    opts.showText
  ) {
    // Draw at bottom center, max width = 50% video, gray background
    const text = opts.overlayText;
    const padY = 18; // vertical "padding" to not hit the edge

    const maxTextWidth = canvasWidth * 0.5;
    ctx.save();
    // Font size scaling: Use 7% of video height (reasonable for both orientations)
    const fontSize = Math.max(28, Math.round(canvasHeight * 0.07));
    ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Wrapping: Split into lines that fit maxTextWidth
    const lines = splitTextLines(ctx, text, maxTextWidth);

    // bg is a single rounded rectangle covering all lines+padding
    const lineHeight = fontSize * 1.18; // line spacing
    const totalTextHeight = lineHeight * lines.length;
    const boxWidth = maxTextWidth + 40; // horizontal padding = 20px each side
    const boxHeight = totalTextHeight + 24; // 12px vertical padding top/bottom

    const boxX = (canvasWidth - boxWidth) / 2;
    const boxY = canvasHeight - boxHeight - padY;

    // Bg rectangle, rounded corners
    ctx.globalAlpha = 0.90;
    ctx.fillStyle = "#eee";
    const r = 18;
    ctx.beginPath();
    ctx.moveTo(boxX + r, boxY);
    ctx.lineTo(boxX + boxWidth - r, boxY);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + r);
    ctx.lineTo(boxX + boxWidth, boxY + boxHeight - r);
    ctx.quadraticCurveTo(
      boxX + boxWidth,
      boxY + boxHeight,
      boxX + boxWidth - r,
      boxY + boxHeight
    );
    ctx.lineTo(boxX + r, boxY + boxHeight);
    ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - r);
    ctx.lineTo(boxX, boxY + r);
    ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
    ctx.closePath();
    ctx.fill();

    // Draw text
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#222";
    lines.forEach((line, i) => {
      ctx.fillText(
        line,
        canvasWidth / 2,
        boxY + 12 + lineHeight * i + lineHeight / 2
      );
    });
    ctx.restore();
  }
}

// Save blob helper
function saveBlobAs(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 400);
}

function createZip(files: { blob: Blob; name: string }[]): Promise<Blob> {
  return import("jszip")
    .then((JSZipModule) => {
      const JSZip = JSZipModule.default || JSZipModule;
      const zip = new JSZip();
      files.forEach((file) => {
        zip.file(file.name, file.blob);
      });
      return zip.generateAsync({ type: "blob" });
    })
    .catch(() => {
      throw new Error("Cannot create zip: JSZip not available.");
    });
}

const ImageToVideoGenerator: React.FC = () => {
  const [imageFile, setImageFile] = useState<Nullable<File>>(null);
  const [imageUrl, setImageUrl] = useState<Nullable<string>>(null);

  const [imageDimensions, setImageDimensions] = useState<Nullable<{
    width: number;
    height: number;
  }>>(null);

  const [mp3File, setMp3File] = useState<Nullable<File>>(null);
  const [mp3Url, setMp3Url] = useState<Nullable<string>>(null);
  const [mp3Duration, setMp3Duration] = useState<Nullable<number>>(null);

  const [videoResults, setVideoResults] = useState<VideoResult[]>([]);
  const [duration, setDuration] = useState<number>(3);
  const [processing, setProcessing] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const [videoText, setVideoText] = useState<string>("");

  // Cleanup on URL changes
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
      videoResults.forEach((v) => URL.revokeObjectURL(v.url));
    };
  }, [videoResults]);

  // Extract and display image dimensions on load
  useEffect(() => {
    if (!imageUrl) {
      setImageDimensions(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      setImageDimensions(null);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Only accept images in drag & drop area
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt || !dt.files) return;
    const files = Array.from(dt.files);
    const image = files.find(isImageFile);
    if (image) {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      const imgUrl = URL.createObjectURL(image);
      setImageFile(image);
      setImageUrl(imgUrl);
      setVideoResults([]);
    }
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
      setVideoResults([]);
    }
    e.target.value = "";
  }

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
      setVideoResults([]);
    }
    e.target.value = "";
  }

  function uploadAreaClick() {
    const input = document.getElementById("imginput");
    if (input) (input as HTMLInputElement).click();
  }

  // ----------- MODIFIED HERE: Add overlay text after 0.5s ---------
  async function generateSingleVideo(
    img: HTMLImageElement,
    orientation: Orientation
  ): Promise<VideoResult> {
    const { width, height } = ORIENTATIONS[orientation];

    // Create a dedicated canvas per recording to avoid conflicts
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available.");

    // Draw the initial frame with required resizing rule
    drawImageFullWidth(ctx, width, height, img);

    // Canvas stream
    const FPS = 30;
    const capture = (canvas as any).captureStream
      ? (canvas as any).captureStream(FPS)
      : (canvas as any).mozCaptureStream
      ? (canvas as any).mozCaptureStream(FPS)
      : null;
    if (!capture) throw new Error("Canvas stream capture not supported");
    const canvasStream: MediaStream = capture as MediaStream;

    // Compose with audio if provided
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

      audioContext =
        new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audioObj);
      const dest = audioContext.createMediaStreamDestination();
      source.connect(dest);
      // Optionally also connect to output so the user can hear it while recording.
      // If you don't want audible playback, comment out the next line.
      try {
        source.connect(audioContext.destination);
      } catch {}
      audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        composedStream.addTrack(audioTrack);
      }
    }

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
    } catch {
      throw new Error(
        "Video recording with the chosen settings is not supported in this browser."
      );
    }

    const CHUNKS: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) CHUNKS.push(e.data);
    };

    // Frame loop at 30 FPS
    // >>>> Draw overlayText only after 0.5s (15 frames)
    let recording = true;
    let currentFrame = 0;
    const textDelayFrames = Math.ceil(FPS * 0.5);

    const intervalId = window.setInterval(() => {
      if (!recording) return;
      drawImageFullWidth(ctx, width, height, img, {
        overlayText: videoText,
        showText: currentFrame >= textDelayFrames, // only after 0.5s
      });
      currentFrame++;
    }, Math.max(16, Math.round(1000 / FPS)));

    return await new Promise<VideoResult>(async (resolve, reject) => {
      recorder.onstop = async () => {
        try {
          window.clearInterval(intervalId);
        } catch {}
        recording = false;

        try {
          composedStream.getTracks().forEach((t) => t.stop());
          canvasStream.getTracks().forEach((t) => t.stop());
        } catch {}

        try {
          if (audioObj) {
            audioObj.pause();
            audioObj.src = "";
          }
        } catch {}
        try {
          await audioContext?.close();
        } catch {}

        const blob = new Blob(CHUNKS, { type: mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        resolve({ url, blob, orientation });
      };

      try {
        recorder.start();
      } catch {
        window.clearInterval(intervalId);
        return reject(new Error("Failed to start recorder."));
      }

      if (audioObj && audioContext) {
        try {
          if (audioContext.state === "suspended") {
            await audioContext.resume();
          }
        } catch {}
        const onEnded = () => {
          audioObj?.removeEventListener("ended", onEnded);
          try {
            if (recorder.state !== "inactive") {
              recorder.stop();
            }
          } catch {}
        };
        audioObj.addEventListener("ended", onEnded);

        try {
          await audioObj.play();
        } catch {
          await new Promise<void>((resolveAudio) => {
            const onCanPlay = () => {
              audioObj?.removeEventListener("canplay", onCanPlay);
              resolveAudio();
            };
            audioObj?.addEventListener("canplay", onCanPlay);
          });
          await audioObj.play().catch(() => {});
        }
      } else {
        // No audio: stop after chosen duration
        const secs = Math.max(0.1, duration || 3);
        window.setTimeout(() => {
          try {
            if (recorder.state !== "inactive") {
              recorder.stop();
            }
          } catch {}
        }, Math.ceil(secs * 1000));
      }
    });
  }

  // Main: generate both videos (sequential to avoid double-audio playback overlap)
  async function handleGenerateVideo() {
    if (!imageUrl || processing) return;

    if (!(window as any).MediaRecorder) {
      alert("MediaRecorder is not supported in this browser.");
      return;
    }

    setProcessing(true);

    // Cleanup previous
    videoResults.forEach((v) => URL.revokeObjectURL(v.url));
    setVideoResults([]);

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject("Error loading image");
      });

      // Sequential generation to prevent overlapping audio playback
      const resH = await generateSingleVideo(img, "horizontal");
      const resV = await generateSingleVideo(img, "vertical");
      setVideoResults([resH, resV]);
    } catch (err: any) {
      alert(err?.message || "Failed to generate video");
    } finally {
      setProcessing(false);
    }
  }

  // Download both videos at once as a zip
  async function handleDownloadBoth() {
    if (videoResults.length !== 2) return;
    setDownloading(true);
    try {
      const files = videoResults.map((v) => ({
        blob: v.blob,
        name: `image-mp3-${v.orientation}.webm`,
      }));
      const zipBlob = await createZip(files);
      saveBlobAs(zipBlob, "videos.zip");
    } catch {
      alert(
        "Could not create ZIP (JSZip not loaded), please download the videos one by one."
      );
    } finally {
      setDownloading(false);
    }
  }

  // Show the previews side by side after generation
  const VideoPreview =
    videoResults.length === 2 && (
      <div
        style={{
          display: "flex",
          gap: 16,
          margin: "0 auto 26px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {(["horizontal", "vertical"] as Orientation[]).map((orientation) => {
          const v = videoResults.find((r) => r.orientation === orientation)!;
          return (
            <div
              key={orientation}
              style={{ textAlign: "center", flex: "1 1 0" }}
            >
              <div
                style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}
              >
                {orientation === "horizontal"
                  ? "Horizontal (1920x1080)"
                  : "Vertical (1080x1920)"}
              </div>
              <video
                src={v.url}
                controls
                style={{
                  width: orientation === "horizontal" ? 320 : 180,
                  height: orientation === "horizontal" ? 180 : 320,
                  background: BLUE_BG,
                  borderRadius: 6,
                  boxShadow: "0 2px 10px #0002",
                  marginBottom: 9,
                }}
              />
              <div>
                <a
                  href={v.url}
                  download={`image-mp3-${orientation}.webm`}
                  style={{
                    display: "inline-block",
                    textDecoration: "none",
                    background: "#2196f3",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 500,
                    padding: "0.4rem 0.9rem",
                    borderRadius: 4,
                    marginTop: 0,
                  }}
                >
                  ⬇️ Download {orientation}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    );

  return (
    <div
      style={{
        maxWidth: 560,
        margin: "2rem auto",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "1.7rem",
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
          <>
            <img
              src={imageUrl}
              alt="Preview"
              style={{
                maxWidth: 260,
                maxHeight: 200,
                display: "block",
                margin: "0 auto 8px",
                borderRadius: 6,
                background: BLUE_BG,
              }}
            />
            {imageDimensions ? (
              <div
                style={{
                  color: "#1a8dd8",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                {`Original dimensions: ${imageDimensions.width}x${imageDimensions.height}`}
              </div>
            ) : (
              <div style={{ color: "#888", fontSize: 12 }} />
            )}
          </>
        ) : (
          <span style={{ color: "#666" }}>
            Drag & drop an image here,
            <br /> or click to select an image.
            <br />
            <span style={{ fontSize: 13, color: "#888" }}>
              (JPEG, PNG, GIF, WebP)
            </span>
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
            {mp3Duration && (
              <span style={{ color: "#1a8dd8" }}>
                • Length: {formatSeconds(mp3Duration)}
              </span>
            )}
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
        {!!mp3Duration && (
          <span style={{ fontSize: 13, color: "#1a8dd8", marginLeft: 8 }}>
            (using MP3 duration)
          </span>
        )}
      </div>

      {/* --------- New Text Input --------- */}
      <div style={{ marginBottom: 18 }}>
        <label>
          Overlay text for video:
          <input
            type="text"
            value={videoText}
            onChange={(e) => setVideoText(e.target.value)}
            maxLength={256}
            placeholder="Enter text to show at video bottom"
            style={{
              width: "100%",
              marginTop: 5,
              padding: "8px 12px",
              borderRadius: 5,
              border: "1px solid #ddd",
              fontSize: 16,
            }}
            disabled={processing}
          />
        </label>
        <div style={{ color: "#777", fontSize: 12, marginTop: 4 }}>
          The above text will appear centered at the bottom, over a gray background, after 0.5s.
        </div>
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
        {processing ? "Generating Videos..." : "Generate Horizontal & Vertical Videos"}
      </button>

      {videoResults.length === 2 && (
        <div style={{ marginBottom: 22 }}>
          {VideoPreview}
          <button
            onClick={handleDownloadBoth}
            disabled={downloading}
            style={{
              background: "#009b4d",
              color: "#fff",
              fontWeight: 600,
              border: "none",
              borderRadius: 5,
              padding: "0.65rem 1.3rem",
              fontSize: 16,
              margin: "0 auto",
              display: "block",
              cursor: downloading ? "wait" : "pointer",
              opacity: downloading ? 0.7 : 1,
            }}
          >
            {downloading ? "Preparing ZIP..." : "⬇️ Download BOTH videos as ZIP"}
          </button>
          <div
            style={{
              fontSize: 13,
              color: "#999",
              marginTop: 5,
              textAlign: "center",
            }}
          >
            If ZIP fails (e.g. slow to load JSZip), use individual download buttons above.
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageToVideoGenerator;
