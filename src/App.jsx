// Updated Chess Visualization Trainer with visual-only arrows and reset before user move
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
    setArrows([{ from, to }]);
    setHighlightedSquares({ [from]: true, [to]: true });
    if (currentMoveIndex < 2) {
      setCurrentMoveIndex((i) => i + 1);
    } else {
      setIsUserTurnToMove(true);
      setBoardPosition(puzzles[currentPuzzleIndex].fen); // Reset to starting FEN
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
      evaluateUserMove(from, to);
    }
  };

  const evaluateUserMove = (from, to) => {
    const userGuess = from + to;
    const expectedMove = currentPuzzleMoves[2];
    const tempGame = new Chess(puzzles[currentPuzzleIndex].fen);

    if (!tempGame.move({ from, to })) {
      setFeedbackMessage('Illegal move.');
      setFeedbackArrow({ from, to, color: 'rgba(255, 0, 0, 0.4)' });
      return;
    }

    setFeedbackArrow({ from, to, color: userGuess === expectedMove ? 'rgba(0,255,0,0.4)' : 'rgba(255,165,0,0.4)' });
    setIsUserTurnToMove(false);

    setTimeout(() => {
      const sequence = [...currentPuzzleMoves.slice(0, 2), userGuess];
      playMoveSequence(sequence, userGuess === expectedMove);
    }, 1000);
  };

  const playMoveSequence = (moves, isCorrect) => {
    const puzzle = puzzles[currentPuzzleIndex];
    const game = new Chess(puzzle.fen);
    setBoardPosition(puzzle.fen);
    setArrows([]);
    setHighlightedSquares({});

    moves.forEach((move, i) => {
      setTimeout(() => {
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        game.move({ from, to });
        setBoardPosition(game.fen());
        setArrows([{ from, to }]);
        setHighlightedSquares({ [from]: true, [to]: true });
      }, i * 1000);
    });

    setTimeout(() => {
      setFeedbackMessage(isCorrect ? 'Correct! Well done!' : 'Incorrect move. Try again.');
      if (!isCorrect) {
        setIsUserTurnToMove(true);
        setBoardPosition(puzzles[currentPuzzleIndex].fen);
      }
    }, moves.length * 1000 + 500);
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
        <button onClick={handleShowMove}> {currentMoveIndex < 2 ? `Show Move ${currentMoveIndex + 1}` : 'Your Move'} </button>
        <button onClick={() => resetCurrentPuzzle(currentPuzzleIndex)}>Replay</button>
        <button onClick={() => setCurrentPuzzleIndex((i) => (i + 1) % puzzles.length)}>Next Puzzle</button>
      </div>
    </div>
  );
}

export default App;
