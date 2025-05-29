// src/App.jsx
import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './index.css';

const initialGame = new Chess();
const PIECES = ['p', 'n', 'b', 'r', 'q', 'k'];

function App() {
  const [game, setGame] = useState(initialGame);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [showTestMode, setShowTestMode] = useState(false);

  const puzzleMoves = ['e4', 'e5', 'Nf3', 'Nc6'];

  function handleNextMove() {
    if (currentMoveIndex < puzzleMoves.length) {
      const newGame = new Chess(game.fen());
      newGame.move(puzzleMoves[currentMoveIndex]);
      setGame(newGame);
      setCurrentMoveIndex(currentMoveIndex + 1);
    }
  }

  function handleTestMode() {
    const resetGame = new Chess();
    for (let i = 0; i < puzzleMoves.length; i++) {
      resetGame.move(puzzleMoves[i]);
    }
    setGame(resetGame);
    setCurrentMoveIndex(puzzleMoves.length);
    setShowTestMode(true);
  }

  function handleReplay() {
    const resetGame = new Chess();
    setGame(resetGame);
    setCurrentMoveIndex(0);
    setShowTestMode(false);
  }

  const renderPieceMenu = () => {
    const playerColor = game.turn();
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
                src={`https://www.chess.com/chess-themes/pieces/neo/150/${pieceCode}.png`}
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
      const squareEl = board.querySelector(`.square-${targetSquare}`);
      if (squareEl) {
        const img = document.createElement('img');
        img.src = `https://www.chess.com/chess-themes/pieces/neo/150/${pieceType}.png`;
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
        position={showTestMode ? game.fen() : game.fen()}
        onPieceDrop={(source, target) => handleDrop(source, target)}
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
