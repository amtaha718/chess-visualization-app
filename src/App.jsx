import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './index.css';

const getBoardSize = () => (window.innerWidth < 500 ? window.innerWidth - 40 : 400);

const puzzles = [/* ... your puzzle data from earlier (keep unchanged) ... */];

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
  const [boardSize, setBoardSize] = useState(getBoardSize());
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
    const handleResize = () => setBoardSize(getBoardSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      setFeedbackMessage('Recall moves 1 and 2 in your mind—then choose the squares for the strongest move 3.');
      setArrows([]);
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
      setFeedbackMessage(isCorrect
        ? `Correct! Well done! ${puzzle.explanation ?? ''}`
        : 'Incorrect move. Try again.');
      if (!isCorrect) {
        setIsUserTurnToMove(true);
        setBoardPosition(puzzle.fen);
        setArrows([]);
      }
    }, moves.length * 1000 + 500);
  };

  const renderArrows = () => (
    <svg width={boardSize} height={boardSize} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      <defs>
        <marker id="arrowhead" markerWidth="5" markerHeight="3.5" refX="5" refY="1.75" orient="auto">
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
    transition: 'background-color 0.3s ease',
  };

  return (
    <div className="App" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <img
        src="/logo.png"
        alt="Visualize 3 Logo"
        style={{
          height: boardSize > 360 ? '200px' : '120px',
          marginBottom: '10px'
        }}
      />
      <h3 style={{ margin: 0 }}>Chess Visualization Trainer</h3>
      <p style={{
        maxWidth: '90%',
        textAlign: 'center',
        marginBottom: '20px',
        fontSize: boardSize < 360 ? '14px' : '16px'
      }}>
        Strengthen your chess memory and tactical foresight. Watch the first two moves play out, then use your recall skills to find the best third move without any visual aids.
      </p>
      <p>Puzzle {currentPuzzleIndex + 1} of {puzzles.length}</p>
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
      <p>{feedbackMessage}</p>
      <div style={{
        marginTop: 10,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button style={buttonStyle} onClick={handleShowMove}>
          {currentMoveIndex < 2 ? `Show Move ${currentMoveIndex + 1}` : 'Your Move'}
        </button>
        <button style={buttonStyle} onClick={() => resetCurrentPuzzle(currentPuzzleIndex)}>Replay</button>
        <button style={buttonStyle} onClick={() => setCurrentPuzzleIndex((i) => (i + 1) % puzzles.length)}>Next Puzzle</button>
      </div>
    </div>
  );
}

export default App;
