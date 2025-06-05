// src/ai.js

/**
 * Calls our Vercel serverless function for incorrect move explanations.
 * Provides full puzzle context for better explanations.
 */
export async function getIncorrectMoveExplanation(originalFen, moves, userMove, correctMove, playingAs = 'white') {
  try {
    const response = await fetch('/api/getExplanation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        originalFen,
        moves,
        userMove, 
        correctMove, 
        playingAs,
        isCorrect: false
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json();
      throw new Error(errorJson.error || 'Failed to fetch explanation');
    }

    const data = await response.json();
    return data.explanation;
  } catch (error) {
    console.error('Error calling /api/getExplanation:', error);
    return 'That move is suboptimal. Try to avoid losing material or weakening your position.';
  }
}

/**
 * Gets or generates AI explanation for correct answers.
 * First checks Supabase, then calls OpenAI if needed.
 */
export async function getCorrectMoveExplanation(puzzle, userSystem) {
  try {
    // Check if AI explanation already exists
    if (puzzle.ai_explanation) {
      return puzzle.ai_explanation;
    }

    // Generate new explanation
    const response = await fetch('/api/getExplanation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        originalFen: puzzle.fen,
        moves: puzzle.moves,
        userMove: puzzle.moves[3], 
        correctMove: puzzle.moves[3],
        playingAs: puzzle.moves[0].length === 4 ? 
          (puzzle.fen.split(' ')[1] === 'w' ? 'white' : 'black') : 
          'white',
        isCorrect: true
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate explanation');
    }

    const data = await response.json();
    const aiExplanation = data.explanation;

    // Save to database for future use
    if (userSystem && puzzle.id) {
      await userSystem.savePuzzleExplanation(puzzle.id, aiExplanation);
    }

    return aiExplanation;
  } catch (error) {
    console.error('Error getting correct move explanation:', error);
    // Fall back to original explanation
    return puzzle.explanation;
  }
}
