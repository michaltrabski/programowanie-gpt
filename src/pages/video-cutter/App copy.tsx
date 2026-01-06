import React, { useEffect, useRef, useState, useCallback } from "react";

const SAMPLE_VIDEO = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export type TimeRange = [number, number];

const App: React.FC = () => {
  // Default segments
  const [segments, setSegments] = useState<TimeRange[]>([
    [2, 3],
    [7, 8.5],
    [11, 13],
  ]);

  // String representation for the textarea
  const [jsonInput, setJsonInput] = useState(JSON.stringify(segments));
  const [error, setError] = useState<string | null>(null);

  // Toggling this ID forces the player to re-mount/reset when user clicks "Apply"
  const [remountKey, setRemountKey] = useState(0);

  const handleApply = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error("Must be an array");

      // Basic validation
      parsed.forEach((item) => {
        if (!Array.isArray(item) || item.length !== 2) throw new Error("Each item must be [start, end]");
      });

      setSegments(parsed);
      setError(null);
      setRemountKey((prev) => prev + 1); // Force restart
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6">React Gapless Player</h1>

      {/* The Player Component */}
      <div className="w-full max-w-2xl mb-6">
        <GaplessVideoPlayer
          key={remountKey} // Changing key resets the internal state of the player
          src={SAMPLE_VIDEO}
          segments={segments}
          autoPlay={false}
          onAllSegmentsFinished={() => console.log("Done!")}
        />
      </div>

      {/* Controls */}
      <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg">
        <label className="block mb-2 font-bold text-gray-300">Edit Segments (JSON):</label>

        <textarea
          className="w-full h-24 p-3 bg-gray-950 border border-gray-700 rounded font-mono text-green-400 focus:outline-none focus:border-blue-500"
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
        />

        {error && <div className="text-red-400 mt-2 text-sm">{error}</div>}

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => setRemountKey((p) => p + 1)}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Reset
          </button>
          <button onClick={handleApply} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 font-bold">
            Apply & Play
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;

interface GaplessPlayerProps {
  src: string;
  segments: TimeRange[];
  autoPlay?: boolean;
  onAllSegmentsFinished?: () => void;
}

export const GaplessVideoPlayer: React.FC<GaplessPlayerProps> = ({
  src,
  segments,
  autoPlay = false,
  onAllSegmentsFinished,
}) => {
  // References to the two video elements
  const player1Ref = useRef<HTMLVideoElement>(null);
  const player2Ref = useRef<HTMLVideoElement>(null);

  // We use a ref to store the current active listener so we can cleanup properly
  // without needing it in the dependency array.
  const activeListenerRef = useRef<{
    element: HTMLVideoElement;
    fn: () => void;
  } | null>(null);

  // State to toggle visibility classes
  // 0 = player1 is active, 1 = player2 is active
  const [activePlayerIndex, setActivePlayerIndex] = useState<0 | 1>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- Helper: Get the actual DOM elements safely ---
  const getPlayers = useCallback(() => {
    return [player1Ref.current, player2Ref.current];
  }, []);

  // --- Core Logic: Stop Everything ---
  const stopAll = useCallback(() => {
    const [p1, p2] = getPlayers();

    // Remove listeners
    if (activeListenerRef.current) {
      activeListenerRef.current.element.removeEventListener("timeupdate", activeListenerRef.current.fn);
      activeListenerRef.current = null;
    }

    // Pause videos
    if (p1) p1.pause();
    if (p2) p2.pause();

    setIsPlaying(false);
  }, [getPlayers]);

  // --- Core Logic: Play Specific Segment ---
  const playSegmentStep = useCallback(
    (segmentIndex: number, currentPlayerIdx: 0 | 1) => {
      const [p1, p2] = getPlayers();
      if (!p1 || !p2) return;

      // 1. Check if finished
      if (segmentIndex >= segments.length) {
        stopAll();
        if (onAllSegmentsFinished) onAllSegmentsFinished();
        return;
      }

      const players = [p1, p2];
      const currentPlayer = players[currentPlayerIdx];
      const nextPlayer = players[currentPlayerIdx === 0 ? 1 : 0];
      const [start, end] = segments[segmentIndex];

      // 2. Switch UI (Visuals)
      setActivePlayerIndex(currentPlayerIdx);
      setIsPlaying(true);

      // 3. Play Current
      // Safety: Ensure time is set (in case of drift or first run)
      if (Math.abs(currentPlayer.currentTime - start) > 0.5) {
        currentPlayer.currentTime = start;
      }

      currentPlayer.play().catch((e) => console.warn("Autoplay prevented:", e));

      // 4. Preload Next (Background)
      if (segmentIndex + 1 < segments.length) {
        const [nextStart] = segments[segmentIndex + 1];
        nextPlayer.currentTime = nextStart;
        nextPlayer.pause(); // Ensure it waits
      }

      // 5. Monitor End of Segment
      const timeHandler = () => {
        if (currentPlayer.currentTime >= end) {
          // Clean up this listener
          currentPlayer.removeEventListener("timeupdate", timeHandler);
          activeListenerRef.current = null;

          // Pause current
          currentPlayer.pause();

          // Swap players and process next segment
          const nextIdx = currentPlayerIdx === 0 ? 1 : 0;
          playSegmentStep(segmentIndex + 1, nextIdx);
        }
      };

      // Register listener
      activeListenerRef.current = { element: currentPlayer, fn: timeHandler };
      currentPlayer.addEventListener("timeupdate", timeHandler);
    },
    [segments, getPlayers, stopAll, onAllSegmentsFinished]
  );

  // --- Public: Start Sequence ---
  const playSequence = useCallback(() => {
    stopAll(); // Reset previous runs

    if (segments.length === 0) return;

    const [p1, p2] = getPlayers();
    if (!p1 || !p2) return;

    // Initialize: Player 1 at start, Player 2 at second segment (if exists)
    p1.currentTime = segments[0][0];
    if (segments.length > 1) {
      p2.currentTime = segments[1][0];
    }

    // Start loop with Player 1 (Index 0)
    playSegmentStep(0, 0);
  }, [segments, stopAll, playSegmentStep, getPlayers]);

  // Effect: Handle AutoPlay or Props Change
  useEffect(() => {
    if (autoPlay) {
      playSequence();
    }
    // Cleanup on unmount or if segments change
    return () => stopAll();
  }, [segments, autoPlay, playSequence, stopAll]);

  return (
    <div className="relative w-full max-w-2xl bg-black aspect-video rounded-lg overflow-hidden border border-gray-800">
      {/* Player 1 */}
      <video
        ref={player1Ref}
        src={src}
        className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-100 ${
          activePlayerIndex === 0 ? "opacity-100 z-10" : "opacity-0 z-0"
        }`}
        playsInline
        muted={false}
      />

      {/* Player 2 */}
      <video
        ref={player2Ref}
        src={src}
        className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-100 ${
          activePlayerIndex === 1 ? "opacity-100 z-10" : "opacity-0 z-0"
        }`}
        playsInline
        muted={false}
      />

      {/* Optional Overlay / Controls if needed */}
      {!isPlaying && !autoPlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <button
            onClick={playSequence}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition"
          >
            Play Segments
          </button>
        </div>
      )}
    </div>
  );
};
