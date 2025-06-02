// src/puzzle-generator.js
import { Chess } from 'chess.js';

class PuzzleGenerator {
  constructor() {
    this.stockfish = null;
    this.isEngineReady = false;
  }

  // Initialize web-based Stockfish
  async initEngine() {
    return new Promise((resolve, reject) => {
      try {
        this.stockfish = new Worker('https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js');
        
        this.stockfish.onmessage = (event) => {
          const message = event.data;
          if (message === 'uciok') {
            this.isEngineReady = true;
            resolve();
          }
        };
        
        this.stockfish.postMessage('uci');
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.isEngineReady) {
            reject(new Error('Engine failed to initialize'));
          }
        }, 10000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // Send command to engine and wait for response
  sendCommand(command, expectedResponse = null) {
    return new Promise((resolve) => {
      let response = '';
      
      const messageHandler = (event) => {
        const line = event.data;
        response += line + '\n';
        
        if (expectedResponse && line.includes(expectedResponse)) {
          this.stockfish.removeEventListener('message', messageHandler);
          resolve(response);
        } else if (command.includes('go depth') && line.startsWith('bestmove')) {
          this.stockfish.removeEventListener('message', messageHandler);
          resolve(line);
        }
      };
      
      this.stockfish.addEventListener('message', messageHandler);
      this.stockfish.postMessage(command);
    });
  }

  // Get best move from current position
  async getBestMove(fen) {
    await this.sendCommand(`position fen ${fen}`);
    const response = await this.sendCommand('go depth 12');
    
    const match = response.match(/bestmove ([a-h][1-8][a-h][1-8])/);
    return match ? match[1] : null;
  }

  // Analyze what the move pattern accomplishes
  analyzeMovePattern(moves, startingFen) {
    const game = new Chess(startingFen);
    const analysis = {
      capturesMaterial: false,
      attacksKing: false,
      improvesPieceActivity: false,
      createsPinOrFork: false,
      controlsCenter: false,
      developsPieces: false,
      castles: false,
      createsThreats: false
    };

    const initialMaterialCount = this.countMaterial(game);
    let moveCount = 0;

    moves.forEach((move, index) => {
      const from = move.slice(0, 2);
      const to = move.slice(2, 4);
      
      // Check what piece is moving
      const piece = game.get(from);
      const targetSquare = game.get(to);
      
      // Analyze the move
      if (targetSquare) {
        analysis.capturesMaterial = true;
      }
      
      // Check if attacking king area
      const kingSquare = this.findKing(game, moveCount % 2 === 1 ? 'w' : 'b');
      if (kingSquare && this.isNearKing(to, kingSquare)) {
        analysis.attacksKing = true;
      }
      
      // Check for development (pieces moving from back rank)
      if (piece && (from[1] === '1' || from[1] === '8') && (to[1] !== '1' && to[1] !== '8')) {
        analysis.developsPieces = true;
      }
      
      // Check for center control
      if (['d4', 'd5', 'e4', 'e5'].includes(to)) {
        analysis.controlsCenter = true;
      }
      
      // Check for castling
      if (piece && piece.type === 'k' && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) > 1) {
        analysis.castles = true;
      }
      
      game.move({ from, to });
      moveCount++;
    });

    const finalMaterialCount = this.countMaterial(game);
    if (finalMaterialCount.white > initialMaterialCount.white) {
      analysis.capturesMaterial = true;
    }

    return analysis;
  }

  // Helper functions
  countMaterial(game) {
    const board = game.board();
    const material = { white: 0, black: 0 };
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    
    board.forEach(row => {
      row.forEach(square => {
        if (square) {
          const value = pieceValues[square.type];
          if (square.color === 'w') material.white += value;
          else material.black += value;
        }
      });
    });
    
    return material;
  }

  findKing(game, color) {
    const board = game.board();
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece && piece.type === 'k' && piece.color === color) {
          return String.fromCharCode(97 + file) + (8 - rank);
        }
      }
    }
    return null;
  }

  isNearKing(square, kingSquare) {
    const squareFile = square.charCodeAt(0);
    const squareRank = parseInt(square[1]);
    const kingFile = kingSquare.charCodeAt(0);
    const kingRank = parseInt(kingSquare[1]);
    
    return Math.abs(squareFile - kingFile) <= 2 && Math.abs(squareRank - kingRank) <= 2;
  }

  // Generate explanation based on pattern analysis
  generateExplanation(moves, theme, startingFen) {
    const analysis = this.analyzeMovePattern(moves, startingFen);
    let explanation = '';

    if (analysis.capturesMaterial) {
      explanation += 'White wins material through this tactical sequence. ';
    }
    
    if (analysis.attacksKing) {
      explanation += 'The moves create direct pressure against the enemy king. ';
    }
    
    if (analysis.developsPieces) {
      explanation += 'White develops pieces efficiently while maintaining the initiative. ';
    }
    
    if (analysis.controlsCenter) {
      explanation += 'The sequence establishes strong central control. ';
    }
    
    if (analysis.castles) {
      explanation += 'Castling improves king safety while activating the rook. ';
    }
    
    if (analysis.createsThreats) {
      explanation += 'White creates multiple threats that Black must address. ';
    }

    // Fallback explanations if no specific patterns detected
    if (!explanation) {
      const fallbacks = {
        development: 'White improves piece coordination and prepares for the middlegame.',
        tactics: 'This sequence exploits tactical opportunities in the position.',
        attack: 'White maintains the initiative with aggressive piece play.',
        general: 'The move sequence strengthens White\'s position and creates opportunities.'
      };
      explanation = fallbacks[theme] || fallbacks.general;
    }

    return explanation.trim();
  }

  // Calculate difficulty
  calculateDifficulty(fen) {
    const game = new Chess(fen);
    const legalMoves = game.moves().length;
    const material = this.countMaterial(game);
    const totalMaterial = material.white + material.black;
    
    if (legalMoves < 20 && totalMaterial > 60) return 'beginner';
    if (legalMoves < 35 && totalMaterial > 40) return 'intermediate';
    return 'advanced';
  }

  // Generate a 3-move puzzle sequence
  async generatePuzzleSequence(startingFen, theme = 'general') {
    if (!this.isEngineReady) {
      await this.initEngine();
    }

    const game = new Chess(startingFen);
    const moves = [];
    
    try {
      // Generate 3 moves alternating between sides
      for (let i = 0; i < 3; i++) {
        const bestMove = await this.getBestMove(game.fen());
        
        if (!bestMove) {
          throw new Error('No best move found');
        }
        
        const from = bestMove.slice(0, 2);
        const to = bestMove.slice(2, 4);
        
        const moveResult = game.move({ from, to });
        if (!moveResult) {
          throw new Error(`Invalid move: ${bestMove}`);
        }
        
        moves.push(bestMove);
        
        if (game.isGameOver()) break;
      }
      
      const explanation = this.generateExplanation(moves, theme, startingFen);
      
      return {
        fen: startingFen,
        moves: moves,
        explanation: explanation,
        theme: theme,
        difficulty: this.calculateDifficulty(startingFen)
      };
      
    } catch (error) {
      console.error('Error generating puzzle:', error);
      return null;
    }
  }

  // Predefined starting positions
  getStartingPositions() {
    return [
      { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', theme: 'development' },
      { fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', theme: 'development' },
      { fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 3', theme: 'development' },
      { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 0 4', theme: 'tactics' },
      { fen: 'rnbqkb1r/ppp2ppp/5n2/3pp3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq d6 0 4', theme: 'tactics' },
      { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', theme: 'tactics' },
      { fen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4', theme: 'attack' },
      { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 0 4', theme: 'attack' }
    ];
  }

  // Generate multiple puzzles
  async generatePuzzleBatch(count = 5) {
    const positions = this.getStartingPositions();
    const puzzles = [];
    
    for (let i = 0; i < Math.min(count, positions.length); i++) {
      const position = positions[i];
      console.log(`Generating puzzle ${i + 1}/${count}...`);
      
      const puzzle = await this.generatePuzzleSequence(position.fen, position.theme);
      
      if (puzzle) {
        puzzles.push(puzzle);
      }
      
      // Small delay between generations
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return puzzles;
  }
}

export default PuzzleGenerator;
