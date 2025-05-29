import React, { useEffect, useState } from "react";
import { Chess } from "chess.js";
import Chessboard from "react-chessboard";

const puzzles = [
  {
    id: 1,
    fen: "rnbqkbnr/pppppppp/8/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 1",
    moves: ["e7e5", "f1c4", "g8f6"],
    solution: "d2d4"
  }
];

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [puzzle, setPuzzle] = useState(puzzles[0]);
  const [boardFen, setBoardFen] = useState(puzzle.fen);
  const [status, setStatus] = useState("preview");

  useEffect(() => {
    const previewMoves = async () => {
      const tempGame = new Chess(puzzle.fen);
      for (let move of puzzle.moves) {
        await new Promise((res) => setTimeout(res, 1000));
        tempGame.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
        setBoardFen(tempGame.fen());
      }
      await new Promise((res) => setTimeout(res, 1000));
      setBoardFen(puzzle.fen);
      setStatus("quiz");
    };

    if (status === "preview") {
      previewMoves();
    }
  }, [status]);

  const onDrop = (source, target) => {
    const move = `${source}${target}`;
    if (move === puzzle.solution) {
      setStatus("correct");
      return { from: source, to: target };
    } else {
      setStatus("incorrect");
      return false;
    }
  };

  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h2>Chess Visualization Trainer</h2>
      <p>Status: {status}</p>
      <div style={{ margin: "auto", width: 300 }}>
        <Chessboard position={boardFen} onPieceDrop={onDrop} />
      </div>
    </div>
  );
}
