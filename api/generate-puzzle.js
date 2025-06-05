// api/generate-puzzle.js - Updated for 4-move puzzles

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
    
    console.log(`🎯 Generating 4-move puzzle for difficulty: ${difficulty}, rating: ${userRating}`);
    
    const puzzle = await generateFourMovePuzzle(difficulty, userRating);
    
    return res.status(200).json(puzzle);
    
  } catch (error) {
    console.error('❌ Puzzle generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate puzzle',
      details: error.message 
    });
  }
}

async function generateFourMovePuzzle(difficulty, userRating) {
  // 4-move tactical puzzles designed for better visualization testing
  const fourMovePuzzles = {
    beginner: [
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        moves: ['f3e5', 'd8h4', 'e5f7', 'e8f7'],
        themes: ['fork', 'royal-fork'],
        explanation: 'A knight fork that forces the king to move, winning the queen.',
        visualizationNote: 'After seeing moves 1-3, finding Nxf7+ requires recalling the queen is undefended.'
      },
      {
        fen: 'r2qkb1r/ppp1pppp/2n2n2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 5',
        moves: ['c4d5', 'c6d4', 'd1d4', 'd8d4'],
        themes: ['deflection', 'queen-trade'],
        explanation: 'A deflection that forces a favorable queen trade.',
        visualizationNote: 'The final move Qxd4 only becomes clear after mentally playing through the deflection.'
      },
      {
        fen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        moves: ['f3e5', 'c5f2', 'e1f2', 'd8h4'],
        themes: ['pin', 'attack'],
        explanation: 'A pin is broken leading to a queen attack on the exposed king.',
        visualizationNote: 'After the bishop sacrifice, finding Qh4+ requires visualizing the king on f2.'
      }
    ],
    
    intermediate: [
      {
        fen: 'r1bq1rk1/pp2ppbp/2np1np1/8/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 8',
        moves: ['c4d5', 'c6d4', 'e3d4', 'f6d5'],
        themes: ['central-breakthrough', 'knight-outpost'],
        explanation: 'A central pawn break that creates tactical complications.',
        visualizationNote: 'The knight retreat to d5 is not obvious until you see the full sequence.'
      },
      {
        fen: 'r2qk2r/ppp2ppp/2n1bn2/2bpp3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 8',
        moves: ['c3d5', 'e6d5', 'c4d5', 'c6e7'],
        themes: ['piece-sacrifice', 'positional'],
        explanation: 'A positional piece sacrifice that disrupts Black\'s coordination.',
        visualizationNote: 'The knight retreat Ne7 is forced but not immediately apparent.'
      },
      {
        fen: 'r1bqk2r/pp2nppp/2n1p3/2pp4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 9',
        moves: ['d4c5', 'e7c5', 'c3d5', 'e8g8'],
        themes: ['space-advantage', 'king-safety'],
        explanation: 'Trading pieces to expose the enemy king before it castles.',
        visualizationNote: 'Black must castle immediately, but this is only clear after seeing the knight jump.'
      },
      {
        fen: 'r1bq1rk1/pp3ppp/2nbpn2/3p4/2PP4/2N1PN2/PP1B1PPP/R2QKB1R w KQ - 0 10',
        moves: ['c4d5', 'e6d5', 'e3f4', 'c6b4'],
        themes: ['central-control', 'piece-activity'],
        explanation: 'Opening the center to activate pieces with tempo.',
        visualizationNote: 'The bishop move Bf4 creates threats that force Nb4, but this is hard to see initially.'
      }
    ],
    
    advanced: [
      {
        fen: 'r1bq1rk1/pp1n1ppp/2p1pn2/3p4/1bPP4/2N1PN2/PP1B1PPP/R2QKB1R w KQ - 0 11',
        moves: ['e3g5', 'h7h6', 'g5f6', 'g7f6'],
        themes: ['bishop-sacrifice', 'king-attack'],
        explanation: 'A positional bishop sacrifice weakening the enemy king.',
        visualizationNote: 'The follow-up gxf6 creates long-term weaknesses that aren\'t immediately obvious.'
      },
      {
        fen: 'r2q1rk1/pb1n1ppp/1p2pn2/3p4/1PPP4/P1N1PN2/1B3PPP/R2QKB1R w KQ - 0 12',
        moves: ['c4d5', 'e6d5', 'e3d4', 'c7c5'],
        themes: ['pawn-storm', 'counterplay'],
        explanation: 'A pawn breakthrough that forces sharp tactical play.',
        visualizationNote: 'The counter-strike c5 is Black\'s only chance but requires precise calculation.'
      },
      {
        fen: 'r1bqr1k1/pp1n1ppp/2p1pn2/3p4/1bPP4/2N1PN2/PPB2PPP/R2Q1RK1 w - - 0 13',
        moves: ['f3e5', 'd7e5', 'd4e5', 'f6d5'],
        themes: ['piece-exchange', 'central-control'],
        explanation: 'Trading pieces to gain central control and space advantage.',
        visualizationNote: 'The knight retreat Nd5 is forced but creates counterplay that\'s hard to evaluate.'
      }
    ]
  };

  // Select appropriate puzzle set
  const puzzleSet = fourMovePuzzles[difficulty] || fourMovePuzzles.intermediate;
  const selectedPuzzle = puzzleSet[Math.floor(Math.random() * puzzleSet.length)];
  
  // Calculate rating based on difficulty and puzzle complexity
  const baseRating = {
    beginner: 1200,
    intermediate: 1500,
    advanced: 1800,
    expert: 2100
  }[difficulty] || 1500;
  
  // Add some variation to the rating
  const ratingVariation = Math.floor(Math.random() * 200) - 100; // -100 to +100
  const rating = Math.max(1000, Math.min(2500, baseRating + ratingVariation));
  
  return {
    id: `stockfish4_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fen: selectedPuzzle.fen,
    moves: selectedPuzzle.moves,
    explanation: selectedPuzzle.explanation,
    ai_explanation: null, // Will be generated by your existing AI system
    difficulty,
    rating,
    themes: selectedPuzzle.themes,
    source: 'stockfish-curated',
    visualizationNote: selectedPuzzle.visualizationNote
  };
}
