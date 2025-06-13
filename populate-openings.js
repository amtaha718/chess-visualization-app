// scripts/populate-openings.js - Comprehensive Opening Data Seeder

import { createClient } from '@supabase/supabase-js';
import { Chess } from 'chess.js';

// Initialize Supabase client
const supabaseUrl = 'https://hwnpylgiiurhcftbmwzh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3bnB5bGdpaXVyaGNmdGJtd3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODg2MDQsImV4cCI6MjA2NDQ2NDYwNH0.30vJugiZ3DWeTR53hU6R2sCrVqQ6kR-JaqKWi6RDILE';
const supabase = createClient(supabaseUrl, supabaseKey);

// Comprehensive Opening Database
const CHESS_OPENINGS = {
  // ========== BEGINNER OPENINGS ==========
  
  "italian-game": {
    name: "Italian Game",
    eco_code: "C50",
    category: "Open",
    difficulty: "beginner",
    description: "One of the oldest chess openings, focusing on rapid development and central control.",
    popularity_score: 95,
    variations: [
      {
        variation_name: "Classical Italian",
        moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"],
        key_ideas: ["Control center", "Develop pieces quickly", "Castle early", "Attack f7 square"],
        notes: "The most natural continuation, developing pieces toward the center.",
        is_main_line: true,
        frequency_score: 85
      },
      {
        variation_name: "Italian Gambit",
        moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "d3", "f5"],
        key_ideas: ["Aggressive play", "Sacrifice for development", "Quick kingside attack"],
        notes: "A sharp gambit sacrificing material for rapid development.",
        is_main_line: false,
        frequency_score: 25
      },
      {
        variation_name: "Evans Gambit",
        moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "b4", "Bxb4", "c3", "Ba5"],
        key_ideas: ["Pawn sacrifice", "Central control", "Rapid development", "Initiative"],
        notes: "Famous gambit offering a pawn for powerful central control.",
        is_main_line: false,
        frequency_score: 15
      }
    ]
  },

  "ruy-lopez": {
    name: "Ruy López (Spanish Opening)",
    eco_code: "C60",
    category: "Open",
    difficulty: "beginner",
    description: "Named after Spanish priest Ruy López, this opening aims for long-term positional pressure.",
    popularity_score: 100,
    variations: [
      {
        variation_name: "Berlin Defense",
        moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6"],
        key_ideas: ["Solid defense", "Simplification", "Endgame advantage"],
        notes: "Popularized by Vladimir Kramnik, leading to simplified positions.",
        is_main_line: true,
        frequency_score: 90
      },
      {
        variation_name: "Morphy Defense",
        moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6"],
        key_ideas: ["Central control", "Piece development", "King safety"],
        notes: "The most classical continuation of the Spanish Opening.",
        is_main_line: true,
        frequency_score: 85
      },
      {
        variation_name: "Exchange Variation",
        moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Bxc6", "dxc6"],
        key_ideas: ["Doubled pawns", "Bishops vs Knights", "Endgame play"],
        notes: "Simplifying variation creating doubled pawns for Black.",
        is_main_line: false,
        frequency_score: 40
      }
    ]
  },

  "queens-gambit": {
    name: "Queen's Gambit",
    eco_code: "D06",
    category: "Closed",
    difficulty: "beginner",
    description: "A classical opening offering a pawn to gain central control and rapid development.",
    popularity_score: 90,
    variations: [
      {
        variation_name: "Queen's Gambit Accepted",
        moves: ["d4", "d5", "c4", "dxc4", "Nf3", "Nf6"],
        key_ideas: ["Accept the gambit", "Return material", "Develop pieces"],
        notes: "Black accepts the pawn but should return it for good development.",
        is_main_line: true,
        frequency_score: 70
      },
      {
        variation_name: "Queen's Gambit Declined",
        moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6"],
        key_ideas: ["Solid structure", "Central control", "Gradual development"],
        notes: "The most solid response, maintaining central tension.",
        is_main_line: true,
        frequency_score: 85
      },
      {
        variation_name: "Slav Defense",
        moves: ["d4", "d5", "c4", "c6", "Nf3", "Nf6"],
        key_ideas: ["Protect d5 pawn", "Maintain structure", "Bishop development"],
        notes: "Protecting the d5 pawn with the c-pawn instead of e6.",
        is_main_line: false,
        frequency_score: 60
      }
    ]
  },

  "french-defense": {
    name: "French Defense",
    eco_code: "C02",
    category: "Semi-Open",
    difficulty: "beginner",
    description: "A solid defense creating a pawn chain and preparing counterplay.",
    popularity_score: 80,
    variations: [
      {
        variation_name: "Advance Variation",
        moves: ["e4", "e6", "d4", "d5", "e5", "c5"],
        key_ideas: ["Space advantage", "Pawn chain", "Kingside attack"],
        notes: "White advances in the center, gaining space but creating targets.",
        is_main_line: true,
        frequency_score: 65
      },
      {
        variation_name: "Exchange Variation",
        moves: ["e4", "e6", "d4", "d5", "exd5", "exd5"],
        key_ideas: ["Simplified structure", "Equal material", "Piece activity"],
        notes: "A simplifying variation leading to symmetrical pawn structures.",
        is_main_line: false,
        frequency_score: 45
      },
      {
        variation_name: "Winawer Variation",
        moves: ["e4", "e6", "d4", "d5", "Nc3", "Bb4"],
        key_ideas: ["Pin the knight", "Central pressure", "Dynamic play"],
        notes: "Sharp variation with tactical complications and imbalanced positions.",
        is_main_line: false,
        frequency_score: 55
      }
    ]
  },

  // ========== INTERMEDIATE OPENINGS ==========

  "sicilian-defense": {
    name: "Sicilian Defense",
    eco_code: "B20",
    category: "Semi-Open",
    difficulty: "intermediate",
    description: "The most popular response to e4, leading to asymmetrical and sharp positions.",
    popularity_score: 100,
    variations: [
      {
        variation_name: "Open Sicilian - Dragon Variation",
        moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6"],
        key_ideas: ["Fianchetto bishop", "Long diagonal", "Kingside attack", "Opposite castling"],
        notes: "The most aggressive Sicilian variation with mutual attacks.",
        is_main_line: true,
        frequency_score: 75
      },
      {
        variation_name: "Najdorf Variation",
        moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
        key_ideas: ["Flexible pawn structure", "Prevent Nb5", "Central control"],
        notes: "Fischer's favorite, offering maximum flexibility and complexity.",
        is_main_line: true,
        frequency_score: 80
      },
      {
        variation_name: "Accelerated Dragon",
        moves: ["e4", "c5", "Nf3", "g6", "d4", "cxd4", "Nxd4", "Bg7"],
        key_ideas: ["Quick fianchetto", "Avoid Yugoslav Attack", "Solid structure"],
        notes: "Faster development of the kingside bishop.",
        is_main_line: false,
        frequency_score: 60
      },
      {
        variation_name: "Closed Sicilian",
        moves: ["e4", "c5", "Nc3", "Nc6", "g3", "g6", "Bg2", "Bg7"],
        key_ideas: ["Kingside attack", "Piece play", "Avoid theory"],
        notes: "Positional approach avoiding main line theory.",
        is_main_line: false,
        frequency_score: 50
      }
    ]
  },

  "caro-kann": {
    name: "Caro-Kann Defense",
    eco_code: "B12",
    category: "Semi-Open",
    difficulty: "intermediate",
    description: "A solid defense similar to French but avoiding blocked light-squared bishop.",
    popularity_score: 75,
    variations: [
      {
        variation_name: "Classical Variation",
        moves: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5"],
        key_ideas: ["Develop bishop", "Solid structure", "Central control"],
        notes: "The most natural development, getting the problem bishop out.",
        is_main_line: true,
        frequency_score: 80
      },
      {
        variation_name: "Advance Variation",
        moves: ["e4", "c6", "d4", "d5", "e5", "Bf5"],
        key_ideas: ["Space advantage", "Piece pressure", "Kingside play"],
        notes: "Similar to French Advance but with better bishop development.",
        is_main_line: false,
        frequency_score: 65
      },
      {
        variation_name: "Exchange Variation",
        moves: ["e4", "c6", "d4", "d5", "exd5", "cxd5"],
        key_ideas: ["Simplified position", "Central control", "Piece activity"],
        notes: "Leading to symmetrical structures with balanced play.",
        is_main_line: false,
        frequency_score: 40
      }
    ]
  },

  "kings-indian": {
    name: "King's Indian Defense",
    eco_code: "E60",
    category: "Closed",
    difficulty: "intermediate",
    description: "A hypermodern defense allowing White central control while preparing counterattacks.",
    popularity_score: 85,
    variations: [
      {
        variation_name: "Classical Variation",
        moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "Nf3", "O-O"],
        key_ideas: ["Fianchetto setup", "Central counter", "Kingside attack"],
        notes: "The main line with both sides developing harmoniously.",
        is_main_line: true,
        frequency_score: 75
      },
      {
        variation_name: "Sämisch Variation",
        moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "f3", "O-O"],
        key_ideas: ["Prevent Ng4", "Strong center", "Kingside expansion"],
        notes: "Aggressive setup preventing Black's typical knight maneuver.",
        is_main_line: false,
        frequency_score: 55
      },
      {
        variation_name: "Four Pawns Attack",
        moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "f4", "O-O"],
        key_ideas: ["Maximum center", "Space advantage", "Quick attack"],
        notes: "Most aggressive approach with four central pawns.",
        is_main_line: false,
        frequency_score: 35
      }
    ]
  },

  // ========== ADVANCED OPENINGS ==========

  "nimzo-indian": {
    name: "Nimzo-Indian Defense",
    eco_code: "E20",
    category: "Closed",
    difficulty: "advanced",
    description: "A hypermodern defense targeting White's central control with piece pressure.",
    popularity_score: 90,
    variations: [
      {
        variation_name: "Classical Variation",
        moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "Qc2", "O-O"],
        key_ideas: ["Prevent doubled pawns", "Flexible development", "Central control"],
        notes: "The most flexible continuation avoiding structural damage.",
        is_main_line: true,
        frequency_score: 70
      },
      {
        variation_name: "Rubinstein Variation",
        moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "e3", "O-O"],
        key_ideas: ["Solid development", "Bishop pair", "Central play"],
        notes: "Solid positional approach maintaining piece harmony.",
        is_main_line: true,
        frequency_score: 65
      },
      {
        variation_name: "Sämisch Variation",
        moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "a3", "Bxc3+", "bxc3", "c5"],
        key_ideas: ["Accept doubled pawns", "Bishop pair", "Central dominance"],
        notes: "Accepting structural damage for the bishop pair advantage.",
        is_main_line: false,
        frequency_score: 50
      }
    ]
  },

  "english-opening": {
    name: "English Opening",
    eco_code: "A10",
    category: "Flank",
    difficulty: "advanced",
    description: "A flexible opening controlling central squares from the flank.",
    popularity_score: 80,
    variations: [
      {
        variation_name: "Symmetrical Variation",
        moves: ["c4", "c5", "Nc3", "Nc6", "g3", "g6", "Bg2", "Bg7"],
        key_ideas: ["Mirror play", "Flexible development", "Central break"],
        notes: "Both sides adopt similar setups in this symmetrical line.",
        is_main_line: true,
        frequency_score: 70
      },
      {
        variation_name: "King's Indian Attack",
        moves: ["c4", "Nf6", "Nc3", "g6", "g3", "Bg7", "Bg2", "O-O"],
        key_ideas: ["Kingside fianchetto", "Central control", "Piece harmony"],
        notes: "A setup-based approach with flexible piece development.",
        is_main_line: false,
        frequency_score: 60
      },
      {
        variation_name: "Reversed Sicilian",
        moves: ["c4", "e5", "Nc3", "Nf6", "g3", "d5", "cxd5", "Nxd5"],
        key_ideas: ["Extra tempo", "Central tension", "Piece activity"],
        notes: "Similar to Sicilian Defense but with an extra tempo for White.",
        is_main_line: false,
        frequency_score: 55
      }
    ]
  },

  "grunfeld-defense": {
    name: "Grünfeld Defense",
    eco_code: "D70",
    category: "Closed",
    difficulty: "advanced",
    description: "A hypermodern defense allowing and then attacking White's pawn center.",
    popularity_score: 85,
    variations: [
      {
        variation_name: "Exchange Variation",
        moves: ["d4", "Nf6", "c4", "g6", "Nc3", "d5", "cxd5", "Nxd5", "e4", "Nxc3", "bxc3", "Bg7"],
        key_ideas: ["Central control", "Piece activity", "Dynamic counterplay"],
        notes: "The main theoretical battleground of the Grünfeld.",
        is_main_line: true,
        frequency_score: 80
      },
      {
        variation_name: "Russian System",
        moves: ["d4", "Nf6", "c4", "g6", "Nc3", "d5", "Qb3", "dxc4", "Qxc4", "Bg7"],
        key_ideas: ["Quick queen development", "Central pressure", "Tactical play"],
        notes: "Aggressive system putting immediate pressure on Black.",
        is_main_line: false,
        frequency_score: 60
      }
    ]
  },

  // ========== GAMBIT OPENINGS ==========

  "kings-gambit": {
    name: "King's Gambit",
    eco_code: "C30",
    category: "Open",
    difficulty: "advanced",
    description: "An aggressive gambit sacrificing the f-pawn for rapid development and attack.",
    popularity_score: 60,
    variations: [
      {
        variation_name: "King's Gambit Accepted",
        moves: ["e4", "e5", "f4", "exf4", "Nf3", "g5"],
        key_ideas: ["Rapid development", "Central control", "Kingside attack"],
        notes: "Black accepts the gambit and tries to hold the extra material.",
        is_main_line: true,
        frequency_score: 70
      },
      {
        variation_name: "King's Gambit Declined",
        moves: ["e4", "e5", "f4", "Bc5"],
        key_ideas: ["Refuse the pawn", "Solid development", "Counter-pressure"],
        notes: "Black declines the gambit and develops pieces instead.",
        is_main_line: false,
        frequency_score: 30
      }
    ]
  },

  "queens-gambit-accepted": {
    name: "Queen's Gambit Accepted",
    eco_code: "D20",
    category: "Closed",
    difficulty: "intermediate",
    description: "Black accepts the gambit pawn but should return it for good development.",
    popularity_score: 70,
    variations: [
      {
        variation_name: "Central Variation",
        moves: ["d4", "d5", "c4", "dxc4", "e4", "e5"],
        key_ideas: ["Central control", "Piece development", "Dynamic play"],
        notes: "Black challenges the center immediately after accepting the gambit.",
        is_main_line: false,
        frequency_score: 45
      }
    ]
  }
};

