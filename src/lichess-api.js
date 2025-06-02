// src/lichess-api.js
import { Chess } from 'chess.js';

class LichessAPI {
  constructor() {
    this.baseUrl = 'https://lichess.org/api';
    this.requestDelay = 1000; // 1 second between requests to be respectful
  }

  // Fetch a single puzzle by ID
  async fetchPuzzle(puzzleId) {
    try {
      const response = await fetch(`${this.baseUrl}/puzzle/${puzzleId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return this.processPuzzleData(data);
      
    } catch (error) {
      console.error(`Failed to fetch puzzle ${puzzleId}:`, error);
      return null;
    }
  }

  // Fetch daily puzzle
  async fetchDailyPuzzle() {
    try {
      const response = await fetch(`${this.baseUrl}/puzzle/daily`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return this.processPuzzleData(data);
      
    } catch (error) {
      console.error('Failed to fetch daily puzzle:', error);
      return null;
    }
  }

  // Process raw Lichess puzzle data into our format
  processPuzzleData(data) {
    if (!data.puzzle || !data.puzzle.solution) {
      return null;
    }

    const puzzle = data.puzzle;
    const game = data.game;
    
    // Extract themes and generate explanation
    const themes = puzzle.themes || [];
    const explanation = this.generateExplanation(themes, puzzle.solution.length);
    
    // Determine difficulty based on rating
    const difficulty = this.getDifficultyFromRating(puzzle.rating);
    
    return {
      id: puzzle.id,
      fen: game.fen || this.extractFenFromPgn(game.pgn, puzzle.initialPly),
      moves: puzzle.solution.slice(0, 3), // Take first 3 moves for visualization
      explanation: explanation,
      difficulty: difficulty,
      rating: puzzle.rating,
      themes: themes,
      plays: puzzle.plays,
      lichessUrl: `https://lichess.org/training/${puzzle.id}`
    };
  }

  // Extract FEN from PGN at specific ply (if FEN not provided)
  extractFenFromPgn(pgn, initialPly) {
    try {
      const game = new Chess();
      const moves = pgn.split(' ');
      
      // Play moves up to initialPly
      for (let i = 0; i < Math.min(initialPly, moves.length); i++) {
        const move = moves[i];
        if (move && !move.includes('.')) { // Skip move numbers
          try {
            game.move(move);
          } catch (error) {
            // Skip invalid moves
            continue;
          }
        }
      }
      
      return game.fen();
    } catch (error) {
      // Fallback to starting position
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
  }

  // Generate explanation based on puzzle themes
  generateExplanation(themes, solutionLength) {
    const themeExplanations = {
      // Tactical themes
      pin: 'Exploit the pin to win material - the pinned piece cannot move without exposing a more valuable piece.',
      fork: 'Create a fork to attack multiple pieces simultaneously, forcing material gain.',
      skewer: 'Use a skewer to force a valuable piece to move, exposing a less valuable piece behind it.',
      discovery: 'Unleash a discovered attack by moving one piece to reveal a powerful attack from another.',
      deflection: 'Deflect the opponent\'s key defensive piece from its important duty.',
      attraction: 'Lure the opponent\'s piece to a vulnerable square where it can be exploited.',
      clearance: 'Clear the path for your pieces to create a decisive tactical blow.',
      interference: 'Interfere with the opponent\'s piece coordination to create tactical opportunities.',
      
      // Mating patterns
      mate: 'Find the precise sequence that leads to checkmate.',
      mateIn1: 'Deliver checkmate in one move.',
      mateIn2: 'Execute a forced checkmate in two moves.',
      mateIn3: 'Calculate the exact three-move checkmate sequence.',
      mateIn4: 'Visualize the complete four-move mating attack.',
      mateIn5: 'Find the long forced mate sequence.',
      
      // Positional themes
      advantage: 'Capitalize on your positional advantage with the most forcing continuation.',
      endgame: 'Apply precise endgame technique to convert your advantage.',
      middlegame: 'Find the key tactical blow in this complex middlegame position.',
      opening: 'Exploit your opponent\'s opening mistake with accurate play.',
      
      // Special themes
      sacrifice: 'Make a tactical sacrifice to gain a decisive advantage.',
      promotion: 'Promote your pawn while maintaining tactical pressure.',
      enPassant: 'Use the en passant rule to gain a tactical advantage.',
      castling: 'Castle at the right moment to improve your position.',
      
      // Difficulty indicators
      short: 'A quick tactical blow that requires precise calculation.',
      long: 'A complex sequence requiring deep visualization.',
      veryLong: 'An extended tactical sequence that tests your calculation skills.'
    };

    // Find the most relevant theme
    const primaryTheme = themes.find(theme => themeExplanations[theme]);
    
    if (primaryTheme) {
      let explanation = themeExplanations[primaryTheme];
      
      // Add context based on solution length
      if (solutionLength >= 5) {
        explanation += ' This requires calculating a longer sequence of moves.';
      } else if (solutionLength === 3) {
        explanation += ' Focus on visualizing all three moves in the sequence.';
      }
      
      return explanation;
    }

    // Fallback explanation
    return 'Find the strongest tactical continuation in this position through careful calculation and visualization.';
  }

  // Convert Lichess rating to difficulty level
  getDifficultyFromRating(rating) {
    if (rating < 1400) return 'beginner';
    if (rating < 1800) return 'intermediate'; 
    return 'advanced';
  }

  // Generate random puzzle IDs (Lichess has puzzles from ~1 to ~4,000,000)
  generateRandomPuzzleIds(count = 20) {
    const ids = [];
    const maxId = 4000000; // Approximate max puzzle ID
    
    for (let i = 0; i < count; i++) {
      // Generate random ID, but bias toward lower numbers (more likely to exist)
      const randomId = Math.floor(Math.random() * maxId * 0.1) + 1;
      ids.push(randomId.toString(36)); // Convert to base36 like Lichess uses
    }
    
    return ids;
  }

  // Wait between requests to respect rate limits
  async delay(ms = this.requestDelay) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fetch multiple puzzles with rate limiting
  async fetchPuzzleBatch(count = 15, difficulty = 'all') {
    console.log(`Fetching ${count} puzzles from Lichess API...`);
    
    const puzzles = [];
    const maxAttempts = Math.min(count * 2, 50); // Limit total attempts
    let attempts = 0;
    
    // Start with daily puzzle
    try {
      const dailyPuzzle = await this.fetchDailyPuzzle();
      if (dailyPuzzle && this.matchesDifficulty(dailyPuzzle, difficulty)) {
        puzzles.push(dailyPuzzle);
        console.log(`✓ Got daily puzzle (${dailyPuzzle.rating})`);
      }
      await this.delay(500); // Shorter delay for daily puzzle
    } catch (error) {
      console.log('Daily puzzle not available');
    }

    // Generate puzzle IDs to try
    const puzzleIds = this.generateKnownGoodIds(maxAttempts);
    
    for (let i = 0; i < puzzleIds.length && puzzles.length < count; i++) {
      attempts++;
      
      const puzzle = await this.fetchPuzzle(puzzleIds[i]);
      
      if (puzzle && this.matchesDifficulty(puzzle, difficulty) && this.isGoodForVisualization(puzzle)) {
        puzzles.push(puzzle);
        console.log(`✓ Got puzzle ${puzzle.id} (${puzzle.rating}, ${puzzle.themes.join(', ')})`);
      }
      
      // Respect rate limits but use shorter delays
      await this.delay(800);
      
      // Progress update every 10 attempts
      if (attempts % 10 === 0) {
        console.log(`Progress: ${puzzles.length}/${count} puzzles found (${attempts} attempts)`);
      }
      
      // Stop early if we're not finding puzzles efficiently
      if (attempts >= 20 && puzzles.length === 0) {
        console.log('No puzzles found after 20 attempts, stopping early');
        break;
      }
    }
    
    console.log(`✅ Final result: ${puzzles.length} puzzles found in ${attempts} attempts`);
    return puzzles;
  }

  // Known good puzzle ID patterns (these are more likely to exist)
  generateKnownGoodIds(count) {
    const knownWorkingIds = [
      // Confirmed working IDs
      'tHj5w', '00008', 
      // Common 5-character alphanumeric patterns
      '0009B', '000a3', '000b8', '000c5', '000d2', '000e7', '000f4', '000g9',
      '001a5', '001b2', '001c8', '001d4', '001e9', '001f6', '001g3',
      '002a7', '002b4', '002c1', '002d8', '002e5', '002f2', '002g9',
      // 4-character patterns that often work
      '003a', '003b', '003c', '003d', '003e', '003f', '003g', '003h',
      '004a', '004b', '004c', '004d', '004e', '004f', '004g', '004h',
      '005a', '005b', '005c', '005d', '005e', '005f', '005g', '005h'
    ];
    
    const ids = [...knownWorkingIds];
    
    // Generate additional IDs using patterns that are more likely to exist
    while (ids.length < count) {
      // Pattern 1: 000X where X is alphanumeric
      if (Math.random() < 0.4) {
        const suffix = Math.random().toString(36).substring(2, 4);
        ids.push('000' + suffix);
      }
      // Pattern 2: 00XX format
      else if (Math.random() < 0.7) {
        const suffix = Math.random().toString(36).substring(2, 5);
        ids.push('00' + suffix);
      }
      // Pattern 3: Simple incremental numbers in base36
      else {
        const num = Math.floor(Math.random() * 50000) + 1000;
        ids.push(num.toString(36));
      }
    }
    
    // Remove duplicates and return
    return [...new Set(ids)].slice(0, count);
  }

  // Check if puzzle matches difficulty filter
  matchesDifficulty(puzzle, difficulty) {
    if (difficulty === 'all') return true;
    return puzzle.difficulty === difficulty;
  }

  // Check if puzzle is good for visualization training
  isGoodForVisualization(puzzle) {
    // Prefer puzzles with 3+ move solutions
    if (puzzle.moves.length < 2) return false;
    
    // Avoid very complex themes that don't work well for visualization
    const badThemes = ['study', 'puzzle', 'theoretical'];
    const hasBadTheme = puzzle.themes.some(theme => badThemes.includes(theme));
    
    return !hasBadTheme;
  }

  // Main method to get puzzles for the app
  async getPuzzlesForApp(difficulty = 'all', count = 15) {
    try {
      const puzzles = await this.fetchPuzzleBatch(count, difficulty);
      
      if (puzzles.length === 0) {
        throw new Error('No puzzles fetched');
      }
      
      return puzzles;
    } catch (error) {
      console.error('Failed to fetch puzzles from Lichess:', error);
      throw error;
    }
  }
}

export default LichessAPI;
