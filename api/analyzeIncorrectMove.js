// api/analyzeIncorrectMove.js - SIMPLE PATTERN-BASED EXPLANATIONS

export default async function handler(req, res) {
  console.log('🔍 === PATTERN-BASED ANALYSIS ===');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { 
      playingAs, 
      userMove,
      correctMove 
    } = req.body;
    
    console.log('- Playing as:', playingAs);
    console.log('- User move:', userMove);
    console.log('- Correct move:', correctMove);

    // Analyze move patterns to determine explanation
    const explanation = analyzeMovePurpose(userMove, correctMove, playingAs);

    console.log('🎯 Pattern-based explanation:', explanation);

    return res.status(200).json({ 
      explanation,
      method: 'pattern_analysis',
      playingAs: playingAs
    });

  } catch (error) {
    console.error('❌ Pattern analysis error:', error);
    
    const { playingAs } = req.body || {};
    const fallback = playingAs === 'white' 
      ? "This move doesn't achieve White's goal. Try again."
      : "This move doesn't achieve Black's goal. Try again.";

    return res.status(200).json({ 
      explanation: fallback,
      method: 'fallback',
      playingAs: playingAs
    });
  }
}

function analyzeMovePurpose(userMove, correctMove, playingAs) {
  // Basic move pattern analysis
  const userFrom = userMove.slice(0, 2);
  const userTo = userMove.slice(2, 4);
  const correctFrom = correctMove.slice(0, 2);
  const correctTo = correctMove.slice(2, 4);
  
  const opponent = playingAs === 'white' ? 'Black' : 'White';
  
  // Enhanced Pattern Analysis with Chess Consequences
  
  // Pattern 1: Wrong piece - but explain the consequence
  if (userFrom !== correctFrom) {
    const consequences = [
      "This leaves your position vulnerable. Try again.",
      "This ignores the main threat. Try again.",
      "This doesn't address the critical issue. Try again."
    ];
    return consequences[Math.floor(Math.random() * consequences.length)];
  }
  
  // Pattern 2: Right piece, wrong destination - explain why destination matters
  if (userFrom === correctFrom && userTo !== correctTo) {
    const destinationErrors = [
      "This square doesn't accomplish the goal. Try again.",
      "This leaves you exposed to tactics. Try again.", 
      "This puts your piece in danger. Try again."
    ];
    return destinationErrors[Math.floor(Math.random() * destinationErrors.length)];
  }
  
  // Pattern 3: Defensive vs aggressive - with chess reasoning
  const isUserMoveDefensive = isDefensiveSquare(userTo);
  const isCorrectMoveAggressive = isAggressiveSquare(correctTo);
  
  if (isUserMoveDefensive && isCorrectMoveAggressive) {
    const passiveErrors = [
      "This move is too passive for the position. Try again.",
      "This doesn't create enough pressure. Try again.",
      "This misses the attacking opportunity. Try again."
    ];
    return passiveErrors[Math.floor(Math.random() * passiveErrors.length)];
  }
  
  // Pattern 4: Center control with tactical reasoning
  const userToCenter = isCenterSquare(userTo);
  const correctToCenter = isCenterSquare(correctTo);
  
  if (!userToCenter && correctToCenter) {
    return "This ignores important central control. Try again.";
  }
  
  // Pattern 5: Move type analysis with consequences
  if (isCheckMove(userMove) && !isCheckMove(correctMove)) {
    return "This check doesn't lead anywhere useful. Try again.";
  }
  
  if (isCaptureMove(userMove) && !isCaptureMove(correctMove)) {
    const captureErrors = [
      "This capture isn't worth it. Try again.",
      "This wins material but misses something bigger. Try again."
    ];
    return captureErrors[Math.floor(Math.random() * captureErrors.length)];
  }
  
  // Enhanced color-specific patterns with chess reasoning
  const enhancedResponses = {
    white: [
      "This doesn't maintain White's initiative. Try again.",
      "This allows Black to equalize. Try again.",
      "This misses White's tactical opportunity. Try again.",
      "This leaves White's pieces uncoordinated. Try again.",
      "This doesn't exploit Black's weakness. Try again."
    ],
    black: [
      "This doesn't defend against White's threats. Try again.",
      "This allows White to increase pressure. Try again.",
      "This misses Black's counterplay. Try again.",
      "This leaves Black's king too exposed. Try again.",
      "This doesn't neutralize White's attack. Try again."
    ]
  };
  
  const responses = enhancedResponses[playingAs] || enhancedResponses.black;
  return responses[Math.floor(Math.random() * responses.length)];
}

// Helper functions for move pattern recognition
function isDefensiveSquare(square) {
  // Back ranks and corners are generally defensive
  const rank = square[1];
  return rank === '1' || rank === '8';
}

function isAggressiveSquare(square) {
  // Central ranks are generally aggressive
  const rank = parseInt(square[1]);
  return rank >= 3 && rank <= 6;
}

function isCenterSquare(square) {
  const file = square[0];
  const rank = square[1];
  return ['d', 'e'].includes(file) && ['4', '5'].includes(rank);
}

function isCheckMove(move) {
  // This is simplified - in reality you'd need board context
  return move.includes('+');
}

function isCaptureMove(move) {
  // This is simplified - in reality you'd need board context  
  return move.includes('x');
}
