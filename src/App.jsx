// Updated and cleaned-up Chess Visualization Trainer
import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './index.css';

const puzzles = [
  {
    fen: 'r1bqkbnr/ppp2ppp/2n5/1B1pp3/3PP3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 4',
    moves: ['e4d5', 'd8d5', 'b1c3', 'd5a5', 'c1d2', 'f8b4']
  },
  // ... other puzzles truncated for brevity
];

const isValidSquare = (square) => typeof square === 'string' && /^[a-h][1-8]$/.test(square);

function App() {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [game, setGame] = useState(new Chess(puzzles[0].fen));
  const [currentPuzzleMoves, setCurrentPuzzleMoves] = useState(puzzles[0].moves);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [arrows, setArrows] = useState([]);
  const [boardPosition, setBoardPosition] = useState(puzzles[0].fen);
  const [isUserTurnToMove, setIsUserTurnToMove] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackArrow, setFeedbackArrow] = useState(null);
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
    setFeedbackArrow(null);
    setHighlightedSquares({});
    setSelectedSquares([]);
    setArrows([]);
  };

  const handleShowMove = () => {
    const move = currentPuzzleMoves[currentMoveIndex];
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);
    internalGameRef.current.move({ from, to });
    setBoardPosition(internalGameRef.current.fen());
    setArrows([{ from, to }]);
    setHighlightedSquares({ [from]: true, [to]: true });
    if (currentMoveIndex < 2) {
      setCurrentMoveIndex((i) => i + 1);
    } else {
      setIsUserTurnToMove(true);
      setFeedbackMessage('Select the starting square of your move.');
    }
  };

  const handleSquareClick = (square) => {
    if (!isUserTurnToMove) return;
    if (selectedSquares.length === 0) {
      setSelectedSquares([square]);
      setFeedbackMessage('Select the destination square of your move.');
    } else if (selectedSquares.length === 1) {
      const [from] = selectedSquares;
      const to = square;
      setSelectedSquares([]);
      handleUserMove(from, to);
    }
  };

  const handleUserMove = (from, to) => {
    const userGuess = from + to;
    const expectedMove = currentPuzzleMoves[currentMoveIndex];
    const tempGame = new Chess(internalGameRef.current.fen());
    const isValid = tempGame.move({ from, to });

    if (!isValid) {
      setFeedbackMessage('Illegal move.');
      setFeedbackArrow({ from, to, color: 'rgba(255, 0, 0, 0.4)' });
      return;
    }

    const isCorrect = userGuess === expectedMove;
    setFeedbackArrow({ from, to, color: isCorrect ? 'rgba(0,255,0,0.4)' : 'rgba(255,165,0,0.4)' });

    if (isCorrect) {
      internalGameRef.current.move({ from, to });
      setCurrentMoveIndex((i) => i + 1);
      setBoardPosition(internalGameRef.current.fen());
      setFeedbackMessage('Correct! Well done!');
      setIsUserTurnToMove(false);
    } else {
      setFeedbackMessage('Incorrect move. Try again.');
    }
  };

  const getHighlightStyles = () => {
    const styles = {};
    Object.keys(highlightedSquares).forEach(square => {
      styles[square] = { backgroundColor: 'rgba(0, 128, 255, 0.4)' };
    });
    return styles;
  };

  return (
    <div className="App" style={{ padding: 20, textAlign: 'center' }}>
      <h2>Chess Visualization Trainer</h2>
      <p>Puzzle {currentPuzzleIndex + 1} of {puzzles.length}</p>
      <Chessboard
        position={boardPosition}
        onSquareClick={handleSquareClick}
        customSquareStyles={getHighlightStyles()}
        boardWidth={400}
      />
      <p>{feedbackMessage}</p>
      {feedbackArrow && (
        <p style={{ color: feedbackArrow.color }}>Arrow: {feedbackArrow.from} → {feedbackArrow.to}</p>
      )}
      <div style={{ marginTop: 10 }}>
        <button onClick={handleShowMove}> {currentMoveIndex < 2 ? `Show Move ${currentMoveIndex + 1}` : 'Your Turn'} </button>
        <button onClick={() => resetCurrentPuzzle(currentPuzzleIndex)}>Replay</button>
        <button onClick={() => setCurrentPuzzleIndex((i) => (i + 1) % puzzles.length)}>Next Puzzle</button>
      </div>
    </div>
  );
}

export default App;
