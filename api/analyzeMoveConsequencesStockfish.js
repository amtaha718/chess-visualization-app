// api/analyzeMoveConsequencesStockfish.js - FIXED VERSION with proper error handling

let Chess;

async function loadChess() {
  if (!Chess) {
    try {
      const chessModule = await import('chess.js');
      Chess = chessModule.Chess;
      console.log('✅ Chess.js loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load Chess.js:', error);
      throw new Error('Chess.js module loading failed');
    }
  }
  return Chess;
}

// Enhanced move analysis using heuristic approach (Stockfish fallback)
async function analyzeMoveDevelopmentEnhanced(game, move, depth, ChessClass, moveType) {
  console.log(`🔍 Enhanced ${moveType} move analysis:`, move);
  
  try {
    const gameCopy = new ChessClass(game.fen());
    
    const initialMoveResult = gameCopy.move({
      from: move.slice(0, 2),
      to: move.slice(2, 4)
    });

    if (!initialMoveResult) {
      console.log(`❌ ${moveType} move is illegal:`, move);
      return {
        sequence: [],
        finalPosition: game.fen(),
        isLegal: false,
        error: 'Illegal move',
        evaluation: null,
        analysis: {
          materialBalance: 0,
          checksGiven: 0,
          tacticalThemes: ['illegal_move']
        }
      };
    }

    const sequence = [move];
    const positions = [gameCopy.fen()];
    
    let analysis = {
      checksGiven: 0,
      materialWon: 0,
      materialLost: 0,
      kingDanger: false,
      controlsCenter: false,
      initialEvaluation: null, // Placeholder for future Stockfish integration
      tacticalThemes: [],
      materialBalance: 0
    };

    // Analyze the immediate position
    if (gameCopy.isCheck()) {
      analysis.checksGiven++;
      analysis.tacticalThemes.push('check');
    }

    if (gameCopy.isCheckmate()) {
      analysis.tacticalThemes.push('checkmate');
    }

    // Generate continuation sequence using enhanced heuristics
    for (let i = 1; i < depth && !gameCopy.isGameOver(); i++) {
      const bestResponse = findBestResponseHeuristic(gameCopy, ChessClass);
      
      if (!bestResponse) break;

      const responseResult = gameCopy.move(bestResponse);
      if (!responseResult) break;

      sequence.push(bestResponse.from + bestResponse.to);
      positions.push(gameCopy.fen());

      if (gameCopy.isCheck()) {
        analysis.checksGiven++;
      }
    }

    // Enhanced position evaluation
    const finalEvaluation = evaluatePositionEnhanced(gameCopy, game, ChessClass);
    analysis = { ...analysis, ...finalEvaluation };

    console.log(`✅ ${moveType} enhanced sequence:`, sequence);
    
    return {
      sequence,
      positions,
      finalPosition: gameCopy.fen(),
      isLegal: true,
      analysis,
      gameOver: gameCopy.isGameOver(),
      result: gameCopy.isGameOver() ? getGameResult(gameCopy) : null,
      evaluation: analysis.materialBalance,
      engineUsed: 'enhanced_heuristic' // Indicate this is enhanced heuristic analysis
    };

  } catch (error) {
    console.error(`❌ Error in enhanced ${moveType} analysis:`, error);
    return {
      sequence: [move],
      positions: [],
      finalPosition: game.fen(),
      isLegal: false,
      error: error.message,
      evaluation: null,
      analysis: {
        materialBalance: 0,
        checksGiven: 0,
        tacticalThemes: ['analysis_error']
      }
    };
  }
}

// Enhanced heuristic best response finder
function findBestResponseHeuristic(game, ChessClass) {
  const legalMoves = game.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  const scoredMoves = legalMoves.map(move => {
    const gameCopy = new ChessClass(game.fen());
    gameCopy.move(move);
    
    let score = 0;
    
    // Prioritize checkmate
    if (gameCopy.isCheckmate()) {
      score += 10000;
    } else if (gameCopy.isCheck()) {
      score += 500;
    }
    
    // Prioritize captures by piece value
    if (move.captured) {
      const pieceValues = { p: 100, n: 300, b: 300, r: 500, q: 900 };
      score += (pieceValues[move.captured] || 0);
    }
    
    // Bonus for attacking valuable pieces
    const attackedSquares = getAttackedSquares(gameCopy);
    const opponentPieces = gameCopy.board().flat().filter(piece => 
      piece && piece.color !== game.turn()
    );
    
    opponentPieces.forEach(piece => {
      if (attackedSquares.includes(piece.square)) {
        const pieceValues = { p: 50, n: 150, b: 150, r: 250, q: 450 };
        score += (pieceValues[piece.type] || 0);
      }
    });
    
    // Avoid hanging pieces
    const nextMoves = gameCopy.moves({ verbose: true });
    const isHanging = nextMoves.some(nextMove => nextMove.to === move.to);
    if (isHanging) {
      const pieceValues = { p: 100, n: 300, b: 300, r: 500, q: 900 };
      score -= (pieceValues[move.piece] || 0) * 0.8;
    }
    
    // Center control bonus
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    if (centerSquares.includes(move.to)) {
      score += 20;
    }
    
    // Add some randomness to avoid repetitive play
    score += Math.random() * 10;
    
    return { move, score };
  });

  scoredMoves.sort((a, b) => b.score - a.score);
  return scoredMoves[0].move;
}

