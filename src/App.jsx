import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './index.css';

const PIECES = ['p', 'n', 'b', 'r', 'q', 'k'];

const initialFEN = 'r1bq1rk1/ppp1bppp/2n2n2/3pp3/3P4/2P1PN2/PP1N1PPP/R1BQ1RK1 w - - 0 1';
const puzzleMoves = ['d4e5', 'c6e5', 'f3e5', 'c8e6'];

// Helper function to validate if a string is a valid chess square (e.g., 'a1', 'h8')
const isValidSquare = (square) => {
  return typeof square === 'string' && /^[a-h][1-8]$/.test(square);
};

// Helper function to convert chess square notation to pixel coordinates for SVG drawing
const getSquareCoordinates = (square, boardWidth) => {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0); // 'a' -> 0, 'b' -> 1, etc.
  const rank = parseInt(square[1], 10) - 1; // '1' -> 0, '2' -> 1, etc.

  const squareSize = boardWidth / 8;
  // Calculate center of the square. 'x' increases from left to right.
  // 'y' increases from top to bottom, so for rank '1' (bottom), y should be largest.
  const x = file * squareSize + squareSize / 2;
  const y = (7 - rank) * squareSize + squareSize / 2; // (7 - rank) to invert y-axis for SVG (top is 0)
  return { x, y };
};


