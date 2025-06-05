// src/App.js

import React, { useState, useRef, useEffect } from 'react';
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

const getSquareCoordinates = (square, boardSize, isFlipped = false) => {
  let file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  let rank = 8 - parseInt(square[1], 10);
  
  // If board is flipped, invert the coordinates
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
    { value: 'all', label: 'All Levels', color: '#666' },
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
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardPosition, setBoardPosition] = useState('');
  const [arrows, setArrows] = useState([]);
  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [selectedSquares, setSelectedSquares] = useState([]);
  const [isUserTurnToMove, setIsUserTurnToMove] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const internalGameRef = useRef(null);

  // NEW USER SYSTEM STATE VARIABLES
  const [puzzles, setPuzzles] = useState([]);
  const [isLoadingPuzzles, setIsLoadingPuzzles] = useState(true);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileUpdateKey, setProfileUpdateKey] = useState(0); // Force re-render of header
  const [userSystem] = useState(() => new UserSystem());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [puzzleStartTime, setPuzzleStartTime] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
  
  // NEW STATE FOR BOARD ORIENTATION
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [userPlayingAs, setUserPlayingAs] = useState('white');

  // AUTHENTICATION USEEFFECT
  useEffect(() => {
    let subscription;
    
    const setupAuth = async () => {
      try {
        // Get current user first
        const currentUser = await userSystem.getCurrentUser();
        setUser(currentUser);
        
        if (currentUser) {
          const profile = await userSystem.getUserProfile();
          setUserProfile(profile);
        }
        
        // Set up auth state listener
        subscription = userSystem.onAuthStateChange(async (event, user) => {
          setUser(user);
          
          if (user) {
            const profile = await userSystem.getUserProfile();
            setUserProfile(profile);
          } else {
            setUserProfile(null);
          }
        });
        
      } catch (error) {
        console.error('Auth setup error:', error);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    
    setupAuth();
    
    // Cleanup function
    return () => {
      if (subscription && subscription.data && subscription.data.subscription) {
        subscription.data.subscription.unsubscribe();
      }
    };
  }, [userSystem]);

  // PUZZLE LOADING USEEFFECT - Updated to skip solved puzzles
  useEffect(() => {
    async function loadPuzzles() {
      try {
        console.log('Loading puzzles from Supabase...');
        
        let fetchedPuzzles = [];
        
        if (user) {
          // Get puzzles with user progress if logged in
          fetchedPuzzles = await userSystem.getPuzzlesForUser(selectedDifficulty, 100); // Fetch more to ensure we have unsolved ones
        } else {
          // Guest user - get puzzles without progress tracking
          fetchedPuzzles = await userSystem.getPublicPuzzles(selectedDifficulty, 50);
        }
        
        if (fetchedPuzzles.length > 0) {
          setPuzzles(fetchedPuzzles);
          
          // Find first unsolved puzzle
          const firstUnsolvedIndex = fetchedPuzzles.findIndex(p => !p.solved);
          if (firstUnsolvedIndex !== -1) {
            setCurrentPuzzleIndex(firstUnsolvedIndex);
          } else {
            // All puzzles solved, start at 0
            setCurrentPuzzleIndex(0);
            setFeedbackMessage('All puzzles in this difficulty have been solved!');
          }
          
          console.log(`✅ Loaded ${fetchedPuzzles.length} ${selectedDifficulty} puzzles from Supabase`);
          console.log(`📍 Starting at puzzle ${firstUnsolvedIndex !== -1 ? firstUnsolvedIndex + 1 : 1}`);
        } else {
          console.error('❌ No puzzles found for difficulty:', selectedDifficulty);
          setFeedbackMessage(`No ${selectedDifficulty} puzzles available.`);
        }
        
      } catch (error) {
        console.error('Failed to load puzzles:', error);
        setFeedbackMessage('Failed to load puzzles. Please refresh the page.');
      } finally {
        setIsLoadingPuzzles(false);
      }
    }

    // Only load puzzles after auth state is determined
    if (!isLoadingAuth) {
      loadPuzzles();
    }
  }, [isLoadingAuth, user, userSystem, selectedDifficulty]);

  // Update board size on resize
  useEffect(() => {
    const handleResize = () => setBoardSize(getBoardSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Whenever puzzle changes, reset state
  useEffect(() => {
    if (puzzles.length > 0) {
      resetCurrentPuzzle(currentPuzzleIndex);
    }
  }, [currentPuzzleIndex, puzzles]);

  // Helper function to validate puzzle data for 4 moves
  const validatePuzzle = (puzzle) => {
    if (!puzzle.moves || puzzle.moves.length !== 4) {
      console.warn('Puzzle does not have exactly 4 moves:', puzzle);
      return false;
    }
    
    // Validate move format (should be 4 characters like 'e2e4')
    for (let i = 0; i < 4; i++) {
      const move = puzzle.moves[i];
      if (!move || move.length !== 4) {
        console.warn(`Invalid move format at index ${i}:`, move);
        return false;
      }
    }
    
    return true;
  };

  // RESET FUNCTION with board orientation detection and validation for 4 moves
  const resetCurrentPuzzle = (index) => {
    if (!puzzles || puzzles.length === 0 || !puzzles[index]) {
      console.log('No puzzles available yet');
      return;
    }

    const puzzle = puzzles[index];
    
    // Validate puzzle before using it
    if (!validatePuzzle(puzzle)) {
      setFeedbackMessage('This puzzle appears to be invalid. Skipping to next puzzle.');
      if (puzzles.length > 1) {
        setCurrentPuzzleIndex((index + 1) % puzzles.length);
      }
      return;
    }

    const game = new Chess(puzzle.fen);
    
    // For 4-move puzzles, determine who plays move 4
    // Apply first 3 moves to see whose turn it is
    const tempGame = new Chess(puzzle.fen);
    tempGame.move({ from: puzzle.moves[0].slice(0, 2), to: puzzle.moves[0].slice(2, 4) });
    tempGame.move({ from: puzzle.moves[1].slice(0, 2), to: puzzle.moves[1].slice(2, 4) });
    tempGame.move({ from: puzzle.moves[2].slice(0, 2), to: puzzle.moves[2].slice(2, 4) });
    
    const userPlaysAs = tempGame.turn() === 'w' ? 'white' : 'black';
    setUserPlayingAs(userPlaysAs);
    
    // Auto-orient board based on who the user plays as
    setBoardOrientation(userPlaysAs);
    
    internalGameRef.current = game;
    setBoardPosition(puzzle.fen);
    setCurrentMoveIndex(0);
    setArrows([]);
    setHighlightedSquares({});
    setSelectedSquares([]);
    setIsUserTurnToMove(false);
    setFeedbackMessage('');
  };

  // ENHANCED HANDLESHOWMOVE for 4 moves
  const handleShowMove = () => {
    if (currentMoveIndex === 0) setPuzzleStartTime(Date.now());

    const puzzle = puzzles[currentPuzzleIndex];
    
    // Validate puzzle has exactly 4 moves
    if (!puzzle.moves || puzzle.moves.length !== 4) {
      console.error('Puzzle does not have exactly 4 moves:', puzzle);
      setFeedbackMessage('This puzzle appears to be invalid. Please try another.');
      return;
    }

    const move = puzzle.moves[currentMoveIndex];
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);

    setArrows([{ from, to }]);

    if (currentMoveIndex < 3) {  // Changed from 2 to 3
      setCurrentMoveIndex((i) => i + 1);
    } else {
      // Apply first 3 moves to the game
      const game = new Chess(puzzle.fen);
      const move1 = puzzle.moves[0];
      const move2 = puzzle.moves[1];
      const move3 = puzzle.moves[2];

      const moveResult1 = game.move({ from: move1.slice(0, 2), to: move1.slice(2, 4) });
      const moveResult2 = game.move({ from: move2.slice(0, 2), to: move2.slice(2, 4) });
      const moveResult3 = game.move({ from: move3.slice(0, 2), to: move3.slice(2, 4) });

      if (!moveResult1 || !moveResult2 || !moveResult3) {
        console.error('Invalid moves in puzzle sequence');
        setFeedbackMessage('This puzzle contains invalid moves. Please try another.');
        return;
      }

      console.log('Moves 1-3 applied:', move1, move2, move3);
      console.log('Game state after 3 moves:', game.fen());

      internalGameRef.current = game;
      
      // Determine who the user is playing as based on whose turn it is after 3 moves
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

  // Function to skip to next unsolved puzzle
  const skipToNextUnsolved = () => {
    const nextIndex = puzzles.findIndex((p, idx) => idx > currentPuzzleIndex && !p.solved);
    if (nextIndex !== -1) {
      setCurrentPuzzleIndex(nextIndex);
    } else {
      // No more unsolved puzzles after current, check from beginning
      const fromStartIndex = puzzles.findIndex(p => !p.solved);
      if (fromStartIndex !== -1 && fromStartIndex !== currentPuzzleIndex) {
        setCurrentPuzzleIndex(fromStartIndex);
      } else {
        // All puzzles solved
        setFeedbackMessage('Congratulations! You have solved all puzzles in this difficulty.');
      }
    }
  };

  // EXISTING HANDLESQUARECLICK - unchanged
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
      const correctMove = puzzles[currentPuzzleIndex].moves[3];  // Changed to move 4

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

  // ENHANCED EVALUATEUSERMOVE with full context for AI
  const evaluateUserMove = async (from, to, userGuess, correctMove) => {
    console.log('Current FEN:', internalGameRef.current.fen());
    console.log('Attempting move from', from, 'to', to);
    console.log('Available moves:', internalGameRef.current.moves());
    console.log('User guess as coordinate:', userGuess);
    console.log('Correct move:', correctMove);

    const tempGame = new Chess(internalGameRef.current.fen());
    const moveResult = tempGame.move({ from, to });
    console.log('Chess.js move result:', moveResult);

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
          // Force refresh of user profile to get updated stats
          const updatedProfile = await userSystem.getUserProfile();
          setUserProfile(updatedProfile);
          setProfileUpdateKey(prev => prev + 1); // Force header re-render
          
          if (result.ratingChange !== 0) {
            const ratingText = result.ratingChange > 0 ? `(+${result.ratingChange})` : `(${result.ratingChange})`;
            if (solved) {
              // Get AI explanation for correct answer
              const aiExplanation = await getCorrectMoveExplanation(currentPuzzle, userSystem, userPlayingAs);
              setFeedbackMessage(`Correct! Rating: ${result.newRating} ${ratingText}. ${aiExplanation}`);
            } else {
              setFeedbackMessage(`Incorrect. Rating: ${result.newRating} ${ratingText}. `);
            }
          } else {
            // No rating change (repeated attempt)
            if (solved) {
              // Try to get AI explanation even for repeated attempts
              const aiExplanation = await getCorrectMoveExplanation(currentPuzzle, userSystem, userPlayingAs);
              setFeedbackMessage(`Correct! ${aiExplanation} (No rating change - puzzle already attempted)`);
            } else {
              setFeedbackMessage('Incorrect. (No rating change - puzzle already attempted)');
            }
          }
          
          // Update the current puzzle's solved/attempted status in the local state
          const updatedPuzzles = [...puzzles];
          updatedPuzzles[currentPuzzleIndex] = {
            ...updatedPuzzles[currentPuzzleIndex],
            solved: solved || updatedPuzzles[currentPuzzleIndex].solved,
            attempted: true,
            ai_explanation: currentPuzzle.ai_explanation // Keep any AI explanation
          };
          setPuzzles(updatedPuzzles);
        }
      } catch (error) {
        console.error('Failed to record attempt:', error);
      }
    } else if (!user) {
      // Guest user
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
        // Pass full context to AI for better explanations
        const explanation = await getIncorrectMoveExplanation(
          currentPuzzle.fen,        // Original position
          currentPuzzle.moves,      // All 4 moves
          userGuess,                // What user tried
          correctMove,              // What they should have played
          userPlayingAs             // Board orientation
        );
        
        // Append to existing feedback message
        setFeedbackMessage(prev => prev + ' ' + explanation);
      } catch (err) {
        console.error(err);
        setFeedbackMessage(prev => prev + ' (Failed to fetch explanation; try again.)');
      }
    }
  };

  // UPDATED PLAYMOVESEQUENCE for 4 moves
  const playMoveSequence = (moves, isCorrect) => {
    const puzzle = puzzles[currentPuzzleIndex];
    const game = new Chess(puzzle.fen);
    setBoardPosition(puzzle.fen);
    setArrows([]);

    // Limit to first 4 moves
    const movesToPlay = moves.slice(0, 4);

    movesToPlay.forEach((move, i) => {
      setTimeout(() => {
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        const moveResult = game.move({ from, to });
        
        if (moveResult) {
          setBoardPosition(game.fen());
          setArrows([{ from, to }]);
        } else {
          console.error(`Invalid move in sequence: ${move}`);
        }
      }, i * 1000);
    });

    setTimeout(() => {
      if (isCorrect) {
        setFeedbackMessage(`Correct! ${puzzle.explanation}`);
        // Auto-advance to next unsolved puzzle after correct answer
        setTimeout(() => {
          skipToNextUnsolved();
        }, 2000);
      }
      setTimeout(() => setArrows([]), 700);
    }, movesToPlay.length * 1000 + 300);
  };

  // UPDATED HANDLEREVEALSOLUTION for 4 moves
  const handleRevealSolution = () => {
    const puzzle = puzzles[currentPuzzleIndex];
    // Play all 4 moves
    const allMoves = puzzle.moves.slice(0, 4);
    playMoveSequence(allMoves, true);
  };

  // Handler for difficulty change
  const handleDifficultyChange = (newDifficulty) => {
    setSelectedDifficulty(newDifficulty);
    setIsLoadingPuzzles(true);
  };

  // AUTH HANDLER FUNCTIONS
  const handleAuthSuccess = async (user) => {
    setUser(user);
    const profile = await userSystem.getUserProfile();
    setUserProfile(profile);
    setProfileUpdateKey(prev => prev + 1); // Force header re-render
    setShowAuthModal(false);
    
    const userPuzzles = await userSystem.getPuzzlesForUser(selectedDifficulty, 100);
    if (userPuzzles.length > 0) {
      setPuzzles(userPuzzles);
      // Find first unsolved puzzle
      const firstUnsolvedIndex = userPuzzles.findIndex(p => !p.solved);
      if (firstUnsolvedIndex !== -1) {
        setCurrentPuzzleIndex(firstUnsolvedIndex);
      } else {
        setCurrentPuzzleIndex(0);
        setFeedbackMessage('All puzzles in this difficulty have been solved!');
      }
    }
  };

  const handleSignOut = async () => {
    await userSystem.signOut();
    setUser(null);
    setUserProfile(null);
    setShowProfileModal(false);
    
    // Reload puzzles as a guest user
    const guestPuzzles = await userSystem.getPublicPuzzles(selectedDifficulty, 50);
    setPuzzles(guestPuzzles);
  };

  // EXISTING STYLES - unchanged
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

  // UPDATED RENDERARROWS to support flipped board
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

  // LOADING STATE CHECK
  if (isLoadingPuzzles || isLoadingAuth) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Loading Chess Puzzles...</h2>
        <p>Setting up your personalized experience...</p>
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
        onShowAuth={() => {
          setShowAuthModal(true);
        }}
        onShowProfile={() => {
          setShowProfileModal(true);
        }}
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
        {puzzles[currentPuzzleIndex]?.solved && (
          <span style={{ color: '#4CAF50', marginLeft: '10px' }}>✓ Solved</span>
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
              setCurrentPuzzleIndex((i) => (i - 1 + puzzles.length) % puzzles.length)
            }
          >
            Previous Puzzle
          </button>
          <button
            style={buttonStyle}
            onClick={() => skipToNextUnsolved()}
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
        onClose={() => {
          setShowProfileModal(false);
        }}
      />
    </div>
  );
};

export default App;
