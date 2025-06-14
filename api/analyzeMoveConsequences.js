let Chess;

async function loadChess() {
  if (!Chess) {
    const chessModule = await import('chess.js');
    Chess = chessModule.Chess;
  }
  return Chess;
}

// Export using CommonJS syntax for Vercel compatibility
module.exports = async function handler(req, res) {
  console.log('🎭 === MOVE CONSEQUENCES ANALYSIS ===');
  
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
      explanation: 'This endpoint only accepts POST requests.'
    });
  }

  try {
    console.log('📥 Request received for move consequences');
    console.log('📋 Loading chess.js dynamically...');
    
    // Load chess.js dynamically to avoid ES Module issues
    const ChessClass = await loadChess();
    console.log('✅ Chess.js loaded successfully');

    const { 
      positionAfter3Moves,
      userMove,
      correctMove,
      playingAs,
      depth = 2
    } = req.body;
    
    // Validate required fields
    if (!positionAfter3Moves || !userMove || !correctMove) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields: positionAfter3Moves, userMove, correctMove'
      });
    }

    console.log('📊 Analyzing move consequences...');
    console.log('- Position FEN:', positionAfter3Moves);
    console.log('- User move:', userMove);
    console.log('- Correct move:', correctMove);
    console.log('- Playing as:', playingAs);
    console.log('- Analysis depth:', depth);

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

    // Analyze user move consequences
    const userConsequences = await analyzeMoveDevelopment(
      gameAtPosition, 
      userMove, 
      depth, 
      ChessClass,
      'user'
    );

    // Analyze correct move benefits
    const correctBenefits = await analyzeMoveDevelopment(
      gameAtPosition, 
      correctMove, 
      depth, 
      ChessClass,
      'correct'
    );

    // Generate comparison explanation
    const explanation = generateComparisonExplanation(
      userMove,
      correctMove,
      userConsequences,
      correctBenefits,
      playingAs
    );

    console.log('🎯 Generated move consequences analysis');

    return res.status(200).json({ 
      userConsequences,
      correctBenefits,
      explanation,
      method: 'move_consequences_analysis'
    });

  } catch (error) {
    console.error('❌ Unexpected error in move consequences analysis:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Analysis encountered an error',
      details: error.message
    });
  }
};

// Analyze what happens after a move for several moves
async function analyzeMoveDevelopment(game, move, depth, ChessClass, moveType) {
  console.log(`🔍 Analyzing ${moveType} move development:`, move);
  
  try {
    // Create a copy of the game to avoid mutation
    const gameCopy = new ChessClass(game.fen());
    
    // Make the initial move
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
        error: 'Illegal move'
      };
    }

    const sequence = [move];
    const positions = [gameCopy.fen()];
    let analysis = {
      checksGiven: 0,
      materialWon: 0,
      materialLost: 0,
      kingDanger: false,
      controlsCenter: false
    };

    // Analyze the immediate position
    if (gameCopy.isCheck()) {
      analysis.checksGiven++;
    }

    // Continue the sequence for the specified depth
    for (let i = 1; i < depth && !gameCopy.isGameOver(); i++) {
      const bestResponse = findBestResponse(gameCopy, ChessClass);
      if (!bestResponse) break;

      const responseResult = gameCopy.move(bestResponse);
      if (!responseResult) break;

      sequence.push(bestResponse.from + bestResponse.to);
      positions.push(gameCopy.fen());

      // Update analysis
      if (gameCopy.isCheck()) {
        analysis.checksGiven++;
      }
    }

    // Evaluate final position vs initial
    const finalEvaluation = evaluatePosition(gameCopy, game, ChessClass);
    
    console.log(`✅ ${moveType} move sequence:`, sequence);
    
    return {
      sequence,
      positions,
      finalPosition: gameCopy.fen(),
      isLegal: true,
      analysis: {
        ...analysis,
        ...finalEvaluation
      },
      gameOver: gameCopy.isGameOver(),
      result: gameCopy.isGameOver() ? getGameResult(gameCopy) : null
    };

  } catch (error) {
    console.error(`❌ Error analyzing ${moveType} move:`, error);
    return {
      sequence: [move],
      positions: [],
      finalPosition: game.fen(),
      isLegal: false,
      error: error.message
    };
  }
}

