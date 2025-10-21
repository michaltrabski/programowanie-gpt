import React, { useRef, useState, type ChangeEvent, type DragEvent } from "react";

// VIDEO LAYOUT CONSTANTS
const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const VIDEO_BG_COLOR = "#2196F3";

// Font/text/animation options
const FONT_FAMILIES = ["system-ui", "Arial", "Georgia", "Comic Sans MS", "Courier New", "Impact", "Times New Roman"];
const TEXT_ANIMATIONS = [
  { label: "None", value: "none" },
  { label: "Fade In", value: "fadeIn" },
  { label: "Fly In (bottom)", value: "flyInUp" },
  { label: "Fly In (top)", value: "flyInDown" },
];

type GlobalTextStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  color: string;
  shadow: boolean;
  align: "center" | "left" | "right";
  x: number; // 0..1 (relative)
  y: number; // 0..1 (relative)
};

type TextOverlay = {
  id: string;
  text: string;
  animation: "none" | "fadeIn" | "flyInUp" | "flyInDown";
  fromSec: number; // start showing at (inclusive)
  toSec: number; // stop showing at (exclusive)
};

type ImageToVideoInput = {
  image: HTMLImageElement;
  durationSec: number;
  texts: TextOverlay[];
  textStyle: GlobalTextStyle; // shared style/position for all overlays
  audioBlob?: Blob; // optional MP3
};

// ---- Utility to pick MediaRecorder mime
function pickSupportedMime(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const m of candidates) {
    if ((window as any).MediaRecorder?.isTypeSupported?.(m)) return m;
  }
  return undefined;
}

// ---- Utility to get audio duration (async)
function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const dur = isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(audioUrl);
      if (dur > 0) resolve(dur);
      else reject(new Error("Could not read MP3 duration."));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      reject(new Error("Failed to load audio file."));
    };
  });
}

