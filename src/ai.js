// src/ai.js - RELIABLE VERSION WITH BETTER ERROR HANDLING

import { Chess } from 'chess.js';

/**
 * Main incorrect move analysis - tries enhanced analysis first, then falls back gracefully
 */
export async function getIncorrectMoveExplanation(originalFen, moves, userMove, correctMove, playingAs = 'white') {
  try {
    console.log('🔍 === RELIABLE INCORRECT MOVE ANALYSIS ===');
    console.log('📤 Request data:', { originalFen, moves, userMove, correctMove, playingAs });
    
    // Calculate position after first 3 moves
    let positionAfter3Moves = null;
    
    try {
      const tempGame = new Chess(originalFen);
      if (moves.length >= 3) {
        for (let i = 0; i < 3; i++) {
          const move = moves[i];
          const moveResult = tempGame.move({ 
            from: move.slice(0, 2), 
            to: move.slice(2, 4) 
          });
          
          if (!moveResult) {
            console.error(`Invalid move ${i + 1}: ${move}`);
            throw new Error(`Move ${i + 1} is invalid`);
          }
        }
        
        positionAfter3Moves = tempGame.fen();
        console.log('📍 Position after 3 moves calculated successfully');
      } else {
        throw new Error('Need at least 3 moves to analyze');
      }
    } catch (error) {
      console.error('⚠️ Could not calculate position after 3 moves:', error);
      return getBasicPatternExplanation(userMove, correctMove, playingAs);
    }
    
    // Try enhanced analysis first
    try {
      const enhancedResult = await tryEnhancedAnalysis(positionAfter3Moves, userMove, correctMove, playingAs);
      if (enhancedResult) {
        console.log('✅ Enhanced analysis successful:', enhancedResult);
        return enhancedResult;
      }
    } catch (enhancedError) {
      console.warn('⚠️ Enhanced analysis failed:', enhancedError.message);
    }
    
    // Try basic pattern analysis
    try {
      const patternResult = await tryPatternAnalysis(userMove, correctMove, playingAs);
      if (patternResult) {
        console.log('✅ Pattern analysis successful:', patternResult);
        return patternResult;
      }
    } catch (patternError) {
      console.warn('⚠️ Pattern analysis failed:', patternError.message);
    }
    
    // Final fallback
    console.log('🔄 Using final fallback explanation');
    return getBasicPatternExplanation(userMove, correctMove, playingAs);
    
  } catch (error) {
    console.error('❌ All analysis methods failed:', error);
    return getBasicPatternExplanation(userMove, correctMove, playingAs);
  }
}

/**
 * Try enhanced Stockfish analysis with timeout
 */
async function tryEnhancedAnalysis(positionAfter3Moves, userMove, correctMove, playingAs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
  
  try {
    const response = await fetch('/api/analyzeIncorrectMoveStockfish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        positionAfter3Moves,
        userMove, 
        correctMove, 
        playingAs
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.explanation && data.explanation.trim()) {
      return data.explanation;
    } else {
      throw new Error('Empty explanation returned');
    }
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.warn('Enhanced analysis timed out');
    } else {
      console.warn('Enhanced analysis failed:', error.message);
    }
    
    throw error;
  }
}

/**
 * Try basic pattern analysis
 */
