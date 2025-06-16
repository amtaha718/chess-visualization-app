// src/services/ClientStockfish.js - Enhanced for move consequence analysis

class ClientStockfish {
  constructor() {
    this.engine = null;
    this.isReady = false;
    this.analysisCallbacks = new Map();
    this.currentAnalysisId = 0;
  }

  async initialize() {
    if (this.isReady) return true;

    try {
      console.log('🐟 Initializing Stockfish for move consequence analysis...');
      
      // Use the exact CDN URL that works with Vercel
      const workerCode = `
        importScripts('https://cdn.jsdelivr.net/npm/stockfish@15.0.0/src/stockfish.js');
        
        let stockfish = null;
        
        self.onmessage = function(e) {
          const { command, id } = e.data;
          
          if (command === 'init') {
            stockfish = new Worker('https://cdn.jsdelivr.net/npm/stockfish@15.0.0/src/stockfish.js');
            stockfish.onmessage = function(event) {
              self.postMessage({ id, response: event.data });
            };
            stockfish.postMessage('uci');
          } else if (stockfish) {
            stockfish.postMessage(command);
          }
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.engine = new Worker(URL.createObjectURL(blob));
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Stockfish initialization timeout'));
        }, 10000);

        this.engine.onmessage = (event) => {
          const { id, response } = event.data;
          
          if (response === 'uciok' && !this.isReady) {
            clearTimeout(timeout);
            this.isReady = true;
            this.setupMessageHandler();
            console.log('✅ Stockfish ready for move analysis!');
            resolve(true);
          } else {
            // Handle analysis responses
            this.handleAnalysisResponse(id, response);
          }
        };

        this.engine.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ Stockfish worker error:', error);
          reject(error);
        };

        // Initialize the worker
        this.engine.postMessage({ command: 'init', id: 'init' });
      });
    } catch (error) {
      console.error('❌ Failed to initialize Stockfish:', error);
      throw error;
    }
  }

  setupMessageHandler() {
    this.engine.onmessage = (event) => {
      const { id, response } = event.data;
      this.handleAnalysisResponse(id, response);
    };
  }

  handleAnalysisResponse(id, message) {
    const callback = this.analysisCallbacks.get(id);
    if (callback) {
      callback(message);
    }
  }

  // Analyze consequences of a move by playing it and getting best response
  async analyzeMoveConsequences(fen, move, depth = 3) {
    if (!this.isReady) {
      throw new Error('Stockfish not ready');
    }

    console.log(`🔍 Analyzing consequences of move ${move} from position ${fen.slice(0, 20)}...`);

    try {
      // First, apply the move to get the new position
      const positionAfterMove = await this.applyMoveToPosition(fen, move);
      if (!positionAfterMove) {
        throw new Error('Invalid move or position');
      }

      // Now analyze the resulting position to get the best response sequence
      const consequences = await this.getConsequenceSequence(positionAfterMove, depth);
      
      return {
        originalMove: move,
        positionAfterMove,
        sequence: [move, ...consequences.moves],
        evaluation: consequences.evaluation,
        bestLine: consequences.bestLine,
        explanation: this.generateConsequenceExplanation(consequences)
      };

    } catch (error) {
      console.error('❌ Move consequence analysis failed:', error);
      throw error;
    }
  }

  // Apply a move to a position (we'll use chess.js for this)
  async applyMoveToPosition(fen, move) {
    try {
      // Import chess.js dynamically to avoid module issues
      const { Chess } = await import('chess.js');
      const game = new Chess(fen);
      
      const moveResult = game.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move.length > 4 ? move[4] : undefined
      });
      
      if (!moveResult) {
        throw new Error(`Invalid move: ${move}`);
      }
      
      return game.fen();
    } catch (error) {
      console.error('❌ Failed to apply move:', error);
      return null;
    }
  }

  // Get the best response sequence from a position
  async getConsequenceSequence(fen, depth) {
    const analysisId = ++this.currentAnalysisId;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.analysisCallbacks.delete(analysisId);
        reject(new Error('Analysis timeout'));
      }, 8000);

      let bestMove = null;
      let evaluation = null;
      let principalVariation = [];

      const messageHandler = (message) => {
        try {
          // Parse Stockfish output
          if (message.startsWith('info') && message.includes('pv')) {
            const depthMatch = message.match(/depth (\d+)/);
            const currentDepth = depthMatch ? parseInt(depthMatch[1]) : 0;
            
            // Only use deep enough analysis
            if (currentDepth >= Math.min(depth, 8)) {
              const scoreMatch = message.match(/score (cp|mate) (-?\d+)/);
              if (scoreMatch) {
                const [, type, value] = scoreMatch;
                evaluation = {
                  type: type === 'mate' ? 'mate' : 'centipawn',
                  value: type === 'mate' ? parseInt(value) : parseInt(value) / 100
                };
              }

              const pvMatch = message.match(/pv (.+)/);
              if (pvMatch) {
                principalVariation = pvMatch[1].split(' ').slice(0, depth);
              }
            }
          }

          if (message.startsWith('bestmove')) {
            const moveMatch = message.match(/bestmove (\w+)/);
            if (moveMatch) {
              bestMove = moveMatch[1];
            }

            clearTimeout(timeout);
            this.analysisCallbacks.delete(analysisId);

            resolve({
              moves: principalVariation.slice(0, depth),
              evaluation: evaluation || { type: 'centipawn', value: 0 },
              bestMove: bestMove || principalVariation[0] || 'e2e4',
              bestLine: principalVariation.join(' ')
            });
          }
        } catch (error) {
          console.error('Error parsing Stockfish response:', error);
        }
      };

      this.analysisCallbacks.set(analysisId, messageHandler);

      // Send analysis commands
      this.engine.postMessage({ command: 'ucinewgame', id: analysisId });
      this.engine.postMessage({ command: `position fen ${fen}`, id: analysisId });
      this.engine.postMessage({ command: `go depth ${Math.min(depth + 6, 12)}`, id: analysisId });
    });
  }

  // Compare two moves by analyzing their consequences
  async compareMoveConsequences(fen, userMove, correctMove, depth = 3) {
    try {
      console.log('🆚 Comparing move consequences...');
      
      const [userConsequences, correctConsequences] = await Promise.all([
        this.analyzeMoveConsequences(fen, userMove, depth),
        this.analyzeMoveConsequences(fen, correctMove, depth)
      ]);

      return {
        userConsequences,
        correctConsequences,
        difference: this.calculateConsequenceDifference(userConsequences, correctConsequences)
      };
    } catch (error) {
      console.error('❌ Move comparison failed:', error);
      throw error;
    }
  }

  calculateConsequenceDifference(userConsequences, correctConsequences) {
    const userEvaluation = userConsequences.evaluation;
    const correctEvaluation = correctConsequences.evaluation;
    
    // Convert evaluations to centipawns for comparison
    const userCentipawns = userEvaluation.type === 'mate' ? 
      (userEvaluation.value > 0 ? 1000 : -1000) : userEvaluation.value * 100;
    const correctCentipawns = correctEvaluation.type === 'mate' ? 
      (correctEvaluation.value > 0 ? 1000 : -1000) : correctEvaluation.value * 100;
    
    return {
      evaluationDiff: correctCentipawns - userCentipawns,
      userIsBetter: userCentipawns > correctCentipawns,
      significance: Math.abs(correctCentipawns - userCentipawns)
    };
  }

  generateConsequenceExplanation(consequences) {
    const evaluation = consequences.evaluation;
    
    if (evaluation.type === 'mate') {
      return evaluation.value > 0 ? 
        'This leads to checkmate!' : 
        'This allows the opponent to deliver checkmate.';
    }
    
    const centipawns = evaluation.value * 100;
    if (Math.abs(centipawns) < 50) {
      return 'The position remains roughly equal.';
    } else if (centipawns > 200) {
      return 'This gives a significant advantage.';
    } else if (centipawns < -200) {
      return 'This gives the opponent a significant advantage.';
    } else if (centipawns > 0) {
      return 'This gives a slight advantage.';
    } else {
      return 'This gives the opponent a slight advantage.';
    }
  }

  // Quick evaluation for simple positions
  async quickEval(fen, timeMs = 1000) {
    return this.getConsequenceSequence(fen, 2);
  }

  terminate() {
    if (this.engine) {
      this.engine.terminate();
      this.engine = null;
      this.isReady = false;
      this.analysisCallbacks.clear();
    }
  }
}

export default ClientStockfish;
