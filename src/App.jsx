import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getIncorrectMoveExplanation, getCorrectMoveExplanation } from './ai';
import './index.css';
import UserSystem from './user-system';
import { AuthModal, UserProfile } from './auth-components';

const getBoardSize = (isExpanded = false) => {
  if (isExpanded) {
    return Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
  }
  
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const headerHeight = 60; // Updated to match new mobile header height
  
  if (windowWidth <= 768) {
    return Math.min(windowWidth - 40, windowHeight - headerHeight - 200);
  } else if (windowWidth <= 1024) {
    const availableHeight = windowHeight - headerHeight - 120;
    const availableWidth = windowWidth * 0.5 - 40;
    return Math.min(availableWidth, availableHeight);
  } else {
    const availableHeight = windowHeight - headerHeight - 120;
    const availableWidth = windowWidth * 0.5 - 40;
    return Math.min(availableWidth, availableHeight);
  }
};

const getActiveColor = (fen) => {
  const parts = fen.split(' ');
  return parts[1] === 'w' ? 'white' : 'black';
};

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

const isMobile = () => window.innerWidth <= 768;

// Icon Components
const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="black">
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
  </svg>
);

const FlameIcon = ({ streak }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '8px 12px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.3)',
    height: '36px', // Match profile container height
    minWidth: '60px' // Ensure consistent width
  }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 8 5.5 8 10C8 14 10 16.5 12 16.5C14 16.5 16 14 16 10C16 5.5 12 2 12 2Z" 
            fill="#FF6B35"/>
      <path d="M10.5 10C10.5 10 9.5 7.5 12 7.5C14.5 7.5 13.5 10 13.5 10C13.5 12 12.5 13 12 13C11.5 13 10.5 12 10.5 10Z" 
            fill="#FFD700"/>
      <path d="M14 8C14 8 15 6 16.5 8C17.5 9 17 10.5 16 11C15.5 11.5 15 11 15 10.5C15 9.5 14.5 8.5 14 8Z" 
            fill="#FF8A50"/>
    </svg>
    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>
      {streak}
    </span>
  </div>
);

const CoursesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3L1 9L12 15L21 9V16H23V9L12 3ZM5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z"/>
  </svg>
);

const InviteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 4C18.2091 4 20 5.79086 20 8C20 10.2091 18.2091 12 16 12C13.7909 12 12 10.2091 12 8C12 5.79086 13.7909 4 16 4ZM16 14C20.4183 14 24 17.5817 24 22H22C22 18.6863 19.3137 16 16 16C12.6863 16 10 18.6863 10 22H8C8 17.5817 11.5817 14 16 14ZM8 12C10.2091 12 12 10.2091 12 8C12 5.79086 10.2091 4 8 4C5.79086 4 4 5.79086 4 8C4 10.2091 5.79086 12 8 12ZM8 14C3.58172 14 0 17.5817 0 22H2C2 18.6863 4.68629 16 8 16C9.67362 16 11.2116 16.6135 12.3649 17.6211L11.0649 19.0789C10.2852 18.4146 9.18967 18 8 18Z"/>
  </svg>
);

const AboutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
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

const PrevIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="black">
    <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
  </svg>
);

const PlayIcon = ({ isPlaying }) => (
  <svg width="27" height="27" viewBox="0 0 24 24" fill="black">
    {isPlaying ? (
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    ) : (
      <path d="M8 5v14l11-7z"/>
    )}
  </svg>
);

const HintIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="black">
    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/>
    <circle cx="12" cy="9" r="1" fill="white"/>
  </svg>
);

const RevealIcon = () => (
  <svg width="27" height="27" viewBox="0 0 24 24" fill="black">
    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm-1 13h2v-6h-2v6zm0-8h2V5h-2v2z"/>
  </svg>
);

const ExpandIcon = ({ isExpanded }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="black">
    {isExpanded ? (
      <g stroke="black" strokeWidth="2" fill="none">
        <path d="M15 9L9 15"/>
        <path d="M9 9L15 15"/>
        <path d="M9 9L6 6M6 6H9M6 6V9"/>
        <path d="M15 15L18 18M18 18H15M18 18V15"/>
      </g>
    ) : (
      <g stroke="black" strokeWidth="2" fill="none">
        <path d="M3 9L9 3M9 3H3M9 3V9"/>
        <path d="M21 9L15 3M15 3H21M15 3V9"/>
        <path d="M3 15L9 21M9 21H3M9 21V15"/>
        <path d="M21 15L15 21M15 21H21M15 21V15"/>
      </g>
    )}
  </svg>
);

