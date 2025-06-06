// src/ai.js - UPDATED WITH STOCKFISH + CLAUDE ANALYSIS

import { Chess } from 'chess.js';

/**
 * Calls our new Stockfish + Claude analysis endpoint for incorrect move explanations.
 * Now provides engine-verified analysis with concise explanations.
 */
export async function getIncorrectMoveExplanation(originalFen, moves, userMove, correctMove, playingAs = 'white') {
  try {
    console.log('❌ === STOCKFISH + CLAUDE ANALYSIS ===');
    console.log('📤 Request data:', { originalFen, moves, userMove, correctMove, playingAs });
    
    // Calculate positions
    let positionAfter3Moves = null;
    let positionAfterUserMove = null;
    
    try {
      const tempGame = new Chess(originalFen);
      // Apply the first 3 moves
      if (moves.length >= 3) {
        tempGame.move({ from: moves[0].slice(0, 2), to: moves[0].slice(2, 4) });
        tempGame.move({ from: moves[1].slice(0, 2), to: moves[1].slice(2, 4) });
        tempGame.move({ from: moves[2].slice(0, 2), to: moves[2].slice(2, 4) });
        positionAfter3Moves = tempGame.fen();
        console.log('📍 Position after 3 moves:', positionAfter3Moves);
        
        // Apply user's move
        const userMoveResult = tempGame.move({ 
          from: userMove.slice(0, 2), 
          to: userMove.slice(2, 4) 
        });
        
        if (userMoveResult) {
          positionAfterUserMove = tempGame.fen();
          console.log('📍 Position after user\'s move:', positionAfterUserMove);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not calculate positions:', error);
    }
    
    // Use new Stockfish + Claude analysis endpoint
    const response = await fetch('/api/analyzeIncorrectMove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        positionAfter3Moves,
        positionAfterUserMove,
        userMove, 
        correctMove, 
        playingAs
      }),
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorJson = await response.json();
      console.error('❌ API error:', errorJson);
      // Use fallback if available
      return errorJson.fallback || 'This move creates tactical problems. Try again.';
    }

    const data = await response.json();
    console.log('✅ Stockfish + Claude analysis received:', data);
    console.log('🎯 Explanation:', data.explanation);
    console.log('📊 Analysis method:', data.method);
    
    return data.explanation;
    
  } catch (error) {
    console.error('❌ Error in Stockfish + Claude analysis:', error);
    return 'This move creates tactical problems. Try again.';
  }
}

/**
 * Simple correct move response - just returns "Correct!" message
 * No more AI explanations for correct answers
 */
export async function getCorrectMoveExplanation(puzzle, userSystem, playingAs) {
  console.log('✅ === SIMPLE CORRECT RESPONSE ===');
  console.log('📋 Puzzle ID:', puzzle.id);
  console.log('📋 No AI explanation needed - just "Correct!" message');

  // Just return a simple "Correct!" message
  // The rating change will be shown by the calling code
  return "Correct!";
}
