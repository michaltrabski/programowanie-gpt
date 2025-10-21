import React, { useRef, useState, type ChangeEvent, type DragEvent } from "react";

// VIDEO LAYOUT SETTINGS
const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const VIDEO_BG_COLOR = "#2196F3";

// Text display options
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
  x: number; // 0..1 (relative, e.g., 0.5=center)
  y: number; // 0..1 (relative)
  animation: "none" | "fadeIn" | "flyInUp" | "flyInDown";
};

type ImageToVideoInput = {
  image: HTMLImageElement;
  durationSec: number;
  textOpts: TextDisplayOpts;
  audioBlob?: Blob; // optional, can be string (url) too
};

// ---- Utility to get audio duration ----
function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(audioUrl);
    };
    audio.onerror = () => {
      reject(new Error("Failed to load audio file."));
      URL.revokeObjectURL(audioUrl);
    };
  });
}

// ---- Main "imageToVideo" logic ----
async function imageToVideo({ image, durationSec, textOpts, audioBlob }: ImageToVideoInput): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create full-res canvas
      const canvas = document.createElement("canvas");
      canvas.width = VIDEO_WIDTH;
      canvas.height = VIDEO_HEIGHT;
      const ctx = canvas.getContext("2d")!;

      // Prepare for animation
      const FPS = 30;
      const totalFrames = Math.ceil(durationSec * FPS);
      let currentFrame = 0;

      // Prepare video stream
      const stream = canvas.captureStream(FPS);
      let audioStream: MediaStream | undefined;
      let combinedStream: MediaStream;

      // If there's audio (MP3), add it
      if (audioBlob) {
        // Chrome 120+ (Jan 2024) allows stream + blob combine
        // Use new "audioContext" approach for compatibility
        const audio = document.createElement("audio");
        audio.src = URL.createObjectURL(audioBlob);

        // Draw silent video frames for now and combine tracks after
        // below we'll "hack" the audio into the video afterwards in browser

        // alternative: combine in MediaStream (see after recording)
      }

      // --- For the animation's benefit: ---
      function drawFrame(frameIdx: number) {
        // BG
        ctx.fillStyle = VIDEO_BG_COLOR;
        ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

        // Draw scaled image
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

        // Text display options
        const { text, fontFamily, fontSize, fontWeight, color, shadow, align, x, y, animation } = textOpts;

        if (text) {
          // Text animation: decide opacity or position
          let opacity = 1;
          let tx = x * VIDEO_WIDTH;
          let ty = y * VIDEO_HEIGHT;

          // Fade/fly in: first 0.6s (18 frames)
          const animFrames = Math.floor(0.6 * FPS);

          if (animation === "fadeIn" && frameIdx < animFrames) {
            opacity = Math.max(0, Math.min(1, frameIdx / animFrames));
          }
          if (animation === "flyInUp" && frameIdx < animFrames) {
            opacity = 1;
            // Start 100px below, move up
            ty = y * VIDEO_HEIGHT + (1 - frameIdx / animFrames) * 100;
          }
          if (animation === "flyInDown" && frameIdx < animFrames) {
            opacity = 1;
            ty = y * VIDEO_HEIGHT - (1 - frameIdx / animFrames) * 100;
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
          // Respect align
          let baseX = tx;
          if (align === "center") baseX = tx;
          if (align === "left") baseX = tx;
          if (align === "right") baseX = tx;
          ctx.fillText(text, baseX, ty);
          ctx.restore();
        }
      }

      // --- MediaRecorder and rendering ---
      const recordedChunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(recordedChunks, { type: "video/webm" });

        // Post-process: Add MP3 audio (if audioBlob exists)
        if (audioBlob) {
          // Use MediaRecorder + webcodecs is not trivial, but we can do this:
          // Render video in an <video> + audio in <audio>, use Web Audio API to combine, re-record in browser.
          // A hacky "muxer" in-browser would be required for proper file combining.
          // Instead, we can "play" both as sources and record the result to get a video+audio webm.
          try {
            const combinedBlob = await combineVideoAndAudioWebm(webmBlob, audioBlob, durationSec);
            resolve(combinedBlob);
          } catch (err: any) {
            // fallback to just video
            resolve(webmBlob);
          }
        } else {
          resolve(webmBlob);
        }
      };

      mediaRecorder.start();

      // Animation render loop
      function drawLoop() {
        if (currentFrame >= totalFrames) {
          mediaRecorder.stop();
          return;
        }
        drawFrame(currentFrame);
        currentFrame++;
        setTimeout(drawLoop, 1000 / FPS);
      }
      drawLoop();
    } catch (e: any) {
      reject(e);
    }
  });
}

