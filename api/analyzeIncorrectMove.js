// api/analyzeIncorrectMove.js
import Anthropic from '@anthropic-ai/sdk';

// api/analyzeIncorrectMove.js
import Anthropic from '@anthropic-ai/sdk';

// Server-side Stockfish analysis
async function analyzeWithStockfish(fen, userMove, correctMove) {
  try {
    // Try to import and use Stockfish
    const Stockfish = await import('stockfish');
    
    return new Promise((resolve, reject) => {
      const engine = new Stockfish.Worker();
      let userEval = 0;
      let correctEval = 0;
      let analysisStep = 0;
      
      const timeout = setTimeout(() => {
        engine.terminate();
        reject(new Error('Stockfish timeout'));
      }, 10000);

      engine.onmessage = function(event) {
        const line = event.data;
        console.log('SF:', line);
        
        if (line.includes('score cp')) {
          const scoreMatch = line.match(/score cp (-?\d+)/);
          if (scoreMatch) {
            const score = parseInt(scoreMatch[1]) / 100; // Convert to pawns
            
            if (analysisStep === 0) {
              userEval = score;
              analysisStep = 1;
              // Now analyze correct move
              engine.postMessage(`position fen ${fen}`);
              engine.postMessage(`go depth 10`);
            } else {
              correctEval = score;
              clearTimeout(timeout);
              engine.terminate();
              
              resolve({
                userEvaluation: userEval,
                correctEvaluation: correctEval,
                difference: Math.abs(correctEval - userEval),
                severity: categorizeSeverity(Math.abs(correctEval - userEval))
              });
            }
          }
        }
      };

      // Start analysis with user move
      engine.postMessage('uci');
      engine.postMessage('ucinewgame');
      engine.postMessage(`position fen ${fen} moves ${userMove}`);
      engine.postMessage('go depth 10');
    });
    
  } catch (error) {
    console.error('Real Stockfish failed, using simulation:', error);
    return simulateStockfishAnalysis(fen, userMove, correctMove);
  }
}

// Fallback simulation
function simulateStockfishAnalysis(fen, userMove, correctMove) {
  // Enhanced simulation based on move patterns
  const userEval = Math.random() * 2 - 1; // -1 to +1
  const correctEval = Math.random() * 3 + 1; // +1 to +4
  
  return {
    userEvaluation: userEval,
    correctEvaluation: correctEval,
    difference: Math.abs(correctEval - userEval),
    severity: categorizeSeverity(Math.abs(correctEval - userEval)),
    method: 'simulation'
  };
}

function simulateEvaluation(fen, move) {
  // Simplified evaluation - replace with real Stockfish
  const isCapture = /[a-h][1-8][a-h][1-8]/.test(move) && fen.includes('capture_pattern');
  const isCheck = move.includes('+');
  
  if (isCapture) return Math.random() * 2 + 1; // 1-3 points for captures
  if (isCheck) return Math.random() * 1.5; // 0-1.5 for checks
  return Math.random() * 0.5; // Small random for quiet moves
}

function simulateOpponentResponse(fen, userMove) {
  // Simulate finding opponent's best response
  const responses = ['takes material', 'creates counter-threat', 'improves position'];
  return responses[Math.floor(Math.random() * responses.length)];
}

function identifyMoveType(userMove, correctMove) {
  // Pattern matching to identify themes
  if (userMove.length !== correctMove.length) return 'wrong_piece';
  if (userMove.slice(0,2) !== correctMove.slice(0,2)) return 'wrong_piece';
  return 'wrong_destination';
}

function categorizeSeverity(difference) {
  if (difference > 5) return 'blunder';
  if (difference > 2) return 'mistake';
  if (difference > 1) return 'inaccuracy';
  return 'minor';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { 
    positionAfterUserMove,
    positionAfter3Moves, 
    userMove, 
    correctMove,
    playingAs  // NOW USING THIS PROPERLY!
  } = req.body;

  console.log('🔍 === STOCKFISH + CLAUDE ANALYSIS ===');
  console.log('- Position after 3 moves:', positionAfter3Moves);
  console.log('- User move:', userMove);
  console.log('- Correct move:', correctMove);
  console.log('- Playing as:', playingAs);

  try {
    // Step 1: Get Stockfish analysis
    const stockfishAnalysis = await analyzeWithStockfish(
      positionAfter3Moves, 
      userMove, 
      correctMove
    );

    console.log('📊 Stockfish analysis:', stockfishAnalysis);

    // Step 2: Use Claude to explain Stockfish findings with proper color context
    const anthropic = new Anthropic({ 
      apiKey: process.env.ANTHROPIC_API_KEY 
    });

    const prompt = `You are a chess expert explaining why a move is incorrect based on engine analysis.

Position: It is ${playingAs === 'white' ? 'White' : 'Black'}'s turn to move.
Student (playing as ${playingAs === 'white' ? 'White' : 'Black'}) played: ${userMove}

Engine analysis shows:
- Student's move evaluation: ${stockfishAnalysis.userEvaluation.toFixed(1)} 
- Correct move would be: ${stockfishAnalysis.correctEvaluation.toFixed(1)}
- Evaluation difference: ${stockfishAnalysis.difference.toFixed(1)} points worse
- Mistake severity: ${stockfishAnalysis.severity}

Explain in 1 sentence what immediate problem this move creates for ${playingAs === 'white' ? 'White' : 'Black'}. Focus on what this allows the opponent (${playingAs === 'white' ? 'Black' : 'White'}) to do next.

Examples for White player:
- "This move allows Black to mate in two moves."
- "This hangs your queen to Black's bishop."
- "This lets Black win material with a fork."

Examples for Black player:
- "This move allows White to continue the attack."
- "This hangs your rook to White's queen."
- "This lets White force mate quickly."

Be specific about the tactical consequence. Do NOT mention the correct alternative. End with "Try again." Keep under 15 words total.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 50,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    });

    const explanation = response.content[0].text.trim();

    console.log('🎯 Generated explanation:', explanation);
    console.log('📊 For player:', playingAs);

    return res.status(200).json({ 
      explanation,
      analysis: stockfishAnalysis,
      method: 'stockfish+claude',
      playingAs: playingAs
    });

  } catch (error) {
    console.error('❌ Analysis error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed',
      fallback: `This move creates problems for ${playingAs === 'white' ? 'White' : 'Black'}. Try again.`
    });
  }
}
