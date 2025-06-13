// src/components/OpeningCourse.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

const OpeningCourse = ({ userSystem }) => {
  const [selectedOpening, setSelectedOpening] = useState(null);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [userMoves, setUserMoves] = useState([]);
  const [gameState, setGameState] = useState(new Chess());
  const [feedback, setFeedback] = useState('');
  const [practiceStartTime, setPracticeStartTime] = useState(null);

  // Load available openings
  const [openingsList, setOpeningsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOpenings();
  }, []);

  const loadOpenings = async () => {
    try {
      const response = await fetch('/api/openings?action=list');
      const data = await response.json();
      setOpeningsList(data.openings || []);
    } catch (error) {
      console.error('Failed to load openings:', error);
    } finally {
      setLoading(false);
    }
  };

  const startPractice = async (opening, variation) => {
    setSelectedOpening(opening);
    setSelectedVariation(variation);
    
    // Load user's progress for this variation
    const progress = await userSystem.getOpeningProgress(variation.id);
    setUserProgress(progress || {
      current_move_depth: 6,
      max_move_depth: variation.move_count,
      consecutive_correct: 0
    });
    
    // Start practice session
    setPracticeMode(true);
    setCurrentRound(1);
    setPracticeStartTime(Date.now());
    resetGame();
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGameState(newGame);
    setUserMoves([]);
    setFeedback('');
  };

  const handleMove = (sourceSquare, targetSquare) => {
    if (!practiceMode || !selectedVariation) return false;

    const move = sourceSquare + targetSquare;
    const moveIndex = userMoves.length;
    const expectedMove = selectedVariation.moves_uci[moveIndex];

    if (move === expectedMove) {
      // Correct move
      const newMoves = [...userMoves, move];
      setUserMoves(newMoves);
      
      // Update game state
      const newGame = new Chess(gameState.fen());
      try {
        newGame.move({ from: sourceSquare, to: targetSquare });
        setGameState(newGame);
      } catch (error) {
        console.error('Invalid move:', error);
        return false;
      }

      // Check if sequence is complete
      const targetDepth = userProgress?.current_move_depth || 6;
      if (newMoves.length >= targetDepth) {
        handleSequenceComplete(true);
      } else {
        setFeedback(`Correct! Move ${newMoves.length}/${targetDepth}`);
      }
      
      return true;
    } else {
      // Incorrect move
      setFeedback(`Incorrect. Expected: ${expectedMove}. Try again.`);
      recordMistake(moveIndex, move, expectedMove);
      return false;
    }
  };

  const recordMistake = async (moveIndex, userMove, expectedMove) => {
    // This could be enhanced to track specific mistake patterns
    console.log('Mistake recorded:', { moveIndex, userMove, expectedMove });
  };

  const handleSequenceComplete = async (isPerfect) => {
    // Record the attempt
    try {
      await userSystem.recordOpeningAttempt({
        variationId: selectedVariation.id,
        moveDepth: userProgress.current_move_depth,
        attemptedMoves: userMoves,
        correctMoves: selectedVariation.moves_uci.slice(0, userProgress.current_move_depth),
        isPerfect,
        timeTaken: Date.now() - practiceStartTime,
        practiceRound: currentRound
      });
    } catch (error) {
      console.error('Failed to record attempt:', error);
    }

    if (currentRound < 7) {
      // Continue to next round
      setCurrentRound(currentRound + 1);
      setFeedback(`Round ${currentRound}/7 completed! Starting round ${currentRound + 1}...`);
      setTimeout(() => {
        resetGame();
        setFeedback(`Round ${currentRound + 1}/7 - Practice the sequence again`);
      }, 2000);
    } else {
      // Check if ready to advance to next move depth
      const shouldAdvance = await checkAdvancementCriteria();
      if (shouldAdvance.shouldAdvance) {
        advanceToNextDepth();
      } else {
        // Repeat current depth
        repeatCurrentDepth();
      }
    }
  };

  const checkAdvancementCriteria = async () => {
    try {
      // Get recent attempts for this depth
      const recentAttempts = await userSystem.getRecentOpeningAttempts(
        selectedVariation.id, 
        userProgress.current_move_depth,
        7
      );

      // Check if user got at least 5 out of 7 correct
      const successfulAttempts = recentAttempts.filter(a => a.is_perfect).length;
      return {
        shouldAdvance: successfulAttempts >= 5,
        successRate: `${successfulAttempts}/7`
      };
    } catch (error) {
      console.error('Failed to check advancement criteria:', error);
      return { shouldAdvance: false, reason: 'Error checking criteria' };
    }
  };

  const advanceToNextDepth = async () => {
    const newDepth = Math.min(
      userProgress.current_move_depth + 2, // Add 2 moves (one for each side)
      userProgress.max_move_depth
    );
    
    try {
      await userSystem.updateOpeningProgress(selectedVariation.id, {
        current_move_depth: newDepth,
        consecutive_correct: userProgress.consecutive_correct + 1
      });

      setFeedback(`Great job! Moving to ${newDepth} moves. New moves will be shown.`);
      
      // Update local progress state
      setUserProgress(prev => ({
        ...prev,
        current_move_depth: newDepth,
        consecutive_correct: prev.consecutive_correct + 1
      }));
      
      // Show the new moves in the sequence
      setTimeout(() => {
        demonstrateNewMoves(newDepth);
      }, 3000);
    } catch (error) {
      console.error('Failed to advance depth:', error);
      setFeedback('Error advancing to next level. Please try again.');
    }
  };

  const repeatCurrentDepth = () => {
    setFeedback('Keep practicing! You need 5 out of 7 successful rounds to advance.');
    setCurrentRound(1);
    setTimeout(() => {
      resetGame();
      setFeedback('Round 1/7 - Practice the sequence again');
    }, 3000);
  };

  const demonstrateNewMoves = (depth) => {
    // Show the full sequence up to the new depth
    const moves = selectedVariation.moves_uci.slice(0, depth);
    playMoveSequence(moves, () => {
      setFeedback(`Now practice all ${depth} moves. Round 1/7`);
      setCurrentRound(1);
      resetGame();
    });
  };

  const playMoveSequence = (moves, onComplete) => {
    const game = new Chess();
    setGameState(game);
    
    moves.forEach((move, index) => {
      setTimeout(() => {
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        try {
          game.move({ from, to });
          setGameState(new Chess(game.fen()));
          
          if (index === moves.length - 1) {
            setTimeout(onComplete, 1000);
          }
        } catch (error) {
          console.error('Error playing move:', move, error);
        }
      }, index * 1500);
    });
  };

  // Render component JSX
  if (loading) return <div>Loading openings...</div>;

  return (
    <div className="opening-course">
      {!practiceMode ? (
        <OpeningSelector 
          openings={openingsList}
          onSelectVariation={startPractice}
          userSystem={userSystem}
        />
      ) : (
        <PracticeSession
          opening={selectedOpening}
          variation={selectedVariation}
          gameState={gameState}
          onMove={handleMove}
          feedback={feedback}
          currentRound={currentRound}
          userProgress={userProgress}
          userMoves={userMoves}
          onExit={() => setPracticeMode(false)}
        />
      )}
    </div>
  );
};

