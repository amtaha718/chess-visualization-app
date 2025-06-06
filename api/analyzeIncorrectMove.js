// api/analyzeIncorrectMove.js
import Anthropic from '@anthropic-ai/sdk';

// Simple Stockfish evaluation (server-side)
async function evaluateWithStockfish(fen, userMove, correctMove) {
  // For now, we'll simulate Stockfish analysis
  // In production, you'd use actual Stockfish here
  
  // Simulate analysis based on move patterns
  const analysis = {
    userEvaluation: simulateEvaluation(fen, userMove),
    correctEvaluation: simulateEvaluation(fen, correctMove),
    opponentBestResponse: simulateOpponentResponse(fen, userMove),
    tacticalTheme: identifyMoveType(userMove, correctMove)
  };
  
  analysis.difference = analysis.correctEvaluation - analysis.userEvaluation;
  analysis.severity = categorizeSeverity(analysis.difference);
  
  return analysis;
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
    playingAs 
  } = req.body;

  console.log('🔍 === STOCKFISH + CLAUDE ANALYSIS ===');
  console.log('- Position after 3 moves:', positionAfter3Moves);
  console.log('- User move:', userMove);
  console.log('- Correct move:', correctMove);

  try {
    // Step 1: Get Stockfish analysis
    const stockfishAnalysis = await evaluateWithStockfish(
      positionAfter3Moves, 
      userMove, 
      correctMove
    );

    console.log('📊 Stockfish analysis:', stockfishAnalysis);

    // Step 2: Use Claude to explain Stockfish findings
    const anthropic = new Anthropic({ 
      apiKey: process.env.ANTHROPIC_API_KEY 
    });

    const prompt = `You are a chess expert explaining why a move is incorrect based on engine analysis.

Position after student's move (FEN): ${positionAfterUserMove}
Student played: ${userMove}

Engine analysis shows:
- Student's move evaluation: ${stockfishAnalysis.userEvaluation.toFixed(1)} 
- Correct move would be: ${stockfishAnalysis.correctEvaluation.toFixed(1)}
- Evaluation difference: ${stockfishAnalysis.difference.toFixed(1)} points worse
- Mistake severity: ${stockfishAnalysis.severity}
- Opponent's best response: ${stockfishAnalysis.opponentBestResponse}

Explain in 1 sentence why this move is problematic. Focus on the concrete consequence (loses material, allows mate, misses tactic, etc.). Do NOT mention the correct alternative or specific squares.

Examples:
- "This move hangs your rook to Black's bishop."
- "This allows a back-rank mate in two moves."
- "This move loses a piece to a simple tactic."

End with "Try again." Keep under 15 words total.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 50,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    });

    const explanation = response.content[0].text.trim();

    console.log('🎯 Generated explanation:', explanation);

    return res.status(200).json({ 
      explanation,
      analysis: stockfishAnalysis,
      method: 'stockfish+claude'
    });

  } catch (error) {
    console.error('❌ Analysis error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed',
      fallback: 'This move creates tactical problems. Try again.'
    });
  }
}
