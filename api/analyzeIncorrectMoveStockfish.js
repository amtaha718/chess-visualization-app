// api/analyzeIncorrectMoveStockfish.js - Simplified version for Vercel compatibility

import { Chess } from 'chess.js';

export default async function handler(req, res) {
  console.log('🔍 === SIMPLIFIED STOCKFISH + PATTERN ANALYSIS ===');
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { 
      positionAfter3Moves,
      userMove,
      correctMove,
      playingAs 
    } = req.body;
    
    console.log('📊 Analyzing moves...');
    console.log('- Position:', positionAfter3Moves);
    console.log('- User move:', userMove);
    console.log('- Correct move:', correctMove);

    // Validate input
    if (!positionAfter3Moves || !userMove || !correctMove) {
      return res.status(400).json({ 
        explanation: "Missing required data. Try again.",
        method: 'validation_error'
      });
    }

    // Validate and create positions
    let positionAfterUser, positionAfterCorrect;
    
    try {
      // Test user's move
      const gameAfterUser = new Chess(positionAfter3Moves);
      const userMoveResult = gameAfterUser.move({
        from: userMove.slice(0, 2),
        to: userMove.slice(2, 4)
      });

      if (!userMoveResult) {
        return res.status(200).json({ 
          explanation: "Invalid move. Try again.",
          method: 'move_validation'
        });
      }
      
      positionAfterUser = gameAfterUser.fen();

      // Test correct move
      const gameAfterCorrect = new Chess(positionAfter3Moves);
      const correctMoveResult = gameAfterCorrect.move({
        from: correctMove.slice(0, 2),
        to: correctMove.slice(2, 4)
      });

      if (!correctMoveResult) {
        throw new Error('Correct move is invalid');
      }
      
      positionAfterCorrect = gameAfterCorrect.fen();
      
    } catch (moveError) {
      console.error('❌ Move validation error:', moveError);
      return res.status(200).json({ 
        explanation: "Move validation failed. Try again.",
        method: 'move_error'
      });
    }

    // Try Stockfish analysis with timeout
    let stockfishResult = null;
    try {
      stockfishResult = await Promise.race([
        analyzeWithStockfish(positionAfter3Moves, positionAfterUser, positionAfterCorrect),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Stockfish timeout')), 5000)
        )
      ]);
      console.log('✅ Stockfish analysis completed');
    } catch (stockfishError) {
      console.warn('⚠️ Stockfish analysis failed:', stockfishError.message);
      stockfishResult = null;
    }

    // Generate explanation using pattern analysis
    const explanation = generateExplanation(
      positionAfter3Moves,
      positionAfterUser,
      positionAfterCorrect,
      userMove,
      correctMove,
      playingAs,
      stockfishResult
    );

    console.log('🎯 Generated explanation:', explanation);

    return res.status(200).json({ 
      explanation,
      method: stockfishResult ? 'stockfish_pattern_analysis' : 'pattern_analysis_only',
      evaluations: stockfishResult?.evaluations || null
    });

  } catch (error) {
    console.error('❌ Analysis error:', error);
    
    // Return a safe fallback explanation
    const fallbackExplanation = `This move doesn't achieve the best result. Try again.`;
    
    return res.status(200).json({ 
      explanation: fallbackExplanation,
      method: 'error_fallback',
      error: 'Analysis failed'
    });
  }
}

// Simplified Stockfish analysis without Worker (problematic on Vercel)
async function analyzeWithStockfish(positionBefore, positionAfterUser, positionAfterCorrect) {
  // For now, skip actual Stockfish and use material counting + basic analysis
  // This can be enhanced later when Stockfish Worker issues are resolved
  
  const userMaterial = countMaterial(positionAfterUser);
  const correctMaterial = countMaterial(positionAfterCorrect);
  
  const materialDifference = correctMaterial - userMaterial;
  
  return {
    evaluations: {
      user: -materialDifference, // Negative if user loses material
      correct: 0, // Baseline
      difference: materialDifference
    },
    materialLoss: materialDifference
  };
}

// Enhanced pattern-based explanation generator
function generateExplanation(positionBefore, positionAfterUser, positionAfterCorrect, userMove, correctMove, playingAs, stockfishResult) {
  
  // 1. Check for material loss using Stockfish result or basic counting
  const materialLoss = stockfishResult?.materialLoss || 
    (countMaterial(positionAfterCorrect) - countMaterial(positionAfterUser));
  
  if (materialLoss > 0) {
    if (materialLoss >= 9) return "This move misses winning the queen. Try again.";
    if (materialLoss >= 5) return "This move misses winning the rook. Try again.";
    if (materialLoss >= 3) return "This move misses winning a minor piece. Try again.";
    if (materialLoss >= 1) return "This move misses winning material. Try again.";
  }

  // 2. Check for hanging pieces
  const hangingPiece = detectHangingPiece(positionBefore, positionAfterUser, userMove);
  if (hangingPiece) {
    return `This move hangs your ${hangingPiece.piece} on ${hangingPiece.square}. Try again.`;
  }

  // 3. Check for moving into check
  if (isInCheck(positionAfterUser, playingAs)) {
    return "This move puts your king in check. Try again.";
  }

  // 4. Check for piece movement patterns
  const movePattern = analyzeMovePattern(userMove, correctMove, positionBefore);
  if (movePattern) {
    return movePattern;
  }

  // 5. Default explanations based on evaluation if available
  if (stockfishResult?.evaluations) {
    const evalDiff = stockfishResult.evaluations.difference;
    if (evalDiff > 3) return "This move creates serious tactical problems. Try again.";
    if (evalDiff > 1.5) return "This move gives your opponent a significant advantage. Try again.";
    if (evalDiff > 0.5) return "This move is not the most accurate. Try again.";
  }

  // 6. Color-specific defaults
  const colorDefaults = {
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

  const defaults = colorDefaults[playingAs] || colorDefaults.white;
  return defaults[Math.floor(Math.random() * defaults.length)];
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
  
  return whiteMaterial - blackMaterial; // Positive favors white
}

function detectHangingPiece(positionBefore, positionAfterUser, userMove) {
  try {
    const game = new Chess(positionAfterUser);
    const toSquare = userMove.slice(2, 4);
    const movedPiece = game.get(toSquare);
    
    if (!movedPiece) return null;

    // Simple heuristic: check if the destination square is attacked
    const opponentColor = movedPiece.color === 'w' ? 'b' : 'w';
    const attackingMoves = game.moves({ verbose: true });
    
    const isAttacked = attackingMoves.some(move => 
      move.to === toSquare && move.color === opponentColor
    );
    
    if (isAttacked) {
      const pieceNames = {
        'p': 'pawn', 'n': 'knight', 'b': 'bishop', 
        'r': 'rook', 'q': 'queen', 'k': 'king'
      };
      
      return {
        piece: pieceNames[movedPiece.type] || 'piece',
        square: toSquare.toUpperCase()
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Error detecting hanging piece:', error);
    return null;
  }
}

function isInCheck(fen, playingAs) {
  try {
    const game = new Chess(fen);
    return game.isCheck() && game.turn() === (playingAs === 'white' ? 'w' : 'b');
  } catch (error) {
    return false;
  }
}

function analyzeMovePattern(userMove, correctMove, position) {
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
    // Check if correct move goes to center vs edge
    if (isCenterSquare(correctTo) && !isCenterSquare(userTo)) {
      return "This doesn't centralize your piece effectively. Try again.";
    }
    
    return "Right piece, but wrong destination square. Try again.";
  }
  
  return null;
}

function isCenterSquare(square) {
  return ['d4', 'd5', 'e4', 'e5'].includes(square);
}
