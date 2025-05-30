import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './index.css';

const puzzles = [
  {
    fen: 'r1bqkbnr/ppp2ppp/2n5/1B1pp3/3PP3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 4',
    moves: ['e4d5', 'd8d5', 'b1c3', 'd5a5'],
    explanation: 'White gains central space and tempo, developing a piece while forcing Black’s queen into a vulnerable position.'
  },
  {
    fen: 'r1bqkb1r/pp3ppp/2n2n2/3pp3/3PP3/2P2N2/PP1N1PPP/R1BQKB1R w KQkq - 0 5',
    moves: ['e4d5', 'f6d5', 'c3c4', 'd5b6'],
    explanation: 'White challenges the center and prepares to expand on the queenside.'
  },
  {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6'],
    explanation: 'Classical opening developing knights toward the center.'
  },
  {
    fen: 'r4rk1/pp3ppp/3q1n2/2ppn3/8/P1PP1N2/1P1NQPPP/R3K2R w KQ - 0 15',
    moves: ['f3e5', 'e8e5', 'd2f3', 'd6e6'],
    explanation: 'White sacrifices to weaken Black’s king-side control and create imbalance.'
  }
];

const isValidSquare = (square) => typeof square === 'string' && /^[a-h][1-8]$/.test(square);

const getSquareCoordinates = (square, boardWidth) => {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10) - 1;
  const squareSize = boardWidth / 8;
  const x = file * squareSize + squareSize / 2;
  const y = (7 - rank) * squareSize + squareSize / 2;
  return { x, y };
};

function App() {
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
  const [showExplanation, setShowExplanation] = useState(false);
  const internalGameRef = useRef(new Chess(puzzles[0].fen));
  const boardRef = useRef(null);

  useEffect(() => {
    resetPuzzle(currentPuzzleIndex);
  }, [currentPuzzleIndex]);

  const resetPuzzle = (index) => {
    const puzzle = puzzles[index];
    setGame(new Chess(puzzle.fen));
    setBoardPosition(puzzle.fen);
    internalGameRef.current = new Chess(puzzle.fen);
    setCurrentPuzzleMoves(puzzle.moves);
    setCurrentMoveIndex(0);
    setArrows([]);
    setFeedbackMessage('');
    setIsUserTurnToMove(false);
    setHighlightedSquares({});
    setSelectedSquares([]);
    setShowExplanation(false);
  };

  const handleShowMove = () => {
    if (currentMoveIndex < 2) {
      const move = currentPuzzleMoves[currentMoveIndex];
      const from = move.slice(0, 2);
      const to = move.slice(2, 4);
      setArrows([{ from, to }]);
      setCurrentMoveIndex((prev) => prev + 1);
    } else if (currentMoveIndex === 2) {
      setFeedbackMessage("Recall moves 1 and 2 in your mind—then choose the squares for the strongest move 3.");
      setIsUserTurnToMove(true);
      setArrows([]);
    }
  };

  const handleSquareClick = (square) => {
    if (!isUserTurnToMove) return;

    if (selectedSquares.length === 0) {
      setSelectedSquares([square]);
      setHighlightedSquares({ [square]: { backgroundColor: 'rgba(255, 215, 0, 0.6)' } });
    } else if (selectedSquares.length === 1) {
      const from = selectedSquares[0];
      const to = square;
      setHighlightedSquares({
        [from]: { backgroundColor: 'rgba(255, 215, 0, 0.6)' },
        [to]: { backgroundColor: 'rgba(255, 215, 0, 0.6)' }
      });

      setTimeout(() => {
        evaluateUserMove(from, to);
      }, 1000);
    }
  };

  const evaluateUserMove = (from, to) => {
    const userMove = from + to;
    const correctMove = currentPuzzleMoves[2];
    const fullSequence = [currentPuzzleMoves[0], currentPuzzleMoves[1], userMove];

    let playbackGame = new Chess(puzzles[currentPuzzleIndex].fen);
    setIsUserTurnToMove(false);
    setHighlightedSquares({});
    let delay = 0;

    fullSequence.forEach((move, i) => {
      setTimeout(() => {
        const result = playbackGame.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
        setBoardPosition(playbackGame.fen());
        setGame(new Chess(playbackGame.fen()));
        setArrows([{ from: move.slice(0, 2), to: move.slice(2, 4) }]);
      }, delay);
      delay += 1000;
    });

    setTimeout(() => {
      if (userMove === correctMove) {
        setFeedbackMessage("Correct! Well done!");
        setShowExplanation(true);
      } else {
        setFeedbackMessage("Incorrect move. Try again.");
        setIsUserTurnToMove(true);
        setSelectedSquares([]);
      }
    }, delay + 500);
  };

  const boardWidth = 400;

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <img src="/logo.png" alt="Visualize 3" style={{ height: '200px', marginBottom: '10px' }} />
      <h2>Visualize 3</h2>
      <p>Strengthen your chess memory and tactical foresight. Watch the first two moves play out, then use your recall skills to find the best third move without any visual aids.</p>
      <p>Puzzle {currentPuzzleIndex + 1} of {puzzles.length}</p>

      <div style={{ position: 'relative', width: boardWidth, height: boardWidth }}>
        <Chessboard
          ref={boardRef}
          position={boardPosition}
          onSquareClick={handleSquareClick}
          customSquareStyles={highlightedSquares}
          customDarkSquareStyle={{ backgroundColor: '#4caf50' }}
          customLightSquareStyle={{ backgroundColor: '#f1f1e6' }}
          boardWidth={boardWidth}
        />
        <svg width={boardWidth} height={boardWidth} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <defs>
            <marker id="arrowhead-blue" markerWidth="5" markerHeight="3.5" refX="5" refY="1.75" orient="auto">
              <polygon points="5 1.75, 0 0, 0 3.5" fill="rgba(30, 144, 255, 0.7)" />
            </marker>
          </defs>
          {arrows.map((arrow, i) => {
            const from = getSquareCoordinates(arrow.from, boardWidth);
            const to = getSquareCoordinates(arrow.to, boardWidth);
            return (
              <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="rgba(30, 144, 255, 0.7)" strokeWidth="4" markerEnd="url(#arrowhead-blue)" />
            );
          })}
        </svg>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button onClick={handleShowMove} style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#4CAF50', color: 'white', border: 'none' }}>Next</button>
      </div>

      <p>{feedbackMessage}</p>

      {showExplanation && (
        <div style={{ marginTop: '20px', padding: '12px 16px', border: '1px solid #ccc', borderRadius: '6px', backgroundColor: '#f9f9f9', maxWidth: '500px', textAlign: 'center' }}>
          <strong>Why it’s the best move:</strong> {puzzles[currentPuzzleIndex].explanation}
        </div>
      )}
    </div>
  );
}

export default App;
