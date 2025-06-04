// import-4move-puzzles.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const readline = require('readline');

// Your Supabase credentials
const supabaseUrl = 'https://hwnpylgiiurhcftbmwzh.supabase.co';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY_HERE'; // Get from Supabase Settings > API

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importPuzzles() {
  // Path to your Lichess CSV file
  const fileStream = fs.createReadStream('./lichess_puzzles_small.csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNumber = 0;
  let puzzleBatch = [];
  const batchSize = 50;
  let validPuzzleCount = 0;

  console.log('🚀 Starting import of 4-move puzzles...');

  for await (const line of rl) {
    lineNumber++;
    
    // Skip header
    if (lineNumber === 1) continue;

    // Parse CSV line
    const parts = line.split(',');
    if (parts.length < 8) continue;

    const [puzzleId, fen, moves, rating, ratingDeviation, popularity, nbPlays, themes] = parts;

    // Convert moves from UCI format (e2e4) to array
    const moveArray = moves.split(' ');
    
    // ONLY process 4-move puzzles
    if (moveArray.length !== 4) {
      continue;
    }

    // Validate all moves are 4 characters (UCI format)
    const validMoves = moveArray.every(move => move && move.length === 4);
    if (!validMoves) {
      console.log(`Skipping puzzle ${puzzleId}: invalid move format`);
      continue;
    }

    // Parse themes
    const themeArray = themes.split(' ').filter(t => t.length > 0);
    
    // Determine difficulty based on rating
    let difficulty = 'beginner';
    const ratingNum = parseInt(rating);
    if (ratingNum >= 1400 && ratingNum < 1800) difficulty = 'intermediate';
    else if (ratingNum >= 1800 && ratingNum < 2200) difficulty = 'advanced';
    else if (ratingNum >= 2200) difficulty = 'expert';

    // Determine who moves first from FEN
    const fenTurn = fen.split(' ')[1]; // 'w' or 'b'
    
    // For 4-move puzzles:
    // If FEN shows 'w' to move: W-B-W-B (user plays as Black, finding move 4)
    // If FEN shows 'b' to move: B-W-B-W (user plays as White, finding move 4)
    const userPlaysAs = fenTurn === 'w' ? 'black' : 'white';
    
    // Generate explanation based on themes and who's playing
    let explanation = generateExplanation(themeArray, moveArray, userPlaysAs);

    const puzzle = {
      lichess_id: puzzleId,
      fen: fen,
      moves: moveArray,
      rating: ratingNum,
      themes: themeArray,
      difficulty: difficulty,
      explanation: explanation
    };

    puzzleBatch.push(puzzle);
    validPuzzleCount++;

    // Insert batch when full
    if (puzzleBatch.length >= batchSize) {
      await insertBatch(puzzleBatch);
      puzzleBatch = [];
    }
    
    // Progress update
    if (lineNumber % 1000 === 0) {
      console.log(`Progress: ${lineNumber} lines processed, ${validPuzzleCount} valid 4-move puzzles found`);
    }
  }

  // Insert remaining puzzles
  if (puzzleBatch.length > 0) {
    await insertBatch(puzzleBatch);
  }

  console.log(`\n✅ Import complete!`);
  console.log(`📊 Total 4-move puzzles imported: ${validPuzzleCount}`);
  console.log(`📄 Total lines processed: ${lineNumber}`);
}

async function insertBatch(puzzles) {
  try {
    const { data, error } = await supabase
      .from('puzzles')
      .insert(puzzles);

    if (error) {
      console.error('❌ Error inserting batch:', error);
    } else {
      console.log(`✅ Inserted batch of ${puzzles.length} puzzles`);
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

function generateExplanation(themes, moves, userPlaysAs) {
  const colorPlaying = userPlaysAs === 'white' ? 'White' : 'Black';
  const opponentColor = userPlaysAs === 'white' ? 'Black' : 'White';
  
  const themeExplanations = {
    'opening': `After this opening sequence, ${colorPlaying} must find the best continuation to maintain the advantage.`,
    'middlegame': `In this middlegame position, ${colorPlaying} has a tactical opportunity to seize control.`,
    'endgame': `${colorPlaying} must demonstrate precise endgame technique to convert the advantage.`,
    'pin': `${colorPlaying} can exploit the pin to win material or achieve a decisive advantage.`,
    'fork': `${colorPlaying} delivers a devastating fork that wins material.`,
    'skewer': `${colorPlaying} uses a skewer to force ${opponentColor} into a losing position.`,
    'sacrifice': `${colorPlaying} concludes the sacrificial sequence with a precise move.`,
    'discoveredAttack': `${colorPlaying} completes the combination with a discovered attack.`,
    'doubleAttack': `${colorPlaying} creates multiple threats that cannot be defended.`,
    'mate': `${colorPlaying} delivers checkmate to end the game.`,
    'mateIn1': `${colorPlaying} has checkmate in one move!`,
    'mateIn2': `${colorPlaying} begins a forced checkmate sequence.`,
    'backRankMate': `${colorPlaying} exploits the weak back rank for a decisive finish.`,
    'promotion': `${colorPlaying}'s pawn promotion decides the game.`,
    'underPromotion': `An unusual promotion is the key to ${colorPlaying}'s victory.`,
    'quietMove': `${colorPlaying} plays a subtle but powerful quiet move.`,
    'deflection': `${colorPlaying} deflects the defender to achieve the goal.`,
    'interference': `${colorPlaying} interferes with ${opponentColor}'s piece coordination.`,
    'xRayAttack': `${colorPlaying} uses an X-ray attack to penetrate the defense.`,
    'zugzwang': `${colorPlaying} puts ${opponentColor} in zugzwang.`,
    'attraction': `${colorPlaying} attracts an enemy piece to a fatal square.`,
    'clearance': `${colorPlaying} clears the path for a winning continuation.`,
    'defensiveMove': `${colorPlaying} must find the only defense to survive.`,
    'trapped': `${colorPlaying} traps an enemy piece that cannot escape.`,
    'hangingPiece': `${colorPlaying} can simply capture the undefended piece.`,
    'capturingDefender': `${colorPlaying} removes the key defender.`,
    'intermezzo': `${colorPlaying} plays a forcing intermediate move.`,
    'exposedKing': `${colorPlaying} exploits the exposed enemy king.`,
    'kingsideAttack': `${colorPlaying} breaks through on the kingside.`,
    'queensideAttack': `${colorPlaying} creates decisive threats on the queenside.`,
    'crushing': `${colorPlaying} finds the crushing blow that ends all resistance.`,
    'equality': `${colorPlaying} finds the precise move to maintain equality.`,
    'advantage': `${colorPlaying} secures a lasting advantage with accurate play.`
  };

  // Find the first matching theme with an explanation
  for (const theme of themes) {
    if (themeExplanations[theme]) {
      return themeExplanations[theme];
    }
  }

  // Generic explanation if no specific theme matches
  return `After the tactical sequence, ${colorPlaying} must find the best move to complete the combination. The correct move ${moves[3]} secures the advantage.`;
}

// Main execution
async function main() {
  await importPuzzles();
}

// Run the import
main().catch(console.error);
