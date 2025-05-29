import React, { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

const puzzles = [
  {
    id: 1,
    moves: ["e2e4", "e7e5", "g1f3"],
    solution: "g1f3"
  },
  {
    id: 2,
    moves: ["d2d4", "d7d5", "c1g5"],
    solution: "c1g5"
  }
];

export default function ChessPuzzle() {
  const [game] = useState(new Chess());
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [isQuizPhase, setIsQuizPhase] = useState(false);
  const [message, setMessage] = useState("Press Next to begin.");

  const puzzle = puzzles[puzzleIndex];

  const handleNext = () => {
    if (step < puzzle.moves.length - 1) {
      game.move(puzzle.moves[step]);
      setStep(step + 1);
      setMessage(`Move ${step + 1}: ${puzzle.moves[step]}`);
    } else if (step === puzzle.moves.length - 1) {
      game.move(puzzle.moves[step]);
      setMessage("Now try to find the next move.");
      setStep(step + 1);

      // Reset board to initial position
      game.reset();
      setIsQuizPhase(true);
    }
  };

  const onDrop = (sourceSquare, targetSquare) => {
    if (!isQuizPhase) return false;

    const move = game.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    if (move === null) return false;

    if (`${sourceSquare}${targetSquare}` === puzzle.solution) {
      setMessage("Correct! 🎉");
    } else {
      setMessage("Try again.");
    }
    return true;
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Chess Visualization Trainer</h2>
      <p>{message}</p>
      <Chessboard position={game.fen()} onPieceDrop={onDrop} boardWidth={400} />
      {!isQuizPhase && (
        <button onClick={handleNext} style={{ marginTop: 20 }}>Next</button>
      )}
    </div>
  );
}
