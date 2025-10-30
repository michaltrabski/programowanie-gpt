import React, { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

// === Use your video URLs and names (full paths) ===
const VIDEO_URLS: string[] = [
  "http://localhost:3000/multiple-videos/garmin%20[18]/garmin%20[18].mp4",
  "http://localhost:3000/multiple-videos/gopro%20[200]/gopro%20[200].mp4",
];

const VIDEO_NAMES: string[] = [
  "http://localhost:3000/multiple-videos/garmin%20[18]/garmin%20[18].mp4",
  "http://localhost:3000/multiple-videos/gopro%20[200]/gopro%20[200].mp4",
];

const LS_KEY = "multi_video_player_state";

type MainVideoEvent = {
  timeFrom: number; // inclusive
  timeTo?: number; // exclusive (last event has open end until duration)
  videoName: string;
};

function getOrderedWithTimeTo(events: Omit<MainVideoEvent, "timeTo">[]): MainVideoEvent[] {
  const sorted = [...events].sort((a, b) => a.timeFrom - b.timeFrom);
  return sorted.map((e, idx) => ({
    ...e,
    timeTo: sorted[idx + 1]?.timeFrom ?? undefined,
  }));
}

function getCurrentEventAt(time: number, events: MainVideoEvent[], duration: number): MainVideoEvent | null {
  if (!events.length) return null;
  for (let i = 0; i < events.length; ++i) {
    const e = events[i];
    const to = typeof e.timeTo === "number" ? e.timeTo : duration;
    if (time >= e.timeFrom && time < to) return e;
  }
  if (events[events.length - 1]?.timeFrom <= time) return events[events.length - 1];
  return events[0];
}

function format(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function useLocalPersist<T extends object>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        return { ...initial, ...JSON.parse(raw) };
      }
    } catch {}
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}

