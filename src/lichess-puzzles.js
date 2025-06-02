// src/lichess-puzzles.js
import { Chess } from 'chess.js';

class LichessPuzzleFetcher {
  constructor() {
    this.puzzleCache = [];
    this.isLoading = false;
  }

  // Fetch puzzles from Lichess database API
  async fetchPuzzleBatch(count = 20, minRating = 1000, maxRating = 2000) {
    console.log(`Fetching ${count} puzzles from Lichess (rating ${minRating}-${maxRating})`);
    
    try {
      // Use a CORS proxy to access the Lichess database
      const proxyUrl = 'https://api.allorigins.win/get?url=';
      const lichessUrl = 'https://database.lichess.org/lichess_db_puzzle.csv';
      
      const response = await fetch(`${proxyUrl}${encodeURIComponent(lichessUrl)}`);
      const data = await response.json();
      
      if (!data.contents) {
        throw new Error('Failed to fetch puzzle data');
      }
      
      // Parse CSV data
      const puzzles = this.parsePuzzleCSV(data.contents, count, minRating, maxRating);
      
      console.log(`Successfully fetched ${puzzles.length} puzzles`);
      return puzzles;
      
    } catch (error) {
      console.error('Error fetching from Lichess database:', error);
      // Fallback to curated puzzles
      return this.getCuratedPuzzles(count);
    }
  }

  // Parse CSV data and filter puzzles
  parsePuzzleCSV(csvData, count, minRating, maxRating) {
    const lines = csvData.split('\n');
    const puzzles = [];
    
    // Skip header line
    for (let i = 1; i < lines.length && puzzles.length < count * 3; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const puzzle = this.parsePuzzleLine(line);
        
        // Filter by criteria
        if (puzzle && 
            puzzle.rating >= minRating && 
            puzzle.rating <= maxRating &&
            puzzle.moves.length >= 3 && 
            puzzle.moves.length <= 6 &&
            this.isGoodPuzzle(puzzle)) {
          puzzles.push(puzzle);
        }
      } catch (error) {
        // Skip invalid lines
        continue;
      }
    }
    
    // Shuffle and return requested count
    const shuffled = puzzles.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  // Parse individual puzzle line from CSV
  parsePuzzleLine(line) {
    // CSV format: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
    const fields = this.parseCSVLine(line);
    
    if (fields.length < 8) return null;
    
    const [puzzleId, fen, movesStr, rating, ratingDev, popularity, nbPlays, themes] = fields;
    
    // Parse moves
    const moves = movesStr.split(' ').filter(move => move.length === 4);
    
    return {
      id: puzzleId,
      fen: fen,
      moves: moves,
      rating: parseInt(rating) || 1500,
      themes: themes.split(' '),
      popularity: parseInt(popularity) || 0,
      explanation: this.generateExplanation(themes, moves.length)
    };
  }

