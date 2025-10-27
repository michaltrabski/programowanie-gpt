import React, { useRef, useState, useEffect } from "react";

// Example remote video URLs
const VIDEO_URLS = [
  "https://www.w3schools.com/html/mov_bbb.mp4", // Replace with your own
  "https://www.w3schools.com/html/movie.mp4",
  "https://media.w3.org/2010/05/sintel/trailer.mp4",
];

const VideoPlayer = ({ src, index }) => {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Update progress as video plays
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setProgress(video.currentTime);
    };

    video.addEventListener("timeupdate", updateTime);
    return () => {
      video.removeEventListener("timeupdate", updateTime);
    };
  }, []);

  // Set video duration
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const setVideoDuration = () => {
      setDuration(video.duration || 0);
    };

    video.addEventListener("loadedmetadata", setVideoDuration);
    return () => {
      video.removeEventListener("loadedmetadata", setVideoDuration);
    };
  }, [src]);

  // Play/Pause logic
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  // When slider is moved
  const handleSliderChange = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const value = parseFloat(e.target.value);
    video.currentTime = value;
    setProgress(value);
  };

  // Pause state sync if user manually pauses video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);

    video.addEventListener("pause", onPause);
    video.addEventListener("play", onPlay);

    return () => {
      video.removeEventListener("pause", onPause);
      video.removeEventListener("play", onPlay);
    };
  }, []);

  // Simple time formatter
  const format = (sec) => {
    if (isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ flex: 1, minWidth: 320, margin: 10, boxShadow: "0 2px 8px #bbb", borderRadius: 8, padding: 10 }}>
      <video
        ref={videoRef}
        src={src}
        width="100%"
        style={{ borderRadius: 8, display: "block", background: "#000" }}
        // controls
      />
      <div style={{ marginTop: 10 }}>
        <button onClick={handlePlayPause} style={{ marginRight: 10 }}>
          {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={duration}
          value={progress}
          onChange={handleSliderChange}
          step="0.01"
          style={{ width: "60%", verticalAlign: "middle", marginRight: 10 }}
        />
        <span>
          {format(progress)} / {format(duration)}
        </span>
      </div>
    </div>
  );
};

const MultiVideoPlayer = () => {
  return (
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
        <VideoPlayer key={url} src={url} index={idx} />
      ))}
    </div>
  );
};

export default MultiVideoPlayer;