// Helper function to get attacked squares (simplified)
function getAttackedSquares(game) {
  const moves = game.moves({ verbose: true });
  return [...new Set(moves.map(move => move.to))];
}

// Enhanced position evaluation
function evaluatePositionEnhanced(currentGame, originalGame, ChessClass) {
  const evaluation = {
    materialBalance: 0,
    kingSafety: 'safe',
    centerControl: false,
    tacticalThemes: [],
    pieceActivity: 0
  };

  try {
    // Material count comparison
    const currentMaterial = countMaterial(currentGame.fen());
    const originalMaterial = countMaterial(originalGame.fen());
    evaluation.materialBalance = currentMaterial - originalMaterial;

    // King safety analysis
    if (currentGame.isCheckmate()) {
      evaluation.kingSafety = 'checkmate';
      evaluation.tacticalThemes.push('checkmate');
    } else if (currentGame.isCheck()) {
      evaluation.kingSafety = 'check';
      evaluation.tacticalThemes.push('check');
    }

    // Detect tactical themes from last move
    const history = currentGame.history({ verbose: true });
    if (history.length > 0) {
      const lastMove = history[history.length - 1];
      
      if (lastMove.flags.includes('#')) {
        evaluation.tacticalThemes.push('checkmate');
      } else if (lastMove.flags.includes('+')) {
        evaluation.tacticalThemes.push('check');
      }
      
      if (lastMove.captured) {
        evaluation.tacticalThemes.push('capture');
        
        // Check if it's a sacrifice
        const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
        const capturedValue = pieceValues[lastMove.captured] || 0;
        const capturingValue = pieceValues[lastMove.piece] || 0;
        
        if (capturingValue > capturedValue) {
          evaluation.tacticalThemes.push('sacrifice');
        }
      }
    }

    // Center control analysis
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    const board = currentGame.board();
    let centerPieces = 0;
    
    centerSquares.forEach(square => {
      const piece = currentGame.get(square);
      if (piece) centerPieces++;
    });
    
    evaluation.centerControl = centerPieces > 0;

  } catch (error) {
    console.warn('Error in enhanced position evaluation:', error);
  }

  return evaluation;
}

// Material counting
function countMaterial(fen) {
  const pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
  const position = fen.split(' ')[0];
  
  let whiteMaterial = 0, blackMaterial = 0;
  
  for (const char of position) {
    if (char === '/' || /\d/.test(char)) continue;
    
    const piece = char.toLowerCase();
    if (pieceValues[piece] !== undefined) {
      if (char === piece) {
        blackMaterial += pieceValues[piece];
      } else {
        whiteMaterial += pieceValues[piece];
      }
    }
  }
  
  return whiteMaterial - blackMaterial;
}

// Game result detection
function getGameResult(game) {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? 'Black wins by checkmate' : 'White wins by checkmate';
  } else if (game.isDraw()) {
    return 'Draw';
  } else if (game.isStalemate()) {
    return 'Stalemate';
  }
  return null;
}