function App() {
  const [game, setGame] = useState(new Chess(initialFEN));
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [showTestMode, setShowTestMode] = useState(false);
  const [arrows, setArrows] = useState([]);
  const [boardPosition, setBoardPosition] = useState(initialFEN); // Board position remains static for puzzle visualization
  const [isVisible, setIsVisible] = useState(true);

  function handleNextMove() {
    try {
      // Check if there are more moves in the puzzle
      if (currentMoveIndex < puzzleMoves.length) {
        const move = puzzleMoves[currentMoveIndex];
        // Basic validation for the move string
        if (!move || move.length < 4) {
          throw new Error('Invalid move format in puzzleMoves array: ' + move);
        }

        const from = move.slice(0, 2);
        const to = move.slice(2, 4);

        // EXTRA VALIDATION: Ensure 'from' and 'to' are valid chess squares
        if (!isValidSquare(from) || !isValidSquare(to)) {
          throw new Error(`Invalid 'from' or 'to' square in move: ${move}. From: ${from}, To: ${to}`);
        }

        // IMPORTANT: ONLY add the arrow, DO NOT update game or boardPosition here.
        // The board should remain at initialFEN for the puzzle visualization.
        setArrows((prev) => [...prev, { from, to }]);

        // Increment the move index
        setCurrentMoveIndex((prev) => prev + 1);

      } else {
        // This block is executed when all puzzle moves have been shown.
        // The "Next" button will be disabled by the `disabled` prop.
        console.log("All puzzle moves displayed. Click 'Test' or 'Replay'.");
      }
    } catch (error) {
      console.error('Error during handleNextMove:', error);
      // If an error occurs, set isVisible to false to display an error message
      setIsVisible(false);
    }
  }

  function handleTestMode() {
    // Create a new empty game and clear the board
    const emptyGame = new Chess();
    emptyGame.clear();
    setGame(emptyGame);
    setBoardPosition(emptyGame.fen()); // Set board to empty FEN for test mode
    // Activate test mode
    setShowTestMode(true);
    // Clear arrows when entering test mode
    setArrows([]);
  }

  function handleReplay() {
    // Reset the game to the initial FEN
    const resetGame = new Chess(initialFEN);
    setGame(resetGame);
    // Reset all related states
    setCurrentMoveIndex(0);
    setShowTestMode(false);
    setBoardPosition(initialFEN); // Reset board to initial FEN
    setArrows([]); // Clear all arrows
    setIsVisible(true); // Make the app visible again after an error
  }

  // Renders the draggable chess pieces for test mode
  const renderPieceMenu = () => {
    const playerColor = 'w'; // Currently hardcoded to white pieces
    return (
      <div className="piece-menu">
        {PIECES.map((p) => {
          // Determine the piece code (uppercase for white, lowercase for black)
          const pieceCode = playerColor === 'w' ? p.toUpperCase() : p;
          return (
            <div
              key={pieceCode}
              className="piece-tile"
              draggable // Make the piece draggable
              onDragStart={(e) => {
                // Store the piece code in dataTransfer and a global window variable for access in handleDrop
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

  // Handles dropping a piece onto a square in test mode
  function handleDrop(sourceSquare, targetSquare) {
    if (showTestMode) {
      const pieceType = window.draggedPiece; // Get the type of piece being dragged
      if (!pieceType) return false; // If no piece is being dragged, do nothing

      // Find the target square element on the board
      const board = document.querySelector('.board');
      const squareEl = board?.querySelector(`.square-${targetSquare}`);

      if (squareEl) {
        // Create an image element for the dropped piece
        const img = document.createElement('img');
        img.src = `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${pieceType}.png`;
        img.style.width = '100%';
        img.style.height = '100%';
        squareEl.innerHTML = ''; // Clear existing content in the square
        squareEl.appendChild(img); // Add the new piece image
      }
      return true; // Indicate that the drop was handled
    }
    return false; // Not in test mode, so don't handle the drop
  }

  // If an error occurred, display a simple error message
  if (!isVisible) {
    return (
      <div style={{ padding: 20, color: 'red', textAlign: 'center' }}>
        <p>An error occurred. Please click 'Replay' to restart.</p>
        <button onClick={handleReplay} style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          borderRadius: '8px',
          border: '1px solid #ccc',
          backgroundColor: '#f0f0f0',
          marginTop: '10px'
        }}>Replay</button>
      </div>
    );
  }

  const boardWidth = 400; // Define board width for coordinate calculation

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Chess Visualization Trainer</h1>
      <div style={{ position: 'relative', width: boardWidth, height: boardWidth }}> {/* Container for board and SVG */}
        <Chessboard
          position={boardPosition} // This will now remain initialFEN during puzzle display
          onPieceDrop={(source, target) => handleDrop(source, target)}
          arePiecesDraggable={!showTestMode}
          customBoardStyle={{ border: '2px solid #333', marginBottom: '20px', borderRadius: '8px' }}
          // customArrows={derivedCustomArrows} // Removed this prop
          boardWidth={boardWidth}
        />
        {/* Custom SVG Overlay for Arrows */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: boardWidth, height: boardWidth, pointerEvents: 'none' }}>
          <svg width={boardWidth} height={boardWidth} viewBox={`0 0 ${boardWidth} ${boardWidth}`}>
            {/* Define arrowhead marker */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="rgba(0, 128, 255, 0.4)" />
              </marker>
            </defs>
            {arrows.map((arrow, index) => {
              const start = getSquareCoordinates(arrow.from, boardWidth);
              const end = getSquareCoordinates(arrow.to, boardWidth);

              return (
                <line
                  key={index}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="rgba(0, 128, 255, 0.4)" // Use the same color as before
                  strokeWidth="8"
                  markerEnd="url(#arrowhead)" // Add arrowhead
                />
              );
            })}
          </svg>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button
          onClick={handleNextMove}
          disabled={showTestMode || currentMoveIndex >= puzzleMoves.length} // Disable if in test mode or puzzle finished
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            borderRadius: '8px',
            border: '1px solid #333',
            backgroundColor: '#4CAF50',
            color: 'white',
            boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
            transition: 'background-color 0.3s ease'
          }}
        >
          Next
        </button>
        <button
          onClick={handleTestMode}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            borderRadius: '8px',
            border: '1px solid #333',
            backgroundColor: '#008CBA',
            color: 'white',
            boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
            transition: 'background-color 0.3s ease'
          }}
        >
          Test
        </button>
        <button
          onClick={handleReplay}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            borderRadius: '8px',
            border: '1px solid #333',
            backgroundColor: '#f44336',
            color: 'white',
            boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
            transition: 'background-color 0.3s ease'
          }}
        >
          Replay
        </button>
      </div>
      {showTestMode && renderPieceMenu()}
    </div>
  );
}

export default App;
