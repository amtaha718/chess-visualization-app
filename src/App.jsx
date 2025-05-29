// src/App.jsx

import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

const PGN = '[Event "?"]\n[Site "?"]\n[Date "????.??.??"]\n[Round "?"]\n[White "?"]\n[Black "?"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6';

function parsePgnMoves(pgn) {
  return pgn
    .split(/\d+\./)
    .flatMap(move => move.trim().split(/\s+/))
    .filter(m => m && !/[\[\]*]/.test(m));
}

function App() {
  const moves = parsePgnMoves(PGN);
  const initialPosition = new Chess();

  const [chess] = useState(initialPosition);
  const [stepIndex, setStepIndex] = useState(0);
  const [boardPosition, setBoardPosition] = useState(chess.fen());
  const [quizActive, setQuizActive] = useState(false);

  const handleNext = () => {
    if (stepIndex < 3) {
      chess.move(moves[stepIndex]);
      setBoardPosition(chess.fen());
      setStepIndex(stepIndex + 1);

      if (stepIndex + 1 === 3) {
        setQuizActive(true);
      }
    }
  };

  const onDrop = (sourceSquare, targetSquare) => {
    if (!quizActive) return false;
    const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (move) {
      setBoardPosition(chess.fen());
      alert('Move registered. You can implement scoring logic here.');
      return true;
    }
    return false;
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Chess Visualization Trainer</h2>
      <Chessboard position={boardPosition} onPieceDrop={onDrop} arePiecesDraggable={quizActive} />

      {!quizActive && (
        <button onClick={handleNext} style={{ marginTop: '1rem' }}>
          Next
        </button>
      )}

      {quizActive && <p>What should be move 4? Drag and drop your answer.</p>}
    </div>
  );
}

export default App;
