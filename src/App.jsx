import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './index.css';

/**
 * @typedef {Object} ChessPuzzle
 * @property {string} fen - The starting FEN for the puzzle.
 * @property {string[]} moves - An array of moves in 'fromto' format (e.g., 'e2e4', 'g1f3').
 */

const puzzles = [
  {
    fen: 'r1bqkbnr/ppp2ppp/2n5/1B1pp3/3PP3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 4',
    moves: ['e4d5', 'd8d5', 'b1c3', 'd5a5', 'c1d2', 'f8b4']
  },
  {
    fen: '4rrk1/pp3ppp/3q1n2/2ppn3/8/P1PP1N2/1P1NQPPP/R3K2R w KQ - 0 15',
    moves: ['f3e5', 'e8e5', 'd2d4', 'c5xd4', 'c3xd4', 'e5e2']
  },
  {
    fen: 'r1bq1rk1/ppp1bppp/2n2n2/3pp3/3P4/2P1PN2/PP1N1PPP/R1BQ1RK1 w - - 0 1',
    moves: ['d4e5', 'c6e5', 'f3e5', 'c8e6']
  },
  {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    moves: ['g1f3', 'b8c6', 'f1b5', 'a7a6']
  },
  {
    fen: 'rnbqkbnr/pppp1ppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 1',
    moves: ['c2c4', 'e7e6', 'g1f3', 'g8f6']
  },
  {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: ['e2e4', 'e7e5', 'd2d4', 'e5xd4']
  },
  {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    moves: ['b8c6', 'f1b5', 'a7a6', 'b5a4']
  },
  {
    fen: 'rnbqkbnr/pppp1ppp/8/8/3pP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
    moves: ['d1xd4', 'b8c6', 'd4e3', 'g8f6']
  },
  {
    fen: 'rnbqkbnr/pppp1ppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    moves: ['c7c5', 'g1f3', 'd7d6', 'd2d4']
  },
  {
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 2',
    moves: ['d2d4', 'c5d4', 'f3d4', 'g8f6']
  },
  {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: ['d2d4', 'd7d5', 'c2c4', 'c7c6']
  },
  {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: ['g1f3', 'g8f6', 'c2c4', 'e7e6']
  }
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
  const y = (7 - rank) * squareSize + squareSize / 2; // (7 - rank) to invert y-axis for SVG (top is 0)
  return { x, y };
};

// Adjusted arrowhead length and marker properties for better fit
const ARROWHEAD_EFFECTIVE_LENGTH = 8; // Reduced length to ensure tip is within square
const MARKER_WIDTH = 7; // Smaller width for a sharper tip
const MARKER_HEIGHT = 6; // Height for the arrowhead base
const MARKER_REF_X = 7; // Should match MARKER_WIDTH for the tip to align with line end
const MARKER_REF_Y = MARKER_HEIGHT / 2; // Center vertically
const MARKER_POLYGON_POINTS = `0 0, ${MARKER_WIDTH} ${MARKER_REF_Y}, 0 ${MARKER_HEIGHT}`; // Sharper triangle shape
const ARROW_STROKE_WIDTH = 7; // Slightly reduced line thickness


