import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './index.css';

const PIECES = ['p', 'n', 'b', 'r', 'q', 'k'];

const initialFEN = 'r1bq1rk1/ppp1bppp/2n2n2/3pp3/3P4/2P1PN2/PP1N1PPP/R1BQ1RK1 w - - 0 1';
const puzzleMoves = ['d4e5', 'c6e5', 'f3e5', 'c8e6'];

function App() {
  const [game, setGame] = useState(new Chess(initialFEN));
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [showTestMode, setShowTestMode] = useState(false);
  const [arrows, setArrows] = useState([]);
  const [boardPosition, setBoardPosition] = useState(initialFEN);
  const [isVisible, setIsVisible] = useState(true);

  function handleNextMove() {
    try {
      // Check if there are more moves in the puzzle
      if (currentMoveIndex < puzzleMoves.length) {
        const move = puzzleMoves[currentMoveIndex];
        // Basic validation for the move string
        if (!move || move.length < 4) {
          throw new Error('Invalid move format in puzzleMoves array.');
        }

        const from = move.slice(0, 2);
        const to = move.slice(2, 4);

        // Create a new Chess instance from the current board position's FEN
        // This ensures we're working with the latest state of the board
        const newGame = new Chess(game.fen());
        const moveResult = newGame.move({ from, to });

        // If the move is illegal according to chess.js, throw an error
        if (!moveResult) {
          throw new Error(`Illegal move: ${move} from FEN: ${game.fen()}`);
        }

        // Update the main game state and the board position FEN
        setGame(newGame);
        setBoardPosition(newGame.fen());

        // Add the new arrow for the move
        setArrows((prev) => [...prev, { from, to }]);

        // Increment the move index
        setCurrentMoveIndex((prev) => prev + 1);

      } else {
        // This block is executed when all puzzle moves have been shown.
        // For debugging, we'll temporarily prevent clearing the board
        // and entering test mode automatically here.
        // You can re-enable this logic once the core issue is resolved.
        console.log("All puzzle moves displayed. Click 'Test' or 'Replay'.");
        // const newGame = new Chess();
        // newGame.clear();
        // setGame(newGame);
        // setBoardPosition(newGame.fen());
        // setArrows([]);
        // setShowTestMode(true);
        // setCurrentMoveIndex((prev) => prev + 1); // Increment one more time to signify end
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
    setBoardPosition(emptyGame.fen());
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
    setBoardPosition(initialFEN);
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

  // Prepare custom arrows for the Chessboard component
  // Ensure 'arrows' is an array, filter out invalid entries, and map to the required format
  const customArrows = (Array.isArray(arrows) ? arrows : [])
    .filter(arrow => arrow && typeof arrow.from === 'string' && typeof arrow.to === 'string')
    .map(({ from, to }) => ({ from, to, color: 'rgba(0, 128, 255, 0.4)' }));

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

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Chess Visualization Trainer</h1>
      <Chessboard
        position={boardPosition}
        onPieceDrop={(source, target) => handleDrop(source, target)}
        arePiecesDraggable={!showTestMode}
        customBoardStyle={{ border: '2px solid #333', marginBottom: '20px', borderRadius: '8px' }}
        // Only pass customArrows if there are any, otherwise pass undefined
        customArrows={customArrows.length > 0 ? customArrows : undefined}
        boardWidth={400}
      />
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
