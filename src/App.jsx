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
  const [boardSize, setBoardSize] = useState(getBoardSize());
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
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
    resetPuzzle(currentPuzzleIndex);
  }, [currentPuzzleIndex]);

  const resetPuzzle = (index) => {
    const game = new Chess(puzzles[index].fen);
    internalGameRef.current = game;
    setBoardPosition(game.fen());
    setCurrentMoveIndex(0);
    setIsUserTurnToMove(false);
    setSelectedSquares([]);
    setHighlightedSquares({});
    setFeedbackMessage('');
    setArrows([]);
  };

  const handleShowMove = () => {
    const move = puzzles[currentPuzzleIndex].moves[currentMoveIndex];
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);
    setArrows([{ from, to }]);
    if (currentMoveIndex < 2) {
      internalGameRef.current.move({ from, to });
      setBoardPosition(internalGameRef.current.fen());
      setCurrentMoveIndex(currentMoveIndex + 1);
    } else {
      setBoardPosition(puzzles[currentPuzzleIndex].fen);
      setArrows([]);
      setIsUserTurnToMove(true);
      setFeedbackMessage('Recall moves 1 and 2 in your mind—then choose the squares for the strongest move 3.');
    }
  };

  const handleSquareClick = (square) => {
    if (!isUserTurnToMove) return;
    if (selectedSquares.length === 0) {
      setSelectedSquares([square]);
      setHighlightedSquares({ [square]: { backgroundColor: 'rgba(173, 216, 230, 0.6)' } });
      setFeedbackMessage('Select the destination square of your move.');
    } else {
      const [from] = selectedSquares;
      const to = square;
      const move = { from, to };
      const testGame = new Chess(puzzles[currentPuzzleIndex].fen);
      const isValid = testGame.move(move);
      if (!isValid) {
        setFeedbackMessage('Illegal move.');
        return;
      }
      const expected = puzzles[currentPuzzleIndex].moves[2];
      const userMove = from + to;
      const correct = userMove === expected;
      const sequence = puzzles[currentPuzzleIndex].moves.slice(0, 2).concat(userMove);
      const tempGame = new Chess(puzzles[currentPuzzleIndex].fen);
      sequence.forEach(m => tempGame.move(m));
      setBoardPosition(tempGame.fen());
      setFeedbackMessage(correct ? `Correct! ${puzzles[currentPuzzleIndex].explanation}` : 'Incorrect. Try again.');
      setIsUserTurnToMove(!correct);
      setArrows([{ from, to }]);
      setSelectedSquares([]);
    }
  };

  return (
    <div
      className="App"
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        boxSizing: 'border-box',
      }}
    >
      <img src="/logo.png" alt="Visualize 3 Logo" style={{ height: '100px', marginBottom: '4px' }} />
      <h3 style={{ margin: '0 0 8px 0' }}>Chess Visualization Trainer</h3>
      <p style={{ textAlign: 'center', margin: 0 }}>
        Strengthen memory and tactics by recalling visualized moves before choosing your own.
      </p>
      <p style={{ margin: '6px 0' }}>Puzzle {currentPuzzleIndex + 1} of {puzzles.length}</p>
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
        <svg width={boardSize} height={boardSize} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <defs>
            <marker id="arrowhead" markerWidth="5" markerHeight="3.5" refX="5" refY="1.75" orient="auto">
              <polygon points="0 0, 5 1.75, 0 3.5" fill="rgba(30, 144, 255, 0.7)" />
            </marker>
          </defs>
          {arrows.map(({ from, to }, i) => {
            const file = from.charCodeAt(0) - 97;
            const rank = 8 - parseInt(from[1]);
            const toFile = to.charCodeAt(0) - 97;
            const toRank = 8 - parseInt(to[1]);
            const squareSize = boardSize / 8;
            return (
              <line
                key={i}
                x1={file * squareSize + squareSize / 2}
                y1={rank * squareSize + squareSize / 2}
                x2={toFile * squareSize + squareSize / 2}
                y2={toRank * squareSize + squareSize / 2}
                stroke="rgba(30, 144, 255, 0.7)"
                strokeWidth="5"
                markerEnd="url(#arrowhead)"
              />
            );
          })}
        </svg>
      </div>
      <p style={{ minHeight: '2em', textAlign: 'center' }}>{feedbackMessage}</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={handleShowMove}>Show Move</button>
        <button onClick={() => resetPuzzle(currentPuzzleIndex)}>Replay</button>
        <button onClick={() => setCurrentPuzzleIndex((i) => (i + 1) % puzzles.length)}>Next Puzzle</button>
      </div>
    </div>
  );
};

export default App;
