import React, { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

// Example remote video URLs
const VIDEO_URLS: string[] = [
  "http://localhost:3000/multiple-videos/garmin%20[18]/garmin%20[18].mp4",
  "http://localhost:3000/multiple-videos/gopro%20[200]/gopro%20[200].mp4",
];

// Nice display names (ensure order matches URLs)
const VIDEO_NAMES = [
  "http://localhost:3000/multiple-videos/garmin%20[18]/garmin%20[18].mp4",
  "http://localhost:3000/multiple-videos/gopro%20[200]/gopro%20[200].mp4",
];

// Name for localstorage
const LS_KEY = "multi_video_player_state";

type MainVideoEvent = {
  timeFrom: number; // inclusive
  timeTo?: number; // exclusive (last event has open end until duration)
  videoName: string;
};

// Returns time [from, to) for each event in chronological order
function getOrderedWithTimeTo(events: Omit<MainVideoEvent, "timeTo">[]): MainVideoEvent[] {
  // Sort ascending
  const sorted = [...events].sort((a, b) => a.timeFrom - b.timeFrom);
  return sorted.map((e, idx) => ({
    ...e,
    timeTo: sorted[idx + 1]?.timeFrom ?? undefined,
  }));
}

// Find current main video at given time
function getCurrentEventAt(time: number, events: MainVideoEvent[], duration: number): MainVideoEvent | null {
  if (!events.length) return null;
  for (let i = 0; i < events.length; ++i) {
    const e = events[i];
    const to = typeof e.timeTo === "number" ? e.timeTo : duration;
    if (time >= e.timeFrom && time < to) return e;
  }
  // fallback to last event
  if (events[events.length - 1]?.timeFrom <= time) return events[events.length - 1];
  return events[0];
}

function format(sec: number): string {
  if (isNaN(sec) || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Persist and restore all state to localStorage
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
  // Create stable refs for all videos
  const videoRefs = useMemo(() => VIDEO_URLS.map(() => React.createRef<HTMLVideoElement>()), []);
  // Master preview ref
  const masterRef = useRef<HTMLVideoElement>(null);

  // 'meta' state stored in localStorage
  const [persisted, setPersisted] = useLocalPersist(LS_KEY, {
    events: [{ timeFrom: 0, videoName: VIDEO_NAMES[0] }] as { timeFrom: number; videoName: string }[],
    progress: 0,
    mainVideoName: VIDEO_NAMES[0],
  });

  // Unpack
  const events = persisted.events;
  const progress = persisted.progress;
  const mainVideoName = persisted.mainVideoName;

  // Will assign `timeTo` for each event
  const [duration, setDuration] = useState(0);

  // The currently selected video (by name)
  const mainVideoIdx = VIDEO_NAMES.indexOf(mainVideoName);

  // For smooth master preview seek/progress
  const rafId = useRef<number | null>(null);

  // Compute global min duration from all videos as they load
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

  // When progress/seek, update masterRef and all videos
  useEffect(() => {
    // Video refs: sync time
    videoRefs.forEach((ref, idx) => {
      if (!ref.current || !Number.isFinite(progress)) return;
      try {
        ref.current.currentTime = Math.min(progress, ref.current.duration || progress);
      } catch {}
    });
    // Master preview: sync time
    if (masterRef.current && Number.isFinite(progress)) {
      try {
        masterRef.current.currentTime = Math.min(progress, masterRef.current.duration || progress);
      } catch {}
    }
  }, [progress]);

  // When clicking timeline/slider: make sure active main video matches proper event at that time
  useEffect(() => {
    // This effect runs only if progress (seek) changes
    const eventsOrdered = getOrderedWithTimeTo(events);
    const cur = getCurrentEventAt(progress, eventsOrdered, duration);
    if (!cur) return;
    if (cur.videoName !== mainVideoName) {
      setPersisted((p) => ({ ...p, mainVideoName: cur.videoName }));
    }
    // eslint-disable-next-line
  }, [progress]); // NB: do NOT depend on mainVideoName, we set it

  // When clicking on any video, append/replace new event at current time
  function handleSetMainVideo(idx: number) {
    const videoName = VIDEO_NAMES[idx];
    setPersisted((prev) => {
      const t = +progress.toFixed(2);

      // Remove duplicate events with the same time and video
      let evs = [...prev.events];
      if (
        evs.length > 0 &&
        evs[evs.length - 1].videoName === videoName &&
        Math.abs(evs[evs.length - 1].timeFrom - t) < 0.01
      ) {
        return { ...prev, mainVideoName: videoName }; // no change needed
      }
      // If last event's timeFrom is same, override
      if (evs.length > 0 && Math.abs(evs[evs.length - 1].timeFrom - t) < 0.01) {
        evs[evs.length - 1] = { timeFrom: t, videoName };
      } else {
        evs = [...evs, { timeFrom: t, videoName }];
      }
      evs = getOrderedWithTimeTo(evs).map(({ timeTo, ...rest }) => rest); // order by timeFrom
      return { ...prev, mainVideoName: videoName, events: evs };
    });
  }

  // Play and pause
  const [playing, setPlaying] = useState(false);

  // When pressing play on master: play all visible videos & master preview
  function playAll() {
    setPlaying(true);
    videoRefs.forEach((ref) => {
      const v = ref.current;
      if (!v) return;
      void v.play();
    });
    if (masterRef.current) void masterRef.current.play();
  }
  function pauseAll() {
    setPlaying(false);
    videoRefs.forEach((ref) => {
      const v = ref.current;
      if (!v) return;
      v.pause();
    });
    if (masterRef.current) masterRef.current.pause();
  }
  function handlePlayPause() {
    playing ? pauseAll() : playAll();
  }

  // Use RAF to keep progress synced
  useEffect(() => {
    function tick() {
      if (!masterRef.current) return;
      setPersisted((p) => ({ ...p, progress: masterRef.current ? masterRef.current.currentTime : 0 }));
      rafId.current = requestAnimationFrame(tick);
    }
    if (playing) {
      rafId.current && cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(tick);
    }
    return () => rafId.current && cancelAnimationFrame(rafId.current);
  }, [playing]);

  // When master preview is played/paused, update UI
  useEffect(() => {
    function handlePlay() {
      setPlaying(true);
    }
    function handlePause() {
      setPlaying(false);
    }
    const master = masterRef.current;
    if (!master) return;
    master.addEventListener("play", handlePlay);
    master.addEventListener("pause", handlePause);
    return () => {
      master.removeEventListener("play", handlePlay);
      master.removeEventListener("pause", handlePause);
    };
  }, []);

  // Seek by slider
  function handleSliderChange(e: ChangeEvent<HTMLInputElement>) {
    const value = parseFloat(e.target.value);
    setPersisted((p) => ({ ...p, progress: value }));
  }

  // Get timeline (with timeTo) for event display, and for master preview switching
  const eventsOrderedWithTimeTo = useMemo(() => getOrderedWithTimeTo(events), [events]);
  // Just for UI display
  function videoNameToIdx(name: string) {
    const idx = VIDEO_NAMES.indexOf(name);
    return idx >= 0 ? idx : 0;
  }

  // Prevent video selection changing if slider drag is within the current segment (fixes flickering)
  // Not needed since useEffect handles this.

  return (
    <div>
      {/* Master preview: always shows current main video, at current time */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 16,
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>Master Preview</div>
        <video
          key={mainVideoName} // force reload on video change
          ref={masterRef}
          src={VIDEO_URLS[videoNameToIdx(mainVideoName)]}
          width={512}
          style={{
            display: "block",
            background: "#111",
            borderRadius: 10,
            border: "3px solid #2196f3",
            margin: "auto auto 1em auto",
          }}
          controls={false}
          muted
          playsInline
          tabIndex={0}
          onClick={() => {
            // Simple toggle play/pause
            playing ? pauseAll() : playAll();
          }}
          onLoadedMetadata={(e) => {
            // When switching videos, keep current time
            try {
              e.currentTarget.currentTime = Math.min(progress, e.currentTarget.duration || progress);
            } catch {}
          }}
        />
        <div style={{ marginTop: 3, fontSize: 14, color: "#555" }}>
          Current Main: <span style={{ fontWeight: 600, color: "#1976d2" }}>{mainVideoName}</span>
        </div>
      </div>

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
          style={{ width: 350, margin: "0 15px" }}
        />
        <span>
          {format(progress)} / {format(duration)}
        </span>
      </div>

      {/* Videos (switch main by clicking) */}
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
                // on switch, keep time in sync
                try {
                  e.currentTarget.currentTime = Math.min(progress, e.currentTarget.duration || progress);
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
              {VIDEO_NAMES[idx]}
              {idx === mainVideoIdx ? " — Main" : ""}
            </div>
          </div>
        ))}
      </div>

      {/* Event list: json with timeFrom, timeTo, videoName */}
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
                <td style={{ padding: 3, border: "1px solid #ccd" }}>{e.videoName}</td>
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
