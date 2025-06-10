import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getIncorrectMoveExplanation, getCorrectMoveExplanation } from './ai';
import './index.css';
import UserSystem from './user-system';
import { AuthModal, UserProfile } from './auth-components';

// Responsive board sizing
const getBoardSize = () => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const headerHeight = 80;
  
  if (windowWidth <= 768) {
    // Mobile: Use most of screen width with padding
    return Math.min(windowWidth - 40, windowHeight - headerHeight - 200);
  } else if (windowWidth <= 1024) {
    // Tablet: Balanced approach
    const availableHeight = windowHeight - headerHeight - 60;
    const availableWidth = windowWidth * 0.6 - 40;
    return Math.min(availableWidth, availableHeight);
  } else {
    // Desktop: Use middle column (50% width)
    const availableHeight = windowHeight - headerHeight - 40;
    const availableWidth = windowWidth * 0.5 - 40;
    return Math.min(availableWidth, availableHeight);
  }
};

// Mobile detection
const isMobile = () => window.innerWidth <= 768;
const isTablet = () => window.innerWidth > 768 && window.innerWidth <= 1024;

// Helper function to determine whose turn it is from FEN
const getActiveColor = (fen) => {
  const parts = fen.split(' ');
  return parts[1] === 'w' ? 'white' : 'black';
};

// Session persistence helpers
const STORAGE_KEY = 'chess-trainer-session';

const saveSessionData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save session data:', error);
  }
};

const loadSessionData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Failed to load session data:', error);
    return null;
  }
};

// Helper function to get ordinal suffix (4th, 6th, 8th)
const getOrdinalSuffix = (num) => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
};

// Icon Components
const FlameIcon = ({ streak }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 8 6 8 12C8 16.4183 10.5817 19 12 19C13.4183 19 16 16.4183 16 12C16 6 12 2 12 2Z" 
            fill="#FF6B35" stroke="#FF4500" strokeWidth="1"/>
      <path d="M10 12C10 12 9 9 12 9C15 9 14 12 14 12C14 14 13 15 12 15C11 15 10 14 10 12Z" 
            fill="#FFD700"/>
    </svg>
    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#FF4500' }}>
      {streak}
    </span>
  </div>
);

const CoursesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3L1 9L12 15L21 9V16H23V9L12 3ZM5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z"/>
  </svg>
);

const InviteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 4C18.2091 4 20 5.79086 20 8C20 10.2091 18.2091 12 16 12C13.7909 12 12 10.2091 12 8C12 5.79086 13.7909 4 16 4ZM16 14C20.4183 14 24 17.5817 24 22H22C22 18.6863 19.3137 16 16 16C12.6863 16 10 18.6863 10 22H8C8 17.5817 11.5817 14 16 14ZM8 12C10.2091 12 12 10.2091 12 8C12 5.79086 10.2091 4 8 4C5.79086 4 4 5.79086 4 8C4 10.2091 5.79086 12 8 12ZM8 14C3.58172 14 0 17.5817 0 22H2C2 18.6863 4.68629 16 8 16C9.67362 16 11.2116 16.6135 12.3649 17.6211L11.0649 19.0789C10.2852 18.4146 9.18967 18 8 18Z"/>
  </svg>
);

const AboutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
  </svg>
);

const DarkModeIcon = ({ isDark }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    {isDark ? (
      <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/>
    ) : (
      <path d="M9 2c-1.05 0-2.05.16-3 .46 4.06 1.27 7 5.06 7 9.54 0 4.48-2.94 8.27-7 9.54.95.3 1.95.46 3 .46 5.52 0 10-4.48 10-10S14.52 2 9 2z"/>
    )}
  </svg>
);

const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
  </svg>
);

// Control icons
const PrevIcon = () => (
  <svg width={isMobile() ? "20" : "24"} height={isMobile() ? "20" : "24"} viewBox="0 0 24 24" fill="black">
    <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
  </svg>
);

const PlayIcon = ({ isPlaying }) => (
  <svg width={isMobile() ? "22" : "27"} height={isMobile() ? "22" : "27"} viewBox="0 0 24 24" fill="black">
    {isPlaying ? (
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    ) : (
      <path d="M8 5v14l11-7z"/>
    )}
  </svg>
);

const HintIcon = () => (
  <svg width={isMobile() ? "20" : "24"} height={isMobile() ? "20" : "24"} viewBox="0 0 24 24" fill="black">
    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/>
    <circle cx="12" cy="9" r="1" fill="white"/>
  </svg>
);

