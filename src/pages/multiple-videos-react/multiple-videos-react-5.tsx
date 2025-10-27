import React, { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

// Example remote video URLs
const VIDEO_URLS: string[] = [
  "http://localhost:3000/multiple-videos/garmin%20[18]/garmin%20[18].mp4",
  "http://localhost:3000/multiple-videos/gopro%20[200]/gopro%20[200].mp4",
];

type MainVideoEvent = {
  time: number; // seconds (with 2 decimals)
  videoIdx: number;
};

function format(sec: number): string {
  if (isNaN(sec) || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const MultiVideoPlayer: React.FC = () => {
  // Create stable refs for all videos
  const videoRefs = useMemo(() => VIDEO_URLS.map(() => React.createRef<HTMLVideoElement>()), []);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0); // global duration = min of loaded videos
  const [progress, setProgress] = useState(0); // current time in seconds

  const [mainVideoIdx, setMainVideoIdx] = useState(0);

  // Array of objects storing when a specific video became "main"
  const [mainVideoEvents, setMainVideoEvents] = useState<MainVideoEvent[]>([{ time: 0, videoIdx: 0 }]);

  // Track RAF for smooth slider progress during playback
  const rafId = useRef<number | null>(null);

  // Compute global duration (min of all durations) as metadata loads
  useEffect(() => {
    const durations: number[] = Array(VIDEO_URLS.length).fill(0);

    const handlers: Array<() => void> = [];

    videoRefs.forEach((ref, idx) => {
      const vid = ref.current;
      if (!vid) return;

      const onLoadedMeta = () => {
        durations[idx] = Number.isFinite(vid.duration) ? vid.duration : 0;
        const validDurations = durations.filter((d) => d > 0);
        if (validDurations.length > 0) {
          const minDur = Math.min(...validDurations);
          setDuration(minDur);
          // Align any already loaded videos to current progress
          if (progress > 0 && vid.readyState >= 1) {
            try {
              vid.currentTime = Math.min(progress, minDur);
            } catch {}
          }
        }
      };

      vid.addEventListener("loadedmetadata", onLoadedMeta);
      handlers.push(() => vid.removeEventListener("loadedmetadata", onLoadedMeta));
    });

    return () => {
      handlers.forEach((off) => off());
    };
  }, [videoRefs, progress]);

  // Start/stop RAF loop when playing or when main video changes
  useEffect(() => {
    const cancelRaf = () => {
      if (rafId.current != null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };

    const tick = () => {
      const mainVid = videoRefs[mainVideoIdx]?.current;
      if (mainVid) {
        setProgress(mainVid.currentTime);
      }
      rafId.current = requestAnimationFrame(tick);
    };

    if (playing) {
      cancelRaf();
      rafId.current = requestAnimationFrame(tick);
    } else {
      cancelRaf();
    }

    return cancelRaf;
  }, [playing, mainVideoIdx, videoRefs]);

  // Sync 'playing' state if any video is played/paused programmatically
  useEffect(() => {
    const updatePlaying = () => {
      const states = videoRefs.map((ref) => {
        const v = ref.current;
        return !!v && !v.paused;
      });
      setPlaying(states.every(Boolean));
    };

    const offs: Array<() => void> = [];
    videoRefs.forEach((ref) => {
      const v = ref.current;
      if (!v) return;
      v.addEventListener("play", updatePlaying);
      v.addEventListener("pause", updatePlaying);
      offs.push(() => {
        v.removeEventListener("play", updatePlaying);
        v.removeEventListener("pause", updatePlaying);
      });
    });

    return () => offs.forEach((off) => off());
  }, [videoRefs]);

  // Pause all on "ended"
  useEffect(() => {
    const onEnded = () => {
      pauseAll();
      const endTime = duration || 0;
      setProgress(endTime);
    };
    const offs: Array<() => void> = [];

    videoRefs.forEach((ref) => {
      const v = ref.current;
      if (!v) return;
      v.addEventListener("ended", onEnded);
      offs.push(() => v.removeEventListener("ended", onEnded));
    });

    return () => offs.forEach((off) => off());
  }, [videoRefs, duration]);

  const playAll = () => {
    videoRefs.forEach((ref) => {
      const v = ref.current;
      if (!v) return;
      try {
        // keep synced to current progress
        if (Number.isFinite(progress)) {
          v.currentTime = Math.min(progress, duration || progress);
        }
        void v.play();
      } catch {}
    });
    setPlaying(true);
  };

  const pauseAll = () => {
    videoRefs.forEach((ref) => {
      const v = ref.current;
      if (!v) return;
      v.pause();
    });
    setPlaying(false);
  };

  const handlePlayPause = () => {
    playing ? pauseAll() : playAll();
  };

  // Slider: keep all videos in sync with the slider
  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setProgress(value);
    videoRefs.forEach((ref) => {
      const v = ref.current;
      if (!v) return;
      try {
        v.currentTime = value;
      } catch {}
    });
  };

  // Set a new main video and record it in events array (avoid duplicates at same idx)
  const handleSetMainVideo = (idx: number) => {
    setMainVideoIdx(idx);
    setMainVideoEvents((prev) => {
      const t = +progress.toFixed(2);
      const last = prev[prev.length - 1];
      if (last && last.videoIdx === idx && Math.abs(last.time - t) < 0.01) {
        return prev;
      }
      if (last && last.videoIdx === idx) {
        // Same main video but at a different time, only append if at least 0.25s apart to reduce spam
        if (Math.abs(last.time - t) < 0.25) return prev;
      }
      return [...prev, { time: t, videoIdx: idx }];
    });
  };

  return (
    <div>
      {/* Global Controller */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 32,
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <button onClick={handlePlayPause} style={{ fontWeight: 500, fontSize: 18, padding: "0.5em 1em" }}>
          {playing ? "Pause All" : "Play All"}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, duration)}
          value={Number.isFinite(progress) ? Math.min(progress, duration || progress) : 0}
          step="0.01"
          onChange={handleSliderChange}
          onInput={handleSliderChange}
          style={{ width: 300, margin: "0 15px" }}
        />
        <span>
          {format(progress)} / {format(duration)}
        </span>
      </div>

      {/* Videos */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap",
          padding: 20,
        }}
      >
        {VIDEO_URLS.map((url, idx) => (
          <div
            key={url}
            onClick={() => handleSetMainVideo(idx)}
            style={{
              flex: 1,
              minWidth: 320,
              maxWidth: 400,
              margin: 10,
              boxShadow: "0 2px 8px #bbb",
              borderRadius: 8,
              padding: 10,
              cursor: "pointer",
              border: idx === mainVideoIdx ? "4px solid #2196f3" : "4px solid transparent",
              transition: "border-color 0.2s",
            }}
          >
            <video
              ref={videoRefs[idx]}
              src={url}
              width="100%"
              style={{ borderRadius: 8, display: "block", background: "#000" }}
              controls={false} // NO HTML controls
              muted // allow simultaneous play without user gesture issues
              playsInline
              onClick={(e) => {
                e.stopPropagation();
                handleSetMainVideo(idx);
              }}
              // Keep newly loaded video aligned with current progress
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                try {
                  v.currentTime = Math.min(progress, v.duration || progress);
                } catch {}
              }}
            />
            <div
              style={{
                marginTop: 8,
                fontWeight: 500,
                textAlign: "center",
                color: idx === mainVideoIdx ? "#2196f3" : "#222",
              }}
            >
              {idx === mainVideoIdx ? "Main Video" : ""}
            </div>
          </div>
        ))}
      </div>

      {/* Main video selection events as JSON */}
      <div style={{ maxWidth: 700, margin: "2em auto 1em auto", textAlign: "left" }}>
        <h3>Main Video Events (time : video index)</h3>
        <pre
          style={{
            background: "#f8f8f8",
            borderRadius: 6,
            padding: 16,
            color: "#333",
            fontSize: 14,
            maxWidth: 680,
            overflowX: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {JSON.stringify(mainVideoEvents, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default MultiVideoPlayer;
