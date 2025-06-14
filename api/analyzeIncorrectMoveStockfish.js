// api/analyzeIncorrectMoveStockfish.js - Enhanced Stockfish + Pattern Analysis

import { Chess } from 'chess.js';

// Stockfish evaluation wrapper for Vercel
class StockfishEvaluator {
  constructor() {
    this.worker = null;
    this.isReady = false;
  }

  async initialize() {
    if (this.isReady) return;
    
    try {
      // Use CDN-hosted Stockfish for Vercel compatibility
      this.worker = new Worker('https://cdn.jsdelivr.net/npm/stockfish@15.0.0/src/stockfish.js');
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Stockfish initialization timeout'));
        }, 10000);

        this.worker.onmessage = (e) => {
          if (e.data === 'uciok') {
            clearTimeout(timeout);
            this.isReady = true;
            resolve();
          }
        };

        this.worker.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };

        this.worker.postMessage('uci');
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

      const timeout = setTimeout(() => {
        reject(new Error('Stockfish evaluation timeout'));
      }, 8000);

      const messageHandler = (e) => {
        const line = e.data;

        if (line.startsWith('info') && line.includes('score')) {
          const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
          if (scoreMatch) {
            const [, type, value] = scoreMatch;
            evaluation = type === 'mate' ? 
              (parseInt(value) > 0 ? 999 : -999) : 
              parseInt(value) / 100;
          }

          const pvMatch = line.match(/pv (.+)/);
          if (pvMatch) {
            principalVariation = pvMatch[1].split(' ').slice(0, 3);
          }
        }

        if (line.startsWith('bestmove')) {
          const moveMatch = line.match(/bestmove (\w+)/);
          if (moveMatch) {
            bestMove = moveMatch[1];
          }
          
          clearTimeout(timeout);
          this.worker.removeEventListener('message', messageHandler);
          
          resolve({
            bestMove,
            evaluation: evaluation || 0,
            principalVariation,
            depth
          });
        }
      };

      this.worker.addEventListener('message', messageHandler);
      
      this.worker.postMessage('ucinewgame');
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }
}

// Pattern-based explanation templates
class TacticalPatternAnalyzer {
  
  static analyzeIncorrectMove(gameState, userMove, correctMove, evaluations) {
    const {
      positionBefore,
      positionAfterUser,
      positionAfterCorrect,
      userEval,
      correctEval,
      userAnalysis,
      correctAnalysis
    } = gameState;

    const evalDifference = correctEval - userEval;
    const severity = this.categorizeMistake(evalDifference);

    console.log(`📊 Analysis: User eval ${userEval}, Correct eval ${correctEval}, Diff: ${evalDifference}`);
    
    // 1. Check for hanging pieces (most common mistake)
    const hangingPiece = this.detectHangingPiece(positionBefore, positionAfterUser, userMove);
    if (hangingPiece) {
      return `This move hangs your ${hangingPiece.piece} on ${hangingPiece.square}. Try again.`;
    }

    // 2. Check for missed checkmate
    if (correctEval > 10 && userEval < 5) {
      return `This move misses a forced checkmate. Look for forcing moves. Try again.`;
    }

    // 3. Check for missed major material gain
    if (evalDifference > 5) {
      const materialLoss = this.detectMaterialLoss(positionAfterUser, positionAfterCorrect);
      if (materialLoss) {
        return `This move misses winning ${materialLoss}. Try again.`;
      }
      return `This move misses a major tactical opportunity. Try again.`;
    }

    // 4. Check for allowing counterplay
    if (userEval < -2 && correctEval > 0) {
      return `This move allows your opponent too much counterplay. Try again.`;
    }

    // 5. Check for moving into check/tactics
    if (this.movesIntoTactics(positionAfterUser)) {
      return `This move walks into a tactical shot. Try again.`;
    }

    // 6. Check for ignoring opponent threats
    if (this.ignoresThreat(positionBefore, userMove, correctMove)) {
      return `This move ignores your opponent's main threat. Try again.`;
    }

    // 7. Positional mistakes
    if (evalDifference > 1.5) {
      const positionalError = this.detectPositionalError(positionBefore, userMove, correctMove);
      if (positionalError) {
        return positionalError;
      }
    }

    // 8. Default explanations based on evaluation difference
    return this.getDefaultExplanation(severity, evalDifference);
  }

  static categorizeMistake(evalDifference) {
    if (evalDifference > 5) return 'blunder';
    if (evalDifference > 2) return 'mistake';  
    if (evalDifference > 1) return 'inaccuracy';
    return 'minor';
  }

