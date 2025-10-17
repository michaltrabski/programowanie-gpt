tsx
"use client";

import React, { useState, useEffect, type ChangeEvent, type DragEvent } from "react";

type Nullable<T> = T | null;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/jpg",
] as const;
const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
] as const;
const ACCEPTED_AUDIO_TYPES = ["audio/mp3", "audio/mpeg"] as const;

function isImageFile(file: File) {
  return ACCEPTED_IMAGE_TYPES.includes(file.type as any);
}
function isVideoFile(file: File) {
  return ACCEPTED_VIDEO_TYPES.includes(file.type as any);
}
function isMp3File(file: File) {
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

const getVideoDuration = (url: string): Promise<number> =>
  new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = url;
    video.preload = "metadata";
    video.onloadedmetadata = function () {
      if (!isNaN(video.duration)) resolve(video.duration);
      else reject("Video duration could not be determined.");
    };
    video.onerror = () => reject("Failed to load video for duration check.");
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

// --------------- UI-Persisted Overlay Settings ----------------
type OverlayPositionMode = "bottom" | "top" | "middle" | "custom";
type TextSettings = {
  overlayText: string;
  fontFamily: string;
  fontWeight: string;
  fontSizePercent: number;
  fontMinPx: number;
  fontMaxPx: number;
  textColor: string;
  bgColor: string;
  boxOpacity: number;
  outlineColor: string;
  outlineWidth: number;
  align: "center" | "left" | "right";
  boxRadius: number;
  position: OverlayPositionMode;
  positionYPercent: number;
};

const DEFAULT_TEXT_SETTINGS: TextSettings = {
  overlayText: "",
  fontFamily: "Inter, Arial, sans-serif",
  fontWeight: "bold",
  fontSizePercent: 7,
  fontMinPx: 24,
  fontMaxPx: 80,
  textColor: "#222",
  bgColor: "#eeeeee",
  boxOpacity: 0.9,
  outlineColor: "#000",
  outlineWidth: 0,
  align: "center",
  boxRadius: 18,
  position: "bottom",
  positionYPercent: 85,
};

const LOCALSTORE_KEY = "imageToVideoGenTextSettings";

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

// For image input: cover video, for video input: cover output
function drawMediaFullWidth(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  element: HTMLImageElement | HTMLVideoElement,
  opts?: {
    settings: TextSettings;
    showText?: boolean;
    pauseVideo?: boolean;
  }
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = BLUE_BG;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const iw = element instanceof HTMLImageElement ? element.width : element.videoWidth;
  const ih = element instanceof HTMLImageElement ? element.height : element.videoHeight;

  const scale = canvasWidth / iw;
  const drawW = canvasWidth;
  const drawH = ih * scale;
  const offsetX = 0, offsetY = (canvasHeight - drawH) / 2;
  ctx.imageSmoothingEnabled = true;
  try {
    (ctx as any).imageSmoothingQuality = "high";
  } catch { }
  ctx.drawImage(element, offsetX, offsetY, drawW, drawH);

  // ---- Overlay text? ----
  if (
    opts &&
    opts.settings.overlayText &&
    opts.settings.overlayText.trim().length > 0 &&
    opts.showText
  ) {
    const {
      overlayText,
      fontFamily,
      fontWeight,
      fontSizePercent,
      fontMinPx,
      fontMaxPx,
      textColor,
      bgColor,
      boxOpacity,
      outlineColor,
      outlineWidth,
      align,
      boxRadius,
      position,
      positionYPercent,
    } = opts.settings;
    const padY = 18;
    const maxTextWidth = canvasWidth * 0.5;

    let fontPx = canvasWidth * (fontSizePercent / 100);
    fontPx = Math.max(fontMinPx, Math.min(fontMaxPx, fontPx));

    ctx.save();
    ctx.font = `${fontWeight} ${Math.round(fontPx)}px ${fontFamily}`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";

    let anchorX = canvasWidth / 2;
    if (align === "left") anchorX = canvasWidth * 0.25;
    if (align === "right") anchorX = canvasWidth * 0.75;

    const lines = splitTextLines(ctx, overlayText, maxTextWidth);
    const lineHeight = fontPx * 1.18;
    const totalTextHeight = lineHeight * lines.length;
    const boxWidth = maxTextWidth + 40;
    const boxHeight = totalTextHeight + 24;

    // Y position logic based on setting:
    let boxY: number;
    if (position === "top")
      boxY = padY;
    else if (position === "middle")
      boxY = (canvasHeight - boxHeight) / 2;
    else if (position === "custom")
      boxY = Math.round((canvasHeight * positionYPercent) / 100) - boxHeight / 2;
    else // "bottom"
      boxY = canvasHeight - boxHeight - padY;

    if (boxY < 0) boxY = 0;
    if (boxY + boxHeight > canvasHeight) boxY = canvasHeight - boxHeight;

    const boxX = (canvasWidth - boxWidth) / 2;

    // bg rounded rectangle
    ctx.globalAlpha = boxOpacity;
    ctx.fillStyle = bgColor;
    const r = boxRadius;
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

    ctx.globalAlpha = 1;
    if (outlineWidth > 0) {
      ctx.lineJoin = "round";
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = outlineWidth;
      lines.forEach((line, i) => {
        ctx.strokeText(
          line,
          anchorX,
          boxY + 12 + lineHeight * i + lineHeight / 2
        );
      });
    }
    ctx.fillStyle = textColor;
    lines.forEach((line, i) => {
      ctx.fillText(
        line,
        anchorX,
        boxY + 12 + lineHeight * i + lineHeight / 2
      );
    });
    ctx.restore();
  }
}

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
  const [visualFile, setVisualFile] = useState<Nullable<File>>(null);
  const [visualUrl, setVisualUrl] = useState<Nullable<string>>(null);
  const [visualType, setVisualType] = useState<"image" | "video" | null>(null);
  const [imageDimensions, setImageDimensions] = useState<Nullable<{ width: number; height: number }>>(null);
  const [videoDuration, setVideoDuration] = useState<Nullable<number>>(null);

  const [mp3File, setMp3File] = useState<Nullable<File>>(null);
  const [mp3Url, setMp3Url] = useState<Nullable<string>>(null);
  const [mp3Duration, setMp3Duration] = useState<Nullable<number>>(null);

  const [videoResults, setVideoResults] = useState<VideoResult[]>([]);
  const [duration, setDuration] = useState<number>(3);
  const [processing, setProcessing] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  // Allow user to choose one orientation
  const [orientation, setOrientation] = useState<Orientation>("horizontal");

  // Persisted Text Settings
  const [textSettings, setTextSettings] = useState<TextSettings>(DEFAULT_TEXT_SETTINGS);

  // Load settings on mount
  useEffect(() => {
    try {
      const val = localStorage.getItem(LOCALSTORE_KEY);
      if (val) {
        const parsed = JSON.parse(val) as TextSettings;
        setTextSettings({ ...DEFAULT_TEXT_SETTINGS, ...parsed });
      }
    } catch { }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LOCALSTORE_KEY, JSON.stringify(textSettings));
    } catch { }
  }, [textSettings]);
  useEffect(() => () => { if (visualUrl) URL.revokeObjectURL(visualUrl); }, [visualUrl]);
  useEffect(() => () => { if (mp3Url) URL.revokeObjectURL(mp3Url); }, [mp3Url]);
  useEffect(() => () => { videoResults.forEach((v) => URL.revokeObjectURL(v.url)); }, [videoResults]);

  // File type detection, preview, etc
  useEffect(() => {
    if (!visualUrl || !visualFile) {
      setImageDimensions(null);
      setVisualType(null);
      setVideoDuration(null);
      return;
    }
    if (isImageFile(visualFile)) {
      setVisualType("image");
      const img = new window.Image();
      img.onload = () => setImageDimensions({ width: img.width, height: img.height });
      img.onerror = () => setImageDimensions(null);
      img.src = visualUrl;
      setVideoDuration(null);
    } else if (isVideoFile(visualFile)) {
      setVisualType("video");
      getVideoDuration(visualUrl)
        .then((t) => {
          setVideoDuration(t);
          setDuration(t);
        })
        .catch(() => setVideoDuration(null));
      setImageDimensions(null);
    }
  }, [visualUrl, visualFile]);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt || !dt.files) return;
    const files = Array.from(dt.files);
    const file =
      files.find(isImageFile) ||
      files.find(isVideoFile);
    if (file) {
      if (visualUrl) URL.revokeObjectURL(visualUrl);
      setVisualFile(file);
      setVisualUrl(URL.createObjectURL(file));
      setVideoResults([]);
      setMp3File(null);
      setMp3Url(null);
      setMp3Duration(null);
    }
  }
  function handleDragOver(e: DragEvent<HTMLDivElement>) { e.preventDefault(); }
  function handleSelectVisual(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const file =
      Array.from(files).find(isImageFile) ||
      Array.from(files).find(isVideoFile);
    if (file) {
      if (visualUrl) URL.revokeObjectURL(visualUrl);
      setVisualFile(file);
      setVisualUrl(URL.createObjectURL(file));
      setVideoResults([]);
      setMp3File(null);
      setMp3Url(null);
      setMp3Duration(null);
    }
    e.target.value = "";
  }
  function handleSelectMp3(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const mp3 = Array.from(files).find(isMp3File);
    if (mp3) {
      if (mp3Url) URL.revokeObjectURL(mp3Url);
      setMp3File(mp3);
      const mp3U = URL.createObjectURL(mp3);
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
    const input = document.getElementById("visualinput");
    if (input) (input as HTMLInputElement).click();
  }

  // ----------- Video Generation -------------
  async function generateSingleVideo(
    visual: HTMLImageElement | HTMLVideoElement,
    orientation: Orientation,
    inputType: "image" | "video",
    videoDuration?: number,
    mp3Url?: string
  ): Promise<VideoResult> {
    const { width, height } = ORIENTATIONS[orientation];
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available.");

    // For image, draw first frame
    drawMediaFullWidth(ctx, width, height, visual, { settings: textSettings, showText: false });

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

    let finalDuration = 3;

    // For video: take original duration, else use mp3 or manual setting for image
    if (inputType === "video") {
      finalDuration = typeof videoDuration === "number" && !isNaN(videoDuration) ? videoDuration : 3;
    } else if (mp3Url) {
      finalDuration = typeof mp3Duration === "number" && !isNaN(mp3Duration) ? mp3Duration : 3;
    } else {
      finalDuration = duration;
    }

    if (mp3Url && inputType === "image") {
      audioObj = new Audio();
      audioObj.src = mp3Url;
      audioObj.crossOrigin = "anonymous";
      audioObj.preload = "auto";
      audioObj.currentTime = 0;
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audioObj);
      const dest = audioContext.createMediaStreamDestination();
      source.connect(dest);
      try { source.connect(audioContext.destination); } catch { }
      audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) composedStream.addTrack(audioTrack);
    }

    const mimeType = pickSupportedMimeType();
    const recorderOptions: MediaRecorderOptions = mimeType
      ? { mimeType, audioBitsPerSecond: 192_000, videoBitsPerSecond: 6_000_000 }
      : { audioBitsPerSecond: 192_000, videoBitsPerSecond: 6_000_000 };

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(composedStream, recorderOptions);
    } catch {
      throw new Error("Video recording with the chosen settings is not supported in this browser.");
    }

    const CHUNKS: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) CHUNKS.push(e.data);
    };

    let recording = true;
    let currentFrame = 0;
    const textDelayFrames = Math.ceil(FPS * 0.5);

    let vidCurrent = 0;
    let videoTick: number | null = null;

    // For video: draw frames in sync. For image: static.
    function tick() {
      if (!recording) return;

      if (inputType === "video" && visual instanceof HTMLVideoElement) {
        if (
          !isNaN(visual.duration) &&
          visual.duration > 0 &&
          visual.currentTime < visual.duration
        ) {
          try {
            drawMediaFullWidth(ctx, width, height, visual, {
              settings: textSettings,
              showText: currentFrame >= textDelayFrames,
            });
            const nextT = Math.min(
              visual.duration,
              vidCurrent / FPS
            );
            if (Math.abs(visual.currentTime - nextT) > 0.001) {
              visual.currentTime = nextT;
            }
          } catch { }
        }
        vidCurrent++;
      } else {
        drawMediaFullWidth(ctx, width, height, visual, {
          settings: textSettings,
          showText: currentFrame >= textDelayFrames,
        });
      }
      currentFrame++;
    }

    const intervalId = window.setInterval(tick, Math.max(16, Math.round(1000 / FPS)));

    return await new Promise<VideoResult>(async (resolve, reject) => {
      recorder.onstop = async () => {
        try { window.clearInterval(intervalId); } catch { }
        if (videoTick !== null) cancelAnimationFrame(videoTick);
        recording = false;
        try { composedStream.getTracks().forEach((t) => t.stop()); } catch { }
        try { canvasStream.getTracks().forEach((t) => t.stop()); } catch { }
        try { if (audioObj) { audioObj.pause(); audioObj.src = ""; } } catch { }
        try { await audioContext?.close(); } catch { }
        const blob = new Blob(CHUNKS, { type: mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        resolve({ url, blob, orientation });
      };

      try { recorder.start(); } catch {
        window.clearInterval(intervalId);
        return reject(new Error("Failed to start recorder."));
      }

      if (inputType === "video" && visual instanceof HTMLVideoElement) {
        vidCurrent = 0;
        visual.currentTime = 0;

        function onSeeked() {
        }
        visual.addEventListener("seeked", onSeeked);

        setTimeout(async () => {
          try {
            await new Promise((res) => setTimeout(res, finalDuration * 1000));
          } catch { }
          visual.removeEventListener("seeked", onSeeked);
          try { if (recorder.state !== "inactive") recorder.stop(); } catch { }
        }, Math.ceil(finalDuration * 1000));
      } else if (audioObj && audioContext) {
        try { if (audioContext.state === "suspended") { await audioContext.resume(); } } catch { }
        const onEnded = () => {
          audioObj?.removeEventListener("ended", onEnded);
          try { if (recorder.state !== "inactive") recorder.stop(); } catch { }
        };
        audioObj.addEventListener("ended", onEnded);
        try { await audioObj.play(); } catch {
          await new Promise<void>((resolveAudio) => {
            const onCanPlay = () => {
              audioObj?.removeEventListener("canplay", onCanPlay);
              resolveAudio();
            };
            audioObj?.addEventListener("canplay", onCanPlay);
          });
          await audioObj.play().catch(() => { });
        }
      } else {
        window.setTimeout(() => {
          try { if (recorder.state !== "inactive") recorder.stop(); } catch { }
        }, Math.ceil(finalDuration * 1000));
      }
    });
  }

  async function handleGenerateVideo() {
    if (!visualUrl || processing || !visualFile) return;
    if (!(window as any).MediaRecorder) {
      alert("MediaRecorder is not supported in this browser.");
      return;
    }
    setProcessing(true);
    videoResults.forEach((v) => URL.revokeObjectURL(v.url));
    setVideoResults([]);

    let inputType: "image" | "video";
    if (isImageFile(visualFile)) inputType = "image";
    else if (isVideoFile(visualFile)) inputType = "video";
    else return;

    let loadedMedia: HTMLImageElement | HTMLVideoElement;

    try {
      if (inputType === "image") {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = visualUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject("Error loading image");
        });
        loadedMedia = img;
      } else {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.src = visualUrl;
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.currentTime = 0;
            resolve();
          };
          video.onerror = () => reject("Error loading video file.");
        });
        loadedMedia = video;
      }
      // Only generate the selected orientation!
      const res = await generateSingleVideo(
        loadedMedia,
        orientation,
        inputType,
        videoDuration,
        mp3Url
      );
      setVideoResults([res]);
    } catch (err: any) {
      alert(err?.message || "Failed to generate video");
    } finally {
      setProcessing(false);
    }
  }

  // Video preview UI
  const VideoPreview =
    videoResults.length >= 1 && (
      <div
        style={{
          display: "flex",
          gap: 16,
          margin: "0 auto 26px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {videoResults.map((v) => (
          <div key={v.orientation} style={{ textAlign: "center", flex: "1 1 0" }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              {v.orientation === "horizontal"
                ? "Horizontal (1920x1080)"
                : "Vertical (1080x1920)"}
            </div>
            <video
              src={v.url}
              controls
              style={{
                width: v.orientation === "horizontal" ? 320 : 180,
                height: v.orientation === "horizontal" ? 180 : 320,
                background: BLUE_BG,
                borderRadius: 6,
                boxShadow: "0 2px 10px #0002",
                marginBottom: 9,
              }}
            />
            <div>
              <a
                href={v.url}
                download={`video-gen-${v.orientation}.webm`}
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
                ⬇️ Download {v.orientation}
              </a>
            </div>
          </div>
        ))}
      </div>
    );

  function setSetting<K extends keyof TextSettings>(key: K, value: TextSettings[K]) {
    setTextSettings((s) => ({ ...s, [key]: value }));
  }

  // --- UI for all text settings + positioning ---
  const TextSettingsPanel = (
    <details style={{ marginBottom: 14 }} open>
      <summary
        style={{ outline: "none", cursor: "pointer", fontWeight: 600, fontSize: 16 }}
      >
        🛠️ Text Settings (customize overlay &amp; position)
      </summary>
      <div style={{ marginTop: 10, padding: 10, background: "#f6fbfe", borderRadius: 6 }}>
        <div style={{ marginBottom: 10 }}>
          <label>
            Overlay text:
            <input
              type="text"
              value={textSettings.overlayText}
              onChange={(e) => setSetting("overlayText", e.target.value)}
              maxLength={256}
              placeholder="Enter text to overlay"
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
            The above text will appear on video as chosen below.
          </div>
        </div>

        <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: 12 }}>
          <label>
            Position:&nbsp;
            <select
              value={textSettings.position}
              onChange={e => setSetting("position", e.target.value as OverlayPositionMode)}
              style={{ fontSize: 14, borderRadius: 4, padding: "3px 8px" }}
              disabled={processing}
            >
              <option value="bottom">Bottom</option>
              <option value="top">Top</option>
              <option value="middle">Middle</option>
              <option value="custom">Custom (Y%)</option>
            </select>
          </label>
          {textSettings.position === "custom" && (
            <div style={{ marginLeft: 10 }}>
              <label>
                Y offset (% from top):&nbsp;
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={textSettings.positionYPercent}
                  onChange={e =>
                    setSetting("positionYPercent", Number(e.target.value) || 0)
                  }
                  style={{ width: 60, marginLeft: 2, fontSize: 14, borderRadius: 4, padding: "3px 8px" }}
                  disabled={processing}
                />
              </label>
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex", flexWrap: "wrap", gap: 16,
            alignItems: "flex-end"
          }}
        >
          <div>
            <label style={{ fontSize: 14 }}>Font family:&nbsp;
              <select
                value={textSettings.fontFamily}
                onChange={e => setSetting("fontFamily", e.target.value)}
                style={{ fontSize: 14, borderRadius: 4, padding: "3px 8px" }}
                disabled={processing}
              >
                <option value="Inter, Arial, sans-serif">Inter / Arial</option>
                <option value="Arial, sans-serif">Arial (default)</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
              </select>
            </label>
          </div>
          <div>
            <label style={{ fontSize: 14 }}>Weight:&nbsp;
              <select
                value={textSettings.fontWeight}
                onChange={e => setSetting("fontWeight", e.target.value)}
                style={{ fontSize: 14, borderRadius: 4, padding: "3px 8px" }}
                disabled={processing}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="bolder">Bolder</option>
                <option value="lighter">Lighter</option>
              </select>
            </label>
          </div>
          <div>
            <label style={{ fontSize: 14 }}>
              Align:&nbsp;
              <select
                value={textSettings.align}
                onChange={e => setSetting("align", e.target.value as "center" | "left" | "right")}
                style={{ fontSize: 14, borderRadius: 4, padding: "3px 8px" }}
                disabled={processing}
              >
                <option value="center">Center</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>
          <div>
            <label style={{ fontSize: 14 }}>
              Size:&nbsp;
              <input
                type="number"
                min={3}
                max={15}
                step={0.1}
                value={textSettings.fontSizePercent}
                onChange={e => setSetting("fontSizePercent", Number(e.target.value))}
                style={{ width: 55, marginRight: 2, fontSize: 14, borderRadius: 4, padding: "3px 8px" }}
                disabled={processing}
              />%
              <span style={{ fontSize: 12, color: "#999" }}> (of video width)</span>
            </label>
            <div style={{ fontSize: 11, color: "#888" }}>
              Pixel: min
              <input
                type="number"
                min={8}
                max={300}
                step={1}
                value={textSettings.fontMinPx}
                onChange={e => setSetting("fontMinPx", Number(e.target.value))}
                style={{ width: 37, margin: "0 2px", fontSize: 11 }}
                disabled={processing}
              />-max
              <input
                type="number"
                min={10}
                max={400}
                step={1}
                value={textSettings.fontMaxPx}
                onChange={e => setSetting("fontMaxPx", Number(e.target.value))}
                style={{ width: 37, margin: "0 2px", fontSize: 11 }}
                disabled={processing}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 14 }}>Text color:&nbsp;
              <input
                type="color"
                value={textSettings.textColor}
                onChange={e => setSetting("textColor", e.target.value)}
                style={{ border: "none", width: 32, height: 22, verticalAlign: "middle" }}
                disabled={processing}
              />
            </label>
          </div>
          <div>
            <label style={{ fontSize: 14 }}>Box color:&nbsp;
              <input
                type="color"
                value={textSettings.bgColor}
                onChange={e => setSetting("bgColor", e.target.value)}
                style={{ border: "none", width: 32, height: 22, verticalAlign: "middle" }}
                disabled={processing}
              />
            </label>
          </div>
          <div>
            <label style={{ fontSize: 14 }}>
              Box opacity:&nbsp;
              <input
                type="number"
                min={0.1}
                max={1}
                step={0.05}
                value={textSettings.boxOpacity}
                onChange={e => setSetting("boxOpacity", Number(e.target.value))}
                style={{ width: 49, fontSize: 13, borderRadius: 4, padding: "3px 8px" }}
                disabled={processing}
              />
            </label>
          </div>
          <div title="Set corner radius of the background box">
            <label style={{ fontSize: 14 }}>
              Box round:&nbsp;
              <input
                type="number"
                min={0}
                max={80}
                step={1}
                value={textSettings.boxRadius}
                onChange={e => setSetting("boxRadius", Number(e.target.value))}
                style={{ width: 48, fontSize: 13, borderRadius: 4, padding: "3px 8px" }}
                disabled={processing}
              />
            </label>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 9,
            alignItems: "flex-end"
          }}
        >
          <div>
            <label style={{ fontSize: 14 }}>Outline color:&nbsp;
              <input
                type="color"
                value={textSettings.outlineColor}
                onChange={e => setSetting("outlineColor", e.target.value)}
                style={{ border: "none", width: 32, height: 22, verticalAlign: "middle" }}
                disabled={processing}
              />
            </label>
          </div>
          <div>
            <label style={{ fontSize: 14 }}>
              Outline width:&nbsp;
              <input
                type="number"
                min={0}
                max={10}
                step={1}
                value={textSettings.outlineWidth}
                onChange={e => setSetting("outlineWidth", Number(e.target.value))}
                style={{ width: 48, fontSize: 13, borderRadius: 4, padding: "3px 8px" }}
                disabled={processing}
              />
            </label>
            <span style={{ color: "#888", fontSize: 11 }}> px (0 = none)</span>
          </div>
        </div>
      </div>
    </details>
  );

  const visualIsImage = visualType === "image";
  const visualIsVideo = visualType === "video";

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "2rem auto",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "1.7rem",
        borderRadius: 12,
        border: "1px solid #eee",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Image/Video + MP3 to Video Generator</h2>
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
        {visualUrl ? (
          <>
            {visualIsImage ? (
              <img
                src={visualUrl}
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
            ) : visualIsVideo ? (
              <video
                src={visualUrl}
                style={{
                  width: 220,
                  height: 150,
                  borderRadius: 7,
                  background: BLUE_BG,
                  marginBottom: 8,
                  objectFit: 'cover'
                }}
                preload="metadata"
                controls
              />
            ) : null}
            {visualIsImage && imageDimensions ? (
              <div
                style={{
                  color: "#1a8dd8",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                {`Original image: ${imageDimensions.width}x${imageDimensions.height}`}
              </div>
            ) : visualIsVideo && videoDuration ? (
              <div style={{
                color: "#1a8dd8",
                fontSize: 13,
                marginBottom: 8,
              }}>
                {`Video duration: ${formatSeconds(videoDuration)}`}
              </div>
            ) : (
              <div style={{ color: "#888", fontSize: 12 }} />
            )}
          </>
        ) : (
          <span style={{ color: "#666" }}>
            Drag &amp; drop image or video here,<br />
            or click to select file.<br />
            <span style={{ fontSize: 13, color: "#888" }}>
              (Accepts JPEG/PNG/GIF/WEBP and MP4/WEBM/OGG)
            </span>
          </span>
        )}
        <input
          id="visualinput"
          type="file"
          accept={[
            ...ACCEPTED_IMAGE_TYPES,
            ...ACCEPTED_VIDEO_TYPES,
          ].join(",")}
          multiple={false}
          style={{ display: "none" }}
          onChange={handleSelectVisual}
        />
      </div>

      <div style={{ marginBottom: 10, opacity: visualIsVideo ? 0.45 : 1, pointerEvents: visualIsVideo ? "none" : "auto" }}>
        <label>
          <b>Select MP3 file: </b>
          <input
            type="file"
            accept={ACCEPTED_AUDIO_TYPES.join(",")}
            onChange={handleSelectMp3}
            disabled={processing || visualIsVideo}
            style={{ display: "inline", marginLeft: 7 }}
          />
        </label>
        {mp3Url && mp3File && !visualIsVideo && (
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
        {visualIsVideo && (
          <div style={{ color: "#888", fontSize: 13, marginTop: 4 }}>
            MP3 not used if you upload a video.
          </div>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ opacity: mp3Duration || visualIsVideo ? 0.5 : 1 }}>
          Video duration (seconds):{" "}
          <input
            type="number"
            min={1}
            max={600}
            step="any"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={!!mp3Duration || !!videoDuration || processing}
            style={{ width: 80, marginLeft: 6 }}
          />
        </label>
        {!!mp3Duration && !visualIsVideo && (
          <span style={{ fontSize: 13, color: "#1a8dd8", marginLeft: 8 }}>
            (using MP3 duration)
          </span>
        )}
        {!!videoDuration && (
          <span style={{ fontSize: 13, color: "#1a8dd8", marginLeft: 8 }}>
            (using video original duration)
          </span>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontWeight: 600, fontSize: 15, marginRight: 12 }}>
          Choose orientation:
        </span>
        <label style={{ marginRight: 18 }}>
          <input
            type="radio"
            name="orientation"
            checked={orientation === "horizontal"}
            onChange={() => setOrientation("horizontal")}
            disabled={processing}
            style={{ marginRight: 5 }}
          />
          Horizontal (1920x1080)
        </label>
        <label>
          <input
            type="radio"
            name="orientation"
            checked={orientation === "vertical"}
            onChange={() => setOrientation("vertical")}
            disabled={processing}
            style={{ marginRight: 5 }}
          />
          Vertical (1080x1920)
        </label>
      </div>

      {TextSettingsPanel}

      <button
        onClick={handleGenerateVideo}
        disabled={!visualUrl || processing}
        style={{
          marginBottom: 18,
          padding: "0.5rem 1.2rem",
          borderRadius: 6,
          background: !visualUrl || processing ? "#aaa" : "#2196f3",
          color: "#fff",
          border: "none",
          cursor: !visualUrl || processing ? "default" : "pointer",
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {processing
          ? "Generating Video..."
          : `Generate ${orientation === "horizontal" ? "Horizontal" : "Vertical"} Video`}
      </button>

      {videoResults.length >= 1 && (
        <div style={{ marginBottom: 22 }}>
          {VideoPreview}
        </div>
      )}
    </div>
  );
};

export default ImageToVideoGenerator;