const CollapseIcon = ({ isCollapsed }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="black">
    {isCollapsed ? (
      <path d="M7 10l5 5 5-5z"/>
    ) : (
      <path d="M7 14l5-5 5 5z"/>
    )}
  </svg>
);

const NextIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="black">
    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
  </svg>
);

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
  'defensiveMove': 'Defensive Move'
};

const FeedbackCard = ({ message, type = 'info', userPlayingAs }) => {
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
      border: `2px solid ${style.border}`,
      color: style.text,
      padding: '15px 20px',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: '500',
      textAlign: 'justify',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      lineHeight: '1.4'
    }}>
      {userPlayingAs && (
        <div style={{ 
          fontWeight: 'bold',
          marginBottom: '8px',
          fontSize: '14px',
          color: style.text,
          opacity: 0.8
        }}>
          Playing as {userPlayingAs === 'white' ? 'White' : 'Black'}
        </div>
      )}
      {message}
    </div>
  );
};

const App = () => {
  // STATE VARIABLES
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [boardSize, setBoardSize] = useState(() => getBoardSize(false));
  const autoPlayRef = useRef(null);
  const internalGameRef = useRef(null);

  const [puzzles, setPuzzles] = useState([]);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileUpdateKey, setProfileUpdateKey] = useState(0);
  const [userSystem] = useState(() => new UserSystem());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [puzzleStartTime, setPuzzleStartTime] = useState(null);
  
  const [puzzleAttempted, setPuzzleAttempted] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPuzzles, setIsLoadingPuzzles] = useState(false);
  
  const [selectedDifficulty, setSelectedDifficulty] = useState(() => {
    const savedSession = loadSessionData();
    return savedSession?.difficulty || 'intermediate';
  });

  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState('all');
  const [availableThemes, setAvailableThemes] = useState([]);
  const [isThemesCollapsed, setIsThemesCollapsed] = useState(true);
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [userPlayingAs, setUserPlayingAs] = useState('white');
  const [isCollapsed, setIsCollapsed] = useState(isMobile()); // Mobile collapsed by default, desktop expanded
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  // Save session data when things change
  useEffect(() => {
    if (user && puzzles.length > 0) {
      saveSessionData({
        difficulty: selectedDifficulty,
        puzzleIndex: currentPuzzleIndex,
        userId: user.id
      });
    }
  }, [user, selectedDifficulty, currentPuzzleIndex, puzzles.length]);

  // AUTHENTICATION
  useEffect(() => {
    let subscription;
    
    const setupAuth = async () => {
      try {
        console.log('🔐 Setting up authentication...');
        
        const currentUser = await userSystem.getCurrentUser();
        console.log('👤 Current user:', currentUser?.id || 'none');
        setUser(currentUser);
        
        if (currentUser) {
          const profile = await userSystem.getUserProfile();
          console.log('📊 User profile loaded');
          setUserProfile(profile);
        }
        
        subscription = userSystem.onAuthStateChange(async (event, user) => {
          if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            return;
          }
          
          console.log('🔄 Auth state changed:', event, user?.id || 'none');
          setUser(user);
          
          if (user) {
            const profile = await userSystem.getUserProfile();
            setUserProfile(profile);
          } else {
            setUserProfile(null);
          }
        });
        
      } catch (error) {
        console.error('❌ Auth setup error:', error);
      } finally {
        console.log('✅ Auth setup complete');
        setIsLoadingAuth(false);
      }
    };
    
    setupAuth();
    
    return () => {
      if (subscription && subscription.data && subscription.data.subscription) {
        subscription.data.subscription.unsubscribe();
      }
    };
  }, [userSystem]);

  // PUZZLE LOADING
  const loadPuzzles = useCallback(async () => {
    if (isLoadingAuth || isLoadingPuzzles) {
      return;
    }

    console.log('🐟 Loading puzzles:', selectedDifficulty, `${sequenceLength}-move`, 'theme:', selectedTheme, 'for user:', user?.id || 'guest');
    setIsLoadingPuzzles(true);
    
    try {
      let fetchedPuzzles = [];
      
      if (user) {
        fetchedPuzzles = await userSystem.getPuzzlesForUser(selectedDifficulty, 50, sequenceLength, selectedTheme);
      } else {
        fetchedPuzzles = await userSystem.getPublicPuzzles(selectedDifficulty, 25, sequenceLength, selectedTheme);
      }
      
      console.log('📦 Received puzzles:', fetchedPuzzles.length);
      
      if (fetchedPuzzles.length > 0) {
        setPuzzles(fetchedPuzzles);
        setCurrentPuzzleIndex(0);
        console.log(`✅ Ready! ${selectedDifficulty} ${sequenceLength}-move puzzles loaded`);
      } else {
        setFeedbackMessage(`Failed to load ${selectedDifficulty} ${sequenceLength}-move puzzles with theme "${selectedTheme}".`);
        setFeedbackType('error');
      }
      
    } catch (error) {
      console.error('❌ Failed to load puzzles:', error);
      setFeedbackMessage('Failed to load puzzles. Please refresh the page.');
      setFeedbackType('error');
    } finally {
      setIsLoadingPuzzles(false);
    }
  }, [isLoadingAuth, user, userSystem, selectedDifficulty, sequenceLength, selectedTheme, isLoadingPuzzles]);

  const puzzleLoadTrigger = `${!isLoadingAuth}-${user?.id || 'guest'}-${selectedDifficulty}-${sequenceLength}-${selectedTheme}`;
  useEffect(() => {
    if (!isLoadingAuth) {
      loadPuzzles();
    }
  }, [puzzleLoadTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadThemes = async () => {
      if (!isLoadingAuth && userSystem) {
        try {
          const themes = await userSystem.fetchPuzzleThemes(
            selectedDifficulty, 
            sequenceLength
          );
          setAvailableThemes(themes);
        } catch (error) {
          console.error('Failed to load themes:', error);
          setAvailableThemes([]);
        }
      }
    };
    
    loadThemes();
  }, [selectedDifficulty, sequenceLength, isLoadingAuth, userSystem]);

  useEffect(() => {
    const handleResize = () => setBoardSize(getBoardSize(isExpanded));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded]);

  const toggleBoardExpansion = () => {
    setIsExpanded(!isExpanded);
    setBoardSize(getBoardSize(!isExpanded));
  };

  const validatePuzzle = (puzzle) => {
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
  };

  const getOrdinalSuffix = (num) => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
  };

  const renderMoveArrow = () => {
    if (!currentMove) return null;
    
    const { from, to } = currentMove;
    
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fromFile = files.indexOf(from[0]);
    const fromRank = parseInt(from[1]);
    const toFile = files.indexOf(to[0]);
    const toRank = parseInt(to[1]);
    
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

  const resetCurrentPuzzle = useCallback((index) => {
    if (!puzzles || puzzles.length === 0 || !puzzles[index]) {
      return;
    }

    const puzzle = puzzles[index];
    
    if (!validatePuzzle(puzzle)) {
      setFeedbackMessage('This puzzle appears to be invalid. Loading new puzzles...');
      setFeedbackType('error');
      loadPuzzles();
      return;
    }

    const game = new Chess(puzzle.fen);
    
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
    
    setPuzzleAttempted(false);
    setHintUsed(false);
    
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
    }
  }, [puzzles, loadPuzzles, sequenceLength]);

  useEffect(() => {
    if (puzzles.length > 0) {
      resetCurrentPuzzle(currentPuzzleIndex);
    }
  }, [currentPuzzleIndex, puzzles, resetCurrentPuzzle]);

  const startAutoPlay = () => {
    if (isAutoPlaying) return;
    
    if (puzzlePhase === 'complete' || puzzlePhase === 'playing') {
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
    
    playMoveSequence(0);
  };

  const playMoveSequence = (moveIndex) => {
    if (moveIndex >= sequenceLength - 1) {
      setupUserTurn();
      return;
    }

    const puzzle = puzzles[currentPuzzleIndex];
    const move = puzzle.moves[moveIndex];
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);

    setCurrentMove({ from, to });
    setCurrentMoveIndex(moveIndex + 1);

    autoPlayRef.current = setTimeout(() => {
      playMoveSequence(moveIndex + 1);
    }, playSpeed);
  };

  const setupUserTurn = () => {
    setIsAutoPlaying(false);
    setPuzzlePhase('playing');
    
    const puzzle = puzzles[currentPuzzleIndex];
    const game = new Chess(puzzle.fen);
    
    const setupMoves = puzzle.moves.slice(0, sequenceLength - 1);
    
    for (let i = 0; i < setupMoves.length; i++) {
      const move = setupMoves[i];
      const moveResult = game.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
      
      if (!moveResult) {
        setFeedbackMessage('This puzzle contains invalid moves. Please try another.');
        setFeedbackType('error');
        return;
      }
    }

    internalGameRef.current = game;
    setCurrentMove(null);
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

    setPuzzleAttempted(true);

    if (user && currentPuzzle.id) {
      try {
        const shouldChangeRating = !puzzleAttempted && !hintUsed;
        
        const result = await userSystem.recordPuzzleAttempt(
          currentPuzzle.id,
          solved,
          timeTaken,
          [userGuess],
          shouldChangeRating
        );
        
        if (result) {
          setTimeout(async () => {
            const updatedProfile = await userSystem.getUserProfile();
            if (updatedProfile) {
              setUserProfile(updatedProfile);
              setProfileUpdateKey(prev => prev + 1);
            }
          }, 500);
          
          let feedbackText = solved ? 'Correct!' : 'Incorrect.';
          
          if (shouldChangeRating && result.ratingChange !== 0) {
            feedbackText += ` Rating: ${result.newRating} (${result.ratingChange >= 0 ? '+' : ''}${result.ratingChange})`;
          }
          
          setFeedbackMessage(feedbackText);
          setFeedbackType(solved ? 'success' : 'error');
        }
      } catch (error) {
        console.error('Failed to record attempt:', error);
      }
    } else if (!user) {
      if (solved) {
        setFeedbackMessage('Correct!');
        setFeedbackType('success');
      } else {
        setFeedbackMessage('Incorrect.');
        setFeedbackType('error');
      }
    }

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
          setFeedbackMessage(prev => prev + ' ' + explanation);
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
    
    playFullSequence(puzzle.moves);

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
    
    setHintUsed(true);
    
    setFeedbackMessage(`Hint: Look at the piece on ${from.toUpperCase()} (Note: Using hints prevents rating increases)`);
    setFeedbackType('warning');
    
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
      loadPuzzles();
      setCurrentPuzzleIndex(0);
    }
  };

  const goToPreviousPuzzle = () => {
    if (currentPuzzleIndex > 0) {
      setCurrentPuzzleIndex(currentPuzzleIndex - 1);
    }
  };

  const handleDifficultyChange = useCallback((newDifficulty) => {
    if (newDifficulty !== selectedDifficulty) {
      console.log('🔄 Changing difficulty to:', newDifficulty);
      setSelectedDifficulty(newDifficulty);
      setCurrentPuzzleIndex(0);
    }
  }, [selectedDifficulty]);

  const handleThemeChange = useCallback((newTheme) => {
    if (newTheme !== selectedTheme) {
      console.log('🏷️ Changing theme to:', newTheme);
      setSelectedTheme(newTheme);
      setCurrentPuzzleIndex(0);
    }
  }, [selectedTheme]);

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
  };

  const handleSharePuzzle = () => {
    setFeedbackMessage('Puzzle shared as GIF!');
    setFeedbackType('success');
  };

  const iconButtonStyle = {
    width: '36px',
    height: '36px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    margin: '0 3px'
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
        flexDirection: 'column'
      }}>
        <h2>Setting up authentication...</h2>
      </div>
    );
  }

  if (isLoadingPuzzles) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Loading Puzzles...</h2>
        <p>Difficulty: {selectedDifficulty}</p>
        <p>🧩 Preparing challenging visualization puzzles...</p>
      </div>
    );
  }

  if (puzzles.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Failed to Load Puzzles</h2>
        <p>Difficulty: {selectedDifficulty}</p>
        <button onClick={() => loadPuzzles()} style={iconButtonStyle}>
          Try Again
        </button>
      </div>
    );
  }

  const getLayoutStyles = () => {
    const mobile = isMobile();
    
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
          padding: '8px', // Reduced padding
          gap: '8px', // Reduced gap
          overflow: 'hidden'
        },
        settingsPanel: {
          order: 1,
          backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
          borderRadius: '8px',
          padding: '10px', // Reduced padding
          color: isDarkMode ? '#ffffff' : '#333333'
        },
        boardContainer: {
          order: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '10px', // Reduced further since no controls below board
          paddingBottom: '80px', // Increased space for sticky controls
          flex: 1 // Take remaining space
        },
        feedbackPanel: {
          order: 1.5, // Place feedback above board on mobile
          backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
          borderRadius: '8px',
          padding: '10px', // Reduced padding
          color: isDarkMode ? '#ffffff' : '#333333',
          marginBottom: '8px' // Reduced margin
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
          width: '25%',
          minWidth: '250px',
          maxWidth: '350px',
          backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
          borderRight: `1px solid ${isDarkMode ? '#404040' : '#e0e0e0'}`,
          padding: '20px',
          overflow: 'auto',
          color: isDarkMode ? '#ffffff' : '#333333'
        },
        boardContainer: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '50px',
          paddingBottom: '50px',
          paddingLeft: '20px',
          paddingRight: '20px'
        },
        feedbackPanel: {
          width: '25%',
          minWidth: '250px',
          maxWidth: '350px',
          backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
          borderLeft: `1px solid ${isDarkMode ? '#404040' : '#e0e0e0'}`,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          color: isDarkMode ? '#ffffff' : '#333333'
        }
      };
    }
  };

  const styles = getLayoutStyles();

  return (
    <div style={styles.container}>
      <header style={{
        height: '60px', // Reduced from 80px for mobile
        backgroundColor: '#64B5F6',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile() ? '0 10px' : '0 20px', // Less padding on mobile
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/logo.png"
            alt="Chess Trainer Logo"
            style={{
              height: isMobile() ? '50px' : '100px', // Smaller logo on mobile
              marginRight: isMobile() ? '8px' : '15px' // Less margin on mobile
            }}
          />
        </div>

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
                  gap: isMobile() ? '6px' : '10px', // Less gap on mobile
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  padding: isMobile() ? '6px 10px' : '8px 12px', // Smaller padding on mobile
                  borderRadius: isMobile() ? '16px' : '20px', // Smaller border radius
                  border: '1px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  color: 'white',
                  height: '36px', // Match flame icon height
                  minWidth: '80px' // Ensure consistent width
                }}
              >
                <div style={{ fontSize: isMobile() ? '11px' : '14px' }}> {/* Smaller text on mobile */}
                  <strong>{userProfile?.display_name || 'Player'}</strong>
                </div>
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  padding: isMobile() ? '3px 6px' : '4px 8px', // Smaller padding on mobile
                  borderRadius: isMobile() ? '10px' : '12px', // Smaller border radius
                  fontSize: isMobile() ? '10px' : '12px', // Smaller text on mobile
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
                padding: isMobile() ? '6px 12px' : '8px 16px', // Smaller padding on mobile
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '16px', // Smaller border radius
                cursor: 'pointer',
                fontSize: isMobile() ? '12px' : '14px', // Smaller text on mobile
                fontWeight: 'bold'
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      <div style={styles.mainContent}>
        <div style={styles.settingsPanel}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              cursor: 'pointer',
              padding: '8px 0'
            }}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              Settings
            </h3>
            <CollapseIcon isCollapsed={isCollapsed} />
          </div>

          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  color: isDarkMode ? '#ffffff' : '#333'
                }}>
                  🏆 Difficulty Level
                </label>
                
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  justifyContent: 'flex-start'
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
                      disabled={isLoadingPuzzles}
                      style={{
                        padding: '6px 12px',
                        border: '2px solid',
                        borderColor: selectedDifficulty === diff.value ? diff.color : '#ddd',
                        backgroundColor: selectedDifficulty === diff.value ? diff.color : 'white',
                        color: selectedDifficulty === diff.value ? 'white' : '#333',
                        borderRadius: '16px',
                        cursor: isLoadingPuzzles ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: selectedDifficulty === diff.value ? 'bold' : 'normal',
                        transition: 'all 0.3s ease',
                        opacity: isLoadingPuzzles ? 0.6 : 1,
                        minWidth: '70px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              {availableThemes && availableThemes.length > 0 && (
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
                      fontSize: '13px',
                      color: isDarkMode ? '#ffffff' : '#333'
                    }}>
                      🎯 Puzzle Themes
                    </label>
                    <CollapseIcon isCollapsed={isThemesCollapsed} />
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-start'
                  }}>
                    <button
                      onClick={() => handleThemeChange('all')}
                      disabled={isLoadingPuzzles}
                      style={{
                        padding: '6px 12px',
                        border: '2px solid',
                        borderColor: selectedTheme === 'all' ? '#2196F3' : '#ddd',
                        backgroundColor: selectedTheme === 'all' ? '#2196F3' : 'white',
                        color: selectedTheme === 'all' ? 'white' : '#333',
                        borderRadius: '16px',
                        cursor: isLoadingPuzzles ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: selectedTheme === 'all' ? 'bold' : 'normal',
                        transition: 'all 0.2s ease',
                        opacity: isLoadingPuzzles ? 0.6 : 1
                      }}
                    >
                      All Themes
                    </button>

                    {!isThemesCollapsed && availableThemes
                      .filter(theme => THEME_DISPLAY_NAMES[theme.name])
                      .sort((a, b) => {
                        if (a.name === 'opening') return -1;
                        if (b.name === 'opening') return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .slice(0, 11)
                      .map(theme => {
                        const isSelected = selectedTheme === theme.name;
                        const displayName = THEME_DISPLAY_NAMES[theme.name] || theme.name.charAt(0).toUpperCase() + theme.name.slice(1);
                        
                        return (
                          <button
                            key={theme.name}
                            onClick={() => handleThemeChange(theme.name)}
                            disabled={isLoadingPuzzles}
                            title={`${theme.count} puzzles`}
                            style={{
                              padding: '6px 12px',
                              border: '2px solid',
                              borderColor: isSelected ? '#4CAF50' : '#ddd',
                              backgroundColor: isSelected ? '#4CAF50' : 'white',
                              color: isSelected ? 'white' : '#333',
                              borderRadius: '16px',
                              cursor: isLoadingPuzzles ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                              fontWeight: isSelected ? 'bold' : 'normal',
                              transition: 'all 0.2s ease',
                              opacity: isLoadingPuzzles ? 0.6 : 1
                            }}
                          >
                            {displayName}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  fontSize: '13px',
                  color: isDarkMode ? '#ffffff' : '#333'
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
                  disabled={isLoadingPuzzles}
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    background: '#ddd',
                    outline: 'none',
                    cursor: isLoadingPuzzles ? 'not-allowed' : 'pointer',
                    opacity: isLoadingPuzzles ? 0.6 : 1
                  }}
                />
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  color: '#666',
                  marginTop: '4px'
                }}>
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
                
                <div style={{
                  textAlign: 'left',
                  fontSize: '12px',
                  color: '#666',
                  marginTop: '6px'
                }}>
                  {playSpeed / 1000}s per move
                </div>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  fontSize: '13px',
                  color: isDarkMode ? '#ffffff' : '#333'
                }}>
                  🔢 Sequence Length
                </label>
                
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'flex-start',
                  flexWrap: 'wrap'
                }}>
                  {[4, 6, 8].map(length => (
                    <button
                      key={length}
                      onClick={() => setSequenceLength(length)}
                      disabled={isLoadingPuzzles}
                      style={{
                        padding: '6px 12px',
                        border: '2px solid',
                        borderColor: sequenceLength === length ? '#4CAF50' : '#ddd',
                        backgroundColor: sequenceLength === length ? '#4CAF50' : 'white',
                        color: sequenceLength === length ? 'white' : '#333',
                        borderRadius: '12px',
                        cursor: isLoadingPuzzles ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: sequenceLength === length ? 'bold' : 'normal',
                        transition: 'all 0.2s ease',
                        minWidth: '70px',
                        opacity: isLoadingPuzzles ? 0.6 : 1
                      }}
                    >
                      {length} Moves
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile: Feedback panel above board */}
        {isMobile() && (
          <div style={styles.feedbackPanel}>
            <div>
              <FeedbackCard 
                message={feedbackMessage}
                type={feedbackType}
                userPlayingAs={userPlayingAs}
              />
            </div>
          </div>
        )}

        <div style={styles.boardContainer}>
          <div style={{ position: 'relative' }}>
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
        </div>

        {/* Desktop: Right feedback panel */}
        {!isMobile() && (
          <div style={styles.feedbackPanel}>
            <h3 style={{ 
              margin: '0 0 15px 0', 
              fontSize: '18px', 
              fontWeight: 'bold',
              borderBottom: `2px solid ${isDarkMode ? '#404040' : '#e0e0e0'}`,
              paddingBottom: '10px'
            }}>
              Messages
            </h3>

            <div style={{
              flex: 1,
              marginBottom: '20px'
            }}>
              <FeedbackCard 
                message={feedbackMessage}
                type={feedbackType}
                userPlayingAs={userPlayingAs}
              />
            </div>

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
        )}
      </div>

      {/* Mobile Settings Overlay */}
      {isMobile() && showMobileSettings && (
        <div style={{
          position: 'fixed',
          bottom: '60px', // Above sticky bar
          left: '10px',
          right: '10px',
          backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
          borderRadius: '12px',
          padding: '15px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
          zIndex: 999,
          maxHeight: '60vh',
          overflow: 'auto',
          color: isDarkMode ? '#ffffff' : '#333333'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              Settings
            </h3>
            <button
              onClick={() => setShowMobileSettings(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: isDarkMode ? '#ffffff' : '#333333'
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                fontSize: '13px'
              }}>
                🏆 Difficulty Level
              </label>
              
              <div style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap'
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
                    disabled={isLoadingPuzzles}
                    style={{
                      padding: '6px 12px',
                      border: '2px solid',
                      borderColor: selectedDifficulty === diff.value ? diff.color : '#ddd',
                      backgroundColor: selectedDifficulty === diff.value ? diff.color : 'white',
                      color: selectedDifficulty === diff.value ? 'white' : '#333',
                      borderRadius: '16px',
                      cursor: isLoadingPuzzles ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: selectedDifficulty === diff.value ? 'bold' : 'normal',
                      flex: '1',
                      minWidth: '70px'
                    }}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>

            {availableThemes && availableThemes.length > 0 && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  fontSize: '13px'
                }}>
                  🎯 Puzzle Themes
                </label>
                
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => handleThemeChange('all')}
                    disabled={isLoadingPuzzles}
                    style={{
                      padding: '6px 12px',
                      border: '2px solid',
                      borderColor: selectedTheme === 'all' ? '#2196F3' : '#ddd',
                      backgroundColor: selectedTheme === 'all' ? '#2196F3' : 'white',
                      color: selectedTheme === 'all' ? 'white' : '#333',
                      borderRadius: '16px',
                      cursor: isLoadingPuzzles ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: selectedTheme === 'all' ? 'bold' : 'normal'
                    }}
                  >
                    All Themes
                  </button>

                  {availableThemes
                    .filter(theme => THEME_DISPLAY_NAMES[theme.name])
                    .sort((a, b) => {
                      if (a.name === 'opening') return -1;
                      if (b.name === 'opening') return 1;
                      return a.name.localeCompare(b.name);
                    })
                    .slice(0, 8)
                    .map(theme => {
                      const isSelected = selectedTheme === theme.name;
                      const displayName = THEME_DISPLAY_NAMES[theme.name] || theme.name.charAt(0).toUpperCase() + theme.name.slice(1);
                      
                      return (
                        <button
                          key={theme.name}
                          onClick={() => handleThemeChange(theme.name)}
                          disabled={isLoadingPuzzles}
                          style={{
                            padding: '6px 12px',
                            border: '2px solid',
                            borderColor: isSelected ? '#4CAF50' : '#ddd',
                            backgroundColor: isSelected ? '#4CAF50' : 'white',
                            color: isSelected ? 'white' : '#333',
                            borderRadius: '16px',
                            cursor: isLoadingPuzzles ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: isSelected ? 'bold' : 'normal'
                          }}
                        >
                          {displayName}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                fontSize: '13px'
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
                disabled={isLoadingPuzzles}
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  background: '#ddd',
                  outline: 'none'
                }}
              />
              
              <div style={{
                textAlign: 'center',
                fontSize: '12px',
                color: '#666',
                marginTop: '6px'
              }}>
                {playSpeed / 1000}s per move
              </div>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                fontSize: '13px'
              }}>
                🔢 Sequence Length
              </label>
              
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                {[4, 6, 8].map(length => (
                  <button
                    key={length}
                    onClick={() => setSequenceLength(length)}
                    disabled={isLoadingPuzzles}
                    style={{
                      padding: '6px 12px',
                      border: '2px solid',
                      borderColor: sequenceLength === length ? '#4CAF50' : '#ddd',
                      backgroundColor: sequenceLength === length ? '#4CAF50' : 'white',
                      color: sequenceLength === length ? 'white' : '#333',
                      borderRadius: '12px',
                      cursor: isLoadingPuzzles ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: sequenceLength === length ? 'bold' : 'normal',
                      flex: 1
                    }}
                  >
                    {length} Moves
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Control Bar */}
      {isMobile() && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
          borderTop: `1px solid ${isDarkMode ? '#404040' : '#e0e0e0'}`,
          padding: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          <button 
            style={{
              ...iconButtonStyle,
              width: '32px',
              height: '32px',
              opacity: currentPuzzleIndex > 0 ? 1 : 0.4
            }}
            onClick={goToPreviousPuzzle}
            disabled={currentPuzzleIndex === 0}
            title="Previous Puzzle"
          >
            <PrevIcon />
          </button>

          <button 
            style={{
              ...iconButtonStyle,
              width: '38px',
              height: '38px',
              backgroundColor: isAutoPlaying ? '#ff9800' : '#4caf50',
              borderRadius: '50%',
              color: 'white'
            }}
            onClick={isAutoPlaying ? pauseAutoPlay : startAutoPlay}
            title={isAutoPlaying ? "Pause" : puzzlePhase === 'ready' ? "Watch Moves 1-3" : "Replay Sequence"}
          >
            <PlayIcon isPlaying={isAutoPlaying} />
          </button>

          <button 
            style={{
              ...iconButtonStyle,
              width: '32px',
              height: '32px'
            }}
            onClick={toggleBoardExpansion}
            title={isExpanded ? "Normal Size" : "Expand Board"}
          >
            <ExpandIcon isExpanded={isExpanded} />
          </button>

          <button 
            style={{
              ...iconButtonStyle,
              width: '32px',
              height: '32px',
              opacity: puzzlePhase === 'playing' ? 1 : 0.4
            }}
            onClick={handleHint}
            disabled={puzzlePhase !== 'playing'}
            title="Hint"
          >
            <HintIcon />
          </button>

          <button 
            style={{
              ...iconButtonStyle,
              width: '32px',
              height: '32px',
              opacity: (puzzlePhase === 'playing' || puzzlePhase === 'complete') ? 1 : 0.4
            }}
            onClick={handleRevealSolution}
            disabled={puzzlePhase !== 'playing' && puzzlePhase !== 'complete'}
            title="Reveal Solution"
          >
            <RevealIcon />
          </button>

          <button 
            style={{
              ...iconButtonStyle,
              width: '32px',
              height: '32px'
            }}
            onClick={skipToNextPuzzle}
            title="Next Puzzle"
          >
            <NextIcon />
          </button>

          <button 
            style={{
              ...iconButtonStyle,
              width: '32px',
              height: '32px',
              backgroundColor: showMobileSettings ? '#2196F3' : 'transparent',
              borderRadius: '6px',
              color: showMobileSettings ? 'white' : 'black'
            }}
            onClick={() => setShowMobileSettings(!showMobileSettings)}
            title="Settings"
          >
            <SettingsIcon />
          </button>
        </div>
      )}

      {/* Desktop Controls (inline with board) */}
      {!isMobile() && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '20px',
          marginBottom: '20px'
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
            style={iconButtonStyle}
            onClick={isAutoPlaying ? pauseAutoPlay : startAutoPlay}
            title={isAutoPlaying ? "Pause" : puzzlePhase === 'ready' ? "Watch Moves 1-3" : "Replay Sequence"}
          >
            <PlayIcon isPlaying={isAutoPlaying} />
          </button>

          <button 
            style={iconButtonStyle}
            onClick={toggleBoardExpansion}
            title={isExpanded ? "Normal Size" : "Expand Board"}
          >
            <ExpandIcon isExpanded={isExpanded} />
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
            style={puzzlePhase === 'playing' || puzzlePhase === 'complete' ? iconButtonStyle : disabledIconButtonStyle}
            onClick={handleRevealSolution}
            disabled={puzzlePhase !== 'playing' && puzzlePhase !== 'complete'}
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
      )}

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
