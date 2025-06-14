// api/analyzeIncorrectMoveStockfish.js - Ultra-simple version (no Workers)

import { Chess } from 'chess.js';

export default async function handler(req, res) {
  console.log('🔍 === ULTRA-SIMPLE CHESS ANALYSIS ===');
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      explanation: 'This move has issues. Try again.'
    });
  }

  try {
    console.log('📥 Request received');
    console.log('📋 Request body:', req.body);

    const { 
      positionAfter3Moves,
      userMove,
      correctMove,
      playingAs 
    } = req.body;
    
    // Validate required fields
    if (!positionAfter3Moves || !userMove || !correctMove) {
      console.log('❌ Missing required fields');
      return res.status(200).json({ 
        explanation: "Missing data for analysis. Try again.",
        method: 'validation_error'
      });
    }

    console.log('📊 Analyzing moves...');
    console.log('- Position FEN:', positionAfter3Moves);
    console.log('- User move:', userMove);
    console.log('- Correct move:', correctMove);
    console.log('- Playing as:', playingAs);

    // Validate position
    let gameAtPosition;
    try {
      gameAtPosition = new Chess(positionAfter3Moves);
      console.log('✅ Position is valid');
    } catch (fenError) {
      console.error('❌ Invalid FEN position:', fenError);
      return res.status(200).json({ 
        explanation: "Position validation failed. Try again.",
        method: 'fen_error'
      });
    }

    // Validate user move
    let gameAfterUser;
    try {
      gameAfterUser = new Chess(positionAfter3Moves);
      const userMoveResult = gameAfterUser.move({
        from: userMove.slice(0, 2),
        to: userMove.slice(2, 4)
      });

      if (!userMoveResult) {
        console.log('❌ User move is illegal');
        return res.status(200).json({ 
          explanation: "Illegal move. Try again.",
          method: 'illegal_move'
        });
      }
      console.log('✅ User move is legal');
    } catch (userMoveError) {
      console.error('❌ User move validation failed:', userMoveError);
      return res.status(200).json({ 
        explanation: "Move validation failed. Try again.",
        method: 'user_move_error'
      });
    }

    // Validate correct move
    let gameAfterCorrect;
    try {
      gameAfterCorrect = new Chess(positionAfter3Moves);
      const correctMoveResult = gameAfterCorrect.move({
        from: correctMove.slice(0, 2),
        to: correctMove.slice(2, 4)
      });

      if (!correctMoveResult) {
        console.log('❌ Correct move is illegal - puzzle error');
        return res.status(200).json({ 
          explanation: "Puzzle has an error. Try again.",
          method: 'puzzle_error'
        });
      }
      console.log('✅ Correct move is legal');
    } catch (correctMoveError) {
      console.error('❌ Correct move validation failed:', correctMoveError);
      return res.status(200).json({ 
        explanation: "Puzzle validation failed. Try again.",
        method: 'correct_move_error'
      });
    }

    // Simple chess analysis without Stockfish
    const explanation = analyzeMovesSimple(
      positionAfter3Moves,
      gameAfterUser.fen(),
      gameAfterCorrect.fen(),
      userMove,
      correctMove,
      playingAs
    );

    console.log('🎯 Generated explanation:', explanation);

    return res.status(200).json({ 
      explanation,
      method: 'simple_chess_analysis',
      debug: {
        positionValid: true,
        userMoveValid: true,
        correctMoveValid: true
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error in analysis:', error);
    console.error('Error stack:', error.stack);
    
    return res.status(200).json({ 
      explanation: "Analysis encountered an error. Try again.",
      method: 'error_fallback',
      error: error.message
    });
  }
}

// Simple chess analysis function
function analyzeMovesSimple(positionBefore, positionAfterUser, positionAfterCorrect, userMove, correctMove, playingAs) {
  console.log('🔍 Starting simple chess analysis...');
  
  try {
    // 1. Material analysis
    const materialBefore = countMaterial(positionBefore);
    const materialAfterUser = countMaterial(positionAfterUser);
    const materialAfterCorrect = countMaterial(positionAfterCorrect);
    
    const userMaterialChange = materialAfterUser - materialBefore;
    const correctMaterialChange = materialAfterCorrect - materialBefore;
    const materialDifference = correctMaterialChange - userMaterialChange;
    
    console.log('📊 Material analysis:');
    console.log('- Before:', materialBefore);
    console.log('- After user:', materialAfterUser);
    console.log('- After correct:', materialAfterCorrect);
    console.log('- Material difference:', materialDifference);
    
    if (materialDifference > 0) {
      if (materialDifference >= 9) return "This move misses winning the queen. Try again.";
      if (materialDifference >= 5) return "This move misses winning the rook. Try again.";
      if (materialDifference >= 3) return "This move misses winning a minor piece. Try again.";
      if (materialDifference >= 1) return "This move misses winning material. Try again.";
    }

    // 2. Check if user move puts king in check
    const gameAfterUser = new Chess(positionAfterUser);
    if (gameAfterUser.isCheck()) {
      const kingInCheck = gameAfterUser.turn() === (playingAs === 'white' ? 'w' : 'b');
      if (kingInCheck) {
        return "This move puts your king in check. Try again.";
      }
    }

    // 3. Hanging piece detection
    const hangingPiece = detectSimpleHangingPiece(positionBefore, positionAfterUser, userMove);
    if (hangingPiece) {
      return `This move hangs your ${hangingPiece}. Try again.`;
    }

    // 4. Move pattern analysis
    const patternAnalysis = analyzeMovePatterns(userMove, correctMove);
    if (patternAnalysis) {
      return patternAnalysis;
    }

    // 5. Position-based analysis
    const positionalAnalysis = analyzePositionalFactors(userMove, correctMove);
    if (positionalAnalysis) {
      return positionalAnalysis;
    }

    // 6. Default explanation
    return getDefaultExplanation(playingAs);
    
  } catch (analysisError) {
    console.error('Error in simple analysis:', analysisError);
    return getDefaultExplanation(playingAs);
  }
}

// Helper functions
function countMaterial(fen) {
  const pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
  const position = fen.split(' ')[0];
  
  let whiteMaterial = 0, blackMaterial = 0;
  
  for (const char of position) {
    if (char === '/' || /\d/.test(char)) continue;
    
    const piece = char.toLowerCase();
    if (pieceValues[piece] !== undefined) {
      if (char === piece) { // lowercase = black
        blackMaterial += pieceValues[piece];
      } else { // uppercase = white
        whiteMaterial += pieceValues[piece];
      }
    }
  }
  
  return whiteMaterial - blackMaterial; // Positive = white advantage
}

function detectSimpleHangingPiece(positionBefore, positionAfterUser, userMove) {
  try {
    const gameAfter = new Chess(positionAfterUser);
    const toSquare = userMove.slice(2, 4);
    const movedPiece = gameAfter.get(toSquare);
    
    if (!movedPiece) return null;

    // Check if any opponent piece can capture on that square
    const opponentMoves = gameAfter.moves({ verbose: true });
    const canBeCaptured = opponentMoves.some(move => move.to === toSquare);
    
    if (canBeCaptured) {
      const pieceNames = {
        'p': 'pawn', 'n': 'knight', 'b': 'bishop', 
        'r': 'rook', 'q': 'queen', 'k': 'king'
      };
      return pieceNames[movedPiece.type] || 'piece';
    }
    
    return null;
  } catch (error) {
    console.warn('Error in hanging piece detection:', error);
    return null;
  }
}

function analyzeMovePatterns(userMove, correctMove) {
  const userFrom = userMove.slice(0, 2);
  const userTo = userMove.slice(2, 4);
  const correctFrom = correctMove.slice(0, 2);
  const correctTo = correctMove.slice(2, 4);
  
  // Wrong piece
  if (userFrom !== correctFrom) {
    return "This piece doesn't accomplish the goal. Try again.";
  }
  
  // Right piece, wrong destination
  if (userFrom === correctFrom && userTo !== correctTo) {
    // Analyze destination differences
    if (isCenterSquare(correctTo) && !isCenterSquare(userTo)) {
      return "This doesn't centralize your piece effectively. Try again.";
    }
    
    if (isBackRank(correctTo) && !isBackRank(userTo)) {
      return "This doesn't address the back rank. Try again.";
    }
    
    return "Right piece, wrong destination. Try again.";
  }
  
  return null;
}

function analyzePositionalFactors(userMove, correctMove) {
  const userTo = userMove.slice(2, 4);
  const correctTo = correctMove.slice(2, 4);
  
  // Center control
  if (isCenterSquare(correctTo) && isEdgeSquare(userTo)) {
    return "This move goes to the edge instead of controlling the center. Try again.";
  }
  
  return null;
}

function isCenterSquare(square) {
  return ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'].includes(square);
}

function isEdgeSquare(square) {
  const file = square[0];
  const rank = square[1];
  return file === 'a' || file === 'h' || rank === '1' || rank === '8';
}

function isBackRank(square) {
  const rank = square[1];
  return rank === '1' || rank === '8';
}

function getDefaultExplanation(playingAs) {
  const explanations = {
    white: [
      "This doesn't maintain White's advantage. Try again.",
      "This allows Black to equalize. Try again.",
      "This misses White's best continuation. Try again."
    ],
    black: [
      "This doesn't defend against White's threats. Try again.",
      "This allows White to increase pressure. Try again.",
      "This misses Black's best defense. Try again."
    ]
  };
  
  const colorExplanations = explanations[playingAs] || explanations.white;
  return colorExplanations[Math.floor(Math.random() * colorExplanations.length)];
}
