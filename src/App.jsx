import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './index.css';

const getBoardSize = () => (window.innerWidth < 500 ? window.innerWidth - 40 : 400);

const puzzles = [
  {
    fen: 'r1bqkbnr/ppp2ppp/2n5/1B1pp3/3PP3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 4',
    moves: ['e4d5', 'd8d5', 'b1c3', 'd5a5'],
    explanation: 'This sequence helps White develop quickly and gain tempo by targeting the black queen with Nc3, forcing her to a passive square.'
  },
  {
    fen: 'r1bqkbnr/pp3ppp/2n1p3/2pp4/3PP3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 5',
    moves: ['e4d5', 'e6d5', 'f1b5', 'g8f6'],
    explanation: 'White exchanges center pawns and develops the bishop to b5, pinning the knight and building pressure on Black’s position.'
  },
  {
    fen: 'rnbqkb1r/pp1ppppp/5n2/2p5/2P5/5NP1/PP1PPP1P/RNBQKB1R w KQkq - 0 3',
    moves: ['f1g2', 'b8c6', 'd2d4', 'c5d4'],
    explanation: 'White aims for kingside fianchetto and central control. Playing d4 strikes at the center to open lines and challenge Black’s setup.'
  },
  {
    fen: 'r1bqk1nr/pppp1ppp/2n5/4p3/1b1PP3/5N2/PPPN1PPP/R1BQKB1R w KQkq - 0 4',
    moves: ['d4e5', 'c6e5', 'f3e5', 'd7d6'],
    explanation: 'By capturing and recapturing in the center, White opens lines and clarifies central tension, with Ne5 aiming to provoke weaknesses or exchanges.'
  },
  {
    fen: 'r2qkbnr/ppp2ppp/2n1b3/3p4/3P4/2P2N2/PP2PPPP/RNBQKB1R w KQkq - 2 5',
    moves: ['c1g5', 'f8e7', 'g5e7', 'c6e7'],
    explanation: 'White trades bishop for bishop to remove a key defender and weaken Black’s kingside control, preparing to develop quickly.'
  },
  {
    fen: 'rnbqkb1r/pp3ppp/2p1pn2/3p4/3P4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 5',
    moves: ['f1d3', 'f8d6', 'e3e4', 'd5e4'],
    explanation: 'White builds up with classical development and prepares a central break. The e4 push is thematic, challenging Black’s center directly.'
  },
  {
    fen: 'rnbqkbnr/pp3ppp/4p3/2ppP3/8/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 5',
    moves: ['c2c3', 'b8c6', 'd2d4', 'c5d4'],
    explanation: 'White reinforces the center with c3 and then strikes with d4, creating tension and inviting central exchanges.'
  },
  {
    fen: 'r1bq1rk1/pppp1ppp/2n2n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 6',
    moves: ['c1g5', 'h7h6', 'g5h4', 'd7d6'],
    explanation: 'White pressures the kingside with Bg5–h4, anticipating weaknesses like g5 or f6, while Black shores up the center with d6.'
  },
  {
    fen: 'r2qk2r/ppp2ppp/2n2n2/2bp4/4P3/1NN2P2/PPP3PP/R1BQ1RK1 w kq - 0 9',
    moves: ['e4d5', 'f6d5', 'c1g5', 'd8g5'],
    explanation: 'The central exchange clears lines and the Bg5 attempt tries to seize the initiative. Black finds the resource Qxg5 to maintain balance.'
  },
  {
    fen: 'r1bqkb1r/pp2pppp/2n2n2/2pp4/3P4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 5',
    moves: ['f1d3', 'c8g4', 'd1b3', 'c5c4'],
    explanation: 'White develops with threats while preparing queenside pressure. Black responds by gaining space with ...c4 to blunt the b3 queen’s scope.'
  }
];

