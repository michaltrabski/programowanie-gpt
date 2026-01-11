import React, { useEffect, useRef, useState, useCallback } from "react";

// --- Types & Constants ---
export type TimeRange = [number, number];
const SAMPLE_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const App: React.FC = () => {
  // =========================================
  // 1. CONFIGURATION STATE (User Inputs)
  // =========================================
  const [segments, setSegments] = useState<TimeRange[]>([
    [2, 3],
    [7, 8.5],
    [11, 13],
  ]);
  const [jsonInput, setJsonInput] = useState(JSON.stringify(segments));
  const [error, setError] = useState<string | null>(null);

  // =========================================
  // 2. PLAYER STATE & REFS (Playback Logic)
  // =========================================
  const player1Ref = useRef<HTMLVideoElement>(null);
  const player2Ref = useRef<HTMLVideoElement>(null);

  // Holds the active event listener so we can remove it later
  const activeListenerRef = useRef<{
    element: HTMLVideoElement;
    fn: () => void;
  } | null>(null);

  // Ref to hold the recursive play function
  const playRef = useRef<(segmentIndex: number, currentPlayerIdx: 0 | 1) => void>(() => {});

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

    // Remove active listener if exists
    if (activeListenerRef.current) {
      activeListenerRef.current.element.removeEventListener("timeupdate", activeListenerRef.current.fn);
      activeListenerRef.current = null;
    }

    // Pause both videos
    if (p1) p1.pause();
    if (p2) p2.pause();

    setIsPlaying(false);
  }, [getPlayers]);

  const playSegmentStep = useCallback(
    (segmentIndex: number, currentPlayerIdx: 0 | 1) => {
      const [p1, p2] = getPlayers();
      if (!p1 || !p2) return;

      // -- End of Sequence Check --
      if (segmentIndex >= segments.length) {
        stopAll();
        console.log("All segments finished");
        return;
      }

      const players = [p1, p2];
      const currentPlayer = players[currentPlayerIdx];
      const nextPlayer = players[currentPlayerIdx === 0 ? 1 : 0];
      const [start, end] = segments[segmentIndex];

      // -- Switch Visuals --
      setActivePlayerIndex(currentPlayerIdx);
      setIsPlaying(true);

      // -- Play Current --
      if (Math.abs(currentPlayer.currentTime - start) > 0.5) {
        currentPlayer.currentTime = start;
      }
      currentPlayer.play().catch((e) => console.warn("Autoplay blocked:", e));

      // -- Preload Next (Background) --
      if (segmentIndex + 1 < segments.length) {
        const [nextStart] = segments[segmentIndex + 1];
        nextPlayer.currentTime = nextStart;
        nextPlayer.pause();
      }

      // -- Monitor Time (Event Listener) --
      const timeHandler = () => {
        if (currentPlayer.currentTime >= end) {
          // Cleanup this specific listener
          currentPlayer.removeEventListener("timeupdate", timeHandler);
          activeListenerRef.current = null;

          // Pause current
          currentPlayer.pause();

          // Recurse to next segment
          const nextIdx = currentPlayerIdx === 0 ? 1 : 0;
          playRef.current(segmentIndex + 1, nextIdx);
        }
      };

      activeListenerRef.current = { element: currentPlayer, fn: timeHandler };
      currentPlayer.addEventListener("timeupdate", timeHandler);
    },
    [segments, getPlayers, stopAll]
  );

  // Keep ref updated
  useEffect(() => {
    playRef.current = playSegmentStep;
  }, [playSegmentStep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  // =========================================
  // 4. HANDLERS (Buttons)
  // =========================================

  const handleStartSequence = () => {
    stopAll(); // Reset previous state

    if (segments.length === 0) return;

    const [p1, p2] = getPlayers();
    if (!p1 || !p2) return;

    // Initialize positions
    p1.currentTime = segments[0][0];
    if (segments.length > 1) {
      p2.currentTime = segments[1][0];
    }

    // Start
    playSegmentStep(0, 0);
  };

  const handleApply = () => {
    stopAll(); // Stop video before applying changes
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error("Must be an array");
      parsed.forEach((item) => {
        if (!Array.isArray(item) || item.length !== 2) throw new Error("Each item must be [start, end]");
      });

      setSegments(parsed);
      setError(null);
      // We don't auto-start here; user clicks Play to confirm
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReset = () => {
    stopAll();
    // Just resetting the input text doesn't change the active segments until Apply is clicked,
    // or you can setSegments directly here if you want immediate reset.
    setJsonInput(JSON.stringify(segments));
  };

  // =========================================
  // 5. RENDER
  // =========================================
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6">Single Component Gapless Player</h1>

      {/* --- VIDEO CONTAINER --- */}
      <div className="relative w-full max-w-2xl bg-black aspect-video rounded-lg overflow-hidden border border-gray-800 mb-6">
        {/* Player 1 */}
        <video
          ref={player1Ref}
          src={SAMPLE_VIDEO}
          className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-100 ${
            activePlayerIndex === 0 ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          playsInline
        />

        {/* Player 2 */}
        <video
          ref={player2Ref}
          src={SAMPLE_VIDEO}
          className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-100 ${
            activePlayerIndex === 1 ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          playsInline
        />

        {/* Overlay Play Button */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <button
              onClick={handleStartSequence}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition"
            >
              {segments.length > 0 ? "Play Segments" : "No Segments"}
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
          <button onClick={handleReset} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
            Reset
          </button>
          <button onClick={handleApply} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 font-bold">
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
