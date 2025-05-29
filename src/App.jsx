import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './index.css';

const PIECES = ['p', 'n', 'b', 'r', 'q', 'k'];

/**
 * @typedef {Object} ChessPuzzle
 * @property {string} fen - The starting FEN for the puzzle.
 * @property {string[]} moves - An array of moves in SAN (Standard Algebraic Notation).
 */

const puzzles = [
  {
    fen: 'r1bqkbnr/ppp2ppp/2n5/1B1pp3/3PP3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 4',
    moves: ['exd5', 'Qxd5', 'Nc3', 'Qa5+', 'Bd2', 'Bb4']
  },
  {
    fen: '4rrk1/pp3ppp/3q1n2/2ppn3/8/P1PP1N2/1P1NQPPP/R3K2R w KQ - 0 15',
    moves: ['Nxe5', 'Rxe5', 'd4', 'cxd4', 'cxd4', 'Rxe2+']
  },
  {
    fen: 'r1bq1rk1/ppp2ppp/2n2n2/3pp3/3P4/2P1PN2/PP1N1PPP/R1BQ1RK1 w - - 0 1',
    moves: ['d4e5', 'c6e5', 'f3e5', 'c8e6']
  },
  // Add 7-9 more puzzles here...
];

// Helper function to validate if a string is a valid chess square (e.g., 'a1', 'h8')
const isValidSquare = (square) => {
  return typeof square === 'string' && /^[a-h][1-8]$/.test(square);
};

// Helper function to convert chess square notation to pixel coordinates for SVG drawing
const getSquareCoordinates = (square, boardWidth) => {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0); // 'a' -> 0, 'b' -> 1, etc.
  const rank = parseInt(square[1], 10) - 1; // '1' -> 0, '2' -> 1, etc.

  const squareSize = boardWidth / 8;
  const x = file * squareSize + squareSize / 2;
  const y = (7 - rank) * squareSize + squareSize / 2;
  return { x, y };
};

const ARROWHEAD_EFFECTIVE_LENGTH = 10;

