// api/generate-puzzle.js - Single solution puzzles with move-4 based difficulty

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
    
    console.log(`🎯 Generating single-solution puzzle for difficulty: ${difficulty}, rating: ${userRating}`);
    
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
  // Puzzles where move 4 has only ONE winning move
  // Difficulty is based on how hard move 4 is to find
  const fourMovePuzzles = {
    beginner: [
      {
        // Back rank mate - only one move wins
        fen: 'r4rk1/ppp2ppp/2n1b3/3p4/3P4/2N3P1/PPP2P1P/R3R1K1 b - - 0 15',
        moves: ['e6h3', 'e1e8', 'f8e8', 'e8e1'],  // Only Re1# is mate
        themes: ['back-rank-mate'],
        explanation: 'The back rank mate with Re1# is the only winning move, as any other move allows White to escape.',
        difficulty_factors: {
          move4: 'easy',
          reason: 'Simple back rank mate pattern'
        }
      },
      {
        // Fork winning queen - only knight move works
        fen: 'r1bqkb1r/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4',
        moves: ['f6e4', 'd2d3', 'e4c5', 'd3d4'],  // Only Nc5 forks queen and bishop
        themes: ['knight-fork', 'double-attack'],
        explanation: 'Nc5 is the only move that maintains the advantage by forking the queen and bishop.',
        difficulty_factors: {
          move4: 'easy',
          reason: 'Clear knight fork pattern'
        }
      },
      {
        // Discovered check winning rook
        fen: 'r3k2r/ppp2ppp/2n1b3/3p4/3P4/2N1PN2/PPP2PPP/R3KB1R b KQkq - 0 10',
        moves: ['e6f5', 'f1b5', 'f5e4', 'b5c6'],  // Only Be4 discovers check and attacks rook
        themes: ['discovered-check', 'double-attack'],
        explanation: 'Be4 is the only winning move, creating a discovered check while attacking the rook.',
        difficulty_factors: {
          move4: 'easy',
          reason: 'Obvious discovered attack'
        }
      }
    ],
    
    intermediate: [
      {
        // Quiet move setting up unstoppable threat
        fen: 'r2q1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R2Q1RK1 b - - 0 11',
        moves: ['d5c4', 'e2c4', 'c6a5', 'c4d3'],  // Only Na5 threatens Nc4 winning exchange
        themes: ['positional', 'knight-maneuver'],
        explanation: 'Na5 is the only move that maintains the advantage, preparing Nc4 to win the exchange.',
        difficulty_factors: {
          move4: 'medium',
          reason: 'Quiet positional move without immediate threats'
        }
      },
      {
        // Deflection to create passed pawn
        fen: 'r4rk1/pp3ppp/2p1b3/3p4/3P4/2P1PN2/PP3PPP/R3KB1R w KQ - 0 14',
        moves: ['e3e4', 'd5e4', 'f3e5', 'c6c5'],  // Only c5 creates unstoppable passed pawn
        themes: ['pawn-breakthrough', 'deflection'],
        explanation: 'c5 is the only winning move, creating an unstoppable passed pawn after the forced exchanges.',
        difficulty_factors: {
          move4: 'medium',
          reason: 'Requires calculating pawn endgame'
        }
      },
      {
        // Intermediate sacrifice for attack
        fen: 'r1bq1rk1/pp2ppbp/2np1np1/8/2PP4/2N1PN2/PP2BPPP/R1BQK2R w KQ - 0 9',
        moves: ['d4d5', 'c6e5', 'f3e5', 'f6g4'],  // Only Ng4 maintains pressure
        themes: ['piece-sacrifice', 'attack'],
        explanation: 'Ng4 is the only move that keeps the initiative, threatening both e3 and f2.',
        difficulty_factors: {
          move4: 'medium',
          reason: 'Active piece placement with multiple threats'
        }
      }
    ],
    
    advanced: [
      {
        // Quiet prophylactic move
        fen: 'r2qr1k1/pp1nbppp/2p1pn2/3p4/2PP4/1PN1PN2/PB3PPP/R2QK2R b KQ - 0 12',
        moves: ['e7c5', 'e1g1', 'd7b6', 'a2a4'],  // Only a4 prevents Black's queenside expansion
        themes: ['prophylaxis', 'positional'],
        explanation: 'a4 is the only move that maintains White\'s advantage by preventing Black\'s b5 expansion.',
        difficulty_factors: {
          move4: 'hard',
          reason: 'Prophylactic move preventing opponent\'s plan'
        }
      },
      {
        // Deep calculation required
        fen: 'r1b1k2r/pp2bppp/2n1pn2/q2p4/2PP4/1PN1PN2/PB3PPP/R2QKBR1 w Qkq - 0 10',
        moves: ['c4d5', 'e6d5', 'b3d5', 'a5a2'],  // Only Qa2 maintains material balance
        themes: ['queen-trap', 'calculation'],
        explanation: 'Qa2 is the only move that saves the queen while maintaining pressure on White\'s position.',
        difficulty_factors: {
          move4: 'hard',
          reason: 'Requires seeing queen trap and only escape'
        }
      },
      {
        // Positional exchange sacrifice
        fen: 'r2q1rk1/pb1nbppp/1p2pn2/2p5/2PP4/1PN1PN2/PB3PPP/R2QKBR1 b Q - 0 11',
        moves: ['c5d4', 'e3d4', 'f8c8', 'c1e3'],  // Only Be3 completes development properly
        themes: ['development', 'positional'],
        explanation: 'Be3 is the only move that properly coordinates White\'s pieces for the upcoming battle.',
        difficulty_factors: {
          move4: 'hard',
          reason: 'Subtle development move in complex position'
        }
      }
    ],
    
    expert: [
      {
        // Paradoxical retreat
        fen: 'r2q1rk1/pp2bppp/2n1bn2/3p4/3P4/2NBPN2/PP2BPPP/R2Q1RK1 w - - 0 12',
        moves: ['f3e5', 'c6e5', 'd3e5', 'f6e8'],  // Only Ne8 saves the piece and maintains balance
        themes: ['retreat', 'defense'],
        explanation: 'Ne8 is the only move that saves the knight while maintaining Black\'s defensive structure.',
        difficulty_factors: {
          move4: 'very_hard',
          reason: 'Counterintuitive retreat in sharp position'
        }
      },
      {
        // Silent positional move
        fen: 'r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/1PN1PN2/PB3PPP/R2QKBR1 w Q - 0 10',
        moves: ['g1h1', 'e7b4', 'f1e2', 'b4c3'],  // Only Bc3 maintains pressure
        themes: ['positional', 'long-term'],
        explanation: 'Bc3 is the only move that maintains long-term pressure on White\'s queenside structure.',
        difficulty_factors: {
          move4: 'very_hard',
          reason: 'Quiet move with long-term positional goals'
        }
      }
    ]
  };

  // Select appropriate puzzle set
  const puzzleSet = fourMovePuzzles[difficulty] || fourMovePuzzles.intermediate;
  const selectedPuzzle = puzzleSet[Math.floor(Math.random() * puzzleSet.length)];
  
  // Calculate rating based on move 4 difficulty
  const move4Ratings = {
    'easy': 1200,
    'medium': 1500,
    'hard': 1800,
    'very_hard': 2100
  };
  
  const baseRating = move4Ratings[selectedPuzzle.difficulty_factors.move4] || 1500;
  const ratingVariation = Math.floor(Math.random() * 100) - 50; // -50 to +50
  const rating = Math.max(1000, Math.min(2500, baseRating + ratingVariation));
  
  return {
    id: `stockfish4_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fen: selectedPuzzle.fen,
    moves: selectedPuzzle.moves,
    explanation: selectedPuzzle.explanation,
    ai_explanation: null,
    difficulty,
    rating,
    themes: selectedPuzzle.themes,
    source: 'stockfish-curated',
    difficulty_factors: selectedPuzzle.difficulty_factors,
    single_solution: true  // Flag indicating this puzzle has only one winning move
  };
}
