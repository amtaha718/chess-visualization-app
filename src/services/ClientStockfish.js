class ClientStockfish {
  constructor() {
    this.engine = null;
    this.isReady = false;
    this.messageQueue = [];
    this.responseCallbacks = new Map();
    this.currentId = 0;
  }

  async initialize() {
    if (this.isReady) return true;

    try {
      console.log('🐟 Initializing client-side Stockfish...');
      
      // Load Stockfish from CDN (works perfectly with Vercel)
      this.engine = new Worker('https://cdn.jsdelivr.net/npm/stockfish@15.0.0/src/stockfish.js');
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Stockfish initialization timeout'));
        }, 10000);

        this.engine.onmessage = (event) => {
          const message = event.data;
          console.log('SF:', message);

          if (message === 'uciok') {
            clearTimeout(timeout);
            this.isReady = true;
            this.setupMessageHandler();
            console.log('✅ Client Stockfish ready!');
            resolve(true);
          }
        };

        this.engine.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ Stockfish initialization failed:', error);
          reject(error);
        };

        // Initialize UCI protocol
        this.engine.postMessage('uci');
      });
    } catch (error) {
      console.error('❌ Failed to load Stockfish:', error);
      throw error;
    }
  }

  setupMessageHandler() {
    this.engine.onmessage = (event) => {
      const message = event.data;
      
      // Handle analysis responses
      if (message.startsWith('info') || message.startsWith('bestmove')) {
        this.handleAnalysisMessage(message);
      }
    };
  }

  handleAnalysisMessage(message) {
    // Find the callback for this analysis
    for (const [id, callback] of this.responseCallbacks) {
      callback(message);
    }
  }

  async analyzePosition(fen, options = {}) {
    if (!this.isReady) {
      throw new Error('Stockfish not initialized');
    }

    const {
      depth = 12,        // Mobile-friendly depth
      timeLimit = 2000,  // 2 seconds max
      multiPV = 1        // Number of best moves to show
    } = options;

    console.log(`🔍 Analyzing position: ${fen}`);

    return new Promise((resolve, reject) => {
      const analysisId = ++this.currentId;
      let bestMove = null;
      let evaluation = null;
      let principalVariation = [];
      let currentDepth = 0;
      let nodes = 0;

      const timeout = setTimeout(() => {
        this.responseCallbacks.delete(analysisId);
        
        // Return best result so far
        resolve({
          bestMove: bestMove || 'e2e4', // Fallback
          evaluation: evaluation || { type: 'centipawn', value: 0 },
          principalVariation,
          depth: currentDepth,
          nodes,
          incomplete: true,
          timeMs: timeLimit
        });
      }, timeLimit);

      const messageHandler = (message) => {
        try {
          // Parse evaluation info
          if (message.startsWith('info') && message.includes('score')) {
            const depthMatch = message.match(/depth (\d+)/);
            if (depthMatch) {
              currentDepth = parseInt(depthMatch[1]);
            }

            const nodesMatch = message.match(/nodes (\d+)/);
            if (nodesMatch) {
              nodes = parseInt(nodesMatch[1]);
            }

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
              principalVariation = pvMatch[1].split(' ').slice(0, 10); // First 10 moves
            }
          }

          // Parse best move
          if (message.startsWith('bestmove')) {
            const moveMatch = message.match(/bestmove (\w+)/);
            if (moveMatch) {
              bestMove = moveMatch[1];
            }

            clearTimeout(timeout);
            this.responseCallbacks.delete(analysisId);

            resolve({
              bestMove: bestMove || 'e2e4',
              evaluation: evaluation || { type: 'centipawn', value: 0 },
              principalVariation,
              depth: currentDepth,
              nodes,
              incomplete: false,
              timeMs: Date.now() - startTime
            });
          }
        } catch (error) {
          console.error('Error parsing Stockfish message:', error);
        }
      };

      this.responseCallbacks.set(analysisId, messageHandler);
      const startTime = Date.now();

      // Send analysis commands
      this.engine.postMessage('ucinewgame');
      this.engine.postMessage(`position fen ${fen}`);
      
      if (depth) {
        this.engine.postMessage(`go depth ${depth}`);
      } else {
        this.engine.postMessage(`go movetime ${timeLimit}`);
      }
    });
  }

  // Quick evaluation (lighter analysis)
  async quickEval(fen, timeMs = 500) {
    return this.analyzePosition(fen, {
      depth: 8,
      timeLimit: timeMs
    });
  }

  // Deep analysis for important positions
  async deepAnalysis(fen, depthTarget = 18) {
    return this.analyzePosition(fen, {
      depth: depthTarget,
      timeLimit: 10000 // 10 seconds max
    });
  }

  terminate() {
    if (this.engine) {
      this.engine.terminate();
      this.engine = null;
      this.isReady = false;
      this.responseCallbacks.clear();
    }
  }
}
export default ClientStockfish;