  // Simple CSV parsing (handles quoted fields)
  parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current);
    
    return fields;
  }

  // Check if puzzle is suitable for visualization training
  isGoodPuzzle(puzzle) {
    // Validate FEN
    try {
      new Chess(puzzle.fen);
    } catch (error) {
      return false;
    }
    
    // Filter out very complex themes that don't work well for visualization
    const goodThemes = ['pin', 'fork', 'skewer', 'discovery', 'deflection', 'attraction', 
                        'clearance', 'interference', 'removal', 'zugzwang', 'sacrifice',
                        'development', 'advantage', 'mate', 'mateIn1', 'mateIn2', 'mateIn3'];
    
    const hasGoodTheme = puzzle.themes.some(theme => goodThemes.includes(theme));
    
    // Prefer puzzles with decent popularity (not too obscure)
    const goodPopularity = puzzle.popularity > -50;
    
    return hasGoodTheme && goodPopularity;
  }

  // Generate explanation based on puzzle themes
  generateExplanation(themes, moveCount) {
    const themeExplanations = {
      pin: 'Use the pin to your advantage - the opponent\'s piece cannot move without exposing a more valuable piece.',
      fork: 'Create a fork to attack multiple pieces simultaneously, forcing the opponent to lose material.',
      skewer: 'Force the opponent\'s valuable piece to move, exposing a less valuable piece behind it.',
      discovery: 'Unleash a discovered attack by moving one piece to reveal an attack from another.',
      deflection: 'Deflect the opponent\'s key defensive piece from its important duty.',
      attraction: 'Lure the opponent\'s piece to a vulnerable square where it can be exploited.',
      clearance: 'Clear the path for your pieces to create a powerful tactical blow.',
      sacrifice: 'Sacrifice material temporarily to gain a decisive positional or tactical advantage.',
      mate: 'Find the precise sequence that leads to checkmate.',
      mateIn1: 'Deliver checkmate in one move.',
      mateIn2: 'Execute a forced checkmate in two moves.',
      mateIn3: 'Calculate the precise three-move checkmate sequence.',
      development: 'Develop your pieces actively while creating tactical opportunities.',
      advantage: 'Capitalize on your advantage with the most forcing continuation.'
    };

    // Find the primary theme
    const primaryTheme = themes.find(theme => themeExplanations[theme]);
    
    if (primaryTheme) {
      let explanation = themeExplanations[primaryTheme];
      
      // Add move count context
      if (moveCount === 3) {
        explanation += ' This three-move sequence requires precise calculation.';
      } else if (moveCount >= 4) {
        explanation += ' Visualize the entire sequence to find the strongest continuation.';
      }
      
      return explanation;
    }
    
    // Fallback explanation
    return 'Find the strongest continuation in this tactical position through careful calculation and visualization.';
  }

  // Curated backup puzzles if Lichess fetch fails
  getCuratedPuzzles(count) {
    const curatedPuzzles = [
      {
        id: 'curated1',
        fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 3',
        moves: ['f1c4', 'd7d6', 'd2d3'],
        rating: 1200,
        themes: ['development'],
        explanation: 'White develops the bishop to an active square, controlling important central squares and preparing to castle kingside.'
      },
      {
        id: 'curated2',
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 0 4',
        moves: ['f8c5', 'd2d4', 'e5d4'],
        rating: 1400,
        themes: ['tactics'],
        explanation: 'Black develops with tempo by attacking the bishop, then captures in the center to challenge White\'s pawn structure.'
      },
      {
        id: 'curated3',
        fen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4',
        moves: ['e1g1', 'd7d6', 'h2h3'],
        rating: 1300,
        themes: ['development'],
        explanation: 'White castles for king safety and then begins to prepare a kingside space advantage with careful pawn play.'
      },
      {
        id: 'curated4',
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 0 4',
        moves: ['f8b4', 'c1d2', 'd7d6'],
        rating: 1500,
        themes: ['pin'],
        explanation: 'Black creates a pin that forces White to respond carefully, demonstrating the power of piece coordination in the opening.'
      },
      {
        id: 'curated5',
        fen: 'rnbq1rk1/ppp2ppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQ - 0 6',
        moves: ['c1g5', 'c7c6', 'e2e3'],
        rating: 1600,
        themes: ['pin'],
        explanation: 'White creates pressure with a pin on the knight, and after Black strengthens the center, continues with solid development.'
      }
    ];
    
    return curatedPuzzles.slice(0, count);
  }

  // Categorize puzzles by difficulty
  categorizePuzzles(puzzles) {
    const categorized = {
      beginner: puzzles.filter(p => p.rating < 1300),
      intermediate: puzzles.filter(p => p.rating >= 1300 && p.rating < 1700),
      advanced: puzzles.filter(p => p.rating >= 1700)
    };
    
    return categorized;
  }

  // Main method to get puzzles for the app
  async getPuzzlesForApp(difficulty = 'all', count = 20) {
    let minRating, maxRating;
    
    switch (difficulty) {
      case 'beginner':
        minRating = 800;
        maxRating = 1300;
        break;
      case 'intermediate':
        minRating = 1300;
        maxRating = 1700;
        break;
      case 'advanced':
        minRating = 1700;
        maxRating = 2500;
        break;
      default:
        minRating = 1000;
        maxRating = 2000;
    }
    
    const puzzles = await this.fetchPuzzleBatch(count, minRating, maxRating);
    
    // Convert to your app's format
    return puzzles.map(puzzle => ({
      fen: puzzle.fen,
      moves: puzzle.moves.slice(0, 3), // Take first 3 moves for visualization
      explanation: puzzle.explanation,
      difficulty: this.getDifficultyLevel(puzzle.rating),
      theme: puzzle.themes[0] || 'general',
      rating: puzzle.rating
    }));
  }

  getDifficultyLevel(rating) {
    if (rating < 1300) return 'beginner';
    if (rating < 1700) return 'intermediate';
    return 'advanced';
  }
}

export default LichessPuzzleFetcher;