function App() {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [game, setGame] = useState(new Chess(puzzles[currentPuzzleIndex].fen));
  const [currentPuzzleMoves, setCurrentPuzzleMoves] = useState(puzzles[currentPuzzleIndex].moves);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [showTestMode, setShowTestMode] = useState(false);
  const [arrows, setArrows] = useState([]);
  const [boardPosition, setBoardPosition] = useState(puzzles[currentPuzzleIndex].fen);
  const [isVisible, setIsVisible] = useState(true);

  function handleNextMove() {
    try {
      if (currentMoveIndex < currentPuzzleMoves.length) {
        const move = currentPuzzleMoves[currentMoveIndex];
        if (!move || move.length < 4) {
          throw new Error('Invalid move format in currentPuzzleMoves array: ' + move);
        }

        const from = move.slice(0, 2);
        const to = move.slice(2, 4);

        if (!isValidSquare(from) || !isValidSquare(to)) {
          throw new Error(`Invalid 'from' or 'to' square in move: ${move}. From: ${from}, To: ${to}`);
        }

        setArrows([{ from, to }]);
        setCurrentMoveIndex((prev) => prev + 1);
      } else if (currentPuzzleIndex < puzzles.length - 1) {
        // Go to the next puzzle
        const nextPuzzleIndex = currentPuzzleIndex + 1;
        setCurrentPuzzleIndex(nextPuzzleIndex);
        setGame(new Chess(puzzles[nextPuzzleIndex].fen));
        setCurrentPuzzleMoves(puzzles[nextPuzzleIndex].moves);
        setBoardPosition(puzzles[nextPuzzleIndex].fen);
        setCurrentMoveIndex(0);
        setArrows([]);
      } else {
        // All puzzles complete
        console.log("All puzzles completed!");
        setShowTestMode(true);
        setArrows([]);
      }
    } catch (error) {
      console.error('Error in handleNextMove:', error);
      setIsVisible(false);
    }
  }

  function handleTestMode() {
    console.log("Entering Test Mode. showTestMode will be set to true.");
    const emptyGame = new Chess();
    emptyGame.clear();
    setGame(emptyGame);
    setBoardPosition(emptyGame.fen());
    setShowTestMode(true);
    setArrows([]);
  }

  function handleReplay() {
    setCurrentPuzzleIndex(0);
    setGame(new Chess(puzzles[0].fen));
    setCurrentPuzzleMoves(puzzles[0].moves);
    setCurrentMoveIndex(0);
    setShowTestMode(false);
    setArrows([]);
    setBoardPosition(puzzles[0].fen);
    setIsVisible(true);
  }

  const renderPieceMenu = () => {
    const playerColor = 'w';
    return (
      <div className="piece-menu">
        {PIECES.map((p) => {
          const pieceCode = playerColor === 'w' ? p.toUpperCase() : p;
          const pieceImageSrc = `https://placehold.co/40x40/cccccc/000000?text=${pieceCode}`;
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
                src={pieceImageSrc}
                alt={pieceCode}
                width={40}
                onError={(e) => {
                  console.error(`Failed to load piece image: ${e.target.src}`);
                  e.target.src = `https://placehold.co/40x40/cccccc/000000?text=NA`;
                }}
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

  if (!isVisible) {
    return (
      <div style={{ padding: 20, color: 'red', textAlign: 'center' }}>
        <p>An error occurred. Please click 'Replay' to restart.</p>
        <button onClick={handleReplay} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', marginTop: '10px' }}>Replay</button>
      </div>
    );
  }

  const boardWidth = 400;

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Chess Visualization Trainer</h1>
      <p style={{ marginBottom: '10px' }}>Puzzle {currentPuzzleIndex + 1} of {puzzles.length}</p>
      <div style={{ position: 'relative', width: boardWidth, height: boardWidth }}>
        <Chessboard
          position={boardPosition}
          onPieceDrop={(source, target) => handleDrop(source, target)}
          arePiecesDraggable={!showTestMode}
          customBoardStyle={{ border: '2px solid #333', marginBottom: '20px', borderRadius: '8px' }}
          boardWidth={boardWidth}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, width: boardWidth, height: boardWidth, pointerEvents: 'none' }}>
          <svg width={boardWidth} height={boardWidth} viewBox={`0 0 ${boardWidth} ${boardWidth}`}>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="rgba(0, 128, 255, 0.4)" />
              </marker>
            </defs>
            {arrows.map((arrow, index) => {
              const start = getSquareCoordinates(arrow.from, boardWidth);
              const end = getSquareCoordinates(arrow.to, boardWidth);

              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              let adjustedX2 = end.x;
              let adjustedY2 = end.y;

              if (distance > ARROWHEAD_EFFECTIVE_LENGTH) {
                const unitDx = dx / distance;
                const unitDy = dy / distance;
                adjustedX2 = end.x - unitDx * ARROWHEAD_EFFECTIVE_LENGTH;
                adjustedY2 = end.y - unitDy * ARROWHEAD_EFFECTIVE_LENGTH;
              }

              return (
                <line
                  key={index}
                  x1={start.x}
                  y1={start.y}
                  x2={adjustedX2}
                  y2={adjustedY2}
                  stroke="rgba(0, 128, 255, 0.4)"
                  strokeWidth="8"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
          </svg>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        {currentMoveIndex < currentPuzzleMoves.length || currentPuzzleIndex < puzzles.length - 1 ? (
          <button
            onClick={handleNextMove}
            disabled={showTestMode}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#4CAF50', color: 'white', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)', transition: 'background-color 0.3s ease' }}
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleTestMode}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#008CBA', color: 'white', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)', transition: 'background-color 0.3s ease' }}
          >
            Test
          </button>
        )}
        <button
          onClick={handleReplay}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#f44336', color: 'white', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)', transition: 'background-color 0.3s ease' }}
        >
          Replay
        </button>
      </div>
      {showTestMode && renderPieceMenu()}
    </div>
  );
}

export default App;
