// api/analyzeMoveConsequencesStockfish.js - Enhanced with Stockfish integration

let Chess;

async function loadChess() {
  if (!Chess) {
    const chessModule = await import('chess.js');
    Chess = chessModule.Chess;
  }
  return Chess;
}

// Stockfish integration for server-side analysis
class StockfishEngine {
  constructor() {
    this.stockfish = null;
    this.isReady = false;
  }

  async initialize() {
    if (this.isReady) return;
    
    try {
      // Use the lite version you provided
      const stockfishPath = './stockfish-17-lite-single.js';
      const Stockfish = require(stockfishPath);
      
      this.stockfish = new Stockfish();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Stockfish initialization timeout'));
        }, 10000);

        this.stockfish.addListener((line) => {
          console.log('SF:', line);
          if (line === 'uciok') {
            clearTimeout(timeout);
            this.isReady = true;
            resolve();
          }
        });

        this.stockfish.postMessage('uci');
      });
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
      throw error;
    }
  }

  async evaluatePosition(fen, depth = 12) {
    if (!this.isReady) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      let bestMove = null;
      let evaluation = null;
      let principalVariation = [];
      let depth_reached = 0;

      const timeout = setTimeout(() => {
        reject(new Error('Stockfish evaluation timeout'));
      }, 15000);

      const listener = (line) => {
        console.log('SF eval:', line);

        if (line.startsWith('info') && line.includes('score')) {
          const depthMatch = line.match(/depth (\d+)/);
          if (depthMatch) {
            depth_reached = parseInt(depthMatch[1]);
          }

          const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
          if (scoreMatch) {
            const [, type, value] = scoreMatch;
            evaluation = type === 'mate' ? 
              (parseInt(value) > 0 ? 9999 : -9999) : 
              parseInt(value) / 100;
          }

          const pvMatch = line.match(/pv (.+)/);
          if (pvMatch) {
            principalVariation = pvMatch[1].split(' ').slice(0, 5); // First 5 moves
          }
        }

        if (line.startsWith('bestmove')) {
          const moveMatch = line.match(/bestmove (\w+)/);
          if (moveMatch) {
            bestMove = moveMatch[1];
          }
          
          clearTimeout(timeout);
          this.stockfish.removeListener(listener);
          
          resolve({
            bestMove,
            evaluation,
            principalVariation,
            depth: depth_reached
          });
        }
      };

      this.stockfish.addListener(listener);
      
      this.stockfish.postMessage('ucinewgame');
      this.stockfish.postMessage(`position fen ${fen}`);
      this.stockfish.postMessage(`go depth ${depth}`);
    });
  }

  terminate() {
    if (this.stockfish) {
      this.stockfish.terminate();
      this.stockfish = null;
      this.isReady = false;
    }
  }
}

// Global Stockfish instance
let globalStockfish = null;

module.exports = async function handler(req, res) {
  console.log('🎭 === ENHANCED MOVE CONSEQUENCES WITH STOCKFISH ===');
  
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
      playingAs,
      depth = 3,
      useStockfish = true
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
    console.log('- Use Stockfish:', useStockfish);

    // Initialize Stockfish if needed
    if (useStockfish && !globalStockfish) {
      try {
        globalStockfish = new StockfishEngine();
        await globalStockfish.initialize();
        console.log('🐟 Stockfish initialized successfully');
      } catch (error) {
        console.warn('⚠️ Stockfish initialization failed, falling back to heuristic analysis');
        useStockfish = false;
      }
    }

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

    // Analyze both moves in parallel
    const [userAnalysis, correctAnalysis] = await Promise.all([
      analyzeMoveDevelopmentEnhanced(
        gameAtPosition, 
        userMove, 
        depth, 
        ChessClass,
        'user',
        useStockfish ? globalStockfish : null
      ),
      analyzeMoveDevelopmentEnhanced(
        gameAtPosition, 
        correctMove, 
        depth, 
        ChessClass,
        'correct',
        useStockfish ? globalStockfish : null
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
      userConsequences: userAnalysis,
      correctBenefits: correctAnalysis,
      explanation,
      method: 'enhanced_stockfish_analysis',
      engineUsed: useStockfish ? 'stockfish' : 'heuristic'
    });

  } catch (error) {
    console.error('❌ Unexpected error in enhanced analysis:', error);
    
    return res.status(500).json({ 
      error: 'Enhanced analysis encountered an error',
      details: error.message
    });
  }
};

