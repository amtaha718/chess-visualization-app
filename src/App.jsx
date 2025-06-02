// src/App.js

import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getIncorrectMoveExplanation } from './ai';
import PuzzleGenerator from './puzzle-generator';
import LichessPuzzleFetcher from './lichess-puzzles'; // Add this import at the top
import './index.css';

const getBoardSize = () => (window.innerWidth < 500 ? window.innerWidth - 40 : 400);

const getSquareCoordinates = (square, boardSize) => {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = 8 - parseInt(square[1], 10);
  const squareSize = boardSize / 8;
  return {
    x: file * squareSize + squareSize / 2,
    y: rank * squareSize + squareSize / 2
  };
};

const App = () => {
  // ALL STATE VARIABLES GO HERE (INSIDE THE COMPONENT)
  const [puzzles, setPuzzles] = useState([]);
  const [isLoadingPuzzles, setIsLoadingPuzzles] = useState(true);
  const [boardSize, setBoardSize] = useState(getBoardSize());
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardPosition, setBoardPosition] = useState('');
  const [arrows, setArrows] = useState([]);
  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [selectedSquares, setSelectedSquares] = useState([]);
  const [isUserTurnToMove, setIsUserTurnToMove] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const internalGameRef = useRef(null);
  const [difficulty, setDifficulty] = useState('all');

  

