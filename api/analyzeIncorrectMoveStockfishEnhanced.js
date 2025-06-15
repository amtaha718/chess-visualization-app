// api/analyzeIncorrectMoveStockfishEnhanced.js - FIXED SYNTAX ERRORS

let Chess;

async function loadChess() {
  if (!Chess) {
    const chessModule = await import('chess.js');
    Chess = chessModule.Chess;
  }
  return Chess;
}

module.exports = async function handler(req, res) {
  console.log('🔍 === ENHANCED STOCKFISH ANALYSIS ===');
  
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
    console.log('📥 Enhanced request received');
    
    const ChessClass = await loadChess();
    console.log('✅ Chess.js loaded successfully');

    const { 
      positionAfter3Moves,
      userMove,
      correctMove,
      playingAs,
      useStockfish = false, // Disabled for now due to WASM issues
      depth = 12
    } = req.body;
    
    // Validate required fields
    if (!positionAfter3Moves || !userMove || !correctMove) {
      console.log('❌ Missing required fields');
      return res.status(200).json({ 
        explanation: "Missing data for analysis. Try again.",
        method: 'validation_error'
      });
    }

    console.log('📊 Enhanced analysis starting...');
    console.log('- Position FEN:', positionAfter3Moves);
    console.log('- User move:', userMove);
    console.log('- Correct move:', correctMove);
    console.log('- Playing as:', playingAs);

    // Validate position
    let gameAtPosition;
    try {
      gameAtPosition = new ChessClass(positionAfter3Moves);
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
      gameAfterUser = new ChessClass(positionAfter3Moves);
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
      gameAfterCorrect = new ChessClass(positionAfter3Moves);
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

    // Enhanced analysis with chess logic (no Stockfish for now)
    const explanation = await analyzeMovesWithEnhancedLogic(
      positionAfter3Moves,
      gameAfterUser.fen(),
      gameAfterCorrect.fen(),
      userMove,
      correctMove,
      playingAs,
      ChessClass
    );

    console.log('🎯 Generated enhanced explanation:', explanation.text);

    return res.status(200).json({ 
      explanation: explanation.text,
      evaluation: explanation.evaluation,
      engineUsed: 'enhanced_logic',
      method: 'enhanced_analysis',
      debug: {
        positionValid: true,
        userMoveValid: true,
        correctMoveValid: true,
        stockfishUsed: false
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error in enhanced analysis:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return res.status(200).json({ 
      explanation: "Enhanced analysis encountered an error. Try again.",
      method: 'error_fallback',
      error: error.message
    });
  }
};

// Enhanced chess analysis without Stockfish dependency
async function analyzeMovesWithEnhancedLogic(positionBefore, positionAfterUser, positionAfterCorrect, userMove, correctMove, playingAs, ChessClass) {
  console.log('🔍 Starting enhanced analysis with chess logic...');
  
  try {
    // Create game instances for analysis
    const gameAfterCorrect = new ChessClass(positionAfterCorrect);
    const gameAfterUser = new ChessClass(positionAfterUser);
    
    // 1. CHECKMATE DETECTION (Highest Priority)
    console.log('🔍 Checking for checkmate...');
    try {
      if (gameAfterCorrect.isCheckmate && typeof gameAfterCorrect.isCheckmate === 'function') {
        const isCheckmate = gameAfterCorrect.isCheckmate();
        console.log('♔ Checkmate check result:', isCheckmate);
        if (isCheckmate) {
          console.log('🎯 CHECKMATE DETECTED: Correct move leads to checkmate');
          return {
            text: "This move misses checkmate! Look for a forcing move. Try again.",
            evaluation: { tactical: 'missed_checkmate' }
          };
        }
      }
      
      // Also check if the correct move leads to a position where opponent is in check with no legal moves
      if (gameAfterCorrect.isCheck && typeof gameAfterCorrect.isCheck === 'function') {
        const inCheck = gameAfterCorrect.isCheck();
        if (inCheck && gameAfterCorrect.moves && typeof gameAfterCorrect.moves === 'function') {
          const legalMoves = gameAfterCorrect.moves();
          console.log('♔ Position after correct move: inCheck =', inCheck, ', legal moves =', legalMoves.length);
          if (legalMoves.length === 0) {
            console.log('🎯 CHECKMATE DETECTED: No legal moves available');
            return {
              text: "This move misses checkmate! Look for a forcing move. Try again.",
              evaluation: { tactical: 'missed_checkmate' }
            };
          }
        }
      }
    } catch (checkmateError) {
      console.warn('Checkmate detection failed:', checkmateError);
    }
    
    // 2. CHECK DETECTION
    console.log('🔍 Checking for check...');
    try {
      if (gameAfterCorrect.isCheck && typeof gameAfterCorrect.isCheck === 'function') {
        const correctGivesCheck = gameAfterCorrect.isCheck();
        const userGivesCheck = gameAfterUser.isCheck && typeof gameAfterUser.isCheck === 'function' ? gameAfterUser.isCheck() : false;
        
        console.log('♔ Check analysis:', { correctGivesCheck, userGivesCheck });
        
        if (correctGivesCheck && !userGivesCheck) {
          console.log('🎯 CHECK DETECTED: Correct move gives check, user move doesn\'t');
          return {
            text: "This move misses a powerful check. Try again.",
            evaluation: { tactical: 'missed_check' }
          };
        }
      }
    } catch (checkError) {
      console.warn('Check detection failed:', checkError);
    }
    
    // 3. MATERIAL ANALYSIS
    const materialBefore = countMaterial(positionBefore);
    const materialAfterUser = countMaterial(positionAfterUser);
    const materialAfterCorrect = countMaterial(positionAfterCorrect);
    
    console.log('📊 Material analysis:');
    console.log('- Before:', materialBefore);
    console.log('- After user:', materialAfterUser);
    console.log('- After correct:', materialAfterCorrect);
    
    // Calculate material difference correctly for both colors
    let materialAdvantage;
    if (playingAs === 'white') {
      // For white, positive = white advantage
      const userAdvantage = materialAfterUser;
      const correctAdvantage = materialAfterCorrect;
      materialAdvantage = correctAdvantage - userAdvantage;
    } else {
      // For black, negative = black advantage (black wants to reduce white's material)
      const userAdvantage = materialAfterUser;
      const correctAdvantage = materialAfterCorrect;
      materialAdvantage = userAdvantage - correctAdvantage; // Flip for black
    }
    
    console.log('- Material advantage difference:', materialAdvantage);
    
    if (materialAdvantage >= 9) return {
      text: "This move misses winning the queen. Try again.",
      evaluation: { material: materialAdvantage }
    };
    if (materialAdvantage >= 5) return {
      text: "This move misses winning the rook. Try again.",
      evaluation: { material: materialAdvantage }
    };
    if (materialAdvantage >= 3) return {
      text: "This move misses winning a minor piece. Try again.",
      evaluation: { material: materialAdvantage }
    };
    if (materialAdvantage >= 1) return {
      text: "This move misses winning material. Try again.",
      evaluation: { material: materialAdvantage }
    };

    // 4. HANGING PIECE DETECTION
    console.log('🔍 Checking for hanging pieces...');
    const hangingPiece = detectHangingPiece(positionBefore, positionAfterUser, userMove, ChessClass);
    if (hangingPiece) {
      console.log('⚠️ HANGING PIECE DETECTED:', hangingPiece);
      return {
        text: `This move hangs your ${hangingPiece}. Try again.`,
        evaluation: { tactical: 'hanging_piece', piece: hangingPiece }
      };
    }

    // 5. CHECK EVASION (if user puts own king in check)
    try {
      if (gameAfterUser.isCheck && typeof gameAfterUser.isCheck === 'function') {
        const inCheck = gameAfterUser.isCheck();
        if (inCheck) {
          // Check if it's the user's turn (meaning they put their own king in check)
          const turn = gameAfterUser.turn();
          const userColor = playingAs === 'white' ? 'w' : 'b';
          if (turn === userColor) {
            console.log('♔ USER IN CHECK: Move puts own king in check');
            return {
              text: "This move puts your king in check. Try again.",
              evaluation: { tactical: 'self_check' }
            };
          }
        }
      }
    } catch (checkEvasionError) {
      console.warn('Check evasion detection failed:', checkEvasionError);
    }

    // 6. MOVE PATTERN ANALYSIS
    const patternAnalysis = analyzeMovePatterns(userMove, correctMove);
    if (patternAnalysis) {
      console.log('🎯 PATTERN ANALYSIS:', patternAnalysis);
      return {
        text: patternAnalysis,
        evaluation: { pattern: 'move_pattern_error' }
      };
    }

    // 7. POSITIONAL ANALYSIS
    const positionalAnalysis = analyzePositionalFactors(userMove, correctMove);
    if (positionalAnalysis) {
      console.log('🏰 POSITIONAL ANALYSIS:', positionalAnalysis);
      return {
        text: positionalAnalysis,
        evaluation: { positional: 'positional_error' }
      };
    }

    // 8. DEFAULT EXPLANATION
    console.log('🔄 Using default enhanced explanation');
    return {
      text: getDefaultExplanation(playingAs),
      evaluation: { method: 'default' }
    };
    
  } catch (analysisError) {
    console.error('Error in enhanced analysis:', analysisError);
    return {
      text: getDefaultExplanation(playingAs),
      evaluation: { error: analysisError.message }
    };
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

function detectHangingPiece(positionBefore, positionAfterUser, userMove, ChessClass) {
  try {
    const gameAfter = new ChessClass(positionAfterUser);
    const toSquare = userMove.slice(2, 4);
    const movedPiece = gameAfter.get(toSquare);
    
    if (!movedPiece) return null;

    // Check if any opponent piece can capture on that square
    if (gameAfter.moves && typeof gameAfter.moves === 'function') {
      const opponentMoves = gameAfter.moves({ verbose: true });
      if (opponentMoves && Array.isArray(opponentMoves)) {
        const canBeCaptured = opponentMoves.some(move => move.to === toSquare);
        
        if (canBeCaptured) {
          const pieceNames = {
            'p': 'pawn', 'n': 'knight', 'b': 'bishop', 
            'r': 'rook', 'q': 'queen', 'k': 'king'
          };
          return pieceNames[movedPiece.type] || 'piece';
        }
      }
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