function App() {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [game, setGame] = useState(new Chess(puzzles[currentPuzzleIndex].fen));
  const [currentPuzzleMoves, setCurrentPuzzleMoves] = useState(puzzles[currentPuzzleIndex].moves);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0); // Tracks moves within the current puzzle
  const [arrows, setArrows] = useState([]); // This will now hold only the current automatic arrow
  const [boardPosition, setBoardPosition] = useState(puzzles[currentPuzzleIndex].fen);
  const [isVisible, setIsVisible] = useState(true);
  const [isUserTurnToMove, setIsUserTurnToMove] = useState(false); // New state for user's test move
  const [feedbackMessage, setFeedbackMessage] = useState(''); // New state for feedback message
  const [feedbackArrow, setFeedbackArrow] = useState(null); // New state for feedback arrow (green/red)

  // Function to reset the current puzzle
  const resetCurrentPuzzle = (puzzleIndex) => {
    const newPuzzle = puzzles[puzzleIndex];
    setGame(new Chess(newPuzzle.fen));
    setCurrentPuzzleMoves(newPuzzle.moves);
    setCurrentMoveIndex(0);
    setArrows([]);
    setBoardPosition(newPuzzle.fen); // Reset board to initial FEN for the new puzzle
    setIsVisible(true);
    setIsUserTurnToMove(false);
    setFeedbackMessage('');
    setFeedbackArrow(null);
  };

  function handleNextMove() {
    try {
      setFeedbackMessage(''); // Clear any previous feedback
      setFeedbackArrow(null); // Clear any previous feedback arrow

      // Automatic moves (0 and 1)
      if (currentMoveIndex < 2 && currentMoveIndex < currentPuzzleMoves.length) {
        const move = currentPuzzleMoves[currentMoveIndex];
        if (!move || move.length < 4) {
          throw new Error('Invalid move format in currentPuzzleMoves array: ' + move);
        }

        const from = move.slice(0, 2);
        const to = move.slice(2, 4);

        if (!isValidSquare(from) || !isValidSquare(to)) {
          throw new Error(`Invalid 'from' or 'to' square in move: ${move}. From: ${from}, To: ${to}`);
        }

        // IMPORTANT: ONLY display the arrow, DO NOT move pieces on the board in this phase.
        setArrows([{ from, to }]);
        setCurrentMoveIndex((prev) => prev + 1); // Increment for the next click

      } else {
        // This block is reached if currentMoveIndex is 2 or more,
        // meaning the two automatic moves have been played.
        // Now it's time to prompt the user for their move.
        console.log("Two automatic moves played. Ready for user's test move for current puzzle.");
        setArrows([]); // Clear automatic arrows
        setIsUserTurnToMove(true); // Activate user's turn
        // Revert board to initial FEN for the user to make their move
        setBoardPosition(puzzles[currentPuzzleIndex].fen);
      }
    } catch (error) {
      console.error('Error in handleNextMove:', error);
      setIsVisible(false);
    }
  }

  // This function is called when the "Test" button (after auto-moves) is clicked.
  function handleEnterUserTestMode() {
    console.log("Entering User Test Mode for puzzle:", currentPuzzleIndex);
    setArrows([]); // Clear any lingering arrows
    setIsUserTurnToMove(true); // Set state to enable user interaction for the puzzle move
    setFeedbackMessage(''); // Clear previous feedback
    setFeedbackArrow(null); // Clear previous feedback arrow
    // Ensure board is reset to initial FEN for user's turn
    setBoardPosition(puzzles[currentPuzzleIndex].fen);
  }

  function handleReplayPuzzle() {
    resetCurrentPuzzle(currentPuzzleIndex);
  }

  function handleNextPuzzle() {
    if (currentPuzzleIndex < puzzles.length - 1) {
      resetCurrentPuzzle(currentPuzzleIndex + 1);
    } else {
      console.log("All puzzles completed! Looping back to the first puzzle.");
      resetCurrentPuzzle(0); // Loop back to the first puzzle for now
    }
  }

  // Handles dropping a piece onto a square (only when it's the user's turn)
  function handleDrop(sourceSquare, targetSquare) {
    if (isUserTurnToMove) { // Logic for the user's puzzle test move
      const expectedMove = currentPuzzleMoves[currentMoveIndex]; // This should be the 3rd move (index 2)
      const userMove = `${sourceSquare}${targetSquare}`;

      // Create a temporary game instance to attempt the user's move
      const tempGame = new Chess(game.fen());
      const moveResult = tempGame.move({ from: sourceSquare, to: targetSquare });

      if (moveResult && userMove === expectedMove) {
        setFeedbackMessage('Correct! Well done!');
        setFeedbackArrow({ from: sourceSquare, to: targetSquare, color: 'rgba(0, 255, 0, 0.4)' }); // Green arrow

        // Temporarily show the correct move on the board
        setGame(tempGame);
        setBoardPosition(tempGame.fen());

        // After a short delay, revert the board and prepare for next action
        setTimeout(() => {
          setFeedbackMessage('');
          setFeedbackArrow(null);
          setIsUserTurnToMove(false);
          // Revert board to initial FEN of the puzzle
          setBoardPosition(puzzles[currentPuzzleIndex].fen);
          // Optionally, advance currentMoveIndex if you want to track user's correct moves
          // setCurrentMoveIndex((prev) => prev + 1);
        }, 1500); // Show correct move for 1.5 seconds

      } else {
        setFeedbackMessage('Incorrect move. Try again or click Replay Puzzle.'); // Updated message
        setFeedbackArrow({ from: sourceSquare, to: targetSquare, color: 'rgba(255, 0, 0, 0.4)' }); // Red arrow for incorrect
        // Do NOT update game or boardPosition if incorrect, keep board as is.
        // Keep isUserTurnToMove true so they can try again or replay.
        return false; // Indicate the move was not valid for the chessboard component
      }
      return true; // Indicate that the drop was handled
    }
    return false; // Not user's turn to make a puzzle move
  }

  if (!isVisible) {
    return (
      <div style={{ padding: 20, color: 'red', textAlign: 'center' }}>
        <p>An error occurred. Please click 'Replay Puzzle' or 'Next Puzzle'.</p>
        <button onClick={handleReplayPuzzle} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', marginTop: '10px', marginRight: '10px' }}>Replay Puzzle</button>
        <button onClick={handleNextPuzzle} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: '#f0f0f0', marginTop: '10px' }}>Next Puzzle</button>
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
          // Draggable only if it's the user's turn to make the puzzle move
          arePiecesDraggable={isUserTurnToMove}
          customBoardStyle={{
            border: '2px solid #333',
            marginBottom: '20px',
            borderRadius: '8px',
            // Make board translucent during user's turn
            opacity: isUserTurnToMove ? 0.6 : 1,
            transition: 'opacity 0.3s ease-in-out'
          }}
          boardWidth={boardWidth}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, width: boardWidth, height: boardWidth, pointerEvents: 'none' }}>
          <svg width={boardWidth} height={boardWidth} viewBox={`0 0 ${boardWidth} ${boardWidth}`}>
            <defs>
              {/* Blue arrow for automatic moves */}
              <marker id="arrowhead-blue" markerWidth={MARKER_WIDTH} markerHeight={MARKER_HEIGHT} refX={MARKER_REF_X} refY={MARKER_REF_Y} orient="auto">
                <polygon points={MARKER_POLYGON_POINTS} fill="rgba(0, 128, 255, 0.4)" />
              </marker>
              {/* Green arrow for correct user moves */}
              <marker id="arrowhead-green" markerWidth={MARKER_WIDTH} markerHeight={MARKER_HEIGHT} refX={MARKER_REF_X} refY={MARKER_REF_Y} orient="auto">
                <polygon points={MARKER_POLYGON_POINTS} fill="rgba(0, 255, 0, 0.4)" />
              </marker>
              {/* Red arrow for incorrect user moves */}
              <marker id="arrowhead-red" markerWidth={MARKER_WIDTH} markerHeight={MARKER_HEIGHT} refX={MARKER_REF_X} refY={MARKER_REF_Y} orient="auto">
                <polygon points={MARKER_POLYGON_POINTS} fill="rgba(255, 0, 0, 0.4)" />
              </marker>
            </defs>
            {/* Render automatic puzzle arrows */}
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
                  strokeWidth={ARROW_STROKE_WIDTH}
                  markerEnd="url(#arrowhead-blue)"
                />
              );
            })}
            {/* Render feedback arrow for user's move */}
            {feedbackArrow && (
              (() => {
                const start = getSquareCoordinates(feedbackArrow.from, boardWidth);
                const end = getSquareCoordinates(feedbackArrow.to, boardWidth);

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
                    key="feedback-arrow"
                    x1={start.x}
                    y1={start.y}
                    x2={adjustedX2}
                    y2={adjustedY2}
                    stroke={feedbackArrow.color}
                    strokeWidth={ARROW_STROKE_WIDTH}
                    markerEnd={`url(#arrowhead-${feedbackArrow.color.includes('0, 255, 0') ? 'green' : 'red'})`}
                  />
                );
              })()
            )}
          </svg>
        </div>
      </div>
      {feedbackMessage && (
        <p style={{
          marginTop: '10px',
          fontSize: '18px',
          fontWeight: 'bold',
          color: feedbackMessage.includes('Correct') ? 'green' : 'red'
        }}>
          {feedbackMessage}
        </p>
      )}
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        {/* "Next" button for automatic moves */}
        {currentMoveIndex < 2 && !isUserTurnToMove ? (
          <button
            onClick={handleNextMove}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#4CAF50', color: 'white', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)', transition: 'background-color 0.3s ease' }}
          >
            Next
          </button>
        ) : null}

        {/* "Test" button appears after 2 automatic moves, before user's turn starts */}
        {currentMoveIndex === 2 && !isUserTurnToMove ? (
          <button
            onClick={handleEnterUserTestMode}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#008CBA', color: 'white', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)', transition: 'background-color 0.3s ease' }}
          >
            Test
          </button>
        ) : null}

        {/* Buttons shown after user attempts their move (correct or incorrect) */}
        {isUserTurnToMove && ( // User is currently trying to make a move
          <button
            onClick={handleReplayPuzzle}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#f44336', color: 'white', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)', transition: 'background-color 0.3s ease' }}
          >
            Replay Puzzle
          </button>
        )}

        {!isUserTurnToMove && currentMoveIndex >= 2 && ( // User has finished their turn (correct or incorrect)
          <>
            <button
              onClick={handleReplayPuzzle}
              style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#f44336', color: 'white', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)', transition: 'background-color 0.3s ease' }}
            >
              Replay Puzzle
            </button>
            {currentPuzzleIndex < puzzles.length - 1 ? (
              <button
                onClick={handleNextPuzzle}
                style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#6c757d', color: 'white', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)', transition: 'background-color 0.3s ease' }}
              >
                Next Puzzle
              </button>
            ) : (
              <button
                onClick={() => resetCurrentPuzzle(0)} // Resets to the first puzzle
                style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#6c757d', color: 'white', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)', transition: 'background-color 0.3s ease' }}
              >
                Start Over
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