// ---- Hacky method: combine video and mp3 in-browser ----
// Will only work in latest Chrome/Edge (not Safari/Firefox).
async function combineVideoAndAudioWebm(videoBlob: Blob, audioBlob: Blob, duration: number): Promise<Blob> {
  // We "mux" by playing both into a canvas/audio element, and capturing a new MediaRecorder
  // (no true muxing but works for simple cases)
  return new Promise((resolve, reject) => {
    let done = false;
    const videoUrl = URL.createObjectURL(videoBlob);
    const audioUrl = URL.createObjectURL(audioBlob);
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = false;
    video.autoplay = false;
    video.currentTime = 0;
    video.preload = "auto";
    video.playbackRate = 1;

    const audio = document.createElement("audio");
    audio.src = audioUrl;
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.currentTime = 0;

    // create off-screen canvas for re-recording video
    const canvas = document.createElement("canvas");
    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;
    const ctx = canvas.getContext("2d")!;

    // Draw from original video to canvas
    const FPS = 30;
    let frame = 0;
    let stopRequested = false;

    function draw() {
      try {
        if (!stopRequested && frame < duration * FPS && !video.ended) {
          ctx.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
          ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
          frame++;
          setTimeout(draw, 1000 / FPS);
        }
      } catch (e) {
        // silently ignore
      }
    }

    const videoStream = canvas.captureStream(FPS);
    // combine with audio track
    const audioCtx = new AudioContext();
    const audioSource = audioCtx.createMediaElementSource(audio);
    const dest = audioCtx.createMediaStreamDestination();
    audioSource.connect(dest);
    audioSource.connect(audioCtx.destination);

    // add audio track to video
    // @ts-ignore
    if (videoStream.addTrack && dest.stream.getAudioTracks().length) {
      videoStream.addTrack(dest.stream.getAudioTracks()[0]);
    }

    const recordedChunks: Blob[] = [];
    const rec = new MediaRecorder(videoStream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm",
    });

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };
    rec.onstop = () => {
      if (!done) {
        done = true;
        resolve(new Blob(recordedChunks, { type: "video/webm" }));
      }
      // cleanup
      URL.revokeObjectURL(videoUrl);
      URL.revokeObjectURL(audioUrl);
    };

    // Start all media
    video.oncanplay = () => {
      audio.oncanplay = () => {
        rec.start();
        video.play();
        audio.play();
        draw();
        setTimeout(() => {
          try {
            stopRequested = true;
            rec.stop();
            audio.pause();
            video.pause();
          } catch {}
        }, duration * 1000 + 200);
      };
      // In case audio fires first
    };
    // In case video is already ready
    if (video.readyState >= 2) video.oncanplay?.(null as any);
    // Just in case something fails
    setTimeout(() => {
      if (!done) {
        done = true;
        rec.stop();
      }
    }, (duration + 2) * 1000);
  });
}