const RevealIcon = () => (
  <svg width={isMobile() ? "22" : "27"} height={isMobile() ? "22" : "27"} viewBox="0 0 24 24" fill="black">
    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm-1 13h2v-6h-2v6zm0-8h2V5h-2v2z"/>
  </svg>
);

const NextIcon = () => (
  <svg width={isMobile() ? "20" : "24"} height={isMobile() ? "20" : "24"} viewBox="0 0 24 24" fill="black">
    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
  </svg>
);

const CollapseIcon = ({ isCollapsed }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="black">
    {isCollapsed ? (
      <path d="M7 10l5 5 5-5z"/>
    ) : (
      <path d="M7 14l5-5 5 5z"/>
    )}
  </svg>
);

// Theme Display Names - ALL THEMES
const THEME_DISPLAY_NAMES = {
  'opening': 'Openings',
  'endgame': 'End Game',
  'middlegame': 'Middle Game',
  'mate': 'Checkmate',
  'checkmate': 'Checkmate',
  'advantage': 'Advantage',
  'fork': 'Fork',
  'discoveredAttack': 'Discovered Attack',
  'pin': 'Pin',
  'skewer': 'Skewer',
  'sacrifice': 'Sacrifice',
  'defensiveMove': 'Defensive Move',
  'deflection': 'Deflection',
  'xRayAttack': 'X-Ray Attack',
  'doubleAttack': 'Double Attack',
  'removal': 'Removal',
  'interference': 'Interference',
  'decoy': 'Decoy',
  'clearance': 'Clearance',
  'zugzwang': 'Zugzwang',
  'quiet': 'Quiet Move',
  'trappedPiece': 'Trapped Piece',
  'attraction': 'Attraction',
  'kingAttack': 'King Attack',
  'pawnEndgame': 'Pawn Endgame',
  'rookEndgame': 'Rook Endgame',
  'queenEndgame': 'Queen Endgame',
  'knightEndgame': 'Knight Endgame',
  'bishopEndgame': 'Bishop Endgame',
  'promotion': 'Promotion',
  'enPassant': 'En Passant',
  'castling': 'Castling',
  'underPromotion': 'Under Promotion'
};

const FeedbackCard = ({ message, type = 'info' }) => {
  if (!message) return null;
  
  const colors = {
    success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
    error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
    info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' },
    warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' }
  };
  
  const style = colors[type] || colors.info;
  
  return (
    <div style={{
      backgroundColor: style.bg,
      border: `1px solid ${style.border}`,
      color: style.text,
      padding: isMobile() ? '12px 15px' : '15px 20px',
      borderRadius: '8px',
      fontSize: isMobile() ? '14px' : '15px',
      fontWeight: '500',
      lineHeight: '1.4',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      textAlign: 'justify'
    }}>
      {message}
    </div>
  );
};