// OpeningSelector Component
const OpeningSelector = ({ openings, onSelectVariation, userSystem }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [userProgress, setUserProgress] = useState({});

  useEffect(() => {
    loadUserProgress();
  }, []);

  const loadUserProgress = async () => {
    try {
      const progress = await userSystem.getAllOpeningProgress();
      setUserProgress(progress);
    } catch (error) {
      console.error('Failed to load user progress:', error);
    }
  };

  const getProgressPercentage = (variationId) => {
    const progress = userProgress[variationId];
    if (!progress) return 0;
    
    return Math.round(
      (progress.current_move_depth / progress.max_move_depth) * 100
    );
  };

  const filteredOpenings = openings.filter(opening => {
    if (selectedCategory !== 'all' && opening.category !== selectedCategory) {
      return false;
    }
    if (selectedDifficulty !== 'all' && opening.difficulty !== selectedDifficulty) {
      return false;
    }
    return true;
  });

  return (
    <div className="opening-selector">
      <div className="filters">
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="Open">Open Games</option>
          <option value="Semi-Open">Semi-Open Games</option>
          <option value="Closed">Closed Games</option>
          <option value="Flank">Flank Openings</option>
        </select>
        
        <select 
          value={selectedDifficulty} 
          onChange={(e) => setSelectedDifficulty(e.target.value)}
        >
          <option value="all">All Difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div className="openings-grid">
        {filteredOpenings.map(opening => (
          <div key={opening.id} className="opening-card">
            <h3>{opening.name}</h3>
            <p className="eco-code">{opening.eco_code}</p>
            <p className="description">{opening.description}</p>
            
            <div className="variations">
              {opening.opening_variations?.map(variation => (
                <div key={variation.id} className="variation-item">
                  <div className="variation-header">
                    <h4>{variation.variation_name}</h4>
                    <div className="progress-indicator">
                      {getProgressPercentage(variation.id)}%
                    </div>
                  </div>
                  
                  <div className="variation-details">
                    <p>Moves: {variation.move_count}</p>
                    <p>Difficulty: {opening.difficulty}</p>
                  </div>
                  
                  <button 
                    onClick={() => onSelectVariation(opening, variation)}
                    className="start-practice-btn"
                  >
                    {getProgressPercentage(variation.id) > 0 ? 'Continue' : 'Start'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// PracticeSession Component
const PracticeSession = ({ 
  opening, 
  variation, 
  gameState, 
  onMove, 
  feedback, 
  currentRound,
  userProgress,
  userMoves,
  onExit 
}) => {
  const [boardOrientation, setBoardOrientation] = useState('white');

  return (
    <div className="practice-session">
      <div className="practice-header">
        <div className="opening-info">
          <h2>{opening.name}</h2>
          <h3>{variation.variation_name}</h3>
          <span className="eco-code">{opening.eco_code}</span>
        </div>
        
        <div className="practice-stats">
          <div className="round-indicator">
            Round {currentRound}/7
          </div>
          <div className="depth-indicator">
            Depth: {userProgress?.current_move_depth || 6} moves
          </div>
          <button onClick={onExit} className="exit-btn">
            Exit Course
          </button>
        </div>
      </div>

      <div className="practice-content">
        <div className="board-section">
          <Chessboard
            position={gameState.fen()}
            onPieceDrop={onMove}
            boardOrientation={boardOrientation}
            boardWidth={400}
          />
          
          <div className="board-controls">
            <button 
              onClick={() => setBoardOrientation(
                boardOrientation === 'white' ? 'black' : 'white'
              )}
            >
              Flip Board
            </button>
          </div>
        </div>

        <div className="practice-sidebar">
          <div className="feedback-section">
            <h4>Feedback</h4>
            <p className="feedback-message">{feedback}</p>
          </div>

          <div className="sequence-progress">
            <h4>Move Sequence</h4>
            <div className="moves-list">
              {variation.moves?.slice(0, userProgress?.current_move_depth || 6)
                .map((move, index) => (
                <div 
                  key={index}
                  className={`move-item ${
                    index < userMoves.length ? 'completed' : 'pending'
                  }`}
                >
                  {index + 1}. {move}
                </div>
              ))}
            </div>
          </div>

          <div className="key-ideas">
            <h4>Key Ideas</h4>
            <ul>
              {variation.key_ideas?.map((idea, index) => (
                <li key={index}>{idea}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpeningCourse;
