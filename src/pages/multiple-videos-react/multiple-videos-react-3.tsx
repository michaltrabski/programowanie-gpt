import React, { useRef, useState, useEffect, type RefObject, type ChangeEvent } from "react";

// Example remote video URLs
const VIDEO_URLS: string[] = [
  "https://www.w3schools.com/html/mov_bbb.mp4",
  "https://www.w3schools.com/html/movie.mp4",
  "https://media.w3.org/2010/05/sintel/trailer.mp4",
];

type VideoPlayerProps = {
  src: string;
  videoRef: RefObject<HTMLVideoElement>;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, videoRef }) => (
  <div
    style={{
      flex: 1,
      minWidth: 320,
      margin: 10,
      boxShadow: "0 2px 8px #bbb",
      borderRadius: 8,
      padding: 10,
    }}
  >
    <video
      ref={videoRef}
      src={src}
      width="100%"
      style={{
        borderRadius: 8,
        display: "block",
        background: "#000",
      }}
      controls
    />
  </div>
);

function format(sec: number): string {
  if (isNaN(sec) || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const MultiVideoPlayer: React.FC = () => {
  // CORRECT TYPING for videoRefs.
  const videoRefs = useRef<RefObject<HTMLVideoElement>[]>(VIDEO_URLS.map(() => React.createRef<HTMLVideoElement>()));

  // Control state
  const [playing, setPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  // On mount: set global duration to min of all videos' duration once all loaded
  useEffect(() => {
    let pending = VIDEO_URLS.length;
    const durations: number[] = Array(VIDEO_URLS.length).fill(0);

    videoRefs.current.forEach((ref, idx) => {
      const vid = ref.current;
      if (!vid) return;
      // Handler for loadedmetadata
      const handler = () => {
        durations[idx] = vid.duration || 0;
        pending -= 1;
        if (pending === 0) {
          // Set global duration as shortest video
          const globalDuration = durations.length > 0 ? Math.min(...durations.filter(Boolean)) : 0;
          setDuration(globalDuration);
        }
        vid.removeEventListener("loadedmetadata", handler);
      };
      vid.addEventListener("loadedmetadata", handler);
    });
    // On unmount, cleanup any stray listeners (should be no-op)
    return () => {
      videoRefs.current.forEach((ref) => {
        const vid = ref.current;
        if (!vid) return;
        vid.removeEventListener("loadedmetadata", () => {});
      });
    };
  }, []);

  // Keep progress updated as any video plays (choose first one as master)
  useEffect(() => {
    const vid = videoRefs.current[0]?.current;
    if (!vid) return;
    const onTimeUpdate = () => setProgress(vid.currentTime);
    vid.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      vid.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, []);

  // Play all videos
  const playAll = () => {
    videoRefs.current.forEach((ref) => {
      const vid = ref.current;
      if (vid) {
        try {
          vid.currentTime = progress;
          void vid.play();
        } catch (e) {} // autoplay block
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

  // Handler for play/pause button
  const handlePlayPause = () => {
    if (playing) pauseAll();
    else playAll();
  };

  // Handler for the global progress slider
  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setProgress(value);
    videoRefs.current.forEach((ref) => {
      const vid = ref.current;
      if (vid) {
        vid.currentTime = value;
      }
    });
  };

  // If any video is paused/played via manual controls, update play state.
  useEffect(() => {
    function checkPlaying() {
      // If any video is paused, set playing false
      const playingVideos = videoRefs.current.map((ref) => ref.current && !ref.current.paused);
      setPlaying(playingVideos.every(Boolean));
    }
    videoRefs.current.forEach((ref) => {
      const vid = ref.current;
      if (!vid) return;
      vid.addEventListener("pause", checkPlaying);
      vid.addEventListener("play", checkPlaying);
    });
    return () => {
      videoRefs.current.forEach((ref) => {
        const vid = ref.current;
        if (!vid) return;
        vid.removeEventListener("pause", checkPlaying);
        vid.removeEventListener("play", checkPlaying);
      });
    };
  }, []);

  // When videos end, pause all
  useEffect(() => {
    const onEnded = () => {
      pauseAll();
    };
    videoRefs.current.forEach((ref) => {
      const vid = ref.current;
      if (!vid) return;
      vid.addEventListener("ended", onEnded);
    });
    return () => {
      videoRefs.current.forEach((ref) => {
        const vid = ref.current;
        if (!vid) return;
        vid.removeEventListener("ended", onEnded);
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
          <VideoPlayer key={url} src={url} videoRef={videoRefs.current[idx]} />
        ))}
      </div>
    </div>
  );
};

export default MultiVideoPlayer;