useEffect(() => {
  async function loadLichessPuzzles() {
    try {
      console.log('Loading puzzles from Lichess database...');
      const fetcher = new LichessPuzzleFetcher();
      const lichessPuzzles = await fetcher.getPuzzlesForApp('all', 15);
      
      if (lichessPuzzles.length > 0) {
        setPuzzles(lichessPuzzles);
        console.log(`Loaded ${lichessPuzzles.length} Lichess puzzles`);
      } else {
        // Fallback to curated puzzles
        const curatedPuzzles = fetcher.getCuratedPuzzles(10);
        setPuzzles(curatedPuzzles);
        console.log('Using curated backup puzzles');
      }
    } catch (error) {
      console.error('Failed to load puzzles:', error);
      // Use minimal fallback
      setPuzzles([]);
    } finally {
      setIsLoadingPuzzles(false);
    }
  }
  
  loadLichessPuzzles();
}, []);

  // Update board size on resize
  useEffect(() => {
    const handleResize = () => setBoardSize(getBoardSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Whenever puzzle changes, reset state
  useEffect(() => {
    resetCurrentPuzzle(currentPuzzleIndex);
  }, [currentPuzzleIndex]);

  const resetCurrentPuzzle = (index) => {
    const puzzle = puzzles[index];
    internalGameRef.current = new Chess(puzzle.fen);
    setBoardPosition(puzzle.fen);
    setCurrentMoveIndex(0);
    setArrows([]);
    setHighlightedSquares({});
    setSelectedSquares([]);
    setIsUserTurnToMove(false);
    setFeedbackMessage('');
  };

  const handleDifficultyChange = async (newDifficulty) => {
  setDifficulty(newDifficulty);
  setIsLoadingPuzzles(true);
  
  try {
    const fetcher = new LichessPuzzleFetcher();
    const newPuzzles = await fetcher.getPuzzlesForApp(newDifficulty, 15);
    setPuzzles(newPuzzles);
    setCurrentPuzzleIndex(0); // Reset to first puzzle
  } catch (error) {
    console.error('Failed to load new difficulty:', error);
  } finally {
    setIsLoadingPuzzles(false);
  }
};

  const handleShowMove = () => {
    const move = puzzles[currentPuzzleIndex].moves[currentMoveIndex];
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);

    // Show arrow only; do not relocate pieces
    setArrows([{ from, to }]);

    if (currentMoveIndex < 2) {
      setCurrentMoveIndex((i) => i + 1);
    } else {
      // After showing Move 1 & 2, play them on internal game & update board
      const puzzle = puzzles[currentPuzzleIndex];
      const game = new Chess(puzzle.fen);
      const move1 = puzzle.moves[0]; // 'c1g5'
const move2 = puzzle.moves[1]; // 'f8e7'

game.move({ from: move1.slice(0, 2), to: move1.slice(2, 4) });
game.move({ from: move2.slice(0, 2), to: move2.slice(2, 4) });

// NEW DEBUGGING LOGS:
console.log('Move 1 being applied:', move1);
console.log('Move 2 being applied:', move2);
console.log('Game history after moves 1&2:', game.history());

internalGameRef.current = game;
console.log('After applying moves 1&2:', game.fen());
console.log('Available moves after 1&2:', game.moves());

      setIsUserTurnToMove(true);
      setFeedbackMessage(
        'Recall moves 1 and 2 in your mind—then choose the squares for the strongest move 3.'
      );
      setArrows([]);
    }
  };

  const handleSquareClick = (square) => {
    if (!isUserTurnToMove) return;

    if (selectedSquares.length === 0) {
      setSelectedSquares([square]);
      setHighlightedSquares({
        [square]: { backgroundColor: 'rgba(173, 216, 230, 0.6)' }
      });
      setFeedbackMessage('Select the destination square of your move.');
    } else {
      const from = selectedSquares[0];
      const to = square;
      const userGuess = from + to;
      const correctMove = puzzles[currentPuzzleIndex].moves[2];

      setHighlightedSquares({
        [from]: { backgroundColor: 'rgba(173, 216, 230, 0.6)' },
        [to]: { backgroundColor: 'rgba(173, 216, 230, 0.6)' }
      });

      setTimeout(() => {
        setHighlightedSquares({});
        evaluateUserMove(from, to, userGuess, correctMove);
      }, 1000);

      setSelectedSquares([]);
    }
  };

  const evaluateUserMove = async (from, to, userGuess, correctMove) => {
    console.log('Current FEN:', internalGameRef.current.fen());
  console.log('Attempting move from', from, 'to', to);
  console.log('Available moves:', internalGameRef.current.moves());
    console.log('User guess as coordinate:', userGuess);
  console.log('from square:', from, 'to square:', to);
    // Validate on internalGameRef (already after Move 1 & 2)
    const tempGame = new Chess(internalGameRef.current.fen());
    const moveResult = tempGame.move({ from, to });
    console.log('Chess.js move result:', moveResult);

    if (!moveResult) {
      setFeedbackMessage('Illegal move.');
      return;
    }

    setIsUserTurnToMove(false);
    setFeedbackMessage('Analyzing your move…');

    // Sequence: Moves 1, 2, then the user's guess
    const sequence = [
      puzzles[currentPuzzleIndex].moves[0],
      puzzles[currentPuzzleIndex].moves[1],
      userGuess
    ];
    playMoveSequence(sequence, userGuess === correctMove);

    if (userGuess !== correctMove) {
      try {
        const explanation = await getIncorrectMoveExplanation(
  internalGameRef.current.fen(),
  userGuess,
  correctMove
);
        setFeedbackMessage(`Incorrect. ${explanation}`);
      } catch (err) {
        console.error(err);
        setFeedbackMessage(
          'Incorrect. (Failed to fetch explanation; try again.)'
        );
      }
    }
  };

  const playMoveSequence = (moves, isCorrect) => {
    const puzzle = puzzles[currentPuzzleIndex];
    const game = new Chess(puzzle.fen);
    setBoardPosition(puzzle.fen);
    setArrows([]);

    moves.forEach((move, i) => {
      setTimeout(() => {
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        game.move({ from, to });
        setBoardPosition(game.fen());
        setArrows([{ from, to }]);
      }, i * 1000);
    });

    setTimeout(() => {
      if (isCorrect) {
        setFeedbackMessage(`Correct! ${puzzle.explanation}`);
      }
      setTimeout(() => setArrows([]), 700);
    }, moves.length * 1000 + 300);
  };

  const handleRevealSolution = () => {
    const puzzle = puzzles[currentPuzzleIndex];
    playMoveSequence(puzzle.moves, true);
  };

  const buttonStyle = {
    margin: '5px',
    padding: '8px 16px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#4CAF50',
    color: 'white',
    cursor: 'pointer',
    boxShadow: '2px 2px 6px rgba(0,0,0,0.2)',
    transition: 'background-color 0.3s ease'
  };

  const renderArrows = () => (
    <svg
      width={boardSize}
      height={boardSize}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="5"
          markerHeight="3.5"
          refX="5"
          refY="1.75"
          orient="auto"
        >
          <polygon points="0 0, 5 1.75, 0 3.5" fill="rgba(30, 144, 255, 0.7)" />
        </marker>
      </defs>
      {arrows.map(({ from, to }, i) => {
        const start = getSquareCoordinates(from, boardSize);
        const end = getSquareCoordinates(to, boardSize);
        return (
          <line
            key={i}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="rgba(30, 144, 255, 0.7)"
            strokeWidth="5"
            markerEnd="url(#arrowhead)"
          />
        );
      })}
    </svg>
  );
if (isLoadingPuzzles) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <h2>Generating Chess Puzzles...</h2>
      <p>This may take a moment while we create personalized tactical sequences.</p>
    </div>
  );
}
  return (
    <div
  className="App"
  style={{
    paddingTop: '4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }}
>
  <img
    src="/logo.png"
    alt="Visualize 3 Logo"
    style={{
      height: boardSize > 360 ? '100px' : '60px',
      marginTop: '2px',
      marginBottom: '2px'
    }}
  />
  <h1 style={{ fontSize: '22px', marginTop: '2px', marginBottom: '4px' }}>
    Chess Visualization Trainer
  </h1>
  <p
    style={{
      maxWidth: '600px',
      textAlign: 'center',
      marginBottom: '16px'
    }}
  >
    Strengthen your chess memory and tactical foresight. Watch the first two
    moves play out, then use your recall skills to find the best third move
    without any visual aids.
  </p>
  <p>
    Puzzle {currentPuzzleIndex + 1} of {puzzles.length}
  </p>
  <div style={{ position: 'relative', width: boardSize, height: boardSize }}>
    <Chessboard
      position={boardPosition}
      onSquareClick={handleSquareClick}
      boardWidth={boardSize}
      arePiecesDraggable={false}
      customSquareStyles={highlightedSquares}
      customDarkSquareStyle={{ backgroundColor: '#4caf50' }}
      customLightSquareStyle={{ backgroundColor: '#f1f1e6' }}
    />
    {renderArrows()}
  </div>
  <p style={{ 
      maxWidth: '600px', 
      textAlign: 'center', 
      wordWrap: 'break-word',
      padding: '0 10px'
    }}>
    {feedbackMessage}
  </p>

  {/* Difficulty Selection */}
  <div style={{ marginBottom: '10px' }}>
    <span style={{ marginRight: '10px' }}>Difficulty: </span>
    {['beginner', 'intermediate', 'advanced', 'all'].map(diff => (
      <button
        key={diff}
        style={{
          ...buttonStyle,
          backgroundColor: difficulty === diff ? '#2196F3' : '#4CAF50',
          margin: '2px'
        }}
        onClick={() => handleDifficultyChange(diff)}
      >
        {diff.charAt(0).toUpperCase() + diff.slice(1)}
      </button>
    ))}
  </div>

  {/* Button Container */}
  <div
    style={{
      marginTop: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px'
    }}
  >
    {/* Top row: Main action buttons */}
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '5px'
    }}>
      <button style={buttonStyle} onClick={handleShowMove}>
        {currentMoveIndex < 2 ? `Show Move ${currentMoveIndex + 1}` : 'Your Move'}
      </button>
      <button style={buttonStyle} onClick={() => resetCurrentPuzzle(currentPuzzleIndex)}>
        Replay
      </button>
      <button style={buttonStyle} onClick={handleRevealSolution}>
        Reveal Solution
      </button>
    </div>
    
    {/* Bottom row: Navigation buttons */}
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '5px'
    }}>
      <button
        style={buttonStyle}
        onClick={() =>
          setCurrentPuzzleIndex((i) => (i - 1 + puzzles.length) % puzzles.length)
        }
      >
        Previous Puzzle
      </button>
      <button
        style={buttonStyle}
        onClick={() => setCurrentPuzzleIndex((i) => (i + 1) % puzzles.length)}
      >
        Next Puzzle
      </button>
    </div>
  </div>
</div>
  );
};

export default App;
