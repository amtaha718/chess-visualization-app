import React, { useState, useRef, useEffect } from 'react';
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
    // Puzzle 1: Simple Fork (White to play)
    fen: 'r1bqkb1r/pp3ppp/2n2n2/3pp3/3PP3/2P2N2/PP1N1PPP/R1BQKB1R w KQkq - 0 5',
    moves: ['e4d5', 'f6d5', 'c3c4']
  },
  {
    // Puzzle 2: Back Rank Mate Defense (White to play)
    fen: 'r4rk1/pp3ppp/3q1n2/2ppn3/8/P1PP1N2/1P1NQPPP/R3K2R w KQ - 0 15',
    moves: ['f3e5', 'e8e5', 'd2f3']
  },
  {
    // Puzzle 3: Pin (White to play)
    fen: 'rnbqk2r/ppp2ppp/4pn2/3p4/1b1P4/2N2N2/PPP1PPPP/R1BQKB1R w KQkq - 2 4',
    moves: ['c1g5', 'b8d7', 'e2e3']
  },
  {
    // Puzzle 4: Developing Attack (White to play)
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 2',
    moves: ['f3e5', 'd7d6', 'e5f7']
  },
  {
    // Puzzle 5: Open File Advantage (White to play)
    fen: 'r1bqk2r/ppp2ppp/2n2n2/3p4/1b1P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 0 6',
    moves: ['c1g5', 'd5e4', 'g5f6']
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
        const fullPlaybackMoves = [...puzzles[currentPuzzleIndex].moves.slice(0, currentMove
