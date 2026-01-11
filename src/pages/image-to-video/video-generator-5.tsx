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

// Types
type TextDisplayOpts = {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  color: string;
  shadow: boolean;
  align: "center" | "left" | "right";
  x: number; // 0..1 (relative)
  y: number; // 0..1 (relative)
  animation: "none" | "fadeIn" | "flyInUp" | "flyInDown";
  fromSec: number; // new: start showing at (inclusive)
  toSec: number; // new: stop showing at (exclusive)
};

type ImageToVideoInput = {
  image: HTMLImageElement;
  durationSec: number;
  texts: TextDisplayOpts[]; // NEW: array of texts
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
async function imageToVideo({ image, durationSec, texts, audioBlob }: ImageToVideoInput): Promise<Blob> {
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
      // Ensure audio context is running (needs user gesture; call from a click handler)
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
    // Time in seconds for this frame
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

    // Render all visible texts
    for (const opts of texts) {
      // Determine visibility for this frame
      if (!opts.text) continue;
      if (opts.fromSec > timeSec || opts.toSec <= timeSec) continue;

      const { text, fontFamily, fontSize, fontWeight, color, shadow, align, x, y, animation } = opts;

      // Animation: only apply within first 0.6s of start for this text
      let opacity = 1;
      let tx = x * VIDEO_WIDTH;
      let ty = y * VIDEO_HEIGHT;
      const animFrames = Math.floor(0.6 * FPS);
      const localFrameIdx = Math.floor((timeSec - opts.fromSec) * FPS);

      if (animation === "fadeIn" && localFrameIdx < animFrames && localFrameIdx >= 0) {
        opacity = Math.max(0, Math.min(1, localFrameIdx / animFrames));
      }
      if (animation === "flyInUp" && localFrameIdx < animFrames && localFrameIdx >= 0) {
        ty = y * VIDEO_HEIGHT + (1 - localFrameIdx / animFrames) * 100;
      }
      if (animation === "flyInDown" && localFrameIdx < animFrames && localFrameIdx >= 0) {
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
      ctx.fillText(text, tx, ty);
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
        // Cleanup audio
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

// ---- Default TextDisplayOpts ----
const defaultTextOpts: Omit<TextDisplayOpts, "fromSec" | "toSec"> = {
  text: "",
  fontFamily: "system-ui",
  fontSize: 80,
  fontWeight: "bold",
  color: "#ffffff",
  shadow: true,
  align: "center",
  x: 0.5,
  y: 0.1,
  animation: "none",
};

function getTextDefaults(duration: number, idx: number): TextDisplayOpts {
  // Evenly space each text in time, e.g. if 3 texts, 0-33%, 33-66%, 66-99%
  const each = duration / 3;
  return {
    ...defaultTextOpts,
    fromSec: each * idx,
    toSec: idx === 2 ? duration : each * (idx + 1), // last text covers to end
    y: 0.1 + idx * 0.18,
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

  // 3 text overlays
  const [texts, setTexts] = useState<TextDisplayOpts[]>(() => [
    getTextDefaults(duration, 0),
    getTextDefaults(duration, 1),
    getTextDefaults(duration, 2),
  ]);
  // When duration changes, recalculate default time slots for unused text overlays
  React.useEffect(() => {
    setTexts((ts) =>
      ts.map((t, i) => ({
        ...t,
        fromSec: Math.min(duration - 1, Math.max(0, (i * duration) / 3)),
        toSec: Math.min(duration, i === 2 ? duration : ((i + 1) * duration) / 3),
      }))
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
            texts: texts,
            audioBlob: audioFile ?? undefined,
          });
          setVideoBlob(blob);
          const url = updateBlobUrl(setVideoUrl, "", blob);
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

  // Text option updaters per index
  function handleTextField<K extends keyof TextDisplayOpts>(idx: number, k: K, v: TextDisplayOpts[K]) {
    setTexts((ts) => {
      const next = [...ts];
      next[idx] = { ...next[idx], [k]: v };
      // Clamp
      if ((k === "fromSec" || k === "toSec") && typeof v === "number") {
        if (next[idx].fromSec < 0) next[idx].fromSec = 0;
        if (next[idx].toSec > duration) next[idx].toSec = duration;
        if (next[idx].fromSec > next[idx].toSec - 0.1) {
          // min 0.1s duration
          if (k === "fromSec") next[idx].fromSec = Math.max(0, next[idx].toSec - 0.1);
          else next[idx].toSec = Math.min(duration, next[idx].fromSec + 0.1);
        }
      }
      return next;
    });
  }
  function handleTextPositionChange(idx: number, e: ChangeEvent<HTMLInputElement>, axis: "x" | "y") {
    let val = Math.max(0, Math.min(1, Number(e.target.value)));
    handleTextField(idx, axis, val as any);
  }
  function handleAlignChange(idx: number, e: ChangeEvent<HTMLSelectElement>) {
    handleTextField(idx, "align", e.target.value as "center" | "left" | "right");
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
    setTexts([getTextDefaults(5, 0), getTextDefaults(5, 1), getTextDefaults(5, 2)]);
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
        <span style={{ fontSize: 18 }}>(1080x1920, text overlay)</span>
      </h1>
      <div
        style={{
          background: "#fff",
          margin: "0 auto",
          maxWidth: 480,
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
                width: 70,
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
        {/* Text options - 3 overlays */}
        <div style={{ marginTop: 24 }}>
          <fieldset
            style={{
              border: "1px solid #B3E0FC",
              borderRadius: 7,
              padding: 12,
              margin: 0,
            }}
          >
            <legend
              style={{
                fontWeight: "bold",
                color: "#2196F3",
                fontSize: 15,
              }}
            >
              Text Overlays (up to 3)
            </legend>
            {texts.map((opts, idx) => (
              <div
                key={idx}
                style={{
                  borderTop: idx ? "1px solid #d6f1fc" : "none",
                  marginTop: idx ? 18 : 0,
                  paddingTop: idx ? 18 : 0,
                }}
              >
                <div style={{ fontWeight: 500, color: "#0d4776", marginBottom: 7, fontSize: 16 }}>Text {idx + 1}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 15 }}>
                  <input
                    value={opts.text}
                    onChange={(e) => handleTextField(idx, "text", e.target.value)}
                    placeholder={`Text to show on video${idx === 0 ? "" : " (optional)"}`}
                    style={{
                      width: "100%",
                      padding: 6,
                      border: "1px solid #aaa",
                      borderRadius: 5,
                      fontSize: 16,
                    }}
                    spellCheck
                    maxLength={200}
                    autoComplete="off"
                    disabled={processing}
                  />
                  <div>
                    <label>
                      Font&nbsp;
                      <select
                        value={opts.fontFamily}
                        style={{ fontSize: 15, padding: "3px 7px" }}
                        onChange={(e) => handleTextField(idx, "fontFamily", e.target.value)}
                      >
                        {FONT_FAMILIES.map((f) => (
                          <option value={f} key={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </label>
                    &nbsp;&nbsp;
                    <label>
                      Size&nbsp;
                      <input
                        type="number"
                        min={20}
                        max={200}
                        value={opts.fontSize}
                        onChange={(e) => handleTextField(idx, "fontSize", Number(e.target.value))}
                        style={{ width: 55 }}
                      />{" "}
                      px
                    </label>
                    &nbsp;&nbsp;
                    <label>
                      <input
                        type="checkbox"
                        checked={opts.fontWeight === "bold"}
                        onChange={(e) => handleTextField(idx, "fontWeight", e.target.checked ? "bold" : "normal")}
                      />{" "}
                      Bold
                    </label>
                    &nbsp;&nbsp;
                    <label>
                      <input
                        type="checkbox"
                        checked={!!opts.shadow}
                        onChange={(e) => handleTextField(idx, "shadow", e.target.checked)}
                      />{" "}
                      Shadow
                    </label>
                  </div>
                  <div>
                    <label>
                      Color&nbsp;
                      <input
                        type="color"
                        value={opts.color}
                        onChange={(e) => handleTextField(idx, "color", e.target.value)}
                      />
                    </label>
                    &nbsp;&nbsp;
                    <label>
                      Align&nbsp;
                      <select value={opts.align} onChange={(e) => handleAlignChange(idx, e)}>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                    &nbsp;&nbsp;
                    <label>
                      Animation&nbsp;
                      <select
                        value={opts.animation}
                        onChange={(e) =>
                          handleTextField(idx, "animation", e.target.value as TextDisplayOpts["animation"])
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
                  <div>
                    <label>
                      X (&nbsp;
                      <input
                        style={{ width: 48 }}
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={opts.x}
                        onChange={(e) => handleTextPositionChange(idx, e, "x")}
                      />
                      &nbsp;0=left, 0.5=center, 1=right)
                    </label>
                    &nbsp;&nbsp;
                    <label>
                      Y (&nbsp;
                      <input
                        style={{ width: 48 }}
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={opts.y}
                        onChange={(e) => handleTextPositionChange(idx, e, "y")}
                      />
                      &nbsp;0=top, 1=bottom)
                    </label>
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <label>
                      Show from&nbsp;
                      <input
                        type="number"
                        min={0}
                        max={opts.toSec - 0.1}
                        step={0.01}
                        value={opts.fromSec}
                        disabled={processing}
                        onChange={(e) => handleTextField(idx, "fromSec", Number(e.target.value))}
                        style={{ width: 65 }}
                      />
                      &nbsp;s
                    </label>
                    &nbsp;&ndash;&nbsp;
                    <label>
                      to&nbsp;
                      <input
                        type="number"
                        min={opts.fromSec + 0.1}
                        max={duration}
                        step={0.01}
                        value={opts.toSec}
                        disabled={processing}
                        onChange={(e) => handleTextField(idx, "toSec", Number(e.target.value))}
                        style={{ width: 65 }}
                      />
                      &nbsp;s
                    </label>
                    <span style={{ color: "#999", fontSize: 13, marginLeft: 4 }}>
                      {(opts.toSec - opts.fromSec).toFixed(2)}s
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </fieldset>
        </div>
        {/* Generate */}
        <button
          style={{
            marginTop: 28,
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
      <div style={{ maxWidth: 480, margin: "28px auto", fontSize: 14, color: "#555", textAlign: "center" }}>
        <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
          <li>- Drag image (png/jpg/webp etc) or .MP3 here</li>
          <li>- Outputs vertical HD video (1080x1920, blue background)</li>
          <li>- 3 text overlays: set time, style, position, animation.</li>
          <li>- Download easily! Plays with TikTok/Shorts/Reels</li>
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
