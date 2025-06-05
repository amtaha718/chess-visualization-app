// src/App.jsx - Your main chess app now using Stockfish puzzles

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

const getSquareCoordinates = (square, boardSize, isFlipped = false) => {
  let file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  let rank = 8 - parseInt(square[1], 10);
  
  if (isFlipped) {
    file = 7 - file;
    rank = 7 - rank;
  }
  
  const squareSize = boardSize / 8;
  return {
    x: file * squareSize + squareSize / 2,
    y: rank * squareSize + squareSize / 2
  };
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
  const [arrows, setArrows] = useState([]);
  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [selectedSquares, setSelectedSquares] = useState([]);
  const [isUserTurnToMove, setIsUserTurnToMove] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
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
        
        // Set up auth state listener - ignore token refresh events
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

  // STOCKFISH PUZZLE LOADING
  const loadPuzzles = useCallback(async () => {
    if (isLoadingAuth || isLoadingPuzzles) {
      return;
    }

    console.log('🐟 Loading Stockfish puzzles:', selectedDifficulty, 'for user:', user?.id || 'guest');
    setIsLoadingPuzzles(true);
    
    try {
      let fetchedPuzzles = [];
      
      if (user) {
        fetchedPuzzles = await userSystem.getPuzzlesForUser(selectedDifficulty, 50);
      } else {
        fetchedPuzzles = await userSystem.getPublicPuzzles(selectedDifficulty, 25);
      }
      
      console.log('📦 Received Stockfish puzzles:', fetchedPuzzles.length);
      
      if (fetchedPuzzles.length > 0) {
        setPuzzles(fetchedPuzzles);
        
        // Start at first puzzle (since these are freshly generated)
        setCurrentPuzzleIndex(0);
        console.log(`✅ Ready! ${selectedDifficulty} Stockfish puzzles loaded`);
        
      } else {
        setFeedbackMessage(`Failed to generate ${selectedDifficulty} puzzles.`);
      }
      
    } catch (error) {
      console.error('❌ Failed to load Stockfish puzzles:', error);
      setFeedbackMessage('Failed to generate puzzles. Please refresh the page.');
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

  // Reset puzzle function
  const resetCurrentPuzzle = useCallback((index) => {
    if (!puzzles || puzzles.length === 0 || !puzzles[index]) {
      return;
    }

    const puzzle = puzzles[index];
    
    if (!validatePuzzle(puzzle)) {
      setFeedbackMessage('This puzzle appears to be invalid. Generating new puzzles...');
      loadPuzzles(); // Generate new puzzles
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
    setArrows([]);
    setHighlightedSquares({});
    setSelectedSquares([]);
    setIsUserTurnToMove(false);
    setFeedbackMessage('');
  }, [puzzles, loadPuzzles]);

  // Reset puzzle when index changes
  useEffect(() => {
    if (puzzles.length > 0) {
      resetCurrentPuzzle(currentPuzzleIndex);
    }
  }, [currentPuzzleIndex, puzzles, resetCurrentPuzzle]);

  const handleShowMove = () => {
    if (currentMoveIndex === 0) setPuzzleStartTime(Date.now());

    const puzzle = puzzles[currentPuzzleIndex];
    
    if (!puzzle.moves || puzzle.moves.length !== 4) {
      setFeedbackMessage('This puzzle appears to be invalid. Please try another.');
      return;
    }

    const move = puzzle.moves[currentMoveIndex];
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);

    setArrows([{ from, to }]);

    if (currentMoveIndex < 3) {
      setCurrentMoveIndex((i) => i + 1);
    } else {
      // Apply first 3 moves
      const game = new Chess(puzzle.fen);
      const move1 = puzzle.moves[0];
      const move2 = puzzle.moves[1];
      const move3 = puzzle.moves[2];

      const moveResult1 = game.move({ from: move1.slice(0, 2), to: move1.slice(2, 4) });
      const moveResult2 = game.move({ from: move2.slice(0, 2), to: move2.slice(2, 4) });
      const moveResult3 = game.move({ from: move3.slice(0, 2), to: move3.slice(2, 4) });

      if (!moveResult1 || !moveResult2 || !moveResult3) {
        setFeedbackMessage('This puzzle contains invalid moves. Please try another.');
        return;
      }

      console.log('Moves 1-3 applied:', move1, move2, move3);
      console.log('Game state after 3 moves:', game.fen());

      internalGameRef.current = game;
      
      const currentTurn = game.turn();
      const playingAs = currentTurn === 'w' ? 'white' : 'black';
      setUserPlayingAs(playingAs);

      setIsUserTurnToMove(true);
      setFeedbackMessage(
        `Recall moves 1, 2, and 3 in your mind—then choose the squares for the strongest move 4 as ${playingAs === 'white' ? 'White' : 'Black'}.`
      );
      setArrows([]);
    }
  };

  const skipToNextPuzzle = () => {
    if (currentPuzzleIndex < puzzles.length - 1) {
      setCurrentPuzzleIndex(currentPuzzleIndex + 1);
    } else {
      // Generate new puzzles when we reach the end
      loadPuzzles();
      setCurrentPuzzleIndex(0);
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
      return;
    }

    setIsUserTurnToMove(false);
    setFeedbackMessage('Analyzing your move…');

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
            setFeedbackMessage(`Correct!${ratingText}. ${aiExplanation}`);
          } else {
            setFeedbackMessage(`Incorrect.${ratingText}`);
          }
        }
      } catch (error) {
        console.error('Failed to record attempt:', error);
      }
    } else if (!user) {
      if (solved) {
        setFeedbackMessage(`Correct! ${currentPuzzle.explanation}`);
      }
    }

    // Play all 4 moves
    const sequence = [
      currentPuzzle.moves[0],
      currentPuzzle.moves[1],
      currentPuzzle.moves[2],
      userGuess
    ];
    playMoveSequence(sequence, solved);

    if (!solved) {
      try {
        const explanation = await getIncorrectMoveExplanation(
          currentPuzzle.fen,
          currentPuzzle.moves,
          userGuess,
          correctMove,
          userPlayingAs
        );
        
        setFeedbackMessage(prev => prev + ' ' + explanation);
      } catch (err) {
        setFeedbackMessage(prev => prev + ' (Failed to fetch explanation; try again.)');
      }
    }
  };

  const playMoveSequence = (moves, isCorrect) => {
    const puzzle = puzzles[currentPuzzleIndex];
    const game = new Chess(puzzle.fen);
    setBoardPosition(puzzle.fen);
    setArrows([]);

    const movesToPlay = moves.slice(0, 4);

    movesToPlay.forEach((move, i) => {
      setTimeout(() => {
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        const moveResult = game.move({ from, to });
        
        if (moveResult) {
          setBoardPosition(game.fen());
          setArrows([{ from, to }]);
        }
      }, i * 1000);
    });

    setTimeout(() => {
      if (isCorrect) {
        setFeedbackMessage(`Correct! ${puzzle.explanation}`);
      }
      setTimeout(() => setArrows([]), 700);
    }, movesToPlay.length * 1000 + 300);
  };

  const handleRevealSolution = () => {
    const puzzle = puzzles[currentPuzzleIndex];
    const allMoves = puzzle.moves.slice(0, 4);
    playMoveSequence(allMoves, true);
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
    transition: 'background-color 0.3s ease'
  };

  const renderArrows = () => {
    const isFlipped = boardOrientation === 'black';
    
    return (
      <svg
        width={boardSize}
        height={boardSize}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="5"
            markerHeight="3.5"
            refX="5"
            refY="1.75"
            orient="auto"
          >
            <polygon points="0 0, 5 1.75, 0 3.5" fill="rgba(30, 144, 255, 0.7)" />
          </marker>
        </defs>
        {arrows.map(({ from, to }, i) => {
          const start = getSquareCoordinates(from, boardSize, isFlipped);
          const end = getSquareCoordinates(to, boardSize, isFlipped);
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
        <h2>Generating Stockfish Puzzles...</h2>
        <p>Difficulty: {selectedDifficulty}</p>
        <p>🐟 Creating challenging visualization puzzles...</p>
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
        <h2>Failed to Generate Puzzles</h2>
        <p>Difficulty: {selectedDifficulty}</p>
        <button onClick={() => loadPuzzles()} style={buttonStyle}>
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
        without any visual aids. Now powered by Stockfish for better puzzle quality!
      </p>

      <DifficultyToggle 
        currentDifficulty={selectedDifficulty}
        onDifficultyChange={handleDifficultyChange}
        disabled={isLoadingPuzzles}
      />

      <p>
        Puzzle {currentPuzzleIndex + 1} of {puzzles.length} (Stockfish Generated)
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
          customSquareStyles={highlightedSquares}
          customDarkSquareStyle={{ backgroundColor: '#4caf50' }}
          customLightSquareStyle={{ backgroundColor: '#f1f1e6' }}
        />
        {renderArrows()}
      </div>
      <p style={{ 
        maxWidth: '600px', 
        textAlign: 'center', 
        wordWrap: 'break-word',
        padding: '0 10px'
      }}>
        {feedbackMessage}
      </p>
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '5px'
        }}>
          <button style={buttonStyle} onClick={handleShowMove}>
            {currentMoveIndex < 3 ? `Show Move ${currentMoveIndex + 1}` : 'Your Move'}
          </button>
          <button style={buttonStyle} onClick={() => resetCurrentPuzzle(currentPuzzleIndex)}>
            Replay
          </button>
          <button style={buttonStyle} onClick={handleRevealSolution}>
            Reveal Solution
          </button>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '5px'
        }}>
          <button
            style={buttonStyle}
            onClick={() =>
              setCurrentPuzzleIndex(Math.max(0, currentPuzzleIndex - 1))
            }
          >
            Previous Puzzle
          </button>
          <button
            style={buttonStyle}
            onClick={skipToNextPuzzle}
          >
            Next Puzzle
          </button>
        </div>
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
