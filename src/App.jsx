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
    moves: ['f3e5', 'e8e5', 'd2d4', 'c5d4', 'c3d4', 'e5e2']
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
    moves: ['e2e4', 'e7e5', 'd2d4', 'e5d4']
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
    console.log("resetCurrentPuzzle called for index:", puzzleIndex);
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
      console.log("handleNextMove: before update, currentMoveIndex:", currentMoveIndex, "currentPuzzleIndex:", currentPuzzleIndex);
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
        console.log("handleNextMove: after arrow display, new Move Index will be:", currentMoveIndex + 1);

      } else {
        // This block is reached if currentMoveIndex is 2 or more,
        // meaning the two automatic moves have been played.
        // Now it's time to prompt the user for their move.
        console.log("handleNextMove: Two automatic moves played. Transitioning to user test mode.");
        setArrows([]); // Clear automatic arrows
        setIsUserTurnToMove(true); // Activate user's turn
        // Revert board to initial FEN for the user to make their move
        setBoardPosition(puzzles[currentPuzzleIndex].fen);
        console.log("handleNextMove: Board reset to initial FEN for puzzle", currentPuzzleIndex, ":", puzzles[currentPuzzleIndex].fen);
      }
    } catch (error) {
      console.error('Error in handleNextMove:', error);
      setIsVisible(false);
    }
  }

  // This function is called when the "Test" button (after auto-moves) is clicked.
  function handleEnterUserTestMode() {
    console.log("handleEnterUserTestMode: currentPuzzleIndex at test start:", currentPuzzleIndex, "FEN for test:", puzzles[currentPuzzleIndex].fen);
    setArrows([]); // Clear any lingering arrows
    setIsUserTurnToMove(true); // Set state to enable user interaction for the puzzle move
    setFeedbackMessage(''); // Clear previous feedback
    setFeedbackArrow(null); // Clear previous feedback arrow
    // Ensure board is reset to initial FEN for user's turn
    setBoardPosition(puzzles[currentPuzzleIndex].fen);
  }

  // Function to play a sequence of moves on the board
  const playMoveSequence = (movesToPlay, finalMoveIsUserGuess = false, userGuess = null) => {
    setIsUserTurnToMove(false); // Disable interaction during playback
    setFeedbackArrow(null); // Clear any existing feedback arrow
    setArrows([]); // Clear any existing arrows

    const puzzle = puzzles[currentPuzzleIndex];
    let playbackGame = new Chess(puzzle.fen); // Start with the initial puzzle FEN
    setBoardPosition(puzzle.fen); // Ensure board is at initial state for playback

    let delay = 0;
    const movePlaybackDelay = 1000; // 1 second delay between moves
    const arrowClearDelay = 700; // Clear arrow after 0.7 seconds

    // Add a 1-second pause before starting the loop if it's a user guess playback
    if (finalMoveIsUserGuess) {
      delay += 1000; // Initial 1-second pause
    }

    for (let i = 0; i < movesToPlay.length; i++) {
      const move = movesToPlay[i];
      const from = move.slice(0, 2);
      const to = move.slice(2, 4);

      setTimeout(() => {
        const moveResult = playbackGame.move({ from, to });
        if (moveResult) {
          setGame(new Chess(playbackGame.fen())); // Update game state
          setBoardPosition(playbackGame.fen()); // Update board position
          setArrows([{ from, to }]); // Show arrow for this move

          if (i < movesToPlay.length - 1) { // Clear arrow unless it's the very last move
            setTimeout(() => setArrows([]), arrowClearDelay);
          }
        } else {
          console.error(`Error during playback: Invalid move ${move} in puzzle ${currentPuzzleIndex} at step ${i}`);
          setFeedbackMessage('Error during playback. Check console.');
          setIsVisible(false);
        }

        // After the very last move in the sequence
        if (i === movesToPlay.length - 1) {
          setTimeout(() => {
            setFeedbackArrow(null); // Clear arrow
            if (finalMoveIsUserGuess) {
              const isCorrect = (userGuess === currentPuzzleMoves[currentMoveIndex]);
              setFeedbackMessage(isCorrect ? 'Correct! Well done!' : 'Incorrect move. Try again.');
              if (!isCorrect) {
                // If incorrect, revert board to initial FEN and allow retry
                setFeedbackArrow(null); // Ensure arrow is cleared immediately
                setBoardPosition(puzzles[currentPuzzleIndex].fen); // Ensure board is reset
                setIsUserTurnToMove(true); // Allow user to try again
              } else {
                // If correct, stay on this final board state
                // and enable next/replay buttons by setting isUserTurnToMove to false
                setIsUserTurnToMove(false); // Exit user turn mode
              }
            } else { // This is for "Reveal Solution"
              setFeedbackMessage('Solution revealed.');
              setIsUserTurnToMove(false); // Exit user turn mode
            }
          }, 1500); // Clear arrow and show final feedback after 1.5s
        }
      }, delay);
      delay += movePlaybackDelay;
    }
  };

  // New function to reveal the solution by playing out moves on the board
  function handleRevealSolution() {
    console.log("handleRevealSolution: Revealing solution for puzzle:", currentPuzzleIndex);
    const puzzle = puzzles[currentPuzzleIndex];
    // Play the full puzzle sequence up to the quizzed move (currentMoveIndex which is 2)
    const movesToReveal = puzzle.moves.slice(0, currentMoveIndex + 1);
    playMoveSequence(movesToReveal, false); // Not a user guess
  }


  function handleReplayPuzzle() {
    console.log("handleReplayPuzzle: Replaying puzzle:", currentPuzzleIndex);
    resetCurrentPuzzle(currentPuzzleIndex);
  }

  function handleNextPuzzle() {
    console.log("handleNextPuzzle: Advancing from puzzle", currentPuzzleIndex);
    setCurrentPuzzleIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % puzzles.length; // Loop back to 0 if at end
        console.log("handleNextPuzzle: Setting nextPuzzleIndex to:", nextIndex);
        resetCurrentPuzzle(nextIndex); // Call reset with the newly calculated index
        return nextIndex;
    });
  }

  // Handles dropping a piece onto a square (only when it's the user's turn)
  function handleDrop(sourceSquare, targetSquare) {
    if (isUserTurnToMove) { // Logic for the user's puzzle test move
      const expectedMove = currentPuzzleMoves[currentMoveIndex]; // This should be the 3rd move (index 2)
      const userGuess = `<span class="math-inline">\{sourceSquare\}</span>{targetSquare}`;
      console.log("handleDrop: User guess:", userGuess, "Expected move:", expectedMove);

      const puzzle = puzzles[currentPuzzleIndex];
      // Create the sequence to play: first two auto moves + user's guess
      const movesToPlay = [...puzzle.moves.slice(0, currentMoveIndex), userGuess];

      // Play the sequence with the user's guess as the final move
      playMoveSequence(movesToPlay, true, userGuess); // true for finalMoveIsUserGuess, pass userGuess

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
