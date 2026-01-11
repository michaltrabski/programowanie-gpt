import React, { useEffect, useRef, useState, useCallback } from "react";

// --- Types & Constants ---
export type TimeRange = [number, number];
const SAMPLE_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const App: React.FC = () => {
  // =========================================
  // 1. CONFIGURATION STATE
  // =========================================
  const [segments, setSegments] = useState<TimeRange[]>([
    [2, 3],
    [7, 8.5],
    [11, 13],
  ]);
  const [jsonInput, setJsonInput] = useState(JSON.stringify(segments));
  const [error, setError] = useState<string | null>(null);

  // =========================================
  // 2. PLAYER STATE & REFS
  // =========================================
  const player1Ref = useRef<HTMLVideoElement>(null);
  const player2Ref = useRef<HTMLVideoElement>(null);

  const activeListenerRef = useRef<{
    element: HTMLVideoElement;
    fn: () => void;
  } | null>(null);

  // Ref to hold the recursive play function
  const playRef = useRef<(segmentIndex: number, currentPlayerIdx: 0 | 1, currentSegments: TimeRange[]) => void>(
    () => {}
  );

  const [activePlayerIndex, setActivePlayerIndex] = useState<0 | 1>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // =========================================
  // 3. CORE VIDEO LOGIC
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
        console.log("All segments finished");
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

  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  // =========================================
  // 4. ACTION HANDLERS
  // =========================================

  const startSequence = (segs: TimeRange[]) => {
    stopAll();

    if (segs.length === 0) return;

    const [p1, p2] = getPlayers();
    if (!p1 || !p2) return;

    // Init positions
    p1.currentTime = segs[0][0];
    if (segs.length > 1) {
      p2.currentTime = segs[1][0];
    }

    // Start
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

      // Update State
      setSegments(parsed);
      setError(null);

      // Trigger Play immediately with parsed data
      // (Using parsed variable directly avoids waiting for state update cycle)
      startSequence(parsed);
    } catch (err: any) {
      setError(err.message);
      stopAll(); // Stop if error occurs
    }
  };

  // Re-play existing state
  const handlePlayCurrent = () => {
    startSequence(segments);
  };

  const handleResetInput = () => {
    setJsonInput(JSON.stringify(segments));
  };

  // =========================================
  // 5. RENDER
  // =========================================
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6">Gapless Editor & Player</h1>

      {/* --- VIDEO CONTAINER --- */}
      <div className="relative w-full max-w-2xl bg-black aspect-video rounded-lg overflow-hidden border border-gray-800 mb-6">
        <video
          ref={player1Ref}
          src={SAMPLE_VIDEO}
          className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-100 ${
            activePlayerIndex === 0 ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          playsInline
        />
        <video
          ref={player2Ref}
          src={SAMPLE_VIDEO}
          className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-100 ${
            activePlayerIndex === 1 ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          playsInline
        />

        {/* Overlay Play Button (Only visible if stopped) */}
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
        <label className="block mb-2 font-bold text-gray-300">Edit Segments (JSON):</label>

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
            Apply & Play
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
