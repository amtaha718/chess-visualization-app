import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getIncorrectMoveExplanation, getCorrectMoveExplanation, getMoveConsequencesEnhanced } from './ai';
import './index.css';
import UserSystem from './user-system';
import { AuthModal, UserProfile } from './auth-components';

const getBoardSize = (isExpanded = false) => {
  if (isExpanded) {
    return Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
  }
  
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const headerHeight = 60;
  
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
    height: '36px',
    minWidth: '60px'
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

const ConsequencesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
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
  const [isCollapsed, setIsCollapsed] = useState(isMobile());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  // ENHANCED: State for enhanced move consequences feature with Stockfish
  const [isLoadingConsequences, setIsLoadingConsequences] = useState(false);
  const [lastAttemptedMove, setLastAttemptedMove] = useState(null);
  const [solved, setSolved] = useState(false);
  const [enhancedAnalysisAvailable, setEnhancedAnalysisAvailable] = useState(true);

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
    setSolved(false);
    setLastAttemptedMove(null);
    
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

      // Store the attempted move for consequences analysis
      setLastAttemptedMove(userGuess);

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
    const puzzleSolved = userGuess === correctMove;
    setSolved(puzzleSolved);
    const currentPuzzle = puzzles[currentPuzzleIndex];

    setPuzzleAttempted(true);

    if (user && currentPuzzle.id) {
      try {
        const shouldChangeRating = !puzzleAttempted && !hintUsed;
        
        const result = await userSystem.recordPuzzleAttempt(
          currentPuzzle.id,
          puzzleSolved,
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
          
          let feedbackText = puzzleSolved ? 'Correct!' : 'Incorrect.';
          
          if (shouldChangeRating && result.ratingChange !== 0) {
            feedbackText += ` Rating: ${result.newRating} (${result.ratingChange >= 0 ? '+' : ''}${result.ratingChange})`;
          }
          
          setFeedbackMessage(feedbackText);
          setFeedbackType(puzzleSolved ? 'success' : 'error');
        }
      } catch (error) {
        console.error('Failed to record attempt:', error);
      }
    } else if (!user) {
      if (puzzleSolved) {
        setFeedbackMessage('Correct!');
        setFeedbackType('success');
      } else {
        setFeedbackMessage('Incorrect.');
        setFeedbackType('error');
      }
    }

    playFullSequence([...currentPuzzle.moves.slice(0, sequenceLength - 1), userGuess]);

    if (!puzzleSolved) {
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

  // ENHANCED: Function to show move consequences using enhanced Stockfish analysis
  const showMoveConsequences = async () => {
    if (!puzzleAttempted || solved || !lastAttemptedMove) {
      console.log('Cannot show consequences:', { puzzleAttempted, solved, lastAttemptedMove });
      return;
    }
    
    setIsLoadingConsequences(true);
    setFeedbackMessage('Analyzing move consequences with Stockfish...');
    setFeedbackType('info');
    
    try {
      console.log('🎭 Generating enhanced move consequences with Stockfish...');
      const currentPuzzle = puzzles[currentPuzzleIndex];
      
      // Use the enhanced analysis with Stockfish
      const consequenceData = await getMoveConsequencesEnhanced(
        currentPuzzle.fen,
        currentPuzzle.moves.slice(0, sequenceLength - 1), // First 3 moves
        lastAttemptedMove,
        currentPuzzle.moves[sequenceLength - 1], // Correct move
        userPlayingAs
      );
      
      if (consequenceData && consequenceData.userConsequences && consequenceData.correctBenefits) {
        console.log('✅ Enhanced consequence analysis successful');
        console.log('- Engine used:', consequenceData.userConsequences.engineUsed || 'heuristic');
        console.log('- User sequence:', consequenceData.userConsequences.sequence);
        console.log('- Correct sequence:', consequenceData.correctBenefits.sequence);
        
        setFeedbackMessage(
          `Analysis complete using ${consequenceData.userConsequences.engineUsed || 'heuristic analysis'}. 
          ${consequenceData.explanation || 'Showing what happens after your move...'}`
        );
        setFeedbackType('info');
        
        // Play the enhanced consequence sequence
        playEnhancedConsequenceSequence(consequenceData);
      } else {
        console.warn('⚠️ Enhanced analysis returned incomplete data, falling back to basic analysis');
        setEnhancedAnalysisAvailable(false);
        
        // Fallback to basic local analysis
        const basicSequence = generateMoveConsequences(
          currentPuzzle.fen,
          currentPuzzle.moves.slice(0, sequenceLength - 1),
          lastAttemptedMove
        );
        
        if (basicSequence && basicSequence.length > 0) {
          setFeedbackMessage('Showing what happens after your move (basic analysis)...');
          setFeedbackType('info');
          playConsequenceSequence(basicSequence);
        } else {
          setFeedbackMessage('Could not analyze move consequences. The position might be terminal.');
          setFeedbackType('warning');
        }
      }
    } catch (error) {
      console.error('Failed to generate enhanced move consequences:', error);
      setEnhancedAnalysisAvailable(false);
      
      // Fallback to basic analysis
      try {
        const currentPuzzle = puzzles[currentPuzzleIndex];
        const basicSequence = generateMoveConsequences(
          currentPuzzle.fen,
          currentPuzzle.moves.slice(0, sequenceLength - 1),
          lastAttemptedMove
        );
        
        if (basicSequence && basicSequence.length > 0) {
          setFeedbackMessage('Showing consequences with basic analysis...');
          setFeedbackType('info');
          playConsequenceSequence(basicSequence);
        } else {
          setFeedbackMessage('Failed to analyze move consequences.');
          setFeedbackType('error');
        }
      } catch (fallbackError) {
        console.error('Even fallback analysis failed:', fallbackError);
        setFeedbackMessage('Failed to analyze move consequences.');
        setFeedbackType('error');
      }
    } finally {
      setIsLoadingConsequences(false);
    }
  };

  // ENHANCED: Enhanced consequence sequence playback with Stockfish integration
  const playEnhancedConsequenceSequence = (consequenceData) => {
    const { userConsequences, correctBenefits, explanation } = consequenceData;
    
    console.log('🎬 Playing enhanced consequence sequence');
    console.log('- User consequences:', userConsequences.sequence.length, 'moves');
    console.log('- Correct benefits:', correctBenefits.sequence.length, 'moves');
    console.log('- Engine used:', userConsequences.engineUsed || 'heuristic');
    
    const currentPuzzle = puzzles[currentPuzzleIndex];
    const game = new Chess(currentPuzzle.fen);
    
    // Apply the first 3 moves to get to the decision point
    const setupMoves = currentPuzzle.moves.slice(0, sequenceLength - 1);
    for (let i = 0; i < setupMoves.length; i++) {
      const move = setupMoves[i];
      game.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
    }
    
    // Apply the user's move to get to the position after their incorrect move
    const userMoveResult = game.move({ 
      from: lastAttemptedMove.slice(0, 2), 
      to: lastAttemptedMove.slice(2, 4) 
    });
    
    if (!userMoveResult) {
      console.error('Failed to apply user move');
      return;
    }
    
    // Set the board to show the position after user's move
    setBoardPosition(game.fen());
    setCurrentMove(null);
    
    console.log('🎯 Starting enhanced opponent response sequence...');
    
    // Show immediate feedback about analysis type
    setTimeout(() => {
      const engineInfo = userConsequences.engineUsed === 'stockfish' ? 
        ' (Stockfish analysis)' : ' (heuristic analysis)';
      setFeedbackMessage(`After your move ${lastAttemptedMove}${engineInfo}, here's what happens...`);
      setFeedbackType('warning');
    }, 500);
    
    // Play the user consequences sequence
    const userSequence = userConsequences.sequence;
    
    userSequence.forEach((move, i) => {
      setTimeout(() => {
        console.log(`Playing consequence move ${i + 1}/${userSequence.length}: ${move}`);
        
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        
        try {
          const moveResult = game.move({ from, to });
          
          if (moveResult) {
            setBoardPosition(game.fen());
            setCurrentMove({ from, to });
            
            // Enhanced feedback based on analysis
            if (i === 0) {
              const evalInfo = userConsequences.analysis?.initialEvaluation ? 
                ` (eval: ${userConsequences.analysis.initialEvaluation > 0 ? '+' : ''}${userConsequences.analysis.initialEvaluation.toFixed(1)})` : '';
              setFeedbackMessage(`Opponent responds with ${move}${evalInfo} - gaining the initiative!`);
              setFeedbackType('info');
            } else if (i === userSequence.length - 1) {
              // Show final analysis
              const finalAnalysis = analyzeEnhancedPosition(game, userConsequences.analysis);
              setFeedbackMessage(`Final result: ${finalAnalysis} The correct move would have avoided this.`);
              setFeedbackType('error');
            } else {
              setFeedbackMessage(`Opponent continues with ${move}...`);
              setFeedbackType('info');
            }
            
            console.log(`✅ Played enhanced consequence move ${i + 1}: ${move}`);
          } else {
            console.error(`❌ Failed to play consequence move ${i + 1}: ${move}`);
          }
        } catch (error) {
          console.error(`Error playing consequence move ${i + 1} (${move}):`, error);
        }
      }, (i + 1) * 2000); // 2 seconds between moves
    });
    
    // Clear the arrow and show final enhanced message
    setTimeout(() => {
      setCurrentMove(null);
      
      // Create enhanced final message
      let finalMessage = 'Enhanced consequence analysis complete. ';
      
      if (userConsequences.engineUsed === 'stockfish') {
        finalMessage += 'Stockfish shows how your move led to problems. ';
      } else {
        finalMessage += 'Analysis shows how your move created difficulties. ';
      }
      
      // Add evaluation comparison if available
      if (userConsequences.evaluation !== null && correctBenefits.evaluation !== null) {
        const evalDiff = correctBenefits.evaluation - userConsequences.evaluation;
        if (evalDiff > 1) {
          finalMessage += `The correct move was ${evalDiff.toFixed(1)} points better. `;
        }
      }
      
      finalMessage += 'Try the next puzzle!';
      
      setFeedbackMessage(finalMessage);
      setFeedbackType('info');
      console.log('🏁 Enhanced consequence sequence playback complete');
    }, (userSequence.length + 1) * 2000 + 1000);
  };

  // ENHANCED: Analyze enhanced position for better feedback
  const analyzeEnhancedPosition = (game, analysis) => {
    if (game.isCheckmate()) {
      return "You've been checkmated!";
    }
    if (game.isCheck()) {
      return "Your king is in check and under pressure.";
    }
    if (game.isStalemate()) {
      return "The position is stalemate.";
    }
    if (game.isDraw()) {
      return "The position is drawn.";
    }
    
    // Use enhanced analysis data if available
    if (analysis) {
      if (analysis.materialBalance < -3) {
        return "You've lost significant material.";
      } else if (analysis.materialBalance < -1) {
        return "You've lost some material.";
      }
      
      if (analysis.tacticalThemes?.includes('checkmate')) {
        return "Your opponent has a forced checkmate.";
      }
      
      if (analysis.finalEvaluation !== null) {
        const eval_score = analysis.finalEvaluation;
        if (eval_score < -2) {
          return `Your position is much worse (${eval_score.toFixed(1)}).`;
        } else if (eval_score < -1) {
          return `Your position is somewhat worse (${eval_score.toFixed(1)}).`;
        }
      }
    }
    
    // Fallback to basic material analysis
    const pieces = game.board().flat().filter(piece => piece !== null);
    const whitePieces = pieces.filter(piece => piece.color === 'w');
    const blackPieces = pieces.filter(piece => piece.color === 'b');
    
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const whiteValue = whitePieces.reduce((sum, piece) => sum + (pieceValues[piece.type] || 0), 0);
    const blackValue = blackPieces.reduce((sum, piece) => sum + (pieceValues[piece.type] || 0), 0);
    
    const materialDiff = Math.abs(whiteValue - blackValue);
    
    if (materialDiff >= 5) {
      return "You've lost significant material.";
    } else if (materialDiff >= 3) {
      return "You've lost some material.";
    } else {
      return "Your position is worse than before.";
    }
  };

  // EXISTING: Generate move consequences starting after user's move (fallback method)
  const generateMoveConsequences = (startingFen, setupMoves, userMove) => {
    try {
      console.log('🔍 Setting up position for consequences analysis');
      const game = new Chess(startingFen);
      
      // Apply the first 3 moves to get to the decision point
      for (let i = 0; i < setupMoves.length; i++) {
        const move = setupMoves[i];
        const moveResult = game.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
        if (!moveResult) {
          console.error('Invalid setup move:', move);
          return [];
        }
      }
      
      console.log('📍 Position before user move:', game.fen());
      
      // Now apply the user's incorrect move
      const userMoveResult = game.move({ 
        from: userMove.slice(0, 2), 
        to: userMove.slice(2, 4) 
      });
      
      if (!userMoveResult) {
        console.error('Invalid user move:', userMove);
        return [];
      }
      
      console.log('📍 Position after user move:', game.fen());
      console.log('🎯 Now generating opponent responses...');
      
      // The sequence will show opponent's responses to the user's move
      const sequence = [];
      
      // Generate 2-3 opponent responses to show the consequences
      for (let i = 0; i < 3; i++) {
        // Check if game is over using proper Chess.js methods
        if (game.isGameOver() || game.isDraw() || game.isStalemate() || game.isThreefoldRepetition()) {
          console.log(`Game over detected after ${i} moves`);
          break;
        }
        
        const opponentMove = findBestOpponentMove(game);
        if (!opponentMove) {
          console.log('No more moves available');
          break;
        }
        
        console.log(`🤖 Opponent move ${i + 1}: ${opponentMove.from}${opponentMove.to}`);
        
        const moveResult = game.move(opponentMove);
        if (moveResult) {
          sequence.push(opponentMove.from + opponentMove.to);
          console.log(`✅ Applied opponent move: ${opponentMove.from}${opponentMove.to}`);
          console.log(`📍 New position: ${game.fen()}`);
        } else {
          console.error('Failed to apply opponent move');
          break;
        }
      }
      
      console.log('Generated opponent sequence:', sequence);
      return sequence;
      
    } catch (error) {
      console.error('Error generating move consequences:', error);
      return [];
    }
  };

  // EXISTING: Find best opponent move using improved heuristics (fallback method)
  const findBestOpponentMove = (game) => {
    try {
      const moves = game.moves({ verbose: true });
      if (moves.length === 0) {
        console.log('No legal moves available');
        return null;
      }
      
      console.log(`🔍 Evaluating ${moves.length} possible opponent moves`);
      
      let bestMove = null;
      let bestScore = -Infinity;
      
      for (const move of moves) {
        let score = 0;
        
        // Create a copy to test the move
        const gameCopy = new Chess(game.fen());
        const testMoveResult = gameCopy.move(move);
        
        if (!testMoveResult) {
          console.warn(`Failed to apply test move: ${move.from}${move.to}`);
          continue;
        }
        
        // High priority: Checkmate
        if (gameCopy.isCheckmate()) {
          console.log(`🎯 Found checkmate move: ${move.from}${move.to}`);
          score += 10000;
        }
        // High priority: Check
        else if (gameCopy.isCheck()) {
          console.log(`⚡ Found check move: ${move.from}${move.to}`);
          score += 500;
        }
        
        // High priority: Captures (by piece value)
        if (move.captured) {
          const pieceValues = { p: 100, n: 300, b: 300, r: 500, q: 900 };
          const captureValue = pieceValues[move.captured] || 0;
          score += captureValue;
          console.log(`💰 Capture move ${move.from}${move.to} gains ${captureValue} points`);
        }
        
        // Medium priority: Attacks on valuable pieces
        try {
          const opponentMoves = gameCopy.moves({ verbose: true });
          const threatens = opponentMoves.filter(m => m.captured);
          if (threatens.length > 0) {
            const maxThreat = Math.max(...threatens.map(m => {
              const pieceValues = { p: 100, n: 300, b: 300, r: 500, q: 900 };
              return pieceValues[m.captured] || 0;
            }));
            score += maxThreat * 0.5; // Half points for threats
          }
        } catch (threatError) {
          console.warn('Error analyzing threats:', threatError);
        }
        
        // Low priority: Center control
        const centerSquares = ['d4', 'd5', 'e4', 'e5'];
        if (centerSquares.includes(move.to)) {
          score += 10;
        }
        
        // Penalty: Hanging pieces (simplified check)
        try {
          const nextMoves = gameCopy.moves({ verbose: true });
          const isHanging = nextMoves.some(nextMove => nextMove.to === move.to);
          if (isHanging) {
            const pieceValues = { p: 100, n: 300, b: 300, r: 500, q: 900 };
            score -= (pieceValues[move.piece] || 0) * 0.8;
          }
        } catch (hangingError) {
          console.warn('Error checking hanging pieces:', hangingError);
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      
      console.log(`🏆 Best opponent move: ${bestMove?.from}${bestMove?.to} (score: ${bestScore})`);
      return bestMove;
      
    } catch (error) {
      console.error('Error in findBestOpponentMove:', error);
      return null;
    }
  };

  // EXISTING: Play the consequence sequence on the main board (fallback method)
  const playConsequenceSequence = (moveSequence) => {
    if (!moveSequence || moveSequence.length === 0) {
      console.error('No move sequence to play');
      return;
    }
    
    console.log('🎬 Playing consequence sequence:', moveSequence);
    
    const currentPuzzle = puzzles[currentPuzzleIndex];
    const game = new Chess(currentPuzzle.fen);
    
    // Apply the first 3 moves to get to the decision point
    const setupMoves = currentPuzzle.moves.slice(0, sequenceLength - 1);
    for (let i = 0; i < setupMoves.length; i++) {
      const move = setupMoves[i];
      game.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
    }
    
    // Apply the user's move to get to the position after their incorrect move
    const userMoveResult = game.move({ 
      from: lastAttemptedMove.slice(0, 2), 
      to: lastAttemptedMove.slice(2, 4) 
    });
    
    if (!userMoveResult) {
      console.error('Failed to apply user move');
      return;
    }
    
    // Set the board to show the position after user's move
    setBoardPosition(game.fen());
    setCurrentMove(null);
    
    console.log('🎯 Starting opponent response sequence...');
    
    // Show immediate feedback about user's move
    setTimeout(() => {
      setFeedbackMessage(`After your move ${lastAttemptedMove}, here's what happens...`);
      setFeedbackType('warning');
    }, 500);
    
    // Play the opponent's response sequence with delays
    moveSequence.forEach((move, i) => {
      setTimeout(() => {
        console.log(`Playing opponent move ${i + 1}/${moveSequence.length}: ${move}`);
        
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        
        try {
          const moveResult = game.move({ from, to });
          
          if (moveResult) {
            setBoardPosition(game.fen());
            setCurrentMove({ from, to });
            
            // Update feedback message based on which move this is
            if (i === 0) {
              setFeedbackMessage(`Opponent responds with ${move} - putting pressure on your position!`);
              setFeedbackType('info');
            } else if (i === moveSequence.length - 1) {
              // Analyze the final position
              const finalAnalysis = analyzePosition(game);
              setFeedbackMessage(`Final result: ${finalAnalysis} The correct move would have avoided this.`);
              setFeedbackType('error');
            } else {
              setFeedbackMessage(`Opponent continues with ${move}...`);
              setFeedbackType('info');
            }
            
            console.log(`✅ Played opponent move ${i + 1}: ${move}`);
          } else {
            console.error(`❌ Failed to play opponent move ${i + 1}: ${move}`);
          }
        } catch (error) {
          console.error(`Error playing opponent move ${i + 1} (${move}):`, error);
        }
      }, (i + 1) * 2000); // Start after 2 seconds, then 2 seconds between moves
    });
    
    // Clear the arrow and show final message after the sequence
    setTimeout(() => {
      setCurrentMove(null);
      setFeedbackMessage('Consequence sequence complete. See how your move led to problems? Try the next puzzle!');
      setFeedbackType('info');
      console.log('🏁 Consequence sequence playback complete');
    }, (moveSequence.length + 1) * 2000 + 1000);
  };

  // EXISTING: Analyze the final position to give educational feedback (fallback method)
  const analyzePosition = (game) => {
    if (game.isCheckmate()) {
      return "You've been checkmated!";
    }
    if (game.isCheck()) {
      return "Your king is in check and under pressure.";
    }
    if (game.isStalemate()) {
      return "The position is stalemate.";
    }
    if (game.isDraw()) {
      return "The position is drawn.";
    }
