// Chess Visualization Trainer with SVG arrows, proper centering, and quiz interaction fixes
import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './index.css';

const puzzles = [
  {
    fen: 'r1bqkbnr/ppp2ppp/2n5/1B1pp3/3PP3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 4',
    moves: ['e4d5', 'd8d5', 'b1c3', 'd5a5', 'c1d2', 'f8b4']
  },
];

const getSquareCoordinates = (square, boardSize = 400) => {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10) - 1;
  const squareSize = boardSize / 8;
  return {
    x: file * squareSize + squareSize / 2,
    y: (7 - rank) * squareSize + squareSize / 2,
  };
};

function App() {
  const boardSize = 400;
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [game, setGame] = useState(new Chess(puzzles[0].fen));
  const [currentPuzzleMoves, setCurrentPuzzleMoves] = useState(puzzles[0].moves);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [arrows, setArrows] = useState([]);
  const [boardPosition, setBoardPosition] = useState(puzzles[0].fen);
  const [isUserTurnToMove, setIsUserTurnToMove] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [selectedSquares, setSelectedSquares] = useState([]);
  const internalGameRef = useRef(new Chess(puzzles[0].fen));

  useEffect(() => {
    resetCurrentPuzzle(currentPuzzleIndex);
  }, [currentPuzzleIndex]);

  const resetCurrentPuzzle = (index) => {
    const puzzle = puzzles[index];
    const newGame = new Chess(puzzle.fen);
    setGame(newGame);
    internalGameRef.current = new Chess(puzzle.fen);
    setBoardPosition(puzzle.fen);
    setCurrentPuzzleMoves(puzzle.moves);
    setCurrentMoveIndex(0);
    setIsUserTurnToMove(false);
    setFeedbackMessage('');
    setSelectedSquares([]);
    setHighlightedSquares({});
    setArrows([]);
  };

  const handleShowMove = () => {
    const move = currentPuzzleMoves[currentMoveIndex];
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);
    setArrows([{ from, to }]);
    if (currentMoveIndex < 2) {
      setCurrentMoveIndex((i) => i + 1);
    } else {
      setIsUserTurnToMove(true);
      setBoardPosition(puzzles[currentPuzzleIndex].fen);
      setFeedbackMessage('Select the starting square of your move.');
      setArrows([]); // Remove arrows before user input
    }
  };

  const handleSquareClick = (square) => {
    if (!isUserTurnToMove) return;
    if (selectedSquares.length === 0) {
      setSelectedSquares([square]);
      setHighlightedSquares({ [square]: { backgroundColor: 'rgba(173, 216, 230, 0.6)' } });
      setFeedbackMessage('Select the destination square of your move.');
    } else if (selectedSquares.length === 1) {
      const [from] = selectedSquares;
      const to = square;
      setSelectedSquares([]);
      setHighlightedSquares({
        [from]: { backgroundColor: 'rgba(173, 216, 230, 0.6)' },
        [to]: { backgroundColor: 'rgba(173, 216, 230, 0.6)' },
      });

      setTimeout(() => {
        setHighlightedSquares({});
        evaluateUserMove(from, to);
      }, 1000);
    }
  };

  const evaluateUserMove = (from, to) => {
    const userGuess = from + to;
    const expectedMove = currentPuzzleMoves[2];
    const tempGame = new Chess(puzzles[currentPuzzleIndex].fen);
    const isValid = tempGame.move({ from, to });

    if (!isValid) {
      setFeedbackMessage('Illegal move.');
      return;
    }

    setIsUserTurnToMove(false);

    setTimeout(() => {
      const sequence = [...currentPuzzleMoves.slice(0, 2), userGuess];
      playMoveSequence(sequence, userGuess === expectedMove);
    }, 500);
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
      setFeedbackMessage(isCorrect ? 'Correct! Well done!' : 'Incorrect move. Try again.');
      if (!isCorrect) {
        setIsUserTurnToMove(true);
        setBoardPosition(puzzles[currentPuzzleIndex].fen);
        setArrows([]);
      }
    }, moves.length * 1000 + 500);
  };

  const renderArrows = () => (
    <svg width={boardSize} height={boardSize} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="rgba(30, 144, 255, 0.7)" />
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

  return (
    <div className="App" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2>Chess Visualization Trainer</h2>
      <p>Puzzle {currentPuzzleIndex + 1} of {puzzles.length}</p>
      <div style={{ position: 'relative', width: boardSize, height: boardSize }}>
        <Chessboard
          position={boardPosition}
          onSquareClick={handleSquareClick}
          boardWidth={boardSize}
          arePiecesDraggable={false}
          customSquareStyles={highlightedSquares}
        />
        {renderArrows()}
      </div>
      <p>{feedbackMessage}</p>
      <div style={{ marginTop: 10 }}>
        <button onClick={handleShowMove}> {currentMoveIndex < 2 ? `Show Move ${currentMoveIndex + 1}` : 'Your Move'} </button>
        <button onClick={() => resetCurrentPuzzle(currentPuzzleIndex)}>Replay</button>
        <button onClick={() => setCurrentPuzzleIndex((i) => (i + 1) % puzzles.length)}>Next Puzzle</button>
      </div>
    </div>
  );
}

export default App;
