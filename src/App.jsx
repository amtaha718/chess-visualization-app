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
  const [arrows, setArrows] = useState([]);
  const [boardPosition, setBoardPosition] = useState(initialFEN);
  const [isVisible, setIsVisible] = useState(true);

  function handleNextMove() {
    try {
      if (currentMoveIndex < puzzleMoves.length) {
        const move = puzzleMoves[currentMoveIndex];
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);

        const tempGame = new Chess(boardPosition);
        const moveResult = tempGame.move({ from, to });
        if (!moveResult) throw new Error('Invalid move');

        setBoardPosition(tempGame.fen());
        setArrows((prev) => [...prev, { from, to }]);
        setCurrentMoveIndex(currentMoveIndex + 1);
      } else if (currentMoveIndex === puzzleMoves.length) {
        // reset to original position for test
        setBoardPosition(initialFEN);
        setArrows([]);
        setShowTestMode(true);
        setCurrentMoveIndex(currentMoveIndex + 1);
      }
    } catch (error) {
      console.error('Error during handleNextMove:', error);
      setIsVisible(false);
    }
  }

  function handleTestMode() {
    const emptyGame = new Chess();
    emptyGame.clear();
    setGame(emptyGame);
    setBoardPosition(emptyGame.fen());
    setShowTestMode(true);
  }

  function handleReplay() {
    const resetGame = new Chess(initialFEN);
    setGame(resetGame);
    setCurrentMoveIndex(0);
    setShowTestMode(false);
    setBoardPosition(initialFEN);
    setArrows([]);
    setIsVisible(true);
  }

  const renderPieceMenu = () => {
    const playerColor = 'w'; // always test white for now
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

  const customArrows = arrows
    .filter(({ from, to }) => from && to)
    .map(({ from, to }) => ({ from, to, color: 'rgba(0, 128, 255, 0.4)' }));

  if (!isVisible) return <div style={{ padding: 20, color: 'red' }}>An error occurred. Please click Replay.</div>;

  return (
    <div className="App">
      <h1>Chess Visualization Trainer</h1>
      <Chessboard
        position={boardPosition}
        onPieceDrop={(source, target) => handleDrop(source, target)}
        arePiecesDraggable={!showTestMode}
        customBoardStyle={{ border: '2px solid #333', marginBottom: '20px' }}
        customArrows={customArrows}
        boardWidth={400}
      />
      <button onClick={handleNextMove} disabled={showTestMode}>Next</button>
      <button onClick={handleTestMode}>Test</button>
      <button onClick={handleReplay}>Replay</button>
      {showTestMode && renderPieceMenu()}
    </div>
  );
}

export default App;
