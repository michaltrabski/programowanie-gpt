import React, { useRef, useState, useEffect, type RefObject, type ChangeEvent } from "react";

// Example remote video URLs
const VIDEO_URLS: string[] = [
  "https://www.w3schools.com/html/mov_bbb.mp4",
  "https://www.w3schools.com/html/movie.mp4",
  "https://media.w3.org/2010/05/sintel/trailer.mp4",
];

function format(sec: number): string {
  if (isNaN(sec) || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const MultiVideoPlayer: React.FC = () => {
  const videoRefs = useRef<RefObject<HTMLVideoElement>[]>(VIDEO_URLS.map(() => React.createRef<HTMLVideoElement>()));

  const [playing, setPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  // Main video index (default: first video)
  const [mainVideoIdx, setMainVideoIdx] = useState<number>(0);
  // Object mapping time (rounded seconds) -> main video idx at that time
  const [mainVideoState, setMainVideoState] = useState<{ [second: string]: number }>({ "0": 0 });

  // On mount: set duration as min of all loaded videos
  useEffect(() => {
    let pending = VIDEO_URLS.length;
    const durations: number[] = Array(VIDEO_URLS.length).fill(0);

    videoRefs.current.forEach((ref, idx) => {
      const vid = ref.current;
      if (!vid) return;
      const handler = () => {
        durations[idx] = vid.duration || 0;
        pending -= 1;
        if (pending === 0) {
          const globalDuration = durations.length > 0 ? Math.min(...durations.filter(Boolean)) : 0;
          setDuration(globalDuration);
        }
        vid.removeEventListener("loadedmetadata", handler);
      };
      vid.addEventListener("loadedmetadata", handler);
    });
    // Cleanup
    return () => {
      videoRefs.current.forEach((ref) => {
        const vid = ref.current;
        if (vid) vid.removeEventListener("loadedmetadata", () => {});
      });
    };
  }, []);

  // Keep progress updated with main video time
  useEffect(() => {
    const vid = videoRefs.current[mainVideoIdx]?.current;
    if (!vid) return;
    const onTimeUpdate = () => {
      setProgress(vid.currentTime);
    };
    vid.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      vid.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [mainVideoIdx]);

  // Play all videos
  const playAll = () => {
    videoRefs.current.forEach((ref) => {
      const vid = ref.current;
      if (vid) {
        try {
          vid.currentTime = progress;
          void vid.play();
        } catch (e) {}
      }
    });
    setPlaying(true);
  };

  // Pause all videos
  const pauseAll = () => {
    videoRefs.current.forEach((ref) => {
      const vid = ref.current;
      if (vid) vid.pause();
    });
    setPlaying(false);
  };

  const handlePlayPause = () => {
    playing ? pauseAll() : playAll();
  };

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setProgress(value);
    videoRefs.current.forEach((ref) => {
      const vid = ref.current;
      if (vid) vid.currentTime = value;
    });
  };

  // Whenever a different video is clicked, set as main and record in mainVideoState
  const handleSetMainVideo = (idx: number) => {
    setMainVideoIdx(idx);
    setMainVideoState((prev) => ({
      ...prev,
      [Math.round(progress).toString()]: idx,
    }));
  };

  // If any video is manually paused/played (by code!), sync "playing" state
  useEffect(() => {
    function checkPlaying() {
      const plays = videoRefs.current.map((ref) => ref.current && !ref.current.paused);
      setPlaying(plays.every(Boolean));
    }
    videoRefs.current.forEach((ref) => {
      const vid = ref.current;
      if (!vid) return;
      vid.addEventListener("play", checkPlaying);
      vid.addEventListener("pause", checkPlaying);
    });
    return () => {
      videoRefs.current.forEach((ref) => {
        const vid = ref.current;
        if (!vid) return;
        vid.removeEventListener("play", checkPlaying);
        vid.removeEventListener("pause", checkPlaying);
      });
    };
  }, []);

  // On "ended", pause all
  useEffect(() => {
    const onEnded = () => pauseAll();
    videoRefs.current.forEach((ref) => {
      const vid = ref.current;
      if (vid) vid.addEventListener("ended", onEnded);
    });
    return () => {
      videoRefs.current.forEach((ref) => {
        const vid = ref.current;
        if (vid) vid.removeEventListener("ended", onEnded);
      });
    };
  }, []);

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
          max={duration}
          value={progress}
          step="0.05"
          onChange={handleSliderChange}
          style={{ width: 300, margin: "0 15px" }}
        />
        <span>
          {format(progress)} / {format(duration)}
        </span>
      </div>
      {/* All videos */}
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
              ref={videoRefs.current[idx]}
              src={url}
              width="100%"
              style={{
                borderRadius: 8,
                display: "block",
                background: "#000",
              }}
              // REMOVE all html controls
              controls={false}
              // prevent click-through
              onClick={(e) => {
                e.stopPropagation();
                handleSetMainVideo(idx);
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
      {/* Main video selection state as JSON */}
      <div style={{ maxWidth: 540, margin: "2em auto 1em auto", textAlign: "left" }}>
        <h3>Main Video State (time : video idx):</h3>
        <pre
          style={{
            background: "#f8f8f8",
            borderRadius: 6,
            padding: 16,
            color: "#333",
            fontSize: 14,
            maxWidth: 500,
            overflowX: "auto",
          }}
        >
          {JSON.stringify(mainVideoState, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default MultiVideoPlayer;