// ---- Main video render logic (single-pass mux with MP3 via WebAudio) ----
async function imageToVideo({ image, durationSec, texts, textStyle, audioBlob }: ImageToVideoInput): Promise<Blob> {
  if (!(window as any).MediaRecorder) {
    throw new Error("MediaRecorder is not supported in this browser.");
  }

  const mimeType = pickSupportedMime();
  if (!mimeType) {
    throw new Error("No supported MediaRecorder mime type found for WebM.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available.");

  const FPS = 30;
  const totalFrames = Math.max(1, Math.ceil(durationSec * FPS));

  // Capture canvas video frames
  const stream: MediaStream = canvas.captureStream(FPS);

  // If audio provided, add audio track to the same stream using WebAudio
  let audioCtx: AudioContext | null = null;
  let audioSource: AudioBufferSourceNode | null = null;
  try {
    if (audioBlob) {
      const ACtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      audioCtx = new ACtx();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume().catch(() => {});
      }
      const data = await audioBlob.arrayBuffer();
      const audioBuf = await new Promise<AudioBuffer>((resolve, reject) => {
        if ((audioCtx as any).decodeAudioData.length === 2) {
          (audioCtx as any).decodeAudioData(
            data.slice(0),
            (ab: AudioBuffer) => resolve(ab),
            (err: any) => reject(err || new Error("decodeAudioData failed"))
          );
        } else {
          audioCtx!.decodeAudioData(data.slice(0)).then(resolve, reject);
        }
      });

      const dest = audioCtx.createMediaStreamDestination();
      audioSource = audioCtx.createBufferSource();
      audioSource.buffer = audioBuf;
      audioSource.connect(dest);

      const tracks = dest.stream.getAudioTracks();
      if (tracks[0]) {
        stream.addTrack(tracks[0]);
      } else {
        console.warn("No audio track created from MP3; proceeding with silent video.");
      }
    }
  } catch (err) {
    console.warn("Audio attach failed, proceeding with silent video:", err);
    audioSource = null;
    if (audioCtx) {
      try {
        await audioCtx.close();
      } catch {}
      audioCtx = null;
    }
  }

  // Prepare drawing
  function drawFrame(frameIdx: number) {
    const timeSec = frameIdx / FPS;
    // Background
    ctx.fillStyle = VIDEO_BG_COLOR;
    ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

    // Fit image in canvas keeping aspect ratio (letterbox)
    const imageAspect = image.width / image.height;
    const canvasAspect = VIDEO_WIDTH / VIDEO_HEIGHT;
    let drawW = VIDEO_WIDTH,
      drawH = VIDEO_HEIGHT;
    let dx = 0,
      dy = 0;
    if (imageAspect > canvasAspect) {
      drawW = VIDEO_WIDTH;
      drawH = VIDEO_WIDTH / imageAspect;
      dy = (VIDEO_HEIGHT - drawH) / 2;
    } else {
      drawH = VIDEO_HEIGHT;
      drawW = VIDEO_HEIGHT * imageAspect;
      dx = (VIDEO_WIDTH - drawW) / 2;
    }
    ctx.drawImage(image, dx, dy, drawW, drawH);

    // Shared text style/position
    const { fontFamily, fontSize, fontWeight, color, shadow, align, x, y } = textStyle;

    // Render all visible texts
    for (const opts of texts) {
      if (!opts.text) continue;
      if (opts.fromSec > timeSec || opts.toSec <= timeSec) continue;

      // Animation: only apply within first 0.6s of start for this text
      let opacity = 1;
      let tx = x * VIDEO_WIDTH;
      let ty = y * VIDEO_HEIGHT;
      const animFrames = Math.floor(0.6 * FPS);
      const localFrameIdx = Math.floor((timeSec - opts.fromSec) * FPS);

      if (opts.animation === "fadeIn" && localFrameIdx < animFrames && localFrameIdx >= 0) {
        opacity = Math.max(0, Math.min(1, localFrameIdx / animFrames));
      }
      if (opts.animation === "flyInUp" && localFrameIdx < animFrames && localFrameIdx >= 0) {
        ty = y * VIDEO_HEIGHT + (1 - localFrameIdx / animFrames) * 100;
      }
      if (opts.animation === "flyInDown" && localFrameIdx < animFrames && localFrameIdx >= 0) {
        ty = y * VIDEO_HEIGHT - (1 - localFrameIdx / animFrames) * 100;
      }

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = align;
      ctx.textBaseline = "top";
      if (shadow) {
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }
      ctx.fillStyle = color;
      ctx.fillText(opts.text, tx, ty);
      ctx.restore();
    }
  }

  // Record
  const recordedChunks: Blob[] = [];
  const mediaRecorder = new MediaRecorder(stream, { mimeType });

  const completion = new Promise<Blob>((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data?.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onerror = (e) => {
      reject(new Error("MediaRecorder error: " + (e as any).error?.message || "unknown"));
    };
    mediaRecorder.onstop = async () => {
      try {
        if (audioSource) {
          try {
            audioSource.stop(0);
          } catch {}
        }
        if (audioCtx) {
          try {
            await audioCtx.close();
          } catch {}
        }
      } finally {
        resolve(new Blob(recordedChunks, { type: mimeType.includes("webm") ? "video/webm" : mimeType }));
      }
    };
  });

  mediaRecorder.start();

  // Start audio playback exactly when we start recording
  if (audioSource && audioCtx) {
    try {
      if (audioCtx.state === "suspended") await audioCtx.resume();
      audioSource.start(0);
    } catch (e) {
      console.warn("Audio start failed, continuing without audio:", e);
    }
  }

  // Drive frames at FPS
  let currentFrame = 0;
  function loop() {
    if (currentFrame >= totalFrames) {
      try {
        mediaRecorder.stop();
      } catch {}
      return;
    }
    drawFrame(currentFrame);
    currentFrame++;
    setTimeout(loop, 1000 / FPS);
  }
  loop();

  return completion;
}

