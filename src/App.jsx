// src/App.jsx - Complete with Auto-Play and Icon Buttons

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getIncorrectMoveExplanation, getCorrectMoveExplanation } from './ai';
import './index.css';
import UserSystem from './user-system';
import { AuthModal, UserProfile, AuthHeader } from './auth-components';

const getBoardSize = () => (window.innerWidth < 500 ? window.innerWidth - 40 : 400);

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

// Icon Components (SVG) - Smaller sizes
const PrevIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="black">
    <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
  </svg>
);

const PlayIcon = ({ isPlaying }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="black">
    {isPlaying ? (
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    ) : (
      <path d="M8 5v14l11-7z"/>
    )}
  </svg>
);

const HintIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="black">
    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/>
    <circle cx="12" cy="9" r="1" fill="white"/>
  </svg>
);

const RevealIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="black">
    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm-1 13h2v-6h-2v6zm0-8h2V5h-2v2z"/>
  </svg>
);

const NextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="black">
    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
  </svg>
);

// UI Components
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
      border: `2px solid ${style.border}`,
      color: style.text,
      padding: '15px 20px',
      borderRadius: '12px',
      margin: '15px auto',
      maxWidth: '600px',
      fontSize: '15px',
      fontWeight: '500',
      textAlign: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      lineHeight: '1.4'
    }}>
      {message}
    </div>
  );
};

// Difficulty Toggle Component
const DifficultyToggle = ({ currentDifficulty, onDifficultyChange, disabled }) => {
  const difficulties = [
    { value: 'beginner', label: 'Beginner', color: '#4CAF50' },
    { value: 'intermediate', label: 'Intermediate', color: '#FF9800' },
    { value: 'advanced', label: 'Advanced', color: '#f44336' },
    { value: 'expert', label: 'Expert', color: '#9C27B0' }
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      margin: '20px 0',
      flexWrap: 'wrap',
      justifyContent: 'center'
    }}>
      {difficulties.map(diff => (
        <button
          key={diff.value}
          onClick={() => onDifficultyChange(diff.value)}
          disabled={disabled}
          style={{
            padding: '8px 16px',
            border: '2px solid',
            borderColor: currentDifficulty === diff.value ? diff.color : '#ddd',
            backgroundColor: currentDifficulty === diff.value ? diff.color : 'white',
            color: currentDifficulty === diff.value ? 'white' : '#333',
            borderRadius: '20px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: currentDifficulty === diff.value ? 'bold' : 'normal',
            transition: 'all 0.3s ease',
            opacity: disabled ? 0.6 : 1
          }}
        >
          {diff.label}
        </button>
      ))}
    </div>
  );
};