const MultiVideoPlayer: React.FC = () => {
  // Stable refs, only created once
  const videoRefs = useMemo(() => VIDEO_URLS.map(() => React.createRef<HTMLVideoElement>()), []);
  const masterPreviewRefs = useMemo(() => VIDEO_URLS.map(() => React.createRef<HTMLVideoElement>()), []);

  // Persisted state
  const [persisted, setPersisted] = useLocalPersist(LS_KEY, {
    events: [{ timeFrom: 0, videoName: VIDEO_NAMES[0] }] as { timeFrom: number; videoName: string }[],
    progress: 0,
    mainVideoName: VIDEO_NAMES[0],
  });
  const events = persisted.events;
  const progress = persisted.progress;
  const mainVideoName = persisted.mainVideoName;
  const mainVideoIdxRaw = VIDEO_NAMES.indexOf(mainVideoName);
  const mainVideoIdx = mainVideoIdxRaw >= 0 ? mainVideoIdxRaw : 0;

  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Ensure persisted mainVideoName is valid
  useEffect(() => {
    if (mainVideoIdxRaw === -1) {
      setPersisted((p) => ({ ...p, mainVideoName: VIDEO_NAMES[0] }));
    }
  }, [mainVideoIdxRaw, setPersisted]);

  // Pick minimum duration of all videos once loaded
  useEffect(() => {
    let didUnmount = false;
    const durations: number[] = Array(VIDEO_URLS.length).fill(0);
    const cleanupArr: (() => void)[] = [];
    masterPreviewRefs.forEach((ref, idx) => {
      const vid = ref.current;
      if (!vid) return;
      const listener = () => {
        durations[idx] = Number.isFinite(vid.duration) ? vid.duration : 0;
        const validDurations = durations.filter(Boolean);
        if (!didUnmount && validDurations.length > 0) {
          setDuration(Math.min(...validDurations));
        }
      };
      vid.addEventListener("loadedmetadata", listener);
      cleanupArr.push(() => vid.removeEventListener("loadedmetadata", listener));
    });
    return () => {
      didUnmount = true;
      cleanupArr.forEach((fn) => fn());
    };
  }, [masterPreviewRefs]);

  // Keep all videos in sync with progress
  useEffect(() => {
    if (!Number.isFinite(progress)) return;
    const allRefs = [...videoRefs, ...masterPreviewRefs];
    allRefs.forEach((ref) => {
      const el = ref.current;
      if (!el) return;
      try {
        const dur = Number.isFinite(el.duration) ? el.duration : progress;
        el.currentTime = Math.min(progress, dur);
      } catch {}
    });
  }, [progress, videoRefs, masterPreviewRefs]);

  // Switch main video on time event
  useEffect(() => {
    const eventsOrdered = getOrderedWithTimeTo(events);
    const cur = getCurrentEventAt(progress, eventsOrdered, duration);
    if (!cur) return;
    if (cur.videoName !== mainVideoName) {
      setPersisted((p) => ({ ...p, mainVideoName: cur.videoName }));
    }
    // eslint-disable-next-line
  }, [progress, duration, events, mainVideoName]);

  // On click, set main video at current time
  function handleSetMainVideo(idx: number) {
    const videoName = VIDEO_NAMES[idx];
    setPersisted((prev) => {
      const t = +progress.toFixed(2);
      let evs = [...prev.events];
      if (
        evs.length > 0 &&
        evs[evs.length - 1].videoName === videoName &&
        Math.abs(evs[evs.length - 1].timeFrom - t) < 0.01
      ) {
        return { ...prev, mainVideoName: videoName };
      }
      if (evs.length > 0 && Math.abs(evs[evs.length - 1].timeFrom - t) < 0.01) {
        evs[evs.length - 1] = { timeFrom: t, videoName };
      } else {
        evs = [...evs, { timeFrom: t, videoName }];
      }
      evs = getOrderedWithTimeTo(evs).map(({ timeTo, ...rest }) => rest);
      return { ...prev, mainVideoName: videoName, events: evs };
    });
  }

  // Play/pause handling
  function playAll() {
    setPlaying(true);
    videoRefs.forEach((ref) => {
      if (ref.current) ref.current.play().catch(() => {});
    });
    masterPreviewRefs.forEach((ref) => {
      if (ref.current) ref.current.play().catch(() => {});
    });
  }
  function pauseAll() {
    setPlaying(false);
    videoRefs.forEach((ref) => {
      if (ref.current) ref.current.pause();
    });
    masterPreviewRefs.forEach((ref) => {
      if (ref.current) ref.current.pause();
    });
  }
  function handlePlayPause() {
    playing ? pauseAll() : playAll();
  }

  // Use only main master preview video as progress clock source, keep others in sync
  useEffect(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (playing) {
      intervalRef.current = window.setInterval(() => {
        const ref = masterPreviewRefs[mainVideoIdx]?.current;
        if (!ref) return;
        setPersisted((p) => ({ ...p, progress: ref.currentTime }));
      }, 1000); // once per second
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, [playing, mainVideoIdx, masterPreviewRefs, setPersisted]);

  // When main preview video is played/paused, reflect state
  useEffect(() => {
    function handlePlay() {
      setPlaying(true);
    }
    function handlePause() {
      setPlaying(false);
    }
    const ref = masterPreviewRefs[mainVideoIdx]?.current;
    if (!ref) return;
    ref.addEventListener("play", handlePlay);
    ref.addEventListener("pause", handlePause);
    return () => {
      ref.removeEventListener("play", handlePlay);
      ref.removeEventListener("pause", handlePause);
    };
  }, [mainVideoIdx, masterPreviewRefs]);

  function handleSliderChange(e: ChangeEvent<HTMLInputElement>) {
    const value = parseFloat(e.target.value);
    setPersisted((p) => ({ ...p, progress: value }));
  }

  const eventsOrderedWithTimeTo = useMemo(() => getOrderedWithTimeTo(events), [events]);

  return (
    <div>
      {/* === MASTER PREVIEW: Stack all videos, only one is visible === */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>Master Preview</div>
        <div
          style={{
            position: "relative",
            width: 512,
            height: 288,
            marginBottom: 10,
          }}
        >
          {VIDEO_URLS.map((url, idx) => (
            <video
              key={url}
              ref={masterPreviewRefs[idx]}
              src={url}
              width={512}
              height={288}
              tabIndex={0}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 512,
                height: 288,
                background: "#111",
                borderRadius: 10,
                border: "3px solid",
                borderColor: idx === mainVideoIdx ? "#2196f3" : "#444c",
                boxSizing: "border-box",
                zIndex: idx === mainVideoIdx ? 2 : 1,
                display: idx === mainVideoIdx ? "block" : "none",
                pointerEvents: idx === mainVideoIdx ? "auto" : "none",
              }}
              controls={false}
              muted
              playsInline
              onClick={() => {
                playing ? pauseAll() : playAll();
              }}
              onLoadedMetadata={(e) => {
                try {
                  e.currentTarget.currentTime = Math.min(
                    progress,
                    Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : progress
                  );
                } catch {}
              }}
            />
          ))}
        </div>
        <div style={{ marginTop: 3, fontSize: 14, color: "#555", maxWidth: 520, wordBreak: "break-all" }}>
          Current Main:
          <br />
          <span style={{ fontWeight: 600, color: "#1976d2" }}>{mainVideoName}</span>
        </div>
      </div>

      {/* --- Global Controls --- */}
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
          style={{ width: 350, margin: "0 15px" }}
        />
        <span>
          {format(progress)} / {format(duration)}
        </span>
      </div>

      {/* === Video players (thumbnails, click to set main) === */}
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
              minWidth: 300,
              maxWidth: 390,
              margin: 10,
              boxShadow: "0 2px 8px #bbb",
              borderRadius: 8,
              padding: 10,
              cursor: "pointer",
              border: idx === mainVideoIdx ? "4px solid #2196f3" : "4px solid transparent",
              transition: "border-color 0.18s",
            }}
          >
            <video
              ref={videoRefs[idx]}
              src={url}
              style={{ borderRadius: 8, display: "block", background: "#000", width: "100%" }}
              controls={false}
              muted
              playsInline
              onClick={(e) => {
                e.stopPropagation();
                handleSetMainVideo(idx);
              }}
              onLoadedMetadata={(e) => {
                try {
                  e.currentTarget.currentTime = Math.min(
                    progress,
                    Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : progress
                  );
                } catch {}
              }}
            />
            <div
              style={{
                marginTop: 8,
                fontWeight: 500,
                textAlign: "center",
                color: idx === mainVideoIdx ? "#2196f3" : "#222",
                wordBreak: "break-all",
                fontSize: 13,
              }}
            >
              {VIDEO_NAMES[idx]}
              {idx === mainVideoIdx ? " — Main" : ""}
            </div>
          </div>
        ))}
      </div>

      {/* === Event Timeline === */}
      <div style={{ maxWidth: 750, margin: "2em auto 1em auto", textAlign: "left" }}>
        <h3>Main Video Timeline</h3>
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
            wordBreak: "break-all",
          }}
        >
          {JSON.stringify(
            eventsOrderedWithTimeTo.map((e) => ({
              timeFrom: +e.timeFrom.toFixed(2),
              timeTo: typeof e.timeTo === "number" ? +e.timeTo.toFixed(2) : undefined,
              videoName: e.videoName,
            })),
            null,
            2
          )}
        </pre>
        <table
          style={{
            fontFamily: "monospace",
            width: "100%",
            background: "#fafbfc",
            borderCollapse: "collapse",
            marginTop: 3,
            fontSize: "1em",
          }}
        >
          <thead>
            <tr style={{ background: "#ddeaff" }}>
              <th style={{ textAlign: "left", padding: 3, border: "1px solid #ccd" }}>#</th>
              <th style={{ textAlign: "left", padding: 3, border: "1px solid #ccd" }}>Video Name</th>
              <th style={{ textAlign: "left", padding: 3, border: "1px solid #ccd" }}>From</th>
              <th style={{ textAlign: "left", padding: 3, border: "1px solid #ccd" }}>To</th>
            </tr>
          </thead>
          <tbody>
            {eventsOrderedWithTimeTo.map((e, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#eef3fb" : "#fff" }}>
                <td style={{ padding: 3, border: "1px solid #ccd" }}>{i + 1}</td>
                <td style={{ padding: 3, border: "1px solid #ccd", wordBreak: "break-all" }}>{e.videoName}</td>
                <td style={{ padding: 3, border: "1px solid #ccd" }}>{format(e.timeFrom)}</td>
                <td style={{ padding: 3, border: "1px solid #ccd" }}>
                  {typeof e.timeTo === "number" ? format(e.timeTo) : "End"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MultiVideoPlayer;
