// src/App.jsx
import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './index.css';

const PIECES = ['p', 'n', 'b', 'r', 'q', 'k'];

const initialFEN = 'r1bq1rk1/ppp1bppp/2n2n2/3pp3/3P4/2P1PN2/PP1N1PPP/R1BQ1RK1 w - - 0 1';
const puzzleMoves = ['d4e5', 'c6e5', 'f3e5', 'c8e6']; // 4 full moves, testing user's turn after opponent

function App() {
  const [game, setGame] = useState(new Chess(initialFEN));
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [showTestMode, setShowTestMode] = useState(false);
  const [ghostBoard, setGhostBoard] = useState(null);

  function handleNextMove() {
    if (currentMoveIndex < puzzleMoves.length) {
      const newGame = new Chess(game.fen());
      newGame.move(puzzleMoves[currentMoveIndex]);
      setGame(newGame);
      setCurrentMoveIndex(currentMoveIndex + 1);
    }
  }

  function handleTestMode() {
    const resetGame = new Chess(initialFEN);
    for (let i = 0; i < puzzleMoves.length; i++) {
      resetGame.move(puzzleMoves[i]);
    }
    setGhostBoard(resetGame.fen());
    resetGame.load(initialFEN); // reset to base board
    setGame(resetGame);
    setShowTestMode(true);
    setCurrentMoveIndex(puzzleMoves.length);
  }

  function handleReplay() {
    const resetGame = new Chess(initialFEN);
    setGame(resetGame);
    setCurrentMoveIndex(0);
    setShowTestMode(false);
    setGhostBoard(null);
  }

  const renderPieceMenu = () => {
    const playerColor = new Chess(ghostBoard || game.fen()).turn();
    return (
      <div className="piece-menu">
        {PIECES.map((p) => {
          const pieceCode = playerColor === 'w' ? p.toUpperCase() : p;
          return (
            <div
              key={pieceCode}
              className="piece-tile"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('piece', pieceCode);
                window.draggedPiece = pieceCode;
              }}
            >
              <img
                src={`https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${pieceCode}.png`}
                alt={pieceCode}
                width={40}
              />
            </div>
          );
        })}
      </div>
    );
  };

  function handleDrop(sourceSquare, targetSquare) {
    if (showTestMode) {
      const pieceType = window.draggedPiece;
      if (!pieceType) return false;
      const board = document.querySelector('.board');
      const squareEl = board?.querySelector(`.square-${targetSquare}`);
      if (squareEl) {
        const img = document.createElement('img');
        img.src = `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${pieceType}.png`;
        img.style.width = '100%';
        img.style.height = '100%';
        squareEl.innerHTML = '';
        squareEl.appendChild(img);
      }
      return true;
    }
    return false;
  }

  return (
    <div className="App">
      <h1>Chess Visualization Trainer</h1>
      <Chessboard
        position={showTestMode ? '8/8/8/8/8/8/8/8' : game.fen()}
        onPieceDrop={(source, target) => handleDrop(source, target)}
        arePiecesDraggable={!showTestMode}
        customBoardStyle={{ border: '2px solid #333', marginBottom: '20px' }}
      />
      <button onClick={handleNextMove} disabled={showTestMode}>Next</button>
      <button onClick={handleTestMode}>Test</button>
      <button onClick={handleReplay}>Replay</button>
      {showTestMode && renderPieceMenu()}
    </div>
  );
}

export default App;
