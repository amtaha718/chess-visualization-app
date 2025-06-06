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
  
  // Pattern 1: Wrong piece entirely
  if (userFrom !== correctFrom) {
    return `This moves the wrong piece. Try again.`;
  }
  
  // Pattern 2: Right piece, wrong destination
  if (userFrom === correctFrom && userTo !== correctTo) {
    return `This piece needs to go elsewhere. Try again.`;
  }
  
  // Pattern 3: Defensive vs aggressive moves
  const isUserMoveDefensive = isDefensiveSquare(userTo);
  const isCorrectMoveAggressive = isAggressiveSquare(correctTo);
  
  if (isUserMoveDefensive && isCorrectMoveAggressive) {
    return `This move is too passive. Try again.`;
  }
  
  // Pattern 4: Center vs edge
  const userToCenter = isCenterSquare(userTo);
  const correctToCenter = isCenterSquare(correctTo);
  
  if (!userToCenter && correctToCenter) {
    return `This move ignores the center. Try again.`;
  }
  
  // Pattern 5: Generic tactical themes based on move type
  if (isCheckMove(userMove) && !isCheckMove(correctMove)) {
    return `This check doesn't help. Try again.`;
  }
  
  if (isCaptureMove(userMove) && !isCaptureMove(correctMove)) {
    return `This capture isn't the point. Try again.`;
  }
  
  // Default patterns by color
  const genericResponses = {
    white: [
      "This move doesn't create enough pressure. Try again.",
      "This misses White's main opportunity. Try again.", 
      "This doesn't improve White's position. Try again."
    ],
    black: [
      "This move doesn't defend properly. Try again.",
      "This misses Black's best chance. Try again.",
      "This doesn't improve Black's position. Try again."
    ]
  };
  
  const responses = genericResponses[playingAs] || genericResponses.black;
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
