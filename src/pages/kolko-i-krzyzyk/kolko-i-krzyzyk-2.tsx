import React, { useState, useEffect } from "react";

type SquareValue = "X" | "O" | null;
type GameResult = {
  id: number;
  winner: "X" | "O" | "Draw";
  date: string;
  moves: number;
};

function calculateWinner(squares: SquareValue[]): "X" | "O" | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

const GAMES_LS_KEY = "tictactoe.games";

export default function TicTacToe() {
  const [squares, setSquares] = useState<SquareValue[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState<boolean>(true);
  const [gameHistory, setGameHistory] = useState<GameResult[]>([]);
  const [gameId, setGameId] = useState<number>(Date.now());

  const winner = calculateWinner(squares);
  const isDraw = !winner && squares.every((sq) => sq !== null);

  // Load game history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(GAMES_LS_KEY);
    if (stored) setGameHistory(JSON.parse(stored));
  }, []);

  // Persist gameHistory to localStorage
  useEffect(() => {
    localStorage.setItem(GAMES_LS_KEY, JSON.stringify(gameHistory));
  }, [gameHistory]);

  function handleClick(index: number) {
    if (squares[index] || winner) return;
    const newSquares = squares.slice();
    newSquares[index] = xIsNext ? "X" : "O";
    setSquares(newSquares);
    setXIsNext(!xIsNext);
  }

  // On winning/draw, save game to history
  useEffect(() => {
    if (winner || isDraw) {
      const result: GameResult = {
        id: gameId,
        winner: winner ? winner : "Draw",
        date: new Date().toLocaleString(),
        moves: squares.filter(Boolean).length,
      };
      setGameHistory((prev) => [result, ...prev]);
    }
    // eslint-disable-next-line
  }, [winner, isDraw]);

  function handleRestart() {
    setSquares(Array(9).fill(null));
    setXIsNext(true);
    setGameId(Date.now());
  }

  let status: React.ReactNode;
  if (winner) {
    status = `Wygrał: ${winner}`;
  } else if (isDraw) {
    status = "Remis!";
  } else {
    status = `Ruch: ${xIsNext ? "X" : "O"}`;
  }

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h1>Kółko i Krzyżyk</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 60px)",
          gap: "5px",
          justifyContent: "center",
          margin: "20px 0",
        }}
      >
        {squares.map((value, idx) => (
          <button
            key={idx}
            style={{
              width: "60px",
              height: "60px",
              fontSize: "2rem",
              cursor: value || winner ? "not-allowed" : "pointer",
            }}
            onClick={() => handleClick(idx)}
            aria-label={`Pozycja ${idx + 1}`}
          >
            {value}
          </button>
        ))}
      </div>
      <div style={{ fontSize: "1.2rem", marginBottom: "10px" }}>{status}</div>
      {/* Always show reset (not just when finished) */}
      <button onClick={handleRestart} style={{ marginBottom: 20 }}>
        {winner || isDraw ? "Zagraj ponownie" : "Resetuj grę"}
      </button>

      <h2>Historia rozgrywek</h2>
      {gameHistory.length === 0 ? (
        <div>Brak rozegranych gier.</div>
      ) : (
        <table
          style={{
            margin: "0 auto",
            borderCollapse: "collapse",
            minWidth: 300,
            maxWidth: 400,
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Data</th>
              <th style={thStyle}>Wynik</th>
              <th style={thStyle}>Ruchy</th>
            </tr>
          </thead>
          <tbody>
            {gameHistory.map((g, idx) => (
              <tr key={g.id} style={idx % 2 ? rowEven : undefined}>
                <td style={tdStyle}>{gameHistory.length - idx}</td>
                <td style={tdStyle}>{g.date}</td>
                <td style={tdStyle}>{g.winner === "Draw" ? "Remis" : `Wygrał ${g.winner}`}</td>
                <td style={tdStyle}>{g.moves}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: "1px solid #aaa",
  padding: "4px 8px",
  background: "#eee",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #aaa",
  padding: "4px 8px",
};

const rowEven: React.CSSProperties = {
  background: "#f9f9f9",
};
