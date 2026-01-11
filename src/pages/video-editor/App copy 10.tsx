import React, { useEffect, useRef, useState, useCallback } from "react";

// --- Types & Constants ---
export type TimeRange = [number, number];

const DEMO_VIDEO_SRC = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const DEMO_FILENAME = "demo_bunny_sample";

// =========================================
// UTILITY: IndexedDB Helper
// =========================================
const DB_NAME = "VideoEditorDB";
const STORE_NAME = "files";
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject("Error opening DB");
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const saveFileToDB = async (file: File) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(file, "currentVideo");
    request.onsuccess = () => resolve();
    request.onerror = () => reject("Error saving file");
  });
};

const getFileFromDB = async (): Promise<File | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("currentVideo");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject("Error getting file");
  });
};

const clearDB = async () => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).clear();
};

// =========================================
// COMPONENT: Segment Editor
// =========================================
interface SegmentEditorProps {
  segments: TimeRange[];
  onUpdate: (newSegments: TimeRange[]) => void;
  onPreview: (range: TimeRange) => void;
}

const SegmentEditor: React.FC<SegmentEditorProps> = ({ segments, onUpdate, onPreview }) => {
  const adjustTime = (index: number, position: 0 | 1, amount: number) => {
    const updated = [...segments];
    const newValue = updated[index][position] + amount;
    updated[index][position] = Math.max(0, Number(newValue.toFixed(2)));
    onUpdate(updated);
    onPreview(updated[index]);
  };

  const deleteSegment = (index: number) => {
    onUpdate(segments.filter((_, i) => i !== index));
  };

  const addSegment = () => {
    const lastEnd = segments.length > 0 ? segments[segments.length - 1][1] : 0;
    onUpdate([...segments, [lastEnd, lastEnd + 5]]);
  };

  return (
    <div className="bg-gray-950 p-4 rounded border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-400 text-sm uppercase tracking-wider">Visual Editor</h3>
        <span className="text-xs text-gray-600 bg-gray-900 px-2 py-1 rounded border border-gray-800">
          {segments.length} Segments
        </span>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
        {segments.map((seg, idx) => (
          <div
            key={idx}
            className="flex flex-col xl:flex-row items-center bg-gray-800 p-3 rounded gap-3 border border-gray-700 shadow-sm transition-colors hover:border-gray-600"
          >
            <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-start">
              <span className="text-blue-400 font-mono font-bold w-8 text-center">#{idx + 1}</span>
              {/* Play Single Segment Button */}
              <button
                onClick={() => onPreview(seg)}
                title="Play this segment only"
                className="w-8 h-8 flex flex-shrink-0 items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-md transition-colors"
              >
                ▶
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-4 w-full">
              {/* Start Control */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500 uppercase mr-1">Start</span>
                <button
                  onClick={() => adjustTime(idx, 0, -0.1)}
                  className="w-6 h-8 bg-gray-700 hover:bg-gray-600 rounded text-red-300 text-xs"
                >
                  .
                </button>
                <input
                  readOnly
                  className="w-16 bg-black text-center text-white font-mono p-1 rounded border border-gray-600"
                  value={seg[0].toFixed(2)}
                />
                <button
                  onClick={() => adjustTime(idx, 0, 0.1)}
                  className="w-6 h-8 bg-gray-700 hover:bg-gray-600 rounded text-green-300 text-xs"
                >
                  .
                </button>
              </div>

              {/* End Control */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500 uppercase mr-1">End</span>
                <button
                  onClick={() => adjustTime(idx, 1, -0.1)}
                  className="w-6 h-8 bg-gray-700 hover:bg-gray-600 rounded text-red-300 text-xs"
                >
                  .
                </button>
                <input
                  readOnly
                  className="w-16 bg-black text-center text-white font-mono p-1 rounded border border-gray-600"
                  value={seg[1].toFixed(2)}
                />
                <button
                  onClick={() => adjustTime(idx, 1, 0.1)}
                  className="w-6 h-8 bg-gray-700 hover:bg-gray-600 rounded text-green-300 text-xs"
                >
                  .
                </button>
              </div>
            </div>

            <button
              onClick={() => deleteSegment(idx)}
              className="ml-auto text-red-500 hover:text-red-400 text-xs hover:underline px-2 py-1"
            >
              Remove
            </button>
          </div>
        ))}

        {segments.length === 0 && (
          <p className="text-gray-500 text-center text-sm italic py-8 border-2 border-dashed border-gray-800 rounded">
            No segments created yet.
          </p>
        )}

        <button
          onClick={addSegment}
          className="w-full py-3 border-2 border-dashed border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white rounded transition font-bold text-sm bg-gray-900/50"
        >
          + Add New Segment
        </button>
      </div>
    </div>
  );
};

// =========================================
// MAIN APP COMPONENT
// =========================================

const App: React.FC = () => {
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [isLoadingFile, setIsLoadingFile] = useState(true);

  const [segments, setSegments] = useState<TimeRange[]>([]);
  const [jsonInput, setJsonInput] = useState("[]");
  const [error, setError] = useState<string | null>(null);
  const [shouldAutoSetDuration, setShouldAutoSetDuration] = useState(false);

  const player1Ref = useRef<HTMLVideoElement>(null);
  const player2Ref = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeListenerRef = useRef<{ element: HTMLVideoElement; fn: () => void } | null>(null);

  const playRef = useRef<(segmentIndex: number, currentPlayerIdx: 0 | 1, currentSegments: TimeRange[]) => void>(
    () => {}
  );
  const [activePlayerIndex, setActivePlayerIndex] = useState<0 | 1>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- 1. File Persistence Logic (IndexedDB) ---
  useEffect(() => {
    const restoreSession = async () => {
      setIsLoadingFile(true);
      try {
        const file = await getFileFromDB();
        if (file) {
          const url = URL.createObjectURL(file);
          setVideoSrc(url);
          setCurrentFileName(file.name);
          loadSettingsForFile(file.name);
        } else {
          setVideoSrc(DEMO_VIDEO_SRC);
          setCurrentFileName(DEMO_FILENAME);
          loadSettingsForFile(DEMO_FILENAME);
        }
      } catch (err) {
        console.error("Failed to restore video", err);
      } finally {
        setIsLoadingFile(false);
      }
    };
    restoreSession();
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    stopAll();
    setIsLoadingFile(true);

    if (videoSrc && videoSrc !== DEMO_VIDEO_SRC) {
      URL.revokeObjectURL(videoSrc);
    }

    try {
      await saveFileToDB(file);
      const objectUrl = URL.createObjectURL(file);
      setVideoSrc(objectUrl);
      setCurrentFileName(file.name);
      loadSettingsForFile(file.name);
    } catch (e) {
      console.error("Error saving file", e);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleClearData = async () => {
    stopAll();
    await clearDB();
    if (videoSrc !== DEMO_VIDEO_SRC) URL.revokeObjectURL(videoSrc);
    setVideoSrc(DEMO_VIDEO_SRC);
    setCurrentFileName(DEMO_FILENAME);
    loadSettingsForFile(DEMO_FILENAME);
    alert("Local video cleared.");
  };

  // --- 2. Settings & Segments Logic ---

  const loadSettingsForFile = (fileName: string) => {
    const savedData = localStorage.getItem(fileName);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSegments(parsed);
          setJsonInput(JSON.stringify(parsed));
          setError(null);
          setShouldAutoSetDuration(false);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    setShouldAutoSetDuration(true);
    setSegments([]);
    setJsonInput("[]");
  };

  const applyDurationToSegments = useCallback((duration: number) => {
    if (!isNaN(duration) && duration !== Infinity && duration > 0) {
      const newDefaults: TimeRange[] = [[0, duration]];
      setSegments(newDefaults);
      setJsonInput(JSON.stringify(newDefaults));
      setShouldAutoSetDuration(false);
    }
  }, []);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (shouldAutoSetDuration) {
      applyDurationToSegments(e.currentTarget.duration);
    }
  };

  // --- 3. Player Logic ---

  const getPlayers = useCallback(() => [player1Ref.current, player2Ref.current], []);

  const stopAll = useCallback(() => {
    const [p1, p2] = getPlayers();
    if (activeListenerRef.current) {
      activeListenerRef.current.element.removeEventListener("timeupdate", activeListenerRef.current.fn);
      activeListenerRef.current = null;
    }
    if (p1) p1.pause();
    if (p2) p2.pause();
    setIsPlaying(false);
  }, [getPlayers]);

  const handlePreviewSegment = useCallback(
    (range: TimeRange) => {
      const [start, end] = range;
      stopAll();
      const p1 = player1Ref.current;
      if (!p1) return;
      setActivePlayerIndex(0);
      setIsPlaying(true);
      p1.currentTime = start;
      p1.muted = false;
      p1.play().catch((e) => console.log(e));

      const timeHandler = () => {
        if (p1.currentTime >= end) {
          p1.pause();
          p1.removeEventListener("timeupdate", timeHandler);
          activeListenerRef.current = null;
          setIsPlaying(false);
        }
      };
      activeListenerRef.current = { element: p1, fn: timeHandler };
      p1.addEventListener("timeupdate", timeHandler);
    },
    [stopAll]
  );

  const playSegmentStep = useCallback(
    (segmentIndex: number, currentPlayerIdx: 0 | 1, currentSegments: TimeRange[]) => {
      const [p1, p2] = getPlayers();
      if (!p1 || !p2) return;

      if (segmentIndex >= currentSegments.length) {
        stopAll();
        return;
      }

      const players = [p1, p2];
      const currentPlayer = players[currentPlayerIdx];
      const nextPlayer = players[currentPlayerIdx === 0 ? 1 : 0];
      const [start, end] = currentSegments[segmentIndex];

      setActivePlayerIndex(currentPlayerIdx);
      setIsPlaying(true);

      if (Math.abs(currentPlayer.currentTime - start) > 0.5) currentPlayer.currentTime = start;
      currentPlayer.muted = false;
      currentPlayer.play().catch((e) => console.warn(e));

      if (segmentIndex + 1 < currentSegments.length) {
        const [nextStart] = currentSegments[segmentIndex + 1];
        nextPlayer.currentTime = nextStart;
        nextPlayer.pause();
      }

      const timeHandler = () => {
        if (currentPlayer.currentTime >= end) {
          currentPlayer.removeEventListener("timeupdate", timeHandler);
          activeListenerRef.current = null;
          currentPlayer.pause();
          const nextIdx = currentPlayerIdx === 0 ? 1 : 0;
          playRef.current(segmentIndex + 1, nextIdx, currentSegments);
        }
      };

      activeListenerRef.current = { element: currentPlayer, fn: timeHandler };
      currentPlayer.addEventListener("timeupdate", timeHandler);
    },
    [getPlayers, stopAll]
  );

  useEffect(() => {
    playRef.current = playSegmentStep;
  }, [playSegmentStep]);

  useEffect(() => {
    return () => {
      stopAll();
      if (videoSrc && videoSrc !== DEMO_VIDEO_SRC) URL.revokeObjectURL(videoSrc);
    };
  }, [videoSrc, stopAll]);

  // --- 4. Render Helpers ---
  const syncState = (newSegments: TimeRange[]) => {
    setSegments(newSegments);
    setJsonInput(JSON.stringify(newSegments));
    localStorage.setItem(currentFileName, JSON.stringify(newSegments));
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error("Must be an array");
      setError(null);
      syncState(parsed);
      startSequence(parsed);
    } catch (err: any) {
      setError(err.message);
      stopAll();
    }
  };

  const startSequence = (segs: TimeRange[]) => {
    stopAll();
    if (segs.length === 0) return;
    const [p1, p2] = getPlayers();
    if (!p1 || !p2) return;
    p1.currentTime = segs[0][0];
    if (segs.length > 1) p2.currentTime = segs[1][0];
    playSegmentStep(0, 0, segs);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-sans flex justify-center">
      {/* MAX WIDTH CONTAINER */}
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* ======================= */}
        {/* LEFT COLUMN (Sticky)    */}
        {/* ======================= */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">Gapless Video Editor</h1>
            <p className="text-gray-400 text-sm">Persisted locally via IndexedDB</p>
          </div>

          {/* File Selection */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-gray-500 text-xs uppercase mb-1">Current File</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-blue-400 font-bold truncate text-sm" title={currentFileName}>
                  {isLoadingFile ? "Loading..." : currentFileName}
                </p>
                {currentFileName !== DEMO_FILENAME && (
                  <button onClick={handleClearData} className="text-xs text-red-400 underline hover:text-red-300">
                    Clear
                  </button>
                )}
              </div>
            </div>
            <input type="file" ref={fileInputRef} accept="video/*" onChange={handleFileChange} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="whitespace-nowrap bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm font-bold border border-gray-600 transition"
            >
              {isLoadingFile ? "..." : "Open File"}
            </button>
          </div>

          {/* Video Player */}
          <div className="relative w-full bg-black aspect-video rounded-lg overflow-hidden border border-gray-800 shadow-2xl">
            {isLoadingFile && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black text-white">
                Loading...
              </div>
            )}
            <video
              ref={player1Ref}
              src={videoSrc}
              onLoadedMetadata={handleLoadedMetadata}
              preload="auto"
              muted
              className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-100 ${
                activePlayerIndex === 0 ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
              playsInline
            />
            <video
              ref={player2Ref}
              src={videoSrc}
              preload="auto"
              muted
              className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-100 ${
                activePlayerIndex === 1 ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
              playsInline
            />
            {!isPlaying && !isLoadingFile && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <button
                  onClick={() => startSequence(segments)}
                  className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-lg transform hover:scale-105"
                >
                  {segments.length === 0 ? "Load Video to Start" : "Play Sequence"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======================= */}
        {/* RIGHT COLUMN (Scrollable)*/}
        {/* ======================= */}
        <div className="flex flex-col gap-6">
          {/* Visual Editor */}
          <SegmentEditor segments={segments} onUpdate={syncState} onPreview={handlePreviewSegment} />

          {/* Raw JSON Editor */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-400 text-sm uppercase tracking-wider">Raw JSON</h3>
              <span className="text-xs text-gray-500">Edits sync to local storage</span>
            </div>
            <textarea
              className="w-full h-32 p-3 bg-gray-950 border border-gray-700 rounded font-mono text-xs text-green-400 focus:outline-none focus:border-blue-500"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            {error && <div className="text-red-400 mt-2 text-sm bg-red-900/20 p-2 rounded">{error}</div>}
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setJsonInput(JSON.stringify(segments))}
                className="px-4 py-2 bg-gray-700 rounded text-sm hover:bg-gray-600 transition"
              >
                Reset
              </button>
              <button
                onClick={handleApplyJson}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded text-sm hover:bg-blue-700 transition"
              >
                Apply JSON & Play
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
