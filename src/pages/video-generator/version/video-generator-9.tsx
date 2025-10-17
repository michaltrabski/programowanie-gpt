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

interface VideoResult {
  url: string;
  orientation: Orientation;
}

const BLUE_BG = "#1a8dd8";

// Draws image in the center of canvas keeping aspect ratio, with blue bars as needed (object-fit: contain).
function drawFittedImage(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  img: HTMLImageElement
) {
  // Fill blue
  ctx.fillStyle = BLUE_BG;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const iw = img.width;
  const ih = img.height;
  const scale = Math.min(canvasWidth / iw, canvasHeight / ih);
  const drawW = iw * scale;
  const drawH = ih * scale;
  const offsetX = (canvasWidth - drawW) / 2;
  const offsetY = (canvasHeight - drawH) / 2;
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
}

const ImageToVideoGenerator: React.FC = () => {
  const [imageFile, setImageFile] = useState<Nullable<File>>(null);
  const [imageUrl, setImageUrl] = useState<Nullable<string>>(null);

  const [imageDimensions, setImageDimensions] = useState<
    Nullable<{
      width: number;
      height: number;
    }>
  >(null);

  const [mp3File, setMp3File] = useState<Nullable<File>>(null);
  const [mp3Url, setMp3Url] = useState<Nullable<string>>(null);
  const [mp3Duration, setMp3Duration] = useState<Nullable<number>>(null);

  const [videoResults, setVideoResults] = useState<VideoResult[]>([]);
  const [duration, setDuration] = useState<number>(3);
  const [processing, setProcessing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup URLs
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (mp3Url) URL.revokeObjectURL(mp3Url);
      videoResults.forEach((v) => URL.revokeObjectURL(v.url));
    };
    // eslint-disable-next-line
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
    if (!e.dataTransfer.files) return;
    const files = Array.from(e.dataTransfer.files);
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

  async function generateSingleVideo(img: HTMLImageElement, orientation: Orientation): Promise<VideoResult> {
    const { width, height } = ORIENTATIONS[orientation];

    // Prep canvas
    const canvas = canvasRef.current!;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // Initially draw the image
    drawFittedImage(ctx, width, height, img);

    // Canvas stream
    const FPS = 30;
    const canvasStream: MediaStream = (canvas as any).captureStream
      ? (canvas as any).captureStream(FPS)
      : (canvas as any).mozCaptureStream
      ? (canvas as any).mozCaptureStream(FPS)
      : (() => {
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
      throw new Error("Video recording with the chosen settings is not supported in this browser.");
    }

    const CHUNKS: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) CHUNKS.push(e.data);
    };

    // Animation loop: redraw (static image, but MediaRecorder needs frames)
    let recording = true;
    const drawFrame = () => {
      if (!recording) return;
      drawFittedImage(ctx, width, height, img);
      setTimeout(() => {
        requestAnimationFrame(drawFrame);
      }, 1000 / FPS);
    };
    requestAnimationFrame(drawFrame);

    // When done we'll make a Blob URL
    return await new Promise<VideoResult>(async (resolve, reject) => {
      recorder.onstop = async () => {
        try {
          if (audioContext) await audioContext.close();
        } catch {}
        try {
          composedStream.getTracks().forEach((t) => t.stop());
          canvasStream.getTracks().forEach((t) => t.stop());
        } catch {}
        recording = false;
        const blob = new Blob(CHUNKS, { type: mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        resolve({ url, orientation });
      };

      try {
        recorder.start();
      } catch (e) {
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
        // No audio: stop after duration
        const secs = Math.max(0.1, duration || 3);
        setTimeout(() => {
          try {
            if (recorder.state !== "inactive") {
              recorder.stop();
            }
          } catch {}
        }, Math.ceil(secs * 1000));
      }
    });
  }

  // Main: generate both videos
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

      // Both horizontal & vertical in parallel
      const [resH, resV] = await Promise.all([
        generateSingleVideo(img, "horizontal"),
        generateSingleVideo(img, "vertical"),
      ]);
      setVideoResults([resH, resV]);
    } catch (err: any) {
      alert(err?.message || "Failed to generate video");
    } finally {
      setProcessing(false);
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
        {processing ? "Generating Videos..." : "Generate Horizontal & Vertical Videos"}
      </button>

      {videoResults.length > 0 && (
        <div>
          {videoResults.map((v) => (
            <div key={v.orientation} style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                {v.orientation === "horizontal" ? "Horizontal (1920x1080)" : "Vertical (1080x1920)"}
              </div>
              <video
                src={v.url}
                controls
                style={{
                  width: "100%",
                  maxWidth: 420,
                  aspectRatio: v.orientation === "horizontal" ? "16/9" : "9/16",
                  background: BLUE_BG,
                  borderRadius: 6,
                  marginBottom: 7,
                }}
              />
              <a
                href={v.url}
                download={`image-mp3-${v.orientation}.webm`}
                style={{
                  display: "inline-block",
                  textDecoration: "none",
                  background: "#2196f3",
                  color: "#fff",
                  padding: "0.5rem 1.2rem",
                  borderRadius: 4,
                }}
              >
                ⬇️ Download {v.orientation} video
              </a>
            </div>
          ))}
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default ImageToVideoGenerator;