// Generate enhanced explanation
function generateEnhancedExplanation(userMove, correctMove, userAnalysis, correctAnalysis, playingAs) {
  console.log('📝 Generating enhanced explanation...');
  
  try {
    if (!userAnalysis.isLegal) {
      return `The move ${userMove} is illegal. ${correctMove} is the correct move.`;
    }

    // Handle immediate game over situations
    if (correctAnalysis.gameOver && correctAnalysis.result) {
      if (correctAnalysis.result.includes('checkmate')) {
        return `After ${userMove}, you miss immediate checkmate! ${correctMove} delivers mate in one.`;
      }
      return `After ${userMove}, the position continues with complications. However, ${correctMove} leads to ${correctAnalysis.result.toLowerCase()}.`;
    }

    // Tactical theme analysis
    const userThemes = userAnalysis.analysis.tacticalThemes || [];
    const correctThemes = correctAnalysis.analysis.tacticalThemes || [];
    
    if (correctThemes.includes('checkmate')) {
      return `After ${userMove}, the opponent escapes. ${correctMove} leads to forced checkmate.`;
    }
    
    if (correctThemes.includes('check') && !userThemes.includes('check')) {
      return `After ${userMove}, you miss putting pressure on the opponent's king. ${correctMove} gives check and maintains the initiative.`;
    }

    // Material analysis
    const userMaterial = userAnalysis.analysis.materialBalance || 0;
    const correctMaterial = correctAnalysis.analysis.materialBalance || 0;
    const materialDiff = correctMaterial - userMaterial;

    if (materialDiff >= 3) {
      return `After ${userMove}, you miss winning significant material. ${correctMove} gains a material advantage.`;
    } else if (userMaterial < -2) {
      return `After ${userMove}, you lose material to the opponent's best response. ${correctMove} avoids this loss.`;
    }

    // Default explanation
    const userSeqLength = userAnalysis.sequence.length;
    const correctSeqLength = correctAnalysis.sequence.length;
    
    if (correctSeqLength > userSeqLength) {
      return `After ${userMove}, the position simplifies quickly. ${correctMove} maintains more dynamic possibilities.`;
    }
    
    return `After ${userMove}, your position is less favorable. ${correctMove} gives you better practical chances.`;

  } catch (error) {
    console.error('❌ Error generating enhanced explanation:', error);
    return `After ${userMove}, there are complications. The correct move is ${correctMove}.`;
  }
}

// Main handler function with comprehensive error handling
module.exports = async function handler(req, res) {
  console.log('🎭 === ENHANCED MOVE CONSEQUENCES (HEURISTIC APPROACH) ===');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    console.error('❌ Method not allowed:', req.method);
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      userConsequences: null,
      correctBenefits: null,
      explanation: 'Enhanced analysis temporarily unavailable.',
      engineUsed: 'error'
    });
  }

  try {
    console.log('📥 Request received for enhanced move consequences');
    
    // Load Chess.js with error handling
    const ChessClass = await loadChess();

    const { 
      positionAfter3Moves,
      userMove,
      correctMove,
      playingAs = 'white',
      depth = 3
    } = req.body;
    
    // Validate required fields
    if (!positionAfter3Moves || !userMove || !correctMove) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields: positionAfter3Moves, userMove, correctMove',
        userConsequences: null,
        correctBenefits: null,
        explanation: 'Missing required data for analysis.',
        engineUsed: 'error'
      });
    }

    console.log('📊 Analyzing enhanced move consequences...');
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
      return res.status(400).json({ 
        error: 'Invalid FEN position',
        details: fenError.message,
        userConsequences: null,
        correctBenefits: null,
        explanation: 'Position validation failed.',
        engineUsed: 'error'
      });
    }

    // Analyze both moves in parallel with enhanced heuristics
    const [userAnalysis, correctAnalysis] = await Promise.all([
      analyzeMoveDevelopmentEnhanced(
        gameAtPosition, 
        userMove, 
        depth, 
        ChessClass,
        'user'
      ),
      analyzeMoveDevelopmentEnhanced(
        gameAtPosition, 
        correctMove, 
        depth, 
        ChessClass,
        'correct'
      )
    ]);

    // Generate enhanced comparison explanation
    const explanation = generateEnhancedExplanation(
      userMove,
      correctMove,
      userAnalysis,
      correctAnalysis,
      playingAs
    );

    console.log('🎯 Generated enhanced move consequences analysis');
    console.log('- User sequence length:', userAnalysis.sequence.length);
    console.log('- Correct sequence length:', correctAnalysis.sequence.length);
    console.log('- Engine used: enhanced_heuristic');

    return res.status(200).json({ 
      userConsequences: {
        ...userAnalysis,
        isEnhanced: true,
        engineUsed: 'enhanced_heuristic'
      },
      correctBenefits: {
        ...correctAnalysis,
        isEnhanced: true,
        engineUsed: 'enhanced_heuristic'
      },
      explanation,
      comparison: {
        materialDifference: correctAnalysis.evaluation - userAnalysis.evaluation,
        tacticsMissed: correctAnalysis.analysis.tacticalThemes.length - userAnalysis.analysis.tacticalThemes.length
      },
      method: 'enhanced_heuristic_analysis',
      engineUsed: 'enhanced_heuristic'
    });

  } catch (error) {
    console.error('❌ Unexpected error in enhanced analysis:', error);
    console.error('Error stack:', error.stack);
    
    // Return a structured error response that the frontend can handle
    return res.status(500).json({ 
      error: 'Enhanced analysis encountered an error',
      details: error.message,
      userConsequences: null,
      correctBenefits: null,
      explanation: 'Enhanced analysis temporarily unavailable. Please try the next puzzle.',
      engineUsed: 'error',
      fallback: true
    });
  }
};
