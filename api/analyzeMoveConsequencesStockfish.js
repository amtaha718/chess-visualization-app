// api/analyzeMoveConsequencesStockfish.js - Clean version without Stockfish dependencies

let Chess;

async function loadChess() {
  if (!Chess) {
    const chessModule = await import('chess.js');
    Chess = chessModule.Chess;
  }
  return Chess;
}

module.exports = async function handler(req, res) {
  console.log('🎭 === ENHANCED MOVE CONSEQUENCES (HEURISTIC) ===');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method Not Allowed'
    });
  }

  try {
    console.log('📥 Request received for enhanced move consequences');
    
    const ChessClass = await loadChess();
    console.log('✅ Chess.js loaded successfully');

    const { 
      positionAfter3Moves,
      userMove,
      correctMove,
      playingAs = 'white',
      depth = 3
    } = req.body;
    
    if (!positionAfter3Moves || !userMove || !correctMove) {
      return res.status(400).json({ 
        error: 'Missing required fields: positionAfter3Moves, userMove, correctMove'
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
        details: fenError.message
      });
    }

    // Analyze both moves using enhanced heuristics
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
        materialDifference: (correctAnalysis.evaluation || 0) - (userAnalysis.evaluation || 0),
        tacticsMissed: (correctAnalysis.analysis?.tacticalThemes?.length || 0) - (userAnalysis.analysis?.tacticalThemes?.length || 0)
      },
      method: 'enhanced_heuristic_analysis',
      engineUsed: 'enhanced_heuristic'
    });

  } catch (error) {
    console.error('❌ Unexpected error in enhanced analysis:', error);
    
    return res.status(500).json({ 
      error: 'Enhanced analysis encountered an error',
      details: error.message,
      userConsequences: null,
      correctBenefits: null,
      explanation: 'Enhanced analysis temporarily unavailable.',
      engineUsed: 'error'
    });
  }
};

// Enhanced move analysis using advanced heuristics
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
      initialEvaluation: evaluatePosition(gameCopy),
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

    // Final position evaluation
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
      evaluation: analysis.materialBalance + (analysis.checksGiven * 0.5)
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
    
    // Bonus for central moves
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    if (centerSquares.includes(move.to)) {
      score += 50;
    }
    
    // Avoid hanging pieces (simplified check)
    const nextMoves = gameCopy.moves({ verbose: true });
    const isHanging = nextMoves.some(nextMove => nextMove.to === move.to);
    if (isHanging) {
      const pieceValues = { p: 100, n: 300, b: 300, r: 500, q: 900 };
      score -= (pieceValues[move.piece] || 0) * 0.8;
    }
    
    // Add some randomness to avoid repetitive play
    score += Math.random() * 10;
    
    return { move, score };
  });

  scoredMoves.sort((a, b) => b.score - a.score);
  return scoredMoves[0].move;
}

// Enhanced position evaluation
function evaluatePosition(game) {
  try {
    if (game.isCheckmate()) return game.turn() === 'w' ? -1000 : 1000;
    if (game.isCheck()) return game.turn() === 'w' ? -50 : 50;
    if (game.isDraw()) return 0;
    
    // Basic material count
    const material = countMaterial(game.fen());
    return material;
  } catch (error) {
    return 0;
  }
}

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
      }
    }

    // Center control analysis
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
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
    const userThemes = userAnalysis.analysis?.tacticalThemes || [];
    const correctThemes = correctAnalysis.analysis?.tacticalThemes || [];
    
    if (correctThemes.includes('checkmate')) {
      return `After ${userMove}, the opponent escapes. ${correctMove} leads to forced checkmate.`;
    }
    
    if (correctThemes.includes('check') && !userThemes.includes('check')) {
      return `After ${userMove}, you miss putting pressure on the opponent's king. ${correctMove} gives check and maintains the initiative.`;
    }

    // Material analysis
    const userMaterial = userAnalysis.analysis?.materialBalance || 0;
    const correctMaterial = correctAnalysis.analysis?.materialBalance || 0;
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
