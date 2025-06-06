// src/stockfish-utils.js
import { Chess } from 'chess.js';

class StockfishAnalyzer {
  constructor() {
    this.engine = null;
    this.isReady = false;
  }

  async initialize() {
    if (this.isReady) return;
    
    try {
      // Load Stockfish worker
      const Stockfish = await import('stockfish');
      this.engine = new Worker(new URL('stockfish/src/stockfish.js', import.meta.url));
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Stockfish initialization timeout'));
        }, 10000);

        this.engine.onmessage = (e) => {
          console.log('Stockfish:', e.data);
          if (e.data === 'uciok') {
            clearTimeout(timeout);
            this.isReady = true;
            resolve();
          }
        };

        this.engine.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };

        this.engine.postMessage('uci');
      });
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
      throw error;
    }
  }

  async evaluatePosition(fen, depth = 15) {
    if (!this.isReady) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      let bestMove = null;
      let evaluation = null;
      let principalVariation = [];

      const timeout = setTimeout(() => {
        reject(new Error('Stockfish evaluation timeout'));
      }, 15000);

      const messageHandler = (e) => {
        const line = e.data;
        console.log('SF eval:', line);

        // Parse evaluation info
        if (line.startsWith('info') && line.includes('score')) {
          const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
          if (scoreMatch) {
            const [, type, value] = scoreMatch;
            evaluation = type === 'mate' ? 
              (parseInt(value) > 0 ? 9999 : -9999) : 
              parseInt(value) / 100; // Convert centipawns to pawns
          }

          // Extract principal variation
          const pvMatch = line.match(/pv (.+)/);
          if (pvMatch) {
            principalVariation = pvMatch[1].split(' ');
          }
        }

        // Parse best move
        if (line.startsWith('bestmove')) {
          const moveMatch = line.match(/bestmove (\w+)/);
          if (moveMatch) {
            bestMove = moveMatch[1];
          }
          
          clearTimeout(timeout);
          this.engine.removeEventListener('message', messageHandler);
          
          resolve({
            bestMove,
            evaluation,
            principalVariation,
            depth
          });
        }
      };

      this.engine.addEventListener('message', messageHandler);
      
      // Set up position and analyze
      this.engine.postMessage('ucinewgame');
      this.engine.postMessage(`position fen ${fen}`);
      this.engine.postMessage(`go depth ${depth}`);
    });
  }

  async analyzeMove(fen, move) {
    // Create position after the move
    const game = new Chess(fen);
    const moveResult = game.move({
      from: move.slice(0, 2),
      to: move.slice(2, 4),
      promotion: move.length > 4 ? move[4] : undefined
    });

    if (!moveResult) {
      throw new Error(`Illegal move: ${move}`);
    }

    const newFen = game.fen();
    const analysis = await this.evaluatePosition(newFen);
    
    return {
      move,
      resultingFen: newFen,
      evaluation: -analysis.evaluation, // Flip evaluation for opponent
      opponentBestMove: analysis.bestMove,
      principalVariation: analysis.principalVariation
    };
  }

  async compareMovesDetailed(fen, userMove, correctMove) {
    try {
      console.log('🔍 Stockfish analyzing moves...');
      
      const [userAnalysis, correctAnalysis] = await Promise.all([
        this.analyzeMove(fen, userMove),
        this.analyzeMove(fen, correctMove)
      ]);

      const evalDifference = correctAnalysis.evaluation - userAnalysis.evaluation;
      
      console.log('📊 Analysis results:');
      console.log('- User move eval:', userAnalysis.evaluation);
      console.log('- Correct move eval:', correctAnalysis.evaluation);
      console.log('- Difference:', evalDifference);

      return {
        userMove: userAnalysis,
        correctMove: correctAnalysis,
        difference: evalDifference,
        severity: this.categorizeMistake(evalDifference),
        tacticalTheme: this.identifyTacticalTheme(userAnalysis, correctAnalysis)
      };
    } catch (error) {
      console.error('❌ Stockfish analysis failed:', error);
      return null;
    }
  }

  categorizeMistake(evalDifference) {
    if (evalDifference > 5) return 'blunder'; // Loses 5+ points
    if (evalDifference > 2) return 'mistake'; // Loses 2-5 points  
    if (evalDifference > 1) return 'inaccuracy'; // Loses 1-2 points
    return 'minor'; // Less than 1 point difference
  }

  identifyTacticalTheme(userAnalysis, correctAnalysis) {
    // Simple heuristic - can be expanded
    if (correctAnalysis.evaluation > 5) {
      return 'missed_mate_threat';
    }
    if (userAnalysis.evaluation < -2) {
      return 'hangs_material';
    }
    if (Math.abs(correctAnalysis.evaluation - userAnalysis.evaluation) > 3) {
      return 'missed_tactic';
    }
    return 'positional_error';
  }

  terminate() {
    if (this.engine) {
      this.engine.terminate();
      this.engine = null;
      this.isReady = false;
    }
  }
}

// Singleton instance
const stockfishAnalyzer = new StockfishAnalyzer();

export default stockfishAnalyzer;
