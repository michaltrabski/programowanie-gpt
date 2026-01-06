import React, { useEffect, useRef, useState, useCallback } from "react";

// --- Types & Constants ---
export type TimeRange = [number, number];

// Default fallback (Demo)
const DEMO_VIDEO_SRC = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const DEMO_FILENAME = "demo_bunny_sample";

const App: React.FC = () => {
  // =========================================
  // 1. STATE: Video Source & Storage
  // =========================================
  const [videoSrc, setVideoSrc] = useState<string>(DEMO_VIDEO_SRC);
  const [currentFileName, setCurrentFileName] = useState<string>(DEMO_FILENAME);

  // =========================================
  // 2. STATE: Configuration (Segments)
  // =========================================
  const [segments, setSegments] = useState<TimeRange[]>([]);
  const [jsonInput, setJsonInput] = useState(JSON.stringify(segments));
  const [error, setError] = useState<string | null>(null);

  // =========================================
  // 3. PLAYER REFS & STATE
  // =========================================
  const player1Ref = useRef<HTMLVideoElement>(null);
  const player2Ref = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeListenerRef = useRef<{
    element: HTMLVideoElement;
    fn: () => void;
  } | null>(null);

  // Recursive play reference
  const playRef = useRef<(segmentIndex: number, currentPlayerIdx: 0 | 1, currentSegments: TimeRange[]) => void>(
    () => {}
  );

  const [activePlayerIndex, setActivePlayerIndex] = useState<0 | 1>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // =========================================
  // 4. FILE HANDLING & STORAGE LOGIC
  // =========================================

  // Load settings from LocalStorage when filename changes
  const loadSettingsForFile = (fileName: string) => {
    const savedData = localStorage.getItem(fileName);

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed)) {
          setSegments(parsed);
          setJsonInput(JSON.stringify(parsed));
          setError(null);
          console.log(`Loaded saved config for: ${fileName}`);
          return;
        }
      } catch (e) {
        console.error("Error loading saved segments", e);
      }
    }

    // Default if no save found
    const defaults: TimeRange[] = [[0, 5]]; // Default 0-5s for new files
    setSegments(defaults);
    setJsonInput(JSON.stringify(defaults));
    console.log(`No saved config for ${fileName}, used defaults.`);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    stopAll(); // Stop current playback

    // 1. Create URL for local file
    const objectUrl = URL.createObjectURL(file);
    setVideoSrc(objectUrl);

    // 2. Set Filename
    setCurrentFileName(file.name);

    // 3. Check LocalStorage
    loadSettingsForFile(file.name);
  };

  // Initial load check for the demo file
  useEffect(() => {
    loadSettingsForFile(DEMO_FILENAME);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================
  // 5. CORE GAPLESS PLAYER LOGIC
  // =========================================

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

      // Switch Visuals
      setActivePlayerIndex(currentPlayerIdx);
      setIsPlaying(true);

      // Play Current
      if (Math.abs(currentPlayer.currentTime - start) > 0.5) {
        currentPlayer.currentTime = start;
      }
      currentPlayer.play().catch((e) => console.warn("Autoplay blocked:", e));

      // Preload Next
      if (segmentIndex + 1 < currentSegments.length) {
        const [nextStart] = currentSegments[segmentIndex + 1];
        nextPlayer.currentTime = nextStart;
        nextPlayer.pause();
      }

      // Monitor Time
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

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      stopAll();
      if (videoSrc !== DEMO_VIDEO_SRC) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc, stopAll]);

  // =========================================
  // 6. ACTION HANDLERS
  // =========================================

  const startSequence = (segs: TimeRange[]) => {
    stopAll();

    if (segs.length === 0) return;

    const [p1, p2] = getPlayers();
    if (!p1 || !p2) return;

    p1.currentTime = segs[0][0];
    if (segs.length > 1) {
      p2.currentTime = segs[1][0];
    }

    playSegmentStep(0, 0, segs);
  };

  const handleApplyAndPlay = () => {
    try {
      const parsed = JSON.parse(jsonInput);

      // Validation
      if (!Array.isArray(parsed)) throw new Error("Must be an array");
      parsed.forEach((item) => {
        if (!Array.isArray(item) || item.length !== 2) throw new Error("Each item must be [start, end]");
      });

      // 1. Update State
      setSegments(parsed);
      setError(null);

      // 2. Save to LocalStorage using filename as key
      localStorage.setItem(currentFileName, JSON.stringify(parsed));
      console.log(`Saved config to LocalStorage for key: ${currentFileName}`);

      // 3. Play
      startSequence(parsed);
    } catch (err: any) {
      setError(err.message);
      stopAll();
    }
  };

  const handlePlayCurrent = () => {
    startSequence(segments);
  };

  const handleResetInput = () => {
    setJsonInput(JSON.stringify(segments));
  };

  // =========================================
  // 7. RENDER
  // =========================================
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8 font-sans">
      <h1 className="text-3xl font-bold mb-2">Local File Gapless Player</h1>

      {/* File Selection Bar */}
      <div className="w-full max-w-2xl bg-gray-800 p-4 rounded-lg mb-4 flex items-center justify-between border border-gray-700">
        <div>
          <p className="text-gray-400 text-sm">Current Video:</p>
          <p className="font-mono text-blue-400 font-bold truncate max-w-md">{currentFileName}</p>
        </div>
        <div>
          <input type="file" ref={fileInputRef} accept="video/*" onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm font-bold"
          >
            Choose Local File
          </button>
        </div>
      </div>

      {/* --- VIDEO CONTAINER --- */}
      <div className="relative w-full max-w-2xl bg-black aspect-video rounded-lg overflow-hidden border border-gray-800 mb-6">
        <video
          ref={player1Ref}
          src={videoSrc}
          className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-100 ${
            activePlayerIndex === 0 ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          playsInline
        />
        <video
          ref={player2Ref}
          src={videoSrc}
          className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-100 ${
            activePlayerIndex === 1 ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          playsInline
        />

        {/* Overlay Play Button */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <button
              onClick={handlePlayCurrent}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition"
            >
              Replay Current
            </button>
          </div>
        )}
      </div>

      {/* --- CONTROLS --- */}
      <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <label className="block font-bold text-gray-300">Edit Segments (JSON):</label>
          <span className="text-xs text-gray-500">Changes auto-save to Browser Storage</span>
        </div>

        <textarea
          className="w-full h-24 p-3 bg-gray-950 border border-gray-700 rounded font-mono text-green-400 focus:outline-none focus:border-blue-500"
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
        />

        {error && <div className="text-red-400 mt-2 text-sm">{error}</div>}

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={handleResetInput} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
            Undo Edits
          </button>
          <button
            onClick={handleApplyAndPlay}
            className="px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition"
          >
            Save & Play
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
