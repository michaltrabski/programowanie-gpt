import React, { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

// Use your exact video URLs and names
const VIDEO_URLS: string[] = [
  "http://localhost:3000/multiple-videos/garmin%20[18]/garmin%20[18].mp4",
  "http://localhost:3000/multiple-videos/gopro%20[200]/gopro%20[200].mp4",
];

const VIDEO_NAMES: string[] = [
  "http://localhost:3000/multiple-videos/garmin%20[18]/garmin%20[18].mp4",
  "http://localhost:3000/multiple-videos/gopro%20[200]/gopro%20[200].mp4",
];

const LS_KEY = "multi_video_player_state_fullpath";

type MainVideoEvent = {
  timeFrom: number;
  timeTo?: number;
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
  if (isNaN(sec) || !isFinite(sec)) return "0:00";
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
  const videoRefs = useMemo(() => VIDEO_URLS.map(() => React.createRef<HTMLVideoElement>()), []);

  const [persisted, setPersisted] = useLocalPersist(LS_KEY, {
    events: [{ timeFrom: 0, videoName: VIDEO_NAMES[0] }] as { timeFrom: number; videoName: string }[],
    progress: 0,
    mainVideoName: VIDEO_NAMES[0],
  });

  const events = persisted.events;
  const progress = persisted.progress;
  const mainVideoName = persisted.mainVideoName;

  const [duration, setDuration] = useState(0);

  const mainVideoIdx = VIDEO_NAMES.indexOf(mainVideoName);

  // Get global duration as the min duration across all videos (as before)
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
          setDuration(Math.min(...validDurations));
        }
      };

      vid.addEventListener("loadedmetadata", onLoadedMeta);
      handlers.push(() => vid.removeEventListener("loadedmetadata", onLoadedMeta));
    });

    return () => {
      handlers.forEach((off) => off());
    };
  }, [videoRefs]);

  // On progress change, sync time for all videos
  useEffect(() => {
    videoRefs.forEach((ref) => {
      if (!ref.current || !Number.isFinite(progress)) return;
      try {
        ref.current.currentTime = Math.min(progress, ref.current.duration || progress);
      } catch {}
    });
  }, [progress]);

  // On slider seek update main video to match segment (if necessary)
  useEffect(() => {
    const eventsOrdered = getOrderedWithTimeTo(events);
    const cur = getCurrentEventAt(progress, eventsOrdered, duration);
    if (!cur) return;
    if (cur.videoName !== mainVideoName) {
      setPersisted((p) => ({ ...p, mainVideoName: cur.videoName }));
    }
    // eslint-disable-next-line
  }, [progress]);

  function handleSetMainVideo(idx: number) {
    const videoName = VIDEO_NAMES[idx];
    setPersisted((prev) => {
      const t = +progress.toFixed(1); // michal

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

  // Play/pause logic
  const [playing, setPlaying] = useState(false);
  const rafId = useRef<number | null>(null);

  function playAll() {
    setPlaying(true);
    videoRefs.forEach((ref) => {
      const v = ref.current;
      if (!v) return;
      void v.play();
    });
  }
  function pauseAll() {
    setPlaying(false);
    videoRefs.forEach((ref) => {
      const v = ref.current;
      if (!v) return;
      v.pause();
    });
  }
  function handlePlayPause() {
    playing ? pauseAll() : playAll();
  }

  // Sync progress timer for navigation (drive all videos)
  useEffect(() => {
    function tick() {
      const curVid = videoRefs[mainVideoIdx]?.current;
      if (!curVid) return;
      setPersisted((p) => ({ ...p, progress: curVid.currentTime }));
      rafId.current = requestAnimationFrame(tick);
    }
    if (playing) {
      rafId.current && cancelAnimationFrame(rafId.current);
      // rafId.current = requestAnimationFrame(tick);
    }
    return () => rafId.current && cancelAnimationFrame(rafId.current);
    // eslint-disable-next-line
  }, [playing, mainVideoIdx]);

  // When main video play/pause, reflect in UI state
  useEffect(() => {
    const mainVid = videoRefs[mainVideoIdx]?.current;
    if (!mainVid) return;
    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    mainVid.addEventListener("play", handlePlay);
    mainVid.addEventListener("pause", handlePause);
    return () => {
      mainVid.removeEventListener("play", handlePlay);
      mainVid.removeEventListener("pause", handlePause);
    };
  }, [mainVideoIdx, videoRefs]);

  function handleSliderChange(e: ChangeEvent<HTMLInputElement>) {
    const value = parseFloat(e.target.value);
    setPersisted((p) => ({ ...p, progress: value }));
  }

  const eventsOrderedWithTimeTo = useMemo(() => getOrderedWithTimeTo(events), [events]);

  function videoNameToIdx(name: string) {
    const idx = VIDEO_NAMES.indexOf(name);
    return idx >= 0 ? idx : 0;
  }

  return (
    <div>
      {/* Controller */}
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
          style={{ width: 350, margin: "0 15px" }}
        />
        <span>
          {format(progress)} / {format(duration)}
        </span>
      </div>

      {/* Videos - all kept in sync, main can be changed by clicking */}
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
              maxWidth: 480,
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
              width="100%"
              style={{ borderRadius: 8, display: "block", background: "#000" }}
              controls={false}
              muted
              playsInline
              onClick={(e) => {
                e.stopPropagation();
                handleSetMainVideo(idx);
              }}
              onLoadedMetadata={(e) => {
                try {
                  e.currentTarget.currentTime = Math.min(progress, e.currentTarget.duration || progress);
                } catch {}
              }}
            />
            <div
              style={{
                marginTop: 8,
                fontWeight: 500,
                wordBreak: "break-all",
                textAlign: "center",
                color: idx === mainVideoIdx ? "#2196f3" : "#222",
                fontSize: 14,
              }}
            >
              {VIDEO_NAMES[idx]}
              {idx === mainVideoIdx ? " — Main" : ""}
            </div>
          </div>
        ))}
      </div>

      {/* Event list */}
      <div style={{ maxWidth: 900, margin: "2em auto 1em auto", textAlign: "left" }}>
        <h3>Main Video Timeline</h3>
        <pre
          style={{
            background: "#f8f8f8",
            borderRadius: 6,
            padding: 16,
            color: "#333",
            fontSize: 14,
            maxWidth: 900,
            overflowX: "auto",
            whiteSpace: "pre-wrap",
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
