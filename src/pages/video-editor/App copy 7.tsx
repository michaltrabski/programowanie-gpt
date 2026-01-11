import React, { useEffect, useRef, useState, useCallback } from "react";

// --- Types & Constants ---
export type TimeRange = [number, number];

const DEMO_VIDEO_SRC = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const DEMO_FILENAME = "demo_bunny_sample";

// =========================================
// NEW COMPONENT: Segment Editor
// =========================================
interface SegmentEditorProps {
  segments: TimeRange[];
  onUpdate: (newSegments: TimeRange[]) => void;
  // NEW: Callback to trigger preview
  onPreview: (range: TimeRange) => void;
}

const SegmentEditor: React.FC<SegmentEditorProps> = ({ segments, onUpdate, onPreview }) => {
  const adjustTime = (index: number, position: 0 | 1, amount: number) => {
    const updated = [...segments];
    // Update value, fix floating point errors, prevent negative numbers
    const newValue = updated[index][position] + amount;
    updated[index][position] = Math.max(0, Number(newValue.toFixed(2)));

    // 1. Update state
    onUpdate(updated);

    // 2. NEW: Trigger auto-preview of this specific segment immediately
    onPreview(updated[index]);
  };

  const deleteSegment = (index: number) => {
    const updated = segments.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  const addSegment = () => {
    // Add a new segment starting at the end of the last one (or 0 if empty)
    const lastEnd = segments.length > 0 ? segments[segments.length - 1][1] : 0;
    onUpdate([...segments, [lastEnd, lastEnd + 5]]);
  };

  return (
    <div className="bg-gray-950 p-4 rounded border border-gray-700 mb-4">
      <h3 className="font-bold text-gray-400 mb-3 text-sm uppercase tracking-wider">Visual Editor</h3>

      <div className="space-y-3">
        {segments.map((seg, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row items-center bg-gray-800 p-2 rounded gap-4 border border-gray-700 shadow-sm"
          >
            {/* Label */}
            <span className="text-blue-400 font-mono font-bold w-16 text-center">#{idx + 1}</span>

            {/* Start Control */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase">Start</span>

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
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase">End</span>

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

            {/* Delete */}
            <button
              onClick={() => deleteSegment(idx)}
              className="ml-auto text-red-500 hover:text-red-400 text-xs hover:underline px-2"
            >
              Remove
            </button>
          </div>
        ))}

        {segments.length === 0 && (
          <p className="text-gray-500 text-center text-sm italic py-2">No segments created yet.</p>
        )}

        <button
          onClick={addSegment}
          className="w-full py-2 border-2 border-dashed border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white rounded transition"
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
  // State: Video & File
  const [videoSrc, setVideoSrc] = useState<string>(DEMO_VIDEO_SRC);
  const [currentFileName, setCurrentFileName] = useState<string>(DEMO_FILENAME);

  // State: Segments & Config
  const [segments, setSegments] = useState<TimeRange[]>([]);
  const [jsonInput, setJsonInput] = useState(JSON.stringify(segments));
  const [error, setError] = useState<string | null>(null);

  // State: Auto-Duration Logic
  const [shouldAutoSetDuration, setShouldAutoSetDuration] = useState(false);

  // Refs
  const player1Ref = useRef<HTMLVideoElement>(null);
  const player2Ref = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeListenerRef = useRef<{ element: HTMLVideoElement; fn: () => void } | null>(null);

  // Player Logic State
  const playRef = useRef<(segmentIndex: number, currentPlayerIdx: 0 | 1, currentSegments: TimeRange[]) => void>(
    () => {}
  );
  const [activePlayerIndex, setActivePlayerIndex] = useState<0 | 1>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 1. Load Settings
  const loadSettingsForFile = useCallback((fileName: string) => {
    const savedData = localStorage.getItem(fileName);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSegments(parsed);
          setJsonInput(JSON.stringify(parsed));
          setError(null);
          setShouldAutoSetDuration(false);
          console.log(`Loaded saved config for: ${fileName}`);
          return;
        }
      } catch (e) {
        console.error("Error loading saved segments", e);
      }
    }
    // No save found
    setShouldAutoSetDuration(true);
    setSegments([]);
    setJsonInput("[]");
    console.log(`No saved config for ${fileName}, waiting for metadata...`);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    stopAll();
    const objectUrl = URL.createObjectURL(file);
    setVideoSrc(objectUrl);
    setCurrentFileName(file.name);
    loadSettingsForFile(file.name);
  };

  useEffect(() => {
    loadSettingsForFile(DEMO_FILENAME);
  }, [loadSettingsForFile]);

  // 2. Metadata Handling (Auto-Duration)
  const applyDurationToSegments = useCallback((duration: number) => {
    if (!isNaN(duration) && duration !== Infinity && duration > 0) {
      const newDefaults: TimeRange[] = [[0, duration]];
      setSegments(newDefaults);
      setJsonInput(JSON.stringify(newDefaults));
      setShouldAutoSetDuration(false);
      console.log(`Auto-set default segment: 0 - ${duration}`);
    }
  }, []);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (shouldAutoSetDuration) {
      applyDurationToSegments(e.currentTarget.duration);
    }
  };

  // Race condition fix
  useEffect(() => {
    if (shouldAutoSetDuration && player1Ref.current && player1Ref.current.readyState >= 1) {
      applyDurationToSegments(player1Ref.current.duration);
    }
  }, [shouldAutoSetDuration, applyDurationToSegments]);

  // 3. Player Core Logic
  const getPlayers = useCallback(() => {
    return [player1Ref.current, player2Ref.current];
  }, []);

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

  // NEW: Logic to play a single segment for previewing edits
  const handlePreviewSegment = useCallback(
    (range: TimeRange) => {
      const [start, end] = range;
      stopAll(); // Ensure clean slate

      const p1 = player1Ref.current;
      if (!p1) return;

      setActivePlayerIndex(0); // Use Player 1 for previews
      setIsPlaying(true);

      // Set start time
      p1.currentTime = start;
      p1.muted = false;

      const playPromise = p1.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => console.log("Playback aborted", e));
      }

      // Add listener to stop exactly at end
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

      if (Math.abs(currentPlayer.currentTime - start) > 0.5) {
        currentPlayer.currentTime = start;
      }
      currentPlayer.muted = false;
      currentPlayer.play().catch((e) => console.warn("Autoplay blocked:", e));

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
      if (videoSrc !== DEMO_VIDEO_SRC) URL.revokeObjectURL(videoSrc);
    };
  }, [videoSrc, stopAll]);

  // 4. Interaction Handlers
  const startSequence = (segs: TimeRange[]) => {
    stopAll();
    if (segs.length === 0) return;
    const [p1, p2] = getPlayers();
    if (!p1 || !p2) return;
    p1.currentTime = segs[0][0];
    if (segs.length > 1) p2.currentTime = segs[1][0];
    playSegmentStep(0, 0, segs);
  };

  const syncState = (newSegments: TimeRange[]) => {
    setSegments(newSegments);
    setJsonInput(JSON.stringify(newSegments));
    // Auto-save
    localStorage.setItem(currentFileName, JSON.stringify(newSegments));
  };

  // Handler for Manual JSON edits (text area)
  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error("Must be an array");
      parsed.forEach((item) => {
        if (!Array.isArray(item) || item.length !== 2) throw new Error("Item must be [start, end]");
      });
      setError(null);
      syncState(parsed);
      startSequence(parsed);
    } catch (err: any) {
      setError(err.message);
      stopAll();
    }
  };

  const handlePlayCurrent = () => startSequence(segments);
  const handleResetInput = () => setJsonInput(JSON.stringify(segments));

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8 font-sans">
      <h1 className="text-3xl font-bold mb-2">Local File Gapless Player</h1>

      {/* File Selection */}
      <div className="w-full max-w-2xl bg-gray-800 p-4 rounded-lg mb-4 flex items-center justify-between border border-gray-700">
        <div>
          <p className="text-gray-400 text-sm">Current Video:</p>
          <p className="font-mono text-blue-400 font-bold truncate max-w-md">{currentFileName}</p>
        </div>
        <input type="file" ref={fileInputRef} accept="video/*" onChange={handleFileChange} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm font-bold"
        >
          Choose Local File
        </button>
      </div>

      {/* Video Player */}
      <div className="relative w-full max-w-2xl bg-black aspect-video rounded-lg overflow-hidden border border-gray-800 mb-6">
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
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <button
              onClick={handlePlayCurrent}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition"
            >
              {segments.length === 0 ? "Load Video to Start" : "Play Sequence"}
            </button>
          </div>
        )}
      </div>

      {/* Controls Container */}
      <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg">
        {/* NEW: Visual Editor Component */}
        <SegmentEditor
          segments={segments}
          onUpdate={(newSegs) => {
            syncState(newSegs);
          }}
          // Pass the preview handler here
          onPreview={handlePreviewSegment}
        />

        <div className="border-t border-gray-700 pt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block font-bold text-gray-300">Raw JSON Data:</label>
            <span className="text-xs text-gray-500">Edits sync automatically</span>
          </div>

          <textarea
            className="w-full h-24 p-3 bg-gray-950 border border-gray-700 rounded font-mono text-green-400 focus:outline-none focus:border-blue-500"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />

          {error && <div className="text-red-400 mt-2 text-sm">{error}</div>}

          <div className="mt-4 flex justify-end gap-3">
            <button onClick={handleResetInput} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
              Reset to Active
            </button>
            <button
              onClick={handleApplyJson}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition"
            >
              Apply JSON & Play
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
