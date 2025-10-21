import React, { useState, useEffect } from "react";

type SquareValue = "X" | "O" | null;
type PlayerNames = { X: string; O: string };
type GameResult = {
  id: number;
  winner: "X" | "O" | "Draw";
  date: string;
  moves: number;
  players: PlayerNames;
};

const GAMES_LS_KEY = "tictactoe.games";

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

const defaultNames: PlayerNames = { X: "Gracz X", O: "Gracz O" };

export default function TicTacToe() {
  const [squares, setSquares] = useState<SquareValue[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState<boolean>(true);
  const [playerNames, setPlayerNames] = useState<PlayerNames>(defaultNames);
  const [editingNames, setEditingNames] = useState<PlayerNames>(defaultNames);
  const [namesSet, setNamesSet] = useState<boolean>(false);
  const [gameHistory, setGameHistory] = useState<GameResult[]>([]);
  const [gameId, setGameId] = useState<number>(Date.now());

  const winner = calculateWinner(squares);
  const isDraw = !winner && squares.every((sq) => sq !== null);

  // Load games from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(GAMES_LS_KEY);
    if (stored) setGameHistory(JSON.parse(stored));
  }, []);

  // Save games history to localStorage
  useEffect(() => {
    localStorage.setItem(GAMES_LS_KEY, JSON.stringify(gameHistory));
  }, [gameHistory]);

  // Save current game when finished
  useEffect(() => {
    if ((winner || isDraw) && namesSet) {
      setTimeout(() => {
        // Delay so winner display updates before reset is possible
        const result: GameResult = {
          id: gameId,
          winner: winner ? winner : "Draw",
          date: new Date().toLocaleString(),
          moves: squares.filter(Boolean).length,
          players: { ...playerNames },
        };
        setGameHistory((old) => [result, ...old].slice(0, 25)); // Last 25
      }, 200);
    }
    // eslint-disable-next-line
  }, [winner, isDraw]);

  function handleClick(index: number) {
    if (!namesSet || squares[index] || winner) return;
    const newSquares = squares.slice();
    newSquares[index] = xIsNext ? "X" : "O";
    setSquares(newSquares);
    setXIsNext(!xIsNext);
  }

  function handleRestart() {
    setSquares(Array(9).fill(null));
    setXIsNext(true);
    setGameId(Date.now());
  }

  function handleNameChange(key: "X" | "O", value: string) {
    setEditingNames((names) => ({
      ...names,
      [key]: value,
    }));
  }

  function handleSetNames(e: React.FormEvent) {
    e.preventDefault();
    setPlayerNames({ ...editingNames });
    setNamesSet(true);
    handleRestart();
  }

  function handleEditNames() {
    setEditingNames({ ...playerNames });
    setNamesSet(false);
    handleRestart();
  }

  // Status display with colored player name/symbol
  let status: React.ReactNode;
  if (!namesSet) {
    status = null;
  } else if (winner) {
    const color = winner === "X" ? "#2979ff" : "#f44336";
    status = (
      <span>
        Zwycięzca:{" "}
        <span style={{ color, fontWeight: 600 }}>
          {playerNames[winner]} ({winner})
        </span>
      </span>
    );
  } else if (isDraw) {
    status = <span style={{ color: "#888" }}>Remis!</span>;
  } else {
    const turn = xIsNext ? "X" : "O";
    const color = turn === "X" ? "#2979ff" : "#f44336";
    status = (
      <span>
        Tura:{" "}
        <span style={{ color, fontWeight: 600 }}>
          {playerNames[turn]} ({turn})
        </span>
      </span>
    );
  }

  // Responsive styling is in style jsx below
  return (
    <div className="ttt-main">
      <h1 style={{ marginBottom: 6 }}>Kółko i Krzyżyk</h1>

      {/* Player names - edit/input at top */}
      {!namesSet ? (
        <form className="ttt-namesform" onSubmit={handleSetNames}>
          <div>
            <label>
              <span className="ttt-xlabel">X</span>
              <input
                type="text"
                maxLength={20}
                value={editingNames.X}
                onChange={(e) => handleNameChange("X", e.target.value)}
                required
                className="ttt-input ttt-xinput"
                autoFocus
              />
            </label>
          </div>
          <div>
            <label>
              <span className="ttt-olabel">O</span>
              <input
                type="text"
                maxLength={20}
                value={editingNames.O}
                onChange={(e) => handleNameChange("O", e.target.value)}
                required
                className="ttt-input ttt-oinput"
              />
            </label>
          </div>
          <button className="ttt-setbtn" type="submit">
            Zapisz imiona i graj
          </button>
        </form>
      ) : (
        <div className="ttt-namesdisplay">
          <span>
            <span className="ttt-xlabel">{playerNames.X}</span>
            <span className="ttt-divider">vs</span>
            <span className="ttt-olabel">{playerNames.O}</span>
          </span>
          <button className="ttt-editbtn" onClick={handleEditNames} title="Zmień imiona">
            ✏️
          </button>
        </div>
      )}

      <div className="ttt-board-wrap">
        <div className="ttt-board-grid">
          {squares.map((value, idx) => (
            <button
              key={idx}
              className={`ttt-square${value ? ` ttt-${value.toLowerCase()}` : ""}`}
              onClick={() => handleClick(idx)}
              aria-label={`Pozycja ${idx + 1}`}
              disabled={Boolean(value) || Boolean(winner) || !namesSet}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="ttt-status">{status}</div>

      <button className="ttt-resetbtn" onClick={handleRestart}>
        {winner || isDraw ? "Zagraj ponownie" : "Resetuj grę"}
      </button>

      <h2 className="ttt-history-head">Historia rozgrywek</h2>
      {gameHistory.length === 0 ? (
        <div className="ttt-nogames">Brak rozegranych gier.</div>
      ) : (
        <div className="ttt-history-wrap">
          <table className="ttt-history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Czas</th>
                <th>Wynik</th>
                <th>Ruchy</th>
                <th>Gracze</th>
              </tr>
            </thead>
            <tbody>
              {gameHistory.map((g, idx) => (
                <tr key={g.id}>
                  <td>{gameHistory.length - idx}</td>
                  <td>{g.date}</td>
                  <td>
                    {g.winner === "Draw" ? (
                      <span style={{ color: "#888" }}>Remis</span>
                    ) : (
                      <span style={{ color: g.winner === "X" ? "#2979ff" : "#f44336", fontWeight: 600 }}>
                        {g.players[g.winner]} ({g.winner})
                      </span>
                    )}
                  </td>
                  <td>{g.moves}</td>
                  <td>
                    <span style={{ color: "#2979ff" }}>{g.players.X}</span> vs{" "}
                    <span style={{ color: "#f44336" }}>{g.players.O}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* STYLES */}
      <style>{`
        .ttt-main {
          margin: 30px auto;
          padding: 16px;
          max-width: 410px;
          box-shadow: 0 2px 24px 0 #29292910;
          background: #fafcff;
          border-radius: 16px;
        }
        .ttt-namesform {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: center;
          margin: 14px 0 20px 0;
          flex-wrap: wrap;
        }
        .ttt-xlabel, .ttt-xinput { color: #2979ff; font-weight: 700; }
        .ttt-olabel, .ttt-oinput { color: #f44336; font-weight: 700; }
        .ttt-xinput, .ttt-oinput {
          font-size: 1rem;
          border: 1.5px solid #ccc;
          border-radius: 7px;
          padding: 4px 9px;
          margin-left: 5px;
          width: 94px;
        }
        .ttt-input:focus { outline: 2px solid #2196f3; }
        .ttt-setbtn {
          background: linear-gradient(90deg, #64b5f6 50%, #ffb5c5 100%);
          color: #fff;
          border: none;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 7px;
          padding: 7px 20px;
          margin-left: 8px;
          transition: filter .2s;
        }
        .ttt-setbtn:hover { filter: brightness(0.98); }
        .ttt-namesdisplay {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 18px;
        }
        .ttt-divider {
          font-size: 1.1em;
          margin: 0 7px;
          color: #333;
        }
        .ttt-editbtn {
          margin-left: 8px;
          padding: 2px 9px 2px 5px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 1.1em;
          opacity: 0.6;
        }
        .ttt-editbtn:hover { opacity: 1; }

        /* Board styles */
        .ttt-board-wrap { margin: 0 auto; }
        .ttt-board-grid {
          display: grid;
          grid-template-columns: repeat(3, 70px);
          grid-template-rows: repeat(3, 70px);
          gap: 7px;
          justify-content: center;
          margin-bottom: 14px;
        }
        .ttt-square {
          width: 70px;
          height: 70px;
          background: #e3f2fd;
          border: 2px solid #90caf9;
          border-radius: 12px;
          font-size: 2.2em;
          font-family: 'Source Code Pro', monospace;
          font-weight: 700;
          color: #222;
          cursor: pointer;
          transition: background 0.2s, box-shadow .2s;
        }
        .ttt-square:active {
          background: #bbdefb;
        }
        .ttt-x { color: #2979ff; background: #e3edfb; border-color: #90caf9; }
        .ttt-o { color: #f44336; background: #fdeaea; border-color: #ef9a9a; }
        .ttt-square:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }
        .ttt-status { font-size: 1.2rem; margin: 8px 0 16px 0; min-height: 26px; }

        .ttt-resetbtn {
          display: block;
          margin: 0 auto 20px auto;
          background: linear-gradient(90deg, #fff176 60%, #ffd54f 100%);
          color: #222;
          font-weight: 700;
          font-size: 1em;
          border: none;
          border-radius: 8px;
          box-shadow: 1px 1px 9px #ffd54f22;
          padding: 8px 32px;
          cursor: pointer;
          transition: filter .17s;
        }
        .ttt-resetbtn:hover { filter: brightness(0.96); }

        .ttt-history-head {
          margin: 22px 0 10px 0;
          font-size: 1.15em;
          color: #546e7a;
        }
        .ttt-nogames {
          color: #789;
          font-size: 1.05em;
          margin-bottom: 14px;
        }
        .ttt-history-wrap {
          max-width: 384px;
          margin: 0 auto 12px auto;
          border-radius: 7px;
          overflow-x: auto;
          box-shadow: 0 2px 16px #7e57c215;
        }
        .ttt-history-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.99em;
        }
        .ttt-history-table th, .ttt-history-table td {
          border: 1.1px solid #d9d9d9;
          padding: 4px 10px;
          text-align: center;
        }
        .ttt-history-table th {
          background: #f5f5f5;
        }
        .ttt-history-table tr:nth-child(even) {
          background: #f8fafb;
        }
        @media (max-width: 520px) {
          .ttt-main {
            max-width: 97vw;
            padding: 7vw 2vw;
          }
          .ttt-board-grid {
            grid-template-columns: repeat(3, 20vw);
            grid-template-rows: repeat(3, 20vw);
            gap: 2vw;
          }
          .ttt-square {
            width: 20vw;
            height: 20vw;
            min-width: 46px;
            min-height: 46px;
            font-size: 7vw;
            border-radius: 4vw;
          }
          .ttt-history-wrap { max-width: 98vw;}
        }
        @media (max-width: 375px) {
          .ttt-board-grid {
            grid-template-columns: repeat(3, 29vw);
            grid-template-rows: repeat(3, 29vw);
            gap: 1vw;
          }
          .ttt-square { font-size: 9vw;}
        }
      `}</style>
    </div>
  );
}