// Utility Functions

/**
 * Convert algebraic notation to UCI format
 * @param {string[]} moves - Array of moves in algebraic notation
 * @param {string} startingFen - Starting position FEN
 * @returns {Object} - Object containing UCI moves and final FEN
 */
function convertToUCI(moves, startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
  const game = new Chess(startingFen);
  const uciMoves = [];
  
  try {
    for (const move of moves) {
      const moveObj = game.move(move);
      if (!moveObj) {
        throw new Error(`Invalid move: ${move} in position ${game.fen()}`);
      }
      uciMoves.push(moveObj.from + moveObj.to + (moveObj.promotion || ''));
    }
    
    return {
      uci_moves: uciMoves,
      final_fen: game.fen(),
      move_count: moves.length
    };
  } catch (error) {
    console.error(`Error converting moves ${moves.join(', ')}:`, error.message);
    return null;
  }
}

/**
 * Calculate popularity score based on frequency and historical importance
 * @param {number} frequency - How often played at master level (0-100)
 * @param {boolean} isMainLine - Whether this is a main line variation
 * @param {string} difficulty - Opening difficulty level
 * @returns {number} - Calculated popularity score
 */
function calculatePopularityScore(frequency, isMainLine, difficulty) {
  let score = frequency;
  
  // Bonus for main lines
  if (isMainLine) score += 15;
  
  // Adjustment based on difficulty (beginners prefer simpler openings)
  const difficultyMultiplier = {
    'beginner': 1.2,
    'intermediate': 1.0,
    'advanced': 0.8
  };
  
  score *= (difficultyMultiplier[difficulty] || 1.0);
  
  return Math.min(100, Math.round(score));
}