// ---- Defaults ----
const defaultTextStyle: GlobalTextStyle = {
  fontFamily: "system-ui",
  fontSize: 80,
  fontWeight: "bold",
  color: "#ffffff",
  shadow: true,
  align: "center",
  x: 0.5,
  y: 0.15,
};

function makeTextOverlay(duration: number, idx: number, total: number): TextOverlay {
  const each = duration / Math.max(1, total);
  const from = Math.max(0, Math.min(duration - 0.1, each * idx));
  const to = Math.max(from + 0.1, Math.min(duration, each * (idx + 1)));
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    text: "",
    animation: "none",
    fromSec: Number(from.toFixed(2)),
    toSec: Number(to.toFixed(2)),
  };
}

export default function App() {
  // Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");

  // MP3
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  // Video
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");

  // Controls
  const [duration, setDuration] = useState<number>(5);
  const [useAudioDuration, setUseAudioDuration] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Shared text style and position (all texts will appear at this position)
  const [textStyle, setTextStyle] = useState<GlobalTextStyle>({ ...defaultTextStyle });

  // Dynamic text overlays
  const [texts, setTexts] = useState<TextOverlay[]>(() => [makeTextOverlay(5, 0, 1)]);

  // When duration changes, clamp each overlay interval to [0, duration]
  React.useEffect(() => {
    setTexts((prev) =>
      prev.map((t) => {
        let from = Math.max(0, Math.min(duration - 0.1, t.fromSec));
        let to = Math.max(from + 0.1, Math.min(duration, t.toSec));
        return { ...t, fromSec: Number(from.toFixed(2)), toSec: Number(to.toFixed(2)) };
      })
    );
    // eslint-disable-next-line
  }, [duration]);

  // Refs
  const inputImageRef = useRef<HTMLInputElement>(null);
  const inputAudioRef = useRef<HTMLInputElement>(null);

  // Utility to safely set object URLs and revoke previous ones
  function updateBlobUrl(setter: (s: string) => void, prevUrl: string, blob: Blob) {
    try {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
    } catch {}
    const url = URL.createObjectURL(blob);
    setter(url);
    return url;
  }

  // Image
  function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select or drop a valid image file.");
      return;
    }
    setError("");
    setImageFile(file);
    if (imageUrl) {
      try {
        URL.revokeObjectURL(imageUrl);
      } catch {}
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    // Reset result
    setVideoBlob(null);
    if (videoUrl) {
      try {
        URL.revokeObjectURL(videoUrl);
      } catch {}
      setVideoUrl("");
    }
  }

  // Audio
  async function handleAudioFile(file: File) {
    const isMp3 = /audio\/mpeg|audio\/mp3|audio\/mpeg3/i.test(file.type) || /\.mp3$/i.test(file.name);
    if (!isMp3) {
      setError("Please select or drop a valid MP3 file.");
      return;
    }
    setError("");
    setAudioFile(file);
    if (audioUrl) {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch {}
    }
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setVideoBlob(null);
    if (videoUrl) {
      try {
        URL.revokeObjectURL(videoUrl);
      } catch {}
      setVideoUrl("");
    }
    try {
      const dur = await getAudioDuration(file);
      setAudioDuration(dur);
      setUseAudioDuration(true);
      setDuration(Math.max(1, Math.round(dur)));
    } catch {
      setAudioDuration(null);
    }
  }

  // Dropzone
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setError("");
    const dt = e.dataTransfer;
    if (!dt?.files || dt.files.length === 0) return;
    const files = Array.from(dt.files);
    const img = files.find((f) => f.type.startsWith("image/"));
    const mp3 = files.find((f) => /audio\/mpeg|audio\/mp3|audio\/mpeg3/i.test(f.type) || /\.mp3$/i.test(f.name));
    if (img) handleImageFile(img);
    if (mp3) handleAudioFile(mp3);
    if (!img && !mp3) setError("Only image and MP3 files accepted.");
  }

  // File picks
  function handleBrowseImage(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
      e.currentTarget.value = "";
    }
  }
  function handleBrowseAudio(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleAudioFile(e.target.files[0]);
      e.currentTarget.value = "";
    }
  }

  function handleRemoveAudio() {
    setAudioFile(null);
    if (audioUrl) {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch {}
    }
    setAudioUrl("");
    setAudioDuration(null);
    setUseAudioDuration(false);
  }

  function handleDurationChange(e: ChangeEvent<HTMLInputElement>) {
    let val = Math.max(1, Math.min(600, Number(e.target.value)));
    setDuration(val);
    setUseAudioDuration(false);
  }

  async function handleGenerateVideo() {
    if (!imageFile) {
      setError("Please add an image first.");
      return;
    }
    if (texts.length === 0 || !texts.some((t) => t.text.trim())) {
      setError("Please add at least one text overlay with content.");
      return;
    }
    setProcessing(true);
    setError("");
    setVideoBlob(null);
    if (videoUrl) {
      try {
        URL.revokeObjectURL(videoUrl);
      } catch {}
      setVideoUrl("");
    }

    try {
      const img = new window.Image();
      img.onload = async () => {
        try {
          const blob = await imageToVideo({
            image: img,
            durationSec: duration,
            texts: texts.map((t) => ({ ...t, text: t.text.trim() })),
            textStyle,
            audioBlob: audioFile ?? undefined,
          });
          setVideoBlob(blob);
          updateBlobUrl(setVideoUrl, "", blob);
          setProcessing(false);
        } catch (err: any) {
          setError("Failed to generate video: " + (err?.message || "Error"));
          setProcessing(false);
        }
      };
      img.onerror = () => {
        setError("Failed to load image.");
        setProcessing(false);
      };
      img.src = imageUrl;
    } catch (err: any) {
      setError("Unexpected error: " + (err?.message || "Error"));
      setProcessing(false);
    }
  }

  // Text overlay helpers
  function clampOverlay(t: TextOverlay, newDuration = duration): TextOverlay {
    let from = Math.max(0, Math.min(newDuration - 0.1, t.fromSec));
    let to = Math.max(from + 0.1, Math.min(newDuration, t.toSec));
    return { ...t, fromSec: Number(from.toFixed(2)), toSec: Number(to.toFixed(2)) };
  }

  function addTextOverlay() {
    setTexts((prev) => {
      const next = [...prev];
      const idx = next.length;
      // Default: try to place after the last overlay, or distribute a small chunk
      let from = 0;
      if (next.length) {
        const last = next[next.length - 1];
        from = Math.min(duration - 0.1, Number((last.toSec + 0.1).toFixed(2)));
      }
      const defaultLen = Math.max(0.5, Math.min(3, duration / Math.max(3, next.length + 1)));
      let to = Math.min(duration, from + defaultLen);
      const overlay: TextOverlay = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text: "",
        animation: "none",
        fromSec: Number(from.toFixed(2)),
        toSec: Number(to.toFixed(2)),
      };
      next.push(clampOverlay(overlay));
      return next;
    });
  }

  function removeTextOverlay(id: string) {
    setTexts((prev) => prev.filter((t) => t.id !== id));
  }

  function updateTextOverlay<K extends keyof TextOverlay>(id: string, key: K, value: TextOverlay[K]) {
    setTexts((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, [key]: value } as TextOverlay;
        if (key === "fromSec" || key === "toSec") return clampOverlay(updated);
        return updated;
      })
    );
  }

  function moveOverlay(id: string, dir: -1 | 1) {
    setTexts((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      return arr;
    });
  }

  function onChangeUseAudio(e: ChangeEvent<HTMLInputElement>) {
    if (audioDuration) {
      setDuration(Math.max(1, Math.round(audioDuration)));
      setUseAudioDuration(e.target.checked);
    }
  }

  function handleReset() {
    setImageFile(null);
    if (imageUrl) {
      try {
        URL.revokeObjectURL(imageUrl);
      } catch {}
    }
    setImageUrl("");
    if (audioUrl) {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch {}
    }
    setAudioFile(null);
    setAudioUrl("");
    setAudioDuration(null);
    setUseAudioDuration(false);
    if (videoUrl) {
      try {
        URL.revokeObjectURL(videoUrl);
      } catch {}
    }
    setVideoBlob(null);
    setVideoUrl("");
    setError("");
    setDuration(5);
    setTextStyle({ ...defaultTextStyle });
    setTexts([makeTextOverlay(5, 0, 1)]);
  }

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
      <h1 style={{ textAlign: "center", margin: 24, fontSize: 32 }}>
        Image <span style={{ color: "#2196F3" }}>+</span> Audio to Video{" "}
        <span style={{ fontSize: 18 }}>(1080x1920, timed text)</span>
      </h1>
      <div
        style={{
          background: "#fff",
          margin: "0 auto",
          maxWidth: 520,
          borderRadius: 13,
          padding: 26,
          boxShadow: "0 2px 16px 0 #0001",
        }}
      >
        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            border: "2px dashed #2196F3",
            padding: 26,
            borderRadius: 11,
            textAlign: "center",
            cursor: "pointer",
            background: "#E3F2FD",
          }}
          onClick={() => inputImageRef.current?.click()}
          tabIndex={0}
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
              <div style={{ fontSize: 40, marginBottom: 10 }}>📷🎵</div>
              <div>
                Drag & drop <strong>image</strong> or <strong>MP3</strong> file here,
                <br />
                or click to browse image.
              </div>
            </>
          )}
          {/* Hidden image input */}
          <input
            style={{ display: "none" }}
            type="file"
            accept="image/*"
            ref={inputImageRef}
            onChange={handleBrowseImage}
          />
        </div>
        {/* MP3 Picker */}
        <div style={{ margin: "16px 0" }}>
          {audioFile ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 16,
                background: "#f0f7fa",
                padding: "6px 10px",
                borderRadius: 7,
              }}
            >
              <span role="img" aria-label="music">
                🎵
              </span>
              <span style={{ flexGrow: 1 }}>
                {audioFile.name}
                {audioDuration && <> ({audioDuration.toFixed(1)}s)</>}
              </span>
              <button
                onClick={handleRemoveAudio}
                style={{
                  border: 0,
                  background: "none",
                  color: "#c62828",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: 17,
                  padding: 0,
                }}
              >
                ✖
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", fontSize: 15 }}>
              <button
                onClick={() => inputAudioRef.current?.click()}
                style={{
                  background: "#2196F3",
                  color: "#fff",
                  border: "none",
                  padding: "7px 18px",
                  borderRadius: 7,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                + Add MP3
              </button>
              <input
                style={{ display: "none" }}
                type="file"
                accept="audio/mp3,audio/mpeg"
                ref={inputAudioRef}
                onChange={handleBrowseAudio}
              />
            </div>
          )}
        </div>
        {/* Duration */}
        <div style={{ marginTop: 16, fontSize: 15 }}>
          <label>
            <span>Video duration (seconds)</span>
            &nbsp;
            <input
              type="number"
              min={1}
              max={600}
              step={1}
              value={duration}
              disabled={processing || (audioDuration && useAudioDuration)}
              style={{
                width: 80,
                fontSize: 15,
                padding: "2px 7px",
                marginRight: 7,
              }}
              onChange={handleDurationChange}
            />
          </label>
          {audioDuration && (
            <label title="Force duration to match MP3">
              <input
                type="checkbox"
                checked={!!useAudioDuration}
                disabled={processing}
                onChange={onChangeUseAudio}
                style={{ marginLeft: 7, marginRight: 3 }}
              />{" "}
              use MP3 duration ({audioDuration.toFixed(1)}s)
            </label>
          )}
        </div>

        {/* Global text style and position (shared for all texts) */}
        <div style={{ marginTop: 20 }}>
          <fieldset
            style={{
              border: "1px solid #CDE9FF",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <legend style={{ fontWeight: "bold", color: "#1976D2", fontSize: 15 }}>Shared Text Style & Position</legend>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <label>
                Font&nbsp;
                <select
                  value={textStyle.fontFamily}
                  style={{ fontSize: 15, padding: "3px 7px" }}
                  onChange={(e) => setTextStyle((s) => ({ ...s, fontFamily: e.target.value }))}
                >
                  {FONT_FAMILIES.map((f) => (
                    <option value={f} key={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Size&nbsp;
                <input
                  type="number"
                  min={16}
                  max={220}
                  value={textStyle.fontSize}
                  onChange={(e) => setTextStyle((s) => ({ ...s, fontSize: Number(e.target.value) }))}
                  style={{ width: 60 }}
                />{" "}
                px
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={textStyle.fontWeight === "bold"}
                  onChange={(e) => setTextStyle((s) => ({ ...s, fontWeight: e.target.checked ? "bold" : "normal" }))}
                />{" "}
                Bold
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={textStyle.shadow}
                  onChange={(e) => setTextStyle((s) => ({ ...s, shadow: e.target.checked }))}
                />{" "}
                Shadow
              </label>
              <label>
                Color&nbsp;
                <input
                  type="color"
                  value={textStyle.color}
                  onChange={(e) => setTextStyle((s) => ({ ...s, color: e.target.value }))}
                />
              </label>
              <label>
                Align&nbsp;
                <select
                  value={textStyle.align}
                  onChange={(e) => setTextStyle((s) => ({ ...s, align: e.target.value as GlobalTextStyle["align"] }))}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label title="Horizontal position">
                X (&nbsp;
                <input
                  style={{ width: 60 }}
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={textStyle.x}
                  onChange={(e) => setTextStyle((s) => ({ ...s, x: Math.max(0, Math.min(1, Number(e.target.value))) }))}
                />
                &nbsp;0=left, 0.5=center, 1=right)
              </label>
              <label title="Vertical position">
                Y (&nbsp;
                <input
                  style={{ width: 60 }}
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={textStyle.y}
                  onChange={(e) => setTextStyle((s) => ({ ...s, y: Math.max(0, Math.min(1, Number(e.target.value))) }))}
                />
                &nbsp;0=top, 1=bottom)
              </label>
              <span style={{ color: "#6B778C", fontSize: 13 }}>All texts will appear at the same position.</span>
            </div>
          </fieldset>
        </div>

        {/* Text overlays - dynamic list */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: "bold", color: "#0d4776" }}>Text Overlays ({texts.length})</div>
            <button
              onClick={addTextOverlay}
              disabled={processing}
              style={{
                background: "#2196F3",
                color: "#fff",
                border: "none",
                padding: "7px 12px",
                borderRadius: 6,
                fontSize: 14,
                cursor: "pointer",
              }}
              title="Add a new text overlay"
            >
              + Add text
            </button>
          </div>

          {texts.length === 0 && (
            <div
              style={{
                background: "#F8FBFF",
                border: "1px dashed #B3E0FC",
                padding: 12,
                borderRadius: 8,
                color: "#4C6A88",
                fontSize: 14,
              }}
            >
              No overlays yet. Click "Add text" to create one.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {texts.map((t, idx) => (
              <div
                key={t.id}
                style={{
                  border: "1px solid #D9ECFF",
                  background: "#F9FCFF",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}
                >
                  <div style={{ fontWeight: 600, color: "#115293" }}>Text #{idx + 1}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => moveOverlay(t.id, -1)}
                      disabled={processing || idx === 0}
                      title="Move up"
                      style={{
                        border: "none",
                        background: "#E3F2FD",
                        color: "#1565C0",
                        padding: "4px 8px",
                        borderRadius: 6,
                        cursor: idx === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveOverlay(t.id, 1)}
                      disabled={processing || idx === texts.length - 1}
                      title="Move down"
                      style={{
                        border: "none",
                        background: "#E3F2FD",
                        color: "#1565C0",
                        padding: "4px 8px",
                        borderRadius: 6,
                        cursor: idx === texts.length - 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeTextOverlay(t.id)}
                      disabled={processing}
                      title="Remove"
                      style={{
                        border: "none",
                        background: "#FFEBEE",
                        color: "#C62828",
                        padding: "4px 8px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    value={t.text}
                    onChange={(e) => updateTextOverlay(t.id, "text", e.target.value)}
                    placeholder="Text to show on video"
                    style={{
                      width: "100%",
                      padding: 8,
                      border: "1px solid #B0BEC5",
                      borderRadius: 7,
                      fontSize: 16,
                      background: "#fff",
                    }}
                    spellCheck
                    maxLength={200}
                    autoComplete="off"
                    disabled={processing}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
                    <label>
                      Show from&nbsp;
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, t.toSec - 0.1)}
                        step={0.01}
                        value={t.fromSec}
                        disabled={processing}
                        onChange={(e) => updateTextOverlay(t.id, "fromSec", Number(e.target.value))}
                        style={{ width: 75 }}
                      />
                      &nbsp;s
                    </label>
                    <label>
                      to&nbsp;
                      <input
                        type="number"
                        min={Math.min(duration, t.fromSec + 0.1)}
                        max={duration}
                        step={0.01}
                        value={t.toSec}
                        disabled={processing}
                        onChange={(e) => updateTextOverlay(t.id, "toSec", Number(e.target.value))}
                        style={{ width: 75 }}
                      />
                      &nbsp;s
                    </label>
                    <span style={{ color: "#6B778C", fontSize: 13 }}>{(t.toSec - t.fromSec).toFixed(2)}s</span>
                    <label>
                      Animation&nbsp;
                      <select
                        value={t.animation}
                        onChange={(e) =>
                          updateTextOverlay(t.id, "animation", e.target.value as TextOverlay["animation"])
                        }
                      >
                        {TEXT_ANIMATIONS.map((a) => (
                          <option key={a.value} value={a.value}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generate */}
        <button
          style={{
            marginTop: 24,
            width: "100%",
            fontSize: 19,
            padding: "12px 0",
            background: "#1565C0",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: processing || !imageFile ? "not-allowed" : "pointer",
            opacity: processing || !imageFile ? 0.55 : 1,
            fontWeight: 500,
            marginBottom: 4,
          }}
          onClick={handleGenerateVideo}
          disabled={!imageFile || processing}
        >
          {processing ? "Generating Video..." : "Generate Video"}
        </button>
        <button
          style={{
            width: "100%",
            fontSize: 15,
            padding: "6px 0",
            background: "#eee",
            color: "#333",
            border: "none",
            borderRadius: 7,
            cursor: "pointer",
            marginTop: 3,
            marginBottom: 8,
          }}
          onClick={handleReset}
          disabled={processing}
        >
          Reset
        </button>
        {error && (
          <div
            style={{
              color: "#d32f2f",
              marginTop: 11,
              background: "#FFF3F3",
              padding: 10,
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}
        {/* RESULT */}
        {videoBlob && videoUrl && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
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
                src={videoUrl}
              />
            </div>
            <a
              href={videoUrl}
              download="video.webm"
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
              Format: webm (VP8/VP9 + Opus)
              <br />
              {audioFile ? (
                <span style={{ color: "#333" }}>With audio</span>
              ) : (
                <span style={{ color: "#aaa" }}>No audio</span>
              )}
            </div>
          </div>
        )}
      </div>
      <div style={{ maxWidth: 520, margin: "24px auto", fontSize: 14, color: "#555", textAlign: "center" }}>
        <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
          <li>- Drag image (png/jpg/webp etc) or .MP3 here</li>
          <li>- Outputs vertical HD video (1080x1920, blue background)</li>
          <li>- Add unlimited text overlays. Each shows only within its time range.</li>
          <li>- All texts share the same position for consistent layout.</li>
        </ul>
        <div style={{ marginTop: 24, fontSize: 12, color: "#888" }}>
          * Video/audio processing and download is 100% in your browser.
          <br />
          No uploads, no external servers.
        </div>
      </div>
    </div>
  );
}