async function tryPatternAnalysis(userMove, correctMove, playingAs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
  
  try {
    const response = await fetch('/api/analyzeIncorrectMove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userMove, 
        correctMove, 
        playingAs
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.explanation && data.explanation.trim()) {
      return data.explanation;
    } else {
      throw new Error('Empty explanation returned');
    }
    
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Basic pattern explanation - always works
 */
function getBasicPatternExplanation(userMove, correctMove, playingAs) {
  const userFrom = userMove.slice(0, 2);
  const userTo = userMove.slice(2, 4);
  const correctFrom = correctMove.slice(0, 2);
  const correctTo = correctMove.slice(2, 4);
  
  console.log('📝 Generating basic pattern explanation');
  
  // Analyze move patterns
  if (userFrom !== correctFrom) {
    const wrongPieceExplanations = [
      "This piece doesn't achieve the goal. Try again.",
      "The key piece is elsewhere. Try again.",
      "This doesn't address the main issue. Try again."
    ];
    return wrongPieceExplanations[Math.floor(Math.random() * wrongPieceExplanations.length)];
  }
  
  if (userFrom === correctFrom && userTo !== correctTo) {
    // Check specific square differences
    if (isCenterSquare(correctTo) && !isCenterSquare(userTo)) {
      return "This doesn't control the center effectively. Try again.";
    }
    
    if (isBackRank(correctTo) && !isBackRank(userTo)) {
      return "This doesn't address the back rank issue. Try again.";
    }
    
    const wrongDestinationExplanations = [
      "Right piece, wrong destination. Try again.",
      "This square doesn't accomplish the goal. Try again.",
      "The piece needs to go elsewhere. Try again."
    ];
    return wrongDestinationExplanations[Math.floor(Math.random() * wrongDestinationExplanations.length)];
  }
  
  // Check for defensive vs aggressive patterns
  if (isDefensiveMove(userMove) && isAggressiveMove(correctMove)) {
    return "This move is too passive for the position. Try again.";
  }
  
  if (isAggressiveMove(userMove) && isDefensiveMove(correctMove)) {
    return "This move is too aggressive - defense is needed. Try again.";
  }
  
  // Color-specific explanations
  const explanationsByColor = {
    white: [
      "This doesn't maintain White's initiative. Try again.",
      "This allows Black to equalize. Try again.",
      "This misses White's tactical opportunity. Try again.",
      "This doesn't exploit Black's weakness. Try again."
    ],
    black: [
      "This doesn't defend against White's threats. Try again.",
      "This allows White to increase pressure. Try again.",
      "This misses Black's counterplay. Try again.",
      "This doesn't neutralize White's attack. Try again."
    ]
  };
  
  const explanations = explanationsByColor[playingAs] || explanationsByColor.white;
  return explanations[Math.floor(Math.random() * explanations.length)];
}

/**
 * Correct move explanation - simple and reliable
 */
export async function getCorrectMoveExplanation(puzzle, userSystem, playingAs) {
  console.log('✅ === CORRECT MOVE EXPLANATION ===');
  console.log('📋 Puzzle ID:', puzzle.id);
  
  // Return empty string - "Correct!" is handled by the main app
  return "";
}

// Helper functions
function isCenterSquare(square) {
  return ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'].includes(square);
}

function isBackRank(square) {
  const rank = square[1];
  return rank === '1' || rank === '8';
}

function isDefensiveMove(move) {
  const to = move.slice(2, 4);
  const rank = parseInt(to[1]);
  
  // Moves to back two ranks are generally defensive
  return rank <= 2 || rank >= 7;
}

function isAggressiveMove(move) {
  const to = move.slice(2, 4);
  const rank = parseInt(to[1]);
  
  // Moves to central ranks are generally aggressive
  return rank >= 3 && rank <= 6;
}

function isEdgeSquare(square) {
  const file = square[0];
  const rank = square[1];
  return file === 'a' || file === 'h' || rank === '1' || rank === '8';
}

// Validation utilities
export function validateChessPosition(fen) {
  try {
    const game = new Chess(fen);
    return { valid: true, game };
  } catch (error) {
    console.error('Invalid chess position:', fen, error);
    return { valid: false, error: error.message };
  }
}

export function validateMove(fen, move) {
  try {
    const game = new Chess(fen);
    const moveResult = game.move({
      from: move.slice(0, 2),
      to: move.slice(2, 4),
      promotion: move.length > 4 ? move[4] : undefined
    });
    
    return { valid: !!moveResult, moveResult };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// System info
export const AnalysisInfo = {
  version: '2.1-reliable',
  features: [
    'Multi-layer fallback system',
    'Timeout protection',
    'Pattern-based analysis',
    'Basic chess logic',
    'Reliable error handling'
  ],
  accuracy: 'Good - Multiple fallback layers',
  speed: 'Fast - Always responds quickly'
};