/**
 * Populate openings data into Supabase
 */
async function populateOpenings() {
  console.log('🚀 Starting chess openings data population...');
  
  try {
    // Clear existing data (optional)
    const clearExisting = process.argv.includes('--clear');
    if (clearExisting) {
      console.log('🗑️ Clearing existing data...');
      await supabase.from('opening_variations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('openings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      console.log('✅ Existing data cleared');
    }

    let totalOpenings = 0;
    let totalVariations = 0;
    let errors = [];

    // Process each opening
    for (const [openingKey, openingData] of Object.entries(CHESS_OPENINGS)) {
      try {
        console.log(`\n📚 Processing: ${openingData.name}`);
        
        // Insert opening
        const { data: openingResult, error: openingError } = await supabase
          .from('openings')
          .insert({
            name: openingData.name,
            eco_code: openingData.eco_code,
            category: openingData.category,
            difficulty: openingData.difficulty,
            description: openingData.description,
            popularity_score: openingData.popularity_score
          })
          .select()
          .single();

        if (openingError) {
          throw new Error(`Opening insert error: ${openingError.message}`);
        }

        const openingId = openingResult.id;
        totalOpenings++;
        
        console.log(`  ✅ Inserted opening: ${openingData.name} (ID: ${openingId})`);

        // Process variations
        for (const variation of openingData.variations) {
          try {
            console.log(`    🔄 Processing variation: ${variation.variation_name}`);
            
            // Convert moves to UCI format
            const conversionResult = convertToUCI(variation.moves);
            if (!conversionResult) {
              throw new Error(`Failed to convert moves for ${variation.variation_name}`);
            }

            // Calculate final popularity score
            const finalPopularityScore = calculatePopularityScore(
              variation.frequency_score,
              variation.is_main_line,
              openingData.difficulty
            );

            // Insert variation
            const { error: variationError } = await supabase
              .from('opening_variations')
              .insert({
                opening_id: openingId,
                variation_name: variation.variation_name,
                moves: variation.moves,
                moves_uci: conversionResult.uci_moves,
                final_fen: conversionResult.final_fen,
                move_count: conversionResult.move_count,
                notes: variation.notes || null,
                key_ideas: variation.key_ideas || [],
                trap_moves: variation.trap_moves || [],
                is_main_line: variation.is_main_line || false,
                frequency_score: finalPopularityScore
              });

            if (variationError) {
              throw new Error(`Variation insert error: ${variationError.message}`);
            }

            totalVariations++;
            console.log(`    ✅ Inserted variation: ${variation.variation_name}`);
            
          } catch (variationError) {
            const errorMsg = `Error processing variation ${variation.variation_name}: ${variationError.message}`;
            console.error(`    ❌ ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
        
      } catch (openingError) {
        const errorMsg = `Error processing opening ${openingData.name}: ${openingError.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Summary
    console.log('\n📊 POPULATION SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ Total openings inserted: ${totalOpenings}`);
    console.log(`✅ Total variations inserted: ${totalVariations}`);
    
    if (errors.length > 0) {
      console.log(`❌ Errors encountered: ${errors.length}`);
      errors.forEach(error => console.log(`   - ${error}`));
    } else {
      console.log('🎉 All data populated successfully!');
    }

    // Verify data
    console.log('\n🔍 Verifying inserted data...');
    const { data: openingsCount } = await supabase
      .from('openings')
      .select('id', { count: 'exact' });
    
    const { data: variationsCount } = await supabase
      .from('opening_variations')
      .select('id', { count: 'exact' });

    console.log(`📈 Database contains: ${openingsCount?.length || 0} openings, ${variationsCount?.length || 0} variations`);

  } catch (error) {
    console.error('💥 Fatal error during population:', error);
    process.exit(1);
  }
}

/**
 * Validate all opening data before insertion
 */
async function validateOpeningsData() {
  console.log('🔍 Validating openings data...');
  
  let validationErrors = [];
  
  for (const [key, opening] of Object.entries(CHESS_OPENINGS)) {
    // Validate opening structure
    if (!opening.name || !opening.eco_code || !opening.category) {
      validationErrors.push(`Opening ${key}: Missing required fields`);
      continue;
    }
    
    // Validate each variation
    for (const [index, variation] of opening.variations.entries()) {
      if (!variation.variation_name || !variation.moves || !Array.isArray(variation.moves)) {
        validationErrors.push(`Opening ${key}, variation ${index}: Invalid structure`);
        continue;
      }
      
      // Test move conversion
      const result = convertToUCI(variation.moves);
      if (!result) {
        validationErrors.push(`Opening ${key}, variation ${variation.variation_name}: Invalid moves`);
      }
    }
  }
  
  if (validationErrors.length > 0) {
    console.error('❌ Validation failed:');
    validationErrors.forEach(error => console.error(`  - ${error}`));
    return false;
  }
  
  console.log('✅ All opening data validated successfully');
  return true;
}

/**
 * Generate opening statistics
 */
async function generateStats() {
  console.log('\n📊 OPENING STATISTICS');
  console.log('=' .repeat(50));
  
  const stats = {
    byCategory: {},
    byDifficulty: {},
    byECO: {},
    totalMoves: 0,
    avgMovesPerVariation: 0
  };
  
  let totalVariations = 0;
  
  for (const opening of Object.values(CHESS_OPENINGS)) {
    // Category stats
    stats.byCategory[opening.category] = (stats.byCategory[opening.category] || 0) + 1;
    
    // Difficulty stats
    stats.byDifficulty[opening.difficulty] = (stats.byDifficulty[opening.difficulty] || 0) + 1;
    
    // ECO stats
    const ecoClass = opening.eco_code[0];
    stats.byECO[ecoClass] = (stats.byECO[ecoClass] || 0) + 1;
    
    // Move stats
    for (const variation of opening.variations) {
      stats.totalMoves += variation.moves.length;
      totalVariations++;
    }
  }
  
  stats.avgMovesPerVariation = (stats.totalMoves / totalVariations).toFixed(1);
  
  console.log('Categories:', stats.byCategory);
  console.log('Difficulties:', stats.byDifficulty);
  console.log('ECO Classes:', stats.byECO);
  console.log(`Total moves: ${stats.totalMoves}`);
  console.log(`Average moves per variation: ${stats.avgMovesPerVariation}`);
  console.log(`Total variations: ${totalVariations}`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Chess Openings Data Seeder

Usage: node populate-openings.js [options]

Options:
  --validate    Validate data without inserting
  --stats       Show statistics about the opening data
  --clear       Clear existing data before inserting
  --help        Show this help message

Examples:
  node populate-openings.js --validate
  node populate-openings.js --clear
  node populate-openings.js --stats
`);
    return;
  }
  
  if (args.includes('--validate')) {
    await validateOpeningsData();
    return;
  }
  
  if (args.includes('--stats')) {
    await generateStats();
    return;
  }
  
  // Validate first
  const isValid = await validateOpeningsData();
  if (!isValid) {
    console.error('❌ Data validation failed. Aborting insertion.');
    process.exit(1);
  }
  
  // Show stats
  await generateStats();
  
  // Populate database
  await populateOpenings();
}

// Export for use in other modules
export { CHESS_OPENINGS, convertToUCI, populateOpenings, validateOpeningsData };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}
