import React, { useState } from "react";

function calculateWinner(squares) {
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
  for (let line of lines) {
    const [a, b, c] = line;
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

export default function TicTacToe() {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);

  const winner = calculateWinner(squares);
  const isDraw = !winner && squares.every((square) => square);

  function handleClick(index) {
    if (squares[index] || winner) return;
    const newSquares = squares.slice();
    newSquares[index] = xIsNext ? "X" : "O";
    setSquares(newSquares);
    setXIsNext(!xIsNext);
  }

  function handleRestart() {
    setSquares(Array(9).fill(null));
    setXIsNext(true);
  }

  let status;
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
          >
            {value}
          </button>
        ))}
      </div>
      <div style={{ fontSize: "1.2rem", marginBottom: "10px" }}>{status}</div>
      {(winner || isDraw) && <button onClick={handleRestart}>Zagraj ponownie</button>}
    </div>
  );
}
