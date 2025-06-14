// api/analyzeIncorrectMoveStockfishEnhanced.js - New enhanced API endpoint

let Chess;

async function loadChess() {
  if (!Chess) {
    const chessModule = await import('chess.js');
    Chess = chessModule.Chess;
  }
  return Chess;
}

// Stockfish WASM integration for Vercel
class StockfishEngine {
  constructor() {
    this.stockfish = null;
    this.isReady = false;
  }

  async initialize() {
    if (this.isReady) return;
    
    try {
      console.log('🐟 Initializing Stockfish WASM...');
      
      // Import the Stockfish module you provided
      const stockfishModule = require('./stockfish-17-lite-single.js');
      
      // Initialize Stockfish
      this.stockfish = await stockfishModule();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Stockfish initialization timeout'));
        }, 10000);

        // Set up message handler
        this.stockfish.addListener = (callback) => {
          this.stockfish.listener = callback;
        };

        this.stockfish.removeListener = (callback) => {
          if (this.stockfish.listener === callback) {
            this.stockfish.listener = null;
          }
        };

        this.stockfish.postMessage = (message) => {
          this.stockfish.sendCommand(message);
        };

        // Wait for UCI ready
        this.stockfish.listener = (line) => {
          console.log('SF init:', line);
          if (line === 'uciok') {
            clearTimeout(timeout);
            this.isReady = true;
            console.log('✅ Stockfish initialized successfully');
            resolve();
          }
        };

        this.stockfish.sendCommand('uci');
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
      }, 12000);

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
            principalVariation = pvMatch[1].split(' ').slice(0, 5);
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
    if (this.stockfish && this.stockfish.terminate) {
      this.stockfish.terminate();
      this.stockfish = null;
      this.isReady = false;
    }
  }
}

// Global Stockfish instance
let globalStockfish = null;

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
      useStockfish = true,
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
    console.log('- Use Stockfish:', useStockfish);
    console.log('- Depth:', depth);

    // Initialize Stockfish if requested and not already initialized
    if (useStockfish && !globalStockfish) {
      try {
        globalStockfish = new StockfishEngine();
        await globalStockfish.initialize();
        console.log('🐟 Stockfish initialized for enhanced analysis');
      } catch (stockfishError) {
        console.warn('⚠️ Stockfish initialization failed, using heuristic analysis');
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
      return res.status(200).json({