const App = () => {
  // EXISTING STATE VARIABLES
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardPosition, setBoardPosition] = useState('');
  const [currentMove, setCurrentMove] = useState(null);
  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [selectedSquares, setSelectedSquares] = useState([]);
  const [isUserTurnToMove, setIsUserTurnToMove] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState('info');
  const [puzzlePhase, setPuzzlePhase] = useState('ready');
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(2250);
  const [sequenceLength, setSequenceLength] = useState(4);
  const [boardSize, setBoardSize] = useState(() => getBoardSize());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const autoPlayRef = useRef(null);
  const internalGameRef = useRef(null);

  // USER SYSTEM STATE VARIABLES
  const [puzzles, setPuzzles] = useState([]);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileUpdateKey, setProfileUpdateKey] = useState(0);
  const [userSystem] = useState(() => new UserSystem());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [puzzleStartTime, setPuzzleStartTime] = useState(null);
  
  // PUZZLE ATTEMPT TRACKING
  const [puzzleAttempted, setPuzzleAttempted] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  
  // LOADING STATES
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPuzzles, setIsLoadingPuzzles] = useState(false);
  
  // SESSION PERSISTENCE STATE
  const [selectedDifficulty, setSelectedDifficulty] = useState(() => {
    const savedSession = loadSessionData();
    return savedSession?.difficulty || 'intermediate';
  });

  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  
  // THEME SELECTION STATE
  const [selectedTheme, setSelectedTheme] = useState('all');
  const [availableThemes, setAvailableThemes] = useState([]);
  const [isThemesCollapsed, setIsThemesCollapsed] = useState(true);
  
  // BOARD ORIENTATION STATE
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [userPlayingAs, setUserPlayingAs] = useState('white');

  // SETTINGS STATE
  const [isSettingsCollapsed, setIsSettingsCollapsed] = useState(false);

  // RESPONSIVE STATE
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Mock data for demonstration
  const mockUser = {
    id: '1',
    email: 'user@example.com'
  };

  const mockProfile = {
    display_name: 'TestUser123',
    username: 'TestUser123',
    current_rating: 1847,
    longest_streak: 12,
    puzzles_solved: 245
  };

  // Mock puzzles with proper 4-move sequences
  const mockPuzzles = [{
    id: 1,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    moves: ['f3e5', 'c6e5', 'c4f7', 'e8f7'],
    explanation: 'Nxe5 wins material by forking the king and attacking the knight.',
    difficulty: 'intermediate',
    themes: ['fork', 'check']
  }];

  // Update board size on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setBoardSize(getBoardSize());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize with mock data
  useEffect(() => {
    setUser(mockUser);
    setUserProfile(mockProfile);
    setPuzzles(mockPuzzles);
    setBoardPosition(mockPuzzles[0].fen);
    setIsLoadingAuth(false);
    setFeedbackMessage('Click the play button to watch the first 3 moves!');
    setFeedbackType('info');
    
    // Initialize chess game
    const game = new Chess(mockPuzzles[0].fen);
    internalGameRef.current = game;
  }, []);

  // Helper function to validate puzzle data
  const validatePuzzle = useCallback((puzzle) => {
    if (!puzzle.moves || puzzle.moves.length !== sequenceLength) {
      console.warn(`Puzzle does not have exactly ${sequenceLength} moves:`, puzzle);
      return false;
    }
    
    for (let i = 0; i < sequenceLength; i++) {
      const move = puzzle.moves[i];
      if (!move || move.length < 4) {
        console.warn(`Invalid move format at index ${i}:`, move);
        return false;
      }
    }
    
    return true;
  }, [sequenceLength]);

  // Render SVG arrow for move visualization - FIXED
  const renderMoveArrow = () => {
    if (!currentMove) return null;
    
    const { from, to } = currentMove;
    
    // Calculate arrow positions
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fromFile = files.indexOf(from[0]);
    const fromRank = parseInt(from[1]);
    const toFile = files.indexOf(to[0]);
    const toRank = parseInt(to[1]);
    
    // Convert to pixel coordinates (assuming standard 8x8 grid)
    const squareSize = boardSize / 8;
    const fromX = (boardOrientation === 'white' ? fromFile : 7 - fromFile) * squareSize + squareSize / 2;
    const fromY = (boardOrientation === 'white' ? 8 - fromRank : fromRank - 1) * squareSize + squareSize / 2;
    const toX = (boardOrientation === 'white' ? toFile : 7 - toFile) * squareSize + squareSize / 2;
    const toY = (boardOrientation === 'white' ? 8 - toRank : toRank - 1) * squareSize + squareSize / 2;
    
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: boardSize,
          height: boardSize,
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        <svg
          width={boardSize}
          height={boardSize}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8.4"
              markerHeight="5.6"
              refX="7.7"
              refY="2.8"
              orient="auto"
            >
              <polygon
                points="0 0, 8.4 2.8, 0 5.6"
                fill="#2196F3"
                stroke="#1976D2"
                strokeWidth="1"
              />
            </marker>
          </defs>
          <line
            x1={fromX}
            y1={fromY}
            x2={toX}
            y2={toY}
            stroke="#2196F3"
            strokeWidth="4"
            markerEnd="url(#arrowhead)"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  };

  // Reset puzzle function - FIXED
  const resetCurrentPuzzle = useCallback((index) => {
    if (!puzzles || puzzles.length === 0 || !puzzles[index]) {
      return;
    }

    const puzzle = puzzles[index];
    
    if (!validatePuzzle(puzzle)) {
      setFeedbackMessage('This puzzle appears to be invalid. Loading new puzzles...');
      setFeedbackType('error');
      return;
    }

    const game = new Chess(puzzle.fen);
    
    // Determine who plays the final move
    const tempGame = new Chess(puzzle.fen);
    for (let i = 0; i < sequenceLength - 1; i++) {
      tempGame.move({ from: puzzle.moves[i].slice(0, 2), to: puzzle.moves[i].slice(2, 4) });
    }
    
    const userPlaysAs = tempGame.turn() === 'w' ? 'white' : 'black';
    setUserPlayingAs(userPlaysAs);
    setBoardOrientation(userPlaysAs);
    
    internalGameRef.current = game;
    setBoardPosition(puzzle.fen);
    setCurrentMoveIndex(0);
    setCurrentMove(null);
    setHighlightedSquares({});
    setSelectedSquares([]);
    setIsUserTurnToMove(false);
    setIsAutoPlaying(false);
    setPuzzlePhase('ready');
    setFeedbackMessage(`Click the play button to watch the first ${sequenceLength - 1} moves!`);
    setFeedbackType('info');
    
    // Reset puzzle tracking
    setPuzzleAttempted(false);
    setHintUsed(false);
    
    // Clear any running timers
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
    }
  }, [puzzles, sequenceLength, validatePuzzle]);

  // Reset puzzle when index changes
  useEffect(() => {
    if (puzzles.length > 0) {
      resetCurrentPuzzle(currentPuzzleIndex);
    }
  }, [currentPuzzleIndex, puzzles, resetCurrentPuzzle]);

  // AUTO-PLAY FUNCTIONALITY - FIXED
  const startAutoPlay = () => {
    if (isAutoPlaying) return;
    
    // Allow replay even after sequence is complete
    if (puzzlePhase === 'complete' || puzzlePhase === 'playing') {
      // Reset to beginning for replay
      setBoardPosition(puzzles[currentPuzzleIndex].fen);
      setCurrentMoveIndex(0);
      setCurrentMove(null);
      setPuzzlePhase('watching');
      setIsUserTurnToMove(false);
    }
    
    setIsAutoPlaying(true);
    setPuzzlePhase('watching');
    setPuzzleStartTime(Date.now());
    setFeedbackMessage('Watch carefully and memorize these moves!');
    setFeedbackType('warning');
    
    // Start the sequence
    playMoveSequence(0);
  };

  const playMoveSequence = (moveIndex) => {
    if (moveIndex >= sequenceLength - 1) {
      // After all setup moves, set up for user's turn
      setupUserTurn();
      return;
    }

    const puzzle = puzzles[currentPuzzleIndex];
    const move = puzzle.moves[moveIndex];
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);

    // Apply the move to the game
    const game = new Chess(internalGameRef.current.fen());
    const moveResult = game.move({ from, to });
    
    if (moveResult) {
      setBoardPosition(game.fen());
      internalGameRef.current = game;
      
      // Show move with arrow highlighting
      setCurrentMove({ from, to });
      setCurrentMoveIndex(moveIndex + 1);
    }

    // Schedule next move
    autoPlayRef.current = setTimeout(() => {
      playMoveSequence(moveIndex + 1);
    }, playSpeed);
  };

  const setupUserTurn = () => {
    setIsAutoPlaying(false);
    setPuzzlePhase('playing');
    setCurrentMove(null); // Clear highlighting
    setIsUserTurnToMove(true);
    setFeedbackMessage(`Recall the position after ${sequenceLength - 1} moves and play the best ${sequenceLength}${getOrdinalSuffix(sequenceLength)} move!`);
    setFeedbackType('info');
  };

  const pauseAutoPlay = () => {
    setIsAutoPlaying(false);
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
    }
  };

  // Handle square click
  const handleSquareClick = (square) => {
    if (!isUserTurnToMove) return;

    if (selectedSquares.length === 0) {
      setSelectedSquares([square]);
      setHighlightedSquares({
        [square]: { backgroundColor: 'rgba(173, 216, 230, 0.6)' }
      });
      setFeedbackMessage('Select the destination square of your move.');
      setFeedbackType('info');
    } else {
      const from = selectedSquares[0];
      const to = square;
      const userGuess = from + to;
      const correctMove = puzzles[currentPuzzleIndex].moves[sequenceLength - 1];

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
    const tempGame = new Chess(internalGameRef.current.fen());
    const moveResult = tempGame.move({ from, to });

    if (!moveResult) {
      setFeedbackMessage('Illegal move.');
      setFeedbackType('error');
      return;
    }

    setIsUserTurnToMove(false);
    setPuzzlePhase('complete');
    setFeedbackMessage('Analyzing your move…');
    setFeedbackType('info');

    const timeTaken = puzzleStartTime ? Math.round((Date.now() - puzzleStartTime) / 1000) : null;
    const solved = userGuess === correctMove;
    const currentPuzzle = puzzles[currentPuzzleIndex];

    // Mark that user has attempted this puzzle
    setPuzzleAttempted(true);

    if (solved) {
      setFeedbackMessage('Correct!');
      setFeedbackType('success');
    } else {
      setFeedbackMessage('Incorrect.');
      setFeedbackType('error');
    }

    // Play all moves for visualization
    playFullSequence([...currentPuzzle.moves.slice(0, sequenceLength - 1), userGuess]);

    if (!solved) {
      try {
        const explanation = await getIncorrectMoveExplanation(
          currentPuzzle.fen,
          currentPuzzle.moves,
          userGuess,
          correctMove,
          userPlayingAs
        );
        
        setTimeout(() => {
          setFeedbackMessage(explanation);
          setFeedbackType('error');
        }, 2000);
      } catch (err) {
        console.error('Failed to get explanation:', err);
      }
    }
  };

  const playFullSequence = (moves) => {
    const puzzle = puzzles[currentPuzzleIndex];
    const game = new Chess(puzzle.fen);
    setBoardPosition(puzzle.fen);
    setCurrentMove(null);

    moves.forEach((move, i) => {
      setTimeout(() => {
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        const moveResult = game.move({ from, to });
        
        if (moveResult) {
          setBoardPosition(game.fen());
          setCurrentMove({ from, to });
        }
      }, i * 1000);
    });

    setTimeout(() => {
      setCurrentMove(null);
    }, moves.length * 1000 + 700);
  };

  const handleRevealSolution = async () => {
    const puzzle = puzzles[currentPuzzleIndex];
    
    setFeedbackMessage('Revealing solution...');
    setFeedbackType('info');
    
    // Play all moves
    playFullSequence(puzzle.moves);

    // Show explanation after sequence
    setTimeout(async () => {
      try {
        const explanation = await getCorrectMoveExplanation(puzzle, userSystem, userPlayingAs);
        setFeedbackMessage(`The solution is ${puzzle.moves[sequenceLength - 1]}.`);
        setFeedbackType('info');
      } catch (error) {
        setFeedbackMessage(`The solution is ${puzzle.moves[sequenceLength - 1]}.`);
        setFeedbackType('info');
      }
    }, puzzle.moves.length * 1000 + 300);
  };

  const handleHint = () => {
    const puzzle = puzzles[currentPuzzleIndex];
    const correctMove = puzzle.moves[sequenceLength - 1];
    const from = correctMove.slice(0, 2);
    
    // Mark that hint was used
    setHintUsed(true);
    
    setFeedbackMessage(`Hint: Look at the piece on ${from.toUpperCase()} (Note: Using hints prevents rating increases)`);
    setFeedbackType('warning');
    
    // Briefly highlight the piece that should move
    setHighlightedSquares({
      [from]: { backgroundColor: 'rgba(255, 193, 7, 0.6)' }
    });
    
    setTimeout(() => {
      setHighlightedSquares({});
    }, 3000);
  };

  const skipToNextPuzzle = () => {
    if (currentPuzzleIndex < puzzles.length - 1) {
      setCurrentPuzzleIndex(currentPuzzleIndex + 1);
    } else {
      setCurrentPuzzleIndex(0);
    }
  };

  const goToPreviousPuzzle = () => {
    if (currentPuzzleIndex > 0) {
      setCurrentPuzzleIndex(currentPuzzleIndex - 1);
    }
  };

  // Difficulty change handler
  const handleDifficultyChange = useCallback((newDifficulty) => {
    if (newDifficulty !== selectedDifficulty) {
      console.log('🔄 Changing difficulty to:', newDifficulty);
      setSelectedDifficulty(newDifficulty);
      setCurrentPuzzleIndex(0);
    }
  }, [selectedDifficulty]);

  // Theme change handler
  const handleThemeChange = useCallback((newTheme) => {
    if (newTheme !== selectedTheme) {
      console.log('🏷️ Changing theme to:', newTheme);
      setSelectedTheme(newTheme);
      setCurrentPuzzleIndex(0);
    }
  }, [selectedTheme]);

  // Auth handlers
  const handleAuthSuccess = async (user) => {
    setUser(user);
    const profile = await userSystem.getUserProfile();
    setUserProfile(profile);
    setProfileUpdateKey(prev => prev + 1);
    setShowAuthModal(false);
  };

  const handleSignOut = async () => {
    await userSystem.signOut();
    setUser(null);
    setUserProfile(null);
    setShowProfileModal(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleDarkModeToggle = () => {
    setIsDarkMode(!isDarkMode);
    setFeedbackMessage(`${isDarkMode ? 'Light' : 'Dark'} mode enabled`);
    setFeedbackType('info');
  };

  const handleSharePuzzle = () => {
    setFeedbackMessage('Puzzle shared as GIF!');
    setFeedbackType('success');
  };

  // Responsive layout styles
  const getLayoutStyles = () => {
    const mobile = isMobile();
    const tablet = isTablet();
    
    if (mobile) {
      return {
        container: {
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa'
        },
        mainContent: {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '10px',
          gap: '10px',
          overflow: 'hidden'
        },
        settingsPanel: {
          order: 1,
          minHeight: 'auto'
        },
        boardContainer: {
          order: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          paddingTop: '20px',
          paddingBottom: '20px'
        },
        feedbackPanel: {
          order: 3,
          maxHeight: '200px',
          overflow: 'auto'
        }
      };
    } else {
      return {
        container: {
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa'
        },
        mainContent: {
          display: 'flex',
          flex: 1,
          overflow: 'hidden'
        },
        settingsPanel: {
          width: tablet ? '30%' : '25%',
          minWidth: '250px',
          maxWidth: '350px'
        },
        boardContainer: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px 20px'
        },
        feedbackPanel: {
          width: tablet ? '30%' : '25%',
          minWidth: '250px',
          maxWidth: '350px'
        }
      };
    }
  };

  const styles = getLayoutStyles();

  const iconButtonStyle = {
    width: isMobile() ? '32px' : '36px',
    height: isMobile() ? '32px' : '36px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    margin: '0 2px',
    borderRadius: '6px'
  };

  const disabledIconButtonStyle = {
    ...iconButtonStyle,
    cursor: 'not-allowed',
    opacity: 0.4
  };

  if (isLoadingAuth) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa',
        color: isDarkMode ? '#ffffff' : '#333333'
      }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Full Width Header with Green Background */}
      <header style={{
        height: '80px',
        backgroundColor: '#4caf50',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        {/* Left side - Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/logo.png"
            alt="Chess Trainer Logo"
            style={{
              height: isMobile() ? '80px' : '100px',
              marginRight: '15px'
            }}
          />
          {!isMobile() && (
            <h1 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              margin: 0,
              color: 'white'
            }}>
              Chess Visualization Trainer
            </h1>
          )}
        </div>

        {/* Center - Navigation (hidden on mobile) */}
        {!isMobile() && (
          <nav style={{
            display: 'flex',
            gap: '30px',
            alignItems: 'center'
          }}>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'white',
              fontSize: '16px',
              fontWeight: '500',
              padding: '8px 12px',
              borderRadius: '8px',
              transition: 'background-color 0.2s ease'
            }}>
              <CoursesIcon />
              Courses
            </button>

            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'white',
              fontSize: '16px',
              fontWeight: '500',
              padding: '8px 12px',
              borderRadius: '8px',
              transition: 'background-color 0.2s ease'
            }}>
              <InviteIcon />
              Invite Friends
            </button>

            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'white',
              fontSize: '16px',
              fontWeight: '500',
              padding: '8px 12px',
              borderRadius: '8px',
              transition: 'background-color 0.2s ease'
            }}>
              <AboutIcon />
              About Us
            </button>
          </nav>
        )}

        {/* Right side - User Profile */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          {user ? (
            <>
              <FlameIcon streak={userProfile?.longest_streak || 0} />
              <div 
                onClick={() => setShowProfileModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  padding: '8px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  color: 'white'
                }}
              >
                <div style={{ fontSize: isMobile() ? '13px' : '14px' }}>
                  <strong>{userProfile?.username || userProfile?.display_name || 'Player'}</strong>
                </div>
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: isMobile() ? '11px' : '12px',
                  fontWeight: 'bold'
                }}>
                  {userProfile?.current_rating || 1200}
                </div>
              </div>
            </>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: isMobile() ? '13px' : '14px',
                fontWeight: 'bold'
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div style={styles.mainContent}>
        {/* Left Column - Settings Panel */}
        <div style={{
          ...styles.settingsPanel,
          backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
          borderRight: isMobile() ? 'none' : `1px solid ${isDarkMode ? '#404040' : '#e0e0e0'}`,
          padding: '20px',
          overflow: 'auto',
          color: isDarkMode ? '#ffffff' : '#333333'
        }}>
          {/* Settings Header */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              cursor: 'pointer',
              padding: '8px 0'
            }}
            onClick={() => setIsSettingsCollapsed(!isSettingsCollapsed)}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              Settings
            </h3>
            <CollapseIcon isCollapsed={isSettingsCollapsed} />
          </div>

          {/* Settings Content */}
          {!isSettingsCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Difficulty Selection */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  🏆 Difficulty Level
                </label>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {[
                    { value: 'beginner', label: 'Beginner', color: '#4CAF50' },
                    { value: 'intermediate', label: 'Intermediate', color: '#FF9800' },
                    { value: 'advanced', label: 'Advanced', color: '#f44336' },
                    { value: 'expert', label: 'Expert', color: '#9C27B0' }
                  ].map(diff => (
                    <button
                      key={diff.value}
                      onClick={() => handleDifficultyChange(diff.value)}
                      style={{
                        padding: '10px 15px',
                        border: '2px solid',
                        borderColor: selectedDifficulty === diff.value ? diff.color : '#ddd',
                        backgroundColor: selectedDifficulty === diff.value ? diff.color : 'transparent',
                        color: selectedDifficulty === diff.value ? 'white' : (isDarkMode ? '#ffffff' : '#333'),
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: selectedDifficulty === diff.value ? 'bold' : 'normal',
                        transition: 'all 0.3s ease',
                        textAlign: 'left'
                      }}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Selection with Collapse/Minimize */}
              <div>
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setIsThemesCollapsed(!isThemesCollapsed)}
                >
                  <label style={{
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}>
                    🎯 Puzzle Themes
                  </label>
                  <CollapseIcon isCollapsed={isThemesCollapsed} />
                </div>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <button
                    onClick={() => handleThemeChange('all')}
                    style={{
                      padding: '8px 12px',
                      border: '2px solid',
                      borderColor: selectedTheme === 'all' ? '#2196F3' : '#ddd',
                      backgroundColor: selectedTheme === 'all' ? '#2196F3' : 'transparent',
                      color: selectedTheme === 'all' ? 'white' : (isDarkMode ? '#ffffff' : '#333'),
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: selectedTheme === 'all' ? 'bold' : 'normal',
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                  >
                    All Themes
                  </button>

                  {/* Collapsible theme options */}
                  {!isThemesCollapsed && Object.keys(THEME_DISPLAY_NAMES).map(theme => (
                    <button
                      key={theme}
                      onClick={() => handleThemeChange(theme)}
                      style={{
                        padding: '8px 12px',
                        border: '2px solid',
                        borderColor: selectedTheme === theme ? '#4CAF50' : '#ddd',
                        backgroundColor: selectedTheme === theme ? '#4CAF50' : 'transparent',
                        color: selectedTheme === theme ? 'white' : (isDarkMode ? '#ffffff' : '#333'),
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: selectedTheme === theme ? 'bold' : 'normal',
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                    >
                      {THEME_DISPLAY_NAMES[theme]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed Control */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  ⚡ Move Speed
                </label>
                
                <input
                  type="range"
                  min="500"
                  max="3000"
                  step="250"
                  value={3500 - playSpeed}
                  onChange={(e) => setPlaySpeed(3500 - Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    background: '#ddd',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: isDarkMode ? '#cccccc' : '#666',
                  marginTop: '4px'
                }}>
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
                
                <div style={{
                  fontSize: '12px',
                  color: isDarkMode ? '#cccccc' : '#666',
                  marginTop: '6px'
                }}>
                  {playSpeed / 1000}s per move
                </div>
              </div>

              {/* Sequence Length Control */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  🔢 Sequence Length
                </label>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {[4, 6, 8].map(length => (
                    <button
                      key={length}
                      onClick={() => setSequenceLength(length)}
                      style={{
                        padding: '8px 12px',
                        border: '2px solid',
                        borderColor: sequenceLength === length ? '#4CAF50' : '#ddd',
                        backgroundColor: sequenceLength === length ? '#4CAF50' : 'transparent',
                        color: sequenceLength === length ? 'white' : (isDarkMode ? '#ffffff' : '#333'),
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: sequenceLength === length ? 'bold' : 'normal',
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                    >
                      {length} Moves
                    </button>
                  ))}
                </div>
              </div>

              {/* Playing As Indicator */}
              {userPlayingAs && (
                <div style={{
                  padding: '12px',
                  backgroundColor: isDarkMode ? '#404040' : '#f0f0f0',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontWeight: 'bold',
                    color: userPlayingAs === 'white' ? '#333' : '#666',
                    fontSize: '14px'
                  }}>
                    Playing as {userPlayingAs === 'white' ? 'White' : 'Black'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Middle Column - Chess Board */}
        <div style={styles.boardContainer}>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <Chessboard
              position={boardPosition}
              onSquareClick={handleSquareClick}
              boardWidth={boardSize}
              boardOrientation={boardOrientation}
              arePiecesDraggable={false}
              customSquareStyles={highlightedSquares}
              customDarkSquareStyle={{ backgroundColor: isDarkMode ? '#769656' : '#4caf50' }}
              customLightSquareStyle={{ backgroundColor: isDarkMode ? '#eeeed2' : '#f1f1e6' }}
            />
            {renderMoveArrow()}
          </div>

          {/* Control Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile() ? '6px' : '8px',
            flexWrap: 'wrap'
          }}>
            <button 
              style={currentPuzzleIndex > 0 ? iconButtonStyle : disabledIconButtonStyle}
              onClick={goToPreviousPuzzle}
              disabled={currentPuzzleIndex === 0}
              title="Previous Puzzle"
            >
              <PrevIcon />
            </button>

            <button 
              style={{
                ...iconButtonStyle,
                backgroundColor: isAutoPlaying ? '#ff9800' : '#4caf50',
                color: 'white',
                borderRadius: '6px'
              }}
              onClick={isAutoPlaying ? pauseAutoPlay : startAutoPlay}
              title={isAutoPlaying ? "Pause" : "Play Sequence"}
            >
              <PlayIcon isPlaying={isAutoPlaying} />
            </button>

            <button 
              style={puzzlePhase === 'playing' ? iconButtonStyle : disabledIconButtonStyle}
              onClick={handleHint}
              disabled={puzzlePhase !== 'playing'}
              title="Hint"
            >
              <HintIcon />
            </button>

            <button 
              style={iconButtonStyle}
              onClick={handleRevealSolution}
              title="Reveal Solution"
            >
              <RevealIcon />
            </button>

            <button 
              style={iconButtonStyle}
              onClick={skipToNextPuzzle}
              title="Next Puzzle"
            >
              <NextIcon />
            </button>
          </div>
        </div>

        {/* Right Column - Messages Panel */}
        <div style={{
          ...styles.feedbackPanel,
          backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
          borderLeft: isMobile() ? 'none' : `1px solid ${isDarkMode ? '#404040' : '#e0e0e0'}`,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          color: isDarkMode ? '#ffffff' : '#333333'
        }}>
          {/* Messages Header */}
          <h3 style={{ 
            margin: '0 0 15px 0', 
            fontSize: '18px', 
            fontWeight: 'bold',
            borderBottom: `2px solid ${isDarkMode ? '#404040' : '#e0e0e0'}`,
            paddingBottom: '10px'
          }}>
            Messages
          </h3>

          {/* Current Message */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            marginBottom: '20px'
          }}>
            <FeedbackCard
              message={feedbackMessage}
              type={feedbackType}
            />
          </div>

          {/* Bottom Options */}
          <div style={{
            borderTop: `1px solid ${isDarkMode ? '#404040' : '#e0e0e0'}`,
            paddingTop: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              onClick={handleDarkModeToggle}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: `1px solid ${isDarkMode ? '#555555' : '#ddd'}`,
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                color: isDarkMode ? '#ffffff' : '#333333',
                fontSize: '13px',
                transition: 'background-color 0.2s ease'
              }}
              title="Toggle Dark Mode"
            >
              <DarkModeIcon isDark={isDarkMode} />
              {!isMobile() && (isDarkMode ? 'Light' : 'Dark')}
            </button>

            <button
              onClick={handleSharePuzzle}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                transition: 'background-color 0.2s ease'
              }}
              title="Share as GIF"
            >
              <ShareIcon />
              {!isMobile() && 'Share'}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
        userSystem={userSystem}
      />

      <UserProfile
        isOpen={showProfileModal}
        user={user}
        profile={userProfile}
        onSignOut={handleSignOut}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
};

export default App;