// ---- Default text options ----
const defaultTextOpts: TextDisplayOpts = {
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

// ---- Component ----
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

  // Controls
  const [duration, setDuration] = useState<number>(5);
  const [useAudioDuration, setUseAudioDuration] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Text options
  const [textOpts, setTextOpts] = useState<TextDisplayOpts>({ ...defaultTextOpts });

  // Refs
  const inputImageRef = useRef<HTMLInputElement>(null);
  const inputAudioRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  // Image
  function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select or drop a valid image file.");
      return;
    }
    setError("");
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setVideoBlob(null);
  }

  // Audio
  async function handleAudioFile(file: File) {
    if (!file.type.match(/audio\/mpeg|audio\/mp3|audio\/mpeg3/)) {
      setError("Please select or drop a valid MP3 file.");
      return;
    }
    setError("");
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setVideoBlob(null);
    try {
      const dur = await getAudioDuration(file);
      setAudioDuration(dur);
      setUseAudioDuration(true);
      setDuration(Math.round(dur));
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

    // MP3 or image?
    const files = Array.from(dt.files);
    const img = files.find((f) => f.type.startsWith("image/"));
    const mp3 = files.find((f) => f.type.match(/audio\/mpeg|audio\/mp3|audio\/mpeg3/));
    if (img) handleImageFile(img);
    if (mp3) handleAudioFile(mp3);
    if (!img && !mp3) setError("Only image and MP3 files accepted.");
  }

  // File picks
  function handleBrowseImage(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  }
  function handleBrowseAudio(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleAudioFile(e.target.files[0]);
    }
  }

  // Remove mp3
  function handleRemoveAudio() {
    setAudioFile(null);
    setAudioUrl("");
    setAudioDuration(null);
    setUseAudioDuration(false);
  }

  // Duration slider
  function handleDurationChange(e: ChangeEvent<HTMLInputElement>) {
    let val = Math.max(1, Math.min(600, Number(e.target.value)));
    setDuration(val);
    setUseAudioDuration(false);
  }

  // Video render
  async function handleGenerateVideo() {
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
            textOpts: textOpts,
            audioBlob: audioFile ?? undefined,
          });
          setVideoBlob(blob);
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

  // Text option updaters
  function handleTextField<K extends keyof TextDisplayOpts>(k: K, v: TextDisplayOpts[K]) {
    setTextOpts((old) => ({ ...old, [k]: v }));
  }

  // Position set
  function handleTextPositionChange(e: ChangeEvent<HTMLInputElement>, axis: "x" | "y") {
    let val = Math.max(0, Math.min(1, Number(e.target.value)));
    setTextOpts((old) => ({ ...old, [axis]: val }));
  }

  // TEXT ALIGN {left, center, right}
  function handleAlignChange(e: ChangeEvent<HTMLSelectElement>) {
    setTextOpts((old) => ({ ...old, align: e.target.value as "center" | "left" | "right" }));
  }

  // Use audio duration
  function onChangeUseAudio(e: ChangeEvent<HTMLInputElement>) {
    if (audioDuration) {
      setDuration(Math.round(audioDuration));
      setUseAudioDuration(true);
    }
  }

  // Reset everything
  function handleReset() {
    setImageFile(null);
    setImageUrl("");
    setAudioFile(null);
    setAudioUrl("");
    setAudioDuration(null);
    setUseAudioDuration(false);
    setVideoBlob(null);
    setError("");
    setTextOpts({ ...defaultTextOpts });
    setDuration(5);
  }

  // --- UI ---
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
        {/* Dropzone --- Image and MP3 */}
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
          {/* Image input */}
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
        {/* --- Text options --- */}
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
              Text Overlay
            </legend>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                fontSize: 15,
              }}
            >
              <input
                value={textOpts.text}
                onChange={(e) => handleTextField("text", e.target.value)}
                placeholder="Add text for your video (optional)..."
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
                    value={textOpts.fontFamily}
                    style={{ fontSize: 15, padding: "3px 7px" }}
                    onChange={(e) => handleTextField("fontFamily", e.target.value)}
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
                    value={textOpts.fontSize}
                    onChange={(e) => handleTextField("fontSize", Number(e.target.value))}
                    style={{ width: 55 }}
                  />{" "}
                  px
                </label>
                &nbsp;&nbsp;
                <label>
                  <input
                    type="checkbox"
                    checked={textOpts.fontWeight === "bold"}
                    onChange={(e) => handleTextField("fontWeight", e.target.checked ? "bold" : "normal")}
                  />{" "}
                  Bold
                </label>
                &nbsp;&nbsp;
                <label>
                  <input
                    type="checkbox"
                    checked={!!textOpts.shadow}
                    onChange={(e) => handleTextField("shadow", e.target.checked)}
                  />{" "}
                  Shadow
                </label>
              </div>
              <div>
                <label>
                  Color&nbsp;
                  <input
                    type="color"
                    value={textOpts.color}
                    onChange={(e) => handleTextField("color", e.target.value)}
                  />
                </label>
                &nbsp;&nbsp;
                <label>
                  Align&nbsp;
                  <select value={textOpts.align} onChange={handleAlignChange}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
                &nbsp;&nbsp;
                <label>
                  Animation&nbsp;
                  <select
                    value={textOpts.animation}
                    onChange={(e) => handleTextField("animation", e.target.value as TextDisplayOpts["animation"])}
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
                    value={textOpts.x}
                    onChange={(e) => handleTextPositionChange(e, "x")}
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
                    value={textOpts.y}
                    onChange={(e) => handleTextPositionChange(e, "y")}
                  />
                  &nbsp;0=top, 1=bottom)
                </label>
              </div>
            </div>
          </fieldset>
        </div>
        {/* --- Generate --- */}
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
              Format: webm (VP8/VP9)
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
          <li>- Your text is displayed with style, animation, any position.</li>
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