  static detectHangingPiece(positionBefore, positionAfterUser, userMove) {
    try {
      const gameBefore = new Chess(positionBefore);
      const gameAfter = new Chess(positionAfterUser);
      
      const fromSquare = userMove.slice(0, 2);
      const toSquare = userMove.slice(2, 4);
      
      // Check if the moved piece is now undefended
      const movedPiece = gameAfter.get(toSquare);
      if (!movedPiece) return null;

      // Simple heuristic: if we moved to a square that's attacked by opponent
      // and not defended by us, it's likely hanging
      const isAttackedByOpponent = this.isSquareAttackedBy(gameAfter, toSquare, movedPiece.color === 'w' ? 'b' : 'w');
      const isDefendedByUs = this.isSquareAttackedBy(gameAfter, toSquare, movedPiece.color);
      
      if (isAttackedByOpponent && !isDefendedByUs) {
        const pieceNames = {
          'p': 'pawn', 'n': 'knight', 'b': 'bishop', 
          'r': 'rook', 'q': 'queen', 'k': 'king'
        };
        
        return {
          piece: pieceNames[movedPiece.type.toLowerCase()] || 'piece',
          square: toSquare.toUpperCase()
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Error detecting hanging piece:', error);
      return null;
    }
  }

  static isSquareAttackedBy(game, square, color) {
    // Get all pieces of the specified color
    const pieces = [];
    for (let rank = 1; rank <= 8; rank++) {
      for (let file = 'a'; file <= 'h'; file = String.fromCharCode(file.charCodeAt(0) + 1)) {
        const sq = file + rank;
        const piece = game.get(sq);
        if (piece && piece.color === color) {
          pieces.push({ square: sq, piece });
        }
      }
    }

    // Check if any piece can attack the target square
    for (const { square: pieceSquare } of pieces) {
      const moves = game.moves({ square: pieceSquare, verbose: true });
      if (moves.some(move => move.to === square)) {
        return true;
      }
    }
    
    return false;
  }

  static detectMaterialLoss(positionAfterUser, positionAfterCorrect) {
    try {
      const userMaterial = this.countMaterial(positionAfterUser);
      const correctMaterial = this.countMaterial(positionAfterCorrect);
      
      const materialDiff = correctMaterial - userMaterial;
      
      if (materialDiff >= 9) return 'the queen';
      if (materialDiff >= 5) return 'the rook';
      if (materialDiff >= 3) return 'a minor piece';
      if (materialDiff >= 1) return 'a pawn';
      
      return null;
    } catch (error) {
      return null;
    }
  }

  static countMaterial(fen) {
    const pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
    const position = fen.split(' ')[0];
    
    let material = 0;
    for (const char of position) {
      const piece = char.toLowerCase();
      if (pieceValues[piece] !== undefined) {
        material += pieceValues[piece];
      }
    }
    
    return material;
  }

  static movesIntoTactics(positionAfterUser) {
    try {
      const game = new Chess(positionAfterUser);
      
      // Simple check: if opponent has many forcing moves available
      const opponentMoves = game.moves({ verbose: true });
      const forcingMoves = opponentMoves.filter(move => 
        move.flags.includes('c') || // capture
        move.flags.includes('+') || // check
        move.flags.includes('#')    // checkmate
      );
      
      // If more than 30% of opponent's moves are forcing, position might be tactical
      return forcingMoves.length / opponentMoves.length > 0.3;
    } catch (error) {
      return false;
    }
  }

  static ignoresThreat(positionBefore, userMove, correctMove) {
    // Heuristic: if the correct move is defensive (moves to back rank, blocks, etc.)
    // and user move is not, then user might be ignoring a threat
    
    const correctTo = correctMove.slice(2, 4);
    const userTo = userMove.slice(2, 4);
    
    const correctRank = parseInt(correctTo[1]);
    const userRank = parseInt(userTo[1]);
    
    // If correct move goes to back rank (defensive) and user doesn't
    if ((correctRank === 1 || correctRank === 8) && 
        (userRank !== 1 && userRank !== 8)) {
      return true;
    }
    
    return false;
  }

  static detectPositionalError(positionBefore, userMove, correctMove) {
    const userTo = userMove.slice(2, 4);
    const correctTo = correctMove.slice(2, 4);
    
    // Check for edge vs center
    if (this.isEdgeSquare(userTo) && this.isCenterSquare(correctTo)) {
      return "This move puts your piece on the edge instead of centralizing it. Try again.";
    }
    
    // Check for development issues
    if (this.isBackRankMove(userMove) && this.isForwardMove(correctMove)) {
      return "This move doesn't help your development. Try again.";
    }
    
    return null;
  }

  static isEdgeSquare(square) {
    const file = square[0];
    const rank = square[1];
    return file === 'a' || file === 'h' || rank === '1' || rank === '8';
  }

  static isCenterSquare(square) {
    const file = square[0];
    const rank = square[1];
    return ['d', 'e'].includes(file) && ['4', '5'].includes(rank);
  }

  static isBackRankMove(move) {
    const fromRank = move[1];
    const toRank = move[3];
    return fromRank === toRank && (toRank === '1' || toRank === '8');
  }

  static isForwardMove(move) {
    const fromRank = parseInt(move[1]);
    const toRank = parseInt(move[3]);
    return Math.abs(toRank - fromRank) > 0;
  }

  static getDefaultExplanation(severity, evalDifference) {
    const explanations = {
      blunder: [
        "This move creates serious problems for your position. Try again.",
        "This move loses significant material or position. Try again.",
        "This move puts you in a very difficult situation. Try again."
      ],
      mistake: [
        "This move gives your opponent a clear advantage. Try again.",
        "This move makes your position significantly worse. Try again.",
        "This move misses the best continuation. Try again."
      ],
      inaccuracy: [
        "This move is not the most accurate. Try again.",
        "This move doesn't give you the best position. Try again.",
        "This move is playable but not optimal. Try again."
      ],
      minor: [
        "This move is okay but not the best choice. Try again.",
        "Consider a more forcing move. Try again.",
        "Look for a more active continuation. Try again."
      ]
    };

    const severityExplanations = explanations[severity] || explanations.minor;
    return severityExplanations[Math.floor(Math.random() * severityExplanations.length)];
  }
}

// Main API handler
export default async function handler(req, res) {
  console.log('🔍 === STOCKFISH + PATTERN ANALYSIS ===');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const stockfish = new StockfishEvaluator();

  try {
    const { 
      positionAfter3Moves,
      userMove,
      correctMove,
      playingAs 
    } = req.body;
    
    console.log('📊 Analyzing with Stockfish...');
    console.log('- Position:', positionAfter3Moves);
    console.log('- User move:', userMove);
    console.log('- Correct move:', correctMove);

    // Initialize Stockfish
    await stockfish.initialize();

    // Evaluate position after user's move
    const gameAfterUser = new Chess(positionAfter3Moves);
    const userMoveResult = gameAfterUser.move({
      from: userMove.slice(0, 2),
      to: userMove.slice(2, 4)
    });

    if (!userMoveResult) {
      return res.status(400).json({ 
        explanation: "Invalid move. Try again.",
        method: 'validation_error'
      });
    }

    // Evaluate position after correct move
    const gameAfterCorrect = new Chess(positionAfter3Moves);
    const correctMoveResult = gameAfterCorrect.move({
      from: correctMove.slice(0, 2),
      to: correctMove.slice(2, 4)
    });

    if (!correctMoveResult) {
      throw new Error('Correct move is invalid');
    }

    // Get Stockfish evaluations
    const [userEvaluation, correctEvaluation] = await Promise.all([
      stockfish.evaluatePosition(gameAfterUser.fen()),
      stockfish.evaluatePosition(gameAfterCorrect.fen())
    ]);

    console.log(`📈 Evaluations: User ${userEvaluation.evaluation}, Correct ${correctEvaluation.evaluation}`);

    // Prepare game state for pattern analysis
    const gameState = {
      positionBefore: positionAfter3Moves,
      positionAfterUser: gameAfterUser.fen(),
      positionAfterCorrect: gameAfterCorrect.fen(),
      userEval: userEvaluation.evaluation,
      correctEval: correctEvaluation.evaluation,
      userAnalysis: userEvaluation,
      correctAnalysis: correctEvaluation
    };

    // Generate explanation using pattern analysis
    const explanation = TacticalPatternAnalyzer.analyzeIncorrectMove(
      gameState,
      userMove,
      correctMove,
      { userEvaluation, correctEvaluation }
    );

    console.log('🎯 Generated explanation:', explanation);

    return res.status(200).json({ 
      explanation,
      method: 'stockfish_pattern_analysis',
      evaluations: {
        user: userEvaluation.evaluation,
        correct: correctEvaluation.evaluation,
        difference: correctEvaluation.evaluation - userEvaluation.evaluation
      }
    });

  } catch (error) {
    console.error('❌ Analysis error:', error);
    
    // Fallback to simple pattern analysis without Stockfish
    const fallbackExplanation = TacticalPatternAnalyzer.getDefaultExplanation('mistake', 2);
    
    return res.status(200).json({ 
      explanation: fallbackExplanation,
      method: 'fallback_pattern',
      error: error.message
    });
  } finally {
    // Clean up Stockfish worker
    stockfish.terminate();
  }
}