const App = () => {
  // EXISTING STATE VARIABLES
  const [boardSize, setBoardSize] = useState(getBoardSize());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardPosition, setBoardPosition] = useState('');
  const [currentMove, setCurrentMove] = useState(null); // For gradient highlighting
  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [selectedSquares, setSelectedSquares] = useState([]);
  const [isUserTurnToMove, setIsUserTurnToMove] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState('info');
  const [puzzlePhase, setPuzzlePhase] = useState('ready'); // 'ready', 'watching', 'playing', 'complete'
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playSpeed] = useState(1500); // 1.5 seconds between moves
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
  
  // LOADING STATES
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPuzzles, setIsLoadingPuzzles] = useState(false);
  
  // SESSION PERSISTENCE STATE
  const [selectedDifficulty, setSelectedDifficulty] = useState(() => {
    const savedSession = loadSessionData();
    return savedSession?.difficulty || 'intermediate';
  });

  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  
  // BOARD ORIENTATION STATE
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [userPlayingAs, setUserPlayingAs] = useState('white');

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

    console.log('🐟 Loading puzzles:', selectedDifficulty, 'for user:', user?.id || 'guest');
    setIsLoadingPuzzles(true);
    
    try {
      let fetchedPuzzles = [];
      
      if (user) {
        fetchedPuzzles = await userSystem.getPuzzlesForUser(selectedDifficulty, 50);
      } else {
        fetchedPuzzles = await userSystem.getPublicPuzzles(selectedDifficulty, 25);
      }
      
      console.log('📦 Received puzzles:', fetchedPuzzles.length);
      
      if (fetchedPuzzles.length > 0) {
        setPuzzles(fetchedPuzzles);
        setCurrentPuzzleIndex(0);
        console.log(`✅ Ready! ${selectedDifficulty} puzzles loaded`);
      } else {
        setFeedbackMessage(`Failed to load ${selectedDifficulty} puzzles.`);
        setFeedbackType('error');
      }
      
    } catch (error) {
      console.error('❌ Failed to load puzzles:', error);
      setFeedbackMessage('Failed to load puzzles. Please refresh the page.');
      setFeedbackType('error');
    } finally {
      setIsLoadingPuzzles(false);
    }
  }, [isLoadingAuth, user, userSystem, selectedDifficulty, isLoadingPuzzles]);

  // Trigger puzzle loading
  const puzzleLoadTrigger = `${!isLoadingAuth}-${user?.id || 'guest'}-${selectedDifficulty}`;
  useEffect(() => {
    if (!isLoadingAuth) {
      loadPuzzles();
    }
  }, [puzzleLoadTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update board size on resize
  useEffect(() => {
    const handleResize = () => setBoardSize(getBoardSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper function to validate puzzle data
  const validatePuzzle = (puzzle) => {
    if (!puzzle.moves || puzzle.moves.length !== 4) {
      console.warn('Puzzle does not have exactly 4 moves:', puzzle);
      return false;
    }
    
    for (let i = 0; i < 4; i++) {
      const move = puzzle.moves[i];
      if (!move || move.length !== 4) {
        console.warn(`Invalid move format at index ${i}:`, move);
        return false;
      }
    }
    
    return true;
  };

  // Helper function to get path squares between two positions
  const getPathSquares = (from, to) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fromFile = files.indexOf(from[0]);
    const fromRank = parseInt(from[1]);
    const toFile = files.indexOf(to[0]);
    const toRank = parseInt(to[1]);
    
    const path = [];
    const dx = Math.sign(toFile - fromFile);
    const dy = Math.sign(toRank - fromRank);
    
    let currentFile = fromFile;
    let currentRank = fromRank;
    
    // Add starting square
    path.push(from);
    
    // Add intermediate squares
    while (currentFile !== toFile || currentRank !== toRank) {
      if (currentFile !== toFile) currentFile += dx;
      if (currentRank !== toRank) currentRank += dy;
      
      if (currentFile >= 0 && currentFile < 8 && currentRank >= 1 && currentRank <= 8) {
        const square = files[currentFile] + currentRank;
        if (square !== to) { // Don't add destination twice
          path.push(square);
        }
      }
    }
    
    // Add destination square
    path.push(to);
    
    return path;
  };

  // Render gradient path highlighting
  const renderMoveHighlights = () => {
    if (!currentMove) return {};
    
    const { from, to } = currentMove;
    const pathSquares = getPathSquares(from, to);
    const highlights = {};
    
    pathSquares.forEach((square, index) => {
      const intensity = (index / (pathSquares.length - 1)); // 0 to 1
      const opacity = 0.3 + (intensity * 0.5); // 0.3 to 0.8
      const blueIntensity = Math.round(100 + (intensity * 155)); // 100 to 255
      
      highlights[square] = {
        backgroundColor: `rgba(33, 150, ${blueIntensity}, ${opacity})`,
        transition: 'all 0.3s ease'
      };
    });
    
    return highlights;
  };

  // Reset puzzle function
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
    
    // Determine who plays move 4
    const tempGame = new Chess(puzzle.fen);
    tempGame.move({ from: puzzle.moves[0].slice(0, 2), to: puzzle.moves[0].slice(2, 4) });
    tempGame.move({ from: puzzle.moves[1].slice(0, 2), to: puzzle.moves[1].slice(2, 4) });
    tempGame.move({ from: puzzle.moves[2].slice(0, 2), to: puzzle.moves[2].slice(2, 4) });
    
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
    setFeedbackMessage('Watch the first 3 moves, then find the best 4th move!');
    setFeedbackType('info');
    
    // Clear any running timers
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
    }
  }, [puzzles, loadPuzzles]);

  // Reset puzzle when index changes
  useEffect(() => {
    if (puzzles.length > 0) {
      resetCurrentPuzzle(currentPuzzleIndex);
    }
  }, [currentPuzzleIndex, puzzles, resetCurrentPuzzle]);

  // AUTO-PLAY FUNCTIONALITY
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
    setFeedbackMessage('Watch carefully... memorize these moves!');
    setFeedbackType('warning');
    
    // Start the sequence
    playMoveSequence(0);
  };

  const playMoveSequence = (moveIndex) => {
    if (moveIndex >= 3) {
      // After move 3, set up for user's turn
      setupUserTurn();
      return;
    }

    const puzzle = puzzles[currentPuzzleIndex];
    const move = puzzle.moves[moveIndex];
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);

    // Show move with gradient highlighting
    setCurrentMove({ from, to });
    setCurrentMoveIndex(moveIndex + 1);

    // Schedule next move
    autoPlayRef.current = setTimeout(() => {
      playMoveSequence(moveIndex + 1);
    }, playSpeed);
  };

  const setupUserTurn = () => {
    setIsAutoPlaying(false);
    setPuzzlePhase('playing');
    
    // Apply first 3 moves to the game state
    const puzzle = puzzles[currentPuzzleIndex];
    const game = new Chess(puzzle.fen);
    
    const move1 = puzzle.moves[0];
    const move2 = puzzle.moves[1];
    const move3 = puzzle.moves[2];

    const moveResult1 = game.move({ from: move1.slice(0, 2), to: move1.slice(2, 4) });
    const moveResult2 = game.move({ from: move2.slice(0, 2), to: move2.slice(2, 4) });
    const moveResult3 = game.move({ from: move3.slice(0, 2), to: move3.slice(2, 4) });

    if (!moveResult1 || !moveResult2 || !moveResult3) {
      setFeedbackMessage('This puzzle contains invalid moves. Please try another.');
      setFeedbackType('error');
      return;
    }

    internalGameRef.current = game;
    setCurrentMove(null); // Clear highlighting
    setIsUserTurnToMove(true);
    setFeedbackMessage(`Your turn! Find the best move 4 as ${userPlayingAs === 'white' ? 'White' : 'Black'}.`);
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
      const correctMove = puzzles[currentPuzzleIndex].moves[3];

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

    // Record attempt if user is logged in
    if (user && currentPuzzle.id) {
      try {
        const result = await userSystem.recordPuzzleAttempt(
          currentPuzzle.id,
          solved,
          timeTaken,
          [userGuess]
        );
        
        if (result) {
          // Profile refresh
          setTimeout(async () => {
            const updatedProfile = await userSystem.getUserProfile();
            if (updatedProfile) {
              setUserProfile(updatedProfile);
              setProfileUpdateKey(prev => prev + 1);
            }
          }, 500);
          
          const ratingText = result.ratingChange !== 0 ? 
            ` Rating: ${result.newRating} (${result.ratingChange >= 0 ? '+' : ''}${result.ratingChange})` : 
            '';
          
          if (solved) {
            const aiExplanation = await getCorrectMoveExplanation(currentPuzzle, userSystem, userPlayingAs);
            setFeedbackMessage(`Correct!${ratingText}`);
            setFeedbackType('success');
          } else {
            setFeedbackMessage(`Incorrect.${ratingText}`);
            setFeedbackType('error');
          }
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

    // Play all 4 moves for visualization
    playFullSequence([...currentPuzzle.moves.slice(0, 3), userGuess]);

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
    
    // Play all 4 moves
    playFullSequence(puzzle.moves);

    // Show explanation after sequence
    setTimeout(async () => {
      try {
        const explanation = await getCorrectMoveExplanation(puzzle, userSystem, userPlayingAs);
        setFeedbackMessage(`The solution is ${puzzle.moves[3]}.`);
        setFeedbackType('info');
      } catch (error) {
        setFeedbackMessage(`The solution is ${puzzle.moves[3]}.`);
        setFeedbackType('info');
      }
    }, puzzle.moves.length * 1000 + 300);
  };

  const handleHint = () => {
    const puzzle = puzzles[currentPuzzleIndex];
    const correctMove = puzzle.moves[3];
    const from = correctMove.slice(0, 2);
    
    setFeedbackMessage(`Hint: Look at the piece on ${from.toUpperCase()}`);
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
      loadPuzzles();
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

  const iconButtonStyle = {
    width: '36px',
    height: '36px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#f5f5f5',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    margin: '0 3px'
  };

  const disabledIconButtonStyle = {
    ...iconButtonStyle,
    backgroundColor: '#e0e0e0',
    cursor: 'not-allowed',
    opacity: 0.6
  };

  // Loading states
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

  return (
    <div
      className="App"
      style={{
        paddingTop: '4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}
    >
      <AuthHeader
        key={profileUpdateKey}
        user={user}
        profile={userProfile}
        onShowAuth={() => setShowAuthModal(true)}
        onShowProfile={() => setShowProfileModal(true)}
        onSignOut={handleSignOut}
      />

      <img
        src="/logo.png"
        alt="Visualize 3 Logo"
        style={{
          height: boardSize > 360 ? '100px' : '60px',
          marginTop: '2px',
          marginBottom: '2px'
        }}
      />
      <h1 style={{ fontSize: '22px', marginTop: '2px', marginBottom: '4px' }}>
        Chess Visualization Trainer
      </h1>
      <p
        style={{
          maxWidth: '600px',
          textAlign: 'center',
          marginBottom: '16px'
        }}
      >
        Strengthen your chess memory and tactical foresight. Watch the first three
        moves play out, then use your recall skills to find the best fourth move
        without any visual aids.
      </p>

      <DifficultyToggle 
        currentDifficulty={selectedDifficulty}
        onDifficultyChange={handleDifficultyChange}
        disabled={isLoadingPuzzles}
      />

      <p>
        Puzzle {currentPuzzleIndex + 1} of {puzzles.length}
        {userPlayingAs && (
          <span style={{ 
            fontWeight: 'bold', 
            marginLeft: '10px',
            color: userPlayingAs === 'white' ? '#333' : '#000'
          }}>
            Playing as {userPlayingAs === 'white' ? 'White' : 'Black'}
          </span>
        )}
      </p>

      <div style={{ position: 'relative', width: boardSize, height: boardSize }}>
        <Chessboard
          position={boardPosition}
          onSquareClick={handleSquareClick}
          boardWidth={boardSize}
          boardOrientation={boardOrientation}
          arePiecesDraggable={false}
          customSquareStyles={{
            ...highlightedSquares,
            ...renderMoveHighlights()
          }}
          customDarkSquareStyle={{ backgroundColor: '#4caf50' }}
          customLightSquareStyle={{ backgroundColor: '#f1f1e6' }}
        />
      </div>

      <FeedbackCard message={feedbackMessage} type={feedbackType} />

      {/* Icon Button Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '20px',
        marginBottom: '20px'
      }}>
        {/* Previous Puzzle */}
        <button 
          style={currentPuzzleIndex > 0 ? iconButtonStyle : disabledIconButtonStyle}
          onClick={goToPreviousPuzzle}
          disabled={currentPuzzleIndex === 0}
          title="Previous Puzzle"
          onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
          onMouseLeave={(e) => e.target.style.backgroundColor = currentPuzzleIndex > 0 ? '#f5f5f5' : '#e0e0e0'}
        >
          <PrevIcon />
        </button>

        {/* Play/Pause Button - Now always available for replay */}
        <button 
          style={iconButtonStyle}
          onClick={isAutoPlaying ? pauseAutoPlay : startAutoPlay}
          title={isAutoPlaying ? "Pause" : puzzlePhase === 'ready' ? "Watch Moves 1-3" : "Replay Sequence"}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#f5f5f5'}
        >
          <PlayIcon isPlaying={isAutoPlaying} />
        </button>

        {/* Hint Button */}
        <button 
          style={puzzlePhase === 'playing' ? iconButtonStyle : disabledIconButtonStyle}
          onClick={handleHint}
          disabled={puzzlePhase !== 'playing'}
          title="Hint"
          onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
          onMouseLeave={(e) => e.target.style.backgroundColor = puzzlePhase === 'playing' ? '#f5f5f5' : '#e0e0e0'}
        >
          <HintIcon />
        </button>

        {/* Reveal Solution Button */}
        <button 
          style={puzzlePhase === 'playing' || puzzlePhase === 'complete' ? iconButtonStyle : disabledIconButtonStyle}
          onClick={handleRevealSolution}
          disabled={puzzlePhase !== 'playing' && puzzlePhase !== 'complete'}
          title="Reveal Solution"
          onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
          onMouseLeave={(e) => e.target.style.backgroundColor = (puzzlePhase === 'playing' || puzzlePhase === 'complete') ? '#f5f5f5' : '#e0e0e0'}
        >
          <RevealIcon />
        </button>

        {/* Next Puzzle */}
        <button 
          style={iconButtonStyle}
          onClick={skipToNextPuzzle}
          title="Next Puzzle"
          onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#f5f5f5'}
        >
          <NextIcon />
        </button>
      </div>

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
