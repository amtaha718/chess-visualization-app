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

  // Load available openings
  const [openingsList, setOpeningsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOpenings();
  }, []);

  const loadOpenings = async () => {
    try {
      const response = await fetch('/api/openings/list');
      const openings = await response.json();
      setOpeningsList(openings);
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
    setUserProgress(progress);
    
    // Start practice session
    setPracticeMode(true);
    setCurrentRound(1);
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
      newGame.move({ from: sourceSquare, to: targetSquare });
      setGameState(newGame);

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

  const handleSequenceComplete = async (isPerfect) => {
    // Record the attempt
    await userSystem.recordOpeningAttempt({
      variationId: selectedVariation.id,
      moveDepth: userProgress.current_move_depth,
      attemptedMoves: userMoves,
      correctMoves: selectedVariation.moves_uci.slice(0, userProgress.current_move_depth),
      isPerfect,
      timeTaken: Date.now() - practiceStartTime,
      practiceRound: currentRound
    });

    if (currentRound < 7) {
      // Continue to next round
      setCurrentRound(currentRound + 1);
      setTimeout(() => {
        resetGame();
        setFeedback(`Round ${currentRound + 1}/7 - Practice the sequence again`);
      }, 2000);
    } else {
      // Check if ready to advance to next move depth
      const shouldAdvance = await checkAdvancementCriteria();
      if (shouldAdvance) {
        advanceToNextDepth();
      } else {
        // Repeat current depth
        repeatCurrentDepth();
      }
    }
  };

  const checkAdvancementCriteria = async () => {
    // Get recent attempts for this depth
    const recentAttempts = await userSystem.getRecentOpeningAttempts(
      selectedVariation.id, 
      userProgress.current_move_depth,
      7
    );

    // Check if user got at least 5 out of 7 correct
    const successfulAttempts = recentAttempts.filter(a => a.is_perfect).length;
    return successfulAttempts >= 5;
  };

  const advanceToNextDepth = async () => {
    const newDepth = userProgress.current_move_depth + 2; // Add 2 moves (one for each side)
    
    await userSystem.updateOpeningProgress(selectedVariation.id, {
      current_move_depth: newDepth,
      consecutive_correct: userProgress.consecutive_correct + 1
    });

    setFeedback(`Great job! Moving to ${newDepth} moves. New moves will be shown.`);
    
    // Show the new moves in the sequence
    setTimeout(() => {
      demonstrateNewMoves(newDepth);
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
        game.move({ from, to });
        setGameState(new Chess(game.fen()));
        
        if (index === moves.length - 1) {
          setTimeout(onComplete, 1000);
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
          onExit={() => setPracticeMode(false)}
        />
      )}
    </div>
  );
};

export default OpeningCourse;
