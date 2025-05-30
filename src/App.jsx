import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './index.css';

const puzzles = [
  {
    fen: 'r1bqkbnr/ppp2ppp/2n5/1B1pp3/3PP3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 4',
    moves: ['e4d5', 'd8d5', 'b1c3', 'd5a5', 'c1d2', 'f8b4']
  },
  {
    fen: 'r1bqkb1r/pp3ppp/2n2n2/3pp3/3PP3/2P2N2/PP1N1PPP/R1BQKB1R w KQkq - 0 5',
    moves: ['e4d5', 'f6d5', 'c3c4']
  },
  {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: ['e2e4', 'e7e5', 'g1f3']
  },
  {
    fen: 'r4rk1/pp3ppp/3q1n2/2ppn3/8/P1PP1N2/1P1NQPPP/R3K2R w KQ - 0 15',
    moves: ['f3e5', 'e8e5', 'd2f3']
  },
  {
    fen: 'r1bq1rk1/ppp1bppp/2n2n2/3pp3/3P4/2P1PN2/PP1N1PPP/R1BQ1RK1 w - - 0 1',
    moves: ['d4e5', 'c6e5', 'f3e5', 'c8e6']
  },
  {
    fen: 'rnbqk1nr/ppp2ppp/3p4/8/2B1P3/5N2/PP3PPP/RNBQK2R b KQkq - 0 5',
    moves: ['g8f6', 'e1g1', 'f6e4']
  },
  {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    moves: ['g1f3', 'b8c6', 'f1b5', 'a7a6']
  },
  {
    fen: 'rnbqkb1r/pp3ppp/4pn2/2pp4/3P4/2P2N2/PP1NPPPP/R1BQKB1R w KQkq - 0 5',
    moves: ['e2e3', 'b8c6', 'd4c5']
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
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
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
  },
  {
    fen: 'rnbqkb1r/ppp2ppp/5n2/3pp3/3P4/P1P2N2/1P1NPPPP/R1BQKB1R w KQkq - 0 5',
    moves: ['e2e4', 'e7e5', 'f1d3']
  }
];

// Helper function to validate if a string is a valid chess square
const isValidSquare = (square) => typeof square === 'string' && /^[a-h][1-8]$/.test(square);

// Helper function to get square coordinates for SVG drawing
const getSquareCoordinates = (square, boardWidth) => {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10) - 1;
  const squareSize = boardWidth / 8;
  const x = file * squareSize + squareSize / 2;
  const y = (7 - rank) * squareSize + squareSize / 2;
  return { x, y };
};

// Arrow marker constants
const MARKER_WIDTH = 5;
const MARKER_HEIGHT = 4;
const MARKER_REF_X = 0; // Tail starts at the marker base
const MARKER_REF_Y = MARKER_HEIGHT / 2;
const MARKER_POLYGON_POINTS = `${MARKER_REF_X + MARKER_WIDTH} ${MARKER_REF_Y}, ${MARKER_REF_X} 0, ${MARKER_REF_X} ${MARKER_HEIGHT}`;
const ARROW_STROKE_WIDTH = 5;
const ARROWHEAD_LENGTH = 8; // Adjust as needed

