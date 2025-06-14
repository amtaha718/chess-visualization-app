// src/MoveConsequenceDisplay.js - Component for showing move sequences

import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

const MoveConsequenceDisplay = ({ 
  userConsequences, 
  correctBenefits, 
  onClose,
  initialPosition,
  boardSize = 300,
  boardOrientation = 'white'
}) => {
  const [currentSequence, setCurrentSequence] = useState('user'); // 'user' or 'correct'
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [boardPosition, setBoardPosition] = useState(initialPosition);
  const [currentGame, setCurrentGame] = useState(null);

  // Initialize game
  useEffect(() => {
    const game = new Chess(initialPosition);
    setCurrentGame(game);
    setBoardPosition(initialPosition);
    setCurrentMoveIndex(0);
  }, [initialPosition]);

  // Play sequence automatically
  useEffect(() => {
    if (!isPlaying || !currentGame || !userConsequences || !correctBenefits) return;

    const sequence = currentSequence === 'user' ? userConsequences.sequence : correctBenefits.sequence;
    if (currentMoveIndex >= sequence.length) {
      setIsPlaying(false);
      return;
    }

    const timeout = setTimeout(() => {
      playNextMove();
    }, 1500);

    return () => clearTimeout(timeout);
  }, [isPlaying, currentMoveIndex, currentSequence, currentGame, userConsequences, correctBenefits]);

  const playNextMove = () => {
    if (!currentGame || !userConsequences || !correctBenefits) return;

    const sequence = currentSequence === 'user' ? userConsequences.sequence : correctBenefits.sequence;
    
    if (currentMoveIndex < sequence.length) {
      const move = sequence[currentMoveIndex];
      const from = move.slice(0, 2);
      const to = move.slice(2, 4);

      try {
        const moveResult = currentGame.move({ from, to });
        if (moveResult) {
          setBoardPosition(currentGame.fen());
          setCurrentMoveIndex(prev => prev + 1);
        } else {
          console.error('Invalid move in sequence:', move);
          setIsPlaying(false);
        }
      } catch (error) {
        console.error('Error playing move:', error);
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(false);
    }
  };

  const resetSequence = () => {
    if (!currentGame) return;
    
    setIsPlaying(false);
    setCurrentMoveIndex(0);
    
    // Reset game to initial position
    const newGame = new Chess(initialPosition);
    setCurrentGame(newGame);
    setBoardPosition(initialPosition);
  };

  const switchSequence = (sequenceType) => {
    setCurrentSequence(sequenceType);
    resetSequence();
  };

  const startPlayback = () => {
    if (currentMoveIndex === 0) {
      setIsPlaying(true);
    } else {
      resetSequence();
      setTimeout(() => setIsPlaying(true), 100);
    }
  };

  if (!userConsequences || !correctBenefits) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading move analysis...</p>
      </div>
    );
  }

  const currentSequenceData = currentSequence === 'user' ? userConsequences : correctBenefits;
  const sequenceLength = currentSequenceData.sequence.length;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            Move Consequences Analysis
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* Sequence selector */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => switchSequence('user')}
            style={{
              padding: '8px 16px',
              border: '2px solid',
              borderColor: currentSequence === 'user' ? '#f44336' : '#ddd',
              backgroundColor: currentSequence === 'user' ? '#f44336' : 'white',
              color: currentSequence === 'user' ? 'white' : '#333',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: currentSequence === 'user' ? 'bold' : 'normal'
            }}
          >
            Your Move Sequence ({userConsequences.sequence.length} moves)
          </button>
          <button
            onClick={() => switchSequence('correct')}
            style={{
              padding: '8px 16px',
              border: '2px solid',
              borderColor: currentSequence === 'correct' ? '#4CAF50' : '#ddd',
              backgroundColor: currentSequence === 'correct' ? '#4CAF50' : 'white',
              color: currentSequence === 'correct' ? 'white' : '#333',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: currentSequence === 'correct' ? 'bold' : 'normal'
            }}
          >
            Correct Move Sequence ({correctBenefits.sequence.length} moves)
          </button>
        </div>

        {/* Board */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <Chessboard
              position={boardPosition}
              boardWidth={boardSize}
              boardOrientation={boardOrientation}
              arePiecesDraggable={false}
              customDarkSquareStyle={{ backgroundColor: '#769656' }}
              customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
            />
          </div>
        </div>

        {/* Progress indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '15px'
        }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            Move {currentMoveIndex} of {sequenceLength}
          </span>
          <div style={{
            width: '100px',
            height: '4px',
            backgroundColor: '#ddd',
            borderRadius: '2px',
            position: 'relative'
          }}>
            <div style={{
              width: `${sequenceLength > 0 ? (currentMoveIndex / sequenceLength) * 100 : 0}%`,
              height: '100%',
              backgroundColor: currentSequence === 'user' ? '#f44336' : '#4CAF50',
              borderRadius: '2px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '20px'
        }}>
          <button
            onClick={startPlayback}
            disabled={isPlaying}
            style={{
              padding: '8px 16px',
              backgroundColor: isPlaying ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isPlaying ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isPlaying ? 'Playing...' : currentMoveIndex === 0 ? 'Play Sequence' : 'Replay'}
          </button>
          <button
            onClick={resetSequence}
            style={{
              padding: '8px 16px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>

        {/* Move list */}
        {currentSequenceData.sequence.length > 0 && (
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '15px'
          }}>
            <h4 style={{ 
              margin: '0 0 10px 0', 
              fontSize: '14px', 
              color: currentSequence === 'user' ? '#f44336' : '#4CAF50',
              fontWeight: 'bold'
            }}>
              {currentSequence === 'user' ? 'Your Move Sequence:' : 'Correct Move Sequence:'}
            </h4>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {currentSequenceData.sequence.map((move, index) => (
                <span
                  key={index}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: index < currentMoveIndex ? 
                      (currentSequence === 'user' ? '#f44336' : '#4CAF50') : '#ddd',
                    color: index < currentMoveIndex ? 'white' : '#333',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: index < currentMoveIndex ? 'bold' : 'normal'
                  }}
                >
                  {index + 1}. {move}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Analysis summary */}
        {currentSequenceData.analysis && (
          <div style={{
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '15px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>
              Analysis Summary:
            </h4>
            <div style={{ fontSize: '13px', color: '#666' }}>
              {currentSequenceData.analysis.materialBalance !== 0 && (
                <p style={{ margin: '5px 0' }}>
                  Material change: {currentSequenceData.analysis.materialBalance > 0 ? '+' : ''}{currentSequenceData.analysis.materialBalance}
                </p>
              )}
              {currentSequenceData.analysis.checksGiven > 0 && (
                <p style={{ margin: '5px 0' }}>
                  Checks given: {currentSequenceData.analysis.checksGiven}
                </p>
              )}
              {currentSequenceData.gameOver && (
                <p style={{ margin: '5px 0', fontWeight: 'bold', color: '#f44336' }}>
                  Game ends: {currentSequenceData.result}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Close button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            Continue Training
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveConsequenceDisplay;
