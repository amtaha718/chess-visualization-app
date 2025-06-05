// api/generate-puzzle.js - Server-side puzzle generation for Vercel

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { difficulty = 'intermediate', userRating = 1500 } = req.body;
    
    console.log(`🎯 Generating puzzle for difficulty: ${difficulty}, rating: ${userRating}`);
    
    // For now, we'll use predefined tactical puzzles
    // Later we can integrate actual Stockfish analysis
    const puzzle = await generateTacticalPuzzle(difficulty, userRating);
    
    return res.status(200).json(puzzle);
    
  } catch (error) {
    console.error('❌ Puzzle generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate puzzle',
      details: error.message 
    });
  }
}

async function generateTacticalPuzzle(difficulty, userRating) {
  // Pre-defined tactical puzzles that work well for visualization
  const tacticalPuzzles = {
    beginner: [
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        moves: ['f3e5', 'd8h4', 'e5f7', 'e8f7', 'c4f7', 'f8e7'],
        themes: ['fork', 'double-attack'],
        explanation: 'A knight fork followed by a bishop capture sequence.'
      },
      {
        fen: 'r2qkb1r/ppp2ppp/2n2n2/3pp3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6',
        moves: ['f3e5', 'c6e5', 'd3d4', 'e5c4', 'd1d8', 'e8d8'],
        themes: ['pin', 'attack'],
        explanation: 'Using a pin to win material through tactical pressure.'
      }
    ],
    
    intermediate: [
      {
        fen: 'r3k2r/ppp2ppp/2n1b3/3p4/2PP4/2N1P3/PP3PPP/R1BQKB1R w KQkq - 0 8',
        moves: ['c3d5', 'e6d5', 'c4d5', 'c6e7', 'd1h5', 'g7g6', 'h5e5', 'f7f6'],
        themes: ['piece-sacrifice', 'attack'],
        explanation: 'A piece sacrifice leading to a strong attacking position.'
      },
      {
        fen: 'r1bq1rk1/pp3ppp/2n1pn2/3p4/1bPP4/2N1PN2/PP1B1PPP/R2Q1RK1 w - - 0 9',
        moves: ['d2h6', 'g7h6', 'd1d3', 'f6g4', 'd3h3', 'h6g7', 'h3h7', 'g8f8'],
        themes: ['attack', 'mating-attack'],
        explanation: 'A sacrificial attack on the kingside leading to mate threats.'
      }
    ],
    
    advanced: [
      {
        fen: 'r2q1rk1/pp2bppp/2n1p3/3p4/3P4/2N1P3/PP1NBPPP/R2Q1RK1 w - - 0 10',
        moves: ['e2h5', 'g7g6', 'h5g6', 'h7g6', 'd1h1', 'f8h8', 'h1h8', 'g8h8', 'c3d5', 'e7d6'],
        themes: ['sacrifice', 'combination'],
        explanation: 'A complex sacrificial combination exploiting weak king safety.'
      }
    ]
  };

  // Select appropriate puzzle set
  const puzzleSet = tacticalPuzzles[difficulty] || tacticalPuzzles.intermediate;
  const selectedPuzzle = puzzleSet[Math.floor(Math.random() * puzzleSet.length)];
  
  // Calculate rating based on difficulty and puzzle complexity
  const baseRating = {
    beginner: 1200,
    intermediate: 1500,
    advanced: 1800,
    expert: 2100
  }[difficulty] || 1500;
  
  const rating = baseRating + (selectedPuzzle.moves.length - 4) * 25;
  
  return {
    id: `tactical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fen: selectedPuzzle.fen,
    moves: selectedPuzzle.moves,
    explanation: selectedPuzzle.explanation,
    difficulty,
    rating,
    themes: selectedPuzzle.themes,
    source: 'curated'
  };
}

// Alternative: If you want to try actual Stockfish on server
async function generateWithStockfish(difficulty, userRating) {
  try {
    // This would require installing stockfish on the Vercel serverless function
    // which has limitations, so we'll skip this for now
    console.log('⚠️ Server-side Stockfish not implemented yet');
    return await generateTacticalPuzzle(difficulty, userRating);
  } catch (error) {
    console.error('Stockfish generation failed:', error);
    return await generateTacticalPuzzle(difficulty, userRating);
  }
}