// Find the best response for the opponent
function findBestResponse(game, ChessClass) {
  const legalMoves = game.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  // Prioritize moves based on simple heuristics
  const scoredMoves = legalMoves.map(move => {
    const gameCopy = new ChessClass(game.fen());
    gameCopy.move(move);
    
    let score = 0;
    
    // Prioritize checkmate
    if (gameCopy.isCheckmate()) {
      score += 1000;
    }
    // Then check
    else if (gameCopy.isCheck()) {
      score += 50;
    }
    
    // Prioritize captures
    if (move.captured) {
      const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
      score += (pieceValues[move.captured] || 0) * 10;
    }
    
    // Prioritize attacks on higher value pieces
    if (move.flags.includes('c')) { // capture
      score += 20;
    }
    
    // Avoid hanging pieces (simplified)
    const opponentMoves = gameCopy.moves({ verbose: true });
    const canBeCaptured = opponentMoves.some(oppMove => oppMove.to === move.to);
    if (canBeCaptured) {
      const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
      score -= (pieceValues[move.piece] || 0) * 5;
    }
    
    return { move, score };
  });

  // Sort by score and return the best move
  scoredMoves.sort((a, b) => b.score - a.score);
  return scoredMoves[0].move;
}

// Evaluate position changes
function evaluatePosition(currentGame, originalGame, ChessClass) {
  const evaluation = {
    materialBalance: 0,
    kingSafety: 'safe',
    centerControl: false,
    tacticalThemes: []
  };

  try {
    // Material count comparison
    const currentMaterial = countMaterial(currentGame.fen());
    const originalMaterial = countMaterial(originalGame.fen());
    evaluation.materialBalance = currentMaterial - originalMaterial;

    // Check for king safety
    if (currentGame.isCheck()) {
      evaluation.kingSafety = 'check';
    } else if (currentGame.isCheckmate()) {
      evaluation.kingSafety = 'checkmate';
    }

    // Detect tactical themes
    const lastMove = currentGame.history({ verbose: true }).pop();
    if (lastMove) {
      if (lastMove.flags.includes('#')) {
        evaluation.tacticalThemes.push('checkmate');
      } else if (lastMove.flags.includes('+')) {
        evaluation.tacticalThemes.push('check');
      }
      if (lastMove.captured) {
        evaluation.tacticalThemes.push('capture');
      }
    }

  } catch (error) {
    console.warn('Error evaluating position:', error);
  }

  return evaluation;
}

// Count material for position evaluation
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

// Get game result
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

// Generate explanation comparing user move vs correct move
function generateComparisonExplanation(userMove, correctMove, userConsequences, correctBenefits, playingAs) {
  console.log('📝 Generating comparison explanation...');
  
  try {
    let explanation = '';
    
    // Handle illegal moves
    if (!userConsequences.isLegal) {
      return `The move ${userMove} is illegal. ${correctMove} is the correct move.`;
    }

    // Handle immediate game over situations
    if (correctBenefits.gameOver && correctBenefits.result) {
      explanation = `After ${userMove}, the position continues with complications. However, ${correctMove} leads to immediate ${correctBenefits.result.toLowerCase()}.`;
      return explanation;
    }

    // Compare material consequences
    const userMaterialChange = userConsequences.analysis.materialBalance || 0;
    const correctMaterialChange = correctBenefits.analysis.materialBalance || 0;
    const materialDifference = correctMaterialChange - userMaterialChange;

    if (materialDifference >= 3) {
      explanation = `After ${userMove}, you miss winning significant material. The correct ${correctMove} gains a material advantage.`;
    } else if (userMaterialChange < -2) {
      explanation = `After ${userMove}, you lose material to the opponent's best response. ${correctMove} avoids this loss.`;
    }

    // Check for tactical differences
    const userChecks = userConsequences.analysis.checksGiven || 0;
    const correctChecks = correctBenefits.analysis.checksGiven || 0;
    
    if (correctChecks > userChecks && correctChecks > 0) {
      explanation = `After ${userMove}, you miss the opportunity to give check. ${correctMove} puts immediate pressure on the opponent's king.`;
    }

    // Check for checkmate differences
    if (correctBenefits.analysis.tacticalThemes?.includes('checkmate')) {
      explanation = `After ${userMove}, the opponent can defend. ${correctMove} leads to checkmate.`;
    }

    // Check for hanging pieces
    if (userConsequences.analysis.materialBalance < -1) {
      explanation = `After ${userMove}, your opponent can capture material on the next move. ${correctMove} keeps your pieces safe.`;
    }

    // Fallback to general explanation
    if (!explanation) {
      const userSequenceLength = userConsequences.sequence.length;
      const correctSequenceLength = correctBenefits.sequence.length;
      
      if (correctSequenceLength > userSequenceLength) {
        explanation = `After ${userMove}, the position simplifies quickly. ${correctMove} maintains more dynamic possibilities.`;
      } else {
        explanation = `After ${userMove}, you don't achieve the best outcome. ${correctMove} gives you a better position.`;
      }
    }

    console.log('✅ Generated explanation:', explanation);
    return explanation;

  } catch (error) {
    console.error('❌ Error generating explanation:', error);
    return `After ${userMove}, there are some issues with your position. The correct move is ${correctMove}.`;
  }
}