// Enhanced move analysis with Stockfish integration
async function analyzeMoveDevelopmentEnhanced(game, move, depth, ChessClass, moveType, stockfish) {
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
        evaluation: null
      };
    }

    const sequence = [move];
    const positions = [gameCopy.fen()];
    
    // Get initial evaluation with Stockfish if available
    let initialEvaluation = null;
    if (stockfish) {
      try {
        const evalResult = await stockfish.evaluatePosition(gameCopy.fen(), 10);
        initialEvaluation = evalResult.evaluation;
        console.log(`📊 ${moveType} move evaluation: ${initialEvaluation}`);
      } catch (evalError) {
        console.warn(`⚠️ Stockfish evaluation failed for ${moveType} move:`, evalError);
      }
    }

    let analysis = {
      checksGiven: 0,
      materialWon: 0,
      materialLost: 0,
      kingDanger: false,
      controlsCenter: false,
      initialEvaluation,
      tacticalThemes: []
    };

    // Analyze the immediate position
    if (gameCopy.isCheck()) {
      analysis.checksGiven++;
      analysis.tacticalThemes.push('check');
    }

    if (gameCopy.isCheckmate()) {
      analysis.tacticalThemes.push('checkmate');
    }

    // Generate continuation sequence
    for (let i = 1; i < depth && !gameCopy.isGameOver(); i++) {
      const bestResponse = stockfish ? 
        await findBestResponseWithStockfish(gameCopy, stockfish) :
        findBestResponseHeuristic(gameCopy, ChessClass);
      
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

    // Get final Stockfish evaluation
    if (stockfish && !gameCopy.isGameOver()) {
      try {
        const finalEval = await stockfish.evaluatePosition(gameCopy.fen(), 8);
        analysis.finalEvaluation = finalEval.evaluation;
        analysis.finalBestMove = finalEval.bestMove;
      } catch (evalError) {
        console.warn('⚠️ Final Stockfish evaluation failed:', evalError);
      }
    }

    console.log(`✅ ${moveType} enhanced sequence:`, sequence);
    
    return {
      sequence,
      positions,
      finalPosition: gameCopy.fen(),
      isLegal: true,
      analysis,
      gameOver: gameCopy.isGameOver(),
      result: gameCopy.isGameOver() ? getGameResult(gameCopy) : null,
      evaluation: analysis.finalEvaluation || analysis.initialEvaluation
    };

  } catch (error) {
    console.error(`❌ Error in enhanced ${moveType} analysis:`, error);
    return {
      sequence: [move],
      positions: [],
      finalPosition: game.fen(),
      isLegal: false,
      error: error.message,
      evaluation: null
    };
  }
}

// Find best response using Stockfish
async function findBestResponseWithStockfish(game, stockfish) {
  try {
    const evalResult = await stockfish.evaluatePosition(game.fen(), 8);
    const bestMoveUci = evalResult.bestMove;
    
    if (bestMoveUci && bestMoveUci.length >= 4) {
      return {
        from: bestMoveUci.slice(0, 2),
        to: bestMoveUci.slice(2, 4),
        promotion: bestMoveUci.length > 4 ? bestMoveUci[4] : undefined
      };
    }
  } catch (error) {
    console.warn('⚠️ Stockfish best move failed, falling back to heuristic:', error);
  }
  
  // Fallback to heuristic
  return findBestResponseHeuristic(game, Chess);
}

// Heuristic best response (your existing logic)
function findBestResponseHeuristic(game, ChessClass) {
  const legalMoves = game.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  const scoredMoves = legalMoves.map(move => {
    const gameCopy = new ChessClass(game.fen());
    gameCopy.move(move);
    
    let score = 0;
    
    if (gameCopy.isCheckmate()) {
      score += 1000;
    } else if (gameCopy.isCheck()) {
      score += 50;
    }
    
    if (move.captured) {
      const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
      score += (pieceValues[move.captured] || 0) * 10;
    }
    
    // Penalize hanging pieces
    const opponentMoves = gameCopy.moves({ verbose: true });
    const canBeCaptured = opponentMoves.some(oppMove => oppMove.to === move.to);
    if (canBeCaptured) {
      const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
      score -= (pieceValues[move.piece] || 0) * 5;
    }
    
    return { move, score };
  });

  scoredMoves.sort((a, b) => b.score - a.score);
  return scoredMoves[0].move;
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

// Material counting (existing function)
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

    // Use Stockfish evaluations if available
    const userEval = userAnalysis.evaluation;
    const correctEval = correctAnalysis.evaluation;
    
    if (userEval !== null && correctEval !== null) {
      const evalDifference = correctEval - userEval;
      
      if (evalDifference > 3) {
        return `After ${userMove}, your position becomes significantly worse (${userEval > 0 ? '+' : ''}${userEval.toFixed(1)}). ${correctMove} maintains a strong advantage (${correctEval > 0 ? '+' : ''}${correctEval.toFixed(1)}).`;
      } else if (evalDifference > 1) {
        return `After ${userMove}, you lose some advantage (${userEval > 0 ? '+' : ''}${userEval.toFixed(1)}). ${correctMove} keeps you ahead (${correctEval > 0 ? '+' : ''}${correctEval.toFixed(1)}).`;
      }
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