function App() {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [game, setGame] = useState(new Chess(puzzles[currentPuzzleIndex].fen));
  const [currentPuzzleMoves, setCurrentPuzzleMoves] = useState(puzzles[currentPuzzleIndex].moves);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [arrows, setArrows] = useState([]);
  const [boardPosition, setBoardPosition] = useState(puzzles[currentPuzzleIndex].fen);
  const [isVisible, setIsVisible] = useState(true);
  const [isUserTurnToMove, setIsUserTurnToMove] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackArrow, setFeedbackArrow] = useState(null);
  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [selectedSquares, setSelectedSquares] = useState([]);
  const boardRef = useRef(null);
  const [internalGameForAutoMoves, setInternalGameForAutoMoves] = useState(new Chess(puzzles[currentPuzzleIndex].fen));

  useEffect(() => {
    resetCurrentPuzzle(currentPuzzleIndex);
  }, [currentPuzzleIndex]);

  const resetCurrentPuzzle = (puzzleIndex) => {
    const newPuzzle = puzzles[puzzleIndex];
    setGame(new Chess(newPuzzle.fen));
    setInternalGameForAutoMoves(new Chess(newPuzzle.fen));
    setCurrentPuzzleMoves(newPuzzle.moves);
    setCurrentMoveIndex(0);
    setArrows([]);
    setBoardPosition(newPuzzle.fen);
    setIsVisible(true);
    setIsUserTurnToMove(false);
    setFeedbackMessage('');
    setFeedbackArrow(null);
    setHighlightedSquares({});
    setSelectedSquares([]);
  };

  const handleShowMove = () => {
    setFeedbackMessage('');
    setFeedbackArrow(null);
    setHighlightedSquares({});

    if (currentMoveIndex < 2) {
      const move = currentPuzzleMoves[currentMoveIndex];
      const from = move.slice(0, 2);
      const to = move.slice(2, 4);
      setArrows([{ from, to }]);
      setHighlightedSquares({ [from]: true, [to]: true });
      internalGameForAutoMoves.move({ from, to });
      setCurrentMoveIndex((prev) => prev + 1);
    } else if (currentMoveIndex === 2) {
      setIsUserTurnToMove(true);
      setArrows([]);
      setHighlightedSquares({});
      setFeedbackMessage("Select the starting square of your move.");
    }
  };

  const handleSquareClick = (square) => {
    if (isUserTurnToMove) {
      if (selectedSquares.length === 0) {
        setSelectedSquares([square]);
        setFeedbackMessage("Select the destination square of your move.");
      } else if (selectedSquares.length === 1) {
        const sourceSquare = selectedSquares[0];
        const targetSquare = square;
        setSelectedSquares([]);
        handleUserMove(sourceSquare, targetSquare);
      }
    }
  };

  const handleUserMove = (sourceSquare, targetSquare) => {
    const expectedMove = currentPuzzleMoves[currentMoveIndex];
    const userGuess = `<span class="math-inline">\{sourceSquare\}</span>{targetSquare}`;

    const tempGameForUserMove = new Chess(internalGameForAutoMoves.fen());
    const isValidUserMove = tempGameForUserMove.move({ from: sourceSquare, to: targetSquare }) !== null;
    const isCorrectMove = userGuess === expectedMove;

    setFeedbackArrow({ from: sourceSquare, to: targetSquare, color: isValidUserMove ? (isCorrectMove ? 'rgba(0, 255, 0, 0.4)' : 'rgba(255, 165, 0, 0.4)') : 'rgba(255, 0, 0, 0.4)' });

    if (isValidUserMove) {
      if (isCorrectMove) {
        setFeedbackMessage('Correct! Well done!');
        const fullPlaybackMoves = [...puzzles[currentPuzzleIndex].moves.slice(0, currentMoveIndex), userGuess];
        playMoveSequence(fullPlaybackMoves, true, userGuess);
      } else {
        setFeedbackMessage('Incorrect move. Try again.');
        setIsUserTurnToMove(true); // Allow another attempt
      }
    } else {
      setFeedbackMessage('Illegal move.');
      setIsUserTurnToMove(true); // Allow another attempt
      setSelectedSquares([]); // Clear selection
    }
  };

  const playMoveSequence = (movesToPlay, finalMoveIsUserGuess = false, userGuess = null) => {
    setIsUserTurnToMove(false);
    setArrows([]);
    const puzzle = puzzles[currentPuzzleIndex];
    let playbackGame = new Chess(puzzle.fen);
    setBoardPosition(puzzle.fen);
    let delay = 0;
    const movePlaybackDelay = 1000;
    const arrowClearDelay = 700;

    if (finalMoveIsUserGuess) {
      delay += 1000;
    }

    movesToPlay.forEach((move, i) => {
      setTimeout(() => {
        const moveResult = playbackGame.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
        if (moveResult) {
          setGame(new Chess(playbackGame.fen()));
          setBoardPosition(playbackGame.fen());
          setArrows([{ from: move.slice(0, 2), to: move.slice(2, 4) }]);
          if (i < movesToPlay.length - 1) {
            setTimeout(() => setArrows([]), arrowClearDelay);
          }
        } else {
          console.error(`Error during playback: Invalid move ${move}`);
          setIsVisible(false);
        }

        if (i === movesToPlay.length - 1) {
          setTimeout(() => {
            setFeedbackArrow(null);
            if (finalMoveIsUserGuess) {
              const isCorrect = (userGuess === currentPuzzleMoves[currentMoveIndex]) && moveResult !== null;
              setFeedbackMessage(isCorrect ? 'Correct! Well done!' : 'Incorrect move. Try again.');
              if (!isCorrect) {
                setBoardPosition(puzzles[currentPuzzleIndex].fen);
                setIsUserTurnToMove(true);
              } else {
                setIsUserTurnToMove(false);
              }
            } else {
              setFeedbackMessage('Solution revealed.');
              setIsUserTurnToMove(false);
            }
          }, 1500);
        }
      }, delay);
      delay += movePlaybackDelay;
    });
  };

  const handleRevealSolution = () => {
    setIsUserTurnToMove(false);
    setArrows([]);
    const solutionMoves = currentPuzzleMoves.slice(0, currentMoveIndex + 1);
    playMoveSequence(solutionMoves, false);
  };

  const handleReplayPuzzle = () => {
    resetCurrentPuzzle(currentPuzzleIndex);
  };

  const handleNextPuzzle = () => {
    setCurrentPuzzleIndex((prevIndex) => (prevIndex + 1) % puzzles.length);
  };

  const getButtonText = () => {
    if (currentMoveIndex === 0) return "Show Move 1";
    if (currentMoveIndex === 1) return "Show Move 2";
    if (currentMoveIndex === 2) return "Find Move 3";
    return "Next"; // Fallback
  };

  const boardWidth = 400;
  const buttonStyle = { padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#4CAF50', color: 'white', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)', transition: 'background-color 0.3s ease' };
  const buttonStyleRed = { ...buttonStyle, backgroundColor: '#f44336' };
  const buttonStyleYellow = { ...buttonStyle, backgroundColor: '#ffc107', color: 'black' };
  const buttonStyleGray = { ...buttonStyle, backgroundColor: '#6c757d' };

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Chess Visualization Trainer</h1>
      <p style={{ marginBottom: '10px' }}>Puzzle {currentPuzzleIndex + 1} of {puzzles.length}</p>

      <div style={{ position: 'relative', width: boardWidth, height: boardWidth }}>
        <Chessboard
          ref={boardRef}
          position={boardPosition}
          onSquareClick={handleSquareClick}
          customSquareStyles={highlightedSquares}
          customBoardStyle={{
            border: '2px solid #333',
            marginBottom: '20px',
            borderRadius: '8px',
            cursor: isUserTurnToMove ? 'pointer' : 'default',
          }}
          boardWidth={boardWidth}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, width: boardWidth, height: boardWidth, pointerEvents: 'none' }}>
          <svg width={boardWidth} height={boardWidth} viewBox={`0 0 ${boardWidth} ${boardWidth}`}>
            <defs>
              <marker id="arrowhead-blue" markerWidth={MARKER_WIDTH} markerHeight={MARKER_HEIGHT} refX={MARKER_REF_X} refY={MARKER_REF_Y} orient="auto">
                <polygon points={MARKER_POLYGON_POINTS} fill="rgba(0, 128, 255, 0.4