const App = () => {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardPosition, setBoardPosition] = useState(puzzles[0].fen);
  const [arrows, setArrows] = useState([]);
  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [selectedSquares, setSelectedSquares] = useState([]);
  const [isUserTurnToMove, setIsUserTurnToMove] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const boardSize = getBoardSize();

  const resetPuzzle = () => {
    const puzzle = puzzles[currentPuzzleIndex];
    setCurrentMoveIndex(0);
    setBoardPosition(puzzle.fen);
    setArrows([]);
    setHighlightedSquares({});
    setSelectedSquares([]);
    setIsUserTurnToMove(false);
    setFeedbackMessage('');
  };

  const getSquareCoordinates = (square) => {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(square[1]);
    const squareSize = boardSize / 8;
    return {
      x: file * squareSize + squareSize / 2,
      y: rank * squareSize + squareSize / 2,
    };
  };

  const handleShowMove = () => {
    const move = puzzles[currentPuzzleIndex].moves[currentMoveIndex];
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);
    setArrows([{ from, to }]);

    if (currentMoveIndex < 2) {
      setCurrentMoveIndex((i) => i + 1);
    } else {
      setIsUserTurnToMove(true);
      setFeedbackMessage('Recall moves 1 and 2 in your mind—then choose the squares for the strongest move 3.');
      setArrows([]);
    }
  };

  const handleSquareClick = (square) => {
    if (!isUserTurnToMove) return;

    if (selectedSquares.length === 0) {
      setSelectedSquares([square]);
      setHighlightedSquares({ [square]: { backgroundColor: 'lightblue' } });
      setFeedbackMessage('Select the destination square of your move.');
    } else {
      const [from] = selectedSquares;
      const to = square;
      const userMove = from + to;
      const correctMove = puzzles[currentPuzzleIndex].moves[2];

      setHighlightedSquares({
        [from]: { backgroundColor: 'lightblue' },
        [to]: { backgroundColor: 'lightblue' },
      });

      setTimeout(() => {
        if (userMove === correctMove) {
          setFeedbackMessage('Correct! ' + puzzles[currentPuzzleIndex].explanation);
        } else {
          setFeedbackMessage('Incorrect. Try again.');
        }
        setIsUserTurnToMove(false);
      }, 500);

      setSelectedSquares([]);
    }
  };

  const handleRevealSolution = () => {
    const moves = puzzles[currentPuzzleIndex].moves;
    const lines = moves.map((move) => {
      const from = move.slice(0, 2);
      const to = move.slice(2, 4);
      return { from, to };
    });
    setArrows(lines);
    setFeedbackMessage('Solution revealed: ' + puzzles[currentPuzzleIndex].explanation);
    setIsUserTurnToMove(false);
  };

  const renderArrows = () => (
    <svg width={boardSize} height={boardSize} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      <defs>
        <marker id="arrowhead" markerWidth="5" markerHeight="3.5" refX="5" refY="1.75" orient="auto">
          <polygon points="0 0, 5 1.75, 0 3.5" fill="rgba(30, 144, 255, 0.7)" />
        </marker>
      </defs>
      {arrows.map(({ from, to }, i) => {
        const start = getSquareCoordinates(from);
        const end = getSquareCoordinates(to);
        return (
          <line
            key={i}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="rgba(30, 144, 255, 0.7)"
            strokeWidth="4"
            markerEnd="url(#arrowhead)"
          />
        );
      })}
    </svg>
  );

  const buttonStyle = {
    margin: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    borderRadius: '6px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    cursor: 'pointer'
  };

  return (
    <div style={{ padding: 10, textAlign: 'center' }}>
      <img src="/logo.png" alt="Visualize 3 Logo" style={{ height: boardSize > 360 ? '100px' : '70px', marginBottom: '4px', marginTop: 0 }} />
      <h2 style={{ margin: '4px 0' }}>Chess Visualization Trainer</h2>
      <p style={{ margin: '8px 0' }}>Puzzle {currentPuzzleIndex + 1} of {puzzles.length}</p>
      <div style={{ position: 'relative', width: boardSize, height: boardSize, margin: '0 auto' }}>
        <Chessboard
          position={boardPosition}
          onSquareClick={handleSquareClick}
          boardWidth={boardSize}
          customSquareStyles={highlightedSquares}
          arePiecesDraggable={false}
        />
        {renderArrows()}
      </div>
      <p>{feedbackMessage}</p>
      <div style={{ marginTop: 12 }}>
        <button style={buttonStyle} onClick={handleShowMove}>
          {currentMoveIndex < 2 ? `Show Move ${currentMoveIndex + 1}` : 'Your Move'}
        </button>
        <button style={buttonStyle} onClick={resetPuzzle}>Replay</button>
        <button style={buttonStyle} onClick={() => setCurrentPuzzleIndex((i) => (i + 1) % puzzles.length)}>Next Puzzle</button>
        <button style={buttonStyle} onClick={handleRevealSolution}>Reveal Solution</button>
      </div>
    </div>
  );
};

export default App;
